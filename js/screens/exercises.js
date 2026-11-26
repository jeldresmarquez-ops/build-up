import { db, save } from '../store.js';
import { esc, icon, backBar } from '../ui.js';
import { EXERCISES, EX, AREAS, DIFFICULTY } from '../data/exercises.js';
import { records, unit } from '../logic/stats.js';
import { refresh } from '../router.js';

let filter = 'all';
let term = '';

const dots = n => `<span class="dots" aria-label="${DIFFICULTY[n]}">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}"></i>`).join('')}</span>`;

function matches(e) {
  if (filter === 'fav' && !db.favExercises.includes(e.id)) return false;
  if (filter !== 'all' && filter !== 'fav' && e.area !== filter) return false;
  if (!term) return true;
  const t = term.toLowerCase();
  return e.name.toLowerCase().includes(t) || e.muscles.some(m => m.toLowerCase().includes(t)) || AREAS[e.area].toLowerCase().includes(t);
}

function listHtml() {
  const list = EXERCISES.filter(matches);
  if (!list.length) {
    return `<div class="empty">${icon('search')}<b>${filter === 'fav' && !term ? 'No favourites yet' : 'No exercises found'}</b>
      ${filter === 'fav' && !term ? 'Tap the heart on any exercise to save it here.' : 'Try a different search.'}</div>`;
  }
  return `<div class="card list-card">${list.map(e => `<a class="row" href="#/exercises/${e.id}">
    <div class="row-icon">${icon(e.area === 'cardio' ? 'bolt' : e.area === 'core' ? 'target' : 'workout')}</div>
    <div class="grow"><div class="row-title">${e.name}${db.favExercises.includes(e.id) ? ` <span class="dim">${icon('heartFill', 'ic-sm')}</span>` : ''}</div>
    <div class="row-sub">${e.muscles.slice(0, 3).join(', ')}</div></div>
    ${dots(e.difficulty)}${icon('right', 'chev')}</a>`).join('')}</div>`;
}

export function list() {
  const chips = [['all', 'All'], ...Object.entries(AREAS), ['fav', 'Favourites']];
  return {
    html: `<h1 class="h1">Exercises</h1>
      <label class="search">${icon('search')}<input class="input" type="search" id="ex-q" placeholder="Search exercise or muscle" value="${esc(term)}" autocomplete="off"></label>
      <div class="chips scroll">${chips.map(([id, n]) => `<button class="chip ${filter === id ? 'on' : ''}" data-f="${id}">${n}</button>`).join('')}</div>
      <div id="ex-list">${listHtml()}</div>`,
    mount(view) {
      const out = view.querySelector('#ex-list');
      view.querySelector('#ex-q').addEventListener('input', e => { term = e.target.value.trim(); out.innerHTML = listHtml(); });
      view.addEventListener('click', e => {
        const c = e.target.closest('[data-f]');
        if (!c) return;
        filter = c.dataset.f;
        view.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === c));
        out.innerHTML = listHtml();
      });
    },
  };
}

function media(e) {
  if (e.video) {
    return `<div class="media"><video src="${esc(e.video)}" autoplay muted loop playsinline preload="metadata"
      onerror="this.parentElement.innerHTML='<div class=media-ph><b>Video unavailable</b>The file could not be loaded.</div>'"></video></div>`;
  }
  return `<div class="media"><div class="media-pulse"></div><div class="media-ph" style="position:relative">${icon('video')}
    <b>Video demonstration coming soon</b>Follow the technique steps below.</div></div>`;
}

export function detail({ id }) {
  const e = EX[id];
  if (!e) return { html: `${backBar('#/exercises', 'Exercise')}<div class="empty"><b>Exercise not found</b></div>` };
  const fav = db.favExercises.includes(e.id);
  const rec = records().find(r => r.exId === e.id);
  const lv = { beginner: 'b', intermediate: 'i', advanced: 'a' }[db.profile.experience] || 'b';
  const amt = ([s, n]) => `${s} × ${e.type === 'time' ? n + 's' : n}`;
  return {
    html: `${backBar('#/exercises', '', `<button class="icon-btn ${fav ? 'on' : ''}" data-fav aria-label="Favourite">${icon(fav ? 'heartFill' : 'heart')}</button>`)}
      ${media(e)}
      <div><div class="row-flex" style="gap:8px"><span class="tag">${AREAS[e.area]}</span><span class="tag">${DIFFICULTY[e.difficulty]}</span>${e.perSide ? '<span class="tag">Each side</span>' : ''}</div>
        <h1 class="h1 mt">${e.name}</h1><p class="muted mt-sm">${esc(e.desc)}</p></div>
      <div><p class="eyebrow">Muscles</p><div class="chips mt-sm">${e.muscles.map(m => `<span class="tag" style="height:32px;padding:0 12px">${m}</span>`).join('')}</div></div>
      <div><p class="eyebrow">Suggested ${e.type === 'time' ? 'duration' : 'repetitions'}</p>
        <div class="dose mt-sm">${[['b', 'Beginner'], ['i', 'Intermediate'], ['a', 'Advanced']].map(([k, n]) => `<div style="${k === lv ? 'border-color:var(--text)' : ''}">
          <div class="num">${amt(e.dose[k])}</div><div class="tiny muted">${n}</div></div>`).join('')}</div>
        <p class="note mt-sm">Rest about ${e.rest} seconds between sets.${e.perSide ? ' Values are per side.' : ''}</p></div>
      ${rec ? `<div class="card card-tight row-flex"><div class="row-icon">${icon('star')}</div><div class="grow"><p class="tiny muted">Your best set</p>
        <p class="row-title">${unit(e.id, rec.best)}${rec.best > rec.first ? ` <span class="muted small">· up from ${unit(e.id, rec.first)}</span>` : ''}</p></div></div>` : ''}
      <div><p class="eyebrow">Technique</p><ol class="steps mt-sm">${e.technique.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>
      <div><p class="eyebrow">Common mistakes</p><ul class="bullets warn mt-sm">${e.mistakes.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div><p class="eyebrow">Safety tips</p><ul class="bullets safe mt-sm">${e.safety.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`,
    mount(view) {
      view.querySelector('[data-fav]').addEventListener('click', () => {
        db.favExercises = fav ? db.favExercises.filter(x => x !== e.id) : [...db.favExercises, e.id];
        save(); refresh();
      });
    },
  };
}
