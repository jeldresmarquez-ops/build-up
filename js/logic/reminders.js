// Reminders: in-app + system notifications while the app runs, calendar export for reliable alerts.
import { db, save } from '../store.js';
import { dayKey, weekdayIdx, toast } from '../ui.js';
import { entriesOn } from './plan.js';

export const notificationsSupported = () => 'Notification' in window && 'serviceWorker' in navigator;

export async function askPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

const parseTime = t => { const [h, m] = String(t || '18:00').split(':').map(Number); return [h || 0, m || 0]; };

export function nextReminder(from = new Date()) {
  const r = db.reminders;
  if (!r.enabled || !r.days.length) return null;
  const [h, m] = parseTime(r.time);
  for (let i = 0; i < 8; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, h, m);
    if (d > from && r.days.includes(weekdayIdx(d))) return d;
  }
  return null;
}

export const MESSAGE = 'Time to work on yourself.';

async function fire() {
  const body = MESSAGE;
  if (db.reminders.notify && notificationsSupported() && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('BUILD UP', { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'buildup-reminder' });
      return;
    } catch { /* fall through to in-app */ }
  }
  toast(`BUILD UP – ${body}`);
}

function check() {
  const r = db.reminders;
  if (!r.enabled) return;
  const now = new Date();
  const k = dayKey(now);
  if (r.lastFired === k || !r.days.includes(weekdayIdx(now))) return;
  const [h, m] = parseTime(r.time);
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  // Fire within 3 hours after the chosen time, and only if you haven't trained yet today.
  if (now >= due && now - due < 3 * 3600e3 && !entriesOn(k).length) {
    r.lastFired = k; save(); fire();
  }
}

export function startLoop() {
  check();
  setInterval(check, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}

// Due today and not yet trained – used for the in-app banner.
export function dueToday() {
  const r = db.reminders;
  const now = new Date();
  if (!r.enabled || !r.days.includes(weekdayIdx(now)) || entriesOn(dayKey(now)).length) return null;
  const [h, m] = parseTime(r.time);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
}

const ICS_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const pad = n => String(n).padStart(2, '0');
const icsLocal = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

export function buildICS() {
  const r = db.reminders;
  const start = nextReminder(new Date(Date.now() - 60000)) || new Date();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const mins = db.profile.minutes || 20;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BUILD UP//Reminders//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:buildup-reminder-${Date.now()}@buildup.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsLocal(start)}`,
    `DURATION:PT${mins}M`,
    `RRULE:FREQ=WEEKLY;BYDAY=${[...r.days].sort().map(d => ICS_DAYS[d]).join(',')}`,
    'SUMMARY:BUILD UP – Time to work on yourself.',
    'DESCRIPTION:TRAIN. EAT. GROW. REPEAT.',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:BUILD UP – Time to work on yourself.', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
