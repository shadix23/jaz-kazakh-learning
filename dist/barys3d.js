/*
 * 3D Barys — a procedural low-poly snow leopard for «Барыс жолы».
 * Built from three.js primitives (no external model files): thick spotted tail,
 * blue scarf and a taqiya with a gold band, the Jaz! mascot look.
 * Rendered on a transparent canvas above the 2D world; the game passes the
 * screen position every frame. Exposes window.JazBarys3D.create(canvas).
 */
import * as THREE from './vendor/three.module.min.js';

const COLORS = { fur: 0xf1f3f7, shade: 0xdfe4ec, spot: 0x535c6b, pink: 0xf2aab9, nose: 0xe07d95, hat: 0x1d3f8f, gold: 0xf2c14e, scarf: 0x2f8fdf, eye: 0xffffff, iris: 0x3a5bb8, pupil: 0x0d1222 };

function mat(color, extra) { return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...(extra || {}) }); }
const M = Object.fromEntries(Object.entries(COLORS).map(([k, c]) => [k, mat(c, k === 'eye' || k === 'pupil' ? { roughness: 0.25 } : null)]));

function mesh(geo, material, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); return m; }

// Rosette spots placed on a surface direction (unit vector) of an ellipsoid.
function spots(parent, count, radius, scale, rng, filter) {
  const geo = new THREE.SphereGeometry(1, 8, 6);
  for (let i = 0, made = 0; i < 400 && made < count; i++) {
    const u = rng() * 2 - 1, th = rng() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const dir = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
    if (filter && !filter(dir)) continue;
    const size = 0.035 + rng() * 0.03;
    const sp = new THREE.Mesh(geo, M.spot);
    sp.scale.set(size, size, size * 0.35);
    sp.position.set(dir.x * radius * scale.x * 0.985, dir.y * radius * scale.y * 0.985, dir.z * radius * scale.z * 0.985);
    sp.lookAt(sp.position.clone().multiplyScalar(2));
    parent.add(sp); made++;
  }
}

function buildLeopard() {
  let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.set(0, 0.56, 0); root.add(body);

  // Torso: capsule along z + chest
  const torso = mesh(new THREE.CapsuleGeometry(0.25, 0.62, 6, 14), M.fur); torso.rotation.x = Math.PI / 2; torso.scale.set(1, 1, 0.92); body.add(torso);
  const chest = mesh(new THREE.SphereGeometry(0.27, 16, 12), M.fur, 0, 0.02, 0.3); body.add(chest);
  const torsoSpots = new THREE.Group(); torsoSpots.rotation.x = Math.PI / 2; body.add(torsoSpots);
  spots(torsoSpots, 26, 0.26, { x: 1, y: 1.55, z: 1 }, rng, d => d.z < 0.35);

  // Head
  const head = new THREE.Group(); head.position.set(0, 0.24, 0.5); body.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.23, 20, 16), M.fur); skull.scale.set(1.08, 0.96, 1); head.add(skull);
  spots(head, 7, 0.23, { x: 1.08, y: 0.96, z: 1 }, rng, d => d.y > 0.35 && d.z < 0.55);
  head.add(mesh(new THREE.SphereGeometry(0.12, 14, 10), M.fur, 0, -0.07, 0.17));
  const nose = mesh(new THREE.SphereGeometry(0.04, 10, 8), M.nose, 0, -0.03, 0.285); nose.scale.set(1.3, 0.8, 0.8); head.add(nose);
  for (const sx of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.062, 14, 10), M.eye, sx * 0.095, 0.035, 0.175); eye.scale.set(1, 1.15, 0.6); head.add(eye);
    head.add(mesh(new THREE.SphereGeometry(0.044, 12, 8), M.iris, sx * 0.097, 0.03, 0.205));
    head.add(mesh(new THREE.SphereGeometry(0.024, 10, 8), M.pupil, sx * 0.098, 0.03, 0.225));
    head.add(mesh(new THREE.SphereGeometry(0.01, 6, 4), M.eye, sx * 0.085, 0.05, 0.236));
    const ear = new THREE.Group(); ear.position.set(sx * 0.15, 0.17, -0.03); ear.rotation.z = -sx * 0.45; head.add(ear);
    ear.add(mesh(new THREE.ConeGeometry(0.075, 0.13, 10), M.fur));
    const inner = mesh(new THREE.ConeGeometry(0.045, 0.08, 10), M.pink, 0, -0.012, 0.025); ear.add(inner);
  }
  // Taqiya with a gold ornament band
  const hat = new THREE.Group(); hat.position.set(0, 0.2, -0.03); hat.rotation.x = -0.12; head.add(hat);
  hat.add(mesh(new THREE.CylinderGeometry(0.15, 0.175, 0.1, 20), M.hat));
  const band = mesh(new THREE.TorusGeometry(0.172, 0.018, 8, 28), M.gold, 0, -0.035, 0); band.rotation.x = Math.PI / 2; hat.add(band);
  hat.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), M.gold, 0, 0.06, 0));
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; hat.add(mesh(new THREE.SphereGeometry(0.014, 6, 4), M.gold, Math.cos(a) * 0.16, 0.01, Math.sin(a) * 0.16)); }

  // Scarf: a ring around the neck and a flapping end
  const scarf = new THREE.Group(); scarf.position.set(0, 0.08, 0.36); body.add(scarf);
  const ring = mesh(new THREE.TorusGeometry(0.2, 0.06, 10, 24), M.scarf); ring.rotation.x = Math.PI / 2 - 0.35; scarf.add(ring);
  const tailPivot = new THREE.Group(); tailPivot.position.set(0.12, 0.02, -0.14); scarf.add(tailPivot);
  const flap = mesh(new THREE.BoxGeometry(0.1, 0.03, 0.3), M.scarf, 0, 0, -0.15); tailPivot.add(flap);

  // Legs: hip → knee → paw
  const legs = [];
  for (const [x, z, front] of [[-0.15, 0.32, 1], [0.15, 0.32, 1], [-0.15, -0.3, 0], [0.15, -0.3, 0]]) {
    const hip = new THREE.Group(); hip.position.set(x, -0.08, z); body.add(hip);
    hip.add(mesh(new THREE.CapsuleGeometry(0.075, 0.18, 4, 10), M.fur, 0, -0.14, 0));
    const knee = new THREE.Group(); knee.position.set(0, -0.28, 0); hip.add(knee);
    knee.add(mesh(new THREE.CapsuleGeometry(0.06, 0.14, 4, 10), M.shade, 0, -0.1, 0));
    const paw = mesh(new THREE.SphereGeometry(0.08, 12, 8), M.fur, 0, -0.21, 0.03); paw.scale.set(1, 0.65, 1.25); knee.add(paw);
    legs.push({ hip, knee, front, side: x < 0 ? 0 : 1 });
  }

  // Tail: long and thick, with dark rings
  const tail = []; let parent = body; let px = 0, py = 0.06, pz = -0.62;
  for (let i = 0; i < 11; i++) {
    const seg = new THREE.Group(); seg.position.set(px, py, pz); parent.add(seg);
    const r = 0.1 + Math.sin(i / 10 * Math.PI) * 0.025;
    seg.add(mesh(new THREE.SphereGeometry(r, 12, 10), i % 4 === 3 || i === 10 ? M.spot : M.fur));
    tail.push(seg); parent = seg; px = 0; py = 0.02; pz = -0.11;
  }
  return { root, body, head, legs, tail, flapPivot: tailPivot };
}

function create(canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (_) { return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fbf6a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(300, 600, 500); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xbfdcff, 0.9); rim.position.set(-400, 200, -500); scene.add(rim);
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -4000, 4000);
  const L = buildLeopard(); scene.add(L.root);
  let W = 1, H = 1, yaw = Math.PI, tilt = 0;

  function resize(w, h, dpr) {
    W = w; H = h;
    renderer.setPixelRatio(Math.min(2, dpr || 1)); renderer.setSize(w, h, false);
    camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = -h; camera.updateProjectionMatrix();
  }

  // state: { x, y, size, t, mode: run|jump|idle|celebrate|hit, jump 0..1, rate, lean, reduced }
  function render(s) {
    const mode = s.mode || 'run';
    // Facing: away from camera while running, towards it when idle/celebrating.
    // Running: straight down the road (back to the camera), turning slightly only while changing lanes.
    const targetYaw = mode === 'idle' ? 0.35 : mode === 'celebrate' ? Math.PI * 2 : Math.PI - Math.max(-0.45, Math.min(0.45, (s.lean || 0) * 0.5));
    yaw += (targetYaw - yaw) * 0.12;
    if (mode !== 'celebrate' && yaw > Math.PI * 1.9) yaw -= Math.PI * 2;
    tilt += ((s.lean || 0) * -0.35 - tilt) * 0.2;
    const scale = (s.size || 120) / 1.25;
    L.root.scale.setScalar(scale);
    L.root.position.set(s.x, -s.y, 0);
    L.root.rotation.set(0.38, yaw, tilt);
    pose(L, s);
    renderer.render(scene, camera);
  }
  function clear() { renderer.clear(); }
  function dispose() { renderer.dispose(); }
  return { resize, render, clear, dispose };
}

// Limb/tail animation only (no placement), shared with the pitch page.
// s: { t, mode: run|jump|idle|celebrate|hit, jump 0..1, rate, reduced }
function pose(L, s) {
    const t = s.t || 0, mode = s.mode || 'run', rate = s.rate || 2.6;
    const p = t * rate * Math.PI * 2;
    const reduced = !!s.reduced;
    const gallop = mode === 'run' || mode === 'celebrate' || mode === 'hit';
    const amp = reduced ? 0.45 : 1;
    for (const leg of L.legs) {
      const off = leg.side * 0.35 + (leg.front ? 0 : Math.PI);
      if (mode === 'jump') {
        const tuck = Math.sin(Math.min(1, s.jump || 0) * Math.PI);
        leg.hip.rotation.x = (leg.front ? -0.9 : 0.9) * tuck;
        leg.knee.rotation.x = (leg.front ? 1.1 : -0.6) * tuck;
      } else if (gallop) {
        leg.hip.rotation.x = Math.sin(p + off) * 0.85 * amp;
        leg.knee.rotation.x = (leg.front ? Math.max(0, -Math.sin(p + off + 0.6)) * 1.2 : -Math.max(0, Math.sin(p + off + 0.6)) * 0.9) * amp;
      } else {
        leg.hip.rotation.x *= 0.85; leg.knee.rotation.x *= 0.85;
      }
    }
    const bob = gallop ? Math.abs(Math.sin(p)) * 0.07 * amp : Math.sin(t * 2) * 0.008;
    L.body.position.y = 0.56 + bob;
    L.body.rotation.x = mode === 'jump' ? (0.5 - (s.jump || 0)) * 0.5 : gallop ? Math.cos(p) * 0.08 * amp : 0;
    L.body.rotation.z = mode === 'hit' ? Math.sin(t * 40) * 0.12 : 0;
    L.head.rotation.x = gallop ? -Math.cos(p) * 0.08 * amp : Math.sin(t * 1.3) * 0.05;
    L.head.rotation.y = mode === 'idle' ? Math.sin(t * 0.8) * 0.25 : mode === 'hit' ? Math.sin(t * 30) * 0.2 : 0;
    L.tail.forEach((seg, i) => {
      // Droops back from the rump, then curls up at the tip (a snow leopard's thick tail).
      seg.rotation.x = (i === 0 ? -0.55 : i < 6 ? 0.02 : 0.2) + Math.sin(p * (gallop ? 1 : 0.25) - i * 0.55) * (gallop ? 0.1 : 0.05);
      seg.rotation.y = Math.sin(t * 2.2 - i * 0.45) * (gallop ? 0.1 : 0.16);
    });
    L.flapPivot.rotation.y = 0.4 + Math.sin(t * 14) * (gallop ? 0.35 : 0.12);
    L.flapPivot.rotation.x = -0.3 + Math.sin(t * 9) * 0.15;
}

export { buildLeopard, pose };
window.JazBarys3D = { create, buildLeopard, pose };
window.dispatchEvent(new Event('jaz:barys3d'));
