import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
const r = await c.query('SELECT id, ref_no, kind FROM scrap_docs');
console.log(JSON.stringify(r.rows));
c.release(); await pool.end();
