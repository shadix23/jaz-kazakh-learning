const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../dist/curriculum.js');

const header = C.REQUIRED_COLUMNS.join(',');
const row = (over = {}) => ({ student_id: 'S1', class: '6А', teacher: 'T1', subject: 'Математика', textbook: 'A', topic: 'Дроби', question_id: 'q1', correct: 1, pretest: 50, date: '2026-10-01', ...over });

test('CSV roundtrip preserves optional text, quotes, delimiters and multiline fields', () => {
  const rows = [row({ question_text: 'Сколько "половин", если; 1/2\nи 1/4?', answer: '3,4', correct_answer: '3/4' })];
  const parsed = C.parseCSV(C.exportCSV(rows));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].question_text, rows[0].question_text);
  assert.equal(parsed[0].answer, '3,4');
  assert.equal(parsed[0].correct, 1);
});

test('semicolon CSV with BOM and CRLF is accepted', () => {
  const text = '﻿' + C.REQUIRED_COLUMNS.join(';') + '\r\nX-1;6Б;T;Математика;B;Тема;q;0;12.5;2026-10-02\r\n';
  const parsed = C.parseCSV(text);
  assert.equal(parsed[0].student_id, 'X-1');
  assert.equal(parsed[0].pretest, 12.5);
});

test('malformed CSV yields Russian errors with line numbers', () => {
  assert.throws(() => C.parseCSV(''), /Строка 1: файл пуст/);
  assert.throws(() => C.parseCSV('student_id,class\nS,6А'), /отсутствуют колонки/);
  assert.throws(() => C.parseCSV(header + '\nS,6А,T,M,A,t,q,2,50,2026-10-01'), /Строка 2: correct должен быть 0 или 1/);
  assert.throws(() => C.parseCSV(header + '\nS,6А,T,M,A,t,q,1,150,2026-10-01'), /pretest/);
  assert.throws(() => C.parseCSV(header + '\nS,6А,T,M,A,t,q,1,50,2026-02-30'), /реальной датой/);
  assert.throws(() => C.parseCSV(header + '\nS,6А,T,M,A,t,q,1,50,2026-10-01\nS,6Б,T,M,A,t,q2,1,50,2026-10-01'), /Строка 3: код ученика относится к разным классам/);
});

test('demo data: two subjects with different numbers, 6th grade, tests on dates per topic', () => {
  const rows = C.build('clean');
  assert.deepEqual(C.subjects(rows), ['Казахский язык', 'Математика']);
  assert.deepEqual(C.classes(rows), ['6А', '6Б', '6В', '6Г', '6Д', '6Е']);
  assert.equal(new Set(rows.map(r => r.student_id)).size, 147);
  const math = rows.filter(r => r.subject === 'Математика'), kaz = rows.filter(r => r.subject === 'Казахский язык');
  assert.equal(C.unique(math, 'textbook').length, 3);
  assert.equal(C.unique(math, 'teacher').length, 3);
  const mathScores = C.topicStats(math).map(t => t.score.toFixed(3)).sort();
  const kazScores = C.topicStats(kaz).map(t => t.score.toFixed(3)).sort();
  assert.notDeepEqual(mathScores, kazScores, 'subjects must not share the same simulated numbers');
  // One test date per student and topic.
  const dates = new Map();
  for (const r of math) { const k = r.student_id + r.topic; if (!dates.has(k)) dates.set(k, new Set()); dates.get(k).add(r.date); }
  assert.ok([...dates.values()].every(s => s.size === 1));
  // Deterministic.
  assert.deepEqual(C.build('clean', 'Математика').slice(0, 50), math.slice(0, 50));
  assert.ok(C.parseCSV(C.exportCSV(rows)).length === rows.length);
});

test('topic stats count students, mastery and low data', () => {
  const rows = [];
  for (let s = 0; s < 12; s++) for (let q = 0; q < 3; q++) rows.push(row({ student_id: 'S' + s, question_id: 'q' + q, correct: s < 6 ? 1 : (q === 0 ? 1 : 0), pretest: 40 }));
  const [t] = C.topicStats(rows, { mastery: 70 });
  assert.equal(t.n, 12);
  assert.equal(t.answers, 36);
  assert.equal(t.mastered, 6);
  assert.equal(t.notMasteredShare, 0.5);
  assert.equal(t.status, 'risk');
  assert.equal(t.lowData, false);
  assert.equal(C.topicStats(rows.slice(0, 27), {})[0].lowData, true);
});

test('item analysis finds the typical wrong answer and difficulty', () => {
  const rows = C.build('clean', 'Математика');
  const items = C.itemStats(rows, 'Сложение и вычитание рациональных чисел');
  const q = items.find(i => i.text === '−8 + 5 = ?');
  assert.equal(q.correctAnswer, '−3');
  assert.equal(q.wrong[0].answer, '−13');
  assert.ok(q.flags.includes('misconception'));
  assert.ok(q.discrimination > 0.15);
});

test('textbook comparison: math book Б is worse after adjusting for teacher; intervals are reproducible', () => {
  const math = C.build('clean', 'Математика');
  const res = C.compareBooks(math);
  assert.equal(res.state, 'ok');
  assert.equal(res.reference, 'Учебник А');
  const b = res.books.find(x => x.book === 'Учебник Б');
  assert.equal(b.verdict, 'worse');
  assert.ok(b.hi < 0 && b.lo < b.diff && b.diff < b.hi);
  const again = C.compareBooks(math.slice());
  assert.equal(again.books.find(x => x.book === 'Учебник Б').lo, b.lo);
  const topic = C.compareBooks(math, { topic: 'Умножение и деление рациональных чисел' });
  assert.equal(topic.books.find(x => x.book === 'Учебник Б').verdict, 'worse');
});

test('confounded design blocks the conclusion and proposes a concrete fix', () => {
  const res = C.compareBooks(C.build('confounded', 'Математика'));
  assert.equal(res.state, 'blocked');
  assert.match(res.why, /нельзя отделить от влияния учителя/);
  assert.ok(res.fixes.length >= 1);
  assert.match(res.fixes[0], /переходит на/);
  assert.equal(C.compareBooks([row()]).state, 'single');
  assert.equal(C.compareBooks([]).state, 'empty');
});

test('apportion respects caps and conserves the total', () => {
  const { alloc, left } = C.apportion(10, [5, 3, 0, 2], [3, 10, 10, 10]);
  assert.equal(alloc[0], 3);
  assert.equal(alloc[2], 0);
  assert.equal(alloc.reduce((a, b) => a + b, 0) + left, 10);
});

test('hour plan keeps the program total plus reserve and explains every change', () => {
  const math = C.build('clean', 'Математика');
  const program = C.demoProgram()['Математика'];
  const plan = C.planHours(math, program, { reserve: 4, mastery: 70 });
  assert.equal(plan.baseTotal, 45);
  assert.equal(plan.recommendedTotal + plan.unallocated, 49);
  const add = plan.rows.find(p => p.topic === 'Сложение и вычитание рациональных чисел');
  assert.ok(add.delta > 0);
  assert.match(add.reason, /Не освоили/);
  const donor = plan.rows.find(p => p.topic === 'Положительные и отрицательные числа');
  assert.ok(donor.delta < 0, 'well mastered topic donates hours');
  const noShift = C.planHours(math, program, { reserve: 4, rebalance: false });
  assert.ok(noShift.rows.every(p => p.delta >= 0));
  assert.throws(() => C.planHours(math, program, { reserve: -1 }), /Резерв/);
  assert.match(C.planCSV(plan), /^topic,program_hours,recommended_hours/);
});

test('all-mastered data leaves reserve unallocated with a note', () => {
  const rows = [];
  for (let s = 0; s < 12; s++) for (let q = 0; q < 3; q++) rows.push(row({ student_id: 'S' + s, question_id: 'q' + q, correct: 1 }));
  const plan = C.planHours(rows, [{ topic: 'Дроби', hours: 5 }], { reserve: 3, rebalance: false });
  assert.equal(plan.unallocated, 3);
  assert.match(plan.note, /резерв оставлен/);
});

test('insights produce decisions for topics, textbooks and hours', () => {
  const math = C.build('clean', 'Математика');
  const ins = C.insights(math, C.demoProgram()['Математика'], { compareRows: math, reserve: 4 });
  assert.equal(ins.kpi.students, 147);
  assert.ok(ins.decisions.some(d => d.kind === 'topic' && /−13/.test(d.text)));
  assert.ok(ins.decisions.some(d => d.kind === 'book' && /Учебник Б/.test(d.text)));
  assert.ok(ins.decisions.some(d => d.kind === 'hours'));
});

test('period filter uses the latest date of the selected subject', () => {
  const rows = [row({ date: '2026-10-01' }), row({ student_id: 'S2', date: '2026-10-20' }), row({ student_id: 'S3', subject: 'Другое', date: '2026-12-01' })];
  assert.equal(C.filterRows(rows, { subject: 'Математика', period: 14 }).length, 1);
  assert.equal(C.filterRows(rows, { subject: 'Математика', period: 30 }).length, 2);
  assert.throws(() => C.filterRows(rows, { period: 7 }), /Период/);
});
