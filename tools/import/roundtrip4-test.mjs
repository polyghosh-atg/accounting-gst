import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
const n0 = (await c.query('SELECT count(*) c FROM customers')).rows[0].c;
const ins = await c.query(
  `INSERT INTO customers(company_name,name,gstin,email,phone,country,state,city,address,pincode,ship_country,ship_state,ship_city,ship_address,ship_pincode)
   VALUES('TESTCO','Tester','22AAAAA0000A1Z5','t@t.co','9999999999','India','Gujarat','Bharuch','Addr','392001','India','Gujarat','Bharuch','Addr','392001') RETURNING id`);
const id = ins.rows[0].id;
await c.query('UPDATE customers SET phone=$1 WHERE id=$2', ['8888888888', id]);
const phone = (await c.query('SELECT phone FROM customers WHERE id=$1', [id])).rows[0].phone;
await c.query('DELETE FROM customers WHERE id=$1', [id]);
const n1 = (await c.query('SELECT count(*) c FROM customers')).rows[0].c;
console.log(`count ${n0} -> +1 -> edit phone=${phone} -> delete -> ${n1} ok=${String(n0) === String(n1)}`);
c.release(); await pool.end();
