import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
const d = await c.query(
  `INSERT INTO scrap_docs(kind,ref_no,entry_date,warehouse,party) VALUES('entry','TEST-SE1','2026-10-25','Warehouse - A','') RETURNING id`);
const id = d.rows[0].id;
await c.query(`INSERT INTO scrap_lines(doc_id,product,batch_no,qty,cost,price) VALUES
  ($1,'Attar','B1',10,800,1050), ($1,'Dome Camera','B2',2,950,1350)`, [id]);
const t = (await c.query('SELECT count(*) n, COALESCE(SUM(qty),0) q, COALESCE(SUM(qty*price),0) a FROM scrap_lines WHERE doc_id=$1', [id])).rows[0];
console.log('lines:', t.n, 'qty:', t.q, 'amount:', t.a);
await c.query('DELETE FROM scrap_lines WHERE doc_id=$1', [id]);
await c.query('DELETE FROM scrap_docs WHERE id=$1', [id]);
const gone = (await c.query('SELECT count(*) c FROM scrap_docs WHERE ref_no=$1', ['TEST-SE1'])).rows[0].c;
console.log('deleted ok:', gone === '0');
c.release(); await pool.end();
