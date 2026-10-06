import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const key = 'salubrity-theme';

export function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(key);
    return value === 'light' || value === 'dark' ? value : null;
  } catch { return null; }
}

export function initialTheme(): Theme {
  return savedTheme() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#080a09' : '#245d48');
}

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);
  const [manual, setManual] = useState(() => savedTheme() !== null);
  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => {
    if (manual) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setTheme(query.matches ? 'dark' : 'light');
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [manual]);
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setManual(true);
    setTheme(next);
    try { localStorage.setItem(key, next); } catch { /* Still works when storage is unavailable. */ }
  }
  return { theme, toggleTheme };
}
