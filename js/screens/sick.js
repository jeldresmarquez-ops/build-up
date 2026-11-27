// Krank-Modus / Sick mode: light plan for the next 2 training days, or rest when properly sick.
import { db } from '../store.js';
import { esc, icon, backBar, fmtMin, fmtDate, toast, confirmDialog, dayKey } from '../ui.js';
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
        <div class="row-sub wrap">${L('normally', 'sonst')} ${amount(it.exId, it.normal[0], it.normal[1])}${EX[it.exId].perSide ? ' ' + L('each side', 'pro Seite') : ''}</div></div>
      <span class="num" style="font-size:22px">${amount(it.exId, it.sets, it.target)}</span></a>`).join('')}</div>`;
}

const safety = () => `<div class="callout">${icon('info')}<span>${L(
  'Fever, body aches, cough or chest pain? Then no training – rest comes first. If you are unsure or it does not get better, talk to a doctor.',
  'Fieber, Gliederschmerzen, Husten oder Brustschmerzen? Dann kein Training – Ruhe geht vor. Wenn du unsicher bist oder es nicht besser wird, sprich mit einem Arzt.')}</span></div>`;

const tips = () => `<div class="card"><p class="eyebrow">${L('Get well tips', 'Tipps zum Gesundwerden')}</p>
  <ul class="bullets mt-sm">
    <li>${L('Drink plenty of water or tea.', 'Trink viel Wasser oder Tee.')}</li>
    <li>${L('Sleep more than usual.', 'Schlaf mehr als sonst.')}</li>
    <li>${L('Eat warm, simple meals.', 'Iss warme, einfache Mahlzeiten.')}</li>
    <li>${L('Stop training right away if you feel worse.', 'Hör sofort auf zu trainieren, wenn es dir schlechter geht.')}</li>
    <li>${L('Less is more – your body needs energy to recover.', 'Weniger ist mehr – dein Körper braucht Energie zum Gesundwerden.')}</li>
  </ul></div>`;

function inactive() {
  const w = buildWorkout('light');
  const push = w.items.find(i => i.exId === 'pushup' || i.exId === 'incline-pushup') || w.items[0];
  const opt = (id, title, sub) => `<button type="button" class="opt ${choice === id ? 'on' : ''}" data-sev="${id}">
    <span class="grow"><span class="row-title">${title}</span><span class="row-sub wrap" style="display:block">${sub}</span></span>
    <span class="opt-check">${icon('check')}</span></button>`;
  return `${backBar('#/workout', L('Sick mode', 'Krank-Modus'))}
    <div><h1 class="h1">${L('Feeling sick?', 'Krank?')}</h1>
      <p class="muted mt-sm">${L('For your next 2 training days you get an easy plan: about half the reps, fewer sets, longer rest and no jumping exercises. So you stay fit without getting sicker.',
        'Für deine nächsten 2 Trainingstage bekommst du einen einfachen Plan: etwa halb so viele Wiederholungen, weniger Sätze, längere Pausen und keine Sprungübungen. So bleibst du fit, ohne kränker zu werden.')}</p></div>
    ${push ? `<div class="card card-tight row-flex"><div class="row-icon">${icon('workout')}</div><div class="grow"><p class="tiny muted">${L('Example', 'Beispiel')}</p>
      <p class="row-title">${EX[push.exId].name}: ${amount(push.exId, push.sets, push.target)} ${L('instead of', 'statt')} ${amount(push.exId, push.normal[0], push.normal[1])}</p></div></div>` : ''}
    <div><p class="eyebrow">${L('How do you feel?', 'Wie fühlst du dich?')}</p><div class="mt-sm">
      ${opt('mild', L('A bit under the weather', 'Leicht angeschlagen'), L('Runny nose or a slight sore throat – symptoms only above the neck.', 'Schnupfen oder leichtes Halskratzen – Beschwerden nur oberhalb vom Hals.'))}
      ${opt('severe', L('Properly sick', 'Richtig krank'), L('Fever, body aches, cough, chest or stomach problems.', 'Fieber, Gliederschmerzen, Husten, Brust- oder Magen-Darm-Beschwerden.'))}
    </div></div>
    ${choice === 'severe' ? `<p class="note">${L('Then your next 2 training days become rest days. That is the fastest way back.', 'Dann werden deine nächsten 2 Trainingstage zu Ruhetagen. Das ist der schnellste Weg zurück.')}</p>` : ''}
    <button class="btn btn-primary btn-block btn-xl" data-start-sick ${choice ? '' : 'disabled'}>${L('Start sick mode', 'Krank-Modus starten')}</button>
    ${safety()}`;
}

function active(s) {
  const mild = s.severity === 'mild';
  const today = dayKey(Date.now());
  const w = buildWorkout('light');
  const todayIsSick = s.days.includes(today);
  const doneToday = entriesOn(today).length > 0;
  const left = sickDaysLeft();
  const dayRow = k => {
    const d = new Date(k + 'T12:00:00');
    const done = entriesOn(k).length > 0;
    return `<div class="row"><div class="row-icon">${done ? icon('check') : mild ? icon('workout') : icon('moon')}</div>
      <div class="grow"><div class="row-title">${fmtDate(d)}${k === today ? ' · ' + L('Today', 'Heute') : ''}</div>
      <div class="row-sub">${done ? L('Done', 'Erledigt') : mild ? `${L('Gentle session', 'Sanftes Training')} · ${fmtMin(w.seconds)}` : L('Rest', 'Ruhe')}</div></div></div>`;
  };
  return `${backBar('#/workout', L('Sick mode', 'Krank-Modus'))}
    <div><p class="eyebrow" style="color:var(--accent)">${L('Active', 'Aktiv')}</p><h1 class="h1 mt-sm">${mild ? L('Stay fit gently', 'Sanft fit bleiben') : L('Rest &amp; recover', 'Ruhe &amp; erholen')}</h1>
      <p class="muted mt-sm">${left
        ? L('{n} of your training days are adjusted.', '{n} deiner Trainingstage sind angepasst.', { n: left })
        : L('Your adjusted days are done. Feeling better?', 'Deine angepassten Tage sind geschafft. Geht’s dir besser?')}</p></div>
    <div class="card list-card">${s.days.map(dayRow).join('')}</div>
    ${mild ? `<div><div class="section-title"><h3 class="h3">${L('Your gentle session', 'Dein sanftes Training')}</h3><span class="muted small">${fmtMin(w.seconds)}</span></div>
        ${lightList(w)}</div>
        ${todayIsSick && !doneToday ? `<button class="btn btn-primary btn-block btn-xl" data-go>${icon('play', 'ic-sm')} ${L('Start gentle session', 'Sanftes Training starten')}</button>`
          : `<p class="note center">${doneToday ? L('Done for today. Rest well.', 'Für heute erledigt. Erhol dich gut.') : L('Today is not one of your training days – rest.', 'Heute ist kein Trainingstag – erhol dich.')}</p>`}`
      : `<div class="card"><p class="h3">${L('No training on these days', 'An diesen Tagen kein Training')}</p>
        <p class="muted small mt-sm">${L('When the fever is gone and you feel better, switch to the gentle plan.', 'Wenn das Fieber weg ist und es dir besser geht, wechsle zum sanften Plan.')}</p>
        <button class="btn btn-ghost btn-block mt" data-sev-switch="mild">${L('I feel better – gentle plan', 'Mir geht’s besser – sanfter Plan')}</button></div>`}
    ${tips()}
    <div class="stack-sm">
      <button class="btn btn-primary btn-block" data-healthy>${icon('check', 'ic-sm')} ${L('I’m healthy again', 'Ich bin wieder gesund')}</button>
      <button class="btn btn-ghost btn-block" data-extend>${L('Still sick – 2 more training days', 'Noch krank – 2 weitere Trainingstage')}</button>
      ${mild ? `<button class="btn btn-ghost btn-block" data-sev-switch="severe">${L('I feel worse – rest instead', 'Mir geht’s schlechter – lieber Ruhe')}</button>` : ''}
    </div>
    ${safety()}`;
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
          toast(L('Sick mode is on. Get well soon!', 'Krank-Modus ist an. Gute Besserung!'));
          refresh(); return;
        }
        if (b.matches('[data-go]')) {
          if (db.session && !(await confirmDialog({ title: L('Replace current workout?', 'Aktuelles Training ersetzen?'), confirm: L('Start new', 'Neu starten'), danger: true }))) return;
          startSession(buildWorkout('light')); go('session'); return;
        }
        if (b.dataset.sevSwitch) { setSickSeverity(b.dataset.sevSwitch); refresh(); return; }
        if (b.matches('[data-extend]')) { extendSick(); toast(L('Extended by 2 training days.', 'Um 2 Trainingstage verlängert.')); refresh(); return; }
        if (b.matches('[data-healthy]')) {
          endSick();
          toast(L('Welcome back! Your normal plan is active again.', 'Willkommen zurück! Dein normaler Plan ist wieder aktiv.'));
          go('home');
        }
      });
    },
  };
}

export { esc };
