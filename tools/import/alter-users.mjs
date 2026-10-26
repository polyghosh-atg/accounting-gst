import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT');
console.log('altered');
c.release(); await pool.end();
