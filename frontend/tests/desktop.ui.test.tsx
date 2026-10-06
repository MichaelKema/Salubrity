import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestState, searchFoods } from '../src/lib/api';
import type { TrackerState } from '../src/lib/nutrition';
afterEach(() => { delete window.__TAURI__; vi.restoreAllMocks(); });
const state: TrackerState = { revision: 0, foods: [], meals: [], entries: [], targets: { calories: 2000, protein: 100, carbs: 250, fat: 65 } };
function native(body: unknown, status = 200) {
  const invoke = vi.fn().mockResolvedValue({ status, body });
  window.__TAURI__ = { core: { invoke } };
  return invoke;
}
describe('native desktop transport', () => {
  it('reads and writes through native commands without browser HTTP', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch'); const invoke = native(state);
    expect(await requestState()).toEqual(state);
    expect(invoke).toHaveBeenCalledWith('tracker_request', { state: null });
    await requestState(state);
    expect(invoke).toHaveBeenCalledWith('tracker_request', { state });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('preserves conflict errors and exposes startup failures', async () => {
    const invoke = native({}, 409);
    await expect(requestState(state)).rejects.toThrow('changed in another window');
    invoke.mockRejectedValueOnce('Close and reopen Salubrity.');
    await expect(requestState()).rejects.toThrow('Close and reopen Salubrity.');
  });
  it('uses the native search and ignores cancelled results', async () => {
    const invoke = native({ products: [] });
    expect(await searchFoods('apple', new AbortController().signal)).toEqual([]);
    expect(invoke).toHaveBeenCalledWith('food_search', { query: 'apple' });
    const controller = new AbortController(); controller.abort();
    await expect(searchFoods('apple', controller.signal)).rejects.toThrow('Search cancelled');
  });
});
