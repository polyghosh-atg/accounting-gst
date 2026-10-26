import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query(`UPDATE scrap_lines SET warehouse='Warehouse - A' WHERE doc_id=(SELECT id FROM scrap_docs WHERE ref_no='SP1055')`);
await c.query(`CREATE TABLE IF NOT EXISTS company_settings(id SERIAL PRIMARY KEY, name TEXT, addr1 TEXT, addr2 TEXT,
  city TEXT, state TEXT, country TEXT, pincode TEXT, phone TEXT, email TEXT, gstin TEXT)`);
const ex = await c.query('SELECT count(*) c FROM company_settings');
if (ex.rows[0].c === '0') {
  await c.query(`INSERT INTO company_settings(name,addr1,addr2,city,state,country,pincode,phone,email,gstin)
    VALUES('Zivaan Solutions','kotbali bazar','abd','Dharamshala','Himachal Pradesh','India','176215','9318019231','mk9332994@gmail.com','02BINPK2730F1ZN')`);
}
console.log('ok');
c.release(); await pool.end();
