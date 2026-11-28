// Workout generation and weekly planning.
import { db, save } from '../store.js';
import { EX } from '../data/exercises.js';
import { dayKey, startOfDay, weekdayIdx } from '../ui.js';
import { L } from '../i18n.js';
import { bonusFor } from './progression.js';

export const CATEGORIES = [
  { id: 'full', name: L('Full Body', 'Ganzkörper'), desc: L('Every major muscle group in one session.', 'Alle großen Muskelgruppen in einer Einheit.'),
    pool: ['jumping-jack', 'squat', 'pushup', 'glute-bridge', 'lunge', 'mountain-climber', 'superman', 'plank', 'burpee'] },
  { id: 'upper', name: L('Upper Body', 'Oberkörper'), desc: L('Chest, shoulders, arms and back.', 'Brust, Schultern, Arme und Rücken.'),
    pool: ['incline-pushup', 'pushup', 'superman', 'mountain-climber', 'plank', 'side-plank'] },
  { id: 'lower', name: L('Lower Body', 'Unterkörper'), desc: L('Legs and glutes for strength and power.', 'Beine und Gesäß für Kraft und Power.'),
    pool: ['squat', 'lunge', 'glute-bridge', 'calf-raise', 'wall-sit', 'skater-jump'] },
  { id: 'core', name: L('Core', 'Rumpf'), desc: L('A stable, strong midsection.', 'Eine stabile, starke Körpermitte.'),
    pool: ['plank', 'crunch', 'glute-bridge', 'side-plank', 'superman', 'mountain-climber', 'situp'] },
  { id: 'football', name: L('Football Fitness', 'Fußball-Fitness'), desc: L('Speed, agility and endurance for the pitch.', 'Schnelligkeit, Beweglichkeit und Ausdauer für den Platz.'),
    pool: ['high-knees', 'skater-jump', 'lunge', 'squat', 'calf-raise', 'mountain-climber', 'side-plank', 'burpee'] },
  { id: 'beginner', name: L('Beginner', 'Einsteiger'), desc: L('Simple moves to build the basics.', 'Einfache Übungen für die Grundlagen.'), level: 'beginner',
    pool: ['jumping-jack', 'squat', 'incline-pushup', 'glute-bridge', 'plank', 'superman'] },
  { id: 'general', name: L('General Fitness', 'Allgemeine Fitness'), desc: L('Move well, feel good, build energy.', 'Gut bewegen, gut fühlen, Energie aufbauen.'),
    pool: ['jumping-jack', 'squat', 'pushup', 'high-knees', 'glute-bridge', 'calf-raise', 'plank', 'mountain-climber'] },
];
// Gentle session for sick days (not shown in the normal workout list).
export const LIGHT = {
  id: 'light', light: true,
  name: L('Gentle session', 'Sanftes Training'),
  desc: L('Half the reps, fewer sets, more rest and no jumping – to stay fit while you are a bit sick.',
    'Halbe Wiederholungen, weniger Sätze, mehr Pause und keine Sprünge – um fit zu bleiben, wenn du angeschlagen bist.'),
  pool: ['squat', 'incline-pushup', 'pushup', 'glute-bridge', 'calf-raise', 'superman', 'plank', 'crunch', 'side-plank'],
};
export const CAT = Object.fromEntries([...CATEGORIES, LIGHT].map(c => [c.id, c]));
// Workout name in the current language (history entries store the name they were saved with).
export const nameOf = w => CAT[w?.cat]?.name || w?.name || '';

const LEVEL_KEY = { beginner: 'b', intermediate: 'i', advanced: 'a' };
const LEGGY = new Set(['lower', 'football', 'full']);

// Approximate seconds for one set incl. rest.
export function setSeconds(item) {
  const e = EX[item.exId];
  const sides = e.perSide ? 2 : 1;
  const work = e.type === 'time' ? item.target * sides : item.target * 3 * sides;
  return work + item.rest + 10;
}
export const workoutSeconds = items => items.reduce((t, it) => t + setSeconds(it) * it.sets, 0);

export function buildWorkout(catId, profile = db.profile, minutes) {
  const cat = CAT[catId] || CAT.full;
  const level = cat.level || profile.experience || 'beginner';
  const key = LEVEL_KEY[level] || 'b';
  if (cat.light) return buildLight(cat, profile, level, key);
  const budget = (minutes || profile.minutes || 20) * 60;
  const pref = new Set(profile.preferred || []);

  let pool = cat.pool.map(id => EX[id]).filter(Boolean);
  if (level === 'beginner') pool = pool.filter(e => e.difficulty < 3 || pref.has(e.id));
  // Preferred exercises get picked first, but keep the template order for the session flow.
  const ranked = [...pool.filter(e => pref.has(e.id)), ...pool.filter(e => !pref.has(e.id))];

  const chosen = [];
  let total = 0;
  for (const e of ranked) {
    const [sets, base] = e.dose[key];
    const it = { exId: e.id, sets, target: base + bonusFor(e.id), rest: e.rest };
    let t = setSeconds(it) * it.sets;
    // Prefer more variety with fewer sets over fewer exercises.
    while (chosen.length >= 3 && total + t > budget * 1.05 && it.sets > 2) { it.sets--; t = setSeconds(it) * it.sets; }
    if (chosen.length >= 3 && total + t > budget * 1.05) continue;
    chosen.push(it);
    total += t;
    if (chosen.length >= 8) break;
  }
  // Short on time? Trim sets (min 1) before going over budget.
  while (total > budget * 1.15) {
    const it = [...chosen].sort((a, b) => b.sets - a.sets)[0];
    if (it.sets <= 1) break;
    it.sets--; total -= setSeconds(it);
  }
  // More time available? Add sets carefully (max 4 per exercise) – no extreme volumes.
  let guard = 0;
  while (total < budget * 0.8 && guard++ < 30) {
    const it = chosen.filter(x => x.sets < 4).sort((a, b) => a.sets - b.sets)[0];
    if (!it) break;
    it.sets++; total += setSeconds(it);
  }
  const order = cat.pool;
  chosen.sort((a, b) => order.indexOf(a.exId) - order.indexOf(b.exId));
  return { cat: cat.id, name: cat.name, level, items: chosen, seconds: total };
}

// Sick-day version: about half the reps, 1–2 sets, +30 s rest, only calm exercises.
function buildLight(cat, profile, level, key) {
  const pref = new Set(profile.preferred || []);
  const pool = cat.pool
    .filter(id => (level === 'beginner' ? id !== 'pushup' : id !== 'incline-pushup'))
    .map(id => EX[id]).filter(Boolean);
  const ranked = [...pool.filter(e => pref.has(e.id)), ...pool.filter(e => !pref.has(e.id))].slice(0, 4);
  const items = ranked.map(e => {
    const [sets, base] = e.dose[key];
    const target = base + bonusFor(e.id);
    const t = e.type === 'time' ? Math.max(10, Math.round((target * 0.5) / 5) * 5) : Math.max(3, Math.round(target * 0.5));
    return { exId: e.id, sets: level === 'beginner' ? 1 : 2, target: t, rest: e.rest + 30, normal: [sets, target] };
  });
  items.sort((a, b) => cat.pool.indexOf(a.exId) - cat.pool.indexOf(b.exId));
  return { cat: cat.id, name: cat.name, level, items, seconds: workoutSeconds(items), light: true };
}

// ---------- sick mode ----------
// db.sick = { since, severity: 'mild' | 'severe', days: ['YYYY-MM-DD', …] } – the next 2 training days.
function nextTrainingDayKeys(n = 2) {
  const out = [];
  const now = new Date();
  const days = db.planDays.length ? db.planDays : [0, 1, 2, 3, 4, 5, 6];
  for (let i = 0; i < 21 && out.length < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const k = dayKey(d);
    if (!days.includes(weekdayIdx(d))) continue;
    if (i === 0 && entriesOn(k).length) continue; // already trained today
    out.push(k);
  }
  return out;
}

export function activeSick() {
  const s = db.sick;
  if (!s || !s.days?.length) return null;
  const today = dayKey(Date.now());
  if (s.days.every(k => k < today)) { db.sick = null; save(); return null; }
  return s;
}
export function startSick(severity) {
  db.sick = { since: Date.now(), severity, days: nextTrainingDayKeys(2) };
  save();
  return db.sick;
}
export function setSickSeverity(severity) {
  if (db.sick) { db.sick.severity = severity; save(); }
}
// Still sick: restart with the next 2 training days from today.
export function extendSick() {
  if (!db.sick) return;
  db.sick.days = nextTrainingDayKeys(2);
  db.sick.since = Date.now();
  save();
}
export function endSick() { db.sick = null; save(); }
export const sickDaysLeft = () => {
  const s = activeSick();
  if (!s) return 0;
  const today = dayKey(Date.now());
  return s.days.filter(k => k > today || (k === today && !entriesOn(k).length)).length;
};

export function defaultDays(n) {
  return ({ 1: [2], 2: [1, 4], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] })[n] || [0, 2, 4];
}

// Category rotation based on goals, areas and experience.
export function cycle(profile = db.profile) {
  const out = [];
  const add = c => { if (!out.includes(c)) out.push(c); };
  const g = new Set(profile.goals || []);
  if (profile.experience === 'beginner') add('beginner');
  for (const a of profile.areas || []) add({ upper: 'upper', lower: 'lower', core: 'core', endurance: 'general', speed: 'football' }[a]);
  if (g.has('football')) add('football');
  if (g.has('strength')) { add('upper'); add('lower'); }
  if (g.has('fitness') || g.has('athletic')) add('general');
  if (g.has('athletic')) add('football');
  if (g.has('learn') || g.has('routine')) add('full');
  add('full'); add('core');
  // Avoid two leg-heavy sessions back to back.
  for (let i = 1; i < out.length; i++) {
    if (LEGGY.has(out[i]) && LEGGY.has(out[i - 1])) {
      const j = out.findIndex((c, k) => k > i && !LEGGY.has(c));
      if (j > 0) [out[i], out[j]] = [out[j], out[i]];
    }
  }
  return out.filter(Boolean);
}

export function weekDates(offset = 0) {
  const t = startOfDay();
  const monday = new Date(t.getFullYear(), t.getMonth(), t.getDate() - weekdayIdx(t) + offset * 7);
  return [...Array(7)].map((_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

export const entriesOn = key => db.history.filter(h => dayKey(h.start) === key);

export function weekPlan(offset = 0) {
  const dates = weekDates(offset);
  const cyc = cycle();
  const days = [...db.planDays].sort((a, b) => a - b);
  const todayKey = dayKey(Date.now());
  const today0 = startOfDay().getTime();
  const sick = activeSick();
  return dates.map((date, i) => {
    const key = dayKey(date);
    const pos = days.indexOf(i);
    const sickDay = !!sick?.days.includes(key);
    return {
      idx: i, date, key, sickDay,
      planned: sickDay ? sick.severity === 'mild' : pos >= 0,
      cat: sickDay ? (sick.severity === 'mild' ? 'light' : null) : pos >= 0 ? cyc[pos % cyc.length] : null,
      entries: entriesOn(key),
      isToday: key === todayKey,
      past: date.getTime() < today0,
    };
  });
}

function consecutiveDaysBefore(date) {
  let n = 0;
  const d = startOfDay(date);
  for (let i = 1; i <= 7; i++) {
    const k = dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - i));
    if (entriesOn(k).length) n++; else break;
  }
  return n;
}

export function todayRecommendation() {
  const t = weekPlan()[weekdayIdx()];
  const minutes = db.profile.minutes || 20;
  if (t.entries.length) return { kind: 'done', day: t, entry: t.entries[t.entries.length - 1] };
  if (t.sickDay) {
    return activeSick().severity === 'mild'
      ? { kind: 'sick', cat: 'light', minutes: 10, note: L('Sick mode: half the reps, more rest. Stop if you feel worse.', 'Krank-Modus: halbe Wiederholungen, mehr Pause. Hör auf, wenn es dir schlechter geht.') }
      : { kind: 'sickrest', note: L('Sick mode: rest today. Drink plenty and sleep – that is your training.', 'Krank-Modus: Heute Ruhe. Viel trinken und schlafen – das ist heute dein Training.') };
  }
  const streak = consecutiveDaysBefore(new Date());
  if (t.planned && streak >= 3) {
    return { kind: 'recover', cat: 'core', minutes: Math.max(10, Math.round(minutes / 2 / 5) * 5),
      note: L('{n} days in a row. Go light today – recovery builds strength too.', '{n} Tage am Stück. Heute locker – auch Erholung macht stark.', { n: streak }) };
  }
  if (t.planned) return { kind: 'train', cat: t.cat, minutes };
  return { kind: 'rest', cat: 'general', minutes: 10, note: L('Rest day. Recover, stretch, stay active.', 'Ruhetag. Erholen, dehnen, aktiv bleiben.') };
}

export function nextPlanned(fromTomorrow = false) {
  const now = new Date();
  for (let i = fromTomorrow ? 1 : 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (db.planDays.includes(weekdayIdx(d))) {
      if (i === 0 && entriesOn(dayKey(d)).length) continue;
      return d;
    }
  }
  return null;
}
