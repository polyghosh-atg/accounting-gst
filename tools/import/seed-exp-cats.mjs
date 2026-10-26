import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
await c.query(`CREATE TABLE IF NOT EXISTS expense_categories(id SERIAL PRIMARY KEY, name TEXT UNIQUE, description TEXT, type TEXT)`);
const misc = (await c.query("SELECT * FROM misc WHERE kind='expense_category'")).rows;
for (const m of misc) {
  await c.query('INSERT INTO expense_categories(name,description,type) VALUES($1,$2,$3) ON CONFLICT (name) DO NOTHING',
    [m.c1, m.c2, m.c3]);
}
const r = await c.query('SELECT * FROM expense_categories');
console.log(JSON.stringify(r.rows));
c.release(); await pool.end();
