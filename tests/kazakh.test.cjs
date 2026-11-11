const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../dist/kazakh.js');

test('suffix selection follows vowel harmony and the final sound', () => {
  const cases = { бала: ['балалар', 'балаға', 'балам', 'ма'], кітап: ['кітаптар', 'кітапқа', 'кітабым', 'па'], мектеп: ['мектептер', 'мектепке', 'мектебім', 'пе'], дәптер: ['дәптерлер', 'дәптерге', 'дәптерім', 'ме'], қалам: ['қаламдар', 'қаламға', 'қаламым', 'ба'], гүл: ['гүлдер', 'гүлге', 'гүлім', 'ме'], тау: ['таулар', 'тауға', 'тауым', 'ма'], кино: ['кинолар', 'киноға', 'кином', 'ма'] };
  for (const [w, [pl, dat, pos, q]] of Object.entries(cases)) {
    assert.equal(K.plural(w), pl, w);
    assert.equal(K.dative(w), dat, w);
    assert.equal(K.possessive(w, 1), pos, w);
    assert.equal(K.particle(w), q, w);
  }
});

test('typical learner errors are repaired with a rule explanation', () => {
  const cases = [
    ['салем калайсын', 'Сәлем қалайсың?'],
    ['Кинога барамызба', 'Киноға барамыз ба?'],
    ['мен мектепге бардым', 'Мен мектепке бардым'],
    ['кітапым үйде', 'Кітабым үйде'],
    ['келесің ба', 'Келесің бе?'],
    ['сен не истеп жатсын', 'Сен не істеп жатырсың?'],
    ['салем! кинога барамызба кешке', 'Сәлем! Киноға барамыз ба кешке?'],
    ['қаламбен жаздым', 'Қаламмен жаздым']
  ];
  for (const [input, expected] of cases) {
    const r = K.check(input);
    assert.equal(r.corrected, expected, input);
    assert.ok(r.issues.every((i) => i.reason && i.reason.length > 10), input);
  }
});

test('correct Kazakh and unknown words are left alone', () => {
  for (const text of ['Сәлем! Қалайсың?', 'Мен мектептемін.', 'Достарыммен ойнадым.']) assert.deepEqual(K.check(text).issues, [], text);
  const r = K.check('Мұндағы күз ерекше');
  assert.equal(r.issues.length, 0);
  assert.ok(r.coverage < 0.6);
});
