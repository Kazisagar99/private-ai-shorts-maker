import React, { useEffect, useRef, useState } from 'react';
import { Upload, Music, Download, Plus, Trash2, Loader2, FileText, Play } from 'lucide-react';
import { exportToSrt } from '../lib/subtitles';
import { renderShortMp4 } from '../lib/ffmpeg';
import type { ExportResolution, ShortProject, SubtitleCue, SubtitleStyle } from '../types';

interface Props {
  project: ShortProject;
  initialStart?: number | null;
  initialEnd?: number | null;
  onUpdateProject: (updated: ShortProject) => void;
  onJobStateChange: (running: boolean) => void;
}

const MAX_FILE_MB = 250;

export const VideoStudio: React.FC<Props> = ({
  project,
  initialStart,
  initialEnd,
  onUpdateProject,
  onJobStateChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [startSec, setStartSec] = useState(initialStart ?? 0);
  const [endSec, setEndSec] = useState(initialEnd ?? project.clipDuration);
  const [cropX, setCropX] = useState(50);
  const [subtitleY, setSubtitleY] = useState(74);
  const [wordHighlight, setWordHighlight] = useState(true);
  const [burnSubtitles, setBurnSubtitles] = useState(true);

  const [rendering, setRendering] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialStart != null) setStartSec(initialStart);
    if (initialEnd != null) setEndSec(initialEnd);
  }, [initialStart, initialEnd]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [videoUrl, outputUrl]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_FILE_MB}MB browser processing limit.`);
      return;
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setOutputUrl(null);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('Please upload a valid audio file (MP3, WAV, M4A).');
      return;
    }
    setAudioFile(file);
  };

  const activeCue = project.cues.find((c) => currentTime >= c.start && currentTime <= c.end);

  const addCue = () => {
    const start = Number(currentTime.toFixed(1));
    const newCue: SubtitleCue = {
      id: crypto.randomUUID(),
      start,
      end: Number((start + 3).toFixed(1)),
      text: 'নতুন সাবটাইটেল / New subtitle',
    };
    onUpdateProject({ ...project, cues: [...project.cues, newCue] });
  };

  const updateCue = (id: string, patch: Partial<SubtitleCue>) => {
    onUpdateProject({
      ...project,
      cues: project.cues.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const removeCue = (id: string) => {
    onUpdateProject({ ...project, cues: project.cues.filter((c) => c.id !== id) });
  };

  const downloadSrt = () => {
    const srt = exportToSrt(project.cues);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project.title.replace(/[^a-z0-9]/gi, '_') || 'short'}.srt`;
    a.click();
  };

  const handleExport = async () => {
    if (!videoFile) return;
    setError(null);
    setRendering(true);
    setProgress(0);
    setOutputUrl(null);
    onJobStateChange(true);
    onUpdateProject({ ...project, status: 'processing' });

    try {
      const blob = await renderShortMp4({
        videoFile,
        audioFile,
        startSec,
        endSec: Math.max(startSec + 1, endSec),
        cropXPercent: cropX,
        resolution: project.resolution,
        burnSubtitles,
        cues: project.cues,
        subtitleStyle: project.subtitleStyle,
        subtitleYPercent: subtitleY,
        onStatus: setStatusText,
        onProgress: setProgress,
      });

      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      onUpdateProject({
        ...project,
        status: 'completed',
        shortsCount: project.shortsCount + 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FFmpeg export failed.');
      onUpdateProject({ ...project, status: 'draft' });
    } finally {
      setRendering(false);
      onJobStateChange(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="liquid-glass rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-white">Authorized Local Video Source</div>
          <div className="text-[11px] text-slate-400">
            Processed 100% locally in your browser via FFmpeg.wasm. Never uploaded to any server.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer liquid-pill rounded-2xl px-4 py-2.5 text-xs font-semibold text-white flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            {videoFile ? 'Change Video' : 'Select Video (MP4)'}
            <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
          </label>
          <label className="cursor-pointer rounded-2xl bg-white/10 hover:bg-white/15 px-4 py-2.5 text-xs font-medium text-teal-200 flex items-center gap-1.5">
            <Music className="w-4 h-4" />
            {audioFile ? audioFile.name.slice(0, 14) : 'Optional BGM'}
            <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
          </label>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="liquid-glass rounded-[2rem] p-2.5 w-full max-w-[300px]">
            <div className="relative aspect-[9/16] w-full rounded-[1.5rem] overflow-hidden bg-black">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    setDuration(d);
                    setEndSec((prev) => (prev > d || prev <= startSec ? Math.min(d, startSec + project.clipDuration) : prev));
                  }}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  style={{ objectPosition: `${cropX}% 50%` }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400 gap-2">
                  <Play className="w-8 h-8 text-purple-400" />
                  Select your own MP4/WebM clip to preview 9:16 framing & subtitles
                </div>
              )}

              {activeCue && (
                <div
                  style={{ top: `${subtitleY}%` }}
                  className="pointer-events-none absolute inset-x-3 -translate-y-1/2 flex justify-center text-center"
                >
                  <div
                    className={
                      project.subtitleStyle === 'modern'
                        ? 'px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-teal-400/50 text-white text-sm font-bold shadow-lg'
                        : project.subtitleStyle === 'bold'
                        ? 'text-yellow-300 text-base font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,1)]'
                        : 'text-white text-sm font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]'
                    }
                  >
                    {wordHighlight
                      ? activeCue.text.split(' ').map((word, idx, arr) => {
                          const cueDur = Math.max(0.1, activeCue.end - activeCue.start);
                          const ratio = (currentTime - activeCue.start) / cueDur;
                          const activeWordIdx = Math.floor(ratio * arr.length);
                          return (
                            <span
                              key={idx}
                              className={idx === activeWordIdx ? 'text-teal-300 underline decoration-purple-400' : ''}
                            >
                              {word}{' '}
                            </span>
                          );
                        })
                      : activeCue.text}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="liquid-glass rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Trim, 9:16 Crop & Export Settings</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Start (sec)</label>
                <input
                  type="number"
                  min={0}
                  max={duration || 9999}
                  step={0.5}
                  value={startSec}
                  onChange={(e) => setStartSec(Number(e.target.value))}
                  className="liquid-input w-full rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">End (sec)</label>
                <input
                  type="number"
                  min={1}
                  max={duration || 9999}
                  step={0.5}
                  value={endSec}
                  onChange={(e) => setEndSec(Number(e.target.value))}
                  className="liquid-input w-full rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>9:16 Horizontal Crop Position</span>
                <span>{cropX}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={cropX}
                onChange={(e) => setCropX(Number(e.target.value))}
                className="w-full accent-teal-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Subtitle Vertical Position</span>
                <span>{subtitleY}%</span>
              </div>
              <input
                type="range"
                min={18}
                max={86}
                value={subtitleY}
                onChange={(e) => setSubtitleY(Number(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Resolution</label>
                <select
                  value={project.resolution}
                  onChange={(e) =>
                    onUpdateProject({ ...project, resolution: e.target.value as ExportResolution })
                  }
                  className="liquid-input w-full rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="720p">720p (720×1280 · Faster on Mobile)</option>
                  <option value="1080p">1080p (1080×1920 · Full HD)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Subtitle Style</label>
                <select
                  value={project.subtitleStyle}
                  onChange={(e) =>
                    onUpdateProject({ ...project, subtitleStyle: e.target.value as SubtitleStyle })
                  }
                  className="liquid-input w-full rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="modern">Modern Glass</option>
                  <option value="bold">Bold Yellow</option>
                  <option value="minimal">Minimal Clean</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={burnSubtitles}
                  onChange={(e) => setBurnSubtitles(e.target.checked)}
                  className="accent-teal-400"
                />
                Burn Subtitles into MP4
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wordHighlight}
                  onChange={(e) => setWordHighlight(e.target.checked)}
                  className="accent-purple-400"
                />
                Live Word Highlight Preview
              </label>
            </div>

            {error && (
              <div className="rounded-2xl bg-rose-500/15 border border-rose-400/30 p-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            {rendering && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-2">
                <div className="flex justify-between text-xs text-teal-200">
                  <span className="truncate">{statusText}</span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    style={{ width: `${progress}%` }}
                    className="h-full liquid-pill transition-all duration-200"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleExport}
                disabled={!videoFile || rendering}
                className="liquid-pill flex-1 rounded-2xl py-3 px-4 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {rendering ? 'Rendering MP4...' : 'Export 9:16 MP4'}
              </button>

              {outputUrl && (
                <a
                  href={outputUrl}
                  download={`${project.title.replace(/[^a-z0-9]/gi, '_') || 'short'}_9x16.mp4`}
                  className="rounded-2xl bg-emerald-500/20 border border-emerald-400/40 px-4 py-3 text-sm font-semibold text-emerald-200 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Save MP4
                </a>
              )}
            </div>
          </div>

          <div className="liquid-glass rounded-3xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white">Subtitles ({project.cues.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={addCue}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Line
                </button>
                <button
                  onClick={downloadSrt}
                  disabled={project.cues.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-200 text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  <FileText className="w-3.5 h-3.5" /> Export SRT
                </button>
              </div>
            </div>

            {project.cues.length === 0 ? (
              <p className="text-xs text-slate-400">
                Upload an .SRT/.VTT file in Import & AI, or tap “Add Line” to write Bengali/English subtitles.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {project.cues.map((cue) => (
                  <div key={cue.id} className="rounded-2xl bg-white/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={0.1}
                        value={cue.start}
                        onChange={(e) => updateCue(cue.id, { start: Number(e.target.value) })}
                        className="liquid-input w-20 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                      <span className="text-xs text-slate-400">→</span>
                      <input
                        type="number"
                        step={0.1}
                        value={cue.end}
                        onChange={(e) => updateCue(cue.id, { end: Number(e.target.value) })}
                        className="liquid-input w-20 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                      <button
                        onClick={() => removeCue(cue.id)}
                        className="ml-auto p-1 text-slate-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={cue.text}
                      onChange={(e) => updateCue(cue.id, { text: e.target.value })}
                      className="liquid-input w-full rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
