const vm = require('vm');
const fs = require('fs');
const b = fs.readFileSync('static-petition/assets/vog-support.js');
let s = b.slice(22).toString('utf16le');
// Normalize: collapse ZWJ + LF-like stray chars to nothing
s = s.replace(/[\u200d\u0a0d]+/g, '');
s = s.replace(/\0/g, '');
console.log('head:', JSON.stringify(s.slice(0, 30)));
try {
  vm.runInNewContext(s, { console: console });
  console.log('JS syntax OK');
} catch (e) {
  console.log('ERR:', String(e.message).slice(0, 120));
}
