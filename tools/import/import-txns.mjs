import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const num = (s) => { const v = parseFloat(String(s ?? '').replace(/[^0-9.\-]/g, '')); return isNaN(v) ? 0 : v; };
const iso = (s) => {
  if (!s) return null;
  let m = String(s).match(/(\d{2})-(\d{2})-(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? String(s).slice(0, 10) : null;
};
const c = await pool.connect();
await c.query(`CREATE TABLE IF NOT EXISTS transactions(id SERIAL PRIMARY KEY, legacy_id INT UNIQUE,
  module TEXT, txn_type TEXT, ref_no TEXT, voucher_date DATE, pay_mode TEXT,
  cheque_no TEXT, cheque_date DATE, amount NUMERIC DEFAULT 0);
CREATE INDEX IF NOT EXISTS transactions_amount_idx ON transactions(amount);`);
const MOD = { S: 'Sale', SR: 'Sales Return', P: 'Purchase', PR: 'Purchase Return', E: 'Expense', CB: 'Cash Bank', B: 'Bank Account' };
const TYP = { R: 'Receipt', P: 'Payment' };
const MODE = { 0: 'Cash', 1: 'Cheque', 2: 'NEFT/RTGS/Online Transfer', 3: 'Credit Card' };
const o = JSON.parse(readFileSync(join(root, '_scrape', 'recon_bank_statement_reconcile_entry_Mw==.html'), 'utf8').replace(/^\uFEFF/, ''));
console.log('keys:', Object.keys(o), 'entries:', o.transaction_entries.length);
let n = 0;
for (const t of o.transaction_entries) {
  await c.query(`INSERT INTO transactions(legacy_id,module,txn_type,ref_no,voucher_date,pay_mode,cheque_no,cheque_date,amount)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (legacy_id) DO UPDATE SET amount=EXCLUDED.amount`,
    [Number(t.transaction_id), MOD[t.module] || t.module, TYP[t.type] || t.type, t.reference_no || t.ref_no || '',
     iso(t.voucher_date), MODE[t.mode] || t.mode || 'Cash',
     t.cheque_no && t.cheque_no !== '0' ? t.cheque_no : '', iso(t.cheque_date), num(t.amount)]);
  n++;
}
const s = await c.query('SELECT count(*) c FROM transactions');
console.log('ledger rows:', n, JSON.stringify(s.rows[0]));
c.release(); await pool.end();
