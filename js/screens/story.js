import { db, save } from '../store.js';
import { logo } from '../ui.js';
import { L, lang } from '../i18n.js';

const PARTS_EN = [
  'One day, a young boy saw someone who inspired him.',
  'He admired his strength, his confidence and his discipline.',
  'He wanted to become someone like that.',
  'But he soon realized something important: nobody becomes great overnight.',
  'So he started small. One workout. One healthy choice. One better decision at a time.',
  'Day by day, he kept going.',
  'He didn’t wait to become better.',
  'He built himself up.',
  'That’s where BUILD UP began.',
  'Because becoming better starts with you.',
];
const PARTS_DE = [
  'Eines Tages sah ein kleiner Junge jemanden, der ihn inspirierte.',
  'Er bewunderte seine Stärke, sein Selbstvertrauen und seine Disziplin.',
  'Er wollte genauso werden.',
  'Doch bald erkannte er etwas Wichtiges: Niemand wird über Nacht großartig.',
  'Also fing er klein an. Ein Training. Eine gesunde Entscheidung. Eine bessere Wahl nach der anderen.',
  'Tag für Tag machte er weiter.',
  'Er wartete nicht darauf, besser zu werden.',
  'Er baute sich selbst auf.',
  'Genau dort begann BUILD UP.',
  'Denn besser werden beginnt bei dir.',
];
const PARTS = lang === 'de' ? PARTS_DE : PARTS_EN;

export function show(done) {
  const el = document.createElement('div');
  el.className = 'story';
  el.innerHTML = `<button class="story-skip" type="button">${L('Skip', 'Überspringen')}</button>
    <div class="story-stage" aria-live="polite"></div>
    <div class="story-dots">${PARTS.map(() => '<i></i>').join('')}</div>
    <p class="story-hint">${L('Tap to continue', 'Tippen zum Fortfahren')}</p>`;
  document.getElementById('overlay-root').appendChild(el);
  const stage = el.querySelector('.story-stage');
  const dots = [...el.querySelectorAll('.story-dots i')];
  let i = -1, timer;

  function next() {
    clearTimeout(timer);
    i++;
    if (i >= PARTS.length) return final();
    dots.forEach((d, k) => d.classList.toggle('on', k <= i));
    stage.innerHTML = `<p class="story-line">${PARTS[i]}</p>`;
    timer = setTimeout(next, 3800 + PARTS[i].length * 28);
  }

  function final() {
    clearTimeout(timer);
    el.classList.add('final');
    stage.innerHTML = `<div class="story-final">
      ${logo('lg')}
      <h1 class="display">${L('Your journey<br>starts now.', 'Deine Reise<br>beginnt jetzt.')}</h1>
      <p class="tagline">TRAIN. EAT. GROW. REPEAT.</p>
      <button class="btn btn-primary btn-xl btn-block" type="button" id="story-go">Let’s build up</button></div>`;
    stage.querySelector('#story-go').addEventListener('click', finish);
  }

  function finish() {
    db.storySeen = true;
    save();
    el.classList.add('out');
    setTimeout(() => { el.remove(); done(); }, 500);
  }

  el.addEventListener('click', e => {
    if (e.target.closest('.story-skip')) { e.stopPropagation(); final(); return; }
    if (!el.classList.contains('final')) next();
  });
  next();
}
