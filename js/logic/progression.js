// Progression by feel: after each exercise you say easy / hard / with help.
// Easy → next time a little more (+1 rep or +5 s). Hard or with help → stays the same.
import { db, save } from '../store.js';
import { EX } from '../data/exercises.js';

export const bonusFor = id => db.progress?.[id]?.bonus || 0;
export const stepFor = id => (EX[id]?.type === 'time' ? 5 : 1);
const maxBonus = id => (EX[id]?.type === 'time' ? 60 : 15);

export function applyFeedback(id, rating) {
  if (!db.progress) db.progress = {};
  const p = db.progress[id] || { bonus: 0 };
  const before = p.bonus;
  if (rating === 'easy') p.bonus = Math.min(maxBonus(id), p.bonus + stepFor(id));
  p.last = rating;
  p.at = Date.now();
  db.progress[id] = p;
  save();
  return { added: p.bonus - before, bonus: p.bonus };
}

export function resetProgression() { db.progress = {}; save(); }
