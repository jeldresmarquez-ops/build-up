import { db, save } from '../store.js';
import { esc, icon, DAYS } from '../ui.js';
import { GOALS, AREAS_TO_IMPROVE, EXPERIENCE, MINUTES, DAYS_PER_WEEK } from '../data/options.js';
import { EXERCISES } from '../data/exercises.js';
import { defaultDays, cycle, CAT } from '../logic/plan.js';

const opt = (on, title, sub = '', attrs = '') => `<button type="button" class="opt ${on ? 'on' : ''}" ${attrs}>
  <span class="grow"><span class="row-title">${esc(title)}</span>${sub ? `<span class="row-sub" style="white-space:normal">${esc(sub)}</span>` : ''}</span>
  <span class="opt-check">${icon('check')}</span></button>`;

export function show(done) {
  const p = JSON.parse(JSON.stringify(db.profile));
  const toggle = (key, id) => { p[key] = p[key].includes(id) ? p[key].filter(x => x !== id) : [...p[key], id]; };

  const steps = [
    {
      title: 'Let’s get to know you.', sub: 'Your name is all we need. The rest is optional.',
      body: () => `<div class="stack">
        <label class="field"><span>Name</span><input class="input" id="f-name" maxlength="30" autocomplete="given-name" placeholder="Your name" value="${esc(p.name)}"></label>
        <div class="grid2">
          <label class="field"><span>Age</span><input class="input" id="f-age" type="number" inputmode="numeric" min="8" max="99" placeholder="Optional" value="${p.age ?? ''}"></label>
          <label class="field"><span>Weight (kg)</span><input class="input" id="f-weight" type="number" inputmode="decimal" min="20" max="250" placeholder="Optional" value="${p.weight ?? ''}"></label>
        </div>
        <p class="note">Everything you enter stays on this device.</p></div>`,
      read(el) {
        p.name = el.querySelector('#f-name').value.trim();
        const age = parseInt(el.querySelector('#f-age').value, 10);
        const w = parseFloat(el.querySelector('#f-weight').value);
        p.age = age >= 8 && age <= 99 ? age : null;
        p.weight = w >= 20 && w <= 250 ? Math.round(w * 10) / 10 : null;
      },
      valid: el => el.querySelector('#f-name').value.trim().length > 0,
      live: true,
    },
    {
      title: 'Your training experience', sub: 'So we can set the right starting level.',
      body: () => EXPERIENCE.map(([id, t, s]) => opt(p.experience === id, t, s, `data-one="experience" data-id="${id}"`)).join(''),
    },
    {
      title: 'What do you want to achieve?', sub: 'Choose all that apply.', optional: true,
      body: () => GOALS.map(([id, t]) => opt(p.goals.includes(id), t, '', `data-many="goals" data-id="${id}"`)).join(''),
    },
    {
      title: 'Areas to improve', sub: 'We’ll focus your plan on them.', optional: true,
      body: () => AREAS_TO_IMPROVE.map(([id, t]) => opt(p.areas.includes(id), t, '', `data-many="areas" data-id="${id}"`)).join(''),
    },
    {
      title: 'Exercises you enjoy', sub: 'They’ll show up more often in your workouts.', optional: true,
      body: () => `<div class="chips">${EXERCISES.map(e => `<button type="button" class="chip ${p.preferred.includes(e.id) ? 'on' : ''}" data-many="preferred" data-id="${e.id}">${esc(e.name)}</button>`).join('')}</div>`,
    },
    {
      title: 'Your week', sub: 'Be realistic. Consistency beats intensity.',
      body: () => `<div class="stack-lg">
        <div><p class="eyebrow">Training days per week</p>
          <div class="seg mt-sm">${DAYS_PER_WEEK.map(n => `<button type="button" class="${p.daysPerWeek === n ? 'on' : ''}" data-set="daysPerWeek" data-v="${n}">${n}</button>`).join('')}</div>
          ${p.daysPerWeek >= 6 ? '<p class="note mt-sm">Keep at least one full rest day. Recovery is part of training.</p>' : ''}</div>
        <div><p class="eyebrow">Time per session</p>
          <div class="chips mt-sm">${MINUTES.map(m => `<button type="button" class="chip ${p.minutes === m ? 'on' : ''}" data-set="minutes" data-v="${m}">${m} min</button>`).join('')}</div></div>
      </div>`,
    },
    {
      title: 'When should we remind you?', sub: 'Pick a time that fits your day.', optional: true,
      body: () => `<label class="field"><span>Reminder time</span><input class="input" id="f-time" type="time" value="${esc(p.reminderTime || '18:00')}"></label>
        <p class="note mt">You can switch reminders on or off later in Profile.</p>`,
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
        <button class="icon-btn" type="button" data-back ${i === 0 ? 'style="visibility:hidden"' : ''} aria-label="Back">${icon('left')}</button>
        <div class="bar"><i style="width:${((i + 1) / (steps.length + 1)) * 100}%"></i></div>
        <button class="link-btn" type="button" data-skip ${s.optional ? '' : 'style="visibility:hidden"'}>Skip</button>
      </div>
      <div class="onb-body"><h1 class="onb-title">${esc(s.title)}</h1><p class="onb-sub">${esc(s.sub)}</p><div>${s.body()}</div></div>
      <div class="onb-foot"><button class="btn btn-primary btn-block btn-xl" type="button" data-next>Continue</button></div>`;
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
        <p class="eyebrow">Your plan is ready</p>
        <h1 class="onb-title mt-sm">Welcome to BUILD UP, ${esc(p.name)}.</h1>
        <p class="onb-sub">${p.daysPerWeek} sessions per week · ${p.minutes} min each. You can change this anytime.</p>
        <div class="card list-card">${days.map((d, k) => `<div class="row"><div class="row-icon">${icon('workout')}</div>
          <div class="grow"><div class="row-title">${CAT[cyc[k % cyc.length]].name}</div><div class="row-sub">${DAYS[d]}</div></div></div>`).join('')}</div>
        <p class="note mt">All other days are rest days. Rest is where you grow.</p>
      </div>
      <div class="onb-foot"><button class="btn btn-primary btn-block btn-xl" type="button" data-final>Start building</button></div>`;
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
