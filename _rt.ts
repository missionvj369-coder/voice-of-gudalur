import { createApp } from './server';

async function main() {
  try {
    const app = await createApp();
    const server = app.listen(3996, '0.0.0.0', () => console.log('READY'));
    const stop = () => { server.close(); process.exit(0); };
    setTimeout(stop, 30000);
  } catch (e: any) {
    console.error('INIT FAILED:', e?.stack || e?.message || e);
    process.exit(1);
  }
}
void main();