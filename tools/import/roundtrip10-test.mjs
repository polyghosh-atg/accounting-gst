import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
// test statement + 2 lines, one matching an existing voucher amount (5000)
const s = await c.query(`INSERT INTO bank_statements(account_name,account_number,account_type,bank_name,statement,reconcile_status)
  VALUES('Vaidehi','123456789','Saving','SBI','TEST-REC','Pending') RETURNING id`);
const sid = s.rows[0].id;
await c.query(`INSERT INTO statement_lines(statement_id,sr,txn_date,cheque_no,particulars,withdraw,deposit)
  VALUES($1,1,'2026-10-01','CH1','test w',5000,0),($1,2,'2026-10-02','','test d',0,900)`, [sid]);
// replicate reconcileLines: match line1 with BP1044, line2 with BP1048
await c.query(`UPDATE statement_lines SET reconciled='Completed', reconcile_date='2026-10-26', matched_refs='BP1044' WHERE statement_id=$1 AND sr=1`, [sid]);
await c.query(`UPDATE statement_lines SET reconciled='Completed', reconcile_date='2026-10-26', matched_refs='BP1048' WHERE statement_id=$1 AND sr=2`, [sid]);
await c.query(`UPDATE bank_statements SET reconcile_status=(SELECT CASE WHEN count(*)=count(*) FILTER (WHERE reconciled='Completed') THEN 'Completed' ELSE 'Pending' END FROM statement_lines WHERE statement_id=$1) WHERE id=$1`, [sid]);
const st = (await c.query('SELECT reconcile_status FROM bank_statements WHERE id=$1', [sid])).rows[0].reconcile_status;
const ml = (await c.query('SELECT matched_refs FROM statement_lines WHERE statement_id=$1 ORDER BY sr', [sid])).rows.map((r) => r.matched_refs);
console.log('status:', st, 'matched:', ml.join(' | '));
await c.query('DELETE FROM statement_lines WHERE statement_id=$1', [sid]);
await c.query('DELETE FROM bank_statements WHERE id=$1', [sid]);
console.log('cleaned up');
c.release(); await pool.end();
