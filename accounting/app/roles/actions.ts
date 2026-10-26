'use server';

import { Pool } from 'pg';
import { revalidatePath } from 'next/cache';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

export async function savePermissions(roleId: number, permissionIds: number[]) {
  const ids = [...new Set(permissionIds.map(Number).filter((n) => !isNaN(n)))];
  await pool.query('DELETE FROM role_permissions WHERE role_id=$1', [roleId]);
  for (const pid of ids) {
    await pool.query(
      'INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [roleId, pid]
    );
  }
  revalidatePath('/roles');
  revalidatePath(`/roles/${roleId}`);
}
