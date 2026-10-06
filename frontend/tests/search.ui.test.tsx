import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FoodPicker } from '../src/components/Forms';
import { searchFoods, API_URL } from '../src/lib/api';
import type { TrackerState } from '../src/lib/nutrition';

afterEach(() => vi.unstubAllGlobals());
const state: TrackerState = { revision: 0, foods: [], meals: [], entries: [], targets: { calories: 2000, protein: 100, carbs: 250, fat: 65 } };
const product = { code: '123', product_name: 'Chickpeas', brands: ['Brand A', ' Brand B'], nutriments: {
  'energy-kj_100g': 418.4, proteins_100g: 7, carbohydrates_100g: 16, fat_100g: 0, fiber_100g: 4, sodium_100g: 0.12,
} };

it('routes food search through the API and converts the new provider response', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ products: [product, { code: 'incomplete', product_name: 'No label' }] })));
  vi.stubGlobal('fetch', fetcher);
  const signal = new AbortController().signal;
  const foods = await searchFoods(' chickpeas ', signal);
  expect(fetcher).toHaveBeenCalledWith(`${API_URL}/api/foods/search?query=chickpeas`, { signal });
  expect(foods).toHaveLength(1);
  expect(foods[0].source).toBe('Open Food Facts · Brand A, Brand B');
  expect(foods[0].nutrients.calories).toBeCloseTo(100);
  expect(foods[0].nutrients.sodium).toBe(120);
  expect(foods[0].nutrients.fat).toBe(0);
  expect(foods[0].nutrients.sugar).toBeNull();
});

it('lets a user search chickpeas and select the returned food', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ products: [product] }))));
  const select = vi.fn();
  const user = userEvent.setup();
  render(<FoodPicker state={state} onSelect={select} onCreate={vi.fn()} busy={false} initialTab="online"/>);
  await user.type(screen.getByRole('textbox', { name: 'Search foods' }), 'chickpeas');
  await user.click(screen.getByRole('button', { name: 'Search' }));
  const result = await screen.findByRole('button', { name: /Chickpeas.*Open Food Facts/ });
  await user.click(result);
  expect(select).toHaveBeenCalledWith(expect.objectContaining({ name: 'Chickpeas', id: 'off-123' }));
});

it('shows a service error without pretending the search is empty and allows retry', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Open Food Facts is temporarily unavailable.' }), { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ products: [product] })));
  vi.stubGlobal('fetch', fetcher);
  const user = userEvent.setup();
  render(<FoodPicker state={state} onSelect={vi.fn()} onCreate={vi.fn()} busy={false} initialTab="online"/>);
  await user.type(screen.getByRole('textbox', { name: 'Search foods' }), 'chickpeas');
  await user.click(screen.getByRole('button', { name: /^Search$/ }));
  expect((await screen.findByRole('alert')).textContent).toContain('temporarily unavailable');
  expect(screen.queryByText('Find something nourishing')).toBeNull();
  expect(screen.queryByText('No complete labels found')).toBeNull();
  await user.click(screen.getByRole('button', { name: /^Search$/ }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  await screen.findByRole('button', { name: /Chickpeas.*Open Food Facts/ });
});
