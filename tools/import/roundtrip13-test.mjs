import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
// expense with due 1441.96 (CCTV 15-02-2026)
const ex = await c.query("SELECT id, paid, due FROM expenses WHERE due > 0 LIMIT 1");
const e = ex.rows[0];
await c.query(`INSERT INTO transactions(module,txn_type,ref_no,voucher_date,pay_mode,amount)
  VALUES('Expense','Payment','TEST-PAY','2026-10-26','Cash',100)`);
await c.query(`INSERT INTO cash_bank_entries(ref_no,vouch_type,voucher_date,from_acct,to_acct,amount,narration)
  VALUES('TEST-PAY','cash_payment','2026-10-26','CASH ACCOUNT','TEST SUP',100,'test')`);
await c.query('UPDATE expenses SET paid = paid + 100, due = GREATEST(total - (paid + 100), 0) WHERE id=$1', [e.id]);
const mid = (await c.query('SELECT paid, due FROM expenses WHERE id=$1', [e.id])).rows[0];
// revert
await c.query('DELETE FROM transactions WHERE ref_no=$1', ['TEST-PAY']);
await c.query('DELETE FROM cash_bank_entries WHERE ref_no=$1', ['TEST-PAY']);
await c.query('UPDATE expenses SET paid=$1, due=$2 WHERE id=$3', [e.paid, e.due, e.id]);
const end = (await c.query('SELECT paid, due FROM expenses WHERE id=$1', [e.id])).rows[0];
console.log(`paid ${e.paid}->${mid.paid} due ${e.due}->${mid.due} restored=${String(end.paid) === String(e.paid) && String(end.due) === String(e.due)}`);
c.release(); await pool.end();
