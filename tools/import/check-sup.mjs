import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
const r = await c.query('SELECT company_name, city, website FROM suppliers LIMIT 4');
console.log(JSON.stringify(r.rows));
const w = await c.query("SELECT count(*) c FROM purchases WHERE warehouse IS NOT NULL AND warehouse <> ''");
console.log('purchases with warehouse:', w.rows[0].c);
c.release(); await pool.end();
