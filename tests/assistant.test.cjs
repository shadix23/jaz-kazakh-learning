// «Барыс-көмекші»: offline advice is built from the curriculum topic and never reveals the current task's answer.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../dist/assistant.js');
const P = require('../dist/practice.js');

const t = P.TOPICS.find(x => x.id === 'm-abs');
const ctx = { topicId: t.id, topicKk: t.kk, desc: t.desc, task: '|-7| = ?', lastExplanation: '' };

test('rule, start and example answers come from the topic', () => {
  assert.match(A.localHint('rule', ctx, P).reply, new RegExp(t.kk));
  assert.equal(A.localHint('start', ctx, P).steps.length, 3);
  const ex = A.localHint('example', ctx, P);
  assert.match(ex.reply, /Мысал:/);
  assert.doesNotMatch(ex.reply, /\|-7\| = \?/, 'the example is not the current task');
});

test('mistake advice uses the explanation shown after a wrong answer, or asks to try first', () => {
  assert.match(A.localHint('mistake', { ...ctx, lastExplanation: 'Модуль - арақашықтық.' }, P).reply, /арақашықтық/);
  assert.match(A.localHint('mistake', ctx, P).reply, /Алдымен жауап беріп көр/);
});

test('works for any subject topic and without a topic', () => {
  for (const topic of P.TOPICS) assert.ok(A.localHint('example', { topicId: topic.id, topicKk: topic.kk, desc: topic.desc }, P).reply.length > 10, topic.id);
  assert.ok(A.localHint('free', {}, P, 'сұрақ').reply.length > 10);
});
