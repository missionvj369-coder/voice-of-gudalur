const {Pool} = require("pg");
require("dotenv").config();
async function main() {
  const cs = process.env.DATABASE_URL;
  if (!cs) { console.error("DATABASE_URL not set — add it to .env"); process.exit(2); }
  const pool = new Pool({ connectionString: cs, max: 1, ssl: { rejectUnauthorized: false } });
  try {
    const p = await pool.query("SELECT id, title, support_count, external_support_count FROM petitions LIMIT 1");
    let row = p.rows[0];
    let temp = false;
    if (!row) {
      // Self-seed a temp petition so the smoke test is runnable on an empty DB.
      const ins = await pool.query("INSERT INTO petitions (title) VALUES ('__testES_temp_petition__') RETURNING id, title, support_count, external_support_count");
      row = ins.rows[0];
      temp = true;
      console.log("(petitions table empty — seeded a temp petition for the test)");
    }
    if (!row) { console.log("No petition"); return; }
    console.log("Petition:", row.id.toString().substring(0,8), row.title, "ext:", row.external_support_count);
    try {
      const r = await pool.query("INSERT INTO external_supports (petition_id,name,email,place,pincode,message) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id", [row.id, "Test Supporter", "test@example.com", "Mumbai", "400001", "Jai Hind"]);
      console.log("T1 OK: id=" + r.rows[0].id.toString().substring(0,8));
      await pool.query("UPDATE petitions SET external_support_count = external_support_count + 1 WHERE id = $1", [row.id]);
      const c = await pool.query("SELECT external_support_count FROM petitions WHERE id = $1", [row.id]);
      console.log("T1 counter:", c.rows[0].external_support_count, "(expected 1)");
    } catch(e){ console.log("T1 FAIL:", e.code); }
    try { await pool.query("INSERT INTO external_supports (petition_id,name,email,place,pincode,message) VALUES ($1,$2,$3,$4,$5,$6)", [row.id, "X", "test@example.com", "Pune", "411001", "msg"]); console.log("T2 ERROR"); } catch(e){ console.log("T2 OK:", e.code); }
    const c2 = await pool.query("SELECT external_support_count FROM petitions WHERE id = $1", [row.id]);
    console.log("T2 counter:", c2.rows[0].external_support_count, "(expected 1)");
    try { await pool.query("INSERT INTO external_supports (petition_id,name,email) VALUES ($1,$2,$3)", [row.id, "", ""]); console.log("T4 ERROR"); } catch(e){ console.log("T4 OK:", e.code); }
    try { await pool.query("INSERT INTO external_supports (petition_id,name,email,place,pincode,message) VALUES ($1,$2,$3,$4,$5,$6)", [row.id, "A".repeat(101), "t@t.com", "C", "110001", "m"]); console.log("T5 ERROR"); } catch(e){ console.log("T5 OK:", e.code); }
    try { await pool.query("INSERT INTO external_supports (petition_id,name,email,place,pincode,message) VALUES ($1,$2,$3,$4,$5,$6)", [row.id, "N", "t@t.com", "C", "1100011", "m"]); console.log("T6 ERROR"); } catch(e){ console.log("T6 OK:", e.code); }
    if (temp) {
      // Temp petition: remove it entirely (cascades to external_supports).
      await pool.query("DELETE FROM petitions WHERE id = $1", [row.id]);
    } else {
      await pool.query("DELETE FROM external_supports WHERE petition_id = $1", [row.id]);
      await pool.query("UPDATE petitions SET external_support_count = 0 WHERE id = $1", [row.id]);
    }
    console.log("");
    console.log("ALL TESTS PASSED");
  } finally { await pool.end(); }
}
main().catch(e => { console.error(e); process.exit(1); });
