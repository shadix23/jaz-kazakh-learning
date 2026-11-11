const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../dist/learning.js');

test('four scenarios and fifteen curriculum lessons with generated questions', () => {
  const practice = require('../dist/practice.js');
  assert.equal(engine.scenarios.length, 4);
  assert.equal(engine.lessons.length, 15);
  assert.deepEqual([...new Set(engine.lessons.map((l) => l.subject))].sort(), ['Казахский язык', 'Математика']);
  for (const lesson of engine.lessons) {
    const items = practice.set(lesson.id, lesson.size);
    assert.equal(items.length, lesson.size);
    for (const item of items) { assert.equal(item.options.length, 3); assert.ok(item.options[item.answer]); assert.equal(item.topic, lesson.topic); }
  }
});

test('known standalone errors preserve case and explain specific letters', () => {
  const result = engine.assessMessage('Салем! Кинога барамыз ба?');
  assert.equal(result.kind, 'correction');
  assert.equal(result.corrected, 'Сәлем! Киноға барамыз ба?');
  assert.equal(result.issues.length, 2);
  assert.match(result.issues[1].reason, /-ға/u);
  assert.match(result.issues[1].reason, /жуан/u);
  assert.equal(engine.assessMessage('САЛЕМ!').corrected, 'СӘЛЕМ!');
});

test('second-person question corrects grammatical form and Kazakh letters', () => {
  const result = engine.assessMessage('Сен не истеп жатсын?');
  assert.equal(result.corrected, 'Сен не істеп жатырсың?');
  assert.equal(result.issues.length, 2);
  assert.equal(engine.assessMessage('Ол осында жатсын.').kind, 'unverified');
  assert.equal(engine.assessMessage('Салем! Сен үйде жатырсың. Ол осында жатсын.').corrected, 'Сәлем! Сен үйде жатырсың. Ол осында жатсын.');
});

test('ambiguous texting phrase is clarified rather than silently rewritten', () => {
  const result = engine.assessMessage('боватр енд');
  assert.equal(result.kind, 'clarify');
  assert.equal(result.corrected, null);
  assert.equal(result.verified, false);
  assert.match(result.reply, /дегің келді ме/u);
  assert.equal(engine.verifyCorrection('боватр енд', 'болып жатыр енді'), false);
});

test('unknown phrases, Russian and slang are not labeled grammatical or incorrect', () => {
  for (const text of ['лол 😂', 'Привет, как дела?', 'Мұндағы қоңыр күз маған ерекше ұнайды.', 'Салембек келді.', 'constructor', 'Constructor', 'CONSTRUCTOR', '__proto__']) {
    const result = engine.assessMessage(text);
    assert.equal(result.kind, 'unverified');
    assert.equal(result.verified, false);
    assert.equal(result.issues.length, 0);
  }
  assert.equal(engine.assessMessage('Сәлем! 😊').kind, 'recognized');
});

test('message assessment stays text-only, bounded and handles invalid inputs', () => {
  for (const input of [null, undefined, 12, '', ' ', 'а'.repeat(501), '<script>Салем</script>']) {
    const result = engine.assessMessage(input);
    assert.equal(result.kind, 'unverified');
    assert.equal(result.corrected, null);
    assert.ok(result.reply);
  }
});

test('correction verification accepts punctuation variations but requires actual known edits', () => {
  assert.equal(engine.verifyCorrection('Салем! Кинога барамыз ба?', 'Сәлем, киноға барамыз ба?'), true);
  assert.equal(engine.verifyCorrection('Салем!', 'Салем!'), false);
  assert.equal(engine.verifyCorrection('Салем!', 'Сәлеметсіз бе!'), false);
  assert.equal(engine.verifyCorrection('Сәлем!', 'Сәлем!'), false);
  assert.equal(engine.verifyCorrection('Салем!', 'Сәлем!'.repeat(100)), false);
});

test('only recognized practice or explicitly verified corrections earn message XP', () => {
  const blank = engine.initialState();
  const message = { type: 'message', scenarioId: 'cinema', day: '2026-11-11' };
  assert.equal(engine.reduceProgress(blank, { ...message, text: 'Салем!' }).xp, 0);
  assert.equal(engine.reduceProgress(blank, { ...message, text: 'Өзім білемін.' }).xp, 0);
  assert.equal(engine.reduceProgress(blank, { ...message, text: 'Сәлем!' }).xp, 10);
  const corrected = engine.reduceProgress(blank, { ...message, type: 'correction', original: 'Салем!', text: 'Сәлем!' });
  assert.equal(corrected.xp, 10);
  assert.equal(engine.reduceProgress(blank, { ...message, type: 'correction', original: 'Салем!', text: 'Салем!' }).xp, 0);
  assert.deepEqual(blank, engine.initialState());
});

test('XP deduplicates corrected and recognized copies including punctuation and reload', () => {
  const event = { type: 'message', scenarioId: 'cinema', text: 'Сәлем!', day: '2026-11-11' };
  const first = engine.reduceProgress(engine.initialState(), event);
  const reloaded = JSON.parse(JSON.stringify(first));
  assert.equal(engine.reduceProgress(reloaded, { ...event, text: '  СӘЛЕМ 😊 ' }).xp, 10);
  assert.equal(engine.reduceProgress(reloaded, { ...event, type: 'correction', original: 'Салем!' }).xp, 10);
  assert.equal(engine.reduceProgress(reloaded, { ...event, scenarioId: 'gaming' }).xp, 20);
  assert.equal(engine.reduceProgress(reloaded, { ...event, day: '2026-11-12' }).xp, 20);
});

test('lesson completion earns 20 XP only once and increments level honestly', () => {
  let state = engine.initialState();
  const event = { type: 'lesson', lessonId: 'letters', day: '2026-11-11' };
  state = engine.reduceProgress(state, event);
  assert.equal(state.xp, 20);
  assert.deepEqual(state.completedLessons, ['letters']);
  assert.equal(engine.reduceProgress(state, { ...event, day: '2026-11-12' }).xp, 20);
  assert.equal(engine.reduceProgress(state, { ...event, lessonId: 'not-real' }).xp, 20);
  for (const lesson of engine.lessons.slice(1)) state = engine.reduceProgress(state, { ...event, lessonId: lesson.id });
  state = engine.reduceProgress(state, { type: 'message', scenarioId: 'cinema', text: 'Сәлем!', day: '2026-11-11' });
  state = engine.reduceProgress(state, { type: 'message', scenarioId: 'cinema', text: 'Киноға барайық!', day: '2026-11-11' });
  // 15 lessons × 20 XP + 2 messages × 10 XP = 320 XP → level 4.
  assert.equal(state.xp, 320);
  assert.equal(state.level, 4);
});

test('game runs earn bounded XP once per run id', () => {
  let state = engine.reduceProgress(null, { type: 'game', runId: 'run-1', correct: 7, day: '2026-11-11' });
  assert.equal(state.xp, 24);
  assert.equal(engine.reduceProgress(state, { type: 'game', runId: 'run-1', correct: 7, day: '2026-11-11' }).xp, 24);
  assert.equal(engine.reduceProgress(state, { type: 'game', runId: 'run-2', correct: 0, day: '2026-11-11' }).xp, 24);
  assert.equal(engine.reduceProgress(state, { type: 'game', runId: 'run-3', correct: 99, day: '2026-11-11' }).xp, 84);
  assert.equal(engine.sanitizeState({ events: [{ id: 'game:x', type: 'game', runId: 'x', day: '2026-11-11', xp: 999 }] }).xp, 0);
});

test('AI-provided corrections are verified against the stored expected text', () => {
  assert.equal(engine.verifyCorrection('мен вчера был дома', 'Мен кеше үйде болдым.', 'Мен кеше үйде болдым.'), true);
  assert.equal(engine.verifyCorrection('мен вчера был дома', 'мен вчера был дома', 'Мен кеше үйде болдым.'), false);
});

test('streak uses actual injected calendar days and resets across gaps', () => {
  const event = { type: 'message', scenarioId: 'cinema', text: 'Сәлем!' };
  let state = engine.reduceProgress(engine.initialState(), { ...event, day: '2026-11-11' });
  assert.equal(state.streak, 1);
  state = engine.reduceProgress(state, { ...event, day: '2026-11-12' });
  assert.equal(state.streak, 2);
  assert.equal(engine.getStreak(state, '2026-11-13'), 2);
  assert.equal(engine.getStreak(state, '2026-11-14'), 0);
  state = engine.reduceProgress(state, { ...event, day: '2026-11-14' });
  assert.equal(state.streak, 1);
  assert.equal(state.lastActiveDay, '2026-11-14');
  assert.equal(engine.reduceProgress(state, { ...event, day: '2026-02-30' }).xp, state.xp);
  assert.equal(engine.reduceProgress(state, { ...event, day: '11/15/2026' }).xp, state.xp);
});

test('sanitization rebuilds totals, rejects malformed stored entries and deduplicates', () => {
  assert.deepEqual(engine.sanitizeState({ xp: 999999, streak: 999 }), engine.initialState());
  const valid = engine.reduceProgress(engine.initialState(), { type: 'lesson', lessonId: 'letters', day: '2026-11-11' });
  const state = engine.sanitizeState({ xp: Infinity, events: valid.events.concat(valid.events, [{ id: 'fake', day: '2026-11-11', type: 'lesson', lessonId: 'letters', xp: 2000 }, null]) });
  assert.equal(state.xp, 20);
  assert.equal(state.events.length, 1);
  assert.equal(state.level, 1);
});
