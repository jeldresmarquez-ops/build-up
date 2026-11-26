import { db } from '../store.js';
import { esc, icon, fmtDur, fmtMin, sheet, confirmDialog } from '../ui.js';
import { L } from '../i18n.js';
import { nameOf } from '../logic/plan.js';
import { EX } from '../data/exercises.js';
import * as S from '../logic/session.js';
import { unit } from '../logic/stats.js';
import { MESSAGES } from '../data/quotes.js';
import { go } from '../router.js';

let audio;
function beep(times = 1) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
      const t = audio.currentTime + i * 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t); o.stop(t + 0.2);
    }
  } catch { /* audio not available */ }
  navigator.vibrate?.(times > 1 ? [120, 80, 120] : 120);
}

const setOf = (a, b) => L('Set {a} of {b}', 'Satz {a} von {b}', { a, b });

export function render() {
  const s = db.session;
  if (!s) {
    return { html: `<div class="empty mt-lg">${icon('workout')}<b>${L('No active workout', 'Kein aktives Training')}</b>${L('Choose a workout to get started.', 'Wähle ein Training, um loszulegen.')}</div>
      <a class="btn btn-primary btn-block" href="#/workout">${L('Go to workouts', 'Zu den Trainings')}</a>` };
  }
  let reps = null;
  let lock = null;
  let timer;
  let halfBeeped = false;
  let view;

  function paint() {
    const it = S.current(s), e = EX[it.exId];
    if (reps === null) reps = it.target;
    const segs = s.items.map((x, k) => `<i class="${k < s.ex ? 'done' : k === s.ex ? 'cur' : ''}"></i>`).join('');
    let main = '', actions = '';
    if (s.phase === 'rest') {
      main = `<p class="eyebrow">${L('Rest', 'Pause')}</p>
        <div class="session-big rest" data-t="count">${Math.ceil(S.remaining(s) / 1000)}</div>
        <p class="session-unit">${L('seconds', 'Sekunden')}</p>`;
      actions = `<div class="session-next">${icon('right')}<div class="grow"><p class="tiny muted">${L('Up next', 'Als Nächstes')}</p>
          <p class="row-title">${e.name} · ${setOf(s.set + 1, it.sets)}</p></div></div>
        <div class="grid2"><button class="btn btn-ghost" data-act="plus">+15 s</button><button class="btn btn-primary" data-act="skip-rest">${L('Skip rest', 'Pause überspringen')}</button></div>`;
    } else if (e.type === 'time') {
      const total = it.target * (e.perSide ? 2 : 1);
      const running = s.phase === 'timed';
      const side = !e.perSide ? L('seconds', 'Sekunden')
        : running && S.remaining(s) <= it.target * 1000 ? L('Second side', 'Zweite Seite')
        : running ? L('First side', 'Erste Seite')
        : L('{n}s each side', '{n}s pro Seite', { n: it.target });
      main = `<p class="eyebrow">${setOf(s.set + 1, it.sets)}</p>
        <h1 class="session-name mt-sm">${e.name}</h1>
        <div class="session-big" data-t="count">${running ? Math.ceil(S.remaining(s) / 1000) : total}</div>
        <p class="session-unit" data-t="side">${side}</p>`;
      actions = running
        ? `<button class="btn btn-primary btn-block btn-xl" data-act="time-done">${L('Done', 'Fertig')}</button>`
        : `<button class="btn btn-primary btn-block btn-xl" data-act="time-start">${icon('play', 'ic-sm')} ${L('Start {n}s', '{n}s starten', { n: total })}</button>`;
    } else {
      main = `<p class="eyebrow">${setOf(s.set + 1, it.sets)}</p>
        <h1 class="session-name mt-sm">${e.name}</h1>
        <div class="session-big" data-t="reps">${reps}</div>
        <p class="session-unit">${e.perSide ? L('reps each side', 'Wdh. pro Seite') : L('reps', 'Wiederholungen')} · ${L('target', 'Ziel')} ${it.target}</p>
        <div class="stepper mt"><button data-act="minus" aria-label="${L('Less', 'Weniger')}">${icon('minus')}</button><button data-act="more" aria-label="${L('More', 'Mehr')}">${icon('plus')}</button></div>`;
      actions = `<button class="btn btn-primary btn-block btn-xl" data-act="reps-done">${icon('check', 'ic-sm')} ${L('Complete set', 'Satz abschließen')}</button>`;
    }
    view.innerHTML = `<div class="session">
      <div class="session-top">
        <button class="icon-btn" data-act="leave" aria-label="${L('Leave', 'Verlassen')}">${icon('x')}</button>
        <span class="session-clock" data-t="clock">${fmtDur(S.elapsed(s) / 1000)}</span>
        <button class="icon-btn" data-act="pause" aria-label="${L('Pause', 'Pause')}">${icon('pause')}</button>
      </div>
      <div class="seg-bar">${segs}</div>
      <div class="session-main">${main}</div>
      <div class="session-actions">${actions}
        <div class="between"><button class="link-btn" data-act="how">${icon('info', 'ic-sm')} ${L('How to', 'Anleitung')}</button>
          <button class="link-btn" data-act="skip-ex">${L('Skip exercise', 'Übung überspringen')}</button>
          <button class="link-btn" data-act="finish">${L('Finish', 'Beenden')}</button></div></div>
      ${s.paused ? `<div class="paused-veil"><p class="eyebrow">${L('Paused', 'Pausiert')}</p><p class="session-clock" style="font-size:44px">${fmtDur(S.elapsed(s) / 1000)}</p>
        <button class="btn btn-primary btn-xl" data-act="resume">${icon('play', 'ic-sm')} ${L('Continue', 'Weiter')}</button>
        <button class="btn btn-ghost" data-act="finish">${L('Finish workout', 'Training beenden')}</button>
        <button class="btn btn-ghost" data-act="leave">${L('Back to app', 'Zurück zur App')}</button></div>` : ''}
    </div>`;
  }

  function tick() {
    if (!view?.isConnected) return;
    const c = view.querySelector('[data-t="clock"]');
    if (c) c.textContent = fmtDur(S.elapsed(s) / 1000);
    if (s.paused) return;
    const cnt = view.querySelector('[data-t="count"]');
    if (s.phase === 'rest' || s.phase === 'timed') {
      const left = S.remaining(s);
      if (cnt) cnt.textContent = Math.ceil(left / 1000);
      const it = S.current(s), e = EX[it.exId];
      if (s.phase === 'timed' && e.perSide && !halfBeeped && left <= it.target * 1000) {
        halfBeeped = true; beep(1);
        const side = view.querySelector('[data-t="side"]');
        if (side) side.textContent = L('Switch sides', 'Seite wechseln');
      }
      if (left <= 0) {
        if (s.phase === 'rest') { beep(2); S.endRest(s); reps = null; paint(); }
        else { beep(2); done(S.completeSet(s, it.target)); }
      }
    }
  }

  function done(result) {
    reps = null; halfBeeped = false;
    if (result === 'finished') return finish();
    paint();
  }

  function finish() {
    const entry = S.finishSession(s);
    if (entry) go(`workout/done/${entry.id}`);
    else go('workout');
  }

  async function onAction(act) {
    const it = S.current(s);
    switch (act) {
      case 'minus': reps = Math.max(0, reps - 1); view.querySelector('[data-t="reps"]').textContent = reps; break;
      case 'more': reps = Math.min(200, reps + 1); view.querySelector('[data-t="reps"]').textContent = reps; break;
      case 'reps-done': beep(1); done(S.completeSet(s, reps)); break;
      case 'time-start': beep(1); halfBeeped = false; S.startTimed(s); paint(); break;
      case 'time-done': {
        const e = EX[it.exId];
        const held = (Date.now() - s.workStart) / 1000;
        done(S.completeSet(s, Math.min(it.target, held / (e.perSide ? 2 : 1))));
        break;
      }
      case 'plus': S.addRest(s, 15); tick(); break;
      case 'skip-rest': S.endRest(s); reps = null; paint(); break;
      case 'pause': S.pause(s); paint(); break;
      case 'resume': S.resume(s); paint(); break;
      case 'leave': go('home'); break;
      case 'skip-ex':
        if (S.skipExercise(s) === 'finished') finish(); else { reps = null; paint(); }
        break;
      case 'finish': {
        const sets = s.items.reduce((n, x) => n + x.done.length, 0);
        const ok = await confirmDialog(sets
          ? { title: L('Finish workout?', 'Training beenden?'), text: L('You completed {n} sets. They will be saved to your history.', 'Du hast {n} Sätze geschafft. Sie werden im Verlauf gespeichert.', { n: sets }), confirm: L('Finish & save', 'Beenden & speichern') }
          : { title: L('Discard workout?', 'Training verwerfen?'), text: L('No sets completed yet, so nothing will be saved.', 'Noch kein Satz geschafft, daher wird nichts gespeichert.'), confirm: L('Discard', 'Verwerfen'), danger: true });
        if (ok) finish();
        break;
      }
      case 'how': howTo(EX[it.exId]); break;
    }
  }

  return {
    noNav: true,
    html: '',
    mount(v) {
      view = v;
      paint();
      timer = setInterval(tick, 250);
      v.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) onAction(b.dataset.act); });
      const wake = async () => { try { lock = await navigator.wakeLock?.request('screen'); } catch { /* not supported */ } };
      wake();
      const vis = () => { if (!document.hidden) { wake(); tick(); } };
      document.addEventListener('visibilitychange', vis);
      return () => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', vis);
        try { lock?.release(); } catch { /* ignore */ }
      };
    },
  };
}

function howTo(e) {
  sheet(`<p class="eyebrow">${L('How to', 'Anleitung')}</p><h3 class="sheet-title mt-sm">${e.name}</h3>
    <ol class="steps">${e.technique.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
    <p class="eyebrow mt">${L('Safety', 'Sicherheit')}</p><ul class="bullets safe mt-sm">${e.safety.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    <button class="btn btn-ghost btn-block mt" data-close>${L('Got it', 'Verstanden')}</button>`);
}

// ---------- summary ----------
export function summary({ id }) {
  const e = db.history.find(h => h.id === id);
  if (!e) return { html: `<div class="empty mt-lg"><b>${L('Workout not found', 'Training nicht gefunden')}</b></div><a class="btn btn-primary btn-block" href="#/home">${L('Home', 'Home')}</a>` };
  const msgs = [...MESSAGES.consistency, ...MESSAGES.training];
  const msg = msgs[db.history.length % msgs.length];
  return {
    html: `<div class="center mt-lg"><div class="check-badge">${icon('check')}</div>
        <p class="eyebrow mt">${L('Workout complete', 'Training geschafft')}</p><h1 class="h1 mt-sm">${esc(nameOf(e))}</h1>
        <p class="muted mt-sm">${esc(msg)}</p></div>
      <div class="stat-row">
        <div class="stat"><div class="num">${Math.round(e.dur / 60)}<span class="small muted"> min</span></div><div class="tiny">${L('Duration', 'Dauer')}</div></div>
        <div class="stat"><div class="num">${e.sets}</div><div class="tiny">${L('Sets', 'Sätze')}</div></div>
        <div class="stat"><div class="num">${e.reps}</div><div class="tiny">${L('Reps', 'Wdh.')}</div></div>
      </div>
      ${e.newRecords?.length ? `<div class="card"><p class="eyebrow">${L('New personal records', 'Neue persönliche Rekorde')}</p>
        ${e.newRecords.map(r => `<div class="row"><div class="row-icon">${icon('star')}</div><div class="grow"><div class="row-title">${EX[r.exId].name}</div>
          <div class="row-sub">${unit(r.exId, r.prev)} → ${unit(r.exId, r.best)}</div></div></div>`).join('')}</div>` : ''}
      <div class="card list-card">${e.items.map(it => `<div class="row"><div class="grow"><div class="row-title">${EX[it.exId].name}</div>
        <div class="row-sub">${it.done.map(d => unit(it.exId, d)).join(' · ')}</div></div></div>`).join('')}</div>
      <div class="stack-sm"><a class="btn btn-primary btn-block" href="#/home">${L('Back to home', 'Zurück zum Start')}</a>
        <a class="btn btn-ghost btn-block" href="#/progress">${L('View progress', 'Fortschritt ansehen')}</a></div>`,
  };
}

export { fmtMin };
