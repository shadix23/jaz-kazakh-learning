const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../dist/curriculum.js');

const header = ['student_id', 'class', 'teacher', 'subject', 'textbook', 'topic', 'question_id', 'correct', 'pretest', 'date'].join(',');
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
  const text = '﻿' + header.replace(/,/g, ';') + '\r\nX-1;6Б;T;Математика;B;Тема;q;0;12.5;2026-10-02\r\n';
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

test('student profiles and support groups find who needs help on which topic', () => {
  const math = C.build('clean', 'Математика');
  const profiles = C.studentProfiles(math, { mastery: 70 });
  assert.equal(profiles.length, 147);
  assert.ok(profiles[0].weak.length >= profiles[profiles.length - 1].weak.length, 'sorted by number of weak topics');
  for (const p of profiles) assert.ok(['high', 'medium', 'low'].includes(p.risk));
  const groups = C.supportGroups(math, { mastery: 70 });
  assert.equal(groups[0].topic, 'Сложение и вычитание рациональных чисел');
  const g = groups[0];
  assert.equal(g.groups.reduce((a, c) => a + c.size, 0), g.count);
  assert.ok(g.groups.every((c) => c.core.every((id) => c.students.includes(id))));
  assert.match(C.groupsCSV(groups), /^topic,class,students_count,core_count/);
});

test('summary payload for the AI holds aggregates only, no student codes', () => {
  const math = C.build('clean', 'Математика');
  const payload = C.summaryPayload(math, C.demoProgram()['Математика'], { compareRows: math, reps: 50 });
  assert.equal(payload.topics.length, 6);
  assert.doesNotMatch(JSON.stringify(payload), /S-\d{4}/);
});

test('a single live answer cannot become the typical error of a topic', () => {
  const math = C.build('clean', 'Математика');
  const live = { ...math.find((r) => r.topic === 'Модуль числа'), question_id: 'live-x', question_text: 'Редкое задание', answer: 'X', correct: 0 };
  const ins = C.insights(math.concat([live]), C.demoProgram()['Математика'], {});
  assert.ok(ins.problems.every((p) => !p.item || p.item.text !== 'Редкое задание'));
});

test('pretest is optional: without it textbooks are compared on final scores with a caveat', () => {
  const parsed = C.parseCSV(C.REQUIRED_COLUMNS.join(',') + '\nS1,6А,T,Математика,A,Тема,q1,1,2026-10-01');
  assert.equal(parsed[0].pretest, null);
  const math = C.build('clean', 'Математика').map((r) => ({ ...r, pretest: null }));
  const res = C.compareBooks(math, { reps: 50 });
  assert.equal(res.outcome, 'score');
  assert.ok(res.notes.some((n) => /входной диагностики/.test(n)));
});

test('journal import (СОР/СОЧ) from Excel paste: Russian or Kazakh headers, names become codes', () => {
  const text = 'ФИО\tКласс\tРаздел\tВид\tБалл\tМакс. балл\nИванов Иван\t6А\tДроби\tСОР\t7\t10\nS-2\t6А\tДроби\tСОР\t3\t10';
  assert.equal(C.detectFormat(text), 'journal');
  const r = C.parseJournal(text, { subject: 'Математика' });
  assert.equal(r.renamed, 1);
  assert.match(r.rows[0].student_id, /^У-\d{5}$/);
  assert.equal(C.topicStats(r.rows)[0].score, 50);
  const kz = C.parseJournal('Оқушы\tСынып\tБөлім\tҰпай\tЕң жоғары ұпай\nA1\t6Б\tТақырып\t9\t10', {});
  assert.equal(kz.rows.length, 10);
  assert.throws(() => C.parseJournal('Ученик\tКласс\tРаздел\tБалл\tМакс. балл\nA\t6А\tТ\t12\t10', {}), /Строка 2/);
});

test('school indicators follow the 40/65/85 convention', () => {
  assert.equal(C.mark(39.9), 2); assert.equal(C.mark(40), 3); assert.equal(C.mark(65), 4); assert.equal(C.mark(85), 5);
  const rows = [];
  [[10, 10], [7, 10], [5, 10], [2, 10]].forEach(([ok, n], i) => { for (let k = 0; k < n; k++) rows.push({ student_id: 'S' + i, class: '6А', correct: k < ok ? 1 : 0 }); });
  const m = C.schoolMetrics(rows);
  assert.deepEqual(m.total.marks, { 2: 1, 3: 1, 4: 1, 5: 1 });
  assert.equal(m.total.progress, 0.75);
  assert.equal(m.total.quality, 0.5);
  assert.deepEqual(m.total.levels, { low: 1, mid: 2, high: 1 });
});

test('KTP draft keeps the order and assigns weeks', () => {
  const math = C.build('clean', 'Математика');
  const plan = C.planHours(math, C.demoProgram()['Математика'], { reserve: 4 });
  const csv = C.ktpCSV(plan, 5).split('\r\n');
  assert.equal(csv.length, 7);
  assert.match(csv[1], /^1,Отношения и пропорции,8,/);
});

test('trainer growth is measured inside the trainer and kept apart from СОР/СОЧ', () => {
  const summ = C.build('clean', 'Математика');
  const trainer = C.buildTrainer(summ);
  assert.ok(trainer.rows.length > 500);
  assert.ok(trainer.rows.every((r) => r.demo && r.source));
  const before = C.schoolMetrics(summ).total.quality;
  const growth = C.growthCompare(summ, trainer.rows, {});
  const hardest = growth.find((g) => g.topic === 'Сложение и вычитание рациональных чисел');
  assert.ok(hardest.measured >= 5 && hardest.late > hardest.early);
  assert.equal(C.schoolMetrics(summ).total.quality, before, 'indicators come from summative data only');
  const asg = trainer.assignments[0];
  const pr = C.assignmentProgress(asg, trainer.rows, summ);
  assert.equal(pr.started, pr.target);
  assert.ok(pr.late > pr.early);
  assert.ok(pr.sorBefore < 45);
});

test('growth needs enough attempts: a few answers are reported as low data', () => {
  const summ = C.build('clean', 'Математика');
  const few = [0, 1, 1].map((c, i) => ({ id: 'x' + i, student_id: 'S-0001', class: '6А', subject: 'Математика', topic: 'Модуль числа', correct: c, ts: '2026-11-0' + (i + 1) }));
  const g = C.growthCompare(summ, few, {}).find((r) => r.topic === 'Модуль числа');
  assert.equal(g.verdict, 'few');
  assert.equal(g.growth, null);
});

test('analytics is subject-agnostic: a biology journal works end to end', () => {
  const C = require('../dist/curriculum.js');
  const tsv = 'Оқушы\tСынып\tБөлім\tБалл\tМакс. балл\tПән\nИванов Петр\t7А\tЖасуша\t3\t10\tБиология\nИванов Петр\t7А\tФотосинтез\t8\t10\tБиология\nСериков Алихан\t7А\tЖасуша\t9\t10\tБиология\nСериков Алихан\t7А\tФотосинтез\t4\t10\tБиология';
  const { rows } = C.parseJournal(tsv);
  assert.deepEqual(C.subjects(rows), ['Биология']);
  assert.deepEqual(C.topics(rows).sort(), ['Жасуша', 'Фотосинтез']);
  assert.ok(rows.every(r => /^У-/.test(r.student_id)), 'names are replaced by codes');
  assert.equal(C.schoolMetrics(rows).total.n, 2);
  assert.ok(C.topicStats(rows, { mastery: 70 }).every(t => t.lowData), 'tiny data is labelled');
});
