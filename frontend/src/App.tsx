import { useEffect, useRef, useState } from 'react';
import { Leaf, LayoutDashboard, BookOpen, CookingPot, Plus, ArrowUpRight, ChevronLeft, ChevronRight, SlidersHorizontal, Sun, Sunset, Moon, Apple, Trash2, Check, ArrowRight, Search, LoaderCircle, CircleAlert, X, Sprout, Flame, Wheat, Droplets } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { NutritionGrid, NutritionCard } from './components/nutrition-grid';
import { NumberTicker } from './components/magicui/number-ticker';
import { Modal } from './components/Modal';
import { FoodPicker, GoalsForm, LogForm, MealForm, NutritionDetails, NutritionLine } from './components/Forms';
import { requestState } from './lib/api';
import { isDesktop } from './lib/desktop';
import { useTheme } from './lib/theme';
import { type Entry, type Food, type Meal, type Nutrients, type Slot, type Targets, type TrackerState, slots, localDate, shiftDate, sum, fmt, mealNutrition, labels, unit } from './lib/nutrition';

type View = 'diary' | 'foods' | 'meals';
type Dialog = { kind: 'food'; slot: Slot; initialTab?: string } | { kind: 'log'; item: Food | Meal; slot: Slot } | { kind: 'meal' } | { kind: 'goals' } | { kind: 'detail'; entry: Entry };
const slotIcons = { Breakfast: Sun, Lunch: Sunset, Dinner: Moon, Snacks: Apple };
const nav = [{ key: 'diary', label: 'Daily diary', icon: LayoutDashboard }, { key: 'foods', label: 'My foods', icon: BookOpen }, { key: 'meals', label: 'My meals', icon: CookingPot }] as const;

function Count({ value, className = '' }: { value: number; className?: string }) {
  const reduced = useReducedMotion();
  return reduced ? <span className={className}>{fmt(value, 0)}</span> : <NumberTicker value={Math.round(value)} className={className}/>;
}

function BowlArt() {
  return <svg className="bowl-art" viewBox="0 0 310 240" aria-hidden="true"><defs><filter id="bowl-shadow"><feDropShadow dx="0" dy="9" stdDeviation="9" floodColor="#1c4430" floodOpacity=".12"/></filter><pattern id="grain" width="13" height="13" patternUnits="userSpaceOnUse"><path d="m3 3 3 2m2 5 3-2" stroke="#c3a779" strokeWidth="2" strokeLinecap="round"/></pattern></defs><g transform="rotate(-14 155 120)"><ellipse cx="160" cy="135" rx="94" ry="91" fill="#fcfcf3" filter="url(#bowl-shadow)"/><circle cx="160" cy="130" r="77" fill="#e8e9dc"/><circle cx="160" cy="130" r="70" fill="#dac798"/><circle cx="160" cy="130" r="70" fill="url(#grain)"/><g fill="#558148" stroke="#416938" strokeWidth="1.5"><path d="M157 130C97 141 75 95 114 73c32-4 36 28 43 57Z"/><path d="M151 131C116 109 124 54 154 61c24 16 8 46-3 70Z"/><path d="M166 132c-9-58 34-74 51-47 3 31-25 44-51 47Z"/></g><g fill="none" stroke="#95af72" strokeWidth="1.5"><path d="m112 85 41 48m-2-59 4 51m48-32-37 37"/></g><g fill="#df7754" stroke="#ef9c73" strokeWidth="4"><circle cx="187" cy="157" r="18"/><circle cx="216" cy="138" r="16"/><circle cx="206" cy="180" r="15"/></g><g fill="#f4cc83"><ellipse cx="186" cy="151" rx="2" ry="4"/><ellipse cx="192" cy="160" rx="2" ry="4"/><ellipse cx="211" cy="133" rx="2" ry="4"/><ellipse cx="216" cy="145" rx="2" ry="4"/><ellipse cx="204" cy="175" rx="2" ry="4"/></g><g fill="#e5eed0" stroke="#73934e" strokeWidth="6"><path d="M151 143c-39-10-58 9-40 37 18 20 44-1 40-37Z"/><path d="M170 160c-35-8-45 12-24 34 21 9 39-14 24-34Z"/></g><g fill="#f5f1de"><rect x="157" y="106" width="15" height="14" rx="3" transform="rotate(25 164 113)"/><rect x="180" y="124" width="13" height="13" rx="3"/><rect x="130" y="130" width="13" height="13" rx="3"/></g></g><path d="M44 72c-15-30 0-48 22-37 5 18-4 30-22 37m0 0 6-25" fill="#7c9a59" stroke="#64834a" strokeWidth="2"/><path d="M260 183c18-15 34-6 29 12-13 8-22 1-29-12" fill="#83a16a"/><circle cx="65" cy="187" r="4" fill="#d4ae70"/><circle cx="246" cy="61" r="3" fill="#d4ae70"/></svg>;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [state, setState] = useState<TrackerState | null>(null);
  const stateRef = useRef(state); stateRef.current = state;
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<View>('diary');
  const [date, setDate] = useState(localDate());
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [filter, setFilter] = useState('');

  async function load() {
    setLoading(true); setError(''); setDialog(null);
    try { const next = await requestState(); stateRef.current = next; setState(next); }
    catch { setError(isDesktop() ? 'Your local diary is unavailable. Close and reopen Salubrity to reconnect.' : 'Your local diary is unavailable. Start the backend and reconnect to load your saved nutrition.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer); } }, [notice]);
  async function save(transform: (current: TrackerState) => TrackerState, message: string) {
    if (!stateRef.current || saving.current) return false;
    saving.current = true; setBusy(true); setError('');
    try {
      const next = await requestState(transform(stateRef.current));
      stateRef.current = next; setState(next); setNotice(message); return true;
    } catch (e) { setError(e instanceof TypeError ? 'Couldn’t reach your local diary. Your changes have not been saved. Reconnect and try again.' : e instanceof Error ? e.message : 'Could not save. Please try again.'); return false; }
    finally { saving.current = false; setBusy(false); }
  }
  function changeView(next: View) { setView(next); setFilter(''); }
  async function createFood(food: Food) {
    if (await save(s => ({ ...s, foods: [...s.foods, food] }), 'Food saved to your library')) {
      if (view === 'diary') setDialog({ kind: 'log', item: food, slot: dialog?.kind === 'food' ? dialog.slot : 'Breakfast' });
      else setDialog(null);
    }
  }
  async function log(slot: Slot, amount: number, nutrients: Nutrients, basisUnit: 'g' | 'ml') {
    if (dialog?.kind !== 'log') return;
    const item = dialog.item;
    const isFood = 'basisAmount' in item;
    const entry: Entry = { id: crypto.randomUUID(), date, slot, name: item.name, portion: `${fmt(amount)} ${isFood ? basisUnit : amount === 1 ? 'serving' : 'servings'}`, nutrients };
    if (await save(s => ({ ...s, foods: isFood && !s.foods.some(f => f.id === item.id) ? [...s.foods, { ...item, basisUnit }] : s.foods, entries: [...s.entries, entry] }), `Added to ${slot.toLowerCase()}`)) setDialog(null);
  }
  const entries = state?.entries.filter(e => e.date === date) || [];
  const total = sum(entries.map(e => e.nutrients));
  const today = date === localDate();
  const displayDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const modalTitle = dialog?.kind === 'food' ? 'Add a food' : dialog?.kind === 'meal' ? 'Create a meal' : dialog?.kind === 'goals' ? 'Make your goals your own' : dialog?.kind === 'detail' ? dialog.entry.name : 'A portion that fits your day';

  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); changeView('diary'); }}><span className="brand-mark"><Leaf size={24}/></span>Salubrity<span className="brand-dot">.</span></a><p className="brand-tagline">A little more balanced.</p>
      <div className="nav-label">YOUR SPACE</div><nav aria-label="Main navigation">{nav.map(({ key, label, icon: Icon }) => <button key={key} aria-label={label} className={`nav-item ${view === key ? 'active' : ''}`} onClick={() => changeView(key)} aria-current={view === key ? 'page' : undefined}><Icon size={19}/><span>{label}</span>{key !== 'diary' && state && <small>{key === 'foods' ? state.foods.length : state.meals.length}</small>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Sprout size={24}/><h3>Small steps.<br/>Lasting habits.</h3><p>Make room for the foods<br/>that make you feel good.</p></div><button className="nav-item goals-link" disabled={!state || busy} onClick={() => setDialog({ kind: 'goals' })}><SlidersHorizontal size={18}/>Daily goals</button><div className="profile"><span className="profile-avatar"><Leaf size={19}/></span><div><strong>Your personal space</strong><small>Stored on this computer</small></div><span className={`connection-dot ${state && !error ? 'connected' : ''}`} title={state && !error ? 'Diary connected' : 'Diary unavailable'}/></div></div>
    </aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumb">Your space <span>/</span> <strong>{nav.find(n => n.key === view)?.label}</strong></div><div className="topbar-actions"><span className="topbar-note"><span className="tiny-leaf"><Leaf size={14}/></span>Nutrition, in balance</span><button className="theme-toggle" onClick={toggleTheme} aria-label="Dark mode" aria-pressed={theme === 'dark'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}<span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span></button></div></header>
      <div className="page-content"><div className="page-heading"><div><p className="eyebrow">{view === 'diary' ? 'A FRESH PERSPECTIVE ON YOUR DAY' : 'GOOD FOOD, MADE SIMPLE'}</p><h1>{view === 'diary' ? 'Your daily nourishment.' : view === 'foods' ? 'Foods you come back to.' : 'Made by you. Saved for later.'}</h1><p className="muted">{view === 'diary' ? 'A little awareness. A little balance. A healthier relationship with food.' : view === 'foods' ? 'Your own collection of food labels, ready whenever you are.' : 'Bring your favorite ingredients together. We’ll do the nutrition math.'}</p></div><button className="primary" disabled={!state || busy || loading} onClick={() => setDialog(view === 'meals' ? { kind: 'meal' } : { kind: 'food', slot: 'Breakfast', initialTab: view === 'foods' ? 'custom' : undefined })}><Plus size={18}/>{view === 'meals' ? 'Create meal' : 'Add food'}</button></div>
      {error && !dialog && <div className="error-banner" role="alert"><CircleAlert size={19}/><span>{error}</span><button onClick={() => void load()} disabled={busy || loading}>Reconnect / reload</button></div>}
      {loading && <div className="loading-state"><LoaderCircle className="spin"/>Opening your nutrition diary…</div>}
      {!loading && !state && <div className="empty disconnected"><Sprout size={48}/><h2>Your space is waiting for you.</h2><p>Connect your local diary to start adding foods and meals.</p><button className="primary" onClick={() => void load()}>Reconnect</button></div>}
      {state && !loading && <>
        {view === 'diary' ? <>
          <section className="welcome-banner"><div><span className="pill"><span/>A little intention goes a long way</span><h2>Feel good about<br/>what fuels you.</h2><p>Every meal is a chance to find your balance.<br/>Start with what’s on your plate.</p><button className="text-button" onClick={() => setDialog({ kind: 'goals' })}>Set your daily intentions <ArrowUpRight size={17}/></button></div><BowlArt/><span className="banner-caption">NOURISH · NOTICE · REPEAT</span></section>
          <div className="overview-heading"><h2>Daily overview <span className="subtle-label">{today ? 'Today' : 'Your day'}</span></h2><div className="date-control"><button className="icon-button" aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}><ChevronLeft size={17}/></button><label><span className="sr-only">Diary date</span><input type="date" value={date} onChange={e => { if (e.target.value) setDate(e.target.value); }}/></label><button className="icon-button" aria-label="Next day" onClick={() => setDate(shiftDate(date, 1))}><ChevronRight size={17}/></button>{!today && <button className="text-button" onClick={() => setDate(localDate())}>Today</button>}</div></div>
          <NutritionGrid className="macro-grid">{(['calories', 'protein', 'carbs', 'fat'] as const).map((key, index) => {
            const target = state.targets[key], value = total[key], percent = Math.min(100, value / target * 100);
            const Icon = [Flame, Sprout, Wheat, Droplets][index];
            return <NutritionCard key={key} className={`macro-card macro-${key}`} header={<><div className="macro-top"><span>{labels[key]}</span><span className="macro-icon"><Icon size={17}/></span></div><div className="macro-value"><Count value={value}/><small>{unit(key)}</small></div><div className="progress-track" role="progressbar" aria-label={`${labels[key]} goal progress`} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(value, target)}><span style={{ width: `${percent}%` }}/></div></>} title={<span className="macro-target">of {fmt(target, 0)} {unit(key)} <span>{Math.round(value / target * 100)}%</span></span>} description={value > target ? `${fmt(value - target, 0)} ${unit(key)} above your goal` : `${fmt(target - value, 0)} ${unit(key)} to your goal`}/>;
          })}</NutritionGrid>
          <div className="diary-layout"><section className="diary-card"><div className="card-heading"><div><h2>On your plate</h2><p>{displayDate}</p></div><span className="count-badge">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span></div>
            {slots.map(slot => { const items = entries.filter(e => e.slot === slot), Icon = slotIcons[slot]; return <section className="meal-slot" key={slot}><div className="slot-heading"><span className={`slot-icon slot-${slot.toLowerCase()}`}><Icon size={20}/></span><h3>{slot}<small>{items.length ? `${fmt(sum(items.map(e => e.nutrients)).calories, 0)} kcal` : 'Nothing logged yet'}</small></h3><button className="add-slot" disabled={busy} onClick={() => setDialog({ kind: 'food', slot })}><Plus size={16}/><span>Add food</span></button></div>
              {items.length > 0 && <div className="entry-list">{items.map(entry => <div className="diary-entry" key={entry.id}><button className="entry-detail" onClick={() => setDialog({ kind: 'detail', entry })}><strong>{entry.name}</strong><span>{entry.portion} <span className="entry-macros">· P {fmt(entry.nutrients.protein)}g · C {fmt(entry.nutrients.carbs)}g · F {fmt(entry.nutrients.fat)}g</span></span></button><span className="entry-calories">{fmt(entry.nutrients.calories, 0)} <small>kcal</small></span><button className="icon-button remove-entry" aria-label={`Remove ${entry.name}`} disabled={busy} onClick={() => void save(s => ({ ...s, entries: s.entries.filter(e => e.id !== entry.id) }), 'Entry removed')}><X size={15}/></button></div>)}</div>}
            </section>; })}
            <div className="diary-footer"><Leaf size={16}/><span>Every food has a place in your day.</span></div></section>
            <aside className="nutrition-aside"><section className="detail-card"><div className="card-heading"><h2>A closer look</h2><span className="mini-icon"><SlidersHorizontal size={17}/></span></div><p className="muted">The little things add up, too.</p><div className="extra-nutrients">{(['fiber', 'sugar', 'sodium'] as const).map(key => <div key={key}><span><i className={`nutrient-dot ${key}`}/>{labels[key]}</span><strong>{fmt(total[key], key === 'sodium' ? 0 : 1)} <small>{unit(key)}</small></strong></div>)}</div><p className="form-hint">{['fiber', 'sugar', 'sodium'].some(key => total[key as keyof Nutrients] === null) ? 'Some labels are incomplete. A dash means a full daily total isn’t available.' : 'Totals reflect the nutrition labels you’ve logged.'}</p></section>
              <section className="saved-meal-prompt"><span className="recipe-icon"><CookingPot size={25}/></span><h3>Your favorites,<br/>a little faster.</h3><p>Save a meal once. Add its nutrition to your day in a few clicks.</p><button className="text-button" onClick={() => changeView('meals')}>Explore my meals <ArrowRight size={16}/></button></section>
              <button className="goal-note" onClick={() => setDialog({ kind: 'goals' })}><SlidersHorizontal size={17}/><span>Your goals, your pace.<small>Customize your daily amounts</small></span><ChevronRight size={16}/></button>
            </aside></div>
        </> : <>
          <div className="library-toolbar"><div className="search-form"><Search size={18}/><input aria-label={`Search my ${view}`} placeholder={view === 'foods' ? 'Find a food in your library…' : 'Find a saved meal…'} value={filter} onChange={e => setFilter(e.target.value)}/></div><span className="muted">{view === 'foods' ? state.foods.length : state.meals.length} saved</span></div>
          {view === 'foods' ? <div className="library-grid">{state.foods.filter(f => f.name.toLowerCase().includes(filter.toLowerCase())).map(food => <article className="library-card" key={food.id}><div className="library-card-top"><span className="food-icon"><Leaf size={24}/></span><button className="icon-button" aria-label={`Delete ${food.name}`} disabled={busy} onClick={() => { if (state.meals.some(m => m.ingredients.some(i => i.foodId === food.id))) { setError('This food is used in a saved meal. Remove that meal before deleting its ingredient.'); return; } void save(s => ({ ...s, foods: s.foods.filter(f => f.id !== food.id) }), 'Food removed from library'); }}><Trash2 size={16}/></button></div><h3>{food.name}</h3><p className="muted source-label">{food.source}</p><span className="basis-label">Per {fmt(food.basisAmount)} {food.basisUnit || 'g'}</span><NutritionLine nutrients={food.nutrients}/><button className="secondary wide" onClick={() => setDialog({ kind: 'log', item: food, slot: 'Breakfast' })}><Plus size={16}/>Add to diary</button></article>)}</div> : <div className="library-grid">{state.meals.filter(m => m.name.toLowerCase().includes(filter.toLowerCase())).map(meal => <article className="library-card" key={meal.id}><div className="library-card-top"><span className="recipe-icon"><CookingPot size={25}/></span><button className="icon-button" aria-label={`Delete ${meal.name}`} disabled={busy} onClick={() => void save(s => ({ ...s, meals: s.meals.filter(m => m.id !== meal.id) }), 'Meal removed')}><Trash2 size={16}/></button></div><h3>{meal.name}</h3><p className="muted">{meal.ingredients.length} ingredients · makes {fmt(meal.servings)} servings</p><span className="basis-label">Per serving</span><NutritionLine nutrients={mealNutrition(meal, state.foods)}/><button className="secondary wide" onClick={() => setDialog({ kind: 'log', item: meal, slot: 'Lunch' })}><Plus size={16}/>Add to diary</button></article>)}</div>}
          {(view === 'foods' ? state.foods : state.meals).filter(item => item.name.toLowerCase().includes(filter.toLowerCase())).length === 0 && <div className="empty library-empty"><span className="empty-art">{view === 'foods' ? <Sprout size={44}/> : <CookingPot size={44}/>}</span><p className="eyebrow">A COLLECTION THAT GROWS WITH YOU</p><h2>{filter ? 'Nothing here by that name.' : view === 'foods' ? 'Make room for your favorites.' : 'Good meals deserve an encore.'}</h2><p>{filter ? 'Try a different search, or add something new.' : view === 'foods' ? 'Add a food from its nutrition label or find it online. Your next meal starts here.' : 'Combine foods from your library, set the servings, and save a meal you love.'}</p><button className="primary" onClick={() => setDialog(view === 'foods' ? { kind: 'food', slot: 'Breakfast', initialTab: 'custom' } : { kind: 'meal' })}><Plus size={17}/>{view === 'foods' ? 'Add your first food' : 'Create a meal'}</button></div>}
        </>}
        <footer className="page-footer"><span>Salubrity <span>·</span> Nutrition, in balance.</span><span>{busy ? 'Saving…' : 'Your diary stays on this computer'} <Leaf size={12}/></span></footer>
      </>}
      </div>
    </main>
    {notice && <div className="toast" role="status"><Check size={18}/>{notice}</div>}
    {dialog && state && <Modal title={modalTitle} subtitle={dialog.kind === 'log' || dialog.kind === 'food' ? `For ${displayDate}` : undefined} close={() => { if (!busy) { setDialog(null); setError(''); } }}>
      {error && <p className="error-banner modal-error" role="alert">{error}</p>}
      {dialog.kind === 'food' && <FoodPicker state={state} busy={busy} initialTab={dialog.initialTab} onSelect={food => setDialog({ kind: 'log', item: state.foods.find(saved => saved.id === food.id) || food, slot: dialog.slot })} onCreate={createFood}/>}
      {dialog.kind === 'log' && <LogForm item={dialog.item} foods={state.foods} initialSlot={dialog.slot} busy={busy} onLog={log}/>}
      {dialog.kind === 'meal' && <><MealForm foods={state.foods} busy={busy} onSave={async meal => { if (await save(s => ({ ...s, meals: [...s.meals, meal] }), 'Meal saved')) setDialog(null); }}/>{!state.foods.length && <button className="primary wide" onClick={() => setDialog({ kind: 'food', slot: 'Breakfast', initialTab: 'custom' })}>Add a food first <ArrowRight size={16}/></button>}</>}
      {dialog.kind === 'goals' && <GoalsForm targets={state.targets} busy={busy} onSave={async (targets: Targets) => { if (await save(s => ({ ...s, targets }), 'Daily goals updated')) setDialog(null); }}/ >}
      {dialog.kind === 'detail' && <><p className="muted">{dialog.entry.slot} · {dialog.entry.portion}</p><NutritionDetails nutrients={dialog.entry.nutrients}/><p className="form-hint">Nutrition for this logged portion. A dash means the value isn’t available.</p></>}
    </Modal>}
  </div>;
}
