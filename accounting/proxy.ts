import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* Auth gate. Runs before render (see proxy docs). Self-contained on purpose:
   proxy should not rely on shared app modules. */

const COOKIE = 'acct_session';

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

async function hasSession(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return false;
  return safeEqual(parts[2], await hmac(`${parts[0]}.${parts[1]}`));
}

// This function can be marked `async` if using `await` inside
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await hasSession(req.cookies.get(COOKIE)?.value);

  if (pathname === '/login') {
    return session ? NextResponse.redirect(new URL('/', req.url)) : NextResponse.next();
  }
  if (!session) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
