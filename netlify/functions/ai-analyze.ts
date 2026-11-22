import type { Handler } from '@netlify/functions';
import { json, verifySession } from './_auth';

interface AnalyzeRequest {
  videoTitle?: string;
  transcript: string;
  hasTimestamps: boolean;
  clipDuration: number;
  language: 'bn' | 'en' | 'both';
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  thinkingConfig: Record<string, unknown> | null,
  timeoutMs: number
) {
  const cleanModel = model.replace(/^models\//, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const generationConfig: Record<string, unknown> = {
    responseMimeType: 'application/json',
    temperature: 0.4,
    maxOutputTokens: 1200,
  };
  if (thinkingConfig) {
    generationConfig.thinkingConfig = thinkingConfig;
  }

  try {
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        }),
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event)) return json(401, { error: 'Unauthorized' });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return json(503, {
      code: 'AI_NOT_CONFIGURED',
      error: 'GEMINI_API_KEY is not set in Netlify environment variables.',
    });
  }

  let body: AnalyzeRequest;
  try {
    body = JSON.parse(event.body || '{}') as AnalyzeRequest;
  } catch {
    return json(400, { error: 'Invalid JSON payload.' });
  }

  if (!body.transcript || body.transcript.trim().length < 20) {
    return json(400, { error: 'Please provide a transcript of at least 20 characters.' });
  }

  const model = (process.env.GEMINI_MODEL || 'gemini-3.8-flash')
    .trim()
    .replace(/^models\//, '');

  const prompt = `Analyze transcript for "${body.videoTitle || 'Video'}" (~${body.clipDuration || 30}s Shorts, lang: ${body.language || 'both'}).
Timestamps: ${body.hasTimestamps ? 'YES' : 'NO'}.
Return ONLY valid JSON. Short punchy lines. If Timestamps=NO, startSec & endSec must be null.
Counts: 2 clipIdeas, 3 viralHooks, 3 titles, 2 descriptions, 5 hashtags, 3 thumbnailTexts, 3 bengaliCaptions, 3 englishCaptions.
Format:
{"clipIdeas":[{"title":"","hook":"","reason":"","startSec":null,"endSec":null,"platformFit":["YouTube Shorts","Instagram Reels"]}],"viralHooks":[""],"titles":[""],"descriptions":[""],"hashtags":["#tag"],"thumbnailTexts":[""],"bengaliCaptions":[""],"englishCaptions":[""]}

Transcript:
${body.transcript.slice(0, 8000)}`;

  const startedAt = Date.now();
  let stage = 'MINIMAL';
  let fallbackReason = '';

  try {
    let response = await callGemini(apiKey, model, prompt, { thinkingLevel: 'MINIMAL' }, 9000);

    if (response.status === 400) {
      const err1 = await response.text();
      if (err1.toLowerCase().includes('thinking') || err1.toLowerCase().includes('level')) {
        fallbackReason = err1.slice(0, 100);
        stage = 'LOW';
        const rem1 = Math.max(2500, 9200 - (Date.now() - startedAt));
        response = await callGemini(apiKey, model, prompt, { thinkingLevel: 'LOW' }, rem1);
      } else {
        return json(400, { error: `Gemini (400, ${model}): ${err1.slice(0, 220)}` });
      }
    }

    if (response.status === 400) {
      const err2 = await response.text();
      if (err2.toLowerCase().includes('thinking') || err2.toLowerCase().includes('level')) {
        fallbackReason = err2.slice(0, 100);
        stage = 'DEFAULT';
        const rem2 = Math.max(2000, 9300 - (Date.now() - startedAt));
        response = await callGemini(apiKey, model, prompt, null, rem2);
      } else {
        return json(400, { error: `Gemini (400, ${model}): ${err2.slice(0, 220)}` });
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      let reason = errText.slice(0, 240);
      try {
        const parsedErr = JSON.parse(errText) as { error?: { message?: string } };
        if (parsedErr.error?.message) reason = parsedErr.error.message;
      } catch {
        // keep snippet
      }
      return json(response.status, {
        error: `Gemini (${response.status}, ${model}, ${stage}): ${reason}`,
      });
    }

    const result = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return json(502, { error: 'Empty response from Gemini API.' });

    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return json(200, parsed);
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    if (err instanceof Error && err.name === 'AbortError') {
      const note = fallbackReason ? ` | prev: ${fallbackReason}` : '';
      return json(504, {
        error: `Gemini (${model}, ${stage}) took >${Math.round(elapsed / 1000)}s${note}`,
      });
    }
    return json(500, {
      error: err instanceof Error ? err.message : 'AI analysis failed.',
    });
  }
};
