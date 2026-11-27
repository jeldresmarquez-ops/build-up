// Krank-Modus / Sick mode – kept deliberately simple:
// 1) choose how you feel, 2) start. Next 2 training days become gentle (or rest when properly sick).
import { db } from '../store.js';
import { icon, backBar, fmtMin, fmtDate, toast, confirmDialog, dayKey } from '../ui.js';
import { L } from '../i18n.js';
import { EX } from '../data/exercises.js';
import { buildWorkout, activeSick, startSick, endSick, extendSick, setSickSeverity, entriesOn, sickDaysLeft } from '../logic/plan.js';
import { startSession } from '../logic/session.js';
import { go, refresh } from '../router.js';

let choice = null;

const amount = (exId, sets, n) => `${sets} × ${EX[exId].type === 'time' ? n + 's' : n}`;

function lightList(w) {
  return `<div class="card list-card">${w.items.map(it => `<a class="row" href="#/exercises/${it.exId}">
      <div class="grow"><div class="row-title">${EX[it.exId].name}</div>
        <div class="row-sub">${L('normally', 'sonst')} ${amount(it.exId, it.normal[0], it.normal[1])}</div></div>
      <span class="num" style="font-size:22px">${amount(it.exId, it.sets, it.target)}</span></a>`).join('')}</div>`;
}

const warning = () => `<p class="note">${L('Fever or cough? Don’t train – rest. Not getting better? See a doctor.',
  'Fieber oder Husten? Nicht trainieren – ausruhen. Wird es nicht besser? Zum Arzt.')}</p>`;

function inactive() {
  const w = buildWorkout('light');
  const ex = w.items.find(i => i.exId === 'pushup' || i.exId === 'incline-pushup') || w.items[0];
  const opt = (id, title, sub) => `<button type="button" class="opt ${choice === id ? 'on' : ''}" data-sev="${id}">
    <span class="grow"><span class="row-title">${title}</span><span class="row-sub" style="display:block">${sub}</span></span>
    <span class="opt-check">${icon('check')}</span></button>`;
  return `${backBar('#/workout', L('Sick mode', 'Krank-Modus'))}
    <div><h1 class="h1">${L('Feeling sick?', 'Krank?')}</h1>
      <p class="muted mt-sm">${L('Then you train lightly on your next 2 training days.', 'Dann trainierst du deine nächsten 2 Trainingstage nur leicht.')}</p></div>
    <div class="card card-tight"><p class="tiny muted">${L('Example', 'Beispiel')}</p>
      <p class="row-title mt-sm">${EX[ex.exId].name}: <b>${amount(ex.exId, ex.sets, ex.target)}</b> ${L('instead of', 'statt')} ${amount(ex.exId, ex.normal[0], ex.normal[1])}</p></div>
    <div><p class="eyebrow">${L('How do you feel?', 'Wie fühlst du dich?')}</p><div class="mt-sm">
      ${opt('mild', L('A bit sick', 'Leicht krank'), L('Runny nose, slight sore throat', 'Schnupfen, leichtes Halskratzen'))}
      ${opt('severe', L('Properly sick', 'Richtig krank'), L('Fever, cough, body aches → rest', 'Fieber, Husten, Gliederschmerzen → Ruhe'))}
    </div></div>
    <button class="btn btn-primary btn-block btn-xl" data-start-sick ${choice ? '' : 'disabled'}>${L('Start', 'Starten')}</button>
    ${warning()}`;
}

function active(s) {
  const mild = s.severity === 'mild';
  const today = dayKey(Date.now());
  const w = buildWorkout('light');
  const canTrainNow = mild && s.days.includes(today) && !entriesOn(today).length;
  const left = sickDaysLeft();
  const dayRow = k => {
    const done = entriesOn(k).length > 0;
    return `<div class="row"><div class="row-icon">${done ? icon('check') : mild ? icon('workout') : icon('moon')}</div>
      <div class="grow"><div class="row-title">${k === today ? L('Today', 'Heute') : fmtDate(new Date(k + 'T12:00:00'))}</div>
      <div class="row-sub">${done ? L('Done', 'Erledigt') : mild ? L('Light training', 'Leichtes Training') : L('Rest', 'Ruhe')}</div></div></div>`;
  };
  return `${backBar('#/workout', L('Sick mode', 'Krank-Modus'))}
    <div><p class="eyebrow" style="color:var(--accent)">${L('Sick mode on', 'Krank-Modus an')}</p>
      <h1 class="h1 mt-sm">${mild ? L('Train lightly', 'Leicht trainieren') : L('Rest', 'Ausruhen')}</h1>
      <p class="muted mt-sm">${!left ? L('Done! Feeling better?', 'Geschafft! Geht’s dir besser?')
        : mild ? L('Half the reps, more rest. Stop if you feel worse.', 'Halbe Wiederholungen, mehr Pause. Hör auf, wenn es schlechter wird.')
        : L('No training. Drink a lot and sleep.', 'Kein Training. Viel trinken und schlafen.')}</p></div>
    ${canTrainNow ? `<button class="btn btn-primary btn-block btn-xl" data-go>${icon('play', 'ic-sm')} ${L('Start', 'Starten')} · ${fmtMin(w.seconds)}</button>` : ''}
    <div class="card list-card">${s.days.map(dayRow).join('')}</div>
    ${mild ? lightList(w) : `<button class="btn btn-ghost btn-block" data-sev-switch="mild">${L('I feel better – train lightly', 'Mir geht’s besser – leicht trainieren')}</button>`}
    <button class="btn btn-primary btn-block" data-healthy>${icon('check', 'ic-sm')} ${L('I’m healthy again', 'Ich bin wieder gesund')}</button>
    <div class="center"><button class="link-btn" data-extend>${L('Still sick? +2 days', 'Noch krank? +2 Tage')}</button>
      ${mild ? ` · <button class="link-btn" data-sev-switch="severe">${L('Worse? Rest instead', 'Schlechter? Lieber Ruhe')}</button>` : ''}</div>
    ${warning()}`;
}

export function render() {
  const s = activeSick();
  return {
    html: s ? active(s) : inactive(),
    mount(view) {
      view.addEventListener('click', async e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.sev) { choice = b.dataset.sev; refresh(); return; }
        if (b.matches('[data-start-sick]') && choice) {
          startSick(choice); choice = null;
          toast(L('Get well soon!', 'Gute Besserung!'));
          refresh(); return;
        }
        if (b.matches('[data-go]')) {
          if (db.session && !(await confirmDialog({ title: L('Replace current workout?', 'Aktuelles Training ersetzen?'), confirm: L('Start new', 'Neu starten'), danger: true }))) return;
          startSession(buildWorkout('light')); go('session'); return;
        }
        if (b.dataset.sevSwitch) { setSickSeverity(b.dataset.sevSwitch); refresh(); return; }
        if (b.matches('[data-extend]')) { extendSick(); toast(L('2 more days.', '2 Tage verlängert.')); refresh(); return; }
        if (b.matches('[data-healthy]')) {
          endSick();
          toast(L('Welcome back!', 'Willkommen zurück!'));
          go('home');
        }
      });
    },
  };
}
