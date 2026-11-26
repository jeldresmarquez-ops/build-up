import { db, save } from '../store.js';
import { esc, icon, backBar, toast, DAYS, isStandalone } from '../ui.js';
import { GOALS, AREAS_TO_IMPROVE, EXPERIENCE, MINUTES, label } from '../data/options.js';
import { EXERCISES, EX } from '../data/exercises.js';
import { defaultDays } from '../logic/plan.js';
import { go } from '../router.js';

const menu = (href, ic, title, sub = '') => `<a class="row" href="${href}"><div class="row-icon">${icon(ic)}</div>
  <div class="grow"><div class="row-title">${title}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</div>${icon('right', 'chev')}</a>`;

const tags = (list, empty) => list.length
  ? `<div class="chips mt-sm">${list.map(t => `<span class="tag" style="height:32px;padding:0 12px">${esc(t)}</span>`).join('')}</div>`
  : `<p class="muted small mt-sm">${empty}</p>`;

export function render() {
  const p = db.profile;
  const meta = [p.age ? `${p.age} years` : null, label(EXPERIENCE, p.experience), p.weight ? `${p.weight} kg` : null].filter(Boolean).join(' · ');
  const r = db.reminders;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    html: `<h1 class="h1">Profile</h1>
      <div class="card row-flex" style="gap:16px">
        <div class="avatar avatar-lg">${esc((p.name || 'A')[0].toUpperCase())}</div>
        <div class="grow"><p class="h3" style="font-size:20px">${esc(p.name || 'Athlete')}</p><p class="muted small">${esc(meta)}</p></div>
        <a class="icon-btn" href="#/profile/edit" aria-label="Edit profile">${icon('edit')}</a></div>
      ${!isStandalone() ? `<div class="callout">${icon('phone')}<span><b style="color:var(--text)">Install BUILD UP:</b> ${ios
        ? 'tap the Share button in Safari, then “Add to Home Screen”.'
        : 'open the browser menu and choose “Install app” or “Add to Home screen”.'}</span></div>` : ''}
      <div class="card">
        <p class="eyebrow">Goals</p>${tags(p.goals.map(g => label(GOALS, g)), 'No goals selected.')}
        <p class="eyebrow mt">Focus areas</p>${tags(p.areas.map(a => label(AREAS_TO_IMPROVE, a)), 'No focus areas selected.')}
        <p class="eyebrow mt">Favourite exercises</p>${tags(p.preferred.map(id => EX[id]?.name).filter(Boolean), 'None selected.')}
        <p class="eyebrow mt">Weekly schedule</p>
        <p class="mt-sm">${[...db.planDays].sort().map(d => DAYS[d]).join(' · ') || 'No days'} <span class="muted">· ${p.minutes} min</span></p>
      </div>
      <div class="card list-card">
        ${menu('#/motivation', 'quote', 'Motivation', 'Quotes, favourites and reminders')}
        ${menu('#/progress', 'chart', 'Progress')}
        ${menu('#/history', 'history', 'Workout history')}
      </div>
      <div><p class="eyebrow" style="margin:6px 0 10px">Settings</p>
      <div class="card list-card">
        ${menu('#/settings/reminders', 'bell', 'Notifications', r.enabled ? `On · ${r.time}` : 'Off')}
        ${menu('#/settings/appearance', 'appearance', 'Appearance')}
        ${menu('#/profile/edit', 'edit', 'Edit profile')}
        ${menu('#/settings/data', 'data', 'Data management', 'Backup, reset, delete')}
        ${menu('#/settings/about', 'info', 'About BUILD UP')}
      </div></div>`,
  };
}

export function edit() {
  const p = JSON.parse(JSON.stringify(db.profile));
  const chipGroup = (key, list) => `<div class="chips mt-sm">${list.map(([id, n]) => `<button type="button" class="chip ${p[key].includes(id) ? 'on' : ''}" data-many="${key}" data-id="${id}">${esc(n)}</button>`).join('')}</div>`;
  return {
    html: `${backBar('#/profile', 'Edit profile')}
      <form id="pf" class="stack-lg" autocomplete="off">
        <div class="stack">
          <label class="field"><span>Name</span><input class="input" name="name" maxlength="30" required value="${esc(p.name)}"></label>
          <div class="grid2">
            <label class="field"><span>Age</span><input class="input" name="age" type="number" inputmode="numeric" min="8" max="99" placeholder="Optional" value="${p.age ?? ''}"></label>
            <label class="field"><span>Weight (kg)</span><input class="input" name="weight" type="number" inputmode="decimal" step="0.1" min="20" max="250" placeholder="Optional" value="${p.weight ?? ''}"></label>
          </div></div>
        <div><p class="eyebrow">Experience</p><div class="seg mt-sm">${EXPERIENCE.map(([id, n]) => `<button type="button" class="${p.experience === id ? 'on' : ''}" data-one="experience" data-id="${id}">${n}</button>`).join('')}</div></div>
        <div><p class="eyebrow">Goals</p>${chipGroup('goals', GOALS)}</div>
        <div><p class="eyebrow">Focus areas</p>${chipGroup('areas', AREAS_TO_IMPROVE)}</div>
        <div><p class="eyebrow">Favourite exercises</p>${chipGroup('preferred', EXERCISES.map(e => [e.id, e.name]))}</div>
        <div><p class="eyebrow">Training days</p><div class="daypick mt-sm">${DAYS.map((d, i) => `<button type="button" data-day="${i}" class="${db.planDays.includes(i) ? 'on' : ''}">${d.slice(0, 2)}</button>`).join('')}</div>
          <p class="note mt-sm">Keep at least one rest day per week.</p></div>
        <div><p class="eyebrow">Time per session</p><div class="chips mt-sm">${MINUTES.map(m => `<button type="button" class="chip ${p.minutes === m ? 'on' : ''}" data-one="minutes" data-id="${m}">${m} min</button>`).join('')}</div></div>
        <button class="btn btn-primary btn-block btn-xl" type="submit">Save changes</button>
      </form>`,
    mount(view) {
      const f = view.querySelector('#pf');
      let days = [...db.planDays];
      f.addEventListener('click', e => {
        const b = e.target.closest('button[type="button"]');
        if (!b) return;
        if (b.dataset.many) {
          const k = b.dataset.many, id = b.dataset.id;
          p[k] = p[k].includes(id) ? p[k].filter(x => x !== id) : [...p[k], id];
          b.classList.toggle('on');
        } else if (b.dataset.one) {
          const k = b.dataset.one;
          p[k] = k === 'minutes' ? Number(b.dataset.id) : b.dataset.id;
          b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        } else if (b.dataset.day) {
          const i = Number(b.dataset.day);
          if (days.includes(i)) days = days.filter(x => x !== i);
          else if (days.length < 6) days = [...days, i].sort();
          else { toast('Keep at least one rest day.'); return; }
          b.classList.toggle('on', days.includes(i));
        }
      });
      f.addEventListener('submit', e => {
        e.preventDefault();
        const name = f.name.value.trim();
        if (!name) { toast('Please enter your name.'); return; }
        const age = parseInt(f.age.value, 10), w = parseFloat(f.weight.value);
        p.name = name;
        p.age = age >= 8 && age <= 99 ? age : null;
        p.weight = w >= 20 && w <= 250 ? Math.round(w * 10) / 10 : null;
        if (!days.length) days = defaultDays(p.daysPerWeek);
        const remindersFollowPlan = JSON.stringify([...db.reminders.days].sort()) === JSON.stringify([...db.planDays].sort());
        p.daysPerWeek = days.length;
        db.profile = p;
        db.planDays = days;
        if (remindersFollowPlan) db.reminders.days = [...days];
        save();
        toast('Profile saved.');
        go('profile');
      });
    },
  };
}
