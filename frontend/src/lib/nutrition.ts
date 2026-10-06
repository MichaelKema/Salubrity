export const nutrientKeys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'] as const;
export type NutrientKey = typeof nutrientKeys[number];
export type Nutrients = Record<NutrientKey, number | null> & { calories: number; protein: number; carbs: number; fat: number };
export type Food = { id: string; name: string; source: string; basisAmount: number; basisUnit?: 'g' | 'ml'; nutrients: Nutrients };
export type Meal = { id: string; name: string; servings: number; ingredients: { foodId: string; amount: number }[] };
export type Slot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
export const slots: Slot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
export type Entry = { id: string; date: string; slot: Slot; name: string; portion: string; nutrients: Nutrients };
export type Targets = { calories: number; protein: number; carbs: number; fat: number };
export type TrackerState = { revision: number; foods: Food[]; meals: Meal[]; entries: Entry[]; targets: Targets };
export const emptyNutrients = (): Nutrients => ({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });
export const labels: Record<NutrientKey, string> = { calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fiber: 'Fiber', sugar: 'Sugar', sodium: 'Sodium' };
export const unit = (key: NutrientKey) => key === 'calories' ? 'kcal' : key === 'sodium' ? 'mg' : 'g';
export const fmt = (n: number | null, digits = 1) => n === null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(n);

export function scale(nutrients: Nutrients, factor: number): Nutrients {
  if (!Number.isFinite(factor) || factor < 0) throw new Error('Enter a valid serving amount.');
  return Object.fromEntries(nutrientKeys.map(key => [key, nutrients[key] === null ? null : nutrients[key]! * factor])) as Nutrients;
}

// Unknown amounts remain unknown, rather than becoming misleading zeros.
export function sum(items: Nutrients[]): Nutrients {
  return Object.fromEntries(nutrientKeys.map(key => [key,
    items.some(n => n[key] === null) ? null : items.reduce((total, n) => total + n[key]!, 0),
  ])) as Nutrients;
}

export function mealNutrition(meal: Meal, foods: Food[]): Nutrients {
  if (!Number.isFinite(meal.servings) || meal.servings <= 0) throw new Error('Meal servings must be greater than zero.');
  return scale(sum(meal.ingredients.map(ingredient => {
    const food = foods.find(f => f.id === ingredient.foodId);
    if (!food) throw new Error('A meal ingredient is missing from your food library.');
    return scale(food.nutrients, ingredient.amount / food.basisAmount);
  })), 1 / meal.servings);
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDate(value);
}
