// Progress statistics – always about your own development.
import { db } from '../store.js';
import { EX } from '../data/exercises.js';
import { weekDates } from './plan.js';
import { startOfDay } from '../ui.js';
import { L } from '../i18n.js';

const DAY = 86400000;

export function totals(list = db.history) {
  return list.reduce((t, h) => ({
    sessions: t.sessions + 1,
    seconds: t.seconds + (h.dur || 0),
    reps: t.reps + (h.reps || 0),
    sets: t.sets + (h.sets || 0),
  }), { sessions: 0, seconds: 0, reps: 0, sets: 0 });
}

export function inRange(from, to) {
  return db.history.filter(h => h.start >= from && h.start < to);
}

export function weekCount(offset = 0) {
  const d = weekDates(offset);
  const from = d[0].getTime(), to = from + 7 * DAY;
  return inRange(from, to).length;
}

export function weeklySeries(weeks = 8) {
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = weekDates(-i)[0];
    const list = inRange(d.getTime(), d.getTime() + 7 * DAY);
    out.push({ start: d, sessions: list.length, seconds: totals(list).seconds });
  }
  return out;
}

// Consecutive weeks that hit the weekly plan (current week counts once reached).
export function weekStreak() {
  const target = Math.max(1, db.planDays.length);
  let n = 0;
  if (weekCount(0) >= target) n++;
  for (let i = 1; i < 104; i++) {
    if (weekCount(-i) >= target) n++; else break;
  }
  return n;
}

export function consistency(weeks = 4) {
  const target = Math.max(1, db.planDays.length) * weeks;
  let done = 0;
  for (let i = 0; i < weeks; i++) done += Math.min(weekCount(-i), db.planDays.length || 1);
  return Math.min(1, done / target);
}

export function compare(days) {
  const end = startOfDay().getTime() + DAY;
  const cur = totals(inRange(end - days * DAY, end));
  const prev = totals(inRange(end - 2 * days * DAY, end - days * DAY));
  return { cur, prev };
}

// Best set per exercise; also first best so you can see improvement.
export function records(list = db.history) {
  const rec = {};
  const sorted = [...list].sort((a, b) => a.start - b.start);
  for (const h of sorted) {
    for (const it of h.items || []) {
      if (it.mode === 'time' && EX[it.exId]?.type !== 'time') continue; // timed circuit round, not a rep record
      const best = Math.max(0, ...(it.done || []));
      if (!best || !EX[it.exId]) continue;
      const r = rec[it.exId] || (rec[it.exId] = { exId: it.exId, first: best, firstAt: h.start, best: 0, bestAt: 0, sessions: 0 });
      r.sessions++;
      if (best > r.best) { r.best = best; r.bestAt = h.start; }
    }
  }
  return Object.values(rec).sort((a, b) => b.bestAt - a.bestAt);
}

export const unit = (exId, n, mode) => {
  const e = EX[exId];
  return e?.type === 'time' || mode === 'time' ? `${n}s` : `${n} ${L('reps', 'Wdh.')}`;
};
