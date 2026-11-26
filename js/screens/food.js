import { db } from '../store.js';
import { esc, icon, backBar, sheet, toast, confirmDialog, relDay } from '../ui.js';
import * as F from '../logic/food.js';
import { go, refresh } from '../router.js';

let lastQuery = '';
let lastResults = null;

const DISCLAIMER = 'The colour rating is an approximate information aid based on available nutrition data – not a medical or dietary assessment. Every food can fit into a balanced diet.';

const kcalText = p => p.n.kcal !== null ? `${F.fmtN(p.n.kcal)} kcal` : p.n.kj !== null ? `${F.fmtN(p.n.kj)} kJ` : 'No energy data';

function productRow(p) {
  const r = F.rate(p);
  return `<a class="row" href="#/food/p/${encodeURIComponent(p.code)}">
    ${p.thumb ? `<img class="row-thumb" src="${esc(p.thumb)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;row-thumb empty&quot;></div>'">` : `<div class="row-thumb empty">${icon('food')}</div>`}
    <div class="grow"><div class="row-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div>
      <div class="row-sub">${esc(p.brand || 'Unknown brand')} · ${kcalText(p)} / 100 ${p.liquid ? 'ml' : 'g'}</div></div>
    <span class="dot lv-${r.level}" title="${esc(r.label)}"></span></a>`;
}

function resultsHtml() {
  if (lastResults === 'loading') return `<div class="stack-sm">${[1, 2, 3].map(() => '<div class="skeleton" style="height:68px"></div>').join('')}</div>`;
  if (lastResults?.error) {
    return `<div class="card empty">${icon('info')}<b>${lastResults.error === 'network' ? 'You seem to be offline' : 'Search is unavailable right now'}</b>
      The food database could not be reached. Your saved products still work.<div class="mt"><button class="btn btn-ghost btn-sm" data-retry>Try again</button></div></div>`;
  }
  if (Array.isArray(lastResults)) {
    if (!lastResults.length) return `<div class="card empty">${icon('search')}<b>No products found</b>Try a different name or brand.</div>`;
    return `<p class="eyebrow">Results for “${esc(lastQuery)}”</p><div class="card list-card mt-sm">${lastResults.map(productRow).join('')}</div>`;
  }
  return '';
}

export function render() {
  const html = `<h1 class="h1">Food</h1>
    <p class="muted" style="margin-top:6px">Scan. Understand. Choose well.</p>
    <button class="card scan-card" data-scan>
      <div class="row-icon">${icon('scan')}</div>
      <div class="grow"><p class="h3">Scan a barcode</p><p class="muted small">Use your camera to look up a product.</p></div>${icon('right', 'chev')}</button>
    <form class="row-flex" id="food-search" autocomplete="off">
      <label class="search grow">${icon('search')}<input class="input" name="q" type="search" placeholder="Search a product manually" value="${esc(lastQuery)}" enterkeyhint="search"></label>
    </form>
    <button class="link-btn" data-manual style="margin-top:6px">${icon('keyboard', 'ic-sm')} Enter barcode number</button>
    <div id="food-results">${resultsHtml()}</div>
    ${db.pending.length ? `<div><div class="section-title"><h3 class="h3">Waiting for connection</h3></div>
      <div class="card list-card">${db.pending.map(c => `<div class="row"><div class="row-icon">${icon('scan')}</div>
        <div class="grow"><div class="row-title">${esc(c)}</div><div class="row-sub">Scanned offline</div></div>
        <a class="btn btn-ghost btn-sm" href="#/food/p/${encodeURIComponent(c)}">Look up</a></div>`).join('')}</div></div>` : ''}
    <div><div class="section-title"><h3 class="h3">Your products</h3>${db.foods.length ? `<span class="muted small">${db.foods.length}</span>` : ''}</div>
      ${db.foods.length ? `<div class="card list-card">${db.foods.slice(0, 40).map(productRow).join('')}</div>`
        : `<div class="card empty">${icon('food')}<b>No products yet</b>Scanned and viewed products are saved here – also available offline.</div>`}</div>
    <p class="note">${DISCLAIMER} Data from Open Food Facts.</p>`;

  return {
    html,
    mount(view) {
      const out = view.querySelector('#food-results');
      const run = async q => {
        lastQuery = q;
        lastResults = 'loading';
        out.innerHTML = resultsHtml();
        try { lastResults = await F.search(q); } catch (err) { lastResults = { error: err.kind || 'server' }; }
        if (out.isConnected) out.innerHTML = resultsHtml();
      };
      view.querySelector('#food-search').addEventListener('submit', e => {
        e.preventDefault();
        const q = e.target.q.value.trim();
        e.target.q.blur();
        if (F.validBarcode(q)) { go(`food/p/${q}`); return; }
        if (q.length >= 2) run(q);
      });
      view.addEventListener('click', e => {
        if (e.target.closest('[data-scan]')) openScanner();
        if (e.target.closest('[data-manual]')) manualEntry();
        if (e.target.closest('[data-retry]')) run(lastQuery);
      });
    },
  };
}

function manualEntry() {
  sheet(`<h3 class="sheet-title">Enter barcode</h3><p class="muted small">The number below the barcode (8–14 digits).</p>
    <form id="bc-form" class="mt"><input class="input" name="code" inputmode="numeric" pattern="[0-9]*" maxlength="14" placeholder="e.g. 4000417025005" autocomplete="off">
    <p class="note mt-sm" data-err></p><button class="btn btn-primary btn-block mt">Look up</button></form>`, {
    onMount(el, close) {
      const f = el.querySelector('#bc-form');
      setTimeout(() => f.code.focus(), 300);
      f.addEventListener('submit', e => {
        e.preventDefault();
        const c = f.code.value.replace(/\D/g, '');
        if (!F.validBarcode(c)) { el.querySelector('[data-err]').textContent = 'Please enter 8 to 14 digits.'; return; }
        close(); go(`food/p/${c}`);
      });
    },
  });
}

let zxingLoading;
function loadZXing() {
  if (window.ZXingBrowser) return Promise.resolve();
  zxingLoading = zxingLoading || new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'vendor/zxing-browser.min.js';
    s.onload = res; s.onerror = () => { zxingLoading = null; rej(new Error('load')); };
    document.head.appendChild(s);
  });
  return zxingLoading;
}

async function openScanner() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('Camera is not available here. Enter the barcode instead.');
    return manualEntry();
  }
  const el = document.createElement('div');
  el.className = 'full scanner';
  el.innerHTML = `<video playsinline muted autoplay></video><div class="scan-frame"></div>
    <div class="scan-ui"><div class="between"><button class="icon-btn" data-x aria-label="Close" style="background:rgba(0,0,0,.4)">${icon('x')}</button>
      <span></span></div>
      <div class="stack"><p class="scan-msg" data-msg>Starting camera…</p>
      <button class="btn btn-ghost btn-block" data-type style="background:rgba(28,28,32,.85)">${icon('keyboard', 'ic-sm')} Enter number instead</button></div></div>`;
  document.getElementById('overlay-root').appendChild(el);
  const video = el.querySelector('video');
  const msg = el.querySelector('[data-msg]');
  let stream, controls, stopped = false, loopTimer;

  const stop = () => {
    stopped = true;
    clearTimeout(loopTimer);
    try { controls?.stop(); } catch { /* ignore */ }
    stream?.getTracks().forEach(t => t.stop());
    el.remove();
  };
  const found = code => {
    if (stopped) return;
    navigator.vibrate?.(80);
    stop();
    go(`food/p/${code}`);
  };
  el.querySelector('[data-x]').onclick = stop;
  el.querySelector('[data-type]').onclick = () => { stop(); manualEntry(); };

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (err) {
    msg.textContent = err?.name === 'NotAllowedError'
      ? 'Camera access was denied. Allow it in your browser settings or enter the number.'
      : 'Could not start the camera. Enter the barcode number instead.';
    return;
  }
  if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
  video.srcObject = stream;
  try { await video.play(); } catch { /* autoplay handled by attribute */ }
  msg.textContent = 'Point the camera at the barcode';

  let detector = null;
  if ('BarcodeDetector' in window) {
    try {
      const fm = await window.BarcodeDetector.getSupportedFormats();
      const want = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter(f => fm.includes(f));
      if (want.length) detector = new window.BarcodeDetector({ formats: want });
    } catch { detector = null; }
  }
  if (detector) {
    const loop = async () => {
      if (stopped) return;
      try {
        const codes = await detector.detect(video);
        const c = codes.map(x => x.rawValue).find(F.validBarcode);
        if (c) return found(c);
      } catch { /* frame not ready */ }
      loopTimer = setTimeout(loop, 180);
    };
    loop();
    return;
  }
  try {
    await loadZXing();
    if (stopped) return;
    const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
    controls = await reader.decodeFromStream(stream, video, result => {
      if (result && F.validBarcode(result.getText())) found(result.getText());
    });
  } catch {
    msg.textContent = 'Scanner could not start. Enter the barcode number instead.';
  }
}

// ---------- product page ----------
function nutritionTable(p) {
  const u = p.liquid ? '100 ml' : '100 g';
  const rows = [
    ['Energy', p.n.kcal !== null ? `${F.fmtN(p.n.kcal)} kcal` : p.n.kj !== null ? `${F.fmtN(p.n.kj)} kJ` : null,
      p.s ? (p.s.kcal !== null ? `${F.fmtN(p.s.kcal)} kcal` : p.s.kj !== null ? `${F.fmtN(p.s.kj)} kJ` : null) : null],
    ['Protein', 'protein'], ['Carbohydrates', 'carbs'], ['of which sugars', 'sugar', 1],
    ['Fat', 'fat'], ['of which saturates', 'sat', 1], ['Fibre', 'fibre'], ['Salt', 'salt'],
  ].map(r => {
    if (r[0] === 'Energy') return { name: r[0], a: r[1], b: r[2] };
    const k = r[1];
    return { name: r[0], a: p.n[k] !== null ? `${F.fmtN(p.n[k])} g` : null, b: p.s && p.s[k] !== null ? `${F.fmtN(p.s[k])} g` : null, sub: r[2] };
  });
  const showServing = p.s && rows.some(r => r.b);
  return `<table class="ntable"><thead><tr><th>Nutrition</th><th>Per ${u}</th>${showServing ? `<th>Per portion</th>` : ''}</tr></thead>
    <tbody>${rows.map(r => `<tr class="${r.sub ? 'sub' : ''}"><td>${r.name}</td><td>${r.a ?? '<span class="dim">not available</span>'}</td>${showServing ? `<td>${r.b ?? '<span class="dim">–</span>'}</td>` : ''}</tr>`).join('')}</tbody></table>
    ${showServing && p.servingSize ? `<p class="note mt-sm">Portion: ${esc(p.servingSize)}</p>` : ''}`;
}

function productHtml(p) {
  const r = F.rate(p);
  const saved = db.foods.some(f => f.code === p.code);
  return `${backBar('#/food', '', saved ? `<button class="icon-btn" data-forget aria-label="Remove from history">${icon('trash', 'ic-sm')}</button>` : '')}
    ${p.image ? `<img class="product-img" src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.remove()">` : ''}
    <div><p class="eyebrow">${esc(p.brand || 'Unknown brand')}${p.quantity ? ` · ${esc(p.quantity)}` : ''}</p>
      <h1 class="h2 mt-sm" style="text-transform:none;font-size:30px">${esc(p.name)}</h1><p class="tiny dim mt-sm">Barcode ${esc(p.code)}</p></div>
    <div class="rate lv-${r.level}"><span class="rate-dot"></span><div class="grow">
      <p class="rate-title">${esc(r.label)}</p>
      <ul class="bullets mt-sm">${r.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${r.incomplete && r.level !== 'unknown' ? `<p class="note mt-sm">Some values are missing (${r.missing.map(m => ({ sat: 'saturated fat' }[m] || m)).join(', ')}), so this rating may be unreliable.</p>` : ''}
    </div></div>
    <div class="card">${nutritionTable(p)}</div>
    <div><p class="eyebrow">Ingredients</p><p class="mt-sm" style="color:#D4D4D8;font-size:14px;line-height:1.6">${p.ingredients ? esc(p.ingredients) : '<span class="dim">No ingredient list available.</span>'}</p></div>
    <p class="note">${DISCLAIMER} Values come from Open Food Facts and may differ from the package.</p>`;
}

export function product({ code }) {
  const c = String(code).replace(/\D/g, '');
  const known = F.cached(c);
  if (known) {
    F.remember(known);
    return { html: productHtml(known), mount: bindProduct(known) };
  }
  return {
    html: `${backBar('#/food', '')}<div class="stack" id="prod"><div class="skeleton" style="height:240px"></div>
      <div class="skeleton" style="height:28px;width:70%"></div><div class="skeleton" style="height:90px"></div><p class="muted small center">Looking up ${esc(c)}…</p></div>`,
    async mount(view) {
      const box = view.querySelector('#prod');
      try {
        const p = await F.lookup(c);
        if (!view.isConnected) return;
        if (!p) {
          box.innerHTML = `<div class="card empty">${icon('search')}<b>Product not found.</b>Try searching manually.</div>
            <a class="btn btn-primary btn-block" href="#/food">Search manually</a>`;
          db.pending = db.pending.filter(x => x !== c);
          return;
        }
        F.remember(p);
        refresh();
      } catch (err) {
        if (!view.isConnected) return;
        F.addPending(c);
        box.innerHTML = `<div class="card empty">${icon('info')}<b>${err.kind === 'network' ? 'No connection' : 'Database unavailable'}</b>
          We saved barcode ${esc(c)} and you can look it up later.</div>
          <button class="btn btn-primary btn-block" data-again>Try again</button><a class="btn btn-ghost btn-block" href="#/food">Back to Food</a>`;
        box.querySelector('[data-again]').onclick = () => refresh();
      }
    },
  };
}

const bindProduct = p => view => {
  view.querySelector('[data-forget]')?.addEventListener('click', async () => {
    if (await confirmDialog({ title: 'Remove product?', text: 'It will be removed from your product history.', confirm: 'Remove', danger: true })) {
      F.forget(p.code); go('food');
    }
  });
};

export { relDay };
