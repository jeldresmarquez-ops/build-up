// BUILD UP service worker – offline support.
const VERSION = 'buildup-v1.2.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/i18n.js', 'js/store.js', 'js/ui.js', 'js/router.js',
  'js/data/exercises.js', 'js/data/exercises-de.js', 'js/data/quotes.js', 'js/data/options.js',
  'js/logic/plan.js', 'js/logic/stats.js', 'js/logic/quotes.js', 'js/logic/food.js', 'js/logic/reminders.js', 'js/logic/session.js',
  'js/screens/story.js', 'js/screens/onboarding.js', 'js/screens/startup.js', 'js/screens/home.js', 'js/screens/workout.js',
  'js/screens/session.js', 'js/screens/exercises.js', 'js/screens/food.js', 'js/screens/progress.js', 'js/screens/motivation.js',
  'js/screens/profile.js', 'js/screens/settings.js',
  'vendor/zxing-browser.min.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function networkFirst(req) {
  return new Promise(resolve => {
    let done = false;
    const fallback = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'));
    const timer = setTimeout(() => { if (!done) fallback().then(r => { if (r && !done) { done = true; resolve(r); } }); }, 3500);
    fetch(req, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      if (!done) { done = true; clearTimeout(timer); resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      if (!done) fallback().then(r => { done = true; resolve(r || Response.error()); });
    });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) { e.respondWith(networkFirst(req)); return; }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
      return res;
    }).catch(() => Response.error())));
  }
  // Everything else (Open Food Facts, product images) goes straight to the network.
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list[0];
    return c ? c.focus() : self.clients.openWindow('./');
  }));
});
