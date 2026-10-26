import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
const d = await c.query(
  `INSERT INTO scrap_docs(kind,ref_no,entry_date,warehouse,party,internal_note) VALUES('issue','TEST-SI9','2026-10-26','Warehouse - A','UPL','handle with care') RETURNING id`);
const id = d.rows[0].id;
await c.query(`INSERT INTO scrap_lines(doc_id,product,batch_no,qty,cost,selling_price,price) VALUES
  ($1,'Dome Camera with a very long product description for wrap testing','B2',2,950,1350,1200)`, [id]);
console.log('doc id:', id);
c.release(); await pool.end();
