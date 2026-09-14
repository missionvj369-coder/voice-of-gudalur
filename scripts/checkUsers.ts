const main = async () => {
  const res = await fetch('https://voiceofgudalur.space/api/auth/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gudalurId: 'GD-2026-00AF09' }),
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
  process.exit(0);
};
main();
