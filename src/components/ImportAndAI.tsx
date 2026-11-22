import React, { useState } from 'react';
import { Youtube, Sparkles, Upload, Copy, Check, Loader2, Scissors } from 'lucide-react';
import { api } from '../lib/api';
import { detectTimestamps, parseSrtOrVtt } from '../lib/subtitles';
import type { CaptionLang, ShortProject } from '../types';

interface Props {
  project: ShortProject;
  onUpdateProject: (updated: ShortProject) => void;
  onSendToStudio: (startSec?: number | null, endSec?: number | null) => void;
}

export const ImportAndAI: React.FC<Props> = ({ project, onUpdateProject, onSendToStudio }) => {
  const [urlInput, setUrlInput] = useState(project.youtubeUrl || '');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const importYoutube = async () => {
    setError(null);
    setFetchingMeta(true);
    try {
      const meta = await api.youtubeMeta(urlInput);
      onUpdateProject({
        ...project,
        title: meta.title,
        youtubeUrl: urlInput.trim(),
        youtubeId: meta.videoId,
        thumbnailUrl: meta.thumbnailUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid YouTube URL.');
    } finally {
      setFetchingMeta(false);
    }
  };

  const handleTranscriptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsedCues = parseSrtOrVtt(text);
    onUpdateProject({
      ...project,
      transcript: text,
      cues: parsedCues.length > 0 ? parsedCues : project.cues,
    });
  };

  const runAI = async () => {
    setError(null);
    setAnalyzing(true);
    try {
      const result = await api.analyzeTranscript({
        videoTitle: project.title,
        transcript: project.transcript,
        hasTimestamps: detectTimestamps(project.transcript),
        clipDuration: project.clipDuration,
        language: project.captionLang,
      });
      onUpdateProject({ ...project, analysis: result });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const copyText = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const analysis = project.analysis;

  return (
    <div className="space-y-5">
      <div className="liquid-glass rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Youtube className="w-5 h-5 text-rose-400" />
          YouTube URL Import & Official Preview
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="liquid-input flex-1 rounded-2xl px-4 py-3 text-sm text-white"
          />
          <button
            onClick={importYoutube}
            disabled={fetchingMeta || !urlInput.trim()}
            className="liquid-pill rounded-2xl px-5 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {fetchingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Video'}
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Uses official YouTube oEmbed + embed preview only. To export MP4 clips, upload your own or
          authorized source file in the Studio tab.
        </p>

        {project.youtubeId && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-white">{project.title}</div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${project.youtubeId}`}
                title={project.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>

      <div className="liquid-glass rounded-3xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold text-white">Transcript / Captions (.SRT, .VTT, .TXT)</div>
          <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-teal-200 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            Upload Transcript
            <input type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={handleTranscriptFile} />
          </label>
        </div>

        <textarea
          rows={6}
          value={project.transcript}
          onChange={(e) => onUpdateProject({ ...project, transcript: e.target.value })}
          placeholder="Paste transcript or SRT captions here (include timestamps if you want timestamped clip suggestions)..."
          className="liquid-input w-full rounded-2xl p-3.5 text-xs sm:text-sm text-white leading-relaxed"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Clip Duration</label>
            <select
              value={project.clipDuration}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  clipDuration: Number(e.target.value) as 15 | 30 | 45 | 60,
                })
              }
              className="liquid-input w-full rounded-xl px-3 py-2.5 text-xs text-white"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={45}>45 seconds</option>
              <option value={60}>60 seconds</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Output Language</label>
            <select
              value={project.captionLang}
              onChange={(e) =>
                onUpdateProject({ ...project, captionLang: e.target.value as CaptionLang })
              }
              className="liquid-input w-full rounded-xl px-3 py-2.5 text-xs text-white"
            >
              <option value="both">Bengali + English</option>
              <option value="bn">Bengali (বাংলা)</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-500/15 border border-rose-400/30 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <button
          onClick={runAI}
          disabled={analyzing || project.transcript.trim().length < 20}
          className="liquid-pill w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {analyzing ? 'Analyzing Transcript via Gemini...' : 'Analyze & Generate Viral Ideas'}
        </button>
      </div>

      {analysis && (
        <div className="space-y-4">
          <div className="liquid-glass rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Suggested Viral Clip Moments</h3>
            <div className="grid gap-3">
              {analysis.clipIdeas.map((clip, i) => (
                <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-bold text-white">{clip.title}</div>
                    {clip.startSec !== null && clip.endSec !== null ? (
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-200 shrink-0">
                        {clip.startSec}s – {clip.endSec}s
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 text-slate-400 shrink-0">
                        No timestamps
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-purple-200 font-medium">Hook: “{clip.hook}”</p>
                  <p className="text-xs text-slate-300">{clip.reason}</p>
                  <button
                    onClick={() => onSendToStudio(clip.startSec, clip.endSec)}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/25 hover:bg-purple-500/35 text-xs font-semibold text-purple-100"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    Send to Studio Editor
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="liquid-glass rounded-3xl p-5 grid sm:grid-cols-2 gap-4">
            {[
              { key: 'hooks', title: 'Viral Hooks', items: analysis.viralHooks },
              { key: 'titles', title: 'Short Titles', items: analysis.titles },
              { key: 'thumbs', title: 'Thumbnail Text', items: analysis.thumbnailTexts },
              { key: 'bn', title: 'Bengali Captions (বাংলা)', items: analysis.bengaliCaptions },
              { key: 'en', title: 'English Captions', items: analysis.englishCaptions },
              { key: 'desc', title: 'Descriptions', items: analysis.descriptions },
            ].map((section) => (
              <div key={section.key} className="rounded-2xl bg-white/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-200">{section.title}</span>
                  <button
                    onClick={() => copyText(section.key, section.items.join('\n'))}
                    className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1"
                  >
                    {copiedKey === section.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-200">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">• {item}</li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="sm:col-span-2 rounded-2xl bg-white/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-200">Hashtags</span>
                <button
                  onClick={() => copyText('tags', analysis.hashtags.join(' '))}
                  className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1"
                >
                  {copiedKey === 'tags' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  Copy All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.hashtags.map((tag, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
