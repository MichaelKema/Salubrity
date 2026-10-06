import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { requestState } from '../src/lib/api';
import { localDate, type TrackerState } from '../src/lib/nutrition';

vi.mock('../src/lib/api', () => ({ requestState: vi.fn(), searchFoods: vi.fn() }));
vi.mock('../src/components/magicui/number-ticker', () => ({ NumberTicker: ({ value }: { value: number }) => <span>{value}</span> }));
let stored: TrackerState;
beforeEach(() => {
  stored = { revision: 0, foods: [], meals: [], entries: [], targets: { calories: 2000, protein: 100, carbs: 250, fat: 65 } };
  vi.mocked(requestState).mockReset();
  vi.mocked(requestState).mockImplementation(async state => {
    if (state) stored = { ...structuredClone(state), revision: stored.revision + 1 };
    return structuredClone(stored);
  });
});

describe('Salubrity nutrition flow', () => {
  it('creates a food, logs a scaled portion, builds a meal, and reloads the diary', async () => {
    const user = userEvent.setup();
    const app = render(<App/>);
    await screen.findByRole('heading', { name: 'On your plate' });
    await user.click(screen.getAllByRole('button', { name: 'Add food' })[0]);
    await user.click(screen.getByRole('button', { name: 'Custom food' }));
    await user.type(screen.getByLabelText('Food name'), 'Test yogurt');
    const basis = screen.getByLabelText(/Nutrition is for this amount/);
    await user.clear(basis); await user.type(basis, '150');
    await user.type(screen.getByLabelText(/Calories.*kcal/), '120');
    await user.type(screen.getByLabelText(/^Protein.*g$/), '15');
    await user.type(screen.getByLabelText(/^Carbs.*g$/), '10');
    await user.type(screen.getByLabelText(/^Fat.*g$/), '2');
    await user.type(screen.getByLabelText(/Fiber.*optional.*g/), '0');
    await user.click(screen.getByRole('button', { name: 'Save food' }));
    const amount = await screen.findByLabelText(/Amount.*to.*eat.*grams/);
    await user.clear(amount); await user.type(amount, '75');
    await user.click(screen.getByRole('button', { name: 'Add to diary' }));
    await waitFor(() => expect(stored.entries).toHaveLength(1));
    expect(stored.entries[0].nutrients.calories).toBe(60);
    expect(stored.entries[0].nutrients.fiber).toBe(0);
    expect(stored.entries[0].nutrients.sugar).toBeNull();
    expect(stored.entries[0].date).toBe(localDate());

    await user.click(screen.getByRole('button', { name: /My meals/ }));
    await user.click(screen.getByRole('button', { name: 'Create meal' }));
    await user.type(screen.getByLabelText('Meal name'), 'Yogurt bowl');
    const servings = screen.getByLabelText('How many servings does this recipe make?');
    await user.clear(servings); await user.type(servings, '2');
    const grams = screen.getByLabelText('Ingredient 1 amount');
    await user.clear(grams); await user.type(grams, '300');
    await user.click(screen.getByRole('button', { name: 'Save meal' }));
    await waitFor(() => expect(stored.meals).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Add to diary' }));
    const portions = await screen.findByLabelText(/Servings.*to.*eat.*servings/);
    await user.clear(portions); await user.type(portions, '1.5');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add to diary' }));
    await waitFor(() => expect(stored.entries).toHaveLength(2));
    expect(stored.entries[1].nutrients.calories).toBe(180);
    expect(stored.entries[1].slot).toBe('Lunch');

    app.unmount(); render(<App/>);
    await screen.findByRole('button', { name: /Yogurt bowl.*1.5 servings/ });
    expect(screen.getByRole('progressbar', { name: 'Calories goal progress' }).getAttribute('aria-valuenow')).toBe('240');
    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(screen.queryByRole('button', { name: /Yogurt bowl.*1.5 servings/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Today' }));
    await user.click(screen.getByRole('button', { name: 'Remove Test yogurt' }));
    await waitFor(() => expect(stored.entries).toHaveLength(1));
    expect(screen.getByRole('progressbar', { name: 'Calories goal progress' }).getAttribute('aria-valuenow')).toBe('180');
  });

  it('keeps goals unchanged and the form open if a save fails', async () => {
    const user = userEvent.setup(); render(<App/>);
    await screen.findByRole('heading', { name: 'On your plate' });
    await user.click(screen.getByRole('button', { name: 'Daily goals' }));
    const calories = screen.getByLabelText(/Calories.*kcal/);
    await user.clear(calories); await user.type(calories, '2300');
    vi.mocked(requestState).mockRejectedValueOnce(new Error('Save failed. Try again.'));
    await user.click(screen.getByRole('button', { name: 'Save daily goals' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Save failed');
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(stored.targets.calories).toBe(2000);
    await user.click(screen.getByRole('button', { name: 'Save daily goals' }));
    await waitFor(() => expect(stored.targets.calories).toBe(2300));
  });

  it('shows a reconnect state when the backend cannot be reached', async () => {
    vi.mocked(requestState).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<App/>);
    await screen.findByText('Your space is waiting for you.');
    expect(screen.getByRole('button', { name: 'Add food' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('heading', { name: 'On your plate' })).toBeNull();
  });
});
