import { create } from 'zustand';

const KEY = 'scrabbleio:prefs';
const DEFAULTS = { theme: 'system', sound: true, haptics: true };

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export const usePrefs = create((set, get) => ({
  ...load(),
  setPref(patch) {
    set(patch);
    const { theme, sound, haptics } = get();
    try { localStorage.setItem(KEY, JSON.stringify({ theme, sound, haptics })); } catch { /* private mode */ }
  },
}));

const THEME_COLORS = { light: '#f4f1ea', dark: '#0c0f17' };

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  // Keep the browser chrome / status bar in step with a forced theme.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = THEME_COLORS[theme === 'system' ? scheme : theme];
  }
}

applyTheme(usePrefs.getState().theme);
usePrefs.subscribe((s, prev) => { if (s.theme !== prev.theme) applyTheme(s.theme); });
