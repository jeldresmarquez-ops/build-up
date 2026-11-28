// 3D mannequin (three.js) that demonstrates each exercise and lights up the trained muscles in orange.
// Poses come from js/data/animations.js (same pose data as the 2D fallback) and are lifted into 3D:
// side-view exercises get depth for the near/far arm and leg, front-view exercises use x as the
// sideways axis. Falls back to the flat 2D figure when WebGL is not available.
import { ANIMS } from './data/animations.js';
import * as Flat from './figure2d.js';

const S = 1 / 40;                 // 2D units → metres-ish
const LEN = { upper: 15, fore: 14, thigh: 22, shin: 22, toe: 7, neck: 5 };
let THREE = null;
let loading = null;
const webgl = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
})();

export function figureSvg(exId) {
  if (!ANIMS[exId]) return '';
  if (!webgl) return Flat.figureSvg(exId);
  return `<div class="fig3d" data-fig3d="${exId}"></div>`;
}

export function animateFigures(root) {
  if (!webgl) return Flat.animateFigures(root);
  const els = [...root.querySelectorAll('[data-fig3d]')].filter(el => !el.__running);
  if (!els.length) return;
  els.forEach(el => { el.__running = true; });
  loading = loading || import('../vendor/three.module.min.js').then(m => { THREE = m; });
  loading.then(() => els.forEach(el => { if (el.isConnected) mount(el, el.dataset.fig3d); }))
    .catch(() => els.forEach(el => { el.outerHTML = Flat.figureSvg(el.dataset.fig3d); Flat.animateFigures(root); }));
}

// ---------- pose → 3D joints ----------
function lift(f, pose, A) {
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  if (!A.front && pose.roll) {
    // Body turned sideways (e.g. side plank): near limbs stack on top of far limbs.
    const P = p => V((p[0] - 100) * S, (104 - p[1]) * S, 0);
    const axis = P(f.neck).sub(P(f.hip)).normalize();
    const Lat = V(0, 0, 1).applyAxisAngle(axis, (pose.roll * Math.PI) / 180);
    const off = (p, i, k) => P(p).add(Lat.clone().multiplyScalar((i === 0 ? 1 : -1) * k));
    return {
      neck: P(f.neck), head: P(f.head), hip: P(f.hip), roll: pose.roll,
      arms: f.arms.map((a, i) => [off(a[0], i, 0.19), off(a[1], i, 0.1), off(a[2], i, 0.02)]),
      legs: f.legs.map((l, i) => [off(l[0], i, 0.1), off(l[1], i, 0.08), off(l[2], i, 0.06), l[3] ? off(l[3], i, 0.06) : null]),
    };
  }
  if (!A.front) {
    const P = (p, z) => V((p[0] - 100) * S, (104 - p[1]) * S, z);
    const side = i => (i === 0 ? 1 : -1);
    return {
      neck: P(f.neck, 0), head: P(f.head, 0), hip: P(f.hip, 0),
      arms: f.arms.map((a, i) => [P(a[0], 0.19 * side(i)), P(a[1], 0.2 * side(i)), P(a[2], 0.2 * side(i))]),
      legs: f.legs.map((l, i) => [P(l[0], 0.1 * side(i)), P(l[1], 0.11 * side(i)), P(l[2], 0.11 * side(i)), l[3] ? P(l[3], 0.11 * side(i)) : null]),
    };
  }
  // Front view: 2D x is the sideways axis (world z); world x is "forward".
  const fwd = pose.fwd || [0, 0];
  const P = (p, x = 0) => V(x, (104 - p[1]) * S, (p[0] - 100) * S);
  const j = {
    neck: P(f.neck), head: P(f.head), hip: P([(f.hp[0][0] + f.hp[1][0]) / 2, f.hp[0][1]]),
    arms: f.arms.map((a, i) => {
      if (!fwd[i]) return [P(a[0]), P(a[1]), P(a[2])];
      const s = P(a[0]), h = P(a[2], fwd[i]);       // arm reaching forward: keep it straight
      return [s, s.clone().lerp(h, 0.5), h];
    }),
    legs: f.legs.map(l => {
      // knees bend forward (towards the viewer's depth axis), not sideways
      const h = P(l[0]), ft = P(l[2]);
      const d = h.distanceTo(ft), seg = LEN.thigh * S;
      const out = Math.sqrt(Math.max(0, seg * seg - (d / 2) * (d / 2)));
      const knee = h.clone().lerp(ft, 0.5).add(V(out, 0, 0));
      return [h, knee, ft, null];
    }),
  };
  if (pose.twist) {               // rotate the upper body around the vertical axis
    const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), (pose.twist * Math.PI) / 180);
    const turn = v => v.sub(j.hip).applyQuaternion(q).add(j.hip);
    [j.neck, j.head, ...j.arms.flat()].forEach(turn);
  }
  return j;
}

// ---------- scene ----------
function mount(el, exId) {
  const A = ANIMS[exId];
  const T = THREE;
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  el.appendChild(renderer.domElement);

  const scene = new T.Scene();
  scene.add(new T.HemisphereLight(0xffffff, 0x3a3a40, 1.15));
  const key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(2.5, 4, 3); scene.add(key);
  const rim = new T.DirectionalLight(0xbfd2ff, 0.7); rim.position.set(-3, 2.5, -2.5); scene.add(rim);

  const M = {
    skin: new T.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.5, metalness: 0.05 }),
    muscle: new T.MeshStandardMaterial({ color: 0xff4f24, roughness: 0.45, emissive: 0x7a1600, emissiveIntensity: 0.35 }),
    shorts: new T.MeshStandardMaterial({ color: 0x1a1b1f, roughness: 0.8 }),
  };
  const hl = new Set(A.hl || []);
  const geo = [];
  const mk = (g, m) => { geo.push(g); const mesh = new T.Mesh(g, m); scene.add(mesh); return mesh; };
  const cap = (r, len, m) => mk(new T.CapsuleGeometry(r, Math.max(0.001, len), 6, 12), m);
  const sph = (r, m) => mk(new T.SphereGeometry(r, 20, 14), m);

  // soft floor shadow
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const g2 = sc.getContext('2d'); const grd = g2.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = grd; g2.fillRect(0, 0, 128, 128);
  const shadowTex = new T.CanvasTexture(sc);
  const shadow = mk(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;

  // props from the 2D data: box (incline push-ups) and wall (wall sit)
  const propM = new T.MeshStandardMaterial({ color: 0x3b3d43, roughness: 0.7 });
  const propBoxes = [];
  (A.props || []).forEach(p => {
    if (p.type === 'box') {
      const w = p.w * S, h = (104 - p.y) * S;
      const m = mk(new T.BoxGeometry(w, h, 0.9), propM);
      m.position.set((p.x - 100) * S + w / 2, h / 2, 0);
      propBoxes.push(new T.Box3().setFromObject(m));
    } else if (p.type === 'wall') {
      const m = mk(new T.BoxGeometry(0.08, 2.4, 1.4), propM);
      m.position.set((p.x - 100) * S - 0.04, 1.2, 0);
    }
  });
  const thighM = hl.has('quads') || hl.has('hamstrings') || hl.has('hipflex');
  const parts = {
    head: sph(0.15, M.skin), neck: cap(0.06, LEN.neck * S, M.skin),
    chest: sph(1, M.skin), belly: sph(1, M.skin), pelvis: sph(1, M.shorts),
    chestM: hl.has('chest') ? sph(1, M.muscle) : null,
    absM: hl.has('abs') || hl.has('obliques') ? sph(1, M.muscle) : null,
    backM: hl.has('back') ? sph(1, M.muscle) : null,
    glutes: hl.has('glutes') ? [sph(0.1, M.muscle), sph(0.1, M.muscle)] : null,
    arms: [0, 1].map(() => ({
      sh: sph(hl.has('shoulders') ? 0.105 : 0.09, hl.has('shoulders') ? M.muscle : M.skin),
      up: cap(0.065, LEN.upper * S, M.skin), fo: cap(0.055, LEN.fore * S, M.skin), hand: sph(0.06, M.skin),
      upM: hl.has('triceps') || hl.has('biceps') ? cap(0.071, LEN.upper * S * 0.55, M.muscle) : null,
      foM: hl.has('forearms') ? cap(0.061, LEN.fore * S * 0.5, M.muscle) : null,
    })),
    legs: [0, 1].map(() => ({
      th: cap(0.095, LEN.thigh * S, M.skin), sh: cap(0.072, LEN.shin * S, M.skin), foot: cap(0.05, LEN.toe * S, M.skin),
      shorts: cap(0.104, LEN.thigh * S * 0.32, M.shorts), knee: sph(0.08, M.skin),
      thM: thighM ? cap(0.101, LEN.thigh * S * 0.5, M.muscle) : null,
      shM: hl.has('calves') ? cap(0.078, LEN.shin * S * 0.45, M.muscle) : null,
    })),
  };

  const Y = new T.Vector3(0, 1, 0);
  const tmp = new T.Vector3();
  const placeSeg = (mesh, a, b, from = 0, to = 1) => {
    if (!mesh) return;
    const pa = tmp.copy(a).lerp(b, from).clone(), pb = a.clone().lerp(b, to);
    mesh.position.copy(pa).add(pb).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(Y, pb.sub(pa).normalize());
  };
  const placeBlob = (mesh, center, up, fwd, sx, sy, sz) => {
    if (!mesh) return;
    const side = new T.Vector3().crossVectors(fwd, up).normalize(); // right-handed basis
    const m = new T.Matrix4().makeBasis(fwd, up, side);
    mesh.position.copy(center);
    mesh.quaternion.setFromRotationMatrix(m);
    mesh.scale.set(sx, sy, sz);
  };

  function pose(j) {
    const up = j.neck.clone().sub(j.hip).normalize();
    let fwd;
    if (A.front) fwd = new T.Vector3(1, 0, 0);
    else { fwd = new T.Vector3(up.y, -up.x, 0); if (A.back) fwd.negate(); if (j.roll) fwd.applyAxisAngle(up, (j.roll * Math.PI) / 180); }
    fwd.sub(up.clone().multiplyScalar(fwd.dot(up))).normalize();
    const at = t => j.hip.clone().lerp(j.neck, t);
    placeBlob(parts.chest, at(0.68), up, fwd, 0.15, 0.26, 0.22);
    placeBlob(parts.belly, at(0.36), up, fwd, 0.13, 0.22, 0.18);
    placeBlob(parts.pelvis, at(0.08), up, fwd, 0.14, 0.15, 0.2);
    placeBlob(parts.chestM, at(0.72).add(fwd.clone().multiplyScalar(0.075)), up, fwd, 0.09, 0.15, 0.17);
    placeBlob(parts.absM, at(0.38).add(fwd.clone().multiplyScalar(0.07)), up, fwd, 0.08, 0.2, 0.12);
    placeBlob(parts.backM, at(0.66).add(fwd.clone().multiplyScalar(-0.08)), up, fwd, 0.09, 0.22, 0.18);
    if (parts.glutes) {
      const side = new T.Vector3().crossVectors(up, fwd).normalize();
      parts.glutes.forEach((g, i) => g.position.copy(at(0.02)).add(fwd.clone().multiplyScalar(-0.1)).add(side.clone().multiplyScalar(i ? 0.08 : -0.08)));
    }
    placeSeg(parts.neck, j.neck, j.head, 0, 0.5);
    parts.head.position.copy(j.head);
    j.arms.forEach((a, i) => {
      const p = parts.arms[i];
      p.sh.position.copy(a[0]);
      placeSeg(p.up, a[0], a[1]); placeSeg(p.upM, a[0], a[1], 0.2, 0.8);
      placeSeg(p.fo, a[1], a[2]); placeSeg(p.foM, a[1], a[2], 0.15, 0.65);
      p.hand.position.copy(a[2]);
    });
    j.legs.forEach((l, i) => {
      const p = parts.legs[i];
      placeSeg(p.th, l[0], l[1]); placeSeg(p.shorts, l[0], l[1], 0, 0.36); placeSeg(p.thM, l[0], l[1], 0.38, 0.92);
      p.knee.position.copy(l[1]);
      placeSeg(p.sh, l[1], l[2]); placeSeg(p.shM, l[1], l[2], 0.1, 0.55);
      if (l[3]) { p.foot.visible = true; placeSeg(p.foot, l[2], l[3]); }
      else { // no toe direction given: point the foot forward along the floor
        p.foot.visible = true;
        const toe = l[2].clone().add(A.front ? new T.Vector3(LEN.toe * S, 0, 0) : new T.Vector3(LEN.toe * S * 0.9, 0, 0));
        placeSeg(p.foot, l[2], toe);
      }
    });
  }

  // Frame the camera around all poses of this exercise.
  const box = new T.Box3();
  Object.values(A.poses).forEach(p => {
    const j = lift(Flat.solve(p), p, A);
    [j.neck, j.head, j.hip, ...j.arms.flat(), ...j.legs.flat().filter(Boolean)].forEach(v => box.expandByPoint(v));
  });
  box.expandByPoint(new T.Vector3(box.min.x, 0, box.min.z));
  propBoxes.forEach(b => box.union(b));
  const center = box.getCenter(new T.Vector3());
  const size = box.getSize(new T.Vector3());
  shadow.position.set(center.x, 0.002, center.z);
  shadow.scale.set(Math.max(size.x, 0.8) * 1.3, Math.max(size.z, 0.8) * 1.4, 1);
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 50);
  // Side exercises: look mostly from the side; front exercises: mostly from the front. Both slightly angled.
  const dir = A.cam ? new T.Vector3(...A.cam) : A.front ? new T.Vector3(1, 0.32, 0.5) : new T.Vector3(0.55, 0.38, 1);
  dir.normalize();

  let posed = false;
  function resize() {
    const w = el.clientWidth || 300, h = el.clientHeight || 200;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const span = Math.max(size.y * 1.08, (Math.max(size.x, size.z) * 1.08) / camera.aspect, 1.1);
    const dist = span / 2 / Math.tan((camera.fov * Math.PI) / 360) + 0.3;
    camera.position.copy(center).add(dir.clone().multiplyScalar(dist));
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    if (posed) renderer.render(scene, camera);
  }
  resize();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  ro?.observe(el);

  const seq = A.seq;
  const total = seq.reduce((s, x) => s + x[1], 0);
  const t0 = performance.now();
  function frame(now) {
    if (!el.isConnected) {      // free the GPU when the figure leaves the screen
      ro?.disconnect();
      geo.forEach(g => g.dispose()); Object.values(M).forEach(m => m.dispose()); propM.dispose(); shadowTex.dispose();
      renderer.dispose(); renderer.forceContextLoss?.();
      return;
    }
    let t = (now - t0) % total, i = 0;
    while (i < seq.length - 1 && t > seq[i][1]) { t -= seq[i][1]; i++; }
    const a = A.poses[seq[i][0]], b = A.poses[seq[(i + 1) % seq.length][0]];
    const k = Flat.ease(seq[i][1] ? t / seq[i][1] : 1);
    const p = Flat.mix(a, b, k);
    p.fwd = a.fwd && b.fwd ? a.fwd.map((v, n) => v + (b.fwd[n] - v) * k) : a.fwd;
    p.twist = (a.twist || 0) + ((b.twist || 0) - (a.twist || 0)) * k;
    p.roll = (a.roll || 0) + ((b.roll || 0) - (a.roll || 0)) * k;
    pose(lift(Flat.solve(p), p, A));
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  const first = A.poses[seq[0][0]];       // draw the first pose right away
  pose(lift(Flat.solve(first), first, A));
  posed = true;
  resize();
  requestAnimationFrame(frame);
}

// Still pose for tests/previews.
export async function showPose(el, exId, poseKey) {
  if (!webgl) return Flat.showPose(el, exId, poseKey);
  await (loading = loading || import('../vendor/three.module.min.js').then(m => { THREE = m; }));
  const A = ANIMS[exId];
  const one = { ...A, poses: { s: A.poses[poseKey] }, seq: [['s', 1000]] };
  ANIMS['__still_' + exId + poseKey] = one;
  el.dataset.fig3d = '__still_' + exId + poseKey;
  mount(el, el.dataset.fig3d);
}
