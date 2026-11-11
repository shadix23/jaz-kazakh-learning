/*
 * «Барыс жолы» — a three-lane answer runner (original Jaz! game).
 * The snow leopard runs across the steppe; each gate holds three answers to a
 * curriculum question. Run through the right one, jump hurdles, collect тиын.
 * Every answer is recorded for the methodist analytics.
 */
(function (global) {
  'use strict';
  const P = global.JazPractice;
  const doc = global.document;
  const KEY = 'jaz.game.v1';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DIFF = {
    easy: { label: 'Жеңіл', desc: 'Баяу жүгіріс. Қақпаға жақындағанда уақыт баяулайды.', speed: 15, slow: 0.4, gain: 0.35 },
    medium: { label: 'Орташа', desc: 'Баяу басталады, бірақ сұрақ үшін тоқтамайды.', speed: 19, slow: 1, gain: 0.55 },
    hard: { label: 'Қиын', desc: 'Толық жылдамдық. Сұрақты жүгіріп бара жатып оқисың.', speed: 25, slow: 1, gain: 0.75 }
  };
  const ICON = {
    heart: '<path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11Z"/>',
    coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/>',
    pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="M7 5l12 7-12 7z"/>',
    sound: '<path d="M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11"/>', mute: '<path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>', back: '<path d="m15 5-7 7 7 7"/>', trophy: '<path d="M7 3h10v7a5 5 0 0 1-10 0zM7 5H3v4a4 4 0 0 0 4 4m10-8h4v4a4 4 0 0 1-4 4m-5 2v6m-4 0h8"/>',
    check: '<path d="m5 12 4 4L19 6"/>', x: '<path d="m6 6 12 12M6 18 18 6"/>', arrowL: '<path d="m14 6-6 6 6 6"/>', arrowR: '<path d="m10 6 6 6-6 6"/>', arrowU: '<path d="m6 14 6-6 6 6"/>',
    swipe: '<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>', retry: '<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"/>', home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'
  };
  const svg = (name, cls = '') => `<svg class="g-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  /* --------------------------------------------------------------- stats */
  function load() {
    try { const v = JSON.parse(global.localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') return v; } catch (_) {}
    return {};
  }
  function stats() {
    const v = load();
    const best = v.bestBy && typeof v.bestBy === 'object' ? v.bestBy : {};
    return { best: Math.max(0, ...Object.values(best).map(Number).filter(Number.isFinite)), bestBy: best, coins: Number(v.coins) || 0, runs: Number(v.runs) || 0, bestCombo: Number(v.bestCombo) || 0, perfectRuns: Number(v.perfectRuns) || 0, subjects: Array.isArray(v.subjects) ? v.subjects : [], difficulty: DIFF[v.difficulty] ? v.difficulty : 'medium', subject: v.subject || '', topic: v.topic || '', muted: !!v.muted };
  }
  function save(patch) { try { global.localStorage.setItem(KEY, JSON.stringify({ ...load(), ...patch })); } catch (_) {} }

  /* --------------------------------------------------------------- audio */
  let actx = null;
  function beep(kind) {
    if (stats().muted) return;
    try {
      actx = actx || new (global.AudioContext || global.webkitAudioContext)();
      const notes = { ok: [[660, 0], [880, 0.09]], bad: [[200, 0], [150, 0.12]], coin: [[1180, 0]], jump: [[420, 0], [560, 0.05]], hit: [[120, 0]], record: [[660, 0], [880, 0.1], [1100, 0.2]] }[kind] || [];
      for (const [f, t] of notes) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = kind === 'bad' || kind === 'hit' ? 'sawtooth' : 'triangle';
        o.frequency.value = f; g.gain.setValueAtTime(0.0001, actx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.12, actx.currentTime + t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + t + 0.16);
        o.connect(g).connect(actx.destination); o.start(actx.currentTime + t); o.stop(actx.currentTime + t + 0.18);
      }
    } catch (_) {}
  }

  /* --------------------------------------------------------- game state */
  let host = null, opts = {}, canvas = null, ctx = null, canvas3d = null, barys = null, barysState = null, raf = 0, last = 0, listeners = [], game = null, screen = 'start', sprites = {}, scenery = null, resizeObs = null;
  const ZFAR = 95, F0 = 7;

  function on(target, type, fn, o) { target.addEventListener(type, fn, o); listeners.push([target, type, fn, o]); }
  function sprite(name) {
    if (!sprites[name]) { const img = new Image(); img.src = `./assets/mascot-kit/${name}.png`; sprites[name] = img; }
    return sprites[name];
  }

  function topicPool(subject, topicId) {
    if (topicId) return [topicId];
    // Long reading passages do not fit a runner: those topics stay in lessons.
    if (subject === 'mixed') return P.TOPICS.filter(t => !t.noGame).map(t => t.id);
    return P.topicsFor(subject).filter(t => !t.noGame).map(t => t.id);
  }

  function newGame(config) {
    const d = DIFF[config.difficulty];
    return {
      cfg: config, d, speed: d.speed, travel: 0, hearts: 3, score: 0, coins: 0, combo: 0, bestCombo: 0,
      lane: 1, laneX: 1, jumpT: -1, invuln: 0, shake: 0, flash: 0, flashColor: '', pose: '01-primary', poseT: 0,
      queue: P.set(topicPool(config.subject, config.topic), 30), gate: null, gateGap: 0, items: [], particles: [],
      answers: [], banner: null, runId: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), paused: false, over: false, slowmo: 1, record: false
    };
  }

  function nextQuestion() {
    if (!game.queue.length) game.queue = P.set(topicPool(game.cfg.subject, game.cfg.topic), 30);
    const q = game.queue.shift();
    game.gate = { q, z: ZFAR, resolved: false, chosen: -1 };
    // Hurdles and coins between gates; never a hurdle right in front of the gate.
    // Items sit between the runner and the gate, leaving the last 18 units clear for choosing a lane.
    for (let z = 30 + Math.random() * 6; z < ZFAR - 18; z += 15 + Math.random() * 9) {
      const lane = Math.floor(Math.random() * 3);
      if (Math.random() < 0.5) game.items.push({ kind: 'hurdle', lane, z });
      else for (let k = 0; k < 4; k++) game.items.push({ kind: 'coin', lane, z: z + k * 2.4, h: 0.15 });
    }
    renderQuestion();
  }

  /* ----------------------------------------------------------- rendering */
  function size() {
    if (!canvas) return;
    const r = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(2, global.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (barys) barys.resize(r.width, r.height, dpr);
    buildScenery(r.width, r.height);
  }
  function buildScenery(W, H) {
    const rnd = (a, b) => a + Math.random() * (b - a);
    const ridge = (n, base, amp) => Array.from({ length: n + 1 }, (_, i) => [i / n * W * 1.2 - W * 0.1, base - Math.abs(Math.sin(i * 1.7 + rnd(0, 0.4))) * amp - rnd(0, amp * 0.3)]);
    scenery = { W, H, far: ridge(9, H * 0.36, H * 0.13), near: ridge(14, H * 0.37, H * 0.07), stars: Array.from({ length: 50 }, () => [rnd(0, W), rnd(0, H * 0.3), rnd(0.5, 1.6)]) };
  }
  function proj(x, z, h) {
    const W = scenery.W, H = scenery.H, y0 = H * 0.37;
    const s = F0 / (Math.max(z, -F0 * 0.6) + F0);
    const laneW = Math.min(W * 0.27, 260);
    const camX = (game ? game.laneX - 1 : 0) * 0.35;
    return { x: W / 2 + (x - camX) * laneW * s, y: y0 + (H - y0) * s - (h || 0) * laneW * s, s, laneW };
  }
  const dark = () => doc.documentElement.dataset.theme === 'dark';

  function drawWorld(dt) {
    const W = scenery.W, H = scenery.H, y0 = H * 0.37, night = dark();
    ctx.save();
    if (game && game.shake > 0 && !reduced()) ctx.translate((Math.random() - 0.5) * game.shake * 10, (Math.random() - 0.5) * game.shake * 6);
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, y0);
    if (night) { sky.addColorStop(0, '#0b1430'); sky.addColorStop(1, '#2a3f6e'); } else { sky.addColorStop(0, '#5fb4f2'); sky.addColorStop(0.7, '#bfe3ff'); sky.addColorStop(1, '#ffe7c4'); }
    ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, y0 + 22);
    if (night) { ctx.fillStyle = '#fff'; for (const [x, y, r] of scenery.stars) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin((performance.now() / 900) + x); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
    // Sun / moon with a qoshqar-style ring
    ctx.fillStyle = night ? '#f4f1d8' : '#ffd36b'; ctx.beginPath(); ctx.arc(W * 0.78, y0 * 0.42, Math.min(W, H) * 0.05, 0, 7); ctx.fill();
    ctx.strokeStyle = night ? 'rgba(244,241,216,.25)' : 'rgba(255,211,107,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W * 0.78, y0 * 0.42, Math.min(W, H) * 0.075, 0, 7); ctx.stroke();
    // Mountains (Alatau) with snow caps
    const camShift = game ? (game.laneX - 1) * -12 : 0;
    const ridge = (pts, fill, cap) => { ctx.beginPath(); ctx.moveTo(-40, y0 + 2); for (const [x, y] of pts) ctx.lineTo(x + camShift, y); ctx.lineTo(W + 40, y0 + 2); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      if (cap) { ctx.fillStyle = cap; for (const [x, y] of pts) if (y < y0 - H * 0.08) { ctx.beginPath(); ctx.moveTo(x + camShift - 14, y + 14); ctx.lineTo(x + camShift, y); ctx.lineTo(x + camShift + 14, y + 14); ctx.closePath(); ctx.fill(); } } };
    ridge(scenery.far, night ? '#33466f' : '#8fb0d6', night ? '#cfd8ec' : '#f4f8ff');
    ridge(scenery.near, night ? '#23365a' : '#6f97c4');
    // Steppe ground
    const g = ctx.createLinearGradient(0, y0, 0, H);
    if (night) { g.addColorStop(0, '#1e3b33'); g.addColorStop(1, '#11251f'); } else { g.addColorStop(0, '#c9d98a'); g.addColorStop(1, '#8fb45a'); }
    ctx.fillStyle = g; ctx.fillRect(-20, y0, W + 40, H - y0 + 20);
    const travel = game ? game.travel : performance.now() / 120;
    // Moving bands: grass stripes and rumble edges in blue/gold
    for (let z = ZFAR; z > -4; z -= 4) {
      const zz = z - (travel % 8);
      const a = proj(-1.75, zz, 0), b = proj(1.75, zz, 0), a2 = proj(-1.75, zz + 4, 0), b2 = proj(1.75, zz + 4, 0);
      const band = Math.floor((zz + travel) / 4) % 2 === 0;
      ctx.fillStyle = night ? (band ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.05)') : (band ? 'rgba(255,255,255,.07)' : 'rgba(80,110,30,.06)');
      ctx.fillRect(-20, a2.y, W + 40, Math.max(1, a.y - a2.y));
      // road
      ctx.fillStyle = night ? (band ? '#2b3550' : '#28314a') : (band ? '#5d6a86' : '#56627d');
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(a2.x, a2.y); ctx.closePath(); ctx.fill();
      // rumble strips
      const r1 = proj(-1.92, zz, 0), r2 = proj(-1.92, zz + 4, 0), r3 = proj(1.92, zz, 0), r4 = proj(1.92, zz + 4, 0);
      ctx.fillStyle = band ? '#f2c14e' : '#2f6fde';
      ctx.beginPath(); ctx.moveTo(r1.x, r1.y); ctx.lineTo(a.x, a.y); ctx.lineTo(a2.x, a2.y); ctx.lineTo(r2.x, r2.y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(r3.x, r3.y); ctx.lineTo(r4.x, r4.y); ctx.lineTo(b2.x, b2.y); ctx.closePath(); ctx.fill();
      // lane dashes
      if (band) { ctx.fillStyle = 'rgba(255,255,255,.75)'; for (const lx of [-0.5, 0.5]) { const p1 = proj(lx - 0.03, zz, 0), p2 = proj(lx + 0.03, zz, 0), p3 = proj(lx + 0.03, zz + 2, 0), p4 = proj(lx - 0.03, zz + 2, 0); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill(); } }
    }
    // Roadside props: yurts, flag poles and bushes, recycled with travel
    const props = [];
    for (let i = 0; i < 12; i++) { const z = ((i * 13 - travel) % 156 + 156) % 156 - 4; props.push({ z, side: i % 2 ? 1 : -1, kind: ['yurt', 'pole', 'bush', 'bush'][i % 4] }); }
    props.sort((p, q) => q.z - p.z);
    const drawables = props.map(p => ({ z: p.z, draw: () => drawProp(p) }));
    if (game) {
      for (const it of game.items) drawables.push({ z: it.z, draw: () => drawItem(it) });
      if (game.gate) drawables.push({ z: game.gate.z, draw: () => drawGate(game.gate) });
    }
    drawables.sort((p, q) => q.z - p.z).forEach(d => { if (d.z < ZFAR + 2 && d.z > -6) d.draw(); });
    if (game) drawPlayer(dt);
    // particles
    if (game) for (const pt of game.particles) { ctx.save(); ctx.globalAlpha = Math.max(0, pt.life); ctx.fillStyle = pt.c; ctx.translate(pt.x, pt.y); ctx.rotate(pt.r); ctx.fillRect(-pt.w / 2, -pt.h / 2, pt.w, pt.h); ctx.restore(); }
    ctx.restore();
    if (game && game.flash > 0) { ctx.fillStyle = game.flashColor; ctx.globalAlpha = Math.min(0.35, game.flash); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  function drawProp(p) {
    const b = proj(p.side * (p.kind === 'yurt' ? 3.4 : 2.6), p.z, 0); const s = b.laneW * b.s;
    if (s < 2) return;
    if (p.kind === 'yurt') {
      ctx.fillStyle = '#f7f3ea'; ctx.beginPath(); ctx.moveTo(b.x - s * 0.55, b.y); ctx.lineTo(b.x - s * 0.55, b.y - s * 0.35); ctx.quadraticCurveTo(b.x, b.y - s * 0.95, b.x + s * 0.55, b.y - s * 0.35); ctx.lineTo(b.x + s * 0.55, b.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c0392b'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.beginPath(); ctx.moveTo(b.x - s * 0.55, b.y - s * 0.3); ctx.lineTo(b.x + s * 0.55, b.y - s * 0.3); ctx.stroke();
      ctx.fillStyle = '#2f6fde'; ctx.fillRect(b.x - s * 0.1, b.y - s * 0.25, s * 0.2, s * 0.25);
    } else if (p.kind === 'pole') {
      ctx.strokeStyle = '#7b5a3a'; ctx.lineWidth = Math.max(1, s * 0.035); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y - s * 1.1); ctx.stroke();
      ctx.fillStyle = '#00afca'; ctx.beginPath(); ctx.moveTo(b.x, b.y - s * 1.1); ctx.lineTo(b.x + p.side * -s * 0.42, b.y - s * 0.98); ctx.lineTo(b.x, b.y - s * 0.86); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fec50c'; ctx.beginPath(); ctx.arc(b.x + p.side * -s * 0.16, b.y - s * 0.98, s * 0.04, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = dark() ? '#2c5a3f' : '#6e9b3f'; for (const [dx, r] of [[-0.12, 0.13], [0.06, 0.17], [0.2, 0.11]]) { ctx.beginPath(); ctx.arc(b.x + dx * s, b.y - r * s * 0.8, r * s, 0, 7); ctx.fill(); }
    }
  }
  function drawItem(it) {
    const x = it.lane - 1;
    if (it.kind === 'coin') {
      if (it.taken) return;
      const c = proj(x, it.z, 0.35 + Math.sin((it.z + game.travel) * 0.4) * 0.05); const r = c.laneW * c.s * 0.11; if (r < 0.8) return;
      ctx.fillStyle = '#f5b301'; ctx.beginPath(); ctx.ellipse(c.x, c.y, r * Math.abs(Math.cos(performance.now() / 300 + it.z)) + r * 0.25, r, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c98a00'; ctx.lineWidth = Math.max(1, r * 0.2); ctx.stroke();
    } else {
      const l = proj(x - 0.42, it.z, 0), r = proj(x + 0.42, it.z, 0), h = 0.32 * l.laneW * l.s;
      if (h < 1) return;
      ctx.fillStyle = it.hit ? '#e5484d' : '#b5651d'; ctx.fillRect(l.x, l.y - h, r.x - l.x, h * 0.28); ctx.fillRect(l.x, l.y - h * 0.55, r.x - l.x, h * 0.2);
      ctx.fillStyle = '#7a4314'; ctx.fillRect(l.x, l.y - h, h * 0.14, h); ctx.fillRect(r.x - h * 0.14, l.y - h, h * 0.14, h);
    }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawGate(gate) {
    const q = gate.q;
    const top = proj(0, gate.z, 1.35); const lp = proj(-1.6, gate.z, 0), rp = proj(1.6, gate.z, 0);
    const unit = top.laneW * top.s; if (unit < 3) return;
    // arch posts with ornament band
    ctx.fillStyle = '#2f6fde'; ctx.fillRect(lp.x - unit * 0.08, top.y, unit * 0.12, lp.y - top.y); ctx.fillRect(rp.x - unit * 0.04, top.y, unit * 0.12, rp.y - top.y);
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(lp.x - unit * 0.08, top.y - unit * 0.1, rp.x - lp.x + unit * 0.2, unit * 0.12);
    for (let i = 0; i < 3; i++) {
      const c = proj(i - 1, gate.z, 0.95); const w = unit * 0.86, h = unit * 0.42;
      let fill = '#ffffff', stroke = '#d7e0ef', text = '#13213a';
      if (gate.resolved) { if (i === q.answer) { fill = '#dff6e8'; stroke = '#22a35a'; text = '#15803d'; } else if (i === gate.chosen) { fill = '#fde8e8'; stroke = '#e5484d'; text = '#c02626'; } else { fill = 'rgba(255,255,255,.55)'; } }
      roundRect(c.x - w / 2, c.y - h / 2, w, h, h * 0.22); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = Math.max(1, unit * 0.03); ctx.strokeStyle = stroke; ctx.stroke();
      const label = q.options[i];
      let fs = Math.max(6, h * 0.42); ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`;
      while (ctx.measureText(label).width > w * 0.88 && fs > 6) { fs -= 1; ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`; }
      ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, c.x, c.y + fs * 0.04);
    }
  }
  function drawPlayer(dt) {
    const g = game;
    const t = g.jumpT >= 0 ? g.jumpT : -1;
    const jumpH = t >= 0 ? Math.sin(Math.min(1, t) * Math.PI) * 0.9 : 0;
    const base = proj(g.laneX - 1, 0.6, 0);
    const bob = reduced() || t >= 0 ? 0 : Math.abs(Math.sin(g.travel * 0.9)) * 0.05;
    const p = proj(g.laneX - 1, 0.6, jumpH + bob);
    const w = base.laneW * 0.62, img = sprite(g.pose), ratio = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.91;
    // shadow
    ctx.fillStyle = 'rgba(10,20,40,.25)'; ctx.beginPath(); ctx.ellipse(base.x, base.y - 2, w * 0.36 * (1 - jumpH * 0.3), w * 0.09, 0, 0, 7); ctx.fill();
    if (barys) {
      const mode = g.over || g.paused ? 'idle' : t >= 0 ? 'jump' : g.poseT > 0 ? (g.pose === '05-celebrate' ? 'celebrate' : 'hit') : 'run';
      barysState = { x: p.x, y: p.y - (t >= 0 ? 0 : bob * base.laneW * 0.2), size: base.laneW * 1.05, mode, jump: Math.max(0, t), rate: Math.max(1.4, (g.speed * g.slowmo) / 7.5), lean: g.lane - g.laneX, reduced: reduced() };
      if (canvas3d) canvas3d.style.opacity = g.invuln > 0 && Math.floor(g.invuln * 12) % 2 ? '0.45' : '1';
      return;
    }
    if (g.invuln > 0 && Math.floor(g.invuln * 12) % 2) ctx.globalAlpha = 0.45;
    if (img.complete && img.naturalWidth) ctx.drawImage(img, p.x - w / 2, p.y - w * ratio, w, w * ratio);
    else { ctx.fillStyle = '#e8eef8'; ctx.beginPath(); ctx.arc(p.x, p.y - w * 0.4, w * 0.35, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  /* -------------------------------------------------------------- update */
  function burst(x, y, n, colors) { const k = reduced() ? Math.ceil(n / 4) : n; for (let i = 0; i < k; i++) game.particles.push({ x, y, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 420 - 80, r: Math.random() * 6, vr: (Math.random() - 0.5) * 10, w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, c: colors[i % colors.length], life: 1 }); }
  function update(dt) {
    const g = game;
    if (!g || g.paused || g.over) return;
    // easy mode slows time while the gate is in the reading zone
    const target = g.gate && !g.gate.resolved && g.gate.z < 42 && g.gate.z > 6 ? g.d.slow : 1;
    g.slowmo += (target - g.slowmo) * Math.min(1, dt * 4);
    const v = g.speed * g.slowmo, dz = v * dt;
    g.travel += dz; g.score += dz * 0.25;
    g.laneX += (g.lane - g.laneX) * Math.min(1, dt * 14);
    if (g.jumpT >= 0) { g.jumpT += dt / 0.62; if (g.jumpT >= 1) g.jumpT = -1; }
    g.invuln = Math.max(0, g.invuln - dt); g.shake = Math.max(0, g.shake - dt * 2.5); g.flash = Math.max(0, g.flash - dt * 1.6);
    if (g.poseT > 0) { g.poseT -= dt; if (g.poseT <= 0) g.pose = '01-primary'; }
    const airborne = g.jumpT > 0.12 && g.jumpT < 0.88;
    for (const it of g.items) {
      const before = it.z; it.z -= dz;
      if (before > 0.6 && it.z <= 0.6 && Math.round(g.laneX) === it.lane) {
        if (it.kind === 'coin' && !it.taken) { it.taken = true; g.coins++; g.score += 5; beep('coin'); const p = proj(it.lane - 1, 0.6, 0.4); burst(p.x, p.y, 4, ['#f5b301', '#ffe08a']); }
        if (it.kind === 'hurdle' && !airborne && g.invuln <= 0) hit(it);
      }
    }
    g.items = g.items.filter(it => it.z > -6);
    if (g.gate) {
      g.gate.z -= dz;
      if (!g.gate.resolved && g.gate.z <= 0.6) resolveGate();
      if (g.gate.z < -6) { g.gate = null; g.gateGap = 10; }
    } else {
      g.gateGap -= dz; if (g.gateGap <= 0) nextQuestion();
    }
    for (const pt of g.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 900 * dt; pt.r += pt.vr * dt; pt.life -= dt * 0.9; }
    g.particles = g.particles.filter(pt => pt.life > 0);
    updateHud();
  }
  function hit(it) {
    const g = game; it.hit = true; g.hearts--; g.combo = 0; g.invuln = 1.1; g.shake = 0.6; g.flash = 0.5; g.flashColor = '#e5484d'; g.pose = '12-rest'; g.poseT = 0.8; beep('hit');
    say('Кедергі! Секіру — ↑ не сырғыт', 'bad');
    if (g.hearts <= 0) finish();
  }
  function resolveGate() {
    const g = game, gate = g.gate, q = gate.q;
    gate.resolved = true; gate.chosen = Math.round(g.laneX);
    const ok = gate.chosen === q.answer;
    g.answers.push({ q, chosen: gate.chosen, ok });
    try { global.JazMetodist && global.JazMetodist.recordAnswer({ subject: q.subject, topic: q.topic, lessonId: q.topicId, lessonTitle: q.topicKk, questionId: q.id, questionText: q.prompt, correct: ok ? 1 : 0, answer: q.options[gate.chosen], correctAnswer: q.options[q.answer] }); } catch (_) {}
    const p = proj(gate.chosen - 1, 0.6, 0.9);
    if (ok) {
      g.combo++; g.bestCombo = Math.max(g.bestCombo, g.combo);
      const mult = 1 + Math.min(4, Math.floor(g.combo / 3));
      g.score += 25 * mult; g.pose = '05-celebrate'; g.poseT = 0.7; g.flash = 0.25; g.flashColor = '#22a35a';
      burst(p.x, p.y, 28, ['#2f6fde', '#f2c14e', '#22a35a', '#e5484d', '#00afca']); beep('ok');
      say(`${q.options[q.answer]} — дұрыс!${mult > 1 ? ` Комбо ×${mult}` : ''}`, 'ok');
      const best = stats().bestBy[g.cfg.difficulty] || 0;
      if (!g.record && best > 0 && g.score > best) { g.record = true; beep('record'); say('Жаңа рекорд!', 'record'); }
    } else {
      g.hearts--; g.combo = 0; g.shake = 0.5; g.flash = 0.45; g.flashColor = '#e5484d'; g.pose = '06-thinking'; g.poseT = 0.9; beep('bad');
      say(`Дұрыс жауап: ${q.options[q.answer]}`, 'bad');
      if (g.hearts <= 0) { setTimeout(finish, 650); }
    }
    g.speed = Math.min(g.d.speed + 12, g.speed + g.d.gain);
    renderQuestion();
  }

  function loop(now) {
    raf = global.requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (!ctx || !scenery) return;
    if (screen === 'run') update(dt);
    if (!barys && canvas3d && global.JazBarys3D) { barys = global.JazBarys3D.create(canvas3d); if (barys) size(); }
    barysState = null;
    drawWorld(dt);
    if (barys) {
      // On menus Barys stands in the middle lane, facing the player.
      const st = barysState || (() => { const b = proj(0, 0.6, 0); return { x: b.x, y: b.y, size: b.laneW * 0.9, mode: 'idle' }; })();
      barys.render({ ...st, t: now / 1000 });
    }
  }

  /* ----------------------------------------------------------------- HUD */
  function hud() { return host && host.querySelector('.g-hud'); }
  function updateHud() {
    const h = hud(); if (!h || !game) return;
    h.querySelector('[data-g=hearts]').innerHTML = [0, 1, 2].map(i => `<span class="g-heart ${i < game.hearts ? '' : 'empty'}">${svg('heart')}</span>`).join('');
    h.querySelector('[data-g=coins]').textContent = game.coins;
    h.querySelector('[data-g=score]').textContent = Math.floor(game.score);
    const combo = h.querySelector('[data-g=combo]');
    const mult = 1 + Math.min(4, Math.floor(game.combo / 3));
    combo.textContent = game.combo >= 2 ? `${game.combo} қатарынан${mult > 1 ? ` · ×${mult}` : ''}` : '';
    combo.classList.toggle('show', game.combo >= 2);
  }
  function renderQuestion() {
    const card = host && host.querySelector('.g-question'); if (!card || !game) return;
    const gate = game.gate;
    if (!gate) { card.classList.add('idle'); return; }
    const q = gate.q;
    card.classList.remove('idle');
    card.innerHTML = `<span class="g-q-topic">${esc(q.topicKk)}</span><p class="g-q-text">${esc(q.prompt)}</p><div class="g-q-options">${q.options.map((o, i) => `<button type="button" data-g-lane="${i}" class="${gate.resolved ? (i === q.answer ? 'ok' : i === gate.chosen ? 'bad' : 'dim') : (game.lane === i ? 'here' : '')}">${gate.resolved && i === q.answer ? svg('check') : ''}${esc(o)}</button>`).join('')}</div>`;
  }
  let bannerTimer = 0;
  function say(text, tone) {
    const b = host && host.querySelector('.g-banner'); if (!b) return;
    b.textContent = text; b.className = `g-banner show ${tone}`; b.setAttribute('role', 'status');
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('show'), 1400);
  }

  /* ------------------------------------------------------------- screens */
  function startScreen() {
    screen = 'start'; game = null;
    const st = stats();
    const subj = st.subject && (st.subject === 'mixed' || P.SUBJECTS.some(s => s.id === st.subject)) ? st.subject : (opts.subject || P.KAZ);
    const forced = opts.topicId && P.TOPICS.find(t => t.id === opts.topicId && !t.noGame);
    const subject = forced ? forced.subject : subj;
    const topics = subject === 'mixed' ? [] : P.topicsFor(subject).filter(t => !t.noGame);
    const topic = forced ? forced.id : (topics.some(t => t.id === st.topic) ? st.topic : '');
    host.querySelector('.g-overlay').innerHTML = `<div class="g-panel g-start">
      <div class="g-start-head"><img src="./assets/mascot-kit/04-wave.png" alt="" width="120" height="110"><div><h1>Барыс жолы</h1><p>Дұрыс жауаптың жолымен жүгір, кедергіден секір, тиын жина.</p></div></div>
      <div class="g-chips"><span>${svg('trophy')}Рекорд <b>${st.best}</b></span><span>${svg('coin')}Тиын <b>${st.coins}</b></span><span>Жүгіріс <b>${st.runs}</b></span></div>
      <div class="g-howto"><strong>Қалай ойнаймыз</strong><div><span class="g-keys"><kbd>${svg('arrowL')}</kbd><kbd>${svg('arrowR')}</kbd><kbd>${svg('arrowU')}</kbd></span>Жолды ауыстыр, ↑ немесе бос орын — секіру.</div><div><span class="g-keys"><kbd>${svg('swipe')}</kbd></span>Телефонда: солға/оңға сырғыт, жоғары — секіру. Жауапты басып та таңдауға болады.</div></div>
      <fieldset class="g-field"><legend>Пән</legend><div class="g-seg">${[[P.KAZ, 'Қазақ тілі'], [P.MATH, 'Математика'], ['mixed', 'Аралас']].map(([v, l]) => `<button type="button" data-g-subject="${esc(v)}" aria-pressed="${v === subject}">${l}</button>`).join('')}</div></fieldset>
      <label class="g-field g-topic">Тақырып<select data-g-topic>${['<option value="">Барлық тақырып</option>'].concat(topics.map(t => `<option value="${esc(t.id)}"${t.id === topic ? ' selected' : ''}>${esc(t.kk)}</option>`)).join('')}</select></label>
      <fieldset class="g-field"><legend>Қиындық</legend><div class="g-diff">${Object.entries(DIFF).map(([k, d]) => `<button type="button" data-g-diff="${k}" aria-pressed="${k === st.difficulty}"><strong>${d.label}</strong><span>${d.desc}</span>${st.bestBy[k] ? `<em>Рекорд ${st.bestBy[k]}</em>` : ''}</button>`).join('')}</div></fieldset>
      <button type="button" class="g-play" data-g-action="play">${svg('play', 'fill')}Ойнау</button>
    </div>`;
    host.querySelector('.g-overlay').classList.add('show');
    host.querySelector('.g-hud').hidden = true;
    host.dataset.subject = subject; host.dataset.topic = topic;
  }
  function play() {
    const st = stats();
    const cfg = { subject: host.dataset.subject || P.KAZ, topic: host.dataset.topic || '', difficulty: st.difficulty };
    save({ subject: cfg.subject, topic: cfg.topic });
    game = newGame(cfg); screen = 'run'; last = 0;
    host.querySelector('.g-overlay').classList.remove('show');
    host.querySelector('.g-overlay').innerHTML = '';
    host.querySelector('.g-hud').hidden = false;
    game.gateGap = 6; updateHud(); renderQuestion();
    say('Дайынсың ба? Жүгір!', 'ok');
    canvas.focus({ preventScroll: true });
  }
  function pause(state) {
    if (!game || game.over || screen !== 'run') return;
    game.paused = state == null ? !game.paused : state;
    const o = host.querySelector('.g-overlay');
    if (game.paused) {
      o.innerHTML = `<div class="g-panel g-pause"><h2>Үзіліс</h2><p>${Math.floor(game.score)} ұпай · ${game.answers.filter(a => a.ok).length} дұрыс</p><button type="button" class="g-play" data-g-action="resume">${svg('play', 'fill')}Жалғастыру</button><button type="button" class="g-ghost" data-g-action="finish">Жүгірісті аяқтау</button></div>`;
      o.classList.add('show');
    } else { o.classList.remove('show'); o.innerHTML = ''; last = 0; }
    const btn = host.querySelector('[data-g-action=pause]'); if (btn) btn.innerHTML = svg(game.paused ? 'play' : 'pause');
  }
  function finish() {
    const g = game; if (!g || g.over) return;
    g.over = true; screen = 'end';
    const before = stats();
    const correct = g.answers.filter(a => a.ok).length, total = g.answers.length, score = Math.floor(g.score);
    const bestBy = { ...before.bestBy }; const prevBest = bestBy[g.cfg.difficulty] || 0; const record = score > prevBest;
    if (record) bestBy[g.cfg.difficulty] = score;
    const subjects = [...new Set(before.subjects.concat(g.cfg.subject === 'mixed' ? [P.KAZ, P.MATH] : [g.cfg.subject]))];
    const after = { bestBy, coins: before.coins + g.coins, runs: before.runs + 1, bestCombo: Math.max(before.bestCombo, g.bestCombo), perfectRuns: before.perfectRuns + (total >= 8 && correct === total ? 1 : 0), subjects };
    save(after);
    const unlocked = P.badgesFor({ ...stats() }).filter(id => !P.badgesFor(before).includes(id)).map(id => P.BADGES.find(b => b.id === id));
    const xp = opts.onFinish ? opts.onFinish({ runId: g.runId, correct, total, score, coins: g.coins }) || 0 : 0;
    const mistakes = g.answers.filter(a => !a.ok), rights = g.answers.filter(a => a.ok);
    const o = host.querySelector('.g-overlay');
    host.querySelector('.g-hud').hidden = true;
    o.innerHTML = `<div class="g-panel g-end">
      <h2>${record && prevBest ? 'Жаңа рекорд!' : 'Жол аяқталды'}</h2>
      <div class="g-score-card${record && prevBest ? ' record' : ''}"><span>Барыс жолы · ${DIFF[g.cfg.difficulty].label}</span><b>${score}</b><small>ұпай</small><div class="g-score-meta"><span>${correct} / ${total} дұрыс</span><span>Рекорд ${Math.max(score, prevBest)}</span><span>+${g.coins} тиын</span>${xp ? `<span>+${xp} XP</span>` : ''}</div></div>
      ${unlocked.length ? `<div class="g-badges">${unlocked.map(b => `<div class="g-badge">${svg('trophy')}<span><strong>${esc(b.title)}</strong><small>${esc(b.desc)}</small></span></div>`).join('')}</div>` : ''}
      <div class="g-end-actions"><button type="button" class="g-play" data-g-action="again">${svg('retry')}Қайта жүгіру</button><button type="button" class="g-ghost" data-g-action="menu">Баптаулар</button><a class="g-ghost" href="#home">${svg('home')}Басты бет</a></div>
      ${mistakes.length ? `<h3>Қай жерде қателестің</h3><ul class="g-review">${mistakes.map(a => reviewRow(a)).join('')}</ul>` : total ? '<p class="g-perfect">Бірде-бір қате жоқ — керемет!</p>' : ''}
      ${rights.length ? `<details class="g-rights"><summary>Дұрыс жауаптарың (${rights.length})</summary><ul class="g-review">${rights.map(a => reviewRow(a)).join('')}</ul></details>` : ''}
    </div>`;
    o.classList.add('show');
    if (record && prevBest) beep('record');
  }
  function reviewRow(a) {
    const q = a.q;
    return `<li class="${a.ok ? 'ok' : 'bad'}"><p class="g-r-q">${esc(q.prompt)}</p>${a.ok ? '' : `<p class="g-r-pick">${svg('x')}Сен таңдадың: <b>${esc(q.options[a.chosen])}</b></p>`}<p class="g-r-right">${svg('check')}Дұрыс жауап: <b>${esc(q.options[q.answer])}</b></p><details><summary>Неге?</summary><p>${esc(q.explanation)}</p></details><span class="g-r-topic">${esc(q.topicKk)}</span></li>`;
  }

  /* --------------------------------------------------------------- input */
  function move(dir) { if (screen !== 'run' || !game || game.paused || game.over) return; game.lane = Math.max(0, Math.min(2, game.lane + dir)); renderQuestion(); }
  function setLane(i) { if (screen !== 'run' || !game || game.paused || game.over) return; game.lane = i; renderQuestion(); }
  function jump() { if (screen !== 'run' || !game || game.paused || game.over || game.jumpT >= 0) return; game.jumpT = 0; beep('jump'); }
  function onKey(e) {
    if (!host || !host.isConnected) return;
    const k = e.key;
    if (screen === 'run') {
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'ф') { e.preventDefault(); move(-1); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D' || k === 'в') { e.preventDefault(); move(1); }
      else if (k === 'ArrowUp' || k === ' ' || k === 'w' || k === 'W' || k === 'ц') { e.preventDefault(); jump(); }
      else if (k === 'Escape' || k === 'p' || k === 'P') { e.preventDefault(); pause(); }
      else if (k === '1' || k === '2' || k === '3') setLane(Number(k) - 1);
    } else if (screen === 'start' && k === 'Enter' && !(e.target && e.target.closest && e.target.closest('select'))) { e.preventDefault(); play(); }
  }
  let touch = null;
  function onDown(e) { if (screen !== 'run' || e.target.closest('button,select,a')) return; touch = { x: e.clientX, y: e.clientY, t: performance.now() }; }
  function onUp(e) {
    if (!touch) return;
    const dx = e.clientX - touch.x, dy = e.clientY - touch.y; const t = touch; touch = null;
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < -30) jump();
    else if (performance.now() - t.t < 300) { const r = host.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width; move(x < 0.33 ? -1 : x > 0.67 ? 1 : 0); }
  }
  function onClick(e) {
    const t = e.target.closest('[data-g-action],[data-g-subject],[data-g-diff],[data-g-lane]'); if (!t) return;
    const d = t.dataset;
    if (d.gLane) return setLane(Number(d.gLane));
    if (d.gSubject) { host.dataset.subject = d.gSubject; host.dataset.topic = ''; opts.topicId = ''; save({ subject: d.gSubject, topic: '' }); return startScreen(); }
    if (d.gDiff) { save({ difficulty: d.gDiff }); host.querySelectorAll('[data-g-diff]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.gDiff === d.gDiff))); return; }
    const a = d.gAction;
    if (a === 'play' || a === 'again') play();
    else if (a === 'menu') startScreen();
    else if (a === 'pause' || a === 'resume') pause(a === 'resume' ? false : undefined);
    else if (a === 'finish') { pause(false); finish(); }
    else if (a === 'mute') { const m = !stats().muted; save({ muted: m }); t.innerHTML = svg(m ? 'mute' : 'sound'); t.setAttribute('aria-label', m ? 'Дыбысты қосу' : 'Дыбысты өшіру'); }
    else if (a === 'exit') { global.location.hash = 'home'; }
  }
  function onChange(e) { if (e.target.matches('[data-g-topic]')) { host.dataset.topic = e.target.value; save({ topic: e.target.value }); } }
  function onVisibility() { if (doc.hidden) pause(true); }

  /* ------------------------------------------------------------ lifecycle */
  function mount(container, options) {
    destroy();
    if (!container || !P) return;
    host = container; opts = { ...(options || {}) };
    const st = stats();
    host.innerHTML = `<div class="g-stage"><canvas class="g-canvas" tabindex="0" aria-label="Барыс жолы ойыны. Сұрақ және жауаптар төмендегі карточкада."></canvas><canvas class="g-3d" aria-hidden="true"></canvas>
      <div class="g-top"><button type="button" class="g-icon-btn" data-g-action="exit" aria-label="Ойыннан шығу">${svg('back')}</button><strong>Барыс жолы</strong><div><button type="button" class="g-icon-btn" data-g-action="mute" aria-label="${st.muted ? 'Дыбысты қосу' : 'Дыбысты өшіру'}">${svg(st.muted ? 'mute' : 'sound')}</button></div></div>
      <div class="g-hud" hidden><div class="g-hud-row"><div class="g-hearts" data-g="hearts"></div><div class="g-hud-right"><span class="g-coins">${svg('coin')}<b data-g="coins">0</b></span><button type="button" class="g-icon-btn" data-g-action="pause" aria-label="Үзіліс">${svg('pause')}</button></div></div>
        <div class="g-question idle" aria-live="polite"></div><div class="g-combo" data-g="combo"></div><div class="g-score"><small>ұпай</small><b data-g="score">0</b></div></div>
      <div class="g-banner" aria-live="assertive"></div><div class="g-overlay"></div></div>`;
    canvas = host.querySelector('.g-canvas'); ctx = canvas.getContext('2d'); canvas3d = host.querySelector('.g-3d');
    ['01-primary', '05-celebrate', '06-thinking', '12-rest', '04-wave'].forEach(sprite);
    size();
    if (global.ResizeObserver) { resizeObs = new ResizeObserver(size); resizeObs.observe(host.querySelector('.g-stage')); }
    on(doc, 'keydown', onKey); on(host, 'click', onClick); on(host, 'change', onChange);
    on(host, 'pointerdown', onDown); on(host, 'pointerup', onUp); on(doc, 'visibilitychange', onVisibility);
    startScreen();
    last = 0; raf = global.requestAnimationFrame(loop);
  }
  function destroy() {
    if (raf) global.cancelAnimationFrame(raf); raf = 0;
    for (const [t, type, fn, o] of listeners) t.removeEventListener(type, fn, o);
    listeners = [];
    if (resizeObs) resizeObs.disconnect(); resizeObs = null;
    if (barys) barys.dispose();
    barys = null; canvas3d = null; barysState = null;
    game = null; host = null; canvas = null; ctx = null; screen = 'start';
  }

  global.JazGame = { mount, destroy, stats };
})(window);
