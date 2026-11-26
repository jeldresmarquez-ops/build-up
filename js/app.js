import { db } from './store.js';
import { icon, applyAppearance } from './ui.js';
import { L } from './i18n.js';
import { setRenderer, currentPath } from './router.js';
import * as story from './screens/story.js';
import * as onboarding from './screens/onboarding.js';
import * as startup from './screens/startup.js';
import * as home from './screens/home.js';
import * as workout from './screens/workout.js';
import * as session from './screens/session.js';
import * as exercises from './screens/exercises.js';
import * as food from './screens/food.js';
import * as progress from './screens/progress.js';
import * as motivation from './screens/motivation.js';
import * as profile from './screens/profile.js';
import * as settings from './screens/settings.js';
import { startLoop } from './logic/reminders.js';

const routes = [
  ['home', home.render, 'home'],
  ['workout', workout.render, 'workout'],
  ['workout/c/:id', workout.preview, 'workout'],
  ['workout/done/:id', session.summary, 'workout'],
  ['session', session.render, null],
  ['progress', progress.render, 'workout'],
  ['history', progress.history, 'workout'],
  ['exercises', exercises.list, 'exercises'],
  ['exercises/:id', exercises.detail, 'exercises'],
  ['food', food.render, 'food'],
  ['food/p/:code', food.product, 'food'],
  ['profile', profile.render, 'profile'],
  ['profile/edit', profile.edit, 'profile'],
  ['motivation', motivation.render, 'profile'],
  ['settings/:page', settings.render, 'profile'],
];

const TABS = [
  ['home', 'home', L('Home', 'Start')],
  ['workout', 'workout', L('Workout', 'Training')],
  ['exercises', 'exercises', L('Exercises', 'Übungen')],
  ['food', 'food', 'Food'],
  ['profile', 'profile', L('Profile', 'Profil')],
];

function match(path) {
  const b = path.split('/');
  for (const [pat, fn, tab] of routes) {
    const a = pat.split('/');
    if (a.length !== b.length) continue;
    const params = {};
    let ok = true;
    a.forEach((s, i) => {
      if (s.startsWith(':')) params[s.slice(1)] = decodeURIComponent(b[i]);
      else if (s !== b[i]) ok = false;
    });
    if (ok) return { fn, tab, params };
  }
  return null;
}

let cleanup = null;

function render({ soft = false } = {}) {
  const [path, qs = ''] = currentPath().split('?');
  const m = match(path) || match('home');
  try { cleanup?.(); } catch { /* ignore */ }
  cleanup = null;
  const y = window.scrollY;

  let res;
  try {
    res = m.fn(m.params, new URLSearchParams(qs)) || { html: '' };
  } catch (err) {
    console.error(err);
    res = { html: `<div class="empty mt-lg"><b>${L('Something went wrong', 'Etwas ist schiefgelaufen')}</b>${L('This screen could not be shown.', 'Diese Seite konnte nicht angezeigt werden.')}</div><a class="btn btn-primary btn-block" href="#/home">${L('Back to home', 'Zurück zum Start')}</a>` };
  }

  const old = document.getElementById('view');
  const view = document.createElement('main');
  view.id = 'view';
  view.className = 'view' + (res.noNav ? ' no-nav bare' : '') + (soft ? '' : ' enter');
  view.innerHTML = res.html;
  old.replaceWith(view);

  document.getElementById('tabbar').classList.toggle('hidden', !!res.noNav);
  document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === m.tab));
  window.scrollTo(0, soft ? y : 0);

  try {
    const c = res.mount?.(view);
    if (typeof c === 'function') cleanup = c;
  } catch (err) { console.error(err); }
}

function startShell() {
  const app = document.getElementById('app');
  app.innerHTML = `<main id="view" class="view"></main>
    <nav class="tabbar" id="tabbar" aria-label="Main">${TABS.map(([r, ic, l]) => `<a href="#/${r}" data-tab="${r}">${icon(ic)}<span>${l}</span></a>`).join('')}</nav>`;
  setRenderer(render);
  window.addEventListener('hashchange', () => render());
  render();
  startLoop();
}

// Android / Chrome: keep the install prompt so the Profile page can offer one-tap install.
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  window.__bpInstall = e;
  document.dispatchEvent(new Event('bp-installable'));
});
window.addEventListener('appinstalled', () => { window.__bpInstall = null; });

function boot() {
  applyAppearance();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(reg => reg.update()).catch(() => { /* offline support unavailable */ });
    // When a new version takes over, reload once so the phone shows it right away.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
    });
  }
  if (!db.storySeen) {
    story.show(() => onboarding.show(() => { location.hash = '#/home'; startShell(); }));
  } else if (!db.onboarded) {
    onboarding.show(() => { location.hash = '#/home'; startShell(); });
  } else {
    startShell();
    startup.show();
  }
}

boot();
