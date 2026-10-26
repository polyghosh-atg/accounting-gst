'use server';

import { Pool } from 'pg';
import { revalidatePath } from 'next/cache';
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5433/accounting',
});

const scryptAsync = promisify(scrypt);

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `scrypt$${salt}$${buf.toString('hex')}`;
}

const str = (form: FormData, k: string) => String(form.get(k) || '').trim();

export async function addUser(form: FormData) {
  const username = str(form, 'username');
  const password = String(form.get('password') || '');
  if (!str(form, 'first_name')) throw new Error('first name required');
  if (!username) throw new Error('username required');
  if (password.length < 6) throw new Error('password must be 6+ characters');
  await pool.query(
    `INSERT INTO app_users(first_name,last_name,username,role,email,phone,status,password_hash)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      str(form, 'first_name'), str(form, 'last_name'), username,
      str(form, 'role'), str(form, 'email'), str(form, 'phone'),
      str(form, 'status') || 'Active', await hashPassword(password),
    ]
  );
  revalidatePath('/users');
}

export async function updateUser(form: FormData) {
  const id = Number(form.get('user_id'));
  if (!id) throw new Error('invalid user');
  await pool.query(
    `UPDATE app_users SET first_name=$1,last_name=$2,username=$3,role=$4,email=$5,phone=$6,status=$7 WHERE id=$8`,
    [
      str(form, 'first_name'), str(form, 'last_name'), str(form, 'username'),
      str(form, 'role'), str(form, 'email'), str(form, 'phone'),
      str(form, 'status') || 'Active', id,
    ]
  );
  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
}

export async function deleteUser(form: FormData) {
  const id = Number(form.get('user_id'));
  if (!id) throw new Error('invalid user');
  await pool.query('DELETE FROM app_users WHERE id=$1', [id]);
  revalidatePath('/users');
}

export async function changePassword(_prev: string, form: FormData): Promise<string> {
  const id = Number(form.get('user_id'));
  const p1 = String(form.get('new_password') || '');
  const p2 = String(form.get('confirm_password') || '');
  if (!id) return 'Invalid user.';
  if (p1.length < 6) return 'Password must be 6+ characters.';
  if (p1 !== p2) return 'Passwords do not match.';
  await pool.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [await hashPassword(p1), id]);
  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
  return 'Login password changed.';
}
