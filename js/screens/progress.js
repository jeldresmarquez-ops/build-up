import { db } from '../store.js';
import { esc, icon, backBar, ring, fmtMin, fmtDate, relDay, confirmDialog } from '../ui.js';
import * as St from '../logic/stats.js';
import { EX } from '../data/exercises.js';
import { deleteEntry } from '../logic/session.js';
import { refresh } from '../router.js';

let period = 7;

function barChart(series, target) {
  const W = 320, H = 150, pad = 22, bw = (W - 8) / series.length;
  const max = Math.max(target, ...series.map(s => s.sessions), 1);
  const y = v => H - pad - (v / max) * (H - pad - 12);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Workouts per week">
    <line x1="0" x2="${W}" y1="${y(target)}" y2="${y(target)}" stroke="var(--line2)" stroke-dasharray="3 4"/>
    <text x="${W}" y="${y(target) - 5}" text-anchor="end">goal ${target}</text>
    ${series.map((s, i) => {
      const h = Math.max(2, H - pad - y(s.sessions));
      const x = 4 + i * bw + bw * 0.22;
      const cur = i === series.length - 1;
      return `<rect x="${x}" y="${H - pad - h}" width="${bw * 0.56}" height="${h}" rx="4" fill="${cur ? 'var(--accent)' : s.sessions >= target ? 'var(--text)' : '#3A3A42'}"/>
        ${s.sessions ? `<text x="${x + bw * 0.28}" y="${H - pad - h - 5}" text-anchor="middle" style="fill:var(--muted)">${s.sessions}</text>` : ''}
        <text x="${x + bw * 0.28}" y="${H - 6}" text-anchor="middle">${s.start.getDate()}.${s.start.getMonth() + 1}</text>`;
    }).join('')}</svg>`;
}

const delta = (a, b, fmt = v => v) => {
  if (!b && !a) return '<span class="delta down">–</span>';
  if (!b) return '<span class="delta up">new</span>';
  const d = a - b;
  return `<span class="delta ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))}</span>`;
};

export function render() {
  const t = St.totals();
  const target = Math.max(1, db.planDays.length);
  const cons = St.consistency(4);
  const { cur, prev } = St.compare(period);
  const recs = St.records();
  const series = St.weeklySeries(8);

  if (!t.sessions) {
    return {
      html: `${backBar('#/workout', 'Progress')}
        <div class="card empty mt">${icon('chart')}<b>Your progress starts with one workout</b>Complete a session and your consistency, records and weekly activity appear here.</div>
        <a class="btn btn-primary btn-block" href="#/workout">Choose a workout</a>`,
    };
  }

  return {
    html: `${backBar('#/workout', 'Progress')}
      <div class="stat-row">
        <div class="stat"><div class="num">${t.sessions}</div><div class="tiny">Workouts</div></div>
        <div class="stat"><div class="num">${Math.round(t.seconds / 60)}</div><div class="tiny">Minutes</div></div>
        <div class="stat"><div class="num">${St.weekStreak()}</div><div class="tiny">Week streak</div></div>
      </div>
      <div class="card between">
        <div><p class="eyebrow">Consistency · 4 weeks</p><p class="h2 mt-sm">${Math.round(cons * 100)}% of plan</p>
          <p class="muted small mt-sm">${cons >= .8 ? 'Strong rhythm. Keep it going.' : cons >= .5 ? 'Solid base. One more session a week makes a difference.' : 'Every session counts. Start with the next one.'}</p></div>
        ${ring(cons, { size: 76, stroke: 7, label: `${Math.round(cons * 100)}` })}</div>
      <div class="card"><div class="between"><p class="eyebrow">Weekly activity</p><span class="tiny muted">last 8 weeks</span></div>
        <div class="mt">${barChart(series, target)}</div></div>
      <div><div class="section-title"><h3 class="h3">Compare</h3></div>
        <div class="seg">${[[7, '7 days'], [30, '30 days'], [90, '90 days']].map(([d, l]) => `<button class="${period === d ? 'on' : ''}" data-p="${d}">${l}</button>`).join('')}</div>
        <div class="card list-card mt-sm">
          <div class="row"><div class="grow"><div class="row-title">Workouts</div><div class="row-sub">vs previous ${period} days: ${prev.sessions}</div></div><span class="num" style="font-size:22px">${cur.sessions}</span>${delta(cur.sessions, prev.sessions)}</div>
          <div class="row"><div class="grow"><div class="row-title">Training time</div><div class="row-sub">vs previous: ${fmtMin(prev.seconds)}</div></div><span class="num" style="font-size:22px">${Math.round(cur.seconds / 60)}<span class="small muted"> min</span></span>${delta(Math.round(cur.seconds / 60), Math.round(prev.seconds / 60))}</div>
          <div class="row"><div class="grow"><div class="row-title">Sets completed</div><div class="row-sub">vs previous: ${prev.sets}</div></div><span class="num" style="font-size:22px">${cur.sets}</span>${delta(cur.sets, prev.sets)}</div>
        </div></div>
      <div><div class="section-title"><h3 class="h3">Personal records</h3></div>
        ${recs.length ? `<div class="card list-card">${recs.map(r => `<a class="row" href="#/exercises/${r.exId}">
            <div class="grow"><div class="row-title">${EX[r.exId].name}</div>
            <div class="row-sub">${r.best > r.first ? `Started at ${St.unit(r.exId, r.first)} · +${r.best - r.first}` : `${r.sessions} session${r.sessions > 1 ? 's' : ''}`} · ${relDay(r.bestAt)}</div></div>
            <span class="num" style="font-size:22px">${St.unit(r.exId, r.best)}</span></a>`).join('')}</div>`
          : '<p class="muted small">Records appear after your first tracked workout.</p>'}</div>
      <a class="btn btn-ghost btn-block" href="#/history">${icon('history', 'ic-sm')} Workout history</a>
      <p class="note center">BUILD UP compares you only with yourself.</p>`,
    mount(view) {
      view.addEventListener('click', e => {
        const b = e.target.closest('[data-p]');
        if (b) { period = Number(b.dataset.p); refresh(); }
      });
    },
  };
}

export function history() {
  const list = [...db.history].reverse();
  if (!list.length) {
    return { html: `${backBar('#/workout', 'History')}<div class="card empty mt">${icon('history')}<b>No workouts yet</b>Your completed sessions will appear here.</div>
      <a class="btn btn-primary btn-block" href="#/workout">Start training</a>` };
  }
  const groups = {};
  for (const h of list) {
    const k = fmtDate(h.start, { month: 'long', year: 'numeric' });
    (groups[k] = groups[k] || []).push(h);
  }
  return {
    html: `${backBar('#/workout', 'History')}
      ${Object.entries(groups).map(([m, hs]) => `<div><p class="eyebrow">${m}</p><div class="card list-card mt-sm">${hs.map(h => `
        <details class="row" style="display:block">
          <summary class="row-flex" style="list-style:none;cursor:pointer">
            <div class="row-icon">${icon('check')}</div>
            <div class="grow"><div class="row-title">${esc(h.name)}</div><div class="row-sub">${fmtDate(h.start)} · ${fmtMin(h.dur)} · ${h.sets} sets${h.manual ? ' · marked' : ''}</div></div>
          </summary>
          <div style="padding:10px 0 0 54px">
            ${h.items.length ? h.items.map(it => `<p class="small"><b style="font-weight:500">${EX[it.exId]?.name || it.exId}</b> <span class="muted">${it.done.map(d => St.unit(it.exId, d)).join(' · ')}</span></p>`).join('') : '<p class="small muted">Marked as completed without tracking.</p>'}
            <button class="link-btn text-danger" data-del="${h.id}">Remove</button>
          </div></details>`).join('')}</div></div>`).join('')}`,
    mount(view) {
      view.addEventListener('click', async e => {
        const b = e.target.closest('[data-del]');
        if (!b) return;
        if (await confirmDialog({ title: 'Remove this workout?', text: 'This changes your progress and records.', confirm: 'Remove', danger: true })) {
          deleteEntry(b.dataset.del); refresh();
        }
      });
    },
  };
}
