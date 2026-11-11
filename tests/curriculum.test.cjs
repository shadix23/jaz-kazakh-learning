const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../dist/curriculum.js');

const row = (overrides = {}) => ({ student_id: 's-1', class: '7А', teacher: 't-1', subject: 'Математика', textbook: 'А', topic: 'Дроби', question_id: 'q-1', correct: 1, pretest: 40, date: '2026-11-11', ...overrides });
const csv = rows => engine.exportCSV(rows);

test('CSV roundtrip preserves optional text, quotes, delimiters and normalized multiline fields', () => {
  const rows = [row({ question_text: 'Что значит "1/2", а;б?\nОбъясни.', answer: '1/2', correct_answer: 'Половина' }), row({ student_id: 's-2', correct: 0, answer: '1/3' })];
  const parsed = engine.parseCSV('\uFEFF' + csv(rows));
  assert.equal(parsed.length, 2);
  for (const key of Object.keys(rows[0])) assert.equal(parsed[0][key], rows[0][key]);
  assert.equal(parsed[1].pretest, 40);
  assert.equal(parsed[1].correct, 0);
  assert.deepEqual(engine.parseCSV(engine.templateCSV(parsed)), parsed);
  assert.deepEqual(engine.parseCSV(engine.templateCSV()), []);
});

test('semicolon CSV and CRLF are accepted with opaque student codes and one textbook', () => {
  const headers = engine.REQUIRED_COLUMNS.join(';');
  const values = engine.REQUIRED_COLUMNS.map(key => row({ student_id: 'e4d9:opaque_17' })[key]).join(';');
  const rows = engine.parseCSV('\uFEFF' + headers + '\r\n' + values + '\r\n');
  assert.equal(rows[0].student_id, 'e4d9:opaque_17');
  assert.equal(rows[0].textbook, 'А');
});

test('malformed CSV yields Russian errors with source row numbers', () => {
  const header = engine.REQUIRED_COLUMNS.join(',');
  for (const [body, pattern] of [
    ['"unterminated', /Строка 2: не закрыта кавычка/u],
    ['abc"def', /Строка 2: кавычка/u],
    ['"abc"oops', /Строка 2: после/u],
    ['a,b', /Строка 2: число полей/u]
  ]) assert.throws(() => engine.parseCSV(header + '\n' + body), pattern);
  assert.throws(() => engine.parseCSV(header + ',class\n'), /Строка 1: повторяются/u);
  assert.throws(() => engine.parseCSV('student_id,class\n'), /Строка 1: отсутствуют/u);
  assert.throws(() => engine.parseCSV(''), /Строка 1: файл пуст/u);
});

test('invalid values and inconsistent identity metadata are rejected', () => {
  for (const overrides of [{ correct: 2 }, { correct: '' }, { pretest: -1 }, { pretest: 101 }, { pretest: 'NaN' }, { date: '2026-02-30' }, { date: '11.11.2026' }, { student_id: '' }]) {
    assert.throws(() => engine.parseCSV(csv([row(overrides)])), /Строка 2:/u);
  }
  for (const overrides of [{ class: '7Б' }, { teacher: 't-2' }, { pretest: 50 }, { textbook: 'Б' }]) {
    assert.throws(() => engine.parseCSV(csv([row(), row({ question_id: 'q-2', ...overrides })])), /Строка 3:/u);
  }
  assert.doesNotThrow(() => engine.parseCSV(csv([row(), row({ subject: 'Казахский язык', teacher: 't-2', pretest: 50 })])));
});

test('single threshold constant supplies precise color boundaries', () => {
  assert.equal(engine.band(79.9), 'mid');
  assert.equal(engine.band(80), 'good');
  assert.equal(engine.band(59.9), 'low');
  assert.equal(engine.band(60), 'mid');
  assert.equal(engine.band(null), 'missing');
  assert.equal(engine.THRESHOLDS[0].min, 80);
  assert.equal(engine.THRESHOLDS[1].min, 60);
});

test('diagnostic cell is answer weighted and counts unique students', () => {
  const result = engine.cell([row(), row({ question_id: 'q-2', correct: 0 }), row({ student_id: 's-2' })], 'Дроби', '7А');
  assert.equal(result.n, 2);
  assert.equal(result.answers, 3);
  assert.ok(Math.abs(result.score - 200 / 3) < 1e-10);
  assert.equal(result.lowData, true);
  assert.equal(result.questions[0].id, 'q-2');
  assert.equal(result.questions[0].errorRate, 100);
  assert.deepEqual(engine.cell([], 'Дроби', '7А'), { score: null, n: 0, answers: 0, lowData: true, questions: [] });
});

test('low-data flag requires both at least ten students and thirty answers', () => {
  const rows = Array.from({ length: 30 }, (_, i) => row({ student_id: 's-' + (i % 10), question_id: 'q-' + Math.floor(i / 10) }));
  assert.equal(engine.cell(rows).lowData, false);
  assert.equal(engine.cell(rows.slice(0, 29)).lowData, true);
  assert.equal(engine.cell(rows.map(item => ({ ...item, student_id: 's-' + Number(item.student_id.slice(2)) % 9 }))).lowData, true);
});

test('frequent wrong answer only uses provided responses to incorrect answers', () => {
  const result = engine.cell([row({ correct: 0, answer: '1/3' }), row({ student_id: 's-2', correct: 0, answer: '1/3' }), row({ student_id: 's-3', correct: 0, answer: '2/3' }), row({ student_id: 's-4', correct: 1, answer: 'Не ошибка' })]);
  assert.equal(result.questions[0].frequentWrong, '1/3');
  assert.equal(result.questions[0].wrongCount, 3);
  assert.equal(engine.cell([row({ correct: 0 })]).questions[0].frequentWrong, null);
});

test('period filters use selected-subject latest date, before class filtering', () => {
  const rows = [row({ date: '2026-11-05' }), row({ date: '2026-11-04' }), row({ class: '7Б', date: '2026-11-11' }), row({ subject: 'Казахский язык', date: '2027-01-01' })];
  const selected = engine.filterRows(rows, { subject: 'Математика', className: '7А', period: 7 });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].date, '2026-11-05');
  assert.equal(engine.filterRows(rows, { subject: 'Математика', period: 14 }).length, 3);
  assert.equal(engine.filterRows(rows, { subject: 'Математика', className: 'нет', period: 0 }).length, 0);
  assert.deepEqual(engine.filterRows([], { period: 7 }), []);
  assert.throws(() => engine.filterRows(rows, { period: 5 }), /Период/u);
  assert.deepEqual(engine.subjects(rows), ['Казахский язык', 'Математика']);
  assert.deepEqual(engine.classes(rows, 'Математика'), ['7А', '7Б']);
});

test('transplanted demo generator is deterministic with 98 students and 24 questions in both subjects', () => {
  for (const subject of ['Математика', 'Казахский язык']) {
    const rows = engine.build('clean', subject);
    assert.deepEqual(rows, engine.build('clean', subject));
    assert.equal(rows.length, 98 * 24);
    assert.equal(new Set(rows.map(item => item.student_id)).size, 98);
    assert.equal(engine.topics(rows).length, 4);
    assert.equal(new Set(rows.map(item => item.question_id)).size, 24);
    assert.ok(rows.every(item => item.subject === subject));
    assert.equal(engine.parseCSV(engine.templateCSV(rows)).length, rows.length);
  }
});

test('comparison reproduces supplied reference point estimates and 1000-replicate intervals', () => {
  const rows = engine.build('clean', 'Казахский язык');
  const expected = [
    ['Буквы Ә, І, Қ, Ғ', -0.9234779053524595, -6.82787639262717, 5.231303873803275],
    ['Н и Ң', 15.890679477133089, 8.09745267055069, 24.428355649438405],
    ['Вопросительные слова', -1.0321283772273535, -8.297559424437553, 7.561400520141275],
    ['Окончания направления', -7.877392025257517, -15.148399259536875, -0.17575778224478528]
  ];
  for (const [topic, diff, lo, hi] of expected) {
    const result = engine.compare(rows, topic);
    assert.equal(result.state, 'ok');
    assert.equal(result.diff, diff);
    assert.equal(result.lo, lo);
    assert.equal(result.hi, hi);
    assert.equal(result.bootstrapRepeats, 1000);
    assert.equal(result.strata.reduce((sum, item) => sum + item.nA + item.nB, 0), 98);
  }
  const roundtrip = engine.parseCSV(csv(rows));
  assert.equal(engine.compare(roundtrip, 'Н и Ң').lo, expected[1][2]);
});

test('confounding blocks textbook inference, single-book data and empty data stay usable', () => {
  for (const subject of ['Математика', 'Казахский язык']) {
    const rows = engine.build('confounded', subject), topic = engine.topics(rows)[0];
    const result = engine.compare(rows, topic);
    assert.equal(result.state, 'blocked');
    assert.match(result.det.why, /нельзя отделить/u);
    assert.ok(result.det.fix.length);
    assert.equal(result.diff, undefined);
  }
  assert.equal(engine.compare([row()], 'Дроби').state, 'blocked');
  assert.equal(engine.compare([], 'Дроби').state, 'blocked');
});

test('small overlapping teacher-book groups block quantitative conclusions', () => {
  const rows = engine.build('clean', 'Математика').filter(item => Number(item.student_id.slice(2)) % 10 === 0);
  assert.equal(engine.compare(rows, 'Уравнения').state, 'few');
});

test('hour allocation conserves reserve with varying weights and exposes equal zero-priority fallback', () => {
  const rows = engine.build('clean', 'Математика');
  for (const reserve of [0, 1, 2, 6, 17, 101]) {
    for (const weight of [1, 2, 3]) {
      const result = engine.planRows(rows, { reserve, weights: { Дроби: weight, Уравнения: 4 - weight } });
      assert.equal(result.rows.reduce((sum, item) => sum + item.h, 0), reserve);
      assert.ok(result.rows.every(item => Number.isInteger(item.h) && item.h >= 0));
      assert.equal(result.unallocated, 0);
    }
  }
  const zero = engine.planRows([row(), row({ topic: 'Уравнения' })], { reserve: 5 });
  assert.equal(zero.rows.reduce((sum, item) => sum + item.h, 0), 5);
  assert.equal(zero.fallback, 'equal-zero-priority');
  assert.match(zero.note, /поровну/u);
  assert.equal(engine.planRows([], { reserve: 5 }).unallocated, 5);
  assert.throws(() => engine.planRows(rows, { reserve: -1 }), /Резерв/u);
  assert.throws(() => engine.planRows(rows, { weights: { Дроби: 4 } }), /Вес/u);
});

test('recording a student answer changes diagnosis and comparison without stale cached results', () => {
  const rows = engine.build('clean', 'Математика');
  const first = rows.find(item => item.topic === 'Уравнения' && item.correct === 0);
  const before = engine.cell(rows, first.topic, first.class).score;
  const comparison = engine.compare(rows, first.topic).diff;
  first.correct = 1;
  assert.ok(engine.cell(rows, first.topic, first.class).score > before);
  assert.notEqual(engine.compare(rows, first.topic).diff, comparison);
});

test('opaque identifiers matching Object prototype keys cannot alter calculations', () => {
  const rows = engine.build('clean', 'Математика').map(item => ({ ...item, teacher: item.teacher === 'u1' ? '__proto__' : 'constructor', topic: item.topic === 'Уравнения' ? '__proto__' : item.topic, class: item.class === '1А' ? '__proto__' : item.class }));
  const parsed = engine.parseCSV(csv(rows));
  const result = engine.compare(parsed, '__proto__');
  assert.equal(result.state, 'ok');
  assert.equal(result.diff, 15.890679477133089);
  assert.equal(engine.planRows(parsed, { reserve: 5 }).rows.reduce((sum, item) => sum + item.h, 0), 5);
});

test('literal all labels remain exact filters; empty labels request aggregation', () => {
  const rows = [row({ topic: 'all', class: 'all' }), row({ topic: 'other', class: 'other', correct: 0 })];
  assert.equal(engine.cell(rows, 'all', 'all').score, 100);
  assert.equal(engine.cell(rows, '', '').score, 50);
  assert.equal(engine.filterRows(rows, { className: 'all' }).length, 1);
});
