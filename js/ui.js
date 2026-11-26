import { db } from './store.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-5.5h4V20"/>',
  workout: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  exercises: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
  food: '<path d="M12 7.5c-1.4-1.1-3.4-1.4-5-.6-2.4 1.3-3 4.2-2.2 7.1.9 3.3 3.2 6.5 5.2 6.5.8 0 1.3-.4 2-.4s1.2.4 2 .4c2 0 4.3-3.2 5.2-6.5.8-2.9.2-5.8-2.2-7.1-1.6-.8-3.6-.5-5 .6Z"/><path d="M12 7.5c0-2 1-3.5 3-4"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1.5-3.8 4.5-5.5 8-5.5s6.5 1.7 8 5.5"/>',
  play: '<path d="M7.5 4.8v14.4L19 12z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none"/>',
  check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  scan: '<path d="M3.5 7.5v-3h3M17.5 4.5h3v3M20.5 16.5v3h-3M6.5 19.5h-3v-3"/><path d="M7.5 8.5v7M10.5 8.5v7M13.5 8.5v7M16.5 8.5v7"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"/>',
  heartFill: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" fill="currentColor"/>',
  bell: '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  chart: '<path d="M5 20v-8M10.5 20V5M16 20v-5M3 20.5h18"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.6-7.6.3 1.6 1.2 2.6 2.2 3 .2-2.9 1.6-5.6 4-7.2-.4 2.7.9 4.6 2.2 6.4 1 1.4 1.9 3 1.9 5.2 0 3.7-3.1 6.4-7.4 6.4Z"/>',
  quote: '<path d="M10 7H6.5A1.5 1.5 0 0 0 5 8.5v3A1.5 1.5 0 0 0 6.5 13H9v1c0 1.5-1 2.5-2.5 3M19 7h-3.5A1.5 1.5 0 0 0 14 8.5v3a1.5 1.5 0 0 0 1.5 1.5H18v1c0 1.5-1 2.5-2.5 3"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
  skip: '<path d="M5.5 5.5v13l9-6.5zM18.5 5.5v13"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5M12 8v4l3 2"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>',
  edit: '<path d="M4 20h4L19.3 8.7a2.1 2.1 0 0 0-3-3L5 17z"/>',
  appearance: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>',
  data: '<ellipse cx="12" cy="6" rx="7.5" ry="2.5"/><path d="M4.5 6v12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V6M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.5 5-3v9l-5-3"/>',
  bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4v5h-5"/>',
  shield: '<path d="M12 3.5 5 6v6c0 4.3 3 7.4 7 8.5 4-1.1 7-4.2 7-8.5V6z"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.1M9.5 10h.1M13 10h.1M16.5 10h1M6 14h12"/>',
  more: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

export const logoMark = `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
  <rect x="3" y="19" width="7" height="10" rx="1.6" fill="currentColor" opacity=".45"/>
  <rect x="12.5" y="12" width="7" height="17" rx="1.6" fill="currentColor" opacity=".75"/>
  <rect x="22" y="4" width="7" height="25" rx="1.6" fill="var(--accent)"/></svg>`;

export const logo = (size = 'md') =>
  `<div class="logo logo-${size}">${logoMark}<span>BUILD UP</span></div>`;

export const ACCENTS = {
  electric: { name: 'Electric', color: '#4C7DFF', ink: '#FFFFFF' },
  ice: { name: 'Ice', color: '#8FD3FF', ink: '#08131C' },
  violet: { name: 'Violet', color: '#9D7CFF', ink: '#FFFFFF' },
  mono: { name: 'Mono', color: '#F4F4F5', ink: '#0A0A0B' },
};

export function applyAppearance() {
  const a = ACCENTS[db.settings.accent] || ACCENTS.electric;
  const r = document.documentElement;
  r.style.setProperty('--accent', a.color);
  r.style.setProperty('--accent-ink', a.ink);
  r.classList.toggle('no-motion', db.settings.motion === false);
}

// ---------- dates & formatting ----------
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const weekdayIdx = (d = new Date()) => (new Date(d).getDay() + 6) % 7;
export const dayKey = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export function greeting(name) {
  const h = new Date().getHours();
  const part = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}.` : `${part}.`;
}

export function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
export const fmtMin = sec => {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};
export function fmtDate(ts, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Date(ts).toLocaleDateString('en-GB', opts);
}
export function relDay(ts) {
  const diff = Math.round((startOfDay() - startOfDay(ts)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return fmtDate(ts);
}

// ---------- components ----------
export function ring(pct, { size = 64, stroke = 6, label = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-bg"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-fg"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>
    <span>${label}</span></div>`;
}

export const backBar = (href, title = '', right = '') => `<header class="topbar">
  <a class="icon-btn" href="${href}" aria-label="Back">${icon('left')}</a>
  <h2 class="topbar-title">${esc(title)}</h2><div class="topbar-right">${right}</div></header>`;

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 2400);
}

export function sheet(html, { onMount, cls = '' } = {}) {
  const root = document.getElementById('overlay-root');
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = `<div class="sheet-backdrop"></div><div class="sheet ${cls}" role="dialog" aria-modal="true">
    <div class="sheet-grip"></div>${html}</div>`;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 280); };
  el.querySelector('.sheet-backdrop').addEventListener('click', close);
  el.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  onMount?.(el.querySelector('.sheet'), close);
  return close;
}

export function confirmDialog({ title, text = '', confirm = 'Confirm', cancel = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    let answered = false;
    const close = sheet(`<h3 class="sheet-title">${esc(title)}</h3>${text ? `<p class="muted">${esc(text)}</p>` : ''}
      <div class="stack-sm mt">
        <button class="btn btn-block ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(confirm)}</button>
        <button class="btn btn-block btn-ghost" data-no>${esc(cancel)}</button></div>`, {
      onMount(el) {
        el.querySelector('[data-yes]').onclick = () => { answered = true; resolve(true); close(); };
        el.querySelector('[data-no]').onclick = () => { answered = true; resolve(false); close(); };
        el.parentElement.querySelector('.sheet-backdrop').addEventListener('click', () => { if (!answered) resolve(false); });
      },
    });
  });
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
