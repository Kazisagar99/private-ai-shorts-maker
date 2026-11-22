import type { Handler } from '@netlify/functions';
import { json, verifySession } from './_auth';

interface AnalyzeRequest {
  videoTitle?: string;
  transcript: string;
  hasTimestamps: boolean;
  clipDuration: number;
  language: 'bn' | 'en' | 'both';
}

interface ModelItem {
  name?: string;
  supportedGenerationMethods?: string[];
}

async function callGemini(apiKey: string, model: string, prompt: string) {
  const cleanModel = model.replace(/^models\//, '');
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      }),
    }
  );
}

async function detectActiveModel(apiKey: string): Promise<{ model: string | null; listError?: string }> {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': apiKey },
  });
  if (!res.ok) {
    const txt = await res.text();
    return { model: null, listError: `Model list (${res.status}): ${txt.slice(0, 220)}` };
  }
  const data = (await res.json()) as { models?: ModelItem[] };
  const skip = ['embedding', 'aqa', 'imagen', 'veo', 'tts', 'audio', 'image', 'robotics', 'computer-use'];
  const valid = (data.models || []).filter((m) => {
    const n = (m.name || '').toLowerCase();
    return (
      n.includes('gemini') &&
      m.supportedGenerationMethods?.includes('generateContent') &&
      !skip.some((word) => n.includes(word))
    );
  });

  const preferred =
    valid.find((m) => m.name!.includes('flash') && !m.name!.includes('lite') && !m.name!.includes('exp')) ||
    valid.find((m) => m.name!.includes('flash')) ||
    valid[0];

  return { model: preferred?.name?.replace(/^models\//, '') || null };
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

  const prompt = `
You are an expert short-form video editor and viral content strategist for YouTube Shorts, Instagram Reels, and Facebook Reels.
Analyze the following transcript for the video "${body.videoTitle || 'Untitled'}".
Target clip duration: ~${body.clipDuration || 30} seconds.
Preferred language mode: ${body.language || 'both'} (Bengali + English).
Transcript contains real timestamps: ${body.hasTimestamps ? 'YES' : 'NO'}.

STRICT RULES:
- Return ONLY valid JSON matching the exact schema below. No markdown fences.
- If "Transcript contains real timestamps" is NO, set "startSec" and "endSec" to null for EVERY clip idea. NEVER invent fake timestamps.
- If YES, extract accurate numeric seconds (startSec, endSec) directly from the transcript timestamps.
- Keep Bengali natural, engaging, and modern.

JSON SCHEMA:
{
  "clipIdeas": [
    {
      "title": "string",
      "hook": "string",
      "reason": "string (emotional/informative/viral angle)",
      "startSec": number | null,
      "endSec": number | null,
      "platformFit": ["YouTube Shorts", "Instagram Reels", "Facebook Reels"]
    }
  ],
  "viralHooks": ["string"],
  "titles": ["string"],
  "descriptions": ["string"],
  "hashtags": ["#tag1"],
  "thumbnailTexts": ["string"],
  "bengaliCaptions": ["string"],
  "englishCaptions": ["string"]
}

TRANSCRIPT:
${body.transcript.slice(0, 24000)}
`.trim();

  try {
    let model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
    let response = await callGemini(apiKey, model, prompt);

    if (response.status === 404) {
      const { model: detected, listError } = await detectActiveModel(apiKey);
      if (detected) {
        model = detected;
        response = await callGemini(apiKey, model, prompt);
      } else if (listError) {
        return json(502, { error: listError });
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      let reason = errText.slice(0, 260);
      try {
        const parsedErr = JSON.parse(errText) as { error?: { message?: string } };
        if (parsedErr.error?.message) reason = parsedErr.error.message;
      } catch {
        // keep snippet
      }
      return json(response.status, {
        error: `Gemini API (${response.status}, ${model}): ${reason}`,
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
    return json(500, {
      error: err instanceof Error ? err.message : 'AI analysis failed.',
    });
  }
};
