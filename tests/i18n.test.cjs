// Global «Қаз | Рус» switch: dictionary and patterns.
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../dist/i18n.js');

test('learner Kazakh UI translates to Russian, methodist Russian to Kazakh', () => {
  assert.equal(I.translate('Басты бет', 'ru'), 'Главная');
  assert.equal(I.translate('Ученик', 'kk'), 'Оқушы');
  assert.equal(I.translate('Методист', 'kk'), 'Әдіскер');
  assert.equal(I.translate('Учебники · с учётом учителя', 'kk'), 'Оқулықтар · мұғалімді ескере отырып');
});

test('patterns keep numbers and split «·» parts', () => {
  assert.equal(I.translate('0 / 9 тақырып аяқталды', 'ru'), '0 / 9 тем пройдено');
  assert.equal(I.translate('Ерекше әріптер · 5 тапсырма', 'ru'), 'Особые буквы · 5 заданий');
  assert.equal(I.translate('+16 п.п.', 'kk'), '+16 п.т.');
  assert.equal(I.translate('Программа 45 ч + резерв 4 ч → 49 ч', 'kk'), 'Бағдарлама 45 сағ + резерв 4 сағ → 49 сағ');
});

test('unknown text (learning content) is left alone', () => {
  assert.equal(I.translate('Дұрыс жазылуын таңда: «девочка»', 'ru'), null);
  assert.equal(I.translate('Біз кітаптар оқыдық.', 'ru'), null);
});

test('curriculum topic names and the group core are Kazakh in Kazakh mode', () => {
  assert.equal(I.translate('Окружность, круг и масштаб', 'kk'), 'Шеңбер, дөңгелек, масштаб');
  assert.equal(I.translate('Особые буквы: Ә, Ғ, Қ, Ң, Ө, Ұ, Ү, І', 'kk'), 'Ерекше әріптер');
  assert.equal(I.translate('ядро: S-0001, S-0002', 'kk'), 'өзек: S-0001, S-0002');
});
