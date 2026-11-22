import type { AIAnalysisResult, CaptionLang } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  me: () => request<{ authenticated: boolean; email: string }>('/api/auth?action=me'),
  login: (email: string, password: string) =>
    request<{ authenticated: boolean; email: string }>('/api/auth?action=login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>('/api/auth?action=logout', { method: 'POST' }),
  health: () =>
    request<{
      authConfigured: boolean;
      geminiConfigured: boolean;
      geminiModel: string;
      supabaseConfigured: boolean;
    }>('/api/health'),
  youtubeMeta: (url: string) =>
    request<{ videoId: string; title: string; author: string; thumbnailUrl: string }>(
      `/api/youtube-meta?url=${encodeURIComponent(url)}`
    ),
  analyzeTranscript: (payload: {
    videoTitle: string;
    transcript: string;
    hasTimestamps: boolean;
    clipDuration: number;
    language: CaptionLang;
  }) =>
    request<AIAnalysisResult>('/api/ai-analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
