import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from './lib/api';
import { deleteProject, getAllProjects, saveProject } from './lib/db';
import type { NavTab, ShortProject, UILang } from './types';
import { LoginGate } from './components/LoginGate';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { ImportAndAI } from './components/ImportAndAI';
import { VideoStudio } from './components/VideoStudio';
import { SettingsView } from './components/SettingsView';

function createBlankProject(): ShortProject {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled Short Project',
    transcript: '',
    clipDuration: 30,
    captionLang: 'both',
    subtitleStyle: 'modern',
    resolution: '720p',
    status: 'draft',
    shortsCount: 0,
    cues: [],
    updatedAt: Date.now(),
  };
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<NavTab>('dashboard');
  const [lang, setLang] = useState<UILang>('en');

  const [projects, setProjects] = useState<ShortProject[]>([]);
  const [currentProject, setCurrentProject] = useState<ShortProject>(createBlankProject);
  const [activeJobs, setActiveJobs] = useState(0);
  const [clipRange, setClipRange] = useState<{ start?: number | null; end?: number | null }>({});

  useEffect(() => {
    api
      .me()
      .then((res) => setOwnerEmail(res.email))
      .catch(() => setOwnerEmail(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!ownerEmail) return;
    getAllProjects().then((list) => {
      setProjects(list);
      if (list[0]) setCurrentProject(list[0]);
    });
  }, [ownerEmail]);

  const handleSaveProject = async (updated: ShortProject) => {
    setCurrentProject(updated);
    await saveProject(updated);
    setProjects(await getAllProjects());
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    const list = await getAllProjects();
    setProjects(list);
    if (currentProject.id === id) {
      setCurrentProject(list[0] || createBlankProject());
    }
  };

  const handleCreateNew = async () => {
    const fresh = createBlankProject();
    await handleSaveProject(fresh);
    setClipRange({});
    setTab('create');
  };

  const handleLogout = async () => {
    await api.logout();
    setOwnerEmail(null);
  };

  if (!authChecked) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  if (!ownerEmail) {
    return <LoginGate lang={lang} onAuthenticated={(email) => setOwnerEmail(email)} />;
  }

  return (
    <div className="min-h-dvh pb-24 md:pb-8 md:pl-72">
      <Navigation
        active={tab}
        lang={lang}
        ownerEmail={ownerEmail}
        onSelect={setTab}
        onToggleLang={() => setLang((l) => (l === 'en' ? 'bn' : 'en'))}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto px-4 pt-5 sm:pt-7">
        {tab === 'dashboard' && (
          <Dashboard
            lang={lang}
            projects={projects}
            activeJobs={activeJobs}
            onCreateNew={handleCreateNew}
            onOpenProject={(p) => {
              setCurrentProject(p);
              setTab('create');
            }}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {tab === 'create' && (
          <ImportAndAI
            project={currentProject}
            onUpdateProject={handleSaveProject}
            onSendToStudio={(start, end) => {
              setClipRange({ start, end });
              setTab('studio');
            }}
          />
        )}

        {tab === 'studio' && (
          <VideoStudio
            project={currentProject}
            initialStart={clipRange.start}
            initialEnd={clipRange.end}
            onUpdateProject={handleSaveProject}
            onJobStateChange={(running) => setActiveJobs((n) => Math.max(0, n + (running ? 1 : -1)))}
          />
        )}

        {tab === 'settings' && (
          <SettingsView
            lang={lang}
            ownerEmail={ownerEmail}
            onToggleLang={() => setLang((l) => (l === 'en' ? 'bn' : 'en'))}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}
