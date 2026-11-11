const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../dist/curriculum.js');
const source = fs.readFileSync(require.resolve('../dist/metodist.js'), 'utf8');

function harness(saved) {
  const store = new Map(saved ? [['jaz.methodist.v1', JSON.stringify(saved)]] : []);
  const document = { body: { dataset: { mode: 'method' } } };
  const window = { JazCurriculum: C };
  vm.runInNewContext(source, { window, document, localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) }, console, setTimeout, Date });
  const host = { innerHTML: '', classList: { add() {} }, listeners: {}, addEventListener(name, handler) { this.listeners[name] = handler; }, removeEventListener() {}, contains() { return true; } };
  return { api: window.JazMetodist, document, host, saved: () => JSON.parse(store.get('jaz.methodist.v1')) };
}

test('lesson answer persists with existing baseline and leaves the learner page intact', () => {
  const h = harness();
  h.api.mount(h.host);
  h.api.renderStudentContext({ innerHTML: '', classList: { add() {} } });
  h.document.body.dataset.mode = 'student';
  h.host.innerHTML = 'Kazakh learner page';
  h.api.recordAnswer({ lessonId: 'ng', lessonTitle: 'Н мен Ң', questionId: 'ng-1', questionText: 'Қай сұрақ дұрыс?', correct: 1, answer: 'Барасың', correctAnswer: 'Барасың', date: '2026-11-11' });
  assert.equal(h.host.innerHTML, 'Kazakh learner page');
  const saved = h.saved(), rows = C.parseCSV(saved.csv), answer = rows.at(-1);
  assert.equal(rows.length, 4705);
  assert.equal(answer.topic, 'Н и Ң');
  assert.equal(saved.pending[0].linked, true);
  const baseline = rows.find(row => row.student_id === answer.student_id && row.subject === answer.subject && row.topic === answer.topic);
  assert.equal(answer.pretest, baseline.pretest);
  assert.equal(C.cell(rows.filter(row => row.subject === 'Казахский язык'), 'Н и Ң', '1А').answers, 157);
});

test('an imported empty CSV stays empty after reload instead of becoming demo data', () => {
  const h = harness({ csv: C.templateCSV(), source: 'csv', pending: [] });
  h.api.mount(h.host);
  assert.match(h.host.innerHTML, /Диагностика начинается с данных/);
  assert.doesNotMatch(h.host.innerHTML, /4704 ответов/);
});

test('three-book repair proposes changing the third-book class while retaining the opposite book', async () => {
  const rows = C.build('clean', 'Математика').map(row => ({ ...row, textbook: row.class === '1Г' ? 'C' : row.textbook }));
  const h = harness({ csv: C.exportCSV(rows), source: 'csv', pending: [] });
  h.api.mount(h.host);
  const control = { dataset: { metTab: 'comparison' } };
  await h.host.listeners.click({ target: { closest: () => control } });
  assert.match(h.host.innerHTML, /класс 1Г \(u2\) переходит с C на B/);
  assert.match(h.host.innerHTML, /другой класс этого учителя продолжает использовать A/);
});
