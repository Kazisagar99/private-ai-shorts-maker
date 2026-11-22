import React, { useState } from 'react';
import { Lock, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { UILang } from '../types';
import { t } from '../lib/i18n';

interface Props {
  lang: UILang;
  onAuthenticated: (email: string) => void;
}

export const LoginGate: React.FC<Props> = ({ lang, onAuthenticated }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      onAuthenticated(res.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl liquid-pill flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">{t(lang, 'signInTitle')}</h1>
            <p className="text-xs text-slate-400">{t(lang, 'signInSub')}</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Owner Email</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="liquid-input w-full rounded-2xl px-4 py-3 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Owner Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="liquid-input w-full rounded-2xl px-4 py-3 text-sm text-white"
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-500/15 border border-rose-400/30 px-4 py-2.5 text-xs text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="liquid-pill w-full rounded-2xl py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {t(lang, 'signInBtn')}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 leading-relaxed text-center">
          No public registration. Configure <code className="text-teal-300">OWNER_EMAIL</code>,{' '}
          <code className="text-teal-300">OWNER_PASSWORD</code>, and{' '}
          <code className="text-teal-300">SESSION_SECRET</code> in Netlify Environment Variables.
        </p>
      </div>
    </div>
  );
};
