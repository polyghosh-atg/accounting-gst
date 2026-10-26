import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query(`ALTER TABLE statement_lines ADD COLUMN IF NOT EXISTS remarks TEXT DEFAULT '';
ALTER TABLE statement_lines ADD COLUMN IF NOT EXISTS reconcile_date DATE;
ALTER TABLE statement_lines ADD COLUMN IF NOT EXISTS matched_refs TEXT DEFAULT '';`);
console.log('ok');
c.release(); await pool.end();
