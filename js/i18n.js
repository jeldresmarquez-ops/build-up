// Language support: English / Deutsch.
// L('English text', 'Deutscher Text', { vars }) – picks the active language.
import { db, save } from './store.js';

function detect() {
  const s = db.settings.lang;
  if (s === 'de' || s === 'en') return s;
  return (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
}

export const lang = detect();
export const locale = lang === 'de' ? 'de-DE' : 'en-GB';
document.documentElement.lang = lang;

export function L(en, de, vars) {
  let s = lang === 'de' && de != null ? de : en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

export function setLang(l) {
  db.settings.lang = l;
  save();
  location.reload();
}
