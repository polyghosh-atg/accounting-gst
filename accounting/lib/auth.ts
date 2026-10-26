'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { q } from '@/lib/db';
import { SESSION_COOKIE, MAX_AGE, signSession, verifySessionValue } from '@/lib/session-cookie';

const scryptAsync = promisify(scrypt);

export type SessionUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
};

async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    const [scheme, salt, hash] = String(stored || '').split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const buf = (await scryptAsync(plain, salt, 64)) as Buffer;
    const expected = Buffer.from(hash, 'hex');
    if (buf.length !== expected.length) return false;
    return timingSafeEqual(buf, expected);
  } catch {
    return false;
  }
}

export async function loginUser(
  _prev: { error: string },
  form: FormData
): Promise<{ error: string }> {
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '');
  if (!username || !password) return { error: 'Enter username and password.' };
  const rows = await q<Record<string, string>>('SELECT * FROM app_users WHERE username=$1', [username]);
  const u = rows[0] as unknown as SessionUser & { password_hash: string; status: string } | undefined;
  if (!u || u.status !== 'Active' || !(await verifyPassword(password, u.password_hash))) {
    return { error: 'Invalid username or password.' };
  }
  const token = randomBytes(32).toString('hex');
  await q(`INSERT INTO sessions(user_id, token, expires_at) VALUES($1, $2, now() + interval '30 days')`, [
    String(u.id),
    token,
  ]);
  const value = await signSession(String(u.id), token);
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
  const next = String(form.get('next') || '/');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function logoutUser() {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  const parsed = value ? await verifySessionValue(value) : null;
  if (parsed) {
    await q('DELETE FROM sessions WHERE user_id=$1 AND token=$2', [parsed.userId, parsed.token]);
  }
  jar.delete(SESSION_COOKIE);
  redirect('/login');
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  const parsed = value ? await verifySessionValue(value) : null;
  if (!parsed) return null;
  const rows = await q<Record<string, string>>(
    `SELECT u.id, u.username, u.first_name, u.last_name, u.role
     FROM sessions s JOIN app_users u ON u.id = s.user_id
     WHERE s.user_id=$1 AND s.token=$2 AND s.expires_at > now() AND u.status='Active'`,
    [parsed.userId, parsed.token]
  );
  const u = rows[0];
  if (!u) return null;
  return {
    id: Number(u.id),
    username: String(u.username),
    first_name: String(u.first_name ?? ''),
    last_name: String(u.last_name ?? ''),
    role: String(u.role ?? ''),
  };
}
