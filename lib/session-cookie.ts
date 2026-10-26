/* Edge-safe session cookie signing (Web Crypto only — no Buffer).
   Cookie value: `${userId}.${token}.${hmacHex}` */

export const SESSION_COOKIE = 'acct_session';
const MAX_AGE = 30 * 24 * 3600;

function secret(): string {
  return process.env.SESSION_SECRET ?? 'dev-secret-change-me';
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function signSession(userId: string, token: string): Promise<string> {
  const payload = `${userId}.${token}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionValue(
  value: string
): Promise<{ userId: string; token: string } | null> {
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [userId, token, sig] = parts;
  if (!userId || !token || !sig) return null;
  const expected = await hmac(`${userId}.${token}`);
  if (!safeEqual(sig, expected)) return null;
  return { userId, token };
}

export { MAX_AGE };
