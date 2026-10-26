import pg from 'pg';
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
const scryptAsync = promisify(scrypt);
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
const n0 = (await c.query('SELECT count(*) c FROM app_users')).rows[0].c;
// add
const salt = randomBytes(16).toString('hex');
const h1 = `scrypt$${salt}$${((await scryptAsync('test1234', salt, 64))).toString('hex')}`;
const ins = await c.query(
  `INSERT INTO app_users(first_name,last_name,username,role,email,phone,status,password_hash)
   VALUES('Test','User','testuser','admin','t@t.co','999','Active',$1) RETURNING id`, [h1]);
const id = ins.rows[0].id;
// edit
await c.query("UPDATE app_users SET phone='888', status='Inactive' WHERE id=$1", [id]);
// password change
const salt2 = randomBytes(16).toString('hex');
const h2 = `scrypt$${salt2}$${((await scryptAsync('newpass99', salt2, 64))).toString('hex')}`;
await c.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [h2, id]);
const ph = (await c.query('SELECT password_hash, phone, status FROM app_users WHERE id=$1', [id])).rows[0];
// delete
await c.query('DELETE FROM app_users WHERE id=$1', [id]);
const n1 = (await c.query('SELECT count(*) c FROM app_users')).rows[0].c;
console.log(`count ${n0}->add->edit->passwd->delete->${n1} ok=${String(n0) === String(n1)} hashOk=${ph.password_hash.startsWith('scrypt$') && ph.phone === '888'}`);
c.release(); await pool.end();
