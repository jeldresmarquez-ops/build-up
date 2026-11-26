import { db } from '../store.js';
import { esc, icon, backBar, toast, confirmDialog } from '../ui.js';
import { L, lang } from '../i18n.js';
import { allQuotes, dailyQuote, addQuote, removeQuote, toggleFav } from '../logic/quotes.js';
import { MESSAGES } from '../data/quotes.js';
import { weekCount, totals, weekStreak, records } from '../logic/stats.js';
import { refresh } from '../router.js';

let tab = 'all';
let currentId = null;

function progressMessages() {
  const t = totals(), wk = weekCount(0), target = db.planDays.length || 1, streak = weekStreak();
  const out = [];
  if (!t.sessions) out.push(L('Your first workout is the first brick. Lay it today.', 'Dein erstes Training ist der erste Baustein. Leg ihn heute.'));
  else out.push(L('You’ve completed {n} workouts. That’s {n} times you chose yourself.', 'Du hast {n} Trainings geschafft. {n} Mal hast du dich für dich entschieden.', { n: t.sessions }));
  if (wk >= target) out.push(L('Weekly goal reached: {a} of {b}. Respect.', 'Wochenziel erreicht: {a} von {b}. Respekt.', { a: wk, b: target }));
  else if (wk > 0) out.push(L('{a} of {b} this week. {c} to go.', '{a} von {b} diese Woche. Noch {c}.', { a: wk, b: target, c: target - wk }));
  if (streak > 1) out.push(L('{n} weeks in a row on plan. Discipline is showing.', '{n} Wochen in Folge im Plan. Die Disziplin zeigt sich.', { n: streak }));
  if (records().some(x => x.best > x.first)) out.push(L('You’re stronger than when you started. Your records prove it.', 'Du bist stärker als am Anfang. Deine Rekorde beweisen es.'));
  if (t.seconds > 3600) out.push(L('{n} hours invested in yourself so far.', 'Bisher {n} Stunden in dich investiert.', { n: Math.round(t.seconds / 3600) }));
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
  const favLbl = L('Favourite', 'Favorit');

  const reminderSection = () => `${[['discipline', L('Discipline', 'Disziplin')], ['training', L('Training', 'Training')], ['consistency', L('Consistency', 'Beständigkeit')]].map(([k, n]) => `
      <div><p class="eyebrow">${n}</p><div class="card list-card mt-sm">${MESSAGES[k].map(m => `<div class="qrow"><p>${esc(m)}</p></div>`).join('')}</div></div>`).join('')}
    <div><p class="eyebrow">${L('Your progress', 'Dein Fortschritt')}</p><div class="card list-card mt-sm">${progressMessages().map(m => `<div class="qrow"><p>${esc(m)}</p></div>`).join('')}</div></div>`;

  const quoteList = () => list.length ? `<div class="card list-card">${list.map(x => `<div class="qrow">
      <button class="grow" style="text-align:left" data-show="${x.id}"><p style="${x.id === q.id ? 'font-weight:600' : ''}">${esc(x.text)}</p></button>
      <button class="icon-btn" style="width:34px;height:34px" data-fav="${x.id}" aria-label="${favLbl}">${icon(db.favQuotes.includes(x.id) ? 'heartFill' : 'heart')}</button>
      ${x.custom ? `<button class="icon-btn" style="width:34px;height:34px" data-rm="${x.id}" aria-label="${L('Delete', 'Löschen')}">${icon('trash')}</button>` : ''}</div>`).join('')}</div>`
    : `<div class="card empty">${icon('heart')}<b>${L('No favourites yet', 'Noch keine Favoriten')}</b>${L('Tap the heart on a quote to save it.', 'Tippe bei einem Zitat auf das Herz, um es zu speichern.')}</div>`;

  return {
    html: `${backBar('#/profile', L('Motivation', 'Motivation'))}
      <div class="mq">
        <div>${icon('quote', 'ic-lg')}<p class="mq-text mt">${esc(q.text)}</p></div>
        <div class="mq-foot">
          <button class="icon-btn" data-step="-1" aria-label="${L('Previous', 'Zurück')}">${icon('left')}</button>
          <span class="mq-count">${idx + 1} / ${pool.length}</span>
          <button class="icon-btn" data-fav="${q.id}" aria-label="${favLbl}">${icon(fav ? 'heartFill' : 'heart')}</button>
          <button class="icon-btn" data-step="1" aria-label="${L('Next', 'Weiter')}">${icon('right')}</button>
        </div></div>
      <p class="note">${lang === 'de'
        ? 'Die Zitate werden im englischen Originalwortlaut gezeigt. Ihre Quellen sind nicht bestätigt, daher werden keine Autoren genannt.'
        : 'Sources of these quotes are unverified, so no authors are shown.'}</p>
      <div class="seg">${[['all', L('All quotes', 'Alle Zitate')], ['fav', L('Favourites', 'Favoriten')], ['msg', L('Reminders', 'Impulse')]].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
      ${tab === 'msg' ? reminderSection() : quoteList()}
      ${tab !== 'msg' ? `<form class="card" id="add-q"><p class="eyebrow">${L('Add your own quote', 'Eigenes Zitat hinzufügen')}</p>
        <textarea class="input mt-sm" name="t" maxlength="280" placeholder="${L('Type a quote that drives you', 'Schreib ein Zitat, das dich antreibt')}"></textarea>
        <button class="btn btn-primary btn-block mt-sm">${icon('plus', 'ic-sm')} ${L('Add to collection', 'Zur Sammlung hinzufügen')}</button></form>` : ''}`,
    mount(view) {
      view.addEventListener('click', async e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.step) { currentId = pool[(idx + Number(b.dataset.step) + pool.length) % pool.length].id; refresh(); }
        else if (b.dataset.fav) { const on = toggleFav(b.dataset.fav); toast(on ? L('Saved to favourites.', 'Zu Favoriten hinzugefügt.') : L('Removed from favourites.', 'Aus Favoriten entfernt.')); refresh(); }
        else if (b.dataset.tab) { tab = b.dataset.tab; refresh(); }
        else if (b.dataset.show) { currentId = b.dataset.show; refresh(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else if (b.dataset.rm) {
          if (await confirmDialog({ title: L('Delete this quote?', 'Dieses Zitat löschen?'), confirm: L('Delete', 'Löschen'), danger: true })) { removeQuote(b.dataset.rm); refresh(); }
        }
      });
      view.querySelector('#add-q')?.addEventListener('submit', e => {
        e.preventDefault();
        const r = addQuote(e.target.t.value);
        toast(r.ok ? L('Quote added.', 'Zitat hinzugefügt.') : r.msg);
        if (r.ok) { currentId = r.quote.id; tab = 'all'; refresh(); }
      });
    },
  };
}
