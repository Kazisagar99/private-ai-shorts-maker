import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { ExportResolution, SubtitleCue, SubtitleStyle } from '../types';
import { renderSubtitleBannerPng } from './subtitles';

let ffmpegInstance: FFmpeg | null = null;
let loaded = false;

export interface ExportOptions {
  videoFile: File;
  audioFile?: File | null;
  startSec: number;
  endSec: number;
  cropXPercent: number;
  resolution: ExportResolution;
  burnSubtitles: boolean;
  cues: SubtitleCue[];
  subtitleStyle: SubtitleStyle;
  subtitleYPercent: number;
  onStatus: (msg: string) => void;
  onProgress: (pct: number) => void;
}

async function ensureFFmpeg(onStatus: (msg: string) => void): Promise<FFmpeg> {
  if (!ffmpegInstance) ffmpegInstance = new FFmpeg();
  if (!loaded) {
    onStatus('Downloading FFmpeg.wasm core (~31 MB, cached by browser)...');
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    loaded = true;
  }
  return ffmpegInstance;
}

export async function renderShortMp4(opts: ExportOptions): Promise<Blob> {
  const ffmpeg = await ensureFFmpeg(opts.onStatus);

  const progressHandler = ({ progress }: { progress: number }) => {
    const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
    opts.onProgress(pct);
  };
  ffmpeg.on('progress', progressHandler);

  const createdFiles: string[] = [];
  try {
    const duration = Math.max(1, opts.endSec - opts.startSec);
    const outW = opts.resolution === '1080p' ? 1080 : 720;
    const outH = opts.resolution === '1080p' ? 1920 : 1280;

    opts.onStatus('Loading authorized video file into browser memory...');
    await ffmpeg.writeFile('input.mp4', await fetchFile(opts.videoFile));
    createdFiles.push('input.mp4');

    const args: string[] = [
      '-ss',
      opts.startSec.toFixed(2),
      '-t',
      duration.toFixed(2),
      '-i',
      'input.mp4',
    ];

    let audioInputIdx = -1;
    if (opts.audioFile) {
      opts.onStatus('Loading optional background audio...');
      await ffmpeg.writeFile('bgm.mp3', await fetchFile(opts.audioFile));
      createdFiles.push('bgm.mp3');
      args.push('-stream_loop', '-1', '-t', duration.toFixed(2), '-i', 'bgm.mp3');
      audioInputIdx = 1;
    }

    const activeCues = opts.burnSubtitles
      ? opts.cues
          .map((c) => ({
            ...c,
            relStart: Math.max(0, c.start - opts.startSec),
            relEnd: Math.min(duration, c.end - opts.startSec),
          }))
          .filter((c) => c.relEnd > c.relStart && c.text.trim().length > 0)
          .slice(0, 24)
      : [];

    const firstSubIdx = audioInputIdx === 1 ? 2 : 1;
    for (let i = 0; i < activeCues.length; i++) {
      opts.onStatus(`Rasterizing subtitle ${i + 1}/${activeCues.length} (Bengali/English)...`);
      const png = await renderSubtitleBannerPng(activeCues[i].text, opts.subtitleStyle, outW);
      const fname = `sub_${i}.png`;
      await ffmpeg.writeFile(fname, png);
      createdFiles.push(fname);
      args.push('-i', fname);
    }

    const panRatio = (opts.cropXPercent / 100).toFixed(3);
    const cropFilter = `crop='min(iw,ih*9/16)':'min(ih,iw*16/9)':'(iw-ow)*${panRatio}':'(ih-oh)/2',scale=${outW}:${outH},setsar=1`;

    const filters: string[] = [`[0:v]${cropFilter}[v0]`];
    let lastV = 'v0';

    const yPos = Math.round((outH * opts.subtitleYPercent) / 100 - outW * 0.17);
    activeCues.forEach((cue, i) => {
      const nextV = `v${i + 1}`;
      filters.push(
        `[${lastV}][${firstSubIdx + i}:v]overlay=0:${Math.max(0, yPos)}:enable='between(t,${cue.relStart.toFixed(2)},${cue.relEnd.toFixed(2)})'[${nextV}]`
      );
      lastV = nextV;
    });

    if (audioInputIdx === 1) {
      filters.push(`[0:a]volume=1.0[a0];[1:a]volume=0.22[a1];[a0][a1]amix=inputs=2:duration=first[aout]`);
    }

    args.push('-filter_complex', filters.join(';'));
    args.push('-map', `[${lastV}]`);
    if (audioInputIdx === 1) {
      args.push('-map', '[aout]');
    } else {
      args.push('-map', '0:a?');
    }

    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      'output.mp4'
    );

    opts.onStatus('Encoding 9:16 MP4 with FFmpeg.wasm...');
    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) {
      throw new Error(`FFmpeg exited with code ${exitCode}. Try 720p or a shorter clip on mobile.`);
    }

    const data = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
    createdFiles.push('output.mp4');
    opts.onProgress(100);
    opts.onStatus('Export complete.');
    return new Blob([data as unknown as BlobPart], { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', progressHandler);
    for (const f of createdFiles) {
      await ffmpeg.deleteFile(f).catch(() => {});
    }
  }
}
