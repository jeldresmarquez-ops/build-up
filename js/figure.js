// Animated stick figure that demonstrates an exercise.
// Poses describe the hip, torso angle and where hands/feet should be; arms and legs are solved
// with simple two-joint inverse kinematics, so limbs keep their length while moving.
import { ANIMS } from './data/animations.js';

const LEN = { torso: 30, head: 10, upper: 15, fore: 14, thigh: 22, shin: 22, toe: 7 };
const rad = d => (d * Math.PI) / 180;
const pt = (p, ang, len) => [p[0] + Math.cos(rad(ang)) * len, p[1] + Math.sin(rad(ang)) * len];

function ik(s, t, a, b, sign) {
  const dx = t[0] - s[0], dy = t[1] - s[1];
  const d = Math.max(Math.abs(a - b) + 0.01, Math.min(a + b - 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const A = Math.acos((a * a + d * d - b * b) / (2 * a * d));
  const j = [s[0] + Math.cos(base + sign * A) * a, s[1] + Math.sin(base + sign * A) * a];
  const e = Math.atan2(t[1] - j[1], t[0] - j[0]);
  return [j, [j[0] + Math.cos(e) * b, j[1] + Math.sin(e) * b]];
}

function solve(p) {
  const neck = pt(p.hip, p.torso, LEN.torso);
  const head = pt(neck, p.head ?? p.torso, LEN.head);
  const sh = p.front ? [[neck[0] + 8, neck[1] + 2], [neck[0] - 8, neck[1] + 2]] : [neck, neck];
  const hp = p.front ? [[p.hip[0] + 5, p.hip[1]], [p.hip[0] - 5, p.hip[1]]] : [p.hip, p.hip];
  const eb = p.eb || (p.front ? [-1, 1] : [1, 1]);
  const kb = p.kb || (p.front ? [-1, 1] : [-1, -1]);
  const arms = [0, 1].map(i => { const [e, h] = ik(sh[i], p.hands[i], LEN.upper, LEN.fore, eb[i]); return [sh[i], e, h]; });
  const legs = [0, 1].map(i => {
    const [k, a] = ik(hp[i], p.feet[i], LEN.thigh, LEN.shin, kb[i]);
    return [hp[i], k, a, p.toe ? pt(a, p.toe[i], LEN.toe) : null];
  });
  return { neck, head, sh, hp, arms, legs };
}

const lerp = (a, b, t) => {
  if (typeof a === 'number') return a + (b - a) * t;
  if (Array.isArray(a)) return a.map((v, i) => lerp(v, b[i], t));
  return a;
};
function mix(a, b, t) {
  return {
    ...a,
    hip: lerp(a.hip, b.hip, t),
    torso: lerp(a.torso, b.torso, t),
    head: lerp(a.head ?? a.torso, b.head ?? b.torso, t),
    hands: lerp(a.hands, b.hands, t),
    feet: lerp(a.feet, b.feet, t),
    toe: a.toe && b.toe ? lerp(a.toe, b.toe, t) : a.toe || b.toe,
  };
}
const ease = t => 0.5 - Math.cos(Math.PI * t) / 2;

function props(list = []) {
  return list.map(p => p.type === 'box'
    ? `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="3" class="fig-prop"/>`
    : p.type === 'wall' ? `<rect x="${p.x - 4}" y="-12" width="4" height="116" class="fig-prop"/>` : '').join('');
}

export function figureSvg(exId) {
  const A = ANIMS[exId];
  if (!A) return '';
  const limb = cls => `<polyline class="${cls}" points=""/>`;
  return `<svg class="fig" viewBox="${A.vb || '0 -12 200 128'}" role="img" aria-label="Animation" data-fig-svg="${exId}">
    <line x1="18" y1="104" x2="182" y2="104" class="fig-floor"/>${props(A.props)}
    <g class="${A.front ? 'fig-near' : 'fig-far'}">${limb('arm1')}${limb('leg1')}</g>
    <g class="fig-near"><line class="torso"/>${A.front ? '<line class="shoulders"/><line class="hips"/>' : ''}${limb('leg0')}<circle class="head" r="6.5"/>${limb('arm0')}</g>
  </svg>`;
}

function draw(svg, f, front) {
  const q = s => svg.querySelector(s);
  const pts = arr => arr.filter(Boolean).map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const t = q('.torso');
  const neckMid = f.neck, hipMid = front ? [(f.hp[0][0] + f.hp[1][0]) / 2, f.hp[0][1]] : f.hp[0];
  t.setAttribute('x1', hipMid[0]); t.setAttribute('y1', hipMid[1]); t.setAttribute('x2', neckMid[0]); t.setAttribute('y2', neckMid[1]);
  const sl = q('.shoulders'), hl = q('.hips');
  if (front && sl && hl) {
    sl.setAttribute('x1', f.sh[0][0]); sl.setAttribute('y1', f.sh[0][1]); sl.setAttribute('x2', f.sh[1][0]); sl.setAttribute('y2', f.sh[1][1]);
    hl.setAttribute('x1', f.hp[0][0]); hl.setAttribute('y1', f.hp[0][1]); hl.setAttribute('x2', f.hp[1][0]); hl.setAttribute('y2', f.hp[1][1]);
  }
  const h = q('.head'); h.setAttribute('cx', f.head[0]); h.setAttribute('cy', f.head[1]);
  q('.arm0').setAttribute('points', pts(f.arms[0])); q('.arm1').setAttribute('points', pts(f.arms[1]));
  q('.leg0').setAttribute('points', pts(f.legs[0])); q('.leg1').setAttribute('points', pts(f.legs[1]));
}

// Start animating every [data-fig] figure inside root. Loops stop on their own when removed.
export function animateFigures(root) {
  root.querySelectorAll('[data-fig-svg]').forEach(svg => {
    if (svg.__running) return;
    svg.__running = true;
    const A = ANIMS[svg.dataset.figSvg];
    const seq = A.seq;
    const total = seq.reduce((s, x) => s + x[1], 0);
    const t0 = performance.now();
    const frame = now => {
      if (!svg.isConnected) return;
      let t = (now - t0) % total, i = 0;
      while (i < seq.length - 1 && t > seq[i][1]) { t -= seq[i][1]; i++; }
      const a = A.poses[seq[i][0]], b = A.poses[seq[(i + 1) % seq.length][0]];
      draw(svg, solve(mix(a, b, ease(seq[i][1] ? t / seq[i][1] : 1))), !!a.front);
      requestAnimationFrame(frame);
    };
    draw(svg, solve(A.poses[seq[0][0]]), !!A.poses[seq[0][0]].front);
    requestAnimationFrame(frame);
  });
}

// Draw one key pose without animating (used for previews/tests).
export function showPose(svg, exId, poseKey) {
  const p = ANIMS[exId]?.poses[poseKey];
  if (p) draw(svg, solve(p), !!p.front);
}
