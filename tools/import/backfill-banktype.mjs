import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query(`UPDATE bank_accounts SET type='Saving'`);
console.log('types set');
c.release(); await pool.end();
