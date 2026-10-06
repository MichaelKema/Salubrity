import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { initialTheme } from '../src/lib/theme';

vi.mock('../src/lib/api', () => ({ requestState: vi.fn().mockRejectedValue(new Error('Offline')), searchFoods: vi.fn() }));
vi.mock('../src/components/magicui/number-ticker', () => ({ NumberTicker: () => null }));
const originalMatchMedia = window.matchMedia;
beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme; });
afterEach(() => { vi.restoreAllMocks(); window.matchMedia = originalMatchMedia; localStorage.clear(); });

function systemTheme(dark: boolean) {
  const listeners = new Set<() => void>();
  const query = { matches: dark, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) };
  window.matchMedia = vi.fn().mockReturnValue(query);
  return (next: boolean) => { query.matches = next; listeners.forEach(fn => fn()); };
}

describe('theme preference', () => {
  it('uses system preference and ignores invalid saved values', () => {
    systemTheme(true); expect(initialTheme()).toBe('dark');
    localStorage.setItem('salubrity-theme', 'invalid'); expect(initialTheme()).toBe('dark');
    localStorage.setItem('salubrity-theme', 'light'); expect(initialTheme()).toBe('light');
  });
  it('toggles while offline, persists across reloads, and restores light mode', async () => {
    systemTheme(false);
    const user = userEvent.setup(); const app = render(<App/>);
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem('salubrity-theme')).toBe('dark');
    app.unmount(); render(<App/>);
    expect(screen.getByRole('button', { name: 'Dark mode' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('salubrity-theme')).toBe('light');
  });
  it('follows system changes until the user makes a choice', async () => {
    const update = systemTheme(false); const user = userEvent.setup(); render(<App/>);
    act(() => update(true));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    await user.click(screen.getByRole('button', { name: 'Dark mode' }));
    act(() => update(true));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
  it('still toggles when local storage is blocked', async () => {
    systemTheme(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    const user = userEvent.setup(); render(<App/>);
    await user.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
