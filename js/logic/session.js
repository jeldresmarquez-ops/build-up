// Active workout session state machine (persisted, so you can continue after closing the app).
import { db, save, uid } from '../store.js';
import { EX } from '../data/exercises.js';
import { records } from './stats.js';
import { applyFeedback } from './progression.js';

const now = () => Date.now();

export function startSession(w) {
  db.session = {
    id: uid(), cat: w.cat, name: w.name, level: w.level,
    startedAt: now(), acc: 0, runSince: now(), paused: false,
    items: w.items.map(it => ({ ...it, done: [] })),
    ex: 0, set: 0, phase: 'work', ends: null, left: null, workStart: null,
  };
  save();
}

export const elapsed = s => s.acc + (s.paused ? 0 : now() - s.runSince);
export const remaining = s => (s.ends ? Math.max(0, s.ends - now()) : s.left ?? 0);
export const current = s => s.items[s.ex];

export function pause(s) {
  if (s.paused) return;
  s.acc += now() - s.runSince;
  s.paused = true;
  if (s.ends) { s.left = s.ends - now(); s.ends = null; }
  save();
}
export function resume(s) {
  if (!s.paused) return;
  s.paused = false;
  s.runSince = now();
  if (s.left != null) { s.ends = now() + s.left; s.left = null; }
  save();
}

export function startTimed(s) {
  const it = current(s), e = EX[it.exId];
  const secs = it.mode === 'time' ? it.target : it.target * (e.perSide ? 2 : 1);
  s.phase = 'timed';
  s.ends = now() + secs * 1000;
  s.workStart = now();
  save();
}

// Returns 'next' | 'feedback' | 'finished'
export function completeSet(s, value) {
  const it = current(s);
  it.done.push(Math.max(0, Math.round(value)));
  s.ends = null; s.left = null; s.workStart = null;
  if (s.set + 1 < it.sets) {
    s.set++;
    s.phase = 'rest';
    s.ends = now() + it.rest * 1000;
    save();
    return 'next';
  }
  // Last set of this exercise: ask how it felt (not in gentle sick-mode sessions).
  if (s.cat !== 'light' && it.ask !== false) { s.phase = 'feedback'; save(); return 'feedback'; }
  return nextExercise(s);
}

function nextExercise(s) {
  const it = current(s);
  if (s.ex + 1 < s.items.length) {
    s.ex++; s.set = 0;
    s.phase = 'rest';
    s.ends = now() + it.rest * 1000;
    save();
    return 'next';
  }
  save();
  return 'finished';
}

// rating: 'easy' | 'hard' | 'help'
export function answerFeedback(s, rating) {
  const it = current(s);
  it.rating = rating;
  const change = applyFeedback(it.exId, rating);
  return { result: nextExercise(s), change, target: it.target };
}

export function endRest(s) {
  s.phase = 'work'; s.ends = null; s.left = null;
  save();
}
export function addRest(s, sec) {
  if (s.ends) s.ends += sec * 1000; else if (s.left != null) s.left += sec * 1000;
  save();
}

export function skipExercise(s) {
  if (s.ex + 1 >= s.items.length) return 'finished';
  s.ex++; s.set = 0; s.phase = 'work'; s.ends = null; s.left = null;
  save();
  return 'next';
}

// Save to history. Returns the entry (or null if nothing was done).
export function finishSession(s, { manual = false } = {}) {
  if (!s.paused) { s.acc += now() - s.runSince; s.paused = true; }
  const sets = s.items.reduce((n, it) => n + it.done.length, 0);
  db.session = null;
  if (!sets && !manual) { save(); return null; }
  const before = Object.fromEntries(records().map(r => [r.exId, r.best]));
  const reps = s.items.reduce((n, it) => n + (EX[it.exId]?.type === 'reps' && it.mode !== 'time' ? it.done.reduce((a, b) => a + b, 0) : 0), 0);
  const entry = {
    id: s.id, cat: s.cat, name: s.name, level: s.level,
    start: s.startedAt, end: now(), dur: Math.round(s.acc / 1000), sets, reps,
    items: s.items.filter(it => it.done.length).map(it => ({ exId: it.exId, target: it.target, done: it.done, rating: it.rating || null, ...(it.mode ? { mode: it.mode } : {}) })),
  };
  entry.newRecords = entry.items
    .filter(it => it.mode !== 'time' || EX[it.exId]?.type === 'time')
    .map(it => ({ exId: it.exId, best: Math.max(...it.done), prev: before[it.exId] || 0 }))
    .filter(r => r.prev > 0 && r.best > r.prev);
  db.history.push(entry);
  db.history.sort((a, b) => a.start - b.start);
  save();
  return entry;
}

// "Mark as completed" for a planned day without running the player.
export function logManual(w, date = new Date()) {
  const start = new Date(date);
  if (start.toDateString() !== new Date().toDateString()) start.setHours(18, 0, 0, 0);
  const entry = {
    id: uid(), cat: w.cat, name: w.name, level: w.level, manual: true,
    start: start.getTime(), end: start.getTime() + w.seconds * 1000, dur: Math.round(w.seconds),
    sets: w.items.reduce((n, it) => n + it.sets, 0), reps: 0, items: [],
  };
  db.history.push(entry);
  db.history.sort((a, b) => a.start - b.start);
  save();
  return entry;
}

export function discardSession() {
  db.session = null;
  save();
}

export function deleteEntry(id) {
  db.history = db.history.filter(h => h.id !== id);
  save();
}
