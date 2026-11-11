const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../dist/practice.js');
const C = require('../dist/curriculum.js');

function seeded(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test('practice topics match the methodist curriculum exactly', () => {
  const program = C.demoProgram();
  const curriculum = Object.entries(program).flatMap(([s, list]) => list.map((t) => `${s}|${t.topic}`)).sort();
  assert.deepEqual(P.TOPICS.map((t) => `${t.subject}|${t.topic}`).sort(), curriculum);
});

test('every generator yields three distinct options, one correct answer and an explanation', () => {
  const rand = seeded(7);
  for (const t of P.TOPICS) for (let i = 0; i < 300; i++) {
    const it = P.generate(t.id, rand);
    assert.equal(it.options.length, 3, t.id);
    assert.equal(new Set(it.options).size, 3, `${t.id}: ${it.options}`);
    assert.ok(it.answer >= 0 && it.answer < 3);
    assert.ok(it.explanation.length > 15);
    assert.doesNotMatch(it.options.join(' '), /undefined|NaN/);
  }
});

test('math answers are actually correct', () => {
  const rand = seeded(11);
  const val = (s) => Number(String(s).replace('−', '-').replace(',', '.').replace(/[^\d.-]/g, ''));
  for (let i = 0; i < 200; i++) {
    const it = P.generate('m-addsub', rand);
    const m = it.prompt.match(/^(−?\d+) ([+−]) \(?(−?\d+)\)? = \?$/);
    if (!m) continue;
    const a = val(m[1]), b = val(m[3]);
    assert.equal(val(it.options[it.answer]), m[2] === '+' ? a + b : a - b, it.prompt);
  }
  for (let i = 0; i < 100; i++) {
    const it = P.generate('m-abs', rand);
    const m = it.prompt.match(/^\|−(\d+)\| = \?$/);
    if (m) assert.equal(val(it.options[it.answer]), Number(m[1]));
  }
});

test('game XP and badges are bounded and earned honestly', () => {
  assert.equal(P.runXp({ correct: 0 }), 0);
  assert.equal(P.runXp({ correct: 5 }), 20);
  assert.equal(P.runXp({ correct: 100 }), 60);
  assert.deepEqual(P.badgesFor({}), []);
  assert.ok(P.badgesFor({ runs: 1, bestCombo: 10, best: 350, subjects: ['a', 'b'], coins: 120, perfectRuns: 1 }).length === P.BADGES.length);
});
