// "Check for updates": compare the installed version with the one on the server, then reload.
// Your data (profile, workouts, products) lives in localStorage and is not touched.
export async function latestVersion() {
  const res = await fetch(`sw.js?check=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('server');
  const m = /buildup-v([\d.]+)/.exec(await res.text());
  if (!m) throw new Error('format');
  return m[1];
}

export function isNewer(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

// Fetch the new files, drop the old offline copy, restart the app.
export async function applyUpdate() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
  } catch { /* offline support unavailable */ }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  } catch { /* no cache storage */ }
  location.reload();
}
