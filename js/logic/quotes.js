import { db, save, uid } from '../store.js';
import { QUOTES } from '../data/quotes.js';
import { L } from '../i18n.js';

export function allQuotes() {
  return [...QUOTES.map((text, i) => ({ id: 'q' + (i + 1), text })), ...db.customQuotes];
}

const norm = t => String(t).toLowerCase()
  .replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"')
  .replace(/[^a-z0-9]+/g, ' ').trim();

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle-bag rotation: every quote once per cycle, never the same twice in a row.
export function nextQuote() {
  const all = allQuotes();
  const ids = new Set(all.map(q => q.id));
  let { queue = [], last = null } = db.rotation;
  queue = queue.filter(id => ids.has(id) && id !== last);
  if (!queue.length) {
    queue = shuffle(all.map(q => q.id));
    if (queue.length > 1 && queue[0] === last) queue.push(queue.shift());
  }
  const id = queue.shift();
  db.rotation = { queue, last: id };
  save();
  return all.find(q => q.id === id) || all[0];
}

export function dailyQuote() {
  const all = allQuotes();
  const d = new Date();
  const n = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
  return all[(n * 7 + 3) % all.length];
}

export function addQuote(text) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (t.length < 4) return { ok: false, msg: L('Quote is too short.', 'Das Zitat ist zu kurz.') };
  if (t.length > 280) return { ok: false, msg: L('Keep it under 280 characters.', 'Maximal 280 Zeichen.') };
  const n = norm(t);
  if (allQuotes().some(q => norm(q.text) === n)) return { ok: false, msg: L('This quote is already in your collection.', 'Dieses Zitat ist schon in deiner Sammlung.') };
  const q = { id: 'c' + uid(), text: t, custom: true };
  db.customQuotes.push(q);
  const pos = Math.floor(Math.random() * (db.rotation.queue.length + 1));
  db.rotation.queue.splice(pos, 0, q.id);
  save();
  return { ok: true, quote: q };
}

export function removeQuote(id) {
  db.customQuotes = db.customQuotes.filter(q => q.id !== id);
  db.favQuotes = db.favQuotes.filter(x => x !== id);
  db.rotation.queue = db.rotation.queue.filter(x => x !== id);
  save();
}

export function toggleFav(id) {
  db.favQuotes = db.favQuotes.includes(id) ? db.favQuotes.filter(x => x !== id) : [...db.favQuotes, id];
  save();
  return db.favQuotes.includes(id);
}
