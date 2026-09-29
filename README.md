# spotify-podcast-transcript

Browser-console snippets for pulling the full transcript out of a Spotify
podcast episode, plus a vim workflow for cleaning up the result.

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


## Cleaning up the output

Spotify's auto-generated transcripts arrive with a timestamp every 8–15 words,
`Speaker N` labels, and sentences chopped mid-thought. Four vim commands
collapse that to roughly 10% of its line count:

→ [Cleaning Spotify's auto-generated transcripts in vim](cleaning-transcripts-in-vim.md)
