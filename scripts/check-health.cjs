// quick health check against production
const https = require('https');

const target = process.env.TARGET || 'https://voiceofgudalur.space/api/health';

https.get(target, function(res) {
  let d = '';
  res.on('data', function(c) { d += c; });
  res.on('end', function() {
    console.log('STATUS:' + res.statusCode);
    console.log('HEADERS:' + JSON.stringify(res.headers));
    console.log('BODY:' + d.substring(0, 1000));
  });
}).on('error', function(e) {
  console.log('ERR:' + e.message);
  process.exit(1);
});