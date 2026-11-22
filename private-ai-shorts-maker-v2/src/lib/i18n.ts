import type { UILang } from '../types';

export const strings = {
  en: {
    appName: 'Private AI Shorts',
    dashboard: 'Dashboard',
    create: 'Import & AI',
    studio: 'Studio',
    settings: 'Settings',
    totalProjects: 'Total Projects',
    shortsCreated: 'Shorts Created',
    processingJobs: 'Processing Jobs',
    completedVideos: 'Completed Videos',
    recentProjects: 'Recent Projects',
    createNew: 'Create New Shorts',
    noProjects: 'No projects yet. Import a YouTube link or open Studio to start.',
    signInTitle: 'Private Owner Access',
    signInSub: 'Single-owner studio protected by server-side session cookies.',
    signInBtn: 'Unlock Studio',
    logout: 'Sign Out',
  },
  bn: {
    appName: 'প্রাইভেট এআই শর্টস',
    dashboard: 'ড্যাশবোর্ড',
    create: 'ইমপোর্ট ও এআই',
    studio: 'স্টুডিও',
    settings: 'সেটিংস',
    totalProjects: 'মোট প্রোজেক্ট',
    shortsCreated: 'তৈরি শর্টস',
    processingJobs: 'প্রসেসিং জব',
    completedVideos: 'সম্পন্ন ভিডিও',
    recentProjects: 'সাম্প্রতিক প্রোজেক্ট',
    createNew: 'নতুন শর্টস তৈরি করুন',
    noProjects: 'এখনো কোনো প্রোজেক্ট নেই। শুরু করতে ইউটিউব লিংক দিন বা স্টুডিও খুলুন।',
    signInTitle: 'ব্যক্তিগত ওনার লগইন',
    signInSub: 'সার্ভার-সাইড সেশন কুকি দ্বারা সুরক্ষিত ব্যক্তিগত স্টুডিও।',
    signInBtn: 'স্টুডিও আনলক করুন',
    logout: 'লগআউট',
  },
} as const;

export function t(lang: UILang, key: keyof (typeof strings)['en']): string {
  return strings[lang][key];
}
