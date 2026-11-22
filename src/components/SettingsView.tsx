import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, Smartphone, Languages, LogOut } from 'lucide-react';
import { api } from '../lib/api';
import type { UILang } from '../types';

interface Props {
  lang: UILang;
  ownerEmail: string;
  onToggleLang: () => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<Props> = ({ lang, ownerEmail, onToggleLang, onLogout }) => {
  const [health, setHealth] = useState<{
    authConfigured: boolean;
    geminiConfigured: boolean;
    geminiModel: string;
    supabaseConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  const StatusBadge = ({ ok }: { ok: boolean }) =>
    ok ? (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
        <ShieldCheck className="w-4 h-4" /> Configured
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs text-amber-300">
        <AlertTriangle className="w-4 h-4" /> Not Set
      </span>
    );

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="liquid-glass rounded-3xl p-5 space-y-4">
        <h2 className="text-base font-bold text-white">Server & API Configuration Status</h2>
        <p className="text-xs text-slate-400">
          API keys are never stored in browser JavaScript. Manage them under Netlify Site Configuration → Environment Variables.
        </p>

        {health && (
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span className="text-slate-200">Owner Cookie Auth</span>
              <StatusBadge ok={health.authConfigured} />
            </div>
            <div className="flex justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span className="text-slate-200">Gemini AI ({health.geminiModel})</span>
              <StatusBadge ok={health.geminiConfigured} />
            </div>
            <div className="flex justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span className="text-slate-200">Optional Supabase Cloud Sync</span>
              <StatusBadge ok={health.supabaseConfigured} />
            </div>
          </div>
        )}
      </div>

      <div className="liquid-glass rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Smartphone className="w-4 h-4 text-teal-300" />
          Install as Android PWA
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Open your Netlify URL in Chrome on Android, tap the 3-dot menu (⋮), and tap{' '}
          <strong className="text-white">Add to Home screen → Install</strong> to launch full-screen
          with offline dashboard caching.
        </p>
      </div>

      <div className="liquid-glass rounded-3xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">Signed in as</div>
          <div className="text-sm font-semibold text-white">{ownerEmail}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onToggleLang}
            className="px-4 py-2 rounded-2xl bg-white/10 text-xs font-medium text-white flex items-center gap-1.5"
          >
            <Languages className="w-4 h-4 text-teal-300" />
            {lang === 'en' ? 'Switch to বাংলা' : 'Switch to English'}
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-2xl bg-rose-500/20 text-xs font-semibold text-rose-200 flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
