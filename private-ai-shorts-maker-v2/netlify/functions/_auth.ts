import crypto from 'node:crypto';
import type { HandlerEvent } from '@netlify/functions';

export const COOKIE_NAME = 'pasm_session';
const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET is missing or shorter than 16 characters.');
  }
  return secret;
}

export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function signSession(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(event: HandlerEvent): { email: string } | null {
  try {
    const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;

    const token = match.slice(COOKIE_NAME.length + 1);
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;

    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
    if (!safeEqual(sig, expected)) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email: string;
      exp: number;
    };
    if (!decoded.email || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: decoded.email };
  } catch {
    return null;
  }
}

export function buildCookieHeader(event: HandlerEvent, value: string, maxAge: number): string {
  const isHttps =
    event.headers['x-forwarded-proto'] === 'https' || process.env.CONTEXT === 'production';
  return [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
    isHttps ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function json(statusCode: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}
