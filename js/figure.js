// Animated mannequin that demonstrates an exercise and highlights the trained muscles in orange.
// Poses describe the hip, torso angle and where hands/feet should be; arms and legs are solved
// with simple two-joint inverse kinematics, so limbs keep their length while moving.
import { ANIMS } from './data/animations.js';

const LEN = { torso: 30, head: 10, upper: 15, fore: 14, thigh: 22, shin: 22, toe: 7 };
const C = {
  skin: '#c7cbd1', far: '#80858d', line: '#3d4148', shorts: '#16171a',
  muscle: '#ff5a2e', muscleFar: '#b9452a',
};
const rad = d => (d * Math.PI) / 180;
const pt = (p, ang, len) => [p[0] + Math.cos(rad(ang)) * len, p[1] + Math.sin(rad(ang)) * len];
const at = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const add = (a, v, k) => [a[0] + v[0] * k, a[1] + v[1] * k];
const f1 = n => n.toFixed(1);

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
  return { neck, head, sh, hp, arms, legs, hip: p.hip };
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

// ---------- drawing ----------
const line = (a, b, w, color) =>
  `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
const poly = (pts, fill, stroke = 'none', sw = 0) =>
  `<polygon points="${pts.map(p => `${f1(p[0])},${f1(p[1])}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
const dot = (c, r, fill) => `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}" fill="${fill}"/>`;

// A limb segment with outline, optional shorts and an optional muscle highlight.
function seg(a, b, w, far, opts = {}) {
  let s = line(a, b, w + 2.4, C.line) + line(a, b, w, far ? C.far : C.skin);
  if (opts.shorts) s += line(a, at(a, b, opts.shorts), w + 1.2, C.shorts);
  if (opts.muscle) s += line(at(a, b, opts.from ?? 0.2), at(a, b, opts.to ?? 0.82), Math.max(3.5, w - 1.6), far ? C.muscleFar : C.muscle);
  return s;
}

function limbArm(arm, far, hl) {
  const [s, e, h] = arm;
  return seg(s, e, 6.5, far, { muscle: hl.has('triceps') || hl.has('biceps') })
    + seg(e, h, 5.5, far, { muscle: hl.has('forearms'), from: 0.1, to: 0.7 })
    + (hl.has('shoulders') ? dot(s, 5, far ? C.muscleFar : C.muscle) : '');
}

function limbLeg(leg, far, hl) {
  const [h, k, a, toe] = leg;
  const thighMuscle = hl.has('quads') || hl.has('hamstrings') || hl.has('hipflex');
  return seg(h, k, 9, far, { shorts: 0.38, muscle: thighMuscle, from: hl.has('hipflex') && !hl.has('quads') ? 0.36 : 0.42, to: hl.has('hipflex') && !hl.has('quads') ? 0.6 : 0.9 })
    + seg(k, a, 7, far, { muscle: hl.has('calves'), from: 0.12, to: 0.6 })
    + (toe ? seg(a, toe, 4.5, far) : '');
}

function torsoSide(f, A, hl) {
  const u = [(f.neck[0] - f.hip[0]) / LEN.torso, (f.neck[1] - f.hip[1]) / LEN.torso];
  let fr = [-u[1], u[0]];               // front of the chest (figure faces right)
  if (A.back) fr = [u[1], -u[0]];       // lying on the back: chest faces up
  const P = t => at(f.hip, f.neck, t);
  const body = [add(f.neck, fr, 7.5), add(P(0.5), fr, 6.5), add(f.hip, fr, 7), add(f.hip, fr, -7.5), add(P(0.5), fr, -6.5), add(f.neck, fr, -7)];
  let s = poly(body, C.skin, C.line, 2.4);
  s += poly([add(f.hip, fr, 7.2), add(P(0.16), fr, 7), add(P(0.16), fr, -7.5), add(f.hip, fr, -7.8)], C.shorts);
  if (hl.has('chest')) s += poly([add(P(0.95), fr, 6.6), add(P(0.58), fr, 5.8), add(P(0.58), fr, 1), add(P(0.95), fr, 1)], C.muscle);
  if (hl.has('abs') || hl.has('obliques')) s += poly([add(P(0.55), fr, 5.6), add(P(0.2), fr, 6), add(P(0.2), fr, 1.2), add(P(0.55), fr, 1.2)], C.muscle);
  if (hl.has('back')) s += poly([add(P(0.95), fr, -6.4), add(P(0.3), fr, -6.2), add(P(0.3), fr, -1.5), add(P(0.95), fr, -1.5)], C.muscle);
  if (hl.has('glutes')) s += dot(add(P(0.06), fr, -4), 5.6, C.muscle);
  return s;
}

function torsoFront(f, hl) {
  const [s0, s1] = f.sh, [h0, h1] = f.hp;
  const m = (a, b, t) => at(a, b, t);
  let s = poly([[s0[0] + 2, s0[1] - 1], [s1[0] - 2, s1[1] - 1], [h1[0] - 2, h1[1]], [h0[0] + 2, h0[1]]], C.skin, C.line, 2.4);
  s += poly([m(s0, h0, 0.84), m(s1, h1, 0.84), [h1[0] - 2.5, h1[1] + 1], [h0[0] + 2.5, h0[1] + 1]], C.shorts);
  if (hl.has('chest')) s += poly([m(s0, h0, 0.12), m(s1, h1, 0.12), m(s1, h1, 0.4), m(s0, h0, 0.4)], C.muscle);
  if (hl.has('abs') || hl.has('obliques')) s += poly([m(s0, h0, 0.44), m(s1, h1, 0.44), m(s1, h1, 0.8), m(s0, h0, 0.8)], C.muscle);
  return s;
}

function render(f, A) {
  const hl = new Set(A.hl || []);
  const front = !!A.front;
  const head = line(f.neck, at(f.neck, f.head, 0.55), 5.5, C.line) + line(f.neck, at(f.neck, f.head, 0.55), 3.6, C.skin)
    + `<circle cx="${f1(f.head[0])}" cy="${f1(f.head[1])}" r="7" fill="${C.skin}" stroke="${C.line}" stroke-width="1.4"/>`;
  if (front) {
    return limbLeg(f.legs[1], false, hl) + limbLeg(f.legs[0], false, hl) + torsoFront(f, hl)
      + limbArm(f.arms[1], false, hl) + limbArm(f.arms[0], false, hl) + head;
  }
  return limbArm(f.arms[1], true, hl) + limbLeg(f.legs[1], true, hl) + torsoSide(f, A, hl)
    + limbLeg(f.legs[0], false, hl) + head + limbArm(f.arms[0], false, hl);
}

function props(list = []) {
  return list.map(p => p.type === 'box'
    ? `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="3" class="fig-prop"/>`
    : p.type === 'wall' ? `<rect x="${p.x - 4}" y="-12" width="4" height="116" class="fig-prop"/>` : '').join('');
}

export function figureSvg(exId) {
  const A = ANIMS[exId];
  if (!A) return '';
  return `<svg class="fig" viewBox="${A.vb || '0 -12 200 128'}" role="img" aria-label="Animation" data-fig-svg="${exId}">
    <ellipse cx="100" cy="105" rx="70" ry="3" class="fig-shadow"/>
    <line x1="18" y1="104" x2="182" y2="104" class="fig-floor"/>${props(A.props)}<g class="fig-body"></g>
  </svg>`;
}

function draw(svg, pose, A) {
  svg.querySelector('.fig-body').innerHTML = render(solve(pose), A);
}

// Start animating every figure inside root. Loops stop on their own when the figure is removed.
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
      draw(svg, mix(a, b, ease(seq[i][1] ? t / seq[i][1] : 1)), A);
      requestAnimationFrame(frame);
    };
    draw(svg, A.poses[seq[0][0]], A);
    requestAnimationFrame(frame);
  });
}

// Draw one key pose without animating (used for previews/tests).
export function showPose(svg, exId, poseKey) {
  const A = ANIMS[exId];
  const p = A?.poses[poseKey];
  if (p) draw(svg, p, A);
}
