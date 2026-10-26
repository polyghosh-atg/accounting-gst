import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
const n0 = (await c.query('SELECT count(*) c FROM products')).rows[0].c;
const ins = await c.query(`INSERT INTO products(name,description,hsn,uom,cost,selling_price,mrp,status)
  VALUES('TEST-PROD','desc','1234','PCS',100,150,160,'Active') RETURNING id`);
const id = ins.rows[0].id;
await c.query('UPDATE products SET cost=110 WHERE id=$1', [id]);
await c.query('DELETE FROM products WHERE id=$1', [id]);
const n1 = (await c.query('SELECT count(*) c FROM products')).rows[0].c;
console.log(`products ${n0}->add->edit->delete->${n1} ok=${String(n0) === String(n1)}`);
c.release(); await pool.end();
