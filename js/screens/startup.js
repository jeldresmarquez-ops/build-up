import { esc, logo } from '../ui.js';
import { L } from '../i18n.js';
import { nextQuote } from '../logic/quotes.js';

// Short motivational splash on every launch (~3 s, skippable).
export function show() {
  const q = nextQuote();
  const el = document.createElement('div');
  el.className = 'startup';
  el.innerHTML = `<button class="startup-skip" type="button">${L('Skip', 'Überspringen')}</button>
    <div class="startup-inner">${logo('lg')}<blockquote>${esc(q.text)}</blockquote></div>
    <div class="startup-bar"><i></i></div>`;
  document.getElementById('overlay-root').appendChild(el);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    el.classList.add('out');
    setTimeout(() => el.remove(), 450);
  };
  el.addEventListener('click', close);
  setTimeout(close, 3200);
}
