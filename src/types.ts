export type UILang = 'en' | 'bn';
export type NavTab = 'dashboard' | 'create' | 'studio' | 'settings';
export type CaptionLang = 'bn' | 'en' | 'both';
export type SubtitleStyle = 'modern' | 'bold' | 'minimal';
export type ExportResolution = '720p' | '1080p';

export interface SubtitleCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface ClipIdea {
  title: string;
  hook: string;
  reason: string;
  startSec: number | null;
  endSec: number | null;
  platformFit: string[];
}

export interface AIAnalysisResult {
  clipIdeas: ClipIdea[];
  viralHooks: string[];
  titles: string[];
  descriptions: string[];
  hashtags: string[];
  thumbnailTexts: string[];
  bengaliCaptions: string[];
  englishCaptions: string[];
}

export interface ShortProject {
  id: string;
  title: string;
  youtubeUrl?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  transcript: string;
  clipDuration: 15 | 30 | 45 | 60;
  captionLang: CaptionLang;
  subtitleStyle: SubtitleStyle;
  resolution: ExportResolution;
  status: 'draft' | 'processing' | 'completed';
  shortsCount: number;
  analysis?: AIAnalysisResult;
  cues: SubtitleCue[];
  updatedAt: number;
}
