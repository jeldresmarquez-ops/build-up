// Open Food Facts lookup + BUILD UP composition indicator.
import { db, save } from '../store.js';

const BASE = 'https://world.openfoodfacts.org';
const FIELDS = [
  'code', 'product_name', 'product_name_en', 'generic_name', 'brands', 'image_front_small_url', 'image_front_url',
  'nutriments', 'ingredients_text', 'ingredients_text_en', 'serving_size', 'quantity',
  'product_quantity_unit', 'categories_tags',
].join(',');

const cache = new Map();

function timeoutFetch(url, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

const num = v => {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

function isLiquid(p) {
  const cats = p.categories_tags || [];
  if (cats.some(c => /beverages|drinks|waters|milks|juices/.test(c))) return true;
  if (p.product_quantity_unit === 'ml') return true;
  return /\d\s*(ml|cl|l)\b/i.test(p.quantity || '');
}

export function normalize(p) {
  const n = p.nutriments || {};
  const pick = suffix => ({
    kcal: num(n['energy-kcal' + suffix]),
    kj: num(n['energy-kj' + suffix]) ?? num(n['energy' + suffix]),
    protein: num(n['proteins' + suffix]),
    carbs: num(n['carbohydrates' + suffix]),
    sugar: num(n['sugars' + suffix]),
    fat: num(n['fat' + suffix]),
    sat: num(n['saturated-fat' + suffix]),
    fibre: num(n['fiber' + suffix]),
    salt: num(n['salt' + suffix]),
  });
  const per100 = pick('_100g');
  const serving = pick('_serving');
  const hasServing = Object.values(serving).some(v => v !== null);
  return {
    code: String(p.code || ''),
    name: (p.product_name_en || p.product_name || p.generic_name || '').trim() || 'Unnamed product',
    brand: (p.brands || '').split(',')[0].trim(),
    image: p.image_front_url || p.image_front_small_url || '',
    thumb: p.image_front_small_url || p.image_front_url || '',
    quantity: p.quantity || '',
    servingSize: p.serving_size || '',
    liquid: isLiquid(p),
    n: per100,
    s: hasServing ? serving : null,
    ingredients: (p.ingredients_text_en || p.ingredients_text || '').trim(),
  };
}

export async function lookup(code) {
  code = String(code).trim();
  if (cache.has(code)) return cache.get(code);
  let res;
  try {
    res = await timeoutFetch(`${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  } catch {
    throw Object.assign(new Error('offline'), { kind: 'network' });
  }
  if (res.status === 404) return null;
  if (!res.ok) throw Object.assign(new Error('server'), { kind: 'server' });
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = normalize({ ...data.product, code: data.product.code || code });
  cache.set(code, p);
  return p;
}

export async function search(q) {
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS}`;
  let res;
  try {
    res = await timeoutFetch(url, 15000);
  } catch {
    throw Object.assign(new Error('offline'), { kind: 'network' });
  }
  if (!res.ok) throw Object.assign(new Error('server'), { kind: 'server' });
  const data = await res.json();
  return (data.products || []).filter(p => p.code).map(p => {
    const n = normalize(p);
    cache.set(n.code, n);
    return n;
  });
}

export const cached = code => cache.get(code) || db.foods.find(f => f.code === code) || null;

export function remember(p) {
  db.foods = [{ ...p, savedAt: Date.now() }, ...db.foods.filter(f => f.code !== p.code)].slice(0, 150);
  db.pending = db.pending.filter(c => c !== p.code);
  save();
}
export function forget(code) {
  db.foods = db.foods.filter(f => f.code !== code);
  save();
}
export function addPending(code) {
  if (!db.pending.includes(code)) { db.pending.unshift(code); save(); }
}

export const validBarcode = c => /^\d{8,14}$/.test(String(c).trim());

// ---------- composition indicator ----------
// Thresholds per 100 g / 100 ml, based on UK front-of-pack guidance.
const T_FOOD = { sugar: [5, 22.5], sat: [1.5, 5], salt: [0.3, 1.5], fat: [3, 17.5] };
const T_DRINK = { sugar: [2.5, 11.25], sat: [0.75, 2.5], salt: [0.3, 0.75], fat: [1.5, 8.75] };
const NAMES = { sugar: 'sugar', sat: 'saturated fat', salt: 'salt', fat: 'fat' };

export function rate(p) {
  const n = p.n || {};
  const T = p.liquid ? T_DRINK : T_FOOD;
  const u = p.liquid ? '100 ml' : '100 g';
  const keys = ['sugar', 'sat', 'salt', 'fat'];
  const missing = keys.filter(k => n[k] === null || n[k] === undefined);
  const known = ['sugar', 'sat', 'salt'].filter(k => n[k] !== null && n[k] !== undefined).length;
  if (known < 2) {
    return { level: 'unknown', label: 'Not enough data',
      reasons: ['Key nutrition values are missing for this product.'],
      incomplete: true, missing };
  }
  let score = 0, highs = 0;
  const pos = [], neg = [];
  for (const k of keys) {
    const v = n[k];
    if (v === null || v === undefined) continue;
    const [lo, hi] = T[k];
    const w = k === 'fat' ? 0.5 : 1;
    if (v > hi) {
      score += 2 * w; if (k !== 'fat') highs++;
      neg.push(`High in ${NAMES[k]} (${fmtN(v)} g / ${u})`);
    } else if (v > lo) {
      score += 1 * w;
      if (k !== 'fat') neg.push(`Medium ${NAMES[k]} (${fmtN(v)} g / ${u})`);
    } else if (k !== 'fat') {
      pos.push(`Low in ${NAMES[k]}`);
    }
  }
  if (n.fibre !== null && n.fibre !== undefined) {
    if (n.fibre >= 6) { score -= 1.5; pos.unshift(`High in fibre (${fmtN(n.fibre)} g)`); }
    else if (n.fibre >= 3) { score -= 0.75; pos.unshift(`Source of fibre (${fmtN(n.fibre)} g)`); }
  }
  if (!p.liquid && n.protein !== null && n.protein !== undefined) {
    if (n.protein >= 10) { score -= 1; pos.unshift(`Rich in protein (${fmtN(n.protein)} g)`); }
    else if (n.protein >= 5) { score -= 0.5; pos.unshift(`Contains protein (${fmtN(n.protein)} g)`); }
  }
  let level;
  if (highs >= 2 || score >= 4) level = 'red';
  else if (highs === 0 && score <= 1.25) level = 'green';
  else level = 'orange';
  const label = { green: 'Generally favorable composition', orange: 'Depends on product and portion', red: 'Less favorable composition' }[level];
  const reasons = level === 'green' ? [...pos, ...neg] : [...neg, ...pos];
  return { level, label, reasons: reasons.slice(0, 4), incomplete: missing.length > 0, missing };
}

export const fmtN = v => (v === null || v === undefined ? '–'
  : v >= 100 ? Math.round(v).toString()
  : v >= 10 ? (Math.round(v * 10) / 10).toString()
  : (Math.round(v * 100) / 100).toString());
