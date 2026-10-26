import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
console.time('pdc');
const r = await pool.query('SELECT * FROM pdc_receives ORDER BY id DESC');
console.timeEnd('pdc');
console.log('rows:', r.rows.length, JSON.stringify(r.rows[0]));
console.time('ledgers');
const [b, cu, su] = await Promise.all([
  pool.query('SELECT name FROM bank_accounts ORDER BY name'),
  pool.query('SELECT company_name FROM customers ORDER BY company_name'),
  pool.query('SELECT company_name FROM suppliers ORDER BY company_name'),
]);
console.timeEnd('ledgers');
console.log('banks:', b.rows.length, 'cust:', cu.rows.length, 'sup:', su.rows.length);
await pool.end();
