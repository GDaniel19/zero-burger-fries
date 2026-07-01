import { Env } from './responses';

const COOKIE_NAME = 'zero_admin_session';
const MAX_AGE = 60 * 60 * 8;

export async function createSession(env: Env) {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
  const signature = await hmac(payload, env.SESSION_SECRET);
  return `${payload}.${signature}`;
}

export async function isAuthenticated(request: Request, env: Env) {
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.split('=')[1];
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = await hmac(payload, env.SESSION_SECRET);
  if (!timingSafeEqual(signature, expected)) return false;
  try {
    const parsed = JSON.parse(atob(payload)) as { exp: number };
    return parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function sessionCookie(token: string, secure = true) {
  const secureFlag = secure ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie(secure = true) {
  const secureFlag = secure ? '; Secure' : '';
  return `${COOKIE_NAME}=; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=0`;
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64Url(signature);
}

function base64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}