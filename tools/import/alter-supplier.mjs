import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS warehouse TEXT;`);
// backfill websites from parsed supplier view pages
let n = 0;
try {
  const docs = JSON.parse(readFileSync(join(root, 'data', 'parsed', 'supplier.json'), 'utf8'));
  const sups = (await c.query('SELECT id, company_name FROM suppliers')).rows;
  for (const d of docs) {
    const f = d.fields || {};
    const name = f['Company Name'] || '';
    const hit = sups.find((s) => s.company_name === name);
    if (hit && f['Website']) {
      await c.query('UPDATE suppliers SET website=$1 WHERE id=$2', [f['Website'], hit.id]);
      n++;
    }
  }
} catch { console.log('no parsed supplier views yet'); }
console.log('websites backfilled:', n);
c.release(); await pool.end();
