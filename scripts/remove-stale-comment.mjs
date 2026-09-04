// One-off: removes the stale, mojibake-damaged comment block at the end of
// server.ts's createApp() (it described logic that moved into startServer).
// Run: node scripts/remove-stale-comment.mjs
import fs from 'fs';

const p = 'd:/voice of gudalur/server.ts';
const text = fs.readFileSync(p, 'utf8');
const lines = text.split('\n');
const i = lines.findIndex((l) => l.includes('Serve the production build when deployed'));
console.log('found at 0-based index:', i);
if (i > 0) {
  const kept = [...lines.slice(0, i), ...lines.slice(i + 4)];
  fs.writeFileSync(p, kept.join('\n'), 'utf8');
  console.log('removed 4 stale comment lines; new tail (last 18 lines):');
  console.log(kept.slice(-18).join('\n'));
} else {
  console.log('NOT FOUND - no change');
}
