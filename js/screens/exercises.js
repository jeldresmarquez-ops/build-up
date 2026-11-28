import { db, save } from '../store.js';
import { esc, icon, backBar } from '../ui.js';
import { L } from '../i18n.js';
import { EXERCISES, EX, AREAS, DIFFICULTY } from '../data/exercises.js';
import { EXPERIENCE } from '../data/options.js';
import { records, unit } from '../logic/stats.js';
import { refresh } from '../router.js';
import { figureSvg, animateFigures } from '../figure.js';
import { bonusFor } from '../logic/progression.js';

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
    const favEmpty = filter === 'fav' && !term;
    return `<div class="empty">${icon('search')}<b>${favEmpty ? L('No favourites yet', 'Noch keine Favoriten') : L('No exercises found', 'Keine Übungen gefunden')}</b>
      ${favEmpty ? L('Tap the heart on any exercise to save it here.', 'Tippe bei einer Übung auf das Herz, um sie hier zu speichern.') : L('Try a different search.', 'Versuche einen anderen Suchbegriff.')}</div>`;
  }
  return `<div class="card list-card">${list.map(e => `<a class="row" href="#/exercises/${e.id}">
    <div class="row-icon">${icon(e.area === 'cardio' ? 'bolt' : e.area === 'core' ? 'target' : 'workout')}</div>
    <div class="grow"><div class="row-title">${e.name}${db.favExercises.includes(e.id) ? ` <span class="dim">${icon('heartFill', 'ic-sm')}</span>` : ''}</div>
    <div class="row-sub">${e.muscles.slice(0, 3).join(', ')}</div></div>
    ${dots(e.difficulty)}${icon('right', 'chev')}</a>`).join('')}</div>`;
}

export function list() {
  const chips = [['all', L('All', 'Alle')], ...Object.entries(AREAS), ['fav', L('Favourites', 'Favoriten')]];
  return {
    html: `<h1 class="h1">${L('Exercises', 'Übungen')}</h1>
      <label class="search">${icon('search')}<input class="input" type="search" id="ex-q" placeholder="${L('Search exercise or muscle', 'Übung oder Muskel suchen')}" value="${esc(term)}" autocomplete="off"></label>
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
      onerror="this.parentElement.innerHTML='<div class=media-ph><b>${L('Video unavailable', 'Video nicht verfügbar')}</b></div>'"></video></div>`;
  }
  return `<div class="media">${figureSvg(e.id)}<span class="media-tag">${L('Animation', 'Animation')}</span></div>`;
}

export function detail({ id }) {
  const e = EX[id];
  if (!e) return { html: `${backBar('#/exercises', '')}<div class="empty"><b>${L('Exercise not found', 'Übung nicht gefunden')}</b></div>` };
  const fav = db.favExercises.includes(e.id);
  const rec = records().find(r => r.exId === e.id);
  const lv = { beginner: 'b', intermediate: 'i', advanced: 'a' }[db.profile.experience] || 'b';
  const amt = ([s, n]) => `${s} × ${e.type === 'time' ? n + 's' : n}`;
  const levels = [['b', EXPERIENCE[0][1]], ['i', EXPERIENCE[1][1]], ['a', EXPERIENCE[2][1]]];
  return {
    html: `${backBar('#/exercises', '', `<button class="icon-btn ${fav ? 'on' : ''}" data-fav aria-label="${L('Favourite', 'Favorit')}">${icon(fav ? 'heartFill' : 'heart')}</button>`)}
      ${media(e)}
      <div><div class="row-flex" style="gap:8px;flex-wrap:wrap"><span class="tag">${AREAS[e.area]}</span><span class="tag">${DIFFICULTY[e.difficulty]}</span>${e.perSide ? `<span class="tag">${L('Each side', 'Pro Seite')}</span>` : ''}</div>
        <h1 class="h1 mt">${e.name}</h1><p class="muted mt-sm">${esc(e.desc)}</p></div>
      <div><p class="eyebrow">${L('Muscles', 'Muskeln')}</p><div class="chips mt-sm">${e.muscles.map(m => `<span class="tag tag-muscle" style="height:32px;padding:0 12px"><i></i>${m}</span>`).join('')}</div></div>
      <div><p class="eyebrow">${e.type === 'time' ? L('Suggested duration', 'Empfohlene Dauer') : L('Suggested repetitions', 'Empfohlene Wiederholungen')}</p>
        <div class="dose mt-sm">${levels.map(([k, n]) => `<div style="${k === lv ? 'border-color:var(--text)' : ''}">
          <div class="num">${amt(e.dose[k])}</div><div class="tiny muted">${n}</div></div>`).join('')}</div>
        <p class="note mt-sm">${L('Rest about {n} seconds between sets.', 'Etwa {n} Sekunden Pause zwischen den Sätzen.', { n: e.rest })}${e.perSide ? ' ' + L('Values are per side.', 'Werte gelten pro Seite.') : ''}</p></div>
      ${bonusFor(e.id) ? `<div class="card card-tight row-flex" style="border-color:var(--accent)"><div class="row-icon">${icon('chart')}</div><div class="grow"><p class="tiny muted">${L('Your current goal', 'Dein aktuelles Ziel')}</p>
        <p class="row-title">${amt([e.dose[lv][0], e.dose[lv][1] + bonusFor(e.id)])} <span class="muted small">· +${bonusFor(e.id)}${e.type === 'time' ? 's' : ''} ${L('from your progress', 'durch deine Steigerung')}</span></p></div></div>` : ''}
      ${rec ? `<div class="card card-tight row-flex"><div class="row-icon">${icon('star')}</div><div class="grow"><p class="tiny muted">${L('Your best set', 'Dein bester Satz')}</p>
        <p class="row-title">${unit(e.id, rec.best)}${rec.best > rec.first ? ` <span class="muted small">· ${L('up from {v}', 'vorher {v}', { v: unit(e.id, rec.first) })}</span>` : ''}</p></div></div>` : ''}
      <div><p class="eyebrow">${L('Technique', 'Technik')}</p><ol class="steps mt-sm">${e.technique.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>
      <div><p class="eyebrow">${L('Common mistakes', 'Häufige Fehler')}</p><ul class="bullets warn mt-sm">${e.mistakes.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div><p class="eyebrow">${L('Safety tips', 'Sicherheitstipps')}</p><ul class="bullets safe mt-sm">${e.safety.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`,
    mount(view) {
      animateFigures(view);
      view.querySelector('[data-fav]').addEventListener('click', () => {
        db.favExercises = fav ? db.favExercises.filter(x => x !== e.id) : [...db.favExercises, e.id];
        save(); refresh();
      });
    },
  };
}
