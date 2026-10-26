import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
// replicate depositPdc for pdc_receives id=1 (VAIDEHI ewrwe 233)
const p = (await c.query('SELECT * FROM pdc_receives WHERE id=1')).rows[0];
await c.query(`INSERT INTO cash_bank_entries(ref_no,vouch_type,voucher_date,from_acct,to_acct,amount,narration)
  VALUES('PDC-TEST','bank_receipt','2026-10-26',$1,$2,$3,'PDC ewrwe')`, [p.ledger, p.deposit_to, p.amount]);
await c.query("UPDATE pdc_receives SET status='Deposited', deposit_date='2026-10-26' WHERE id=1");
const mid = (await c.query('SELECT status FROM pdc_receives WHERE id=1')).rows[0].status;
const v = (await c.query("SELECT count(*) c FROM cash_bank_entries WHERE ref_no='PDC-TEST'")).rows[0].c;
// revert
await c.query("DELETE FROM cash_bank_entries WHERE ref_no='PDC-TEST'");
await c.query("UPDATE pdc_receives SET status='Pending', deposit_date='2025-11-29' WHERE id=1");
const end = (await c.query('SELECT status FROM pdc_receives WHERE id=1')).rows[0].status;
console.log(`deposit flow: status=${mid}, voucher rows=${v}, reverted=${end}`);
c.release(); await pool.end();
