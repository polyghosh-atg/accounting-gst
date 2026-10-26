import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query(`ALTER TABLE scrap_lines ADD COLUMN IF NOT EXISTS warehouse TEXT DEFAULT '';
ALTER TABLE scrap_lines ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0;
ALTER TABLE scrap_lines ADD COLUMN IF NOT EXISTS tax_amt NUMERIC DEFAULT 0;`);
const ex = await c.query("SELECT id FROM scrap_docs WHERE ref_no='SP1055'");
if (!ex.rows.length) {
  const d = await c.query(`INSERT INTO scrap_docs(kind,ref_no,entry_date,warehouse,party)
    VALUES('issue','SP1055','2026-05-17','Warehouse - A','LG Electornics') RETURNING id`);
  await c.query(`INSERT INTO scrap_lines(doc_id,product,warehouse,batch_no,qty,cost,selling_price,price,tax_rate,tax_amt)
    VALUES($1,'NOKIA 3110','Warehouse - A','abc',1,5000,9000,9000,15,750)`, [d.rows[0].id]);
  console.log('SP1055 imported');
} else console.log('SP1055 exists');
c.release(); await pool.end();
