const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../dist/curriculum.js');
const source = fs.readFileSync(require.resolve('../dist/metodist.js'), 'utf8');

function harness(saved) {
  const store = new Map(saved ? [['jaz.methodist.v2', JSON.stringify(saved)]] : []);
  const document = { body: { dataset: { mode: 'method' }, classList: { add() {}, remove() {} } }, getElementById: () => null, activeElement: null };
  const window = { JazCurriculum: C, document, scrollY: 0, scrollTo() {}, matchMedia: () => ({ matches: true }) };
  window.localStorage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
  vm.runInNewContext(source, { window, document, console, setTimeout, clearTimeout, Date, Blob: class {}, URL });
  const host = { innerHTML: '', offsetWidth: 0, classList: { add() {} }, listeners: {}, addEventListener(name, handler) { this.listeners[name] = handler; }, removeEventListener() {}, contains() { return false; }, querySelectorAll: () => [], querySelector: () => null };
  const click = attrs => host.listeners.click({ target: { closest: () => ({ dataset: attrs }) } });
  const change = (field, value, extra = {}) => host.listeners.change({ target: { matches: () => false, dataset: { mxField: field }, value, ...extra } });
  return { api: window.JazMetodist, document, host, click, change, saved: () => JSON.parse(store.get('jaz.methodist.v2')) };
}

test('methodist workspace renders every section with demo data', () => {
  const h = harness();
  h.api.mount(h.host);
  assert.match(h.host.innerHTML, /Что нужно сделать/);
  assert.match(h.host.innerHTML, /Загрузить результаты СОР\/СОЧ/);
  assert.match(h.host.innerHTML, /Демо-данные \(синтетика\)/);
  const expectations = { overview: /Успеваемость[\s\S]*Качество знаний[\s\S]*Итоги по классам[\s\S]*Решения для педсовета/, students: /Группы поддержки/, topics: /Тема × класс/, books: /Кто по какому учебнику работает[\s\S]*Учебник × тема/, hours: /План по темам[\s\S]*Скачать план/, report: /АНАЛИТИЧЕСКАЯ СПРАВКА[\s\S]*Итоги по классам[\s\S]*Выводы и рекомендации/, data: /Вставьте таблицу результатов[\s\S]*Формат CSV/ };
  for (const [tab, re] of Object.entries(expectations)) { h.click({ mxTab: tab }); assert.match(h.host.innerHTML, re, tab); }
});

test('topic drawer shows items, typical errors and actions', () => {
  const h = harness();
  h.api.mount(h.host);
  h.click({ mxTab: 'topics' });
  h.click({ mxTopic: 'Сложение и вычитание рациональных чисел', class: '' });
  assert.match(h.host.innerHTML, /role="dialog"/);
  assert.match(h.host.innerHTML, /−13/);
  assert.match(h.host.innerHTML, /Что сделать/);
  h.click({ mxClose: '' });
  assert.doesNotMatch(h.host.innerHTML, /role="dialog"/);
});

test('hours steppers change the plan and persist the program', () => {
  const h = harness();
  h.api.mount(h.host);
  h.click({ mxTab: 'hours' });
  h.click({ mxReserve: '2' });
  h.click({ mxHours: 'Модуль числа', delta: '1' });
  const saved = h.saved();
  assert.equal(saved.st.reserve, 6);
  assert.equal(saved.st.program['Математика'].find(p => p.topic === 'Модуль числа').hours, 7);
  assert.match(h.host.innerHTML, /Программа[\s\S]*46 ч/);
});

test('subject switch and confounded scenario', () => {
  const h = harness();
  h.api.mount(h.host);
  h.click({ mxTab: 'topics' });
  h.click({ mxSet: 'subject', value: 'Казахский язык' });
  assert.match(h.host.innerHTML, /Звуки Н и Ң/);
  h.click({ mxTab: 'data' });
  h.change('scenario', 'confounded');
  h.click({ mxTab: 'books' });
  assert.match(h.host.innerHTML, /Почему вывод заблокирован/);
  assert.match(h.host.innerHTML, /Что исправит/);
});

test('an imported empty CSV stays empty after reload instead of becoming demo data', () => {
  const h = harness({ st: { source: 'csv', tab: 'overview' }, csv: C.templateCSV(), live: [] });
  h.api.mount(h.host);
  h.click({ mxTab: 'overview' });
  assert.match(h.host.innerHTML, /Начните с данных/);
  assert.match(h.host.innerHTML, /Ваши данные/);
});

test('trainer answer is linked to the selected student and reaches the analytics', () => {
  const h = harness();
  h.api.mount(h.host);
  const student = { innerHTML: '', dataset: {}, addEventListener() {}, querySelector: () => null };
  h.api.renderStudentContext(student);
  assert.match(student.innerHTML, /Оқушы коды/);
  h.document.body.dataset.mode = 'student';
  h.host.innerHTML = 'Kazakh learner page';
  h.api.recordAnswer({ lessonId: 'ng', lessonTitle: 'Н мен Ң', questionId: 'ng-1', questionText: 'Қай сұрақ дұрыс?', correct: 1, answer: 'барасың', correctAnswer: 'барасың', date: '2026-11-11' });
  assert.equal(h.host.innerHTML, 'Kazakh learner page');
  const saved = h.saved();
  assert.equal(saved.live.length, 1);
  assert.equal(saved.live[0].topic, 'Звуки Н и Ң');
  assert.equal(saved.live[0].subject, 'Казахский язык');
  assert.equal(saved.pending[0].linked, true);
  const restored = harness(saved);
  restored.api.mount(restored.host);
  assert.match(restored.host.innerHTML, /\+1 живых/);
});

test('Kazakh interface, text size and the Kazakh report', () => {
  const h = harness();
  h.api.mount(h.host);
  h.click({ mxSet: 'lang', value: 'kk' });
  assert.match(h.host.innerHTML, /Не істейміз/);
  h.click({ mxSet: 'zoom', value: '1.3' });
  assert.equal(h.saved().st.zoom, 1.3);
  h.click({ mxTab: 'report' });
  assert.match(h.host.innerHTML, /ТАЛДАУ АНЫҚТАМАСЫ/);
  h.click({ mxSet: 'docLang', value: 'ru' });
  assert.match(h.host.innerHTML, /АНАЛИТИЧЕСКАЯ СПРАВКА/);
});
