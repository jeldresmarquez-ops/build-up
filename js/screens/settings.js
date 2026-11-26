import { db, save, replaceAll, resetAll } from '../store.js';
import { esc, icon, backBar, toast, confirmDialog, download, DAYS, DAYS_LONG, weekdayIdx, ACCENTS, applyAppearance, logo } from '../ui.js';
import { askPermission, notificationsSupported, nextReminder, buildICS, MESSAGE } from '../logic/reminders.js';
import { refresh } from '../router.js';

export const VERSION = '1.0.0';

export function render({ page }) {
  const fn = { reminders, appearance, data, about }[page];
  return fn ? fn() : { html: `${backBar('#/profile', 'Settings')}<div class="empty"><b>Page not found</b></div>` };
}

const toggleRow = (id, title, sub, on) => `<label class="row" for="${id}" style="cursor:pointer">
  <div class="grow"><div class="row-title">${title}</div>${sub ? `<div class="row-sub" style="white-space:normal">${sub}</div>` : ''}</div>
  <span class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i></i></span></label>`;

function reminders() {
  const r = db.reminders;
  const perm = notificationsSupported() ? Notification.permission : 'unsupported';
  const next = nextReminder();
  return {
    html: `${backBar('#/profile', 'Notifications')}
      <div class="card list-card">
        ${toggleRow('r-on', 'Training reminders', 'Get reminded on your training days.', r.enabled)}
        ${r.enabled ? toggleRow('r-push', 'System notifications', perm === 'unsupported' ? 'Not supported in this browser – in-app reminders are used.' : perm === 'denied' ? 'Blocked in your browser settings – in-app reminders are used.' : 'Show a notification while BUILD UP is open or in the background.', r.notify && perm === 'granted') : ''}
      </div>
      ${r.enabled ? `
      <div class="card stack">
        <label class="field"><span>Time</span><input class="input" type="time" id="r-time" value="${esc(r.time)}"></label>
        <div><span class="field"><span>Days</span></span><div class="daypick">${DAYS.map((d, i) => `<button type="button" data-d="${i}" class="${r.days.includes(i) ? 'on' : ''}">${d.slice(0, 2)}</button>`).join('')}</div></div>
        <p class="muted small">${next ? `Next: ${DAYS_LONG[weekdayIdx(next)]} at ${next.toTimeString().slice(0, 5)}` : 'Choose at least one day.'}</p>
      </div>
      <div class="card">
        <p class="eyebrow">Preview</p>
        <div class="row-flex mt-sm"><div class="row-icon">${logo('sm').replace('<span>BUILD UP</span>', '')}</div><div><p class="row-title">BUILD UP</p><p class="muted small">${MESSAGE}</p></div></div>
        <button class="btn btn-ghost btn-sm mt" data-test>Send test reminder</button>
      </div>
      <div class="card">
        <p class="h3">Reliable phone reminders</p>
        <p class="muted small mt-sm">Web apps can’t schedule alerts while they are fully closed. Add your reminders to your phone’s calendar to get an alarm every training day – even when BUILD UP is closed.</p>
        <button class="btn btn-primary btn-block mt" data-ics>${icon('calendar', 'ic-sm')} Add to calendar</button>
      </div>` : ''}`,
    mount(view) {
      view.querySelector('#r-on').addEventListener('change', async e => {
        r.enabled = e.target.checked;
        if (r.enabled && !r.days.length) r.days = [...db.planDays];
        save(); refresh();
      });
      view.querySelector('#r-push')?.addEventListener('change', async e => {
        if (e.target.checked) {
          const res = await askPermission();
          r.notify = res === 'granted';
          if (res !== 'granted') toast(res === 'unsupported' ? 'Notifications are not supported here.' : 'Permission not granted. In-app reminders stay active.');
        } else r.notify = false;
        save(); refresh();
      });
      view.querySelector('#r-time')?.addEventListener('change', e => { r.time = e.target.value || '18:00'; r.lastFired = null; save(); refresh(); });
      view.addEventListener('click', async e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.d) {
          const i = Number(b.dataset.d);
          r.days = r.days.includes(i) ? r.days.filter(x => x !== i) : [...r.days, i].sort();
          save(); refresh();
        }
        if (b.matches('[data-test]')) {
          if (r.notify && Notification.permission === 'granted') {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('BUILD UP', { body: MESSAGE, icon: 'icons/icon-192.png', tag: 'buildup-test' });
          } else toast(`BUILD UP – ${MESSAGE}`);
        }
        if (b.matches('[data-ics]')) {
          if (!r.days.length) { toast('Choose at least one day first.'); return; }
          download('buildup-reminders.ics', buildICS(), 'text/calendar');
          toast('Open the file to add it to your calendar.');
        }
      });
    },
  };
}

function appearance() {
  const s = db.settings;
  return {
    html: `${backBar('#/profile', 'Appearance')}
      <div><p class="eyebrow">Accent colour</p>
        <div class="grid2 mt-sm">${Object.entries(ACCENTS).map(([k, a]) => `<button class="card card-tight row-flex" data-accent="${k}" style="${s.accent === k ? 'border-color:var(--text)' : ''}">
          <span style="width:26px;height:26px;border-radius:50%;background:${a.color};flex:none"></span><span class="row-title grow">${a.name}</span>
          ${s.accent === k ? icon('check', 'ic-sm') : ''}</button>`).join('')}</div></div>
      <div class="card list-card">${toggleRow('a-motion', 'Animations', 'Smooth transitions and effects.', s.motion !== false)}</div>
      <p class="note">BUILD UP uses a dark design for focus and comfort.</p>`,
    mount(view) {
      view.addEventListener('click', e => {
        const b = e.target.closest('[data-accent]');
        if (!b) return;
        s.accent = b.dataset.accent; save(); applyAppearance(); refresh();
      });
      view.querySelector('#a-motion').addEventListener('change', e => { s.motion = e.target.checked; save(); applyAppearance(); });
    },
  };
}

function data() {
  return {
    html: `${backBar('#/profile', 'Data management')}
      <div class="callout">${icon('shield')}<span>All your data is stored only on this device. Nothing is uploaded. Product lookups send only the barcode or search term to Open Food Facts.</span></div>
      <div class="card list-card">
        <button class="row" data-act="export"><div class="row-icon">${icon('download')}</div><div class="grow"><div class="row-title">Export backup</div><div class="row-sub">Save your data as a file</div></div></button>
        <label class="row" style="cursor:pointer"><div class="row-icon">${icon('upload')}</div><div class="grow"><div class="row-title">Import backup</div><div class="row-sub">Restore from a BUILD UP file</div></div>
          <input type="file" accept="application/json,.json" data-import hidden></label>
      </div>
      <div class="card list-card">
        <button class="row" data-act="foods"><div class="row-icon">${icon('food')}</div><div class="grow"><div class="row-title">Clear product history</div><div class="row-sub">${db.foods.length} saved products</div></div></button>
        <button class="row" data-act="progress"><div class="row-icon">${icon('refresh')}</div><div class="grow"><div class="row-title">Reset training progress</div><div class="row-sub">${db.history.length} workouts</div></div></button>
        <button class="row" data-act="all"><div class="row-icon" style="color:var(--bad)">${icon('trash')}</div><div class="grow"><div class="row-title text-danger">Delete all data</div><div class="row-sub">Profile, progress, favourites, everything</div></div></button>
      </div>`,
    mount(view) {
      view.querySelector('[data-import]').addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const obj = JSON.parse(await file.text());
          if (!obj || typeof obj !== 'object' || !('profile' in obj)) throw new Error('format');
          if (!(await confirmDialog({ title: 'Restore backup?', text: 'Your current data will be replaced by the backup.', confirm: 'Restore' }))) return;
          replaceAll(obj);
          toast('Backup restored.');
          setTimeout(() => location.reload(), 600);
        } catch { toast('This file is not a valid BUILD UP backup.'); }
      });
      view.addEventListener('click', async e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'export') {
          download(`buildup-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(db, null, 2));
          return;
        }
        if (act === 'foods' && await confirmDialog({ title: 'Clear product history?', text: 'All saved products will be removed.', confirm: 'Clear', danger: true })) {
          db.foods = []; db.pending = []; save(); toast('Product history cleared.'); refresh();
        }
        if (act === 'progress' && await confirmDialog({ title: 'Reset training progress?', text: 'All workouts, records and the running session will be deleted. This cannot be undone.', confirm: 'Reset progress', danger: true })) {
          db.history = []; db.session = null; save(); toast('Progress reset.'); refresh();
        }
        if (act === 'all' && await confirmDialog({ title: 'Delete all data?', text: 'Your profile, progress, favourites and settings will be permanently deleted from this device. This cannot be undone.', confirm: 'Delete everything', danger: true })) {
          resetAll();
          location.hash = '';
          location.reload();
        }
      });
    },
  };
}

function about() {
  return {
    html: `${backBar('#/profile', 'About')}
      <div class="center mt">${logo('lg')}<p class="h2 mt">Become better.</p><p class="tagline mt-sm">TRAIN. EAT. GROW. REPEAT.</p></div>
      <div class="card"><p class="muted">BUILD UP is about building yourself up – physically, mentally and through discipline. One workout, one healthy choice, one better decision at a time.</p></div>
      <div class="card list-card">
        <div class="row"><div class="grow"><div class="row-title">Version</div></div><span class="muted">${VERSION}</span></div>
        <div class="row"><div class="grow"><div class="row-title">Food data</div><div class="row-sub" style="white-space:normal">Open Food Facts – open database (ODbL), maintained by volunteers.</div></div></div>
        <div class="row"><div class="grow"><div class="row-title">Your data</div><div class="row-sub" style="white-space:normal">Stored only on this device.</div></div></div>
      </div>
      <div class="card"><p class="eyebrow">Good to know</p>
        <ul class="bullets mt-sm">
          <li>Exercise videos are not included yet – each exercise has written technique steps.</li>
          <li>Food ratings are an approximate guide, not medical advice.</li>
          <li>Reminders show while the app is open; use “Add to calendar” for alarms when it’s closed.</li>
          <li>Quote sources are unverified; no authors are attributed.</li>
          <li>Train within your limits. If you have health concerns, talk to a doctor first.</li>
        </ul></div>
      <button class="btn btn-ghost btn-block" data-story>Watch the BUILD UP story again</button>`,
    mount(view) {
      view.querySelector('[data-story]').addEventListener('click', async () => {
        const { show } = await import('./story.js');
        show(() => { location.hash = '#/home'; });
      });
    },
  };
}
