import { db } from '../store.js';
import { esc, icon, logo, greeting, ring, fmtMin, relDay, DAYS_LONG, weekdayIdx, fmtDate } from '../ui.js';
import { todayRecommendation, buildWorkout, CAT, nextPlanned } from '../logic/plan.js';
import { weekCount, weekStreak, totals } from '../logic/stats.js';
import { dailyQuote } from '../logic/quotes.js';
import { nextReminder, dueToday } from '../logic/reminders.js';
import { EX } from '../data/exercises.js';
import { startSession } from '../logic/session.js';
import { go } from '../router.js';

function todayCard() {
  if (db.session) {
    const s = db.session;
    return `<div class="card hero">
      <div><p class="eyebrow">In progress</p><h2 class="h1 mt-sm">${esc(s.name)}</h2>
        <div class="hero-meta"><span>${icon('workout')}${EX[s.items[s.ex].exId].name}</span><span>Exercise ${s.ex + 1} of ${s.items.length}</span></div></div>
      <a class="btn btn-primary btn-block mt" href="#/session">${icon('play', 'ic-sm')} Continue workout</a></div>`;
  }
  const r = todayRecommendation();
  if (r.kind === 'done') {
    return `<div class="card hero">
      <div><p class="eyebrow">Today</p><h2 class="h1 mt-sm">Done.<br>Well built.</h2>
      <div class="hero-meta"><span>${icon('check')}${esc(r.entry.name)}</span><span>${icon('clock')}${fmtMin(r.entry.dur)}</span></div></div>
      <p class="muted small mt">Recovery starts now. Eat well, sleep well.</p></div>`;
  }
  const w = buildWorkout(r.cat, db.profile, r.minutes);
  const label = r.kind === 'rest' ? 'Rest day' : r.kind === 'recover' ? 'Recovery' : 'Today’s workout';
  const title = r.kind === 'rest' ? 'Rest &amp;<br>recover' : esc(w.name);
  return `<div class="card hero">
    <div><p class="eyebrow">${label}</p><h2 class="h1 mt-sm">${title}</h2>
      ${r.kind === 'rest'
        ? `<p class="muted small mt-sm">${esc(r.note)}</p><div class="hero-meta"><span>Optional: ${esc(w.name)} · ${fmtMin(w.seconds)}</span></div>`
        : `<div class="hero-meta"><span>${icon('clock')}${fmtMin(w.seconds)}</span><span>${icon('workout')}${w.items.length} exercises</span><span>${icon('bolt')}${w.level[0].toUpperCase() + w.level.slice(1)}</span></div>
           ${r.note ? `<p class="muted small mt-sm">${esc(r.note)}</p>` : ''}`}
    </div>
    <div class="row-flex mt">
      ${r.kind === 'rest'
        ? `<a class="btn btn-outline grow" href="#/workout/c/${w.cat}?m=${r.minutes}">Light session</a>`
        : `<button class="btn btn-primary grow" data-start="${w.cat}" data-min="${r.minutes}">${icon('play', 'ic-sm')} Start workout</button>
           <a class="btn btn-ghost" href="#/workout/c/${w.cat}?m=${r.minutes}" aria-label="Workout details">Details</a>`}
    </div></div>`;
}

export function render() {
  const p = db.profile;
  const target = Math.max(1, db.planDays.length);
  const wk = weekCount(0);
  const last = db.history[db.history.length - 1];
  const q = dailyQuote();
  const rem = nextReminder();
  const due = dueToday();
  const np = nextPlanned(true);
  const t = totals();

  const html = `
    <div class="app-head">${logo('sm')}<a class="avatar" href="#/profile" aria-label="Profile">${esc((p.name || 'A')[0].toUpperCase())}</a></div>
    <div><p class="eyebrow">${fmtDate(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1 class="greet mt-sm">${esc(greeting(p.name))}</h1></div>
    ${due && due > new Date() ? `<a class="callout" href="#/settings/reminders">${icon('bell')}<span>Training today at <b>${due.toTimeString().slice(0, 5)}</b>. Time to work on yourself.</span></a>` : ''}
    ${todayCard()}
    <div class="grid2">
      <a class="card tile" href="#/exercises">${icon('exercises')}<div><div class="tile-title">Exercise library</div><div class="tile-sub">${Object.keys(EX).length} exercises</div></div></a>
      <a class="card tile" href="#/food">${icon('scan')}<div><div class="tile-title">Food scanner</div><div class="tile-sub">Scan a barcode</div></div></a>
    </div>
    <a class="card" href="#/progress">
      <div class="between"><div><p class="eyebrow">This week</p>
        <p class="h2 mt-sm">${wk} of ${target} workouts</p>
        <p class="muted small mt-sm">${weekStreak()} week streak · ${t.sessions} total</p></div>
        ${ring(wk / target, { size: 72, stroke: 6, label: `${Math.round(Math.min(1, wk / target) * 100)}%` })}</div></a>
    ${last ? `<a class="card card-tight row-flex" href="#/history">
        <div class="row-icon">${icon('history')}</div>
        <div class="grow"><p class="tiny muted">Last workout · ${relDay(last.start)}</p><p class="row-title">${esc(last.name)}</p></div>
        <span class="muted small">${fmtMin(last.dur)}</span></a>` : ''}
    <a class="card quote-card" href="#/motivation"><p class="eyebrow">Daily motivation</p><p>${esc(q.text)}</p></a>
    <a class="card card-tight row-flex" href="#/settings/reminders">
      <div class="row-icon">${icon('bell')}</div>
      <div class="grow"><p class="tiny muted">Next training reminder</p>
        <p class="row-title">${rem ? `${DAYS_LONG[weekdayIdx(rem)]} · ${rem.toTimeString().slice(0, 5)}` : np ? `Reminders off · next session ${DAYS_LONG[weekdayIdx(np)]}` : 'Set up reminders'}</p></div>
      ${icon('right', 'chev')}</a>`;

  return {
    html,
    mount(view) {
      view.addEventListener('click', e => {
        const b = e.target.closest('[data-start]');
        if (!b) return;
        startSession(buildWorkout(b.dataset.start, db.profile, Number(b.dataset.min) || undefined));
        go('session');
      });
    },
  };
}
