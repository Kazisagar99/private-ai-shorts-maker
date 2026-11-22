import React from 'react';
import { Film, FolderKanban, Cpu, CheckCircle2, Plus, Trash2, ArrowRight } from 'lucide-react';
import type { ShortProject, UILang } from '../types';
import { t } from '../lib/i18n';

interface Props {
  lang: UILang;
  projects: ShortProject[];
  activeJobs: number;
  onCreateNew: () => void;
  onOpenProject: (project: ShortProject) => void;
  onDeleteProject: (id: string) => void;
}

export const Dashboard: React.FC<Props> = ({
  lang,
  projects,
  activeJobs,
  onCreateNew,
  onOpenProject,
  onDeleteProject,
}) => {
  const totalShorts = projects.reduce((sum, p) => sum + p.shortsCount, 0);
  const completed = projects.filter((p) => p.status === 'completed').length;

  const stats = [
    { label: t(lang, 'totalProjects'), value: projects.length, icon: FolderKanban, accent: 'text-purple-300' },
    { label: t(lang, 'shortsCreated'), value: totalShorts, icon: Film, accent: 'text-teal-300' },
    { label: t(lang, 'processingJobs'), value: activeJobs, icon: Cpu, accent: 'text-amber-300' },
    { label: t(lang, 'completedVideos'), value: completed, icon: CheckCircle2, accent: 'text-emerald-300' },
  ];

  return (
    <div className="space-y-6">
      <div className="liquid-glass rounded-3xl p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-400/20 mb-2">
            Liquid Glass Studio · 9:16
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t(lang, 'appName')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            YouTube Shorts · Instagram Reels · Facebook Reels
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="liquid-pill rounded-2xl px-5 py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t(lang, 'createNew')}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="liquid-glass rounded-3xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{label}</span>
              <Icon className={`w-4 h-4 ${accent}`} />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{value}</div>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 px-1">
          {t(lang, 'recentProjects')}
        </h2>

        {projects.length === 0 ? (
          <div className="liquid-glass rounded-3xl p-8 text-center text-sm text-slate-400">
            {t(lang, 'noProjects')}
          </div>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="liquid-glass rounded-3xl p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={p.title}
                      className="w-16 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-16 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Film className="w-5 h-5 text-purple-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{p.title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{p.clipDuration}s</span>
                      <span>·</span>
                      <span>{p.resolution}</span>
                      <span>·</span>
                      <span className="capitalize text-teal-300">{p.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onOpenProject(p)}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1"
                  >
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteProject(p.id)}
                    className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                    aria-label="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
