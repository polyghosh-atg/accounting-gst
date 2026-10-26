import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
const iso = (s) => {
  if (!s) return null;
  const m = String(s).match(/(\d{2})-(\d{2})-(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
try {
  await c.query(`ALTER TABLE cash_bank_entries ADD COLUMN IF NOT EXISTS voucher_date DATE;
    ALTER TABLE cash_bank_entries ADD COLUMN IF NOT EXISTS narration TEXT;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid NUMERIC DEFAULT 0;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due NUMERIC DEFAULT 0;
    CREATE TABLE IF NOT EXISTS bank_statements(id SERIAL PRIMARY KEY, account_name TEXT, account_number TEXT, account_type TEXT, bank_name TEXT, statement TEXT, reconcile_status TEXT DEFAULT 'Unreconciled');
    CREATE TABLE IF NOT EXISTS pdc_receives(id SERIAL PRIMARY KEY, ledger TEXT, sale_ref TEXT, cheque_no TEXT, cheque_date DATE, deposit_date DATE, amount NUMERIC DEFAULT 0, deposit_to TEXT, status TEXT DEFAULT 'Pending');
    CREATE TABLE IF NOT EXISTS pdc_payments(id SERIAL PRIMARY KEY, ledger TEXT, purchase_ref TEXT, cheque_no TEXT, cheque_date DATE, deposit_date DATE, amount NUMERIC DEFAULT 0, deposit_to TEXT, status TEXT DEFAULT 'Pending');
    CREATE TABLE IF NOT EXISTS scrap_docs(id SERIAL PRIMARY KEY, kind TEXT, ref_no TEXT UNIQUE, entry_date DATE, warehouse TEXT, party TEXT, status TEXT DEFAULT 'Active');
    CREATE TABLE IF NOT EXISTS scrap_lines(id SERIAL PRIMARY KEY, doc_id INT REFERENCES scrap_docs(id) ON DELETE CASCADE, product TEXT, batch_no TEXT, qty NUMERIC DEFAULT 0, cost NUMERIC DEFAULT 0, price NUMERIC DEFAULT 0);
    CREATE TABLE IF NOT EXISTS expense_items(id SERIAL PRIMARY KEY, expense_id INT REFERENCES expenses(id) ON DELETE CASCADE, item_name TEXT, taxable NUMERIC DEFAULT 0, igst NUMERIC DEFAULT 0, cgst NUMERIC DEFAULT 0, sgst NUMERIC DEFAULT 0);`);

  // migrate misc -> tables (once)
  const misc = (await c.query('SELECT * FROM misc')).rows;
  let moved = 0;
  for (const m of misc) {
    if (m.kind === 'bank_statement') {
      const ex = await c.query('SELECT id FROM bank_statements WHERE account_name=$1 AND statement=$2', [m.c1, m.c5]);
      if (!ex.rows.length) {
        await c.query('INSERT INTO bank_statements(account_name,account_number,account_type,bank_name,statement,reconcile_status) VALUES($1,$2,$3,$4,$5,$6)',
          [m.c1, m.c2, m.c3, m.c4, m.c5, m.c6 || 'Unreconciled']);
        moved++;
      }
    } else if (m.kind === 'pdc_receive') {
      const ex = await c.query('SELECT id FROM pdc_receives WHERE ledger=$1 AND cheque_no=$2', [m.c1, m.c2]);
      if (!ex.rows.length) {
        await c.query('INSERT INTO pdc_receives(ledger,cheque_no,cheque_date,amount,deposit_to,deposit_date) VALUES($1,$2,$3,$4,$5,$6)',
          [m.c1, m.c2, iso(m.c3), parseFloat(m.c4) || 0, m.c5, iso(m.c6)]);
        moved++;
      }
    } else if (m.kind === 'pdc_payment') {
      const ex = await c.query('SELECT id FROM pdc_payments WHERE ledger=$1 AND cheque_no=$2', [m.c1, m.c2]);
      if (!ex.rows.length) {
        await c.query('INSERT INTO pdc_payments(ledger,cheque_no,cheque_date,amount,deposit_to,deposit_date) VALUES($1,$2,$3,$4,$5,$6)',
          [m.c1, m.c2, iso(m.c3), parseFloat(m.c4) || 0, m.c5, iso(m.c6)]);
        moved++;
      }
    }
  }

  // backfill expenses paid/due from CSV
  const txt = readFileSync(join(root, 'data', 'csv', 'expense.csv'), 'utf8').replace(/^\uFEFF/, '');
  const num = (s) => { const v = parseFloat(String(s || '').replace(/[^0-9.\-]/g, '')); return isNaN(v) ? 0 : v; };
  for (const ln of txt.trim().split('\n').slice(1)) {
    const cols = ln.split('","').map((x) => x.replace(/^"|"$/g, ''));
    // c1..c9 generic: date, category, supplier, ?, ?, amounts..., actions
    await c.query('UPDATE expenses SET paid=$1, due=$2 WHERE bill_date=$3 AND category=$4',
      [num(cols[6]), num(cols[7]), iso(cols[0]), cols[1]]);
  }

  // expense items from parsed views: parsed expense.json only kept table heads, not rows;
  // items live in data/raw/details/expense/*.html — parsed on demand by the detail page. Skipped here.

  const cnt = await c.query(`SELECT (SELECT count(*) FROM bank_statements) bs, (SELECT count(*) FROM pdc_receives) pr,
    (SELECT count(*) FROM pdc_payments) pp, (SELECT count(*) FROM scrap_docs) sc`);
  console.log('migrated from misc:', moved, JSON.stringify(cnt.rows[0]));
} finally {
  c.release(); await pool.end();
}
