import { db, save } from '../store.js';
import { esc, icon, backBar, toast, DAYS, isStandalone } from '../ui.js';
import { L, lang, setLang } from '../i18n.js';
import { VERSION } from './settings.js';
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
  const meta = [p.age ? L('{n} years', '{n} Jahre', { n: p.age }) : null, label(EXPERIENCE, p.experience), p.weight ? `${p.weight} kg` : null].filter(Boolean).join(' · ');
  const r = db.reminders;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    html: `<h1 class="h1">${L('Profile', 'Profil')}</h1>
      <div class="card row-flex" style="gap:16px">
        <div class="avatar avatar-lg">${esc((p.name || 'A')[0].toUpperCase())}</div>
        <div class="grow"><p class="h3" style="font-size:20px">${esc(p.name || 'Athlete')}</p><p class="muted small">${esc(meta)}</p></div>
        <a class="icon-btn" href="#/profile/edit" aria-label="${L('Edit profile', 'Profil bearbeiten')}">${icon('edit')}</a></div>
      <div class="card card-tight"><div class="row-flex" style="margin-bottom:10px">${icon('globe', 'ic-sm')}<span class="row-title">Sprache / Language</span></div>
        <div class="seg"><button type="button" class="${lang === 'de' ? 'on' : ''}" data-lang="de">Deutsch</button><button type="button" class="${lang === 'en' ? 'on' : ''}" data-lang="en">English</button></div></div>
      ${!isStandalone() ? `<div class="callout" style="flex-wrap:wrap">${icon('phone')}<span class="grow"><b style="color:var(--text)">${L('Install BUILD UP:', 'BUILD UP installieren:')}</b> ${ios
        ? L('tap the Share button in Safari, then “Add to Home Screen”.', 'tippe in Safari auf „Teilen“ und dann auf „Zum Home-Bildschirm“.')
        : L('in Chrome, open the menu (⋮) and choose “Install app”.', 'öffne in Chrome das Menü (⋮) und wähle „App installieren“.')}</span>
        <button class="btn btn-accent btn-sm btn-block" data-install ${window.__bpInstall ? '' : 'hidden'}>${icon('download', 'ic-sm')} ${L('Install now', 'Jetzt installieren')}</button></div>` : ''}
      <div class="card">
        <p class="eyebrow">${L('Goals', 'Ziele')}</p>${tags(p.goals.map(g => label(GOALS, g)), L('No goals selected.', 'Keine Ziele gewählt.'))}
        <p class="eyebrow mt">${L('Focus areas', 'Schwerpunkte')}</p>${tags(p.areas.map(a => label(AREAS_TO_IMPROVE, a)), L('No focus areas selected.', 'Keine Schwerpunkte gewählt.'))}
        <p class="eyebrow mt">${L('Favourite exercises', 'Lieblingsübungen')}</p>${tags(p.preferred.map(id => EX[id]?.name).filter(Boolean), L('None selected.', 'Keine gewählt.'))}
        <p class="eyebrow mt">${L('Weekly schedule', 'Wochenplan')}</p>
        <p class="mt-sm">${[...db.planDays].sort().map(d => DAYS[d]).join(' · ') || L('No days', 'Keine Tage')} <span class="muted">· ${p.minutes} min</span></p>
      </div>
      <div class="card list-card">
        ${menu('#/motivation', 'quote', L('Motivation', 'Motivation'), L('Quotes, favourites and reminders', 'Zitate, Favoriten und Impulse'))}
        ${menu('#/sick', 'shield', L('Sick mode', 'Krank-Modus'), L('Easy plan when you are sick', 'Einfacher Plan, wenn du krank bist'))}
        ${menu('#/progress', 'chart', L('Progress', 'Fortschritt'))}
        ${menu('#/history', 'history', L('Workout history', 'Trainingsverlauf'))}
      </div>
      <div><p class="eyebrow" style="margin:6px 0 10px">${L('Settings', 'Einstellungen')}</p>
      <div class="card list-card">
        ${menu('#/settings/language', 'globe', L('Language', 'Sprache'), lang === 'de' ? 'Deutsch' : 'English')}
        ${menu('#/settings/reminders', 'bell', L('Notifications', 'Benachrichtigungen'), r.enabled ? `${L('On', 'An')} · ${r.time}` : L('Off', 'Aus'))}
        ${menu('#/settings/appearance', 'appearance', L('Appearance', 'Darstellung'))}
        ${menu('#/profile/edit', 'edit', L('Edit profile', 'Profil bearbeiten'))}
        ${menu('#/settings/data', 'data', L('Data management', 'Datenverwaltung'), L('Backup, reset, delete', 'Sichern, zurücksetzen, löschen'))}
        ${menu('#/settings/about', 'info', L('About BUILD UP', 'Über BUILD UP'))}
      </div></div>
      <p class="note center">BUILD UP · Version ${VERSION}</p>`,
    mount(view) {
      view.addEventListener('click', async e => {
        const b = e.target.closest('[data-lang]');
        if (b && b.dataset.lang !== lang) setLang(b.dataset.lang);
        if (e.target.closest('[data-install]') && window.__bpInstall) {
          const ev = window.__bpInstall;
          window.__bpInstall = null;
          ev.prompt();
          try { await ev.userChoice; } catch { /* ignore */ }
          view.querySelector('[data-install]')?.setAttribute('hidden', '');
        }
      });
      // Chrome on Android tells us when one-tap install is possible.
      const show = () => view.querySelector('[data-install]')?.removeAttribute('hidden');
      document.addEventListener('bp-installable', show);
      return () => document.removeEventListener('bp-installable', show);
    },
  };
}

export function edit() {
  const p = JSON.parse(JSON.stringify(db.profile));
  const chipGroup = (key, list) => `<div class="chips mt-sm">${list.map(([id, n]) => `<button type="button" class="chip ${p[key].includes(id) ? 'on' : ''}" data-many="${key}" data-id="${id}">${esc(n)}</button>`).join('')}</div>`;
  return {
    html: `${backBar('#/profile', L('Edit profile', 'Profil bearbeiten'))}
      <form id="pf" class="stack-lg" autocomplete="off">
        <div class="stack">
          <label class="field"><span>${L('Name', 'Name')}</span><input class="input" name="name" maxlength="30" required value="${esc(p.name)}"></label>
          <div class="grid2">
            <label class="field"><span>${L('Age', 'Alter')}</span><input class="input" name="age" type="number" inputmode="numeric" min="8" max="99" placeholder="${L('Optional', 'Optional')}" value="${p.age ?? ''}"></label>
            <label class="field"><span>${L('Weight (kg)', 'Gewicht (kg)')}</span><input class="input" name="weight" type="number" inputmode="decimal" step="0.1" min="20" max="250" placeholder="${L('Optional', 'Optional')}" value="${p.weight ?? ''}"></label>
          </div></div>
        <div><p class="eyebrow">${L('Experience', 'Erfahrung')}</p><div class="seg mt-sm">${EXPERIENCE.map(([id, n]) => `<button type="button" class="${p.experience === id ? 'on' : ''}" data-one="experience" data-id="${id}">${n}</button>`).join('')}</div></div>
        <div><p class="eyebrow">${L('Goals', 'Ziele')}</p>${chipGroup('goals', GOALS)}</div>
        <div><p class="eyebrow">${L('Focus areas', 'Schwerpunkte')}</p>${chipGroup('areas', AREAS_TO_IMPROVE)}</div>
        <div><p class="eyebrow">${L('Favourite exercises', 'Lieblingsübungen')}</p>${chipGroup('preferred', EXERCISES.map(e => [e.id, e.name]))}</div>
        <div><p class="eyebrow">${L('Training days', 'Trainingstage')}</p><div class="daypick mt-sm">${DAYS.map((d, i) => `<button type="button" data-day="${i}" class="${db.planDays.includes(i) ? 'on' : ''}">${d.slice(0, 2)}</button>`).join('')}</div>
          <p class="note mt-sm">${L('Keep at least one rest day per week.', 'Plane mindestens einen Ruhetag pro Woche ein.')}</p></div>
        <div><p class="eyebrow">${L('Time per session', 'Zeit pro Training')}</p><div class="chips mt-sm">${MINUTES.map(m => `<button type="button" class="chip ${p.minutes === m ? 'on' : ''}" data-one="minutes" data-id="${m}">${m} min</button>`).join('')}</div></div>
        <button class="btn btn-primary btn-block btn-xl" type="submit">${L('Save changes', 'Änderungen speichern')}</button>
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
          else { toast(L('Keep at least one rest day.', 'Behalte mindestens einen Ruhetag.')); return; }
          b.classList.toggle('on', days.includes(i));
        }
      });
      f.addEventListener('submit', e => {
        e.preventDefault();
        const name = f.name.value.trim();
        if (!name) { toast(L('Please enter your name.', 'Bitte gib deinen Namen ein.')); return; }
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
        toast(L('Profile saved.', 'Profil gespeichert.'));
        go('profile');
      });
    },
  };
}
