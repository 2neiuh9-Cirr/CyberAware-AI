import { useSyncExternalStore } from 'react';

export type SiteLanguage = 'vi' | 'en';
export type SiteTheme = 'light' | 'dark';
type Preferences = { language: SiteLanguage; theme: SiteTheme };

const readPreference = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.find(item => item === value) || fallback;
  } catch { return fallback; }
};

let current: Preferences = {
  language: readPreference('cyberaware-language', ['vi', 'en'], 'vi'),
  theme: readPreference('cyberaware-theme', ['light', 'dark'], 'light'),
};
const listeners = new Set<() => void>();

function apply(preferences: Preferences) {
  document.documentElement.lang = preferences.language;
  document.documentElement.dataset.theme = preferences.theme;
}

if (typeof document !== 'undefined') apply(current);

function update(next: Preferences) {
  current = next;
  apply(next);
  try {
    window.localStorage.setItem('cyberaware-language', next.language);
    window.localStorage.setItem('cyberaware-theme', next.theme);
  } catch { /* Preferences still work for this session. */ }
  listeners.forEach(listener => listener());
}

export const setSiteLanguage = (language: SiteLanguage) => update({ ...current, language });
export const toggleSiteTheme = () => update({ ...current, theme: current.theme === 'light' ? 'dark' : 'light' });
export const useSitePreferences = () => useSyncExternalStore(listener => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}, () => current);
export const tr = (language: SiteLanguage, vi: string, en: string) => language === 'en' ? en : vi;
