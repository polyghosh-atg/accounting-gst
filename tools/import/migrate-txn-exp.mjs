import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expense_id INT REFERENCES expenses(id) ON DELETE CASCADE');
console.log('ok');
c.release(); await pool.end();
