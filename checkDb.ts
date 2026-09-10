import { query, end } from './server/db/client.js';

async function main() {
  const r = await query('SELECT current_database(), inet_server_addr()');
  console.log(r.rows);
  await end();
}
main();
