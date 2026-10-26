import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entry_id INT');
const o = JSON.parse(readFileSync(join(root, '_scrape', 'recon_bank_statement_reconcile_entry_Mw==.html'), 'utf8').replace(/^\uFEFF/, ''));
let n = 0;
for (const t of o.transaction_entries) {
  await c.query('UPDATE transactions SET entry_id=$1 WHERE legacy_id=$2', [Number(t.entry_id) || null, Number(t.transaction_id)]);
  n++;
}
const s = await c.query("SELECT count(*) c FROM transactions WHERE module='Expense'");
console.log('txns updated:', n, 'expense txns:', s.rows[0].c);
c.release(); await pool.end();
