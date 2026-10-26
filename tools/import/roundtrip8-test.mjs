import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
// replicate bulkAddEntries: auto refs from doc_sequences
const seq = await c.query(`INSERT INTO doc_sequences(doc_type, prefix) VALUES('cash_payment','CP')
  ON CONFLICT (doc_type) DO UPDATE SET next_seq = doc_sequences.next_seq + 1 RETURNING next_seq`);
const ref = `CP${seq.rows[0].next_seq}`;
await c.query(`INSERT INTO cash_bank_entries(ref_no,vouch_type,voucher_date,from_acct,to_acct,amount,narration)
  VALUES($1,'cash_payment','2026-10-26','CASH ACCOUNT','TEST BULK',75,'bulk t1'),($2,'cash_receipt','2026-10-26','TEST BULK','CASH ACCOUNT',125,'bulk t2')`,
  [ref, ref + '-R']);
const n = (await c.query("SELECT count(*) c FROM cash_bank_entries WHERE narration IN ('bulk t1','bulk t2')")).rows[0].c;
await c.query("DELETE FROM cash_bank_entries WHERE narration IN ('bulk t1','bulk t2')");
console.log('bulk staged rows:', n, 'auto-ref worked:', ref.startsWith('CP'));
c.release(); await pool.end();
