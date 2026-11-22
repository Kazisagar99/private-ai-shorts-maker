import React from 'react';
import { LayoutDashboard, Sparkles, Scissors, Settings, LogOut, Languages } from 'lucide-react';
import type { NavTab, UILang } from '../types';
import { t } from '../lib/i18n';

interface Props {
  active: NavTab;
  lang: UILang;
  ownerEmail: string;
  onSelect: (tab: NavTab) => void;
  onToggleLang: () => void;
  onLogout: () => void;
}

const ITEMS: Array<{ id: NavTab; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'create', icon: Sparkles },
  { id: 'studio', icon: Scissors },
  { id: 'settings', icon: Settings },
];

export const Navigation: React.FC<Props> = ({
  active,
  lang,
  ownerEmail,
  onSelect,
  onToggleLang,
  onLogout,
}) => {
  return (
    <>
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-4 md:left-4 liquid-glass rounded-3xl p-4 justify-between z-30">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="h-10 w-10 rounded-2xl liquid-pill flex items-center justify-center font-extrabold text-white">
              AI
            </div>
            <div>
              <div className="font-bold text-sm text-white">{t(lang, 'appName')}</div>
              <div className="text-[11px] text-teal-300 truncate max-w-[145px]">{ownerEmail}</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            {ITEMS.map(({ id, icon: Icon }) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  onClick={() => onSelect(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    isActive
                      ? 'liquid-pill text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t(lang, id)}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4">
          <button
            onClick={onToggleLang}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs text-slate-200"
          >
            <span className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-teal-300" />
              Language
            </span>
            <span className="font-semibold text-purple-300">{lang === 'en' ? 'EN / বাং' : 'বাংলা'}</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs text-rose-300 hover:bg-rose-500/10"
          >
            <LogOut className="w-4 h-4" />
            {t(lang, 'logout')}
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-3 inset-x-3 z-40">
        <div className="liquid-glass rounded-full px-2 py-2 flex items-center justify-around">
          {ITEMS.map(({ id, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className={`flex flex-col items-center justify-center px-3.5 py-2 rounded-full transition-all ${
                  isActive ? 'liquid-pill text-white scale-105' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-0.5">{t(lang, id)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
