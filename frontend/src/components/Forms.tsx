import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Search, Trash2, ArrowRight, Leaf, LoaderCircle } from 'lucide-react';
import { type Food, type Meal, type Nutrients, type Slot, type TrackerState, type Targets, slots, nutrientKeys, labels, unit, fmt, scale, mealNutrition } from '../lib/nutrition';
import { searchFoods } from '../lib/api';

export function NutritionLine({ nutrients }: { nutrients: Nutrients }) {
  return <div className="nutrition-line"><strong>{fmt(nutrients.calories, 0)} <small>kcal</small></strong><span>P <b>{fmt(nutrients.protein)}g</b></span><span>C <b>{fmt(nutrients.carbs)}g</b></span><span>F <b>{fmt(nutrients.fat)}g</b></span></div>;
}

export function NutritionDetails({ nutrients }: { nutrients: Nutrients }) {
  return <dl className="nutrition-details">{nutrientKeys.map(key => <div key={key}><dt>{labels[key]}</dt><dd>{fmt(nutrients[key], key === 'calories' || key === 'sodium' ? 0 : 1)} <small>{unit(key)}</small></dd></div>)}</dl>;
}

export function FoodForm({ onSave, busy }: { onSave: (food: Food) => Promise<void>; busy: boolean }) {
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get('name')).trim();
    if (!name) { setError('Give your food a name.'); return; }
    const nutrients = Object.fromEntries(nutrientKeys.map(key => [key, data.get(key) === '' ? null : Number(data.get(key))])) as Nutrients;
    await onSave({ id: crypto.randomUUID(), name, source: 'Custom label', basisAmount: Number(data.get('basisAmount')), basisUnit: data.get('basisUnit') as 'g' | 'ml', nutrients });
  }
  return <form onSubmit={submit} className="form-stack">
    <label>Food name<input name="name" placeholder="e.g. Greek yogurt" required maxLength={150} autoFocus/></label>
    <div className="form-row"><label>Nutrition is for this amount<input name="basisAmount" type="number" min="0.1" max="10000" step="0.1" defaultValue="100" required/></label><label>Label unit<select name="basisUnit" defaultValue="g"><option value="g">Grams (g)</option><option value="ml">Milliliters (ml)</option></select></label></div>
    <p className="form-hint">Copy the values from a food label. Salubrity will scale them to the amount you eat.</p>
    <div className="nutrient-inputs">{nutrientKeys.map((key, index) => <label key={key}>{labels[key]}{index > 3 && <small> optional</small>}<div className="input-unit"><input name={key} type="number" min="0" max={key === 'sodium' ? '10000000' : '1000000'} step="0.1" placeholder={index > 3 ? 'Unknown' : '0'} required={index < 4}/><span>{unit(key)}</span></div></label>)}</div>
    <p className="form-hint">Leave optional values blank if the label doesn’t provide them.</p>
    {error && <p role="alert" className="error-text">{error}</p>}
    <button className="primary wide" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <Plus size={17}/>}Save food</button>
  </form>;
}

export function FoodPicker({ state, onSelect, onCreate, busy, initialTab = 'saved' }: { state: TrackerState; onSelect: (food: Food) => void; onCreate: (food: Food) => Promise<void>; busy: boolean; initialTab?: string }) {
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function search(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    const timeout = setTimeout(() => request.abort(), 15000);
    setSearching(true); setError(''); setSearched(false); setResults([]);
    try { const foods = await searchFoods(query.trim(), request.signal); if (controller.current === request) { setResults(foods); setSearched(true); } }
    catch (error) { if (controller.current === request) setError(request.signal.aborted ? 'Food search took too long. Please try again.' : error instanceof TypeError ? 'Couldn’t reach your local server. Reconnect and try again.' : error instanceof Error ? error.message : 'Food search is unavailable. Please try again.'); }
    finally { clearTimeout(timeout); if (controller.current === request) setSearching(false); }
  }
  const foods = tab === 'online' ? results : state.foods.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
  return <><div className="segmented" aria-label="Food source">{[['saved', 'My foods'], ['online', 'Search online'], ['custom', 'Custom food']].map(([value, label]) => <button type="button" key={value} aria-pressed={tab === value} className={tab === value ? 'active' : ''} onClick={() => { controller.current?.abort(); controller.current = null; setSearching(false); setSearched(false); setResults([]); setTab(value); setQuery(''); setError(''); }}>{label}</button>)}</div>
    {tab === 'custom' ? <FoodForm onSave={onCreate} busy={busy}/> : <>
      <form className="search-form" onSubmit={search}><Search size={18}/><input aria-label="Search foods" maxLength={120} placeholder={tab === 'online' ? 'Search Open Food Facts…' : 'Find a saved food…'} value={query} onChange={e => setQuery(e.target.value)}/>{tab === 'online' && <button className="primary small" disabled={searching || query.trim().length < 2}>{searching ? <LoaderCircle size={16} className="spin"/> : 'Search'}</button>}</form>
      {tab === 'online' && <p className="form-hint">Open Food Facts · Values per 100 g or 100 ml. Confirm the unit against the product label when logging. Products need calories and all three macros.</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="picker-list">{foods.map((food, index) => <button type="button" key={`${food.id}-${index}`} className="food-pick" onClick={() => onSelect(food)} disabled={busy}><span className="food-icon"><Leaf size={20}/></span><span className="food-pick-body"><strong>{food.name}</strong><small>{food.source} · per {fmt(food.basisAmount)} {food.basisUnit || (food.source.startsWith('Open Food Facts') ? 'g / ml' : 'g')}</small><NutritionLine nutrients={food.nutrients}/></span><ArrowRight size={18}/></button>)}</div>
      {!foods.length && !searching && !error && <div className="empty compact"><Leaf size={30}/><h3>{tab === 'online' ? searched ? 'No complete labels found' : 'Find something nourishing' : state.foods.length ? 'No foods match that search' : 'Your food library starts here'}</h3><p>{tab === 'online' ? 'Search a product name, or enter its label yourself.' : 'Add a food label once, then use it in your diary and meals.'}</p><button type="button" className="text-button" onClick={() => setTab('custom')}>Create a custom food <ArrowRight size={15}/></button></div>}
    </>}
  </>;
}

export function LogForm({ item, foods, initialSlot, busy, onLog }: { item: Food | Meal; foods: Food[]; initialSlot: Slot; busy: boolean; onLog: (slot: Slot, amount: number, nutrients: Nutrients, basisUnit: 'g' | 'ml') => Promise<void> }) {
  const isFood = 'basisAmount' in item;
  const [amount, setAmount] = useState(isFood ? String(item.basisAmount) : '1');
  const [slot, setSlot] = useState(initialSlot);
  const [basisUnit, setBasisUnit] = useState<'g' | 'ml'>(isFood ? item.basisUnit || 'g' : 'g');
  const base = isFood ? item.nutrients : mealNutrition(item, foods);
  const valid = Number(amount) > 0 && Number(amount) <= (isFood ? 10000 : 100);
  const nutrients = scale(base, valid ? Number(amount) / (isFood ? item.basisAmount : 1) : 0);
  return <form className="form-stack" onSubmit={async e => { e.preventDefault(); if (valid) await onLog(slot, Number(amount), nutrients, basisUnit); }}>
    <div className="selected-food"><span className="food-icon"><Leaf size={24}/></span><div><h3>{item.name}</h3><p className="muted">{isFood ? item.source : `${item.ingredients.length} ingredients · ${fmt(item.servings)} servings per recipe`}</p></div></div>
    {isFood && !item.basisUnit && item.source.startsWith('Open Food Facts') && <label>Confirm the nutrition label unit<select value={basisUnit} onChange={e => setBasisUnit(e.target.value as 'g' | 'ml')}><option value="g">Per 100 grams (g)</option><option value="ml">Per 100 milliliters (ml)</option></select></label>}
    <div className="form-row"><label>{isFood ? 'Amount to eat' : 'Servings to eat'}<div className="input-unit"><input autoFocus type="number" min="0.1" max={isFood ? '10000' : '100'} step="0.1" required value={amount} onChange={e => setAmount(e.target.value)}/><span>{isFood ? basisUnit === 'g' ? 'grams' : 'ml' : 'servings'}</span></div></label><label>Add to<select value={slot} onChange={e => setSlot(e.target.value as Slot)}>{slots.map(s => <option key={s}>{s}</option>)}</select></label></div>
    <div className="nutrition-preview"><p className="eyebrow">NUTRITION FOR YOUR PORTION</p><NutritionDetails nutrients={nutrients}/><p className="form-hint">A dash means the nutrition amount isn’t available.</p></div>
    <button className="primary wide" disabled={busy || !valid}>{busy ? <LoaderCircle className="spin" size={17}/> : <Plus size={17}/>}Add to diary</button>
  </form>;
}

export function MealForm({ foods, busy, onSave }: { foods: Food[]; busy: boolean; onSave: (meal: Meal) => Promise<void> }) {
  const [name, setName] = useState('');
  const [servings, setServings] = useState('1');
  const [ingredients, setIngredients] = useState<{ foodId: string; amount: string }[]>([{ foodId: foods[0]?.id || '', amount: '100' }]);
  const valid = !!name.trim() && Number(servings) > 0 && Number(servings) <= 100 && ingredients.length > 0 && ingredients.every(i => i.foodId && Number(i.amount) > 0 && Number(i.amount) <= 10000);
  const meal = { id: '', name: name.trim(), servings: Number(servings), ingredients: ingredients.map(i => ({ foodId: i.foodId, amount: Number(i.amount) })) };
  const nutrition = valid ? mealNutrition(meal, foods) : null;
  if (!foods.length) return <div className="empty"><Leaf size={32}/><h3>Add your first food</h3><p>Create foods in your food library, then combine them into a reusable meal.</p></div>;
  return <form className="form-stack" onSubmit={async e => { e.preventDefault(); if (valid) await onSave({ ...meal, id: crypto.randomUUID() }); }}>
    <label>Meal name<input autoFocus placeholder="e.g. My morning yogurt bowl" required maxLength={150} value={name} onChange={e => setName(e.target.value)}/></label>
    <label>How many servings does this recipe make?<input type="number" required min="0.1" max="100" step="0.1" value={servings} onChange={e => setServings(e.target.value)}/></label>
    <div className="section-heading"><h3>Ingredients</h3><span className="muted">Use the total recipe amounts</span></div>
    <div className="ingredient-list">{ingredients.map((ingredient, index) => <div key={index} className="ingredient-row"><select aria-label={`Ingredient ${index + 1}`} value={ingredient.foodId} onChange={e => setIngredients(ingredients.map((i, n) => n === index ? { ...i, foodId: e.target.value } : i))}>{foods.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><div className="input-unit"><input aria-label={`Ingredient ${index + 1} amount`} type="number" required min="0.1" max="10000" step="0.1" value={ingredient.amount} onChange={e => setIngredients(ingredients.map((i, n) => n === index ? { ...i, amount: e.target.value } : i))}/><span>{foods.find(f => f.id === ingredient.foodId)?.basisUnit || 'g'}</span></div><button type="button" className="icon-button" aria-label={`Remove ingredient ${index + 1}`} onClick={() => setIngredients(ingredients.filter((_, n) => n !== index))}><Trash2 size={16}/></button></div>)}</div>
    <button type="button" className="secondary" disabled={ingredients.length >= 100} onClick={() => setIngredients([...ingredients, { foodId: foods[0].id, amount: '100' }])}><Plus size={16}/>Add ingredient</button>
    {nutrition && <div className="nutrition-preview"><p className="eyebrow">PER SERVING</p><NutritionDetails nutrients={nutrition}/></div>}
    <button className="primary wide" disabled={busy || !valid}>{busy ? 'Saving…' : 'Save meal'}</button>
  </form>;
}

export function GoalsForm({ targets, busy, onSave }: { targets: Targets; busy: boolean; onSave: (targets: Targets) => Promise<void> }) {
  return <form className="form-stack" onSubmit={async e => { e.preventDefault(); const data = new FormData(e.currentTarget); await onSave(Object.fromEntries(Object.keys(targets).map(key => [key, Number(data.get(key))])) as Targets); }}>
    <p className="muted">Choose the daily amounts you want to track. The starting values are editable examples, not personalized recommendations.</p>
    <div className="nutrient-inputs">{(Object.keys(targets) as (keyof Targets)[]).map(key => <label key={key}>{labels[key]}<div className="input-unit"><input name={key} defaultValue={targets[key]} min="1" max={key === 'calories' ? '20000' : '2000'} step="1" type="number" required/><span>{unit(key)}</span></div></label>)}</div>
    <button className="primary wide" disabled={busy}>{busy ? 'Saving…' : 'Save daily goals'}</button>
  </form>;
}
