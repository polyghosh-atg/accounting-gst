import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query(`ALTER TABLE scrap_lines ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0;
ALTER TABLE scrap_docs ADD COLUMN IF NOT EXISTS internal_note TEXT DEFAULT '';`);
console.log('ok');
c.release(); await pool.end();
