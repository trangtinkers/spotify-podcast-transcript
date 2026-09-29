// Spotify podcast transcript extractor.
// Paste into the DevTools console on an episode page with the transcript
// panel open. See README.md for the virtualized-list caveat.

(() => {
  const SELECTOR = '#transcript-panel [data-encore-id="text"]';

  const lines = [...document.querySelectorAll(SELECTOR)].map(e => e.textContent);

  if (!lines.length) {
    console.warn(
      'No transcript lines found. Is the transcript panel open? ' +
      'If Spotify changed its markup, inspect a line and check the ' +
      'panel id and data-encore-id attribute.'
    );
    return;
  }

  console.log(`Found ${lines.length} lines. If that looks short for the ` +
              `episode length, the list is virtualized — scroll the panel ` +
              `and use the Set-accumulation snippet in the README.`);

  const text = lines.join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = (document.title.replace(/[\/\\:*?"<>|]/g, '-') || 'transcript') + '.txt';
  a.click();
  URL.revokeObjectURL(a.href);
})();
