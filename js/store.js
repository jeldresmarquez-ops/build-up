// Local persistence for BUILD UP. Everything stays on the device (localStorage).
const KEY = 'buildup.v1';

const defaults = () => ({
  v: 1,
  storySeen: false,
  onboarded: false,
  profile: {
    name: '', age: null, weight: null,
    experience: 'beginner', goals: [], areas: [], preferred: [],
    daysPerWeek: 3, minutes: 20, reminderTime: '18:00',
  },
  planDays: [0, 2, 4], // 0 = Monday … 6 = Sunday
  history: [],
  session: null,
  favExercises: [],
  customQuotes: [],
  favQuotes: [],
  rotation: { queue: [], last: null },
  foods: [],
  pending: [],
  reminders: { enabled: false, time: '18:00', days: [0, 2, 4], lastFired: null, notify: false },
  settings: { accent: 'electric', motion: true, lang: null },
});

function merge(p) {
  const d = defaults();
  p = p && typeof p === 'object' ? p : {};
  return {
    ...d, ...p,
    profile: { ...d.profile, ...(p.profile || {}) },
    reminders: { ...d.reminders, ...(p.reminders || {}) },
    settings: { ...d.settings, ...(p.settings || {}) },
    rotation: { ...d.rotation, ...(p.rotation || {}) },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? merge(JSON.parse(raw)) : defaults();
  } catch {
    return defaults();
  }
}

export const db = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('BUILD UP: could not save', e);
  }
}

export function replaceAll(obj) {
  const next = merge(obj);
  for (const k of Object.keys(db)) delete db[k];
  Object.assign(db, next);
  save();
}

export const resetAll = () => replaceAll({});

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
