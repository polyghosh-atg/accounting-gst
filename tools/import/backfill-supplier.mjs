import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = (p) => JSON.parse(readFileSync(join(root, p), 'utf8').replace(/^\uFEFF/, ''));
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS legacy_id INT UNIQUE;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS warehouse TEXT;`);

// map csv row order -> legacy ids from raw ajax view links
const raw = J('data/raw/supplier.json').data;
const csvTxt = readFileSync(join(root, 'data', 'csv', 'supplier.csv'), 'utf8').replace(/^\uFEFF/, '');
const csvRows = csvTxt.trim().split('\n').slice(1);
for (let i = 0; i < raw.length && i < csvRows.length; i++) {
  const m = String(raw[i][raw[i].length - 1]).match(/supplier\/view\/([A-Za-z0-9+/=]+)/);
  if (!m) continue;
  const leg = parseInt(Buffer.from(m[1], 'base64').toString(), 10);
  const name = csvRows[i].split('","')[0].replace(/^"|"$/g, '');
  const hit = await c.query('SELECT id FROM suppliers WHERE company_name=$1 AND legacy_id IS NULL LIMIT 1', [name]);
  if (hit.rows.length) {
    await c.query('UPDATE suppliers SET legacy_id=$1 WHERE id=$2', [leg, hit.rows[0].id]);
  }
}
// enrich from parsed view pages
const docs = J('data/parsed/supplier.json');
let n = 0;
for (const d of docs) {
  const f = d.fields || {};
  if (!f['Company Name']) continue;
  await c.query(`UPDATE suppliers SET company_name=$1, reg_type=$2, gstin=$3, email=$4, phone=$5,
    address=$6, country=$7, state=$8, city=$9, website=$10 WHERE legacy_id=$11`,
    [f['Company Name'], f['Registration Type'] || 'Not Registered', f['GSTIN'] || '', f['Email'] || '',
     f['Phone'] || '', f['Address'] || '', f['Country'] || '', f['State'] || '', f['City'] || '',
     f['Website'] || '', d.legacyId]);
  n++;
}
console.log('suppliers enriched:', n);
c.release(); await pool.end();
