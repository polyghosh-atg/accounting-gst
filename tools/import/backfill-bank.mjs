// Backfill bank_accounts.type/description from CSV (matched by name).
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const txt = readFileSync(join(root, 'data', 'csv', 'bank_account.csv'), 'utf8').replace(/^\uFEFF/, '');
const lines = txt.trim().split('\n').slice(1);
const c = await pool.connect();
for (const ln of lines) {
  const cols = ln.split('","').map((x) => x.replace(/^"|"$/g, ''));
  const [name, number, bank, ifsc, desc, opening, closing, status] = cols;
  await c.query(`UPDATE bank_accounts SET description=$1 WHERE name=$2`, [desc || '', name]);
}
const r = await c.query('SELECT name, type, description FROM bank_accounts LIMIT 3');
console.log(JSON.stringify(r.rows, null, 1));
c.release(); await pool.end();
