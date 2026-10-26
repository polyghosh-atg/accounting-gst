import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/accounting' });
const c = await pool.connect();
// role legacy 25 (dfdsgfsdfasfs) — replicate savePermissions: delete + reinsert minus one, then restore
const role = (await c.query("SELECT id FROM roles WHERE legacy_id=25")).rows[0].id;
const before = (await c.query('SELECT permission_id FROM role_permissions WHERE role_id=$1 ORDER BY 1', [role])).rows.map((r) => r.permission_id);
await c.query('DELETE FROM role_permissions WHERE role_id=$1', [role]);
for (const pid of before.slice(1)) await c.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [role, pid]);
const mid = (await c.query('SELECT count(*) c FROM role_permissions WHERE role_id=$1', [role])).rows[0].c;
await c.query('DELETE FROM role_permissions WHERE role_id=$1', [role]);
for (const pid of before) await c.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [role, pid]);
const after = (await c.query('SELECT count(*) c FROM role_permissions WHERE role_id=$1', [role])).rows[0].c;
console.log(`before=${before.length} after-drop=${mid} restored=${after} ok=${before.length === Number(after)}`);
c.release(); await pool.end();
