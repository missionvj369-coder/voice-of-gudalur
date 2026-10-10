// Adds the two keys the "Play with sound" call to action needs, and keeps the
// key count in the file's own header comment honest. Written with Node so the
// UTF-8 Indic strings survive byte for byte; the file is LF end to end, so the
// lines are joined on \n and nothing else in it is touched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'vog-i18n.js');
const lines = fs.readFileSync(p, 'utf8').split('\n');

const at = lines.findIndex((l) => l.startsWith('  audStopAria:'));
if (at < 0) throw new Error('audStopAria not found');

const added = [
  // Index is [Tamil, English, Malayalam, Kannada, Hindi]. The visible label is
  // the short ask; the aria-label is the fuller description a screen reader
  // reads instead of the visible text.
  '  audCta:         ["ஒலியுடன் இயக்கு", "Play with sound", "ഒലിയോടെ കേൾക്കുക", "ಧ್ವನಿಯೊಂದಿಗೆ ಆಡಿಸು", "ध्वनि के साथ चलाएँ"],',
  '  audCtaAria:     ["பின்னணிப் பாடலை இயக்கு", "Play the background song", "പശ്ചാത്തല പാട്ട് കേൾക്കുക", "ಹಿನ்னೆಲೆ ಹಾಡು ಆಡಿ", "पृष्ठभूमि गाना चलाएँ"],',
];

if (lines.some((l) => l.startsWith('  audCta:'))) {
  console.log('audCta already present - nothing to do');
} else {
  lines.splice(at + 1, 0, ...added);
  fs.writeFileSync(p, lines.join('\n'));
  console.log('added audCta and audCtaAria');
}

// The header comment states the table's size; keep it true.
let out = fs.readFileSync(p, 'utf8');
const keys = [...out.matchAll(/^ {2}([A-Za-z0-9_]+):\s*\[/gm)].map((m) => m[1]);
const strings = [...out.matchAll(/^ {2}[A-Za-z0-9_]+:\s*\[/gm)].length;
const perKey = [...out.matchAll(/^ {2}[A-Za-z0-9_]+:\s*\[([\s\S]*?)\],$/gm)]
  .map((m) => (m[1].match(/",/g) || []).length + 1);
const counts = [...new Set(perKey)];
console.log(`keys=${keys.length} keyBlocks=${strings} stringsPerKey=${counts.join(',')}`);
const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
if (dupes.length) throw new Error('duplicate keys: ' + dupes.join(', '));

const want = `   ${keys.length} keys, ${keys.length * 5} strings, five per key.`;
out = out.replace(/^ {3}\d+ keys, \d+ strings, five per key\./m, want.trimEnd());
if (!out.includes(want)) throw new Error('header comment line not found/updated');
// The film's keys are described in the same paragraph; `audCta` is the newest of
// them and the paragraph named only the older ones.
out = out.replace(
  'introSkip) and the news keys. `audCta` and `audCtaAria` are the newest: the\n   call to action the film shows when a browser refused to start the song.',
  'introSkip) and the news keys are the oldest of the set; `audCta` and\n   `audCtaAria` are the newest - the call to action the film shows when a\n   browser refused to start the song by itself.'
);
fs.writeFileSync(p, out);
console.log('header comment now: ' + want.trim());
