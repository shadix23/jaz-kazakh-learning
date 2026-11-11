const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../dist/motion.js'), 'utf8');

function harness() {
  const loads = new Map();
  const timers = new Map();
  let timerId = 0;
  let targets = [{ src: 'initial.png', dataset: {} }];
  class FakeImage {
    constructor() { this.complete = false; this.naturalWidth = 0; this.listeners = []; }
    set src(value) { this.url = value; loads.set(value, this); }
    get src() { return this.url; }
    addEventListener(type, callback) { if (type === 'load') this.listeners.push(callback); }
    resolve() { this.complete = true; this.naturalWidth = 640; this.listeners.splice(0).forEach(fn => fn()); }
  }
  const classList = { add() {}, remove() {}, toggle() {} };
  const document = {
    body: { dataset: {}, classList }, addEventListener() {},
    querySelector: () => ({ classList, offsetWidth: 80 }), querySelectorAll: () => targets
  };
  const window = { matchMedia: () => ({ matches: false }) };
  vm.runInNewContext(source, {
    window, document, Image: FakeImage,
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  return {
    api: window.JazMotion, document, loads, timers,
    targets: () => targets,
    replaceTargets() { targets = [{ src: 'new-route.png', dataset: {} }]; },
    resolve(file) { const image = loads.get('./assets/mascot-kit/' + file); assert.ok(image, `Requested asset: ${file}`); image.resolve(); },
    flush(delay) { for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.fn(); } }
  };
}

test('a late greeting image cannot overwrite a newer idle state', () => {
  const h = harness();
  h.api.react('hello');
  h.api.react('idle');
  h.resolve('04-wave.png');
  assert.equal(h.targets()[0].src, 'initial.png');
  h.resolve('01-primary.png');
  assert.match(h.targets()[0].src, /01-primary\.png$/);
  assert.equal(h.targets()[0].dataset.poseState, 'idle');
});

test('success returns to the cached primary pose after the reaction', () => {
  const h = harness();
  const root = { dataset: {}, querySelector: () => null, querySelectorAll: () => [] };
  h.api.mount(root, { route: 'home' });
  h.resolve('01-primary.png');
  h.api.react('success');
  h.resolve('05-celebrate.png');
  assert.equal(h.targets()[0].dataset.poseState, 'success');
  h.flush(1100);
  assert.equal(h.document.body.dataset.mascotState, 'idle');
  assert.match(h.targets()[0].src, /01-primary\.png$/);
});

test('late assets update the current route only and unknown states use the primary pose', () => {
  const h = harness();
  const old = h.targets()[0];
  h.api.react('thinking');
  h.replaceTargets();
  h.resolve('06-thinking.png');
  assert.equal(old.src, 'initial.png');
  assert.equal(h.targets()[0].dataset.poseState, 'thinking');
  h.api.react('../../untrusted');
  h.resolve('01-primary.png');
  assert.equal(h.document.body.dataset.mascotState, 'idle');
  assert.equal(h.loads.size, 2);
});
