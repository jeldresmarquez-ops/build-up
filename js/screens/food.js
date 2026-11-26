import { db } from '../store.js';
import { esc, icon, backBar, sheet, toast, confirmDialog } from '../ui.js';
import { L } from '../i18n.js';
import * as F from '../logic/food.js';
import { go, refresh } from '../router.js';

let lastQuery = '';
let lastResults = null;

const DISCLAIMER = () => L(
  'The colour rating is an approximate information aid based on available nutrition data – not a medical or dietary assessment. Every food can fit into a balanced diet.',
  'Die Farbbewertung ist eine ungefähre Orientierungshilfe auf Basis der verfügbaren Nährwerte – keine medizinische oder Ernährungsbewertung. Jedes Lebensmittel kann Teil einer ausgewogenen Ernährung sein.');

const kcalText = p => p.n.kcal !== null ? `${F.fmtN(p.n.kcal)} kcal` : p.n.kj !== null ? `${F.fmtN(p.n.kj)} kJ` : L('No energy data', 'Keine Energieangabe');

function productRow(p) {
  const r = F.rate(p);
  return `<a class="row" href="#/food/p/${encodeURIComponent(p.code)}">
    ${p.thumb ? `<img class="row-thumb" src="${esc(p.thumb)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;row-thumb empty&quot;></div>'">` : `<div class="row-thumb empty">${icon('food')}</div>`}
    <div class="grow"><div class="row-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div>
      <div class="row-sub">${esc(p.brand || L('Unknown brand', 'Unbekannte Marke'))} · ${kcalText(p)} / 100 ${p.liquid ? 'ml' : 'g'}</div></div>
    <span class="dot lv-${r.level}" title="${esc(r.label)}"></span></a>`;
}

function resultsHtml() {
  if (lastResults === 'loading') return `<div class="stack-sm">${[1, 2, 3].map(() => '<div class="skeleton" style="height:68px"></div>').join('')}</div>`;
  if (lastResults?.error) {
    return `<div class="card empty">${icon('info')}<b>${lastResults.error === 'network' ? L('You seem to be offline', 'Du scheinst offline zu sein') : L('Search is unavailable right now', 'Die Suche ist gerade nicht verfügbar')}</b>
      ${L('The food database could not be reached. Your saved products still work.', 'Die Lebensmittel-Datenbank ist nicht erreichbar. Deine gespeicherten Produkte funktionieren weiterhin.')}<div class="mt"><button class="btn btn-ghost btn-sm" data-retry>${L('Try again', 'Erneut versuchen')}</button></div></div>`;
  }
  if (Array.isArray(lastResults)) {
    if (!lastResults.length) return `<div class="card empty">${icon('search')}<b>${L('No products found', 'Keine Produkte gefunden')}</b>${L('Try a different name or brand.', 'Versuche einen anderen Namen oder eine andere Marke.')}</div>`;
    return `<p class="eyebrow">${L('Results for “{q}”', 'Ergebnisse für „{q}“', { q: esc(lastQuery) })}</p><div class="card list-card mt-sm">${lastResults.map(productRow).join('')}</div>`;
  }
  return '';
}

export function render() {
  const html = `<h1 class="h1">Food</h1>
    <p class="muted" style="margin-top:6px">${L('Scan. Understand. Choose well.', 'Scannen. Verstehen. Gut wählen.')}</p>
    <button class="card scan-card" data-scan>
      <div class="row-icon">${icon('scan')}</div>
      <div class="grow"><p class="h3">${L('Scan a barcode', 'Barcode scannen')}</p><p class="muted small">${L('Use your camera to look up a product.', 'Mit der Kamera ein Produkt nachschlagen.')}</p></div>${icon('right', 'chev')}</button>
    <form class="row-flex" id="food-search" autocomplete="off">
      <label class="search grow">${icon('search')}<input class="input" name="q" type="search" placeholder="${L('Search a product manually', 'Produkt manuell suchen')}" value="${esc(lastQuery)}" enterkeyhint="search"></label>
    </form>
    <button class="link-btn" data-manual style="margin-top:6px">${icon('keyboard', 'ic-sm')} ${L('Enter barcode number', 'Barcode-Nummer eingeben')}</button>
    <div id="food-results">${resultsHtml()}</div>
    ${db.pending.length ? `<div><div class="section-title"><h3 class="h3">${L('Waiting for connection', 'Wartet auf Verbindung')}</h3></div>
      <div class="card list-card">${db.pending.map(c => `<div class="row"><div class="row-icon">${icon('scan')}</div>
        <div class="grow"><div class="row-title">${esc(c)}</div><div class="row-sub">${L('Scanned offline', 'Offline gescannt')}</div></div>
        <a class="btn btn-ghost btn-sm" href="#/food/p/${encodeURIComponent(c)}">${L('Look up', 'Nachschlagen')}</a></div>`).join('')}</div></div>` : ''}
    <div><div class="section-title"><h3 class="h3">${L('Your products', 'Deine Produkte')}</h3>${db.foods.length ? `<span class="muted small">${db.foods.length}</span>` : ''}</div>
      ${db.foods.length ? `<div class="card list-card">${db.foods.slice(0, 40).map(productRow).join('')}</div>`
        : `<div class="card empty">${icon('food')}<b>${L('No products yet', 'Noch keine Produkte')}</b>${L('Scanned and viewed products are saved here – also available offline.', 'Gescannte und angesehene Produkte werden hier gespeichert – auch offline verfügbar.')}</div>`}</div>
    <p class="note">${DISCLAIMER()} ${L('Data from Open Food Facts.', 'Daten von Open Food Facts.')}</p>`;

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
  sheet(`<h3 class="sheet-title">${L('Enter barcode', 'Barcode eingeben')}</h3><p class="muted small">${L('The number below the barcode (8–14 digits).', 'Die Nummer unter dem Barcode (8–14 Ziffern).')}</p>
    <form id="bc-form" class="mt"><input class="input" name="code" inputmode="numeric" pattern="[0-9]*" maxlength="14" placeholder="${L('e.g.', 'z. B.')} 4000417025005" autocomplete="off">
    <p class="note mt-sm" data-err></p><button class="btn btn-primary btn-block mt">${L('Look up', 'Nachschlagen')}</button></form>`, {
    onMount(el, close) {
      const f = el.querySelector('#bc-form');
      setTimeout(() => f.code.focus(), 300);
      f.addEventListener('submit', e => {
        e.preventDefault();
        const c = f.code.value.replace(/\D/g, '');
        if (!F.validBarcode(c)) { el.querySelector('[data-err]').textContent = L('Please enter 8 to 14 digits.', 'Bitte 8 bis 14 Ziffern eingeben.'); return; }
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
    toast(L('Camera is not available here. Enter the barcode instead.', 'Kamera ist hier nicht verfügbar. Gib den Barcode stattdessen ein.'));
    return manualEntry();
  }
  const el = document.createElement('div');
  el.className = 'full scanner';
  el.innerHTML = `<video playsinline muted autoplay></video><div class="scan-frame"></div>
    <div class="scan-ui"><div class="between"><button class="icon-btn" data-x aria-label="${L('Close', 'Schließen')}" style="background:rgba(0,0,0,.4)">${icon('x')}</button>
      <span></span></div>
      <div class="stack"><p class="scan-msg" data-msg>${L('Starting camera…', 'Kamera startet…')}</p>
      <button class="btn btn-ghost btn-block" data-type style="background:rgba(28,28,32,.85)">${icon('keyboard', 'ic-sm')} ${L('Enter number instead', 'Stattdessen Nummer eingeben')}</button></div></div>`;
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
      ? L('Camera access was denied. Allow it in your browser settings or enter the number.', 'Kamerazugriff wurde verweigert. Erlaube ihn in den Browser-Einstellungen oder gib die Nummer ein.')
      : L('Could not start the camera. Enter the barcode number instead.', 'Kamera konnte nicht starten. Gib stattdessen die Barcode-Nummer ein.');
    return;
  }
  if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
  video.srcObject = stream;
  try { await video.play(); } catch { /* autoplay handled by attribute */ }
  msg.textContent = L('Point the camera at the barcode', 'Halte die Kamera auf den Barcode');

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
    msg.textContent = L('Scanner could not start. Enter the barcode number instead.', 'Scanner konnte nicht starten. Gib stattdessen die Barcode-Nummer ein.');
  }
}

// ---------- product page ----------
function nutritionTable(p) {
  const u = p.liquid ? '100 ml' : '100 g';
  const na = `<span class="dim">${L('not available', 'nicht verfügbar')}</span>`;
  const energy = n => n ? (n.kcal !== null ? `${F.fmtN(n.kcal)} kcal` : n.kj !== null ? `${F.fmtN(n.kj)} kJ` : null) : null;
  const rows = [
    { name: L('Energy', 'Energie'), a: energy(p.n), b: energy(p.s) },
    ...[
      [L('Protein', 'Eiweiß'), 'protein'], [L('Carbohydrates', 'Kohlenhydrate'), 'carbs'], [L('of which sugars', 'davon Zucker'), 'sugar', 1],
      [L('Fat', 'Fett'), 'fat'], [L('of which saturates', 'davon gesättigte Fettsäuren'), 'sat', 1], [L('Fibre', 'Ballaststoffe'), 'fibre'], [L('Salt', 'Salz'), 'salt'],
    ].map(([name, k, sub]) => ({
      name, sub,
      a: p.n[k] !== null ? `${F.fmtN(p.n[k])} g` : null,
      b: p.s && p.s[k] !== null ? `${F.fmtN(p.s[k])} g` : null,
    })),
  ];
  const showServing = p.s && rows.some(r => r.b);
  return `<table class="ntable"><thead><tr><th>${L('Nutrition', 'Nährwerte')}</th><th>${L('Per', 'Pro')} ${u}</th>${showServing ? `<th>${L('Per portion', 'Pro Portion')}</th>` : ''}</tr></thead>
    <tbody>${rows.map(r => `<tr class="${r.sub ? 'sub' : ''}"><td>${r.name}</td><td>${r.a ?? na}</td>${showServing ? `<td>${r.b ?? '<span class="dim">–</span>'}</td>` : ''}</tr>`).join('')}</tbody></table>
    ${showServing && p.servingSize ? `<p class="note mt-sm">${L('Portion', 'Portion')}: ${esc(p.servingSize)}</p>` : ''}`;
}

const MISSING = { sugar: () => L('sugar', 'Zucker'), sat: () => L('saturated fat', 'gesättigte Fettsäuren'), salt: () => L('salt', 'Salz'), fat: () => L('fat', 'Fett') };

function productHtml(p) {
  const r = F.rate(p);
  const saved = db.foods.some(f => f.code === p.code);
  return `${backBar('#/food', '', saved ? `<button class="icon-btn" data-forget aria-label="${L('Remove from history', 'Aus Verlauf entfernen')}">${icon('trash', 'ic-sm')}</button>` : '')}
    ${p.image ? `<img class="product-img" src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.remove()">` : ''}
    <div><p class="eyebrow">${esc(p.brand || L('Unknown brand', 'Unbekannte Marke'))}${p.quantity ? ` · ${esc(p.quantity)}` : ''}</p>
      <h1 class="h2 mt-sm" style="text-transform:none;font-size:30px">${esc(p.name)}</h1><p class="tiny dim mt-sm">Barcode ${esc(p.code)}</p></div>
    <div class="rate lv-${r.level}"><span class="rate-dot"></span><div class="grow">
      <p class="rate-title">${esc(r.label)}</p>
      <ul class="bullets mt-sm">${r.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${r.incomplete && r.level !== 'unknown' ? `<p class="note mt-sm">${L('Some values are missing ({m}), so this rating may be unreliable.', 'Einige Werte fehlen ({m}), daher ist diese Bewertung evtl. ungenau.', { m: r.missing.map(m => MISSING[m]()).join(', ') })}</p>` : ''}
    </div></div>
    <div class="card">${nutritionTable(p)}</div>
    <div><p class="eyebrow">${L('Ingredients', 'Zutaten')}</p><p class="mt-sm" style="color:#D4D4D8;font-size:14px;line-height:1.6">${p.ingredients ? esc(p.ingredients) : `<span class="dim">${L('No ingredient list available.', 'Keine Zutatenliste verfügbar.')}</span>`}</p></div>
    <p class="note">${DISCLAIMER()} ${L('Values come from Open Food Facts and may differ from the package.', 'Die Werte stammen von Open Food Facts und können von der Verpackung abweichen.')}</p>`;
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
      <div class="skeleton" style="height:28px;width:70%"></div><div class="skeleton" style="height:90px"></div><p class="muted small center">${L('Looking up {c}…', 'Suche {c}…', { c: esc(c) })}</p></div>`,
    async mount(view) {
      const box = view.querySelector('#prod');
      try {
        const p = await F.lookup(c);
        if (!view.isConnected) return;
        if (!p) {
          box.innerHTML = `<div class="card empty">${icon('search')}<b>${L('Product not found.', 'Produkt nicht gefunden.')}</b>${L('Try searching manually.', 'Versuche die manuelle Suche.')}</div>
            <a class="btn btn-primary btn-block" href="#/food">${L('Search manually', 'Manuell suchen')}</a>`;
          db.pending = db.pending.filter(x => x !== c);
          return;
        }
        F.remember(p);
        refresh();
      } catch (err) {
        if (!view.isConnected) return;
        F.addPending(c);
        box.innerHTML = `<div class="card empty">${icon('info')}<b>${err.kind === 'network' ? L('No connection', 'Keine Verbindung') : L('Database unavailable', 'Datenbank nicht erreichbar')}</b>
          ${L('We saved barcode {c} and you can look it up later.', 'Wir haben den Barcode {c} gespeichert – du kannst ihn später nachschlagen.', { c: esc(c) })}</div>
          <button class="btn btn-primary btn-block" data-again>${L('Try again', 'Erneut versuchen')}</button><a class="btn btn-ghost btn-block" href="#/food">${L('Back to Food', 'Zurück zu Food')}</a>`;
        box.querySelector('[data-again]').onclick = () => refresh();
      }
    },
  };
}

const bindProduct = p => view => {
  view.querySelector('[data-forget]')?.addEventListener('click', async () => {
    if (await confirmDialog({ title: L('Remove product?', 'Produkt entfernen?'), text: L('It will be removed from your product history.', 'Es wird aus deinem Produktverlauf entfernt.'), confirm: L('Remove', 'Entfernen'), danger: true })) {
      F.forget(p.code); go('food');
    }
  });
};
