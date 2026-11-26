import { db, save } from '../store.js';
import { esc, icon, DAYS, DAYS_LONG, fmtMin, fmtDate, backBar, sheet, toast, confirmDialog, weekdayIdx } from '../ui.js';
import { CATEGORIES, CAT, buildWorkout, weekPlan } from '../logic/plan.js';
import { startSession, logManual, deleteEntry } from '../logic/session.js';
import { MINUTES } from '../data/options.js';
import { EX } from '../data/exercises.js';
import { go, refresh } from '../router.js';

let weekOffset = 0;

const doseText = it => {
  const e = EX[it.exId];
  const amount = e.type === 'time' ? `${it.target}s` : `${it.target} reps`;
  return `${it.sets} × ${amount}${e.perSide ? ' each side' : ''}`;
};

function weekStrip(plan) {
  return `<div class="week">${plan.map(d => {
    const done = d.entries.length > 0;
    const cls = [done ? 'done' : '', d.planned ? 'planned' : '', d.isToday ? 'today' : '', d.planned && d.past && !done ? 'missed' : ''].join(' ');
    return `<button class="wday ${cls}" data-day="${d.idx}" aria-label="${DAYS_LONG[d.idx]}">
      ${DAYS[d.idx].slice(0, 2)}<b>${done ? icon('check') : d.date.getDate()}</b></button>`;
  }).join('')}</div>`;
}

export function render() {
  const plan = weekPlan(weekOffset);
  const s = db.session;
  const html = `
    <h1 class="h1">Workout</h1>
    ${s ? `<a class="card card-tight row-flex" href="#/session" style="border-color:var(--accent)">
        <div class="row-icon" style="background:var(--accent);color:var(--accent-ink)">${icon('play')}</div>
        <div class="grow"><p class="tiny muted">In progress</p><p class="row-title">${esc(s.name)}</p></div>${icon('right', 'chev')}</a>` : ''}
    <div>
      <div class="section-title" style="margin-top:6px"><h3 class="h3">${weekOffset === 0 ? 'This week' : weekOffset < 0 ? `${-weekOffset} week${weekOffset < -1 ? 's' : ''} ago` : 'Next week'}</h3>
        <div class="row-flex" style="gap:0">
          <button class="icon-btn" data-week="-1" aria-label="Previous week">${icon('left', 'ic-sm')}</button>
          <button class="icon-btn" data-week="1" aria-label="Next week" ${weekOffset >= 1 ? 'disabled style="opacity:.3"' : ''}>${icon('right', 'ic-sm')}</button></div></div>
      <div class="card" style="padding:10px">${weekStrip(plan)}</div>
      <div class="card list-card mt-sm">${plan.filter(d => d.planned || d.entries.length).map(d => {
        const e = d.entries[d.entries.length - 1];
        return `<button class="row" data-day="${d.idx}">
          <div class="row-icon">${e ? icon('check') : icon('workout')}</div>
          <div class="grow"><div class="row-title">${esc(e ? e.name : CAT[d.cat].name)}</div>
          <div class="row-sub">${DAYS_LONG[d.idx]}${d.isToday ? ' · Today' : ''}${e ? ` · ${fmtMin(e.dur)}` : d.past ? ' · Missed – that’s okay' : ''}</div></div>
          ${icon('right', 'chev')}</button>`;
      }).join('') || '<p class="muted small" style="padding:14px 0">No sessions this week.</p>'}</div>
    </div>
    <div class="grid2">
      <button class="card card-tight" data-edit-days><p class="tiny muted">Training days</p><p class="row-title mt-sm">${db.planDays.length ? [...db.planDays].sort().map(d => DAYS[d]).join(' · ') : 'None'}</p></button>
      <button class="card card-tight" data-edit-time><p class="tiny muted">Session length</p><p class="row-title mt-sm">${db.profile.minutes} min</p></button>
    </div>
    <div><div class="section-title"><h3 class="h3">Workouts</h3></div>
      <div class="stack-sm">${CATEGORIES.map(c => {
        const w = buildWorkout(c.id);
        return `<a class="card card-tight row-flex" href="#/workout/c/${c.id}">
          <div class="grow"><p class="row-title">${c.name}</p><p class="row-sub">${esc(c.desc)}</p></div>
          <span class="tag">${fmtMin(w.seconds)}</span></a>`;
      }).join('')}</div></div>
    <div class="grid2">
      <a class="card tile" href="#/progress">${icon('chart')}<div><div class="tile-title">Progress</div><div class="tile-sub">Consistency &amp; records</div></div></a>
      <a class="card tile" href="#/history">${icon('history')}<div><div class="tile-title">History</div><div class="tile-sub">${db.history.length} sessions</div></div></a>
    </div>`;

  return {
    html,
    mount(view) {
      view.addEventListener('click', e => {
        const t = e.target.closest('button');
        if (!t) return;
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
    <h3 class="sheet-title mt-sm">${entries.length ? 'Completed' : w ? w.name : 'Rest day'}</h3>
    ${entries.map(e => `<div class="row"><div class="row-icon">${icon('check')}</div><div class="grow"><div class="row-title">${esc(e.name)}</div>
      <div class="row-sub">${fmtMin(e.dur)} · ${e.sets} sets${e.manual ? ' · marked manually' : ''}</div></div>
      <button class="icon-btn" data-del="${e.id}" aria-label="Remove">${icon('trash', 'ic-sm')}</button></div>`).join('')}
    ${!entries.length && w ? `<p class="muted">${fmtMin(w.seconds)} · ${w.items.map(i => EX[i.exId].name).join(', ')}</p>` : ''}
    ${!entries.length && !w ? '<p class="muted">No training planned. Recovery is part of the plan.</p>' : ''}
    <div class="stack-sm mt">
      ${w && !future && !entries.length ? `<button class="btn btn-primary btn-block" data-go-start>${icon('play', 'ic-sm')} Start now</button>
        <button class="btn btn-ghost btn-block" data-mark>${icon('check', 'ic-sm')} Mark as completed</button>` : ''}
      ${w ? `<a class="btn btn-outline btn-block" href="#/workout/c/${w.cat}" data-close>View workout</a>` : ''}
      ${!w && !future && !entries.length ? `<a class="btn btn-ghost btn-block" href="#/workout/c/general?m=10" data-close>Light session</a>` : ''}
    </div>`, {
    onMount(el, close) {
      el.addEventListener('click', async e => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.matches('[data-go-start]')) { close(); startSession(w); go('session'); }
        if (t.matches('[data-mark]')) { logManual(w, d.date); close(); toast('Marked as completed.'); refresh(); }
        if (t.dataset.del) {
          close();
          if (await confirmDialog({ title: 'Remove this workout?', text: 'It will be removed from your history and progress.', confirm: 'Remove', danger: true })) {
            deleteEntry(t.dataset.del); refresh();
          }
        }
      });
    },
  });
}

export function editDays() {
  let days = [...db.planDays];
  sheet(`<h3 class="sheet-title">Training days</h3><p class="muted small">Choose the days you want to train.</p>
    <div class="daypick mt">${DAYS.map((d, i) => `<button type="button" data-d="${i}" class="${days.includes(i) ? 'on' : ''}">${d.slice(0, 2)}</button>`).join('')}</div>
    <p class="note mt-sm" data-hint></p>
    <button class="btn btn-primary btn-block mt" data-save>Save</button>`, {
    onMount(el, close) {
      const hint = el.querySelector('[data-hint]');
      const upd = () => {
        hint.textContent = days.length === 7 ? 'Plan at least one rest day each week.' : days.length === 0 ? 'Choose at least one day.' : `${days.length} sessions per week.`;
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
          save(); close(); toast('Training days updated.'); refresh();
        }
      });
    },
  });
}

export function editTime() {
  sheet(`<h3 class="sheet-title">Session length</h3><p class="muted small">How much time do you have per workout?</p>
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
    <div><p class="eyebrow">${w.level} · ${w.items.length} exercises</p><h1 class="h1 mt-sm">${cat.name}</h1><p class="muted mt-sm">${esc(cat.desc)}</p></div>
    <div><p class="eyebrow">Duration</p><div class="chips scroll mt-sm">${MINUTES.map(m => `<a class="chip ${m === minutes ? 'on' : ''}" href="#/workout/c/${cat.id}?m=${m}">${m} min</a>`).join('')}</div>
      <p class="note mt-sm">Estimated ${fmtMin(w.seconds)} including rest.</p></div>
    <div class="card list-card">${w.items.map((it, k) => `<a class="row" href="#/exercises/${it.exId}">
        <div class="row-icon num" style="font-size:17px">${k + 1}</div>
        <div class="grow"><div class="row-title">${EX[it.exId].name}</div><div class="row-sub">${doseText(it)} · rest ${it.rest}s</div></div>
        ${icon('right', 'chev')}</a>`).join('')}</div>
    <div class="callout">${icon('info')}<span>Warm up for a few minutes first. Stop if you feel pain – adjust reps to your level.</span></div>
    <button class="btn btn-primary btn-block btn-xl" data-start>${db.session ? 'Start new workout' : 'Start workout'}</button>`;
  return {
    html,
    mount(view) {
      view.querySelector('[data-start]').addEventListener('click', async () => {
        if (db.session && !(await confirmDialog({ title: 'Replace current workout?', text: `"${db.session.name}" is still in progress. Starting a new one discards it.`, confirm: 'Start new', danger: true }))) return;
        startSession(w); go('session');
      });
    },
  };
}

export { doseText };
