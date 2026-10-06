import test from 'node:test';
import assert from 'node:assert/strict';
import { scale, sum, mealNutrition, localDate, shiftDate, type Food } from '../src/lib/nutrition.ts';

const yogurt: Food = { id: 'yogurt', name: 'Test yogurt', source: 'Test label', basisAmount: 150, nutrients: { calories: 120, protein: 15, carbs: 10, fat: 2, fiber: 0, sugar: 8, sodium: 60 } };
const oats: Food = { id: 'oats', name: 'Test oats', source: 'Test label', basisAmount: 100, nutrients: { calories: 400, protein: 12, carbs: 60, fat: 8, fiber: 10, sugar: null, sodium: null } };

test('food label amounts scale to grams eaten, including real zeros', () => {
  assert.deepEqual(scale(yogurt.nutrients, 75 / yogurt.basisAmount), { calories: 60, protein: 7.5, carbs: 5, fat: 1, fiber: 0, sugar: 4, sodium: 30 });
});
test('a multi-ingredient recipe divides total nutrition by its servings', () => {
  const meal = { id: 'bowl', name: 'Bowl', servings: 2, ingredients: [{ foodId: 'yogurt', amount: 300 }, { foodId: 'oats', amount: 50 }] };
  const portion = mealNutrition(meal, [yogurt, oats]);
  assert.deepEqual(portion, { calories: 220, protein: 18, carbs: 25, fat: 4, fiber: 2.5, sugar: null, sodium: null });
  assert.equal(scale(portion, 1.5).calories, 330);
});
test('daily totals do not report incomplete nutrition as zero', () => {
  assert.equal(sum([yogurt.nutrients, oats.nutrients]).sugar, null);
  assert.equal(sum([yogurt.nutrients, oats.nutrients]).calories, 520);
  assert.equal(sum([]).calories, 0);
});
test('invalid portions and missing ingredients cannot silently create nutrition', () => {
  assert.throws(() => scale(oats.nutrients, -1));
  assert.throws(() => scale(oats.nutrients, NaN));
  assert.throws(() => mealNutrition({ id: 'x', name: 'x', servings: 0, ingredients: [] }, []));
  assert.throws(() => mealNutrition({ id: 'x', name: 'x', servings: 1, ingredients: [{ foodId: 'missing', amount: 100 }] }, []));
});
test('diary dates use local calendar days across month boundaries', () => {
  assert.equal(localDate(new Date(2026, 8, 28, 23, 59)), '2026-09-28');
  assert.equal(shiftDate('2026-09-30', 1), '2026-10-01');
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28');
});
