import { db } from '../store.js';
import { esc, icon, backBar, toast, confirmDialog } from '../ui.js';
import { allQuotes, dailyQuote, addQuote, removeQuote, toggleFav } from '../logic/quotes.js';
import { MESSAGES } from '../data/quotes.js';
import { weekCount, totals, weekStreak, records } from '../logic/stats.js';
import { refresh } from '../router.js';

let tab = 'all';
let currentId = null;

function progressMessages() {
  const t = totals(), wk = weekCount(0), target = db.planDays.length || 1, streak = weekStreak();
  const out = [];
  if (!t.sessions) out.push('Your first workout is the first brick. Lay it today.');
  else out.push(`You’ve completed ${t.sessions} workout${t.sessions > 1 ? 's' : ''}. That’s ${t.sessions} times you chose yourself.`);
  if (wk >= target) out.push(`Weekly goal reached: ${wk} of ${target}. Respect.`);
  else if (wk > 0) out.push(`${wk} of ${target} this week. ${target - wk} to go.`);
  if (streak > 1) out.push(`${streak} weeks in a row on plan. Discipline is showing.`);
  const r = records().find(x => x.best > x.first);
  if (r) out.push('You’re stronger than when you started. Your records prove it.');
  if (t.seconds > 3600) out.push(`${Math.round(t.seconds / 3600)} hour${t.seconds >= 7200 ? 's' : ''} invested in yourself so far.`);
  return out;
}

export function render() {
  const all = allQuotes();
  const list = tab === 'fav' ? all.filter(q => db.favQuotes.includes(q.id)) : all;
  if (!currentId || !all.some(q => q.id === currentId)) currentId = dailyQuote().id;
  const pool = list.length ? list : all;
  let idx = pool.findIndex(q => q.id === currentId);
  if (idx < 0) { idx = 0; currentId = pool[0].id; }
  const q = pool[idx];
  const fav = db.favQuotes.includes(q.id);

  const reminderSection = () => `${[['discipline', 'Discipline'], ['training', 'Training'], ['consistency', 'Consistency']].map(([k, n]) => `
      <div><p class="eyebrow">${n}</p><div class="card list-card mt-sm">${MESSAGES[k].map(m => `<div class="qrow"><p>${esc(m)}</p></div>`).join('')}</div></div>`).join('')}
    <div><p class="eyebrow">Your progress</p><div class="card list-card mt-sm">${progressMessages().map(m => `<div class="qrow"><p>${esc(m)}</p></div>`).join('')}</div></div>`;

  const quoteList = () => list.length ? `<div class="card list-card">${list.map(x => `<div class="qrow">
      <button class="grow" style="text-align:left" data-show="${x.id}"><p style="${x.id === q.id ? 'font-weight:600' : ''}">${esc(x.text)}</p></button>
      <button class="icon-btn" style="width:34px;height:34px" data-fav="${x.id}" aria-label="Favourite">${icon(db.favQuotes.includes(x.id) ? 'heartFill' : 'heart')}</button>
      ${x.custom ? `<button class="icon-btn" style="width:34px;height:34px" data-rm="${x.id}" aria-label="Delete">${icon('trash')}</button>` : ''}</div>`).join('')}</div>`
    : `<div class="card empty">${icon('heart')}<b>No favourites yet</b>Tap the heart on a quote to save it.</div>`;

  return {
    html: `${backBar('#/profile', 'Motivation')}
      <div class="mq">
        <div>${icon('quote', 'ic-lg')}<p class="mq-text mt">${esc(q.text)}</p></div>
        <div class="mq-foot">
          <button class="icon-btn" data-step="-1" aria-label="Previous">${icon('left')}</button>
          <span class="mq-count">${idx + 1} / ${pool.length}</span>
          <button class="icon-btn" data-fav="${q.id}" aria-label="Favourite">${icon(fav ? 'heartFill' : 'heart')}</button>
          <button class="icon-btn" data-step="1" aria-label="Next">${icon('right')}</button>
        </div></div>
      <p class="note">Sources of these quotes are unverified, so no authors are shown.</p>
      <div class="seg">${[['all', 'All quotes'], ['fav', 'Favourites'], ['msg', 'Reminders']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
      ${tab === 'msg' ? reminderSection() : quoteList()}
      ${tab !== 'msg' ? `<form class="card" id="add-q"><p class="eyebrow">Add your own quote</p>
        <textarea class="input mt-sm" name="t" maxlength="280" placeholder="Type a quote that drives you"></textarea>
        <button class="btn btn-primary btn-block mt-sm">${icon('plus', 'ic-sm')} Add to collection</button></form>` : ''}`,
    mount(view) {
      view.addEventListener('click', async e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.step) { currentId = pool[(idx + Number(b.dataset.step) + pool.length) % pool.length].id; refresh(); }
        else if (b.dataset.fav) { const on = toggleFav(b.dataset.fav); toast(on ? 'Saved to favourites.' : 'Removed from favourites.'); refresh(); }
        else if (b.dataset.tab) { tab = b.dataset.tab; refresh(); }
        else if (b.dataset.show) { currentId = b.dataset.show; refresh(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else if (b.dataset.rm) {
          if (await confirmDialog({ title: 'Delete this quote?', confirm: 'Delete', danger: true })) { removeQuote(b.dataset.rm); refresh(); }
        }
      });
      view.querySelector('#add-q')?.addEventListener('submit', e => {
        e.preventDefault();
        const r = addQuote(e.target.t.value);
        toast(r.ok ? 'Quote added.' : r.msg);
        if (r.ok) { currentId = r.quote.id; tab = 'all'; refresh(); }
      });
    },
  };
}
