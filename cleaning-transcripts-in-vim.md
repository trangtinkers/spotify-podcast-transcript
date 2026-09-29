# Cleaning Spotify's auto-generated podcast transcripts in vim

Spotify's auto-generated transcripts come out as a wall of noise: a timestamp
every 8–15 words, a `Speaker N` label, and sentences chopped mid-thought
across lines. A ~1,000-line dump like this:

```
This transcript was generated automatically. Its accuracy may vary.
0:05
Speaker 1
Welcome back to the show. Today I'm talking with someone who
0:16
Speaker 2
thanks for having me on, it's good to be here.
I wanted to start
0:22
Speaker 1
with the question everyone asks first. Where did the idea
0:29
Speaker 2
come from?
```

collapses to ~10% of its line count and reads like an actual transcript:

```
Speaker 1: Welcome back to the show. Today I'm talking with someone who

Speaker 2: thanks for having me on, it's good to be here. I wanted to start

Speaker 1: with the question everyone asks first. Where did the idea

Speaker 2: come from?
```

## Why it works

The key observation about Spotify's format: the `Speaker N` label only
reappears when the speaker actually changes. Timestamp lines are just
caption-chunk boundaries and carry no speaker information of their own. So the
cleanup is three mechanical steps:

1. Delete every standalone timestamp line.
2. For each `Speaker N` label, join everything down to (but not including) the
   *next* `Speaker` label into one paragraph.
3. Insert a blank line before each speaker label, for readability.

## The commands

Run these four in vim, in order (works in both vim and neovim):

```vim
:g/^\d\+:\d\+$/d
:g/^Speaker \d\+$/ .,/^Speaker \d\+\|\%$/-1 join
:%s/^\(Speaker \d\+\) /\1: /
:%s/^\([A-Za-z][A-Za-z0-9 ]\{0,20\}: \)/\r\1/
```

### 1. Strip timestamps

```vim
:g/^\d\+:\d\+$/d
```

`:g/pattern/d` runs `d` (delete) on every line matching `pattern`. The pattern
`^\d\+:\d\+$` matches a line that is *only* a timestamp like `0:05` or
`12:47` — nothing else on the line.

### 2. Join each speaker's fragments into one paragraph

```vim
:g/^Speaker \d\+$/ .,/^Speaker \d\+\|\%$/-1 join
```

This is the trick that does the real work. For every line matching
`^Speaker \d\+$` (i.e. a line that is exactly `Speaker 1`, `Speaker 2`, etc.),
it runs a range command:

- `.` — start at the current line (the `Speaker N` label itself, since `:g`
  parks the cursor there for each match).
- `/^Speaker \d\+\|\%$/-1` — end one line before the *next* match of the same
  pattern, or at the last line of the file (`\%$`) if there is no next match.
  The `\|` is regex alternation ("or"), so this handles the last speaker turn
  in the file too, where there's no following label to stop at.
- `join` — vim's join command (same smart join as pressing `J` in normal mode:
  single space between sentences, no space before punctuation).

Because the label is only present when the speaker changes, everything between
one `Speaker N` line and the next belongs to that one turn — so joining that
whole range is always correct.

### 3. Add the colon

```vim
:%s/^\(Speaker \d\+\) /\1: /
```

After step 2, each line reads `Speaker 1 <text...>` (joined with a plain
space). This substitution finds `Speaker N ` at the start of a line and
replaces it with `Speaker N: `, giving the familiar `Speaker: text` format.

### 4. Add a blank line between speaker turns

```vim
:%s/^\([A-Za-z][A-Za-z0-9 ]\{0,20\}: \)/\r\1/
```

This finds any line starting with a short name-like label followed by `: ` —
`Speaker 1: `, but also anything you rename it to later, like `Dan: ` or
`Rich: ` — and inserts a newline before it. The pattern is intentionally
generic rather than hardcoded to `Speaker \d\+:`, so it keeps working after
you've gone through and replaced the generic labels with real names.

It's worth a quick sanity check on your own file before running it, to make
sure the pattern doesn't match anything in the body text:

```bash
grep -noE '^[A-Za-z][A-Za-z0-9 ]{0,20}:' transcript.md | sort -u
```

If that turns up anything that isn't a speaker label, tighten the pattern
first.

## Running it as a one-shot script

To apply this without opening the file interactively — e.g. as part of a
pipeline, or to preview on a copy before touching the original — save the four
commands (plus `wq` to save and quit) as an Ex script and run vim headless:

```bash
cat > clean.vim << 'EOF'
g/^\d\+:\d\+$/d
g/^Speaker \d\+$/ .,/^Speaker \d\+\|\%$/-1 join
%s/^\(Speaker \d\+\) /\1: /
%s/^\([A-Za-z][A-Za-z0-9 ]\{0,20\}: \)/\r\1/
wq
EOF

# preview on a copy first
cp transcript.md transcript_test.md
vim -es -S clean.vim transcript_test.md

# once you're happy with it, apply for real (keep a backup!)
cp transcript.md transcript.md.bak
vim -es -S clean.vim transcript.md
```

`-es` runs vim in silent Ex mode (no UI, just executes the script and exits) —
handy for batch-cleaning multiple transcript files with the same command.

## What this does *not* fix

Spotify's speaker diarization isn't perfect, and this script can't be either —
it only reorganizes lines, it doesn't judge who actually said what. Watch for
sentences split mid-phrase across a speaker change, e.g.:

```
Speaker 1: ...and then we moved to New
Speaker 2: Zealand.
```

That's a diarization error, not a formatting artifact — "New Zealand" is one
phrase, one speaker. Fixing these requires listening to the source audio and
manually reassigning the `Speaker N:` label on the affected line. A
`:set spell` pass is also worth doing afterward, since auto-transcription
frequently mangles proper nouns and less common words.
