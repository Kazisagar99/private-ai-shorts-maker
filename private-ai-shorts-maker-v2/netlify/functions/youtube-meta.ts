import type { Handler } from '@netlify/functions';
import { json, verifySession } from './_auth';

function extractVideoId(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '').slice(0, 11) || null;
    if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2]?.slice(0, 11) || null;
    if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2]?.slice(0, 11) || null;
    const v = u.searchParams.get('v');
    return v && v.length === 11 ? v : null;
  } catch {
    return null;
  }
}

export const handler: Handler = async (event) => {
  if (!verifySession(event)) return json(401, { error: 'Unauthorized' });

  const url = event.queryStringParameters?.url || '';
  const videoId = extractVideoId(url);
  if (!videoId) return json(400, { error: 'Invalid YouTube URL.' });

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`
    );
    if (!res.ok) {
      return json(200, {
        videoId,
        title: `YouTube Video (${videoId})`,
        author: 'Unknown channel',
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return json(200, {
      videoId,
      title: data.title || `YouTube Video (${videoId})`,
      author: data.author_name || 'Unknown channel',
      thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  } catch {
    return json(502, { error: 'Failed to fetch YouTube metadata via oEmbed.' });
  }
};
