import { db, save } from '../store.js';
import { esc, icon, DAYS } from '../ui.js';
import { L, lang, setLang } from '../i18n.js';
import { GOALS, AREAS_TO_IMPROVE, EXPERIENCE, MINUTES, DAYS_PER_WEEK } from '../data/options.js';
import { EXERCISES } from '../data/exercises.js';
import { defaultDays, cycle, CAT } from '../logic/plan.js';

const opt = (on, title, sub = '', attrs = '') => `<button type="button" class="opt ${on ? 'on' : ''}" ${attrs}>
  <span class="grow"><span class="row-title">${esc(title)}</span>${sub ? `<span class="row-sub" style="white-space:normal;display:block">${esc(sub)}</span>` : ''}</span>
  <span class="opt-check">${icon('check')}</span></button>`;

export function show(done) {
  const p = JSON.parse(JSON.stringify(db.profile));
  const toggle = (key, id) => { p[key] = p[key].includes(id) ? p[key].filter(x => x !== id) : [...p[key], id]; };

  const steps = [
    {
      title: L('Let’s get to know you.', 'Lass uns kennenlernen.'),
      sub: L('Your name is all we need. The rest is optional.', 'Wir brauchen nur deinen Namen. Der Rest ist freiwillig.'),
      body: () => `<div class="stack">
        <div class="seg" style="margin-bottom:6px">
          <button type="button" class="${lang === 'en' ? 'on' : ''}" data-lang="en">English</button>
          <button type="button" class="${lang === 'de' ? 'on' : ''}" data-lang="de">Deutsch</button></div>
        <label class="field"><span>${L('Name', 'Name')}</span><input class="input" id="f-name" maxlength="30" autocomplete="given-name" placeholder="${L('Your name', 'Dein Name')}" value="${esc(p.name)}"></label>
        <div class="grid2">
          <label class="field"><span>${L('Age', 'Alter')}</span><input class="input" id="f-age" type="number" inputmode="numeric" min="8" max="99" placeholder="${L('Optional', 'Optional')}" value="${p.age ?? ''}"></label>
          <label class="field"><span>${L('Weight (kg)', 'Gewicht (kg)')}</span><input class="input" id="f-weight" type="number" inputmode="decimal" min="20" max="250" placeholder="${L('Optional', 'Optional')}" value="${p.weight ?? ''}"></label>
        </div>
        <p class="note">${L('Everything you enter stays on this device.', 'Alles, was du eingibst, bleibt auf diesem Gerät.')}</p></div>`,
      read(el) {
        p.name = el.querySelector('#f-name').value.trim();
        const age = parseInt(el.querySelector('#f-age').value, 10);
        const w = parseFloat(el.querySelector('#f-weight').value);
        p.age = age >= 8 && age <= 99 ? age : null;
        p.weight = w >= 20 && w <= 250 ? Math.round(w * 10) / 10 : null;
      },
      valid: el => el.querySelector('#f-name').value.trim().length > 0,
    },
    {
      title: L('Your training experience', 'Deine Trainingserfahrung'),
      sub: L('So we can set the right starting level.', 'Damit wir das richtige Startlevel wählen.'),
      body: () => EXPERIENCE.map(([id, t, s]) => opt(p.experience === id, t, s, `data-one="experience" data-id="${id}"`)).join(''),
    },
    {
      title: L('What do you want to achieve?', 'Was willst du erreichen?'),
      sub: L('Choose all that apply.', 'Wähle alles, was passt.'), optional: true,
      body: () => GOALS.map(([id, t]) => opt(p.goals.includes(id), t, '', `data-many="goals" data-id="${id}"`)).join(''),
    },
    {
      title: L('Areas to improve', 'Was willst du verbessern?'),
      sub: L('We’ll focus your plan on them.', 'Darauf legen wir den Fokus in deinem Plan.'), optional: true,
      body: () => AREAS_TO_IMPROVE.map(([id, t]) => opt(p.areas.includes(id), t, '', `data-many="areas" data-id="${id}"`)).join(''),
    },
    {
      title: L('Exercises you enjoy', 'Übungen, die du magst'),
      sub: L('They’ll show up more often in your workouts.', 'Sie kommen öfter in deinen Trainings vor.'), optional: true,
      body: () => `<div class="chips">${EXERCISES.map(e => `<button type="button" class="chip ${p.preferred.includes(e.id) ? 'on' : ''}" data-many="preferred" data-id="${e.id}">${esc(e.name)}</button>`).join('')}</div>`,
    },
    {
      title: L('Your week', 'Deine Woche'),
      sub: L('Be realistic. Consistency beats intensity.', 'Sei realistisch. Beständigkeit schlägt Intensität.'),
      body: () => `<div class="stack-lg">
        <div><p class="eyebrow">${L('Training days per week', 'Trainingstage pro Woche')}</p>
          <div class="seg mt-sm">${DAYS_PER_WEEK.map(n => `<button type="button" class="${p.daysPerWeek === n ? 'on' : ''}" data-set="daysPerWeek" data-v="${n}">${n}</button>`).join('')}</div>
          ${p.daysPerWeek >= 6 ? `<p class="note mt-sm">${L('Keep at least one full rest day. Recovery is part of training.', 'Plane mindestens einen ganzen Ruhetag ein. Erholung gehört zum Training.')}</p>` : ''}</div>
        <div><p class="eyebrow">${L('Time per session', 'Zeit pro Training')}</p>
          <div class="chips mt-sm">${MINUTES.map(m => `<button type="button" class="chip ${p.minutes === m ? 'on' : ''}" data-set="minutes" data-v="${m}">${m} min</button>`).join('')}</div></div>
      </div>`,
    },
    {
      title: L('When should we remind you?', 'Wann sollen wir dich erinnern?'),
      sub: L('Pick a time that fits your day.', 'Wähle eine Uhrzeit, die zu deinem Tag passt.'), optional: true,
      body: () => `<label class="field"><span>${L('Reminder time', 'Erinnerungszeit')}</span><input class="input" id="f-time" type="time" value="${esc(p.reminderTime || '18:00')}"></label>
        <p class="note mt">${L('You can switch reminders on or off later in Profile.', 'Du kannst Erinnerungen später im Profil ein- oder ausschalten.')}</p>`,
      read(el) { p.reminderTime = el.querySelector('#f-time').value || '18:00'; },
    },
  ];

  const el = document.createElement('div');
  el.className = 'onb';
  document.getElementById('overlay-root').appendChild(el);
  let i = 0;

  function paint() {
    const s = steps[i];
    el.innerHTML = `<div class="onb-top">
        <button class="icon-btn" type="button" data-back ${i === 0 ? 'style="visibility:hidden"' : ''} aria-label="${L('Back', 'Zurück')}">${icon('left')}</button>
        <div class="bar"><i style="width:${((i + 1) / (steps.length + 1)) * 100}%"></i></div>
        <button class="link-btn" type="button" data-skip ${s.optional ? '' : 'style="visibility:hidden"'}>${L('Skip', 'Überspringen')}</button>
      </div>
      <div class="onb-body"><h1 class="onb-title">${esc(s.title)}</h1><p class="onb-sub">${esc(s.sub)}</p><div>${s.body()}</div></div>
      <div class="onb-foot"><button class="btn btn-primary btn-block btn-xl" type="button" data-next>${L('Continue', 'Weiter')}</button></div>`;
    updateValid();
    const first = el.querySelector('input');
    if (first && i === 0 && !p.name) setTimeout(() => first.focus(), 350);
  }
  function updateValid() {
    const s = steps[i];
    const btn = el.querySelector('[data-next]');
    if (btn && s.valid) btn.disabled = !s.valid(el);
  }
  function next() {
    const s = steps[i];
    if (s.valid && !s.valid(el)) return;
    s.read?.(el);
    if (i < steps.length - 1) { i++; paint(); } else summary();
  }

  el.addEventListener('input', updateValid);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); next(); } });
  el.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.lang) { if (t.dataset.lang !== lang) setLang(t.dataset.lang); return; }
    if (t.matches('[data-back]')) { steps[i].read?.(el); i = Math.max(0, i - 1); paint(); return; }
    if (t.matches('[data-skip]')) { if (i < steps.length - 1) { i++; paint(); } else summary(); return; }
    if (t.matches('[data-next]')) { next(); return; }
    if (t.matches('[data-final]')) { finish(); return; }
    if (t.dataset.one) { p[t.dataset.one] = t.dataset.id; paint(); return; }
    if (t.dataset.many) { toggle(t.dataset.many, t.dataset.id); t.classList.toggle('on'); return; }
    if (t.dataset.set) { p[t.dataset.set] = Number(t.dataset.v); paint(); }
  });

  function summary() {
    const days = defaultDays(p.daysPerWeek);
    const cyc = cycle(p);
    el.innerHTML = `<div class="onb-top"><div class="bar"><i style="width:100%"></i></div></div>
      <div class="onb-body">
        <p class="eyebrow">${L('Your plan is ready', 'Dein Plan ist fertig')}</p>
        <h1 class="onb-title mt-sm">${L('Welcome to BUILD UP, {name}.', 'Willkommen bei BUILD UP, {name}.', { name: esc(p.name) })}</h1>
        <p class="onb-sub">${L('{d} sessions per week · {m} min each. You can change this anytime.', '{d} Trainings pro Woche · je {m} Min. Du kannst das jederzeit ändern.', { d: p.daysPerWeek, m: p.minutes })}</p>
        <div class="card list-card">${days.map((d, k) => `<div class="row"><div class="row-icon">${icon('workout')}</div>
          <div class="grow"><div class="row-title">${CAT[cyc[k % cyc.length]].name}</div><div class="row-sub">${DAYS[d]}</div></div></div>`).join('')}</div>
        <p class="note mt">${L('All other days are rest days. Rest is where you grow.', 'Alle anderen Tage sind Ruhetage. In der Pause wächst du.')}</p>
      </div>
      <div class="onb-foot"><button class="btn btn-primary btn-block btn-xl" type="button" data-final>${L('Start building', 'Los geht’s')}</button></div>`;
  }

  function finish() {
    db.profile = p;
    db.planDays = defaultDays(p.daysPerWeek);
    db.reminders.time = p.reminderTime || '18:00';
    db.reminders.days = [...db.planDays];
    db.onboarded = true;
    save();
    el.style.transition = 'opacity .4s';
    el.style.opacity = '0';
    setTimeout(() => { el.remove(); done(); }, 400);
  }

  paint();
}
