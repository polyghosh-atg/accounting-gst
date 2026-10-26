import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query("INSERT INTO cash_bank_entries(ref_no,vouch_type,from_acct,to_acct,amount,narration) VALUES('BULK-T1','cash_payment','CASH ACCOUNT','TEST LEDGER',100,'t1'),('BULK-T2','cash_receipt','TEST LEDGER','CASH ACCOUNT',250,'t2')");
const n = (await c.query("SELECT count(*) c, COALESCE(SUM(amount),0) s FROM cash_bank_entries WHERE ref_no IN ('BULK-T1','BULK-T2')")).rows[0];
await c.query("DELETE FROM cash_bank_entries WHERE ref_no IN ('BULK-T1','BULK-T2')");
console.log('bulk rows: ' + n.c + ' total: ' + n.s);
c.release(); await pool.end();
