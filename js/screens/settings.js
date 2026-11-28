import { db, save, replaceAll, resetAll } from '../store.js';
import { esc, icon, backBar, toast, confirmDialog, download, DAYS, DAYS_LONG, weekdayIdx, ACCENTS, applyAppearance, logo } from '../ui.js';
import { L, lang, setLang } from '../i18n.js';
import { askPermission, notificationsSupported, nextReminder, buildICS, MESSAGE } from '../logic/reminders.js';
import { refresh } from '../router.js';
import { resetProgression } from '../logic/progression.js';

export const VERSION = '1.7.0';

export function render({ page }) {
  const fn = { language, reminders, appearance, data, about }[page];
  return fn ? fn() : { html: `${backBar('#/profile', L('Settings', 'Einstellungen'))}<div class="empty"><b>${L('Page not found', 'Seite nicht gefunden')}</b></div>` };
}

const toggleRow = (id, title, sub, on) => `<label class="row" for="${id}" style="cursor:pointer">
  <div class="grow"><div class="row-title">${title}</div>${sub ? `<div class="row-sub" style="white-space:normal">${sub}</div>` : ''}</div>
  <span class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i></i></span></label>`;

function language() {
  const opt = (code, name, sub) => `<button type="button" class="opt ${lang === code ? 'on' : ''}" data-lang="${code}">
    <span class="grow"><span class="row-title">${name}</span><span class="row-sub" style="display:block">${sub}</span></span>
    <span class="opt-check">${icon('check')}</span></button>`;
  return {
    html: `${backBar('#/profile', L('Language', 'Sprache'))}
      <p class="muted">${L('Choose the language for the whole app.', 'Wähle die Sprache für die ganze App.')}</p>
      <div>${opt('en', 'English', 'Englisch')}${opt('de', 'Deutsch', 'German')}</div>
      <p class="note">${L('Your motivational quotes stay in their original English wording.', 'Deine Motivationszitate bleiben im englischen Originalwortlaut.')}</p>`,
    mount(view) {
      view.addEventListener('click', e => {
        const b = e.target.closest('[data-lang]');
        if (b && b.dataset.lang !== lang) setLang(b.dataset.lang);
      });
    },
  };
}

function reminders() {
  const r = db.reminders;
  const perm = notificationsSupported() ? Notification.permission : 'unsupported';
  const next = nextReminder();
  const pushSub = perm === 'unsupported' ? L('Not supported in this browser – in-app reminders are used.', 'In diesem Browser nicht unterstützt – es werden In-App-Erinnerungen genutzt.')
    : perm === 'denied' ? L('Blocked in your browser settings – in-app reminders are used.', 'In den Browser-Einstellungen blockiert – es werden In-App-Erinnerungen genutzt.')
    : L('Show a notification while BUILD UP is open or in the background.', 'Zeigt eine Benachrichtigung, solange BUILD UP offen oder im Hintergrund ist.');
  return {
    html: `${backBar('#/profile', L('Notifications', 'Benachrichtigungen'))}
      <div class="card list-card">
        ${toggleRow('r-on', L('Training reminders', 'Trainings-Erinnerungen'), L('Get reminded on your training days.', 'Werde an deinen Trainingstagen erinnert.'), r.enabled)}
        ${r.enabled ? toggleRow('r-push', L('System notifications', 'System-Benachrichtigungen'), pushSub, r.notify && perm === 'granted') : ''}
      </div>
      ${r.enabled ? `
      <div class="card stack">
        <label class="field"><span>${L('Time', 'Uhrzeit')}</span><input class="input" type="time" id="r-time" value="${esc(r.time)}"></label>
        <div><span class="field"><span>${L('Days', 'Tage')}</span></span><div class="daypick">${DAYS.map((d, i) => `<button type="button" data-d="${i}" class="${r.days.includes(i) ? 'on' : ''}">${d.slice(0, 2)}</button>`).join('')}</div></div>
        <p class="muted small">${next ? L('Next: {d} at {t}', 'Nächste: {d} um {t}', { d: DAYS_LONG[weekdayIdx(next)], t: next.toTimeString().slice(0, 5) }) : L('Choose at least one day.', 'Wähle mindestens einen Tag.')}</p>
      </div>
      <div class="card">
        <p class="eyebrow">${L('Preview', 'Vorschau')}</p>
        <div class="row-flex mt-sm"><div class="row-icon">${logo('sm').replace('<span>BUILD UP</span>', '')}</div><div><p class="row-title">BUILD UP</p><p class="muted small">${MESSAGE}</p></div></div>
        <button class="btn btn-ghost btn-sm mt" data-test>${L('Send test reminder', 'Test-Erinnerung senden')}</button>
      </div>
      <div class="card">
        <p class="h3">${L('Reliable phone reminders', 'Zuverlässige Handy-Erinnerungen')}</p>
        <p class="muted small mt-sm">${L('Web apps can’t schedule alerts while they are fully closed. Add your reminders to your phone’s calendar to get an alarm every training day – even when BUILD UP is closed.', 'Web-Apps können keine Erinnerungen senden, wenn sie komplett geschlossen sind. Trag deine Erinnerungen in den Handy-Kalender ein, dann bekommst du an jedem Trainingstag einen Alarm – auch wenn BUILD UP geschlossen ist.')}</p>
        <button class="btn btn-primary btn-block mt" data-ics>${icon('calendar', 'ic-sm')} ${L('Add to calendar', 'Zum Kalender hinzufügen')}</button>
      </div>` : ''}`,
    mount(view) {
      view.querySelector('#r-on').addEventListener('change', e => {
        r.enabled = e.target.checked;
        if (r.enabled && !r.days.length) r.days = [...db.planDays];
        save(); refresh();
      });
      view.querySelector('#r-push')?.addEventListener('change', async e => {
        if (e.target.checked) {
          const res = await askPermission();
          r.notify = res === 'granted';
          if (res !== 'granted') toast(res === 'unsupported' ? L('Notifications are not supported here.', 'Benachrichtigungen werden hier nicht unterstützt.') : L('Permission not granted. In-app reminders stay active.', 'Keine Erlaubnis erteilt. In-App-Erinnerungen bleiben aktiv.'));
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
          if (!r.days.length) { toast(L('Choose at least one day first.', 'Wähle zuerst mindestens einen Tag.')); return; }
          download('buildup-reminders.ics', buildICS(), 'text/calendar');
          toast(L('Open the file to add it to your calendar.', 'Öffne die Datei, um sie zum Kalender hinzuzufügen.'));
        }
      });
    },
  };
}

function appearance() {
  const s = db.settings;
  return {
    html: `${backBar('#/profile', L('Appearance', 'Darstellung'))}
      <div><p class="eyebrow">${L('Accent colour', 'Akzentfarbe')}</p>
        <div class="grid2 mt-sm">${Object.entries(ACCENTS).map(([k, a]) => `<button class="card card-tight row-flex" data-accent="${k}" style="${s.accent === k ? 'border-color:var(--text)' : ''}">
          <span style="width:26px;height:26px;border-radius:50%;background:${a.color};flex:none"></span><span class="row-title grow">${a.name}</span>
          ${s.accent === k ? icon('check', 'ic-sm') : ''}</button>`).join('')}</div></div>
      <div class="card list-card">${toggleRow('a-motion', L('Animations', 'Animationen'), L('Smooth transitions and effects.', 'Sanfte Übergänge und Effekte.'), s.motion !== false)}</div>
      <p class="note">${L('BUILD UP uses a dark design for focus and comfort.', 'BUILD UP nutzt ein dunkles Design für Fokus und Komfort.')}</p>`,
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
    html: `${backBar('#/profile', L('Data management', 'Datenverwaltung'))}
      <div class="callout">${icon('shield')}<span>${L('All your data is stored only on this device. Nothing is uploaded. Product lookups send only the barcode or search term to Open Food Facts.', 'Alle deine Daten werden nur auf diesem Gerät gespeichert. Nichts wird hochgeladen. Bei Produktabfragen wird nur der Barcode oder Suchbegriff an Open Food Facts gesendet.')}</span></div>
      <div class="card list-card">
        <button class="row" data-act="export"><div class="row-icon">${icon('download')}</div><div class="grow"><div class="row-title">${L('Export backup', 'Backup exportieren')}</div><div class="row-sub">${L('Save your data as a file', 'Deine Daten als Datei sichern')}</div></div></button>
        <label class="row" style="cursor:pointer"><div class="row-icon">${icon('upload')}</div><div class="grow"><div class="row-title">${L('Import backup', 'Backup importieren')}</div><div class="row-sub">${L('Restore from a BUILD UP file', 'Aus einer BUILD UP-Datei wiederherstellen')}</div></div>
          <input type="file" accept="application/json,.json" data-import hidden></label>
      </div>
      <div class="card list-card">
        <button class="row" data-act="foods"><div class="row-icon">${icon('food')}</div><div class="grow"><div class="row-title">${L('Clear product history', 'Produktverlauf löschen')}</div><div class="row-sub">${L('{n} saved products', '{n} gespeicherte Produkte', { n: db.foods.length })}</div></div></button>
        <button class="row" data-act="progress"><div class="row-icon">${icon('refresh')}</div><div class="grow"><div class="row-title">${L('Reset training progress', 'Trainingsfortschritt zurücksetzen')}</div><div class="row-sub">${L('{n} workouts', '{n} Trainings', { n: db.history.length })}</div></div></button>
        <button class="row" data-act="prog"><div class="row-icon">${icon('chart')}</div><div class="grow"><div class="row-title">${L('Reset progression', 'Steigerung zurücksetzen')}</div><div class="row-sub">${L('Back to the standard reps', 'Zurück zu den Standard-Wiederholungen')}</div></div></button>
        <button class="row" data-act="all"><div class="row-icon" style="color:var(--bad)">${icon('trash')}</div><div class="grow"><div class="row-title text-danger">${L('Delete all data', 'Alle Daten löschen')}</div><div class="row-sub">${L('Profile, progress, favourites, everything', 'Profil, Fortschritt, Favoriten, alles')}</div></div></button>
      </div>`,
    mount(view) {
      view.querySelector('[data-import]').addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const obj = JSON.parse(await file.text());
          if (!obj || typeof obj !== 'object' || !('profile' in obj)) throw new Error('format');
          if (!(await confirmDialog({ title: L('Restore backup?', 'Backup wiederherstellen?'), text: L('Your current data will be replaced by the backup.', 'Deine aktuellen Daten werden durch das Backup ersetzt.'), confirm: L('Restore', 'Wiederherstellen') }))) return;
          replaceAll(obj);
          toast(L('Backup restored.', 'Backup wiederhergestellt.'));
          setTimeout(() => location.reload(), 600);
        } catch { toast(L('This file is not a valid BUILD UP backup.', 'Diese Datei ist kein gültiges BUILD UP-Backup.')); }
      });
      view.addEventListener('click', async e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'export') {
          download(`buildup-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(db, null, 2));
          return;
        }
        if (act === 'foods' && await confirmDialog({ title: L('Clear product history?', 'Produktverlauf löschen?'), text: L('All saved products will be removed.', 'Alle gespeicherten Produkte werden entfernt.'), confirm: L('Clear', 'Löschen'), danger: true })) {
          db.foods = []; db.pending = []; save(); toast(L('Product history cleared.', 'Produktverlauf gelöscht.')); refresh();
        }
        if (act === 'prog' && await confirmDialog({ title: L('Reset progression?', 'Steigerung zurücksetzen?'), text: L('All exercises go back to the standard number of reps for your level.', 'Alle Übungen gehen zurück auf die Standard-Wiederholungen für dein Level.'), confirm: L('Reset', 'Zurücksetzen'), danger: true })) {
          resetProgression(); toast(L('Progression reset.', 'Steigerung zurückgesetzt.')); refresh();
        }
        if (act === 'progress' && await confirmDialog({ title: L('Reset training progress?', 'Trainingsfortschritt zurücksetzen?'), text: L('All workouts, records and the running session will be deleted. This cannot be undone.', 'Alle Trainings, Rekorde und das laufende Training werden gelöscht. Das kann nicht rückgängig gemacht werden.'), confirm: L('Reset progress', 'Zurücksetzen'), danger: true })) {
          db.history = []; db.session = null; db.progress = {}; save(); toast(L('Progress reset.', 'Fortschritt zurückgesetzt.')); refresh();
        }
        if (act === 'all' && await confirmDialog({ title: L('Delete all data?', 'Alle Daten löschen?'), text: L('Your profile, progress, favourites and settings will be permanently deleted from this device. This cannot be undone.', 'Dein Profil, Fortschritt, Favoriten und Einstellungen werden dauerhaft von diesem Gerät gelöscht. Das kann nicht rückgängig gemacht werden.'), confirm: L('Delete everything', 'Alles löschen'), danger: true })) {
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
    html: `${backBar('#/profile', L('About', 'Über'))}
      <div class="center mt">${logo('lg')}<p class="h2 mt">Become better.</p><p class="tagline mt-sm">TRAIN. EAT. GROW. REPEAT.</p></div>
      <div class="card"><p class="muted">${L('BUILD UP is about building yourself up – physically, mentally and through discipline. One workout, one healthy choice, one better decision at a time.', 'Bei BUILD UP geht es darum, dich selbst aufzubauen – körperlich, mental und durch Disziplin. Ein Training, eine gesunde Entscheidung, eine bessere Wahl nach der anderen.')}</p></div>
      <div class="card list-card">
        <div class="row"><div class="grow"><div class="row-title">${L('Version', 'Version')}</div></div><span class="muted">${VERSION}</span></div>
        <div class="row"><div class="grow"><div class="row-title">${L('Food data', 'Lebensmitteldaten')}</div><div class="row-sub" style="white-space:normal">${L('Open Food Facts – open database (ODbL), maintained by volunteers.', 'Open Food Facts – offene Datenbank (ODbL), gepflegt von Freiwilligen.')}</div></div></div>
        <div class="row"><div class="grow"><div class="row-title">${L('Your data', 'Deine Daten')}</div><div class="row-sub" style="white-space:normal">${L('Stored only on this device.', 'Nur auf diesem Gerät gespeichert.')}</div></div></div>
      </div>
      <div class="card"><p class="eyebrow">${L('Good to know', 'Gut zu wissen')}</p>
        <ul class="bullets mt-sm">
          <li>${L('Each exercise is shown by an animated figure plus written technique steps. Real videos can be added later.', 'Jede Übung zeigt eine animierte Figur und eine schriftliche Anleitung. Echte Videos können später ergänzt werden.')}</li>
          <li>${L('Food ratings are an approximate guide, not medical advice.', 'Die Food-Bewertungen sind eine grobe Orientierung, keine medizinische Beratung.')}</li>
          <li>${L('Reminders show while the app is open; use “Add to calendar” for alarms when it’s closed.', 'Erinnerungen erscheinen, solange die App offen ist; für Alarme bei geschlossener App „Zum Kalender hinzufügen“ nutzen.')}</li>
          <li>${L('Quote sources are unverified; no authors are attributed.', 'Die Quellen der Zitate sind nicht bestätigt; es werden keine Autoren genannt.')}</li>
          <li>${L('Train within your limits. If you have health concerns, talk to a doctor first.', 'Trainiere innerhalb deiner Grenzen. Bei gesundheitlichen Bedenken sprich vorher mit einem Arzt.')}</li>
        </ul></div>
      <button class="btn btn-ghost btn-block" data-story>${L('Watch the BUILD UP story again', 'Die BUILD UP-Geschichte nochmal ansehen')}</button>`,
    mount(view) {
      view.querySelector('[data-story]').addEventListener('click', async () => {
        const { show } = await import('./story.js');
        show(() => { location.hash = '#/home'; });
      });
    },
  };
}
