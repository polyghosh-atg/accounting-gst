import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
const r = await c.query('SELECT count(*) c, COALESCE(SUM(igst_tax),0) i, COALESCE(SUM(cgst_tax),0) g, COALESCE(SUM(sgst_tax),0) s FROM sale_lines');
console.log(JSON.stringify(r.rows[0]));
c.release(); await pool.end();
