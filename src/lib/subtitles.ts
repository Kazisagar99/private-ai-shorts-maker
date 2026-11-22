import type { SubtitleCue, SubtitleStyle } from '../types';

function parseTimecode(tc: string): number {
  const clean = tc.trim().replace(',', '.');
  const parts = clean.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(clean) || 0;
}

export function formatSrtTime(sec: number): string {
  const s = Math.max(0, sec);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function detectTimestamps(text: string): boolean {
  return /(\d{1,2}:)?\d{1,2}:\d{2}([.,]\d{1,3})?/.test(text);
}

export function parseSrtOrVtt(content: string): SubtitleCue[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/^WEBVTT\s*\n+/i, '').trim();
  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const timeIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeIdx === -1) continue;
    const [rawStart, rawEnd] = lines[timeIdx].split('-->');
    const text = lines.slice(timeIdx + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (!text) continue;
    cues.push({
      id: crypto.randomUUID(),
      start: parseTimecode(rawStart),
      end: parseTimecode(rawEnd.split(' ')[0]),
      text,
    });
  }
  return cues;
}

export function exportToSrt(cues: SubtitleCue[]): string {
  return cues
    .map(
      (c, i) => `${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text.trim()}\n`
    )
    .join('\n');
}

export async function renderSubtitleBannerPng(
  text: string,
  style: SubtitleStyle,
  width: number
): Promise<Uint8Array> {
  const height = Math.round(width * 0.34);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);

  const fontSize = style === 'bold' ? Math.round(width * 0.068) : Math.round(width * 0.056);
  const weight = style === 'minimal' ? '600' : '800';
  ctx.font = `${weight} ${fontSize}px "Plus Jakarta Sans", "Hind Siliguri", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const words = text.trim().split(/\s+/);
  const maxWidth = width * 0.86;
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  const visible = lines.slice(0, 3);
  const lineH = fontSize * 1.28;
  const totalH = visible.length * lineH;
  const startY = (height - totalH) / 2 + lineH / 2;

  if (style === 'modern') {
    const padX = 28;
    const padY = 18;
    const boxW = Math.min(
      width * 0.92,
      Math.max(...visible.map((l) => ctx.measureText(l).width)) + padX * 2
    );
    const boxH = totalH + padY * 2;
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;
    ctx.fillStyle = 'rgba(10, 10, 22, 0.78)';
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.65)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  visible.forEach((line, idx) => {
    const y = startY + idx * lineH;
    if (style === 'bold') {
      ctx.lineWidth = Math.max(8, Math.round(fontSize * 0.16));
      ctx.strokeStyle = '#000000';
      ctx.strokeText(line, width / 2, y);
      ctx.fillStyle = '#fde047';
      ctx.fillText(line, width / 2, y);
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, width / 2, y);
    }
  });

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png')
  );
  return new Uint8Array(await blob.arrayBuffer());
}
