// BUILD UP service worker – offline support with MANUAL updates.
// The app files are kept in one fixed cache ("buildup-app") and are always served from there.
// New versions on the server are NOT picked up automatically: they only arrive when the user taps
// Profile → "Check for updates" → "Update now", which clears this cache and reloads the app.
// VERSION is what the update button compares against – bump it on every release.
const VERSION = 'buildup-v1.8.0';
const APP_CACHE = 'buildup-app';
const FONT_CACHE = 'buildup-fonts';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/i18n.js', 'js/figure.js', 'js/store.js', 'js/ui.js', 'js/router.js',
  'js/data/exercises.js', 'js/data/animations.js', 'js/data/exercises-de.js', 'js/data/quotes.js', 'js/data/options.js',
  'js/logic/plan.js', 'js/logic/stats.js', 'js/logic/quotes.js', 'js/logic/food.js', 'js/logic/reminders.js', 'js/logic/session.js', 'js/logic/update.js', 'js/logic/progression.js',
  'js/screens/story.js', 'js/screens/onboarding.js', 'js/screens/startup.js', 'js/screens/home.js', 'js/screens/workout.js',
  'js/screens/session.js', 'js/screens/exercises.js', 'js/screens/food.js', 'js/screens/progress.js', 'js/screens/motivation.js',
  'js/screens/profile.js', 'js/screens/settings.js', 'js/screens/sick.js',
  'vendor/zxing-browser.min.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

// Only fill in files that are missing – files already stored stay exactly as they are.
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await Promise.all(SHELL.map(async url => {
      if (await cache.match(url)) return;
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res.ok) await cache.put(url, res);
      } catch { /* offline – fetched later */ }
    }));
    await self.skipWaiting();
  })());
});

// Remove caches from older app versions (they used per-version cache names).
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== APP_CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function cacheFirst(req) {
  const cache = await caches.open(APP_CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try {
    const res = await fetch(req, { cache: 'reload' });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    if (req.mode === 'navigate') {
      const index = await cache.match('index.html') || await cache.match('./');
      if (index) return index;
    }
    return Response.error();
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // The update check must always ask the server.
    if (url.pathname.endsWith('/sw.js') || url.searchParams.has('check')) return;
    e.respondWith(cacheFirst(req));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      c.put(req, res.clone());
      return res;
    }))).catch(() => Response.error()));
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
