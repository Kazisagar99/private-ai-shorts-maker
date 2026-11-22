import type { Handler } from '@netlify/functions';
import { buildCookieHeader, json, safeEqual, signSession, verifySession } from './_auth';

export const handler: Handler = async (event) => {
  const action = event.queryStringParameters?.action || 'me';

  if (action === 'me' && event.httpMethod === 'GET') {
    const session = verifySession(event);
    if (!session) return json(401, { authenticated: false });
    return json(200, { authenticated: true, email: session.email });
  }

  if (action === 'logout' && event.httpMethod === 'POST') {
    return json(200, { ok: true }, { 'Set-Cookie': buildCookieHeader(event, '', 0) });
  }

  if (action === 'login' && event.httpMethod === 'POST') {
    const ownerEmail = process.env.OWNER_EMAIL;
    const ownerPassword = process.env.OWNER_PASSWORD;

    if (!ownerEmail || !ownerPassword || !process.env.SESSION_SECRET) {
      return json(503, {
        error: 'Server authentication environment variables are not configured in Netlify.',
      });
    }

    try {
      const { email = '', password = '' } = JSON.parse(event.body || '{}') as {
        email?: string;
        password?: string;
      };

      const validEmail = safeEqual(email.trim().toLowerCase(), ownerEmail.trim().toLowerCase());
      const validPass = safeEqual(password, ownerPassword);

      if (!validEmail || !validPass) {
        return json(401, { error: 'Invalid owner credentials.' });
      }

      const token = signSession(ownerEmail.trim().toLowerCase());
      return json(
        200,
        { authenticated: true, email: ownerEmail.trim().toLowerCase() },
        { 'Set-Cookie': buildCookieHeader(event, token, 60 * 60 * 24 * 7) }
      );
    } catch {
      return json(400, { error: 'Malformed request body.' });
    }
  }

  return json(405, { error: 'Method not allowed.' });
};
