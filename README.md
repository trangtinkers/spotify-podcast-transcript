# spotify-podcast-transcript

Browser-console snippets for pulling the full transcript out of a Spotify
podcast episode, plus a vim workflow for cleaning up the result.

No extension, no API key, no install — paste into DevTools and go.

## Extracting

Open the episode on [open.spotify.com](https://open.spotify.com), show the
transcript panel, then open DevTools (`F12` / `Cmd+Opt+I`) and paste one of
these into the Console.

### All transcript lines

```js
[...document.querySelectorAll('#transcript-panel [data-encore-id="text"]')]
  .map(e => e.textContent)
  .join('\n')
```

### One line per cue, second span only

Each cue `div` typically holds a speaker/timestamp span followed by the text
span:

```js
[...document.querySelectorAll('#transcript-panel > div')]
  .map(d => d.querySelector('span:nth-child(2)')?.textContent)
  .filter(Boolean)
  .join('\n')
```

### Speaker and text together

```js
[...document.querySelectorAll('#transcript-panel > div')]
  .map(d => [...d.querySelectorAll('span')].map(s => s.textContent).join(': '))
  .join('\n')
```

## Saving to a file

### Download it

```js
(() => {
  const text = [...document.querySelectorAll('#transcript-panel [data-encore-id="text"]')]
    .map(e => e.textContent)
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = (document.title.replace(/[\/\\:*?"<>|]/g, '-') || 'transcript') + '.txt';
  a.click();
  URL.revokeObjectURL(a.href);
})()
```

The `(() => { ... })()` wrapper is an
[IIFE](https://developer.mozilla.org/en-US/docs/Glossary/IIFE) — it keeps
`text` and `a` out of the console's global scope so you can re-run the snippet
without hitting `Identifier 'a' has already been declared`.

If Chrome blocks the download, allow it once from the icon in the address bar
and re-run. If it fails silently, the page's CSP may be rejecting `blob:` URLs
— use the clipboard route instead.

### Copy to clipboard

`copy()` is a DevTools console helper and doesn't truncate the way printing a
long string does:

```js
copy([...document.querySelectorAll('#transcript-panel [data-encore-id="text"]')]
  .map(e => e.textContent)
  .join('\n'))
```

Then paste into a file:

```bash
cat > transcript.txt
```

Paste, then `Ctrl+D`.

## Virtualized list caveat

**This is the thing that will bite you.** Spotify's transcript panel is
virtualized — only the cues near the viewport exist in the DOM. If a
90-minute episode gives you 30 lines, that's why.

Check the count first:

```js
document.querySelectorAll('#transcript-panel [data-encore-id="text"]').length
```

If it looks short, accumulate into a `Set` while scrolling the panel:

```js
window._t ??= new Set();
[...document.querySelectorAll('#transcript-panel [data-encore-id="text"]')]
  .forEach(e => _t.add(e.textContent));
_t.size
```

Scroll the panel down a screen, re-run, repeat until `_t.size` stops growing,
then dump it:

```js
copy([..._t].join('\n'))
```

A `Set` deduplicates, so overlapping scroll positions are harmless. The
tradeoff is that it also collapses genuinely repeated lines (a repeated "Yeah."
appears once) and preserves insertion order rather than transcript order —
usually fine, but spot-check if the episode has a lot of short interjections.

## Selector notes

- **Anchor on `#transcript-panel` and `[data-encore-id="text"]`.** Both are
  stable across builds.
- **Don't match on the hashed class names** (e.g. `tCs8J7iHJNmiJ3403lyw`).
  Those are CSS-module hashes and change whenever Spotify redeploys.
- Spotify ships UI changes regularly. If a snippet returns an empty array,
  inspect a transcript line and check whether the panel id or the
  `data-encore-id` attribute moved.

## Cleaning up the output

Spotify's auto-generated transcripts arrive with a timestamp every 8–15 words,
`Speaker N` labels, and sentences chopped mid-thought. Four vim commands
collapse that to roughly 10% of its line count:

→ [Cleaning Spotify's auto-generated transcripts in vim](cleaning-transcripts-in-vim.md)

## A note on what you do with the output

Transcripts are the podcast creator's work. Personal use — search, notes,
accessibility, quoting with attribution — is one thing; republishing someone's
full transcript is another. Check the show's terms if you're unsure.
