import type { Food, TrackerState } from './nutrition';
import { desktopRequest, isDesktop } from './desktop';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5289';

export async function requestState(state?: TrackerState): Promise<TrackerState> {
  if (isDesktop()) {
    const response = await desktopRequest('tracker_request', { state: state ?? null });
    if (response.status === 409) throw new Error('This diary changed in another window. Reload the diary before saving again.');
    if (response.status !== 200) throw new Error(`Could not ${state ? 'save' : 'load'} your diary (HTTP ${response.status}). Please try again.`);
    return response.body as TrackerState;
  }
  const response = await fetch(`${API_URL}/api/tracker`, {
    method: state ? 'PUT' : 'GET',
    headers: state ? { 'Content-Type': 'application/json' } : {},
    body: state ? JSON.stringify(state) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    if (response.status === 409) throw new Error('This diary changed in another window. Reload the diary before saving again.');
    throw new Error(`Could not ${state ? 'save' : 'load'} your diary (HTTP ${response.status}). Please try again.`);
  }
  return response.json();
}

export async function searchFoods(query: string, signal: AbortSignal): Promise<Food[]> {
  const params = new URLSearchParams({ query: query.trim() });
  if (signal.aborted) throw new DOMException('Search cancelled', 'AbortError');
  const response = isDesktop()
    ? await desktopRequest('food_search', { query: query.trim() }).then(result => ({
        ok: result.status >= 200 && result.status < 300,
        json: async () => result.body as { message?: string; products?: unknown },
      }))
    : await fetch(`${API_URL}/api/foods/search?${params}`, { signal });
  if (signal.aborted) throw new DOMException('Search cancelled', 'AbortError');
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || 'Food search is unavailable. Please try again shortly, or add a custom food.');
  }
  const data = await response.json();
  if (!Array.isArray(data.products)) throw new Error('Food search returned an unexpected response. Please try again.');
  return data.products.flatMap((p: { code?: string; product_name?: string; brands?: string | string[]; nutriments?: Record<string, unknown> }) => {
    const n = p.nutriments || {};
    const read = (key: string) => n[key] == null || n[key] === '' || !Number.isFinite(Number(n[key])) || Number(n[key]) < 0 ? null : Number(n[key]);
    const energy = read('energy-kj_100g') ?? read('energy_100g');
    const calories = read('energy-kcal_100g') ?? (energy === null ? null : energy / 4.184);
    const protein = read('proteins_100g'), carbs = read('carbohydrates_100g'), fat = read('fat_100g');
    if (!p.product_name || calories === null || protein === null || carbs === null || fat === null) return [];
    const sodium = read('sodium_100g');
    const brands = Array.isArray(p.brands) ? p.brands.map(brand => brand.trim()).filter(Boolean).join(', ') : p.brands;
    return [{ id: `off-${p.code || crypto.randomUUID()}`, name: p.product_name.slice(0, 150), source: `Open Food Facts${brands ? ` · ${brands}` : ''}`.slice(0, 200), basisAmount: 100,
      nutrients: { calories, protein, carbs, fat, fiber: read('fiber_100g'), sugar: read('sugars_100g'), sodium: sodium === null ? null : sodium * 1000 } }];
  });
}
