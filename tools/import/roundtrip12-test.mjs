import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
const d = await c.query(
  `INSERT INTO scrap_docs(kind,ref_no,entry_date,warehouse,party,internal_note) VALUES('entry','TEST-SE9','2026-10-26','Warehouse - A','','test note') RETURNING id`);
const id = d.rows[0].id;
await c.query(`INSERT INTO scrap_lines(doc_id,product,batch_no,qty,cost,selling_price,price) VALUES
  ($1,'Attar','B1',10,800,1050,1000), ($1,'Dome Camera','B2',2,950,1350,1200)`, [id]);
const t = (await c.query('SELECT COALESCE(SUM(qty*cost),0) tax, COALESCE(SUM(qty*price),0) amt FROM scrap_lines WHERE doc_id=$1', [id])).rows[0];
const note = (await c.query('SELECT internal_note FROM scrap_docs WHERE id=$1', [id])).rows[0].internal_note;
console.log('taxable:', t.tax, 'amount:', t.amt, 'note:', note);
await c.query('DELETE FROM scrap_lines WHERE doc_id=$1', [id]);
await c.query('DELETE FROM scrap_docs WHERE id=$1', [id]);
console.log('cleaned up');
c.release(); await pool.end();
