/**
 * Split a SQL script into top-level statements.
 *
 * Respects single-quoted strings (with '' escapes), double-quoted
 * identifiers, dollar-quoted bodies ($$ … $$ / $tag$ … $tag$), and strips
 * -- line / /* block *​/ comments. Needed because CockroachDB function
 * bodies (LANGUAGE plpgsql … $$) contain semicolons that must not split.
 */
export function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let dollarTag: string | null = null;

  while (i < sql.length) {
    const two = sql.slice(i, i + 2);

    // Comments (outside quotes / dollar bodies)
    if (!inSingle && !inDouble && !dollarTag && two === '--') {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? sql.length : end; // keep the newline
      continue;
    }
    if (!inSingle && !inDouble && !dollarTag && two === '/*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }

    const ch = sql[i];

    if (!inSingle && !inDouble && !dollarTag && ch === "'") {
      inSingle = true; cur += ch; i++; continue;
    }
    if (inSingle) {
      if (ch === "'") {
        if (sql[i + 1] === "'") { cur += "''"; i += 2; continue; } // '' escape
        inSingle = false;
      }
      cur += ch; i++; continue;
    }
    if (!inDouble && !dollarTag && ch === '"') {
      inDouble = true; cur += ch; i++; continue;
    }
    if (inDouble) {
      if (ch === '"') inDouble = false;
      cur += ch; i++; continue;
    }

    // Dollar-quoted regions ($$ … $$, $tag$ … $tag$)
    if (!dollarTag && ch === '$') {
      const m = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i));
      if (m) { dollarTag = m[0]; cur += m[0]; i += m[0].length; continue; }
    }
    if (dollarTag && sql.startsWith(dollarTag, i)) {
      cur += dollarTag;
      i += dollarTag.length;
      dollarTag = null;
      continue;
    }

    // Statement terminator
    if (!inSingle && !inDouble && !dollarTag && ch === ';') {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      i++;
      continue;
    }

    cur += ch;
    i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * Postgres error class codes for "already exists" style failures. When a
 * migration statement hits one of these the schema element already exists —
 * treat the statement as satisfied (schema convergence over partial DBs).
 */
export function isAlreadyExistsError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  if (['42P07', '42710', '42701', '42712', '42P16', '42704'].includes(e.code || '')) return true;
  return /already exists|duplicate/i.test(e.message || '');
}