import type { Handler } from '@netlify/functions';
import { json, verifySession } from './_auth';

export const handler: Handler = async (event) => {
  const session = verifySession(event);
  if (!session) return json(401, { error: 'Unauthorized' });

  return json(200, {
    authConfigured: Boolean(
      process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD && process.env.SESSION_SECRET
    ),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
};
