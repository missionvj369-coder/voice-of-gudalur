const main = async () => {
  // Test the unique deploy URL first
  const deployUrl = 'https://6aa788279e2cb900d0a0a98c--voiceofgudalur.netlify.app';
  
  console.log('Testing unique deploy URL:', deployUrl);
  const res1 = await fetch(deployUrl + '/api/auth/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gudalurId: 'GD-2026-00AF09' }),
  });
  console.log('  Status:', res1.status);
  console.log('  Body:', await res1.text());
  
  console.log('\nTesting production URL: voiceofgudalur.space');
  const res2 = await fetch('https://voiceofgudalur.space/api/auth/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gudalurId: 'GD-2026-00AF09' }),
  });
  console.log('  Status:', res2.status);
  console.log('  Body:', await res2.text());
  
  process.exit(0);
};
main();
