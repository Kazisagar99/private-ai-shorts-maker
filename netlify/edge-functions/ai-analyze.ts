export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cookie = request.headers.get('cookie') || '';
  const authRes = await fetch(new URL('/api/auth', request.url).toString(), {
    headers: { cookie },
  });
  if (!authRes.ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const authData = await authRes.json().catch(() => ({}));
  if (authData && authData.authenticated === false) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = (Netlify.env.get('GEMINI_API_KEY') || '').trim();
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        code: 'AI_NOT_CONFIGURED',
        error: 'GEMINI_API_KEY is not set in Netlify environment variables.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: {
    videoTitle?: string;
    transcript?: string;
    hasTimestamps?: boolean;
    clipDuration?: number;
    language?: 'bn' | 'en' | 'both';
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.transcript || body.transcript.trim().length < 20) {
    return new Response(
      JSON.stringify({ error: 'Please provide a transcript of at least 20 characters.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const model = (Netlify.env.get('GEMINI_MODEL') || 'gemini-3.8-flash')
    .trim()
    .replace(/^models\//, '');

  const prompt = `You are an expert short-form video editor for YouTube Shorts, Instagram Reels, and Facebook Reels.
Analyze this transcript for "${body.videoTitle || 'Video'}" (~${body.clipDuration || 30}s Shorts, language: ${body.language || 'both'}).
Timestamps present: ${body.hasTimestamps ? 'YES' : 'NO'}.
Rules: Return ONLY valid JSON. Keep Bengali natural and modern. If Timestamps=NO, set startSec and endSec to null.
Schema:
{"clipIdeas":[{"title":"","hook":"","reason":"","startSec":null,"endSec":null,"platformFit":["YouTube Shorts","Instagram Reels"]}],"viralHooks":[""],"titles":[""],"descriptions":[""],"hashtags":["#tag"],"thumbnailTexts":[""],"bengaliCaptions":[""],"englishCaptions":[""]}

Transcript:
${body.transcript.slice(0, 16000)}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const sendRequest = (useLowThinking: boolean) => {
    const generationConfig: Record<string, unknown> = {
      responseMimeType: 'application/json',
      temperature: 0.5,
      maxOutputTokens: 2048,
    };
    if (useLowThinking) {
      generationConfig.thinkingConfig = { thinkingLevel: 'LOW' };
    }
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });
  };

  try {
    let response = await sendRequest(true);
    if (response.status === 400) {
      const errTxt = await response.text();
      if (errTxt.toLowerCase().includes('thinking') || errTxt.toLowerCase().includes('level')) {
        response = await sendRequest(false);
      } else {
        return new Response(
          JSON.stringify({ error: `Gemini (400, ${model}): ${errTxt.slice(0, 220)}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      let reason = errText.slice(0, 240);
      try {
        const parsedErr = JSON.parse(errText);
        if (parsedErr?.error?.message) reason = parsedErr.error.message;
      } catch {
        // keep snippet
      }
      return new Response(
        JSON.stringify({ error: `Gemini (${response.status}, ${model}): ${reason}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return new Response(JSON.stringify({ error: 'Empty response from Gemini API.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'AI analysis failed.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
          }
