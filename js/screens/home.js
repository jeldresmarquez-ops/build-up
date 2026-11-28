import { db } from '../store.js';
import { esc, icon, logo, greeting, ring, fmtMin, relDay, DAYS_LONG, weekdayIdx, fmtDate } from '../ui.js';
import { L } from '../i18n.js';
import { todayRecommendation, buildWorkout, nextPlanned, nameOf, activeSick, sickDaysLeft } from '../logic/plan.js';
import { weekCount, weekStreak, totals } from '../logic/stats.js';
import { dailyQuote } from '../logic/quotes.js';
import { nextReminder, dueToday } from '../logic/reminders.js';
import { EX } from '../data/exercises.js';
import { EXPERIENCE, label } from '../data/options.js';
import { startSession } from '../logic/session.js';
import { go, refresh } from '../router.js';
import { confirmEndSick } from './sick.js';

function todayCard() {
  if (db.session) {
    const s = db.session;
    return `<div class="card hero">
      <div><p class="eyebrow">${L('In progress', 'Läuft gerade')}</p><h2 class="h1 mt-sm">${esc(nameOf(s))}</h2>
        <div class="hero-meta"><span>${icon('workout')}${EX[s.items[s.ex].exId].name}</span><span>${L('Exercise {a} of {b}', 'Übung {a} von {b}', { a: s.ex + 1, b: s.items.length })}</span></div></div>
      <a class="btn btn-primary btn-block mt" href="#/session">${icon('play', 'ic-sm')} ${L('Continue workout', 'Training fortsetzen')}</a></div>`;
  }
  const r = todayRecommendation();
  if (r.kind === 'done') {
    return `<div class="card hero">
      <div><p class="eyebrow">${L('Today', 'Heute')}</p><h2 class="h1 mt-sm">${L('Done.<br>Well built.', 'Geschafft.<br>Stark gebaut.')}</h2>
      <div class="hero-meta"><span>${icon('check')}${esc(nameOf(r.entry))}</span><span>${icon('clock')}${fmtMin(r.entry.dur)}</span></div></div>
      <p class="muted small mt">${L('Recovery starts now. Eat well, sleep well.', 'Jetzt beginnt die Erholung. Gut essen, gut schlafen.')}</p></div>`;
  }
  if (r.kind === 'sickrest') {
    return `<div class="card hero">
      <div><p class="eyebrow">${L('Sick mode', 'Krank-Modus')}</p><h2 class="h1 mt-sm">${L('Rest &amp;<br>get well', 'Ruhe &amp;<br>gesund werden')}</h2>
      <p class="muted small mt-sm">${esc(r.note)}</p></div>
      <div class="row-flex mt"><a class="btn btn-ghost grow" href="#/sick">${L('Open', 'Öffnen')}</a>
        <button class="btn btn-outline grow" data-end-sick>${L('End sick mode', 'Krank-Modus beenden')}</button></div></div>`;
  }
  const w = buildWorkout(r.cat, db.profile, r.minutes);
  const lbl = r.kind === 'sick' ? L('Sick mode', 'Krank-Modus') : r.kind === 'rest' ? L('Rest day', 'Ruhetag') : r.kind === 'recover' ? L('Recovery', 'Erholung') : L('Today’s workout', 'Heutiges Training');
  const title = r.kind === 'rest' ? L('Rest &amp;<br>recover', 'Ruhen &amp;<br>erholen') : esc(w.name);
  return `<div class="card hero">
    <div><p class="eyebrow">${lbl}</p><h2 class="h1 mt-sm">${title}</h2>
      ${r.kind === 'rest'
        ? `<p class="muted small mt-sm">${esc(r.note)}</p><div class="hero-meta"><span>${L('Optional', 'Optional')}: ${esc(w.name)} · ${fmtMin(w.seconds)}</span></div>`
        : `<div class="hero-meta"><span>${icon('clock')}${fmtMin(w.seconds)}</span><span>${icon('workout')}${L('{n} exercises', '{n} Übungen', { n: w.items.length })}</span><span>${icon('bolt')}${label(EXPERIENCE, w.level)}</span></div>
           ${r.note ? `<p class="muted small mt-sm">${esc(r.note)}</p>` : ''}`}
    </div>
    <div class="row-flex mt">
      ${r.kind === 'rest'
        ? `<a class="btn btn-outline grow" href="#/workout/c/${w.cat}?m=${r.minutes}">${L('Light session', 'Lockere Einheit')}</a>`
        : `<button class="btn btn-primary grow" data-start="${w.cat}" data-min="${r.minutes}">${icon('play', 'ic-sm')} ${L('Start workout', 'Training starten')}</button>
           <a class="btn btn-ghost" href="#/workout/c/${w.cat}?m=${r.minutes}">${L('Details', 'Details')}</a>`}
    </div></div>`;
}

function sickRow() {
  const s = activeSick();
  if (s) {
    const n = sickDaysLeft();
    return `<div class="card card-tight row-flex" style="border-color:var(--accent)">
      <a class="row-flex grow" href="#/sick" style="min-width:0"><div class="row-icon">${icon('shield')}</div>
      <div class="grow"><p class="tiny muted">${L('Sick mode active', 'Krank-Modus aktiv')}</p>
        <p class="row-title">${n ? L('{n} days left', 'Noch {n} Tage', { n }) : L('Feeling better?', 'Geht’s dir besser?')}</p></div></a>
      <button class="btn btn-ghost btn-sm" data-end-sick>${L('End', 'Beenden')}</button></div>`;
  }
  return `<a class="card card-tight row-flex" href="#/sick">
    <div class="row-icon">${icon('shield')}</div>
    <div class="grow"><p class="row-title">${L('Feeling sick?', 'Krank?')}</p><p class="row-sub">${L('Get an easy plan for 2 training days', 'Einfacher Plan für 2 Trainingstage')}</p></div>
    ${icon('right', 'chev')}</a>`;
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
    <div class="app-head">${logo('sm')}<a class="avatar" href="#/profile" aria-label="${L('Profile', 'Profil')}">${esc((p.name || 'A')[0].toUpperCase())}</a></div>
    <div><p class="eyebrow">${fmtDate(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1 class="greet mt-sm">${esc(greeting(p.name))}</h1></div>
    ${due && due > new Date() ? `<a class="callout" href="#/settings/reminders">${icon('bell')}<span>${L('Training today at <b>{t}</b>. Time to work on yourself.', 'Heute Training um <b>{t}</b>. Zeit, an dir zu arbeiten.', { t: due.toTimeString().slice(0, 5) })}</span></a>` : ''}
    ${todayCard()}
    ${sickRow()}
    <div class="grid2">
      <a class="card tile" href="#/exercises">${icon('exercises')}<div><div class="tile-title">${L('Exercise library', 'Übungen')}</div><div class="tile-sub">${L('{n} exercises', '{n} Übungen', { n: Object.keys(EX).length })}</div></div></a>
      <a class="card tile" href="#/food">${icon('scan')}<div><div class="tile-title">${L('Food scanner', 'Food-Scanner')}</div><div class="tile-sub">${L('Scan a barcode', 'Barcode scannen')}</div></div></a>
    </div>
    <a class="card between" href="#/progress">
      <div><p class="eyebrow">${L('This week', 'Diese Woche')}</p>
        <p class="h2 mt-sm">${L('{a} of {b} workouts', '{a} von {b} Trainings', { a: wk, b: target })}</p>
        <p class="muted small mt-sm">${L('{s} week streak · {t} total', '{s} Wochen in Folge · {t} gesamt', { s: weekStreak(), t: t.sessions })}</p></div>
      ${ring(wk / target, { size: 72, stroke: 6, label: `${Math.round(Math.min(1, wk / target) * 100)}%` })}</a>
    ${last ? `<a class="card card-tight row-flex" href="#/history">
        <div class="row-icon">${icon('history')}</div>
        <div class="grow"><p class="tiny muted">${L('Last workout', 'Letztes Training')} · ${relDay(last.start)}</p><p class="row-title">${esc(nameOf(last))}</p></div>
        <span class="muted small">${fmtMin(last.dur)}</span></a>` : ''}
    <a class="card quote-card" href="#/motivation"><p class="eyebrow">${L('Daily motivation', 'Tägliche Motivation')}</p><p>${esc(q.text)}</p></a>
    <a class="card card-tight row-flex" href="#/settings/reminders">
      <div class="row-icon">${icon('bell')}</div>
      <div class="grow"><p class="tiny muted">${L('Next training reminder', 'Nächste Trainings-Erinnerung')}</p>
        <p class="row-title">${rem ? `${DAYS_LONG[weekdayIdx(rem)]} · ${rem.toTimeString().slice(0, 5)}`
          : np ? L('Reminders off · next session {d}', 'Erinnerungen aus · nächstes Training {d}', { d: DAYS_LONG[weekdayIdx(np)] })
          : L('Set up reminders', 'Erinnerungen einrichten')}</p></div>
      ${icon('right', 'chev')}</a>`;

  return {
    html,
    mount(view) {
      view.addEventListener('click', async e => {
        if (e.target.closest('[data-end-sick]')) { if (await confirmEndSick()) refresh(); return; }
        const b = e.target.closest('[data-start]');
        if (!b) return;
        startSession(buildWorkout(b.dataset.start, db.profile, Number(b.dataset.min) || undefined));
        go('session');
      });
    },
  };
}
