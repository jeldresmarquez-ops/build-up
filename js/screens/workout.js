import { db, save } from '../store.js';
import { esc, icon, DAYS, DAYS_LONG, fmtMin, fmtDate, backBar, sheet, toast, confirmDialog } from '../ui.js';
import { L } from '../i18n.js';
import { CATEGORIES, CAT, buildWorkout, weekPlan, nameOf, activeSick } from '../logic/plan.js';
import { startSession, logManual, deleteEntry } from '../logic/session.js';
import { MINUTES, EXPERIENCE, label } from '../data/options.js';
import { EX } from '../data/exercises.js';
import { go, refresh } from '../router.js';
import { confirmEndSick } from './sick.js';

let weekOffset = 0;

const doseText = it => {
  const e = EX[it.exId];
  const amount = e.type === 'time' ? `${it.target}s` : `${it.target} ${L('reps', 'Wdh.')}`;
  const normal = it.normal ? ` · ${L('normally', 'sonst')} ${it.normal[0]} × ${e.type === 'time' ? it.normal[1] + 's' : it.normal[1]}` : '';
  return `${it.sets} × ${amount}${e.perSide ? ' ' + L('each side', 'pro Seite') : ''}${normal}`;
};

function weekStrip(plan) {
  return `<div class="week">${plan.map(d => {
    const done = d.entries.length > 0;
    const cls = [done ? 'done' : '', d.planned ? 'planned' : '', d.isToday ? 'today' : '', d.planned && d.past && !done ? 'missed' : ''].join(' ');
    return `<button class="wday ${cls}" data-day="${d.idx}" aria-label="${DAYS_LONG[d.idx]}">
      ${DAYS[d.idx].slice(0, 2)}<b>${done ? icon('check') : d.date.getDate()}</b></button>`;
  }).join('')}</div>`;
}

function weekTitle() {
  if (weekOffset === 0) return L('This week', 'Diese Woche');
  if (weekOffset > 0) return L('Next week', 'Nächste Woche');
  const n = -weekOffset;
  return n === 1 ? L('1 week ago', 'Vor 1 Woche') : L('{n} weeks ago', 'Vor {n} Wochen', { n });
}

export function render() {
  const plan = weekPlan(weekOffset);
  const s = db.session;
  const html = `
    <h1 class="h1">${L('Workout', 'Training')}</h1>
    ${s ? `<a class="card card-tight row-flex" href="#/session" style="border-color:var(--accent)">
        <div class="row-icon" style="background:var(--accent);color:var(--accent-ink)">${icon('play')}</div>
        <div class="grow"><p class="tiny muted">${L('In progress', 'Läuft gerade')}</p><p class="row-title">${esc(nameOf(s))}</p></div>${icon('right', 'chev')}</a>` : ''}
    <div>
      <div class="section-title" style="margin-top:6px"><h3 class="h3">${weekTitle()}</h3>
        <div class="row-flex" style="gap:0">
          <button class="icon-btn" data-week="-1" aria-label="${L('Previous week', 'Vorherige Woche')}">${icon('left', 'ic-sm')}</button>
          <button class="icon-btn" data-week="1" aria-label="${L('Next week', 'Nächste Woche')}" ${weekOffset >= 1 ? 'disabled style="opacity:.3"' : ''}>${icon('right', 'ic-sm')}</button></div></div>
      <div class="card" style="padding:10px">${weekStrip(plan)}</div>
      <div class="card list-card mt-sm">${plan.filter(d => d.planned || d.entries.length).map(d => {
        const e = d.entries[d.entries.length - 1];
        return `<button class="row" data-day="${d.idx}">
          <div class="row-icon">${e ? icon('check') : icon('workout')}</div>
          <div class="grow"><div class="row-title">${esc(e ? nameOf(e) : CAT[d.cat].name)}</div>
          <div class="row-sub wrap">${DAYS_LONG[d.idx]}${d.isToday ? ' · ' + L('Today', 'Heute') : ''}${e ? ` · ${fmtMin(e.dur)}` : d.past ? ' · ' + L('Missed – that’s okay', 'Verpasst – das ist okay') : ''}</div></div>
          ${icon('right', 'chev')}</button>`;
      }).join('') || `<p class="muted small" style="padding:14px 0">${L('No sessions this week.', 'Keine Trainings in dieser Woche.')}</p>`}</div>
    </div>
    ${activeSick() ? `<div class="card card-tight row-flex" style="border-color:var(--accent)">
      <a class="row-flex grow" href="#/sick" style="min-width:0"><div class="row-icon">${icon('shield')}</div>
      <div class="grow"><p class="row-title">${L('Sick mode active', 'Krank-Modus aktiv')}</p>
        <p class="row-sub wrap">${L('Your plan is adjusted', 'Dein Plan ist angepasst')}</p></div></a>
      <button class="btn btn-ghost btn-sm" data-end-sick>${L('End', 'Beenden')}</button></div>`
    : `<a class="card card-tight row-flex" href="#/sick">
      <div class="row-icon">${icon('shield')}</div>
      <div class="grow"><p class="row-title">${L('Feeling sick?', 'Krank?')}</p>
        <p class="row-sub wrap">${L('Easy plan for your next 2 training days', 'Einfacher Plan für deine nächsten 2 Trainingstage')}</p></div>
      ${icon('right', 'chev')}</a>`}
    <div class="grid2">
      <button class="card card-tight" data-edit-days><p class="tiny muted">${L('Training days', 'Trainingstage')}</p><p class="row-title mt-sm">${db.planDays.length ? [...db.planDays].sort().map(d => DAYS[d]).join(' · ') : L('None', 'Keine')}</p></button>
      <button class="card card-tight" data-edit-time><p class="tiny muted">${L('Session length', 'Trainingsdauer')}</p><p class="row-title mt-sm">${db.profile.minutes} min</p></button>
    </div>
    <div><div class="section-title"><h3 class="h3">${L('Workouts', 'Trainings')}</h3></div>
      <div class="stack-sm">${CATEGORIES.map(c => {
        const w = buildWorkout(c.id);
        return `<a class="card card-tight row-flex" href="#/workout/c/${c.id}">
          <div class="grow"><p class="row-title">${c.name}</p><p class="row-sub">${esc(c.desc)}</p></div>
          <span class="tag">${fmtMin(w.seconds)}</span></a>`;
      }).join('')}</div></div>
    <div class="grid2">
      <a class="card tile" href="#/progress">${icon('chart')}<div><div class="tile-title">${L('Progress', 'Fortschritt')}</div><div class="tile-sub">${L('Consistency &amp; records', 'Beständigkeit &amp; Rekorde')}</div></div></a>
      <a class="card tile" href="#/history">${icon('history')}<div><div class="tile-title">${L('History', 'Verlauf')}</div><div class="tile-sub">${L('{n} sessions', '{n} Trainings', { n: db.history.length })}</div></div></a>
    </div>`;

  return {
    html,
    mount(view) {
      view.addEventListener('click', async e => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.matches('[data-end-sick]')) { if (await confirmEndSick()) refresh(); return; }
        if (t.dataset.week) { weekOffset = Math.min(1, weekOffset + Number(t.dataset.week)); refresh(); return; }
        if (t.dataset.day) { daySheet(plan[Number(t.dataset.day)]); return; }
        if (t.matches('[data-edit-days]')) { editDays(); return; }
        if (t.matches('[data-edit-time]')) editTime();
      });
    },
  };
}

function daySheet(d) {
  const entries = d.entries;
  const w = d.cat ? buildWorkout(d.cat) : null;
  const future = !d.past && !d.isToday;
  sheet(`<p class="eyebrow">${DAYS_LONG[d.idx]} · ${fmtDate(d.date, { day: 'numeric', month: 'long' })}</p>
    <h3 class="sheet-title mt-sm">${entries.length ? L('Completed', 'Erledigt') : w ? w.name : L('Rest day', 'Ruhetag')}</h3>
    ${entries.map(e => `<div class="row"><div class="row-icon">${icon('check')}</div><div class="grow"><div class="row-title">${esc(nameOf(e))}</div>
      <div class="row-sub">${fmtMin(e.dur)} · ${L('{n} sets', '{n} Sätze', { n: e.sets })}${e.manual ? ' · ' + L('marked manually', 'manuell markiert') : ''}</div></div>
      <button class="icon-btn" data-del="${e.id}" aria-label="${L('Remove', 'Entfernen')}">${icon('trash', 'ic-sm')}</button></div>`).join('')}
    ${!entries.length && w ? `<p class="muted">${fmtMin(w.seconds)} · ${w.items.map(i => EX[i.exId].name).join(', ')}</p>` : ''}
    ${!entries.length && !w ? `<p class="muted">${L('No training planned. Recovery is part of the plan.', 'Kein Training geplant. Erholung gehört zum Plan.')}</p>` : ''}
    <div class="stack-sm mt">
      ${w && !future && !entries.length ? `<button class="btn btn-primary btn-block" data-go-start>${icon('play', 'ic-sm')} ${L('Start now', 'Jetzt starten')}</button>
        <button class="btn btn-ghost btn-block" data-mark>${icon('check', 'ic-sm')} ${L('Mark as completed', 'Als erledigt markieren')}</button>` : ''}
      ${w ? `<a class="btn btn-outline btn-block" href="#/workout/c/${w.cat}" data-close>${L('View workout', 'Training ansehen')}</a>` : ''}
      ${!w && !future && !entries.length ? `<a class="btn btn-ghost btn-block" href="#/workout/c/general?m=10" data-close>${L('Light session', 'Lockere Einheit')}</a>` : ''}
    </div>`, {
    onMount(el, close) {
      el.addEventListener('click', async e => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.matches('[data-go-start]')) { close(); startSession(w); go('session'); }
        if (t.matches('[data-mark]')) { logManual(w, d.date); close(); toast(L('Marked as completed.', 'Als erledigt markiert.')); refresh(); }
        if (t.dataset.del) {
          close();
          if (await confirmDialog({ title: L('Remove this workout?', 'Dieses Training entfernen?'), text: L('It will be removed from your history and progress.', 'Es wird aus Verlauf und Fortschritt entfernt.'), confirm: L('Remove', 'Entfernen'), danger: true })) {
            deleteEntry(t.dataset.del); refresh();
          }
        }
      });
    },
  });
}

export function editDays() {
  let days = [...db.planDays];
  sheet(`<h3 class="sheet-title">${L('Training days', 'Trainingstage')}</h3><p class="muted small">${L('Choose the days you want to train.', 'Wähle die Tage, an denen du trainieren willst.')}</p>
    <div class="daypick mt">${DAYS.map((d, i) => `<button type="button" data-d="${i}" class="${days.includes(i) ? 'on' : ''}">${d.slice(0, 2)}</button>`).join('')}</div>
    <p class="note mt-sm" data-hint></p>
    <button class="btn btn-primary btn-block mt" data-save>${L('Save', 'Speichern')}</button>`, {
    onMount(el, close) {
      const hint = el.querySelector('[data-hint]');
      const upd = () => {
        hint.textContent = days.length === 7 ? L('Plan at least one rest day each week.', 'Plane mindestens einen Ruhetag pro Woche ein.')
          : days.length === 0 ? L('Choose at least one day.', 'Wähle mindestens einen Tag.')
          : L('{n} sessions per week.', '{n} Trainings pro Woche.', { n: days.length });
        el.querySelector('[data-save]').disabled = days.length === 0 || days.length === 7;
      };
      upd();
      el.addEventListener('click', e => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.dataset.d) {
          const i = Number(t.dataset.d);
          days = days.includes(i) ? days.filter(x => x !== i) : [...days, i].sort();
          t.classList.toggle('on'); upd();
        }
        if (t.matches('[data-save]')) {
          const sameAsReminders = JSON.stringify([...db.reminders.days].sort()) === JSON.stringify([...db.planDays].sort());
          db.planDays = days;
          db.profile.daysPerWeek = days.length;
          if (sameAsReminders) db.reminders.days = [...days];
          save(); close(); toast(L('Training days updated.', 'Trainingstage gespeichert.')); refresh();
        }
      });
    },
  });
}

export function editTime() {
  sheet(`<h3 class="sheet-title">${L('Session length', 'Trainingsdauer')}</h3><p class="muted small">${L('How much time do you have per workout?', 'Wie viel Zeit hast du pro Training?')}</p>
    <div class="chips mt">${MINUTES.map(m => `<button class="chip ${db.profile.minutes === m ? 'on' : ''}" data-m="${m}">${m} min</button>`).join('')}</div>`, {
    onMount(el, close) {
      el.addEventListener('click', e => {
        const t = e.target.closest('[data-m]');
        if (!t) return;
        db.profile.minutes = Number(t.dataset.m);
        save(); close(); refresh();
      });
    },
  });
}

// ---------- workout preview ----------
export function preview({ id }, query) {
  const cat = CAT[id] || CAT.full;
  const minutes = Number(query.get('m')) || db.profile.minutes;
  const w = buildWorkout(cat.id, db.profile, minutes);
  const html = `${backBar('#/workout', '')}
    <div><p class="eyebrow">${label(EXPERIENCE, w.level)} · ${L('{n} exercises', '{n} Übungen', { n: w.items.length })}</p><h1 class="h1 mt-sm">${cat.name}</h1><p class="muted mt-sm">${esc(cat.desc)}</p></div>
    ${cat.light ? `<div class="callout">${icon('shield')}<span>${L('Sick mode plan: about half the reps, more rest. Stop if you feel worse.', 'Krank-Modus-Plan: etwa halbe Wiederholungen, mehr Pause. Hör auf, wenn es dir schlechter geht.')}</span></div>` : `<div><p class="eyebrow">${L('Duration', 'Dauer')}</p><div class="chips scroll mt-sm">${MINUTES.map(m => `<a class="chip ${m === minutes ? 'on' : ''}" href="#/workout/c/${cat.id}?m=${m}">${m} min</a>`).join('')}</div>
      <p class="note mt-sm">${L('Estimated {t} including rest.', 'Etwa {t} inklusive Pausen.', { t: fmtMin(w.seconds) })}</p></div>`}
    <div class="card list-card">${w.items.map((it, k) => `<a class="row" href="#/exercises/${it.exId}">
        <div class="row-icon num" style="font-size:17px">${k + 1}</div>
        <div class="grow"><div class="row-title">${EX[it.exId].name}</div><div class="row-sub wrap">${doseText(it)} · ${L('rest', 'Pause')} ${it.rest}s</div></div>
        ${icon('right', 'chev')}</a>`).join('')}</div>
    <div class="callout">${icon('info')}<span>${L('Warm up for a few minutes first. Stop if you feel pain – adjust reps to your level.', 'Wärm dich vorher ein paar Minuten auf. Hör bei Schmerzen auf – pass die Wiederholungen deinem Level an.')}</span></div>
    <button class="btn btn-primary btn-block btn-xl" data-start>${db.session ? L('Start new workout', 'Neues Training starten') : L('Start workout', 'Training starten')}</button>`;
  return {
    html,
    mount(view) {
      view.querySelector('[data-start]').addEventListener('click', async () => {
        if (db.session && !(await confirmDialog({
          title: L('Replace current workout?', 'Aktuelles Training ersetzen?'),
          text: L('"{n}" is still in progress. Starting a new one discards it.', '„{n}“ läuft noch. Ein neues Training verwirft es.', { n: nameOf(db.session) }),
          confirm: L('Start new', 'Neu starten'), danger: true,
        }))) return;
        startSession(w); go('session');
      });
    },
  };
}

export { doseText };
