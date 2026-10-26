// Seed roles + permission catalog + grants (idempotent).
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/accounting' });
const J = (p) => JSON.parse(readFileSync(join(root, p), 'utf8').replace(/^\uFEFF/, ''));

const rolesDoc = J('data/parsed/roles.json');
const grantsDoc = J('data/parsed/grants.json');
const c = await pool.connect();
try {
  await c.query(`CREATE TABLE IF NOT EXISTS roles(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, name TEXT UNIQUE, description TEXT);
    CREATE TABLE IF NOT EXISTS permissions(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE, label TEXT, module TEXT);
    CREATE TABLE IF NOT EXISTS role_permissions(role_id INT REFERENCES roles(id) ON DELETE CASCADE, permission_id INT REFERENCES permissions(id) ON DELETE CASCADE, PRIMARY KEY(role_id, permission_id));`);

  for (const r of rolesDoc.roles) {
    if (!r.name) continue;
    await c.query(`INSERT INTO roles(legacy_id,name,description) VALUES($1,$2,$3)
      ON CONFLICT (legacy_id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description`,
      [r.group_id, r.name, r.description || '']);
  }
  const extraKeys = new Set();
  for (const [gid, csv] of Object.entries(grantsDoc)) {
    if (!csv) continue;
    for (const k of String(csv).split(',')) {
      const t = k.trim();
      if (t) extraKeys.add(t);
    }
  }
  for (const p of rolesDoc.permissions) {
    await c.query(`INSERT INTO permissions(legacy_id,label,module) VALUES($1,$2,$3)
      ON CONFLICT (legacy_id) DO UPDATE SET label=EXCLUDED.label, module=EXCLUDED.module`,
      [Number(p.key), p.label, p.module || '']);
  }
  for (const k of extraKeys) {
    if (isNaN(Number(k))) continue;
    await c.query(`INSERT INTO permissions(legacy_id,label,module) VALUES($1,$2,$3) ON CONFLICT (legacy_id) DO NOTHING`,
      [Number(k), `Permission ${k}`, '']);
  }

  const roleRows = (await c.query('SELECT id, legacy_id FROM roles')).rows;
  const permRows = (await c.query('SELECT id, legacy_id FROM permissions')).rows;
  const permByLeg = new Map(permRows.map((r) => [r.legacy_id, r.id]));
  let n = 0;
  for (const r of roleRows) {
    const csv = grantsDoc[String(r.legacy_id)];
    if (!csv) continue;
    await c.query('DELETE FROM role_permissions WHERE role_id=$1', [r.id]);
    for (const k of String(csv).split(',')) {
      const pid = permByLeg.get(Number(k.trim()));
      if (pid) {
        await c.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [r.id, pid]);
        n++;
      }
    }
  }
  const cnt = await c.query(`SELECT (SELECT count(*) FROM roles) roles, (SELECT count(*) FROM permissions) perms, (SELECT count(*) FROM role_permissions) grants`);
  console.log(JSON.stringify(cnt.rows[0]), 'grant inserts:', n);
} finally {
  c.release(); await pool.end();
}
