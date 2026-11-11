/*
 * Jaz! Curriculum analytics engine.
 * Pure functions over flat answer rows (one row = one student's answer to one question).
 * Works in the browser (window.JazCurriculum) and in Node (module.exports) for tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JazCurriculum = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const REQUIRED_COLUMNS = Object.freeze(['student_id', 'class', 'teacher', 'subject', 'textbook', 'topic', 'question_id', 'correct', 'date']);
  // pretest (entrance diagnostic, 0–100) is optional: real schools rarely have it per topic.
  const OPTIONAL_COLUMNS = Object.freeze(['pretest', 'question_text', 'answer', 'correct_answer']);
  const THRESHOLDS = Object.freeze([
    Object.freeze({ min: 80, key: 'good', label: '≥ 80% — освоено' }),
    Object.freeze({ min: 60, key: 'mid', label: '60–80% — повторить' }),
    Object.freeze({ min: 0, key: 'low', label: '< 60% — затруднение' })
  ]);
  const DEFAULTS = Object.freeze({
    mastery: 70,          // ученик освоил тему, если верных ответов ≥ 70%
    minStudents: 10,      // ниже — «мало данных»
    minAnswers: 30,
    meaningful: 5,        // п.п.: практически значимая разница учебников
    riskShare: 0.4,       // ≥ 40% не освоили — зона риска
    watchShare: 0.2,      // ≥ 20% — под наблюдением
    donorMastery: 0.85,   // тема может отдать часы, если освоили ≥ 85% учеников
    maxCut: 0.2,          // не больше 20% часов темы
    maxBoost: 0.5,        // не больше +50% к теме
    reps: 400             // повторов бутстрэпа
  });

  /* ------------------------------------------------------------------ CSV */

  function fail(line, message) { throw new Error('Строка ' + line + ': ' + message); }

  function band(score) {
    if (score == null || !Number.isFinite(Number(score))) return 'missing';
    const threshold = THRESHOLDS.find(item => Number(score) >= item.min);
    return threshold ? threshold.key : 'low';
  }

  // The first unquoted delimiter in the header determines the CSV dialect.
  function delimiter(text) {
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (quoted && text[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && (char === ',' || char === ';' || char === '\t')) return char;
      else if (!quoted && (char === '\n' || char === '\r')) break;
    }
    return ',';
  }

  function records(text, separator) {
    const result = [];
    let fields = [], value = '', state = 'start', line = 1, startLine = 1;
    function field() { fields.push(value); value = ''; state = 'start'; }
    function record() {
      field();
      if (fields.some(item => item.trim() !== '')) result.push({ fields, line: startLine });
      fields = [];
    }
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const newline = char === '\n' || char === '\r';
      if (state === 'quoted') {
        if (char === '"') {
          if (text[i + 1] === '"') { value += '"'; i++; }
          else state = 'closed';
        } else if (newline) {
          value += '\n';
          if (char === '\r' && text[i + 1] === '\n') i++;
          line++;
        } else value += char;
      } else if (char === separator) field();
      else if (newline) {
        record();
        if (char === '\r' && text[i + 1] === '\n') i++;
        line++;
        startLine = line;
      } else if (state === 'closed') {
        if (!/\s/u.test(char)) fail(line, 'после закрывающей кавычки ожидается разделитель.');
      } else if (char === '"') {
        if (state !== 'start' || value !== '') fail(line, 'кавычка внутри незаключённого в кавычки поля.');
        state = 'quoted';
      } else { value += char; state = 'plain'; }
    }
    if (state === 'quoted') fail(startLine, 'не закрыта кавычка.');
    if (fields.length || value !== '' || state === 'closed') record();
    return result;
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function parseCSV(input) {
    if (typeof input !== 'string') fail(1, 'ожидается текст CSV.');
    if (input.length > 10000000) fail(1, 'файл слишком большой (максимум 10 МБ текста).');
    const text = input.replace(/^﻿/u, '');
    const data = records(text, delimiter(text));
    if (!data.length) fail(1, 'файл пуст; нужна строка заголовков.');
    const headers = data[0].fields.map(value => value.trim());
    if (new Set(headers).size !== headers.length) fail(data[0].line, 'повторяются названия колонок.');
    const missing = REQUIRED_COLUMNS.filter(key => !headers.includes(key));
    if (missing.length) fail(data[0].line, 'отсутствуют колонки: ' + missing.join(', ') + '.');
    const students = new Map(), teachers = new Map(), pretests = new Map(), textbooks = new Map();
    return data.slice(1).map(record => {
      if (record.fields.length !== headers.length) fail(record.line, 'число полей не совпадает с заголовком.');
      const raw = Object.fromEntries(headers.map((key, index) => [key, record.fields[index].trim()]));
      const row = {};
      for (const key of REQUIRED_COLUMNS.concat(OPTIONAL_COLUMNS)) if (raw[key] !== undefined) row[key] = raw[key];
      for (const key of REQUIRED_COLUMNS) if (row[key] === '') fail(record.line, 'не заполнено поле «' + key + '».');
      for (const key of ['student_id', 'class', 'teacher', 'subject', 'textbook', 'topic', 'question_id']) {
        if (row[key].length > 200 || /[\u0000-\u001f\u007f]/u.test(row[key])) fail(record.line, 'недопустимый код или название в поле «' + key + '».');
      }
      if (!/^[01]$/u.test(row.correct)) fail(record.line, 'correct должен быть 0 или 1.');
      if (row.pretest != null && row.pretest !== '' && (!/^(?:\d+(?:[.,]\d+)?|\.\d+)$/u.test(row.pretest) || Number(row.pretest.replace(',', '.')) > 100)) fail(record.line, 'pretest должен быть числом от 0 до 100 или пустым.');
      if (!validDate(row.date)) fail(record.line, 'date должна быть реальной датой YYYY-MM-DD.');
      row.correct = Number(row.correct);
      row.pretest = row.pretest == null || row.pretest === '' ? null : Number(String(row.pretest).replace(',', '.'));
      const studentClass = students.get(row.student_id);
      if (studentClass !== undefined && studentClass !== row.class) fail(record.line, 'код ученика относится к разным классам.');
      students.set(row.student_id, row.class);
      const teacherKey = JSON.stringify([row.class, row.subject]);
      if (teachers.has(teacherKey) && teachers.get(teacherKey) !== row.teacher) fail(record.line, 'у класса по одному предмету указаны разные учителя.');
      teachers.set(teacherKey, row.teacher);
      const pretestKey = JSON.stringify([row.student_id, row.subject, row.topic]);
      if (pretests.has(pretestKey) && pretests.get(pretestKey) !== row.pretest) fail(record.line, 'входной балл ученика по теме различается между ответами.');
      pretests.set(pretestKey, row.pretest);
      if (textbooks.has(pretestKey) && textbooks.get(pretestKey) !== row.textbook) fail(record.line, 'для ученика по одной теме указаны разные учебники; независимое сравнение невозможно.');
      textbooks.set(pretestKey, row.textbook);
      return row;
    });
  }

  function quoteCSV(value) {
    const text = value == null ? '' : String(value);
    return /[",;\r\n]/u.test(text) ? '"' + text.replace(/"/gu, '""') + '"' : text;
  }
  function exportCSV(rows) {
    const columns = REQUIRED_COLUMNS.concat(OPTIONAL_COLUMNS);
    return [columns.join(',')].concat(rows.map(row => columns.map(key => quoteCSV(row[key])).join(','))).join('\r\n');
  }
  function templateCSV(rows) { return exportCSV(rows || []); }

  /* -------------------------------------------------------------- helpers */

  const collator = typeof Intl !== 'undefined' ? new Intl.Collator('ru', { numeric: true }) : null;
  const cmp = (a, b) => collator ? collator.compare(String(a), String(b)) : String(a).localeCompare(String(b));
  function unique(rows, key) { return [...new Set(rows.map(row => row[key]).filter(value => value != null && value !== ''))].sort(cmp); }
  function subjects(rows) { return unique(rows, 'subject'); }
  function classes(rows, subject) { return unique(subject ? rows.filter(row => row.subject === subject) : rows, 'class'); }
  function topics(rows, subject) { return unique(subject ? rows.filter(row => row.subject === subject) : rows, 'topic'); }
  function mean(values) { let s = 0, n = 0; for (const v of values) if (v != null && Number.isFinite(v)) { s += v; n++; } return n ? s / n : null; }
  function sd(values) {
    if (values.length < 2) return 0;
    const m = mean(values); let s = 0;
    for (const v of values) s += (v - m) * (v - m);
    return Math.sqrt(s / (values.length - 1));
  }
  function quantile(sorted, q) {
    if (!sorted.length) return null;
    const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const sigmoid = x => 1 / (1 + Math.exp(-x));
  const opt = (options, key) => options && options[key] != null ? options[key] : DEFAULTS[key];

  function filterRows(rows, options) {
    const opts = options || {};
    let selected = opts.subject ? rows.filter(row => row.subject === opts.subject) : rows.slice();
    const period = Number(opts.period || 0);
    if (![0, 14, 30].includes(period)) throw new Error('Период должен быть 0, 14 или 30 дней.');
    if (period && selected.length) {
      const latest = selected.reduce((last, row) => row.date > last ? row.date : last, '');
      const earliest = new Date(Date.parse(latest + 'T00:00:00Z') - (period - 1) * 86400000).toISOString().slice(0, 10);
      selected = selected.filter(row => row.date >= earliest && row.date <= latest);
    }
    return opts.className ? selected.filter(row => row.class === opts.className) : selected;
  }

  /* ------------------------------------------------------------ demo data */

  const DEMO_BOOKS = ['Учебник А', 'Учебник Б', 'Учебник В'];
  const DEMO_CLASSES = [['6А', 26], ['6Б', 24], ['6В', 27], ['6Г', 23], ['6Д', 25], ['6Е', 22]];
  // Each question: [text, options (correct first), index of the typical wrong answer].
  const DEMO_SUBJECTS = [
    {
      name: 'Математика', seed: 1601,
      teachers: ['А. Ахметова', 'Д. Серікбаев', 'Н. Ким'], teacherEffect: [0.12, -0.1, 0.02],
      clean: [0, 1, 1, 2, 0, 2], confounded: [0, 0, 1, 1, 2, 2],
      topics: [
        { name: 'Отношения и пропорции', hours: 8, base: 1.5, pre: 0.6, books: { 1: 0.25 }, questions: [
          ['Найдите x: 3 : x = 6 : 8', ['4', '16', '2,25', '5'], 1],
          ['Отношение 15 см к 3 дм', ['1 : 2', '5 : 1', '1 : 5', '15 : 3'], 1],
          ['5 тетрадей стоят 600 тг. Сколько стоят 8 тетрадей?', ['960 тг', '375 тг', '1200 тг', '480 тг'], 1],
          ['4 рабочих делают работу за 6 дней. За сколько дней её сделают 8 рабочих?', ['3', '12', '2', '4'], 1],
          ['Упростите отношение 0,6 : 1,8', ['1 : 3', '3 : 1', '6 : 18', '1 : 2'], 1]
        ] },
        { name: 'Окружность, круг и масштаб', hours: 7, base: 1, pre: 0.1, books: { 2: -0.25 }, questions: [
          ['Длина окружности при r = 5 см (π ≈ 3,14)', ['31,4 см', '15,7 см', '78,5 см', '10 см'], 1],
          ['Площадь круга при r = 3 см (π ≈ 3,14)', ['28,26 см²', '18,84 см²', '9,42 см²', '56,52 см²'], 1],
          ['Диаметр 12 см. Чему равен радиус?', ['6 см', '24 см', '12 см', '3 см'], 1],
          ['Масштаб 1 : 100 000. Сколько км в 3 см на карте?', ['3 км', '30 км', '0,3 км', '300 км'], 1],
          ['Сектор 90° — какая часть круга?', ['1/4', '1/3', '1/2', '1/90'], 1]
        ] },
        { name: 'Положительные и отрицательные числа', hours: 6, base: 2.4, pre: 1.4, books: {}, questions: [
          ['Какое число больше: −7 или −3?', ['−3', '−7', 'Они равны', 'Сравнить нельзя'], 1],
          ['Число, противоположное −12', ['12', '−12', '1/12', '0'], 1],
          ['Было −4°, потеплело на 6°. Сколько стало?', ['2°', '−10°', '10°', '−2°'], 1],
          ['Координата точки на 5 единиц левее нуля', ['−5', '5', '0,5', '−0,5'], 1],
          ['Расположите по возрастанию: −2; 0; −5', ['−5; −2; 0', '−2; −5; 0', '0; −2; −5', '−5; 0; −2'], 1]
        ] },
        { name: 'Модуль числа', hours: 6, base: 1.4, pre: 0.4, books: { 2: 0.15 }, questions: [
          ['|−9| = ?', ['9', '−9', '0', '1/9'], 1],
          ['Решите уравнение |x| = 4', ['4 и −4', '4', '−4', 'Нет решений'], 1],
          ['|−3| + |2| = ?', ['5', '−1', '1', '−5'], 1],
          ['Расстояние между точками −3 и 5 на прямой', ['8', '2', '−8', '15'], 1],
          ['У какого числа наибольший модуль: −8; 5; −2?', ['−8', '5', '−2', 'У всех равный'], 1]
        ] },
        { name: 'Сложение и вычитание рациональных чисел', hours: 9, base: 0.2, pre: -0.7, books: { 1: -0.1, 2: 0.4 }, questions: [
          ['−8 + 5 = ?', ['−3', '−13', '3', '13'], 1],
          ['−6 − (−10) = ?', ['4', '−16', '16', '−4'], 1],
          ['7 − 12 = ?', ['−5', '5', '19', '−19'], 1],
          ['−2,5 + (−1,5) = ?', ['−4', '−1', '1', '4'], 1],
          ['−1/2 + 1/3 = ?', ['−1/6', '1/6', '−2/5', '5/6'], 1]
        ] },
        { name: 'Умножение и деление рациональных чисел', hours: 9, base: 0.45, pre: -0.5, books: { 1: -0.65 }, questions: [
          ['(−4) · (−6) = ?', ['24', '−24', '−10', '10'], 1],
          ['(−36) : 9 = ?', ['−4', '4', '−27', '−45'], 1],
          ['(−2)³ = ?', ['−8', '8', '−6', '6'], 1],
          ['(−0,5) · 8 = ?', ['−4', '4', '−40', '7,5'], 1],
          ['Какой знак у произведения трёх отрицательных чисел?', ['Минус', 'Плюс', 'Зависит от чисел', 'Получится ноль'], 1]
        ] }
      ]
    },
    {
      name: 'Казахский язык', seed: 2602,
      teachers: ['Г. Нұрланова', 'Е. Жұмабек', 'С. Омарова'], teacherEffect: [-0.05, 0.15, -0.08],
      clean: [1, 0, 2, 1, 2, 0], confounded: [1, 1, 2, 2, 0, 0],
      topics: [
        { name: 'Особые буквы: Ә, Ғ, Қ, Ң, Ө, Ұ, Ү, І', hours: 3, base: 2.3, pre: 1.3, books: {}, lesson: 'letters', questions: [
          ['Как правильно: «привет»?', ['Сәлем', 'Салем', 'Сэлем', 'Сєлем'], 1],
          ['Как правильно: «хорошо»?', ['жақсы', 'жаксы', 'жахсы', 'жақсі'], 1],
          ['Как правильно: «знание»?', ['білім', 'билим', 'былым', 'бүлім'], 1],
          ['Как правильно: «учитель»?', ['мұғалім', 'мугалим', 'мұғалим', 'муғалім'], 1],
          ['Как правильно: «город»?', ['қала', 'кала', 'хала', 'ғала'], 1]
        ] },
        { name: 'Звуки Н и Ң', hours: 3, base: 0.3, pre: -0.6, books: { 2: 0.45 }, lesson: 'ng', questions: [
          ['«Новый»: жа_а', ['жаңа', 'жана', 'жанға', 'жәна'], 1],
          ['Сен қайда бара_?', ['барасың', 'барасын', 'барасыз ба', 'барамын'], 1],
          ['«Мой»: ме_і_', ['менің', 'менін', 'меңің', 'мениң'], 1],
          ['«Утро»', ['таң', 'тан', 'тәң', 'таңғ'], 1],
          ['«Ты пришёл»: сен келді_', ['келдің', 'келдін', 'келдин', 'келдиң'], 1]
        ] },
        { name: 'Вопросительные частицы ма/ме, ба/бе, па/пе', hours: 3, base: 1.2, pre: 0.3, books: {}, lesson: 'questions', questions: [
          ['Сен ертең келесің ___?', ['бе', 'ба', 'ме', 'па'], 1],
          ['Бұл кітап ___?', ['па', 'ба', 'ма', 'пе'], 1],
          ['Ол қазір үйде ___?', ['ме', 'ма', 'бе', 'пе'], 1],
          ['Как пишется частица?', ['Бүгін кездесеміз бе?', 'Бүгін кездесемізбе?', 'Бүгін кездесеміз-бе?', 'Бүгін кездесеміз бе.'], 1],
          ['Сабақ бітті ___?', ['ме', 'ма', 'бе', 'па'], 1]
        ] },
        { name: 'Окончания направления -ға/-ге/-қа/-ке', hours: 3, base: 0.9, pre: 0, books: { 1: -0.5 }, lesson: 'endings', questions: [
          ['Мектеп___ барамын', ['-ке', '-ге', '-қа', '-ға'], 1],
          ['Кино___ барамыз', ['-ға', '-ге', '-қа', '-ке'], 1],
          ['Саябақ___ барайық', ['-қа', '-ға', '-ке', '-ге'], 1],
          ['Үй___ қайттым', ['-ге', '-ке', '-ға', '-қа'], 1],
          ['Дүкен___ бардым', ['-ге', '-ке', '-ға', '-қа'], 1]
        ] },
        { name: 'Закон сингармонизма', hours: 3, base: 0.5, pre: -0.4, books: { 1: 0.2 }, questions: [
          ['Множественное число: бала + …', ['балалар', 'балалер', 'баладар', 'балатар'], 1],
          ['Множественное число: кітап + …', ['кітаптар', 'кітаптер', 'кітапдар', 'кітаплар'], 1],
          ['Множественное число: мектеп + …', ['мектептер', 'мектептар', 'мектепдер', 'мектепер'], 1],
          ['Множественное число: дәптер + …', ['дәптерлер', 'дәптерлар', 'дәптердер', 'дәптертер'], 1],
          ['Какое слово нарушает сингармонизм?', ['кітап', 'қала', 'бала', 'дала'], 1]
        ] },
        { name: 'Притяжательные окончания (тәуелдік)', hours: 3, base: 1.1, pre: 0.2, books: { 2: -0.15 }, questions: [
          ['«Моя книга»: менің кітаб___', ['кітабым', 'кітапым', 'кітабім', 'кітабың'], 1],
          ['«Твой дом»: сенің үй___', ['үйің', 'үйім', 'үйіңіз', 'үйі'], 1],
          ['«Его школа»: оның мектеб___', ['мектебі', 'мектепі', 'мектебы', 'мектебім'], 1],
          ['«Наш класс»: біздің сынып___', ['сыныбымыз', 'сыныпымыз', 'сыныбыңыз', 'сыныбы'], 1],
          ['«Ваш (вежл.) телефон»: сіздің телефон___', ['телефоныңыз', 'телефоның', 'телефоныңдар', 'телефоны'], 1]
        ] },
        { name: 'Лексика: школа, семья, город', hours: 3, base: 1.0, pre: 0.1, books: { 2: 0.3 }, questions: [
          ['«Мектеп» — бұл не?', ['школа', 'улица', 'дом', 'класс'], 3],
          ['«Отбасы» — бұл не?', ['семья', 'отец', 'праздник', 'дом'], 1],
          ['«Қала» — бұл не?', ['город', 'село', 'улица', 'река'], 1],
          ['«Дәрігер» — кім?', ['врач', 'учитель', 'водитель', 'повар'], 1],
          ['«Наубайхана» — бұл не?', ['пекарня', 'больница', 'магазин', 'библиотека'], 2]
        ] },
        { name: 'Чтение: понимание короткого текста', hours: 3, base: 0.7, pre: -0.2, books: { 1: -0.35 }, questions: [
          ['«Асан таңертең мектепке барады.» Асан қайда барады?', ['Мектепке', 'Дүкенге', 'Үйге', 'Саябаққа'], 1],
          ['«Айгүлдің екі інісі бар.» Айгүлдің неше інісі бар?', ['Екі', 'Бір', 'Үш', 'Жоқ'], 1],
          ['«Бүгін күн суық, қар жауып тұр.» Ауа райы қандай?', ['Суық', 'Ыстық', 'Жылы', 'Жаңбырлы'], 2],
          ['«Біз сенбі күні тауға барамыз.» Олар қашан барады?', ['Сенбі күні', 'Бүгін', 'Жексенбі күні', 'Кеше'], 2],
          ['«Ерлан кітапханадан кітап алды.» Ерлан не алды?', ['Кітап', 'Дәптер', 'Қалам', 'Доп'], 1]
        ] },
        { name: 'Речевой этикет: приветствие, просьба, благодарность', hours: 3, base: 1.3, pre: 0.3, books: {}, questions: [
          ['Мұғалімге қалай амандасасың?', ['Сәлеметсіз бе!', 'Сәлем!', 'Қалайсың?', 'Сау бол!'], 1],
          ['Біреуге кедергі жасасаң, не дейсің?', ['Кешіріңіз', 'Рақмет', 'Сау болыңыз', 'Құттықтаймын'], 1],
          ['Досың сыйлық берді. Не дейсің?', ['Рақмет!', 'Кешіріңіз!', 'Сәлеметсіз бе!', 'Жоқ'], 2],
          ['Таңертең қалай амандасамыз?', ['Қайырлы таң!', 'Қайырлы түн!', 'Сау бол!', 'Кешіріңіз!'], 1],
          ['Үлкен кісімен қалай қоштасамыз?', ['Сау болыңыз!', 'Сау бол!', 'Сәлем!', 'Рақмет!'], 1]
        ] }
      ]
    }
  ];
  const LESSON_TOPICS = Object.freeze(Object.fromEntries(DEMO_SUBJECTS[1].topics.filter(t => t.lesson).map(t => [t.lesson, t.name])));

  function demoProgram() {
    const program = {};
    for (const subject of DEMO_SUBJECTS) program[subject.name] = subject.topics.map((topic, order) => ({ topic: topic.name, hours: topic.hours, order }));
    return program;
  }

  // Synthetic school: 6 classes, 3 teachers and 3 textbooks per subject.
  // "clean": every teacher works with two textbooks (comparison possible);
  // "confounded": every teacher has only one textbook (comparison blocked).
  function build(kind, subjectName) {
    const scenario = ['confounded', 'conf', 'mixed'].includes(kind) ? 'confounded' : 'clean';
    const list = subjectName ? DEMO_SUBJECTS.filter(s => s.name === subjectName) : DEMO_SUBJECTS;
    const abilityRand = mulberry32(77);
    const students = [];
    DEMO_CLASSES.forEach(([cls, size], ci) => {
      for (let k = 0; k < size; k++) students.push({ id: 'S-' + String(students.length + 1).padStart(4, '0'), cls, ci, ability: 0.95 * gauss(abilityRand) });
    });
    const start = Date.UTC(2026, 8, 1);
    const rows = [];
    for (const subject of list) {
      const rand = mulberry32(subject.seed + (scenario === 'confounded' ? 9 : 0));
      const classEffect = DEMO_CLASSES.map(() => 0.1 * gauss(rand));
      const prefix = subject.name === 'Математика' ? 'M' : 'K';
      for (const student of students) {
        const own = 0.4 * gauss(rand);
        const teacherIndex = Math.floor(student.ci / 2);
        const bookIndex = subject[scenario][student.ci];
        subject.topics.forEach((topic, ti) => {
          const pretest = Math.max(0, Math.min(100, Math.round(100 * sigmoid(topic.pre + 0.85 * (student.ability + own) + 0.35 * gauss(rand)))));
          const date = new Date(start + (ti * 8 + 4 + (student.ci % 3)) * 86400000).toISOString().slice(0, 10);
          topic.questions.forEach(([text, options, typical], qi) => {
            const difficulty = [0.15, -0.1, 0.05, -0.2, 0.1][qi];
            const z = topic.base - difficulty + student.ability + own + classEffect[student.ci] + subject.teacherEffect[teacherIndex] + (topic.books[bookIndex] || 0);
            const ok = rand() < sigmoid(z);
            let pick = 0;
            if (!ok) {
              const others = [1, 2, 3].filter(i => i !== typical);
              pick = rand() < 0.62 ? typical : others[Math.floor(rand() * others.length)];
            }
            rows.push({
              student_id: student.id, class: student.cls, teacher: subject.teachers[teacherIndex], subject: subject.name,
              textbook: DEMO_BOOKS[bookIndex], topic: topic.name, question_id: prefix + (ti + 1) + '-' + (qi + 1),
              correct: ok ? 1 : 0, pretest, date, question_text: text, answer: options[pick], correct_answer: options[0]
            });
          });
        });
      }
    }
    return rows;
  }

  /* ------------------------------------------------------------ diagnosis */

  // One record per student × topic: share of correct answers and the entrance score.
  function studentTopic(rows) {
    const map = new Map();
    for (const row of rows) {
      const key = row.subject + '\u0000' + row.student_id + '\u0000' + row.topic;
      let item = map.get(key);
      if (!item) map.set(key, item = { student: row.student_id, cls: row.class, teacher: row.teacher, book: row.textbook, topic: row.topic, subject: row.subject, n: 0, ok: 0, pre: row.pretest == null || row.pretest === '' ? null : Number(row.pretest) });
      item.n++; item.ok += Number(row.correct);
      if (item.pre == null && row.pretest != null && row.pretest !== '') item.pre = Number(row.pretest);
    }
    for (const item of map.values()) { item.score = 100 * item.ok / item.n; item.gain = item.pre == null || !Number.isFinite(item.pre) ? null : item.score - item.pre; }
    return [...map.values()];
  }

  function summarize(units, answers, options) {
    const mastery = opt(options, 'mastery');
    const scores = units.map(u => u.score);
    const n = units.length;
    const mastered = units.filter(u => u.score >= mastery).length;
    const m = mean(scores), s = sd(scores);
    const notShare = n ? (n - mastered) / n : null;
    return {
      n, answers, score: m, lo: n > 1 ? m - 1.96 * s / Math.sqrt(n) : null, hi: n > 1 ? m + 1.96 * s / Math.sqrt(n) : null,
      mastered, notMastered: n - mastered, masteredShare: n ? mastered / n : null, notMasteredShare: notShare,
      gain: mean(units.map(u => u.gain)), pre: mean(units.map(u => u.pre)),
      lowData: n < opt(options, 'minStudents') || answers < opt(options, 'minAnswers'),
      status: notShare == null ? 'missing' : notShare >= opt(options, 'riskShare') ? 'risk' : notShare >= opt(options, 'watchShare') ? 'watch' : 'ok'
    };
  }

  function orderTopics(names, program) {
    const order = new Map((program || []).map((item, index) => [item.topic, item.order != null ? item.order : index]));
    return names.slice().sort((a, b) => (order.has(a) ? order.get(a) : 1e6) - (order.has(b) ? order.get(b) : 1e6) || cmp(a, b));
  }

  function topicStats(rows, options) {
    const opts = options || {};
    const units = studentTopic(rows);
    const names = orderTopics(unique(rows, 'topic'), opts.program);
    return names.map(topic => {
      const own = units.filter(u => u.topic === topic);
      return { topic, ...summarize(own, rows.filter(r => r.topic === topic).length, opts) };
    });
  }

  function cell(rows, topic, className, options) {
    const selected = rows.filter(row => (!topic || row.topic === topic) && (!className || row.class === className));
    const stats = summarize(studentTopic(selected), selected.length, options);
    // Backwards-compatible shape used by the heatmap: score, n, answers, lowData.
    return { ...stats, questions: itemStats(selected, topic) };
  }

  // Item analysis: difficulty, discrimination (point-biserial vs rest of the topic) and distractors.
  function itemStats(rows, topic) {
    const selected = topic ? rows.filter(row => row.topic === topic) : rows;
    const byStudent = new Map();
    for (const row of selected) {
      const key = row.student_id + '\u0000' + row.topic;
      if (!byStudent.has(key)) byStudent.set(key, { ok: 0, n: 0 });
      const s = byStudent.get(key); s.ok += Number(row.correct); s.n++;
    }
    const groups = new Map();
    for (const row of selected) {
      if (!groups.has(row.question_id)) groups.set(row.question_id, { id: row.question_id, text: row.question_text || row.question_id, correctAnswer: row.correct_answer || '', total: 0, ok: 0, wrong: new Map(), pairs: [] });
      const g = groups.get(row.question_id);
      const s = byStudent.get(row.student_id + '\u0000' + row.topic);
      const c = Number(row.correct);
      g.total++; g.ok += c;
      if (s.n > 1) g.pairs.push([c, (s.ok - c) / (s.n - 1)]);
      if (!c && row.answer != null && String(row.answer).trim() !== '') g.wrong.set(String(row.answer), (g.wrong.get(String(row.answer)) || 0) + 1);
    }
    // Journal imports (СОР/СОЧ points) have no real items: skip them in item analysis.
    return [...groups.values()].filter(g => !String(g.id).includes('·')).map(g => {
      const wrongTotal = g.total - g.ok;
      const wrong = [...g.wrong.entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).map(([answer, count]) => ({ answer, count, share: count / g.total }));
      const p = g.ok / g.total;
      let disc = null;
      if (g.pairs.length > 2) {
        const xs = g.pairs.map(x => x[0]), ys = g.pairs.map(x => x[1]);
        const mx = mean(xs), my = mean(ys);
        let sxy = 0, sxx = 0, syy = 0;
        for (const [x, y] of g.pairs) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
        disc = sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
      }
      const flags = [];
      if (p < 0.4 && g.total >= 10) flags.push('hard');
      if (disc != null && disc < 0.15 && g.total >= 30) flags.push('weak');
      if (wrong[0] && wrong[0].count >= Math.max(5, 0.5 * wrongTotal) && wrong[0].share >= 0.15) flags.push('misconception');
      return {
        id: g.id, text: g.text, correctAnswer: g.correctAnswer, total: g.total, wrongCount: wrongTotal,
        p: p * 100, errorRate: (1 - p) * 100, discrimination: disc, wrong: wrong.slice(0, 3),
        frequentWrong: wrong.length ? wrong[0].answer : null, flags
      };
    }).sort((a, b) => b.errorRate - a.errorRate || cmp(a.id, b.id));
  }

  /* -------------------------------------------------- textbook comparison */

  // Solve a small symmetric system with Gaussian elimination. Returns null if singular.
  function solve(A, b) {
    const n = b.length, M = A.map((row, i) => row.concat(b[i]));
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-9) return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map((row, i) => row[n] / row[i]);
  }

  // OLS: gain ~ textbook + teacher (+ topic). Returns textbook coefficients vs reference.
  function fitBooks(units, books, reference, teacherList, topicList) {
    const others = books.filter(b => b !== reference);
    const tIndex = new Map(teacherList.slice(1).map((t, i) => [t, i]));
    const pIndex = new Map(topicList.slice(1).map((t, i) => [t, i]));
    const bIndex = new Map(others.map((b, i) => [b, i]));
    const p = 1 + others.length + tIndex.size + pIndex.size;
    const XtX = Array.from({ length: p }, () => new Array(p).fill(0)), Xty = new Array(p).fill(0);
    const x = new Array(p);
    for (const u of units) {
      x.fill(0); x[0] = 1;
      if (bIndex.has(u.book)) x[1 + bIndex.get(u.book)] = 1;
      if (tIndex.has(u.teacher)) x[1 + others.length + tIndex.get(u.teacher)] = 1;
      if (pIndex.has(u.topic)) x[1 + others.length + tIndex.size + pIndex.get(u.topic)] = 1;
      for (let i = 0; i < p; i++) {
        if (!x[i]) continue;
        Xty[i] += u.y;
        for (let j = 0; j < p; j++) if (x[j]) XtX[i][j] += 1;
      }
    }
    const beta = solve(XtX, Xty);
    if (!beta) return null;
    return Object.fromEntries(others.map((b, i) => [b, beta[1 + i]]));
  }

  // Which textbooks are linked to each other through shared teachers?
  function components(pairs) {
    const parent = new Map();
    const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    const add = x => { if (!parent.has(x)) parent.set(x, x); };
    for (const [t, b] of pairs) { add('t:' + t); add('b:' + b); parent.set(find('t:' + t), find('b:' + b)); }
    return find;
  }

  const compareCache = new WeakMap();
  function compareBooks(rows, options) {
    const opts = options || {};
    const topic = opts.topic || null;
    const reps = Math.max(0, Math.min(2000, Number(opts.reps == null ? DEFAULTS.reps : opts.reps)));
    const key = [rows.length, topic, opts.reference || '', reps, opt(opts, 'meaningful')].join('|');
    let byRows = compareCache.get(rows);
    if (!byRows) compareCache.set(rows, byRows = new Map());
    if (byRows.has(key)) return byRows.get(key);

    const units = studentTopic(topic ? rows.filter(r => r.topic === topic) : rows);
    const books = unique(units, 'book');
    const result = { topic, state: 'empty', books: [], design: [], why: '', fixes: [], notes: [], reps: 0 };
    if (!units.length) { byRows.set(key, result); return result; }

    // Design: teacher × textbook → classes.
    const cells = new Map();
    for (const u of units) {
      const k = u.teacher + '\u0000' + u.book;
      if (!cells.has(k)) cells.set(k, { teacher: u.teacher, book: u.book, classes: new Set(), students: new Set() });
      const c = cells.get(k); c.classes.add(u.cls); c.students.add(u.student);
    }
    const teachers = unique(units, 'teacher');
    result.design = teachers.map(teacher => ({ teacher, cells: books.map(book => { const c = cells.get(teacher + '\u0000' + book); return c ? { book, classes: [...c.classes].sort(cmp), n: c.students.size } : { book, classes: [], n: 0 }; }) }));

    const studentsPerBook = new Map(books.map(b => [b, new Set(units.filter(u => u.book === b).map(u => u.student)).size]));
    const reference = opts.reference && books.includes(opts.reference) ? opts.reference : books.slice().sort((a, b) => studentsPerBook.get(b) - studentsPerBook.get(a) || cmp(a, b))[0];
    result.reference = reference;
    const find = components([...cells.values()].map(c => [c.teacher, c.book]));
    const comparable = books.filter(b => find('b:' + b) === find('b:' + reference));
    const lone = books.filter(b => !comparable.includes(b));

    const raw = book => {
      const own = units.filter(u => u.book === book);
      return { rawGain: mean(own.map(u => u.gain)), rawScore: mean(own.map(u => u.score)), n: studentsPerBook.get(book), classes: unique(own, 'cls'), teachers: unique(own, 'teacher') };
    };
    result.books = books.map(book => ({ book, ...raw(book), comparable: comparable.includes(book), reference: book === reference }));

    if (books.length < 2) {
      result.state = 'single';
      result.why = books.length ? 'В выбранных данных только один учебник — сравнивать не с чем.' : '';
      byRows.set(key, result); return result;
    }

    if (lone.length) {
      const teacherOf = book => unique(units.filter(u => u.book === book), 'teacher');
      result.why = lone.map(book => book + ' используется только у: ' + teacherOf(book).join(', ') + '. Эти учителя не работают с другими учебниками, поэтому разницу нельзя отделить от влияния учителя.').join(' ');
      for (const book of lone) {
        // Suggest moving one class of a multi-class teacher to the isolated textbook.
        const candidate = teachers.map(t => ({ t, classes: unique(units.filter(u => u.teacher === t), 'cls'), books: unique(units.filter(u => u.teacher === t), 'book') }))
          .find(item => item.classes.length >= 2 && !item.books.includes(book) && comparable.some(b => item.books.includes(b)));
        const own = teachers.map(t => ({ t, classes: unique(units.filter(u => u.teacher === t), 'cls'), books: unique(units.filter(u => u.teacher === t), 'book') }))
          .find(item => item.books.includes(book) && item.classes.length >= 2);
        if (own) result.fixes.push('Один из классов учителя ' + own.t + ' (например, ' + own.classes[own.classes.length - 1] + ') переходит на ' + reference + ', второй продолжает работать по ' + book + '.');
        else if (candidate) result.fixes.push('Класс ' + candidate.classes[candidate.classes.length - 1] + ' (' + candidate.t + ') переходит на ' + book + '.');
      }
      if (!result.fixes.length) result.fixes.push('Нужен хотя бы один учитель, который ведёт классы по двум разным учебникам.');
    }
    if (comparable.length < 2) { result.state = 'blocked'; byRows.set(key, result); return result; }

    // Outcome: gain over the entrance diagnostic when every unit has one, otherwise the final score.
    const useGain = units.every(u => u.gain != null);
    result.outcome = useGain ? 'gain' : 'score';
    for (const u of units) u.y = useGain ? u.gain : u.score;
    if (!useGain) result.notes.push('Нет входной диагностики у части учеников: сравниваются итоговые результаты, а не прирост. Такой вывод слабее — разница может объясняться исходным уровнем классов.');
    const inComp = units.filter(u => comparable.includes(u.book));
    const teacherList = unique(inComp, 'teacher'), topicList = topic ? [] : unique(inComp, 'topic');
    const point = fitBooks(inComp, comparable, reference, teacherList, topicList);
    if (!point) { result.state = 'blocked'; result.why = 'Модель не определена на этих данных.'; byRows.set(key, result); return result; }

    // Bootstrap: resample students within each class, keeping all of a student's topics together.
    const byClass = new Map();
    for (const u of inComp) {
      if (!byClass.has(u.cls)) byClass.set(u.cls, new Map());
      const m = byClass.get(u.cls);
      if (!m.has(u.student)) m.set(u.student, []);
      m.get(u.student).push(u);
    }
    const classLists = [...byClass.values()].map(m => [...m.values()]);
    const rand = mulberry32(hashStr(key + '|' + comparable.join(',')));
    const draws = Object.fromEntries(comparable.filter(b => b !== reference).map(b => [b, []]));
    for (let r = 0; r < reps; r++) {
      const sample = [];
      for (const list of classLists) for (let i = 0; i < list.length; i++) sample.push(...list[Math.floor(rand() * list.length)]);
      const est = fitBooks(sample, comparable, reference, teacherList, topicList);
      if (est) for (const b in draws) draws[b].push(est[b]);
    }
    result.reps = reps;
    const meaningful = opt(opts, 'meaningful'), minStudents = opt(opts, 'minStudents');
    for (const item of result.books) {
      if (!item.comparable) { item.verdict = 'incomparable'; continue; }
      if (item.reference) { item.diff = 0; item.verdict = 'reference'; continue; }
      const sorted = draws[item.book].slice().sort((a, b) => a - b);
      item.diff = point[item.book];
      item.lo = quantile(sorted, 0.025);
      item.hi = quantile(sorted, 0.975);
      if (item.n < minStudents) item.verdict = 'few';
      else if (item.lo > 0) item.verdict = item.diff >= meaningful ? 'better' : 'small';
      else if (item.hi < 0) item.verdict = item.diff <= -meaningful ? 'worse' : 'small';
      else item.verdict = 'same';
    }
    const oneClassCells = [...cells.values()].every(c => c.classes.size === 1);
    if (oneClassCells) result.notes.push('На каждое сочетание «учитель × учебник» приходится один класс: особенности конкретного класса не отделяются от учебника, поэтому интервал может быть оптимистичным.');
    result.state = lone.length ? 'partial' : 'ok';
    byRows.set(key, result);
    return result;
  }

  // Legacy names kept for callers of the previous API.
  function compare(rows, topic) { return compareBooks(rows, { topic }); }
  function detect(rows, topic) { const r = compareBooks(rows, { topic, reps: 0 }); return { ok: r.state === 'ok', why: r.why, fix: r.fixes }; }

  /* ------------------------------------------------------- hours planning */

  // Integer apportionment proportional to weights with per-item caps (largest remainders).
  function apportion(total, weights, caps) {
    const n = weights.length, alloc = new Array(n).fill(0);
    let left = total;
    const open = new Set(weights.map((w, i) => i).filter(i => weights[i] > 0 && caps[i] > 0));
    // Water-filling: items whose proportional share exceeds the cap are fixed at the cap.
    let changed = true;
    while (changed && open.size && left > 0) {
      changed = false;
      const sum = [...open].reduce((s, i) => s + weights[i], 0);
      for (const i of [...open]) {
        if (left * weights[i] / sum >= caps[i]) { alloc[i] = caps[i]; left -= caps[i]; open.delete(i); changed = true; }
      }
    }
    if (open.size && left > 0) {
      const sum = [...open].reduce((s, i) => s + weights[i], 0);
      const raw = [...open].map(i => ({ i, q: left * weights[i] / sum }));
      raw.forEach(r => { alloc[r.i] = Math.floor(r.q); });
      let rest = left - raw.reduce((s, r) => s + Math.floor(r.q), 0);
      raw.sort((a, b) => (b.q - Math.floor(b.q)) - (a.q - Math.floor(a.q)) || weights[b.i] - weights[a.i] || a.i - b.i);
      for (const r of raw) { if (!rest) break; if (alloc[r.i] < caps[r.i]) { alloc[r.i]++; rest--; } }
      left = rest;
    }
    return { alloc, left };
  }

  function planHours(rows, program, options) {
    const opts = options || {};
    const reserve = Number(opts.reserve == null ? 4 : opts.reserve);
    if (!Number.isSafeInteger(reserve) || reserve < 0 || reserve > 1000) throw new Error('Резерв должен быть целым числом от 0 до 1000.');
    const rebalance = opts.rebalance !== false;
    const weights = opts.weights || {};
    const stats = topicStats(rows, { ...opts, program });
    const statMap = new Map(stats.map(s => [s.topic, s]));
    const items = (program || []).map(p => ({ topic: p.topic, base: Math.max(0, Math.round(Number(p.hours) || 0)), inProgram: true }));
    for (const s of stats) if (!items.some(i => i.topic === s.topic)) items.push({ topic: s.topic, base: 0, inProgram: false });
    const avgBase = items.length ? Math.max(1, Math.round(items.reduce((s, i) => s + i.base, 0) / items.length)) : 1;

    const plan = items.map(item => {
      const s = statMap.get(item.topic) || null;
      const weight = [1, 2, 3].includes(Number(weights[item.topic])) ? Number(weights[item.topic]) : 1;
      const donor = rebalance && s && !s.lowData && s.masteredShare >= opt(opts, 'donorMastery');
      return {
        ...item, stats: s, weight, donor,
        cut: donor ? Math.floor(item.base * opt(opts, 'maxCut')) : 0,
        priority: s && !donor && !s.lowData ? s.notMasteredShare * (item.base || avgBase) * weight : 0,
        add: 0
      };
    });
    const donated = plan.reduce((s, p) => s + p.cut, 0);
    const caps = plan.map(p => Math.max(1, Math.floor((p.base || avgBase) * opt(opts, 'maxBoost'))));
    const pool = reserve + donated;
    const { alloc, left } = apportion(pool, plan.map(p => p.priority), caps);
    plan.forEach((p, i) => { p.add = alloc[i]; });
    // Hours that could not be placed go back to the donors first, then stay as unallocated reserve.
    let unplaced = left;
    for (const p of plan.slice().sort((a, b) => b.cut - a.cut)) {
      const back = Math.min(p.cut, unplaced);
      p.cut -= back; unplaced -= back;
    }
    const unallocated = unplaced;
    plan.forEach(p => {
      p.recommended = p.base - p.cut + p.add;
      p.delta = p.recommended - p.base;
      p.status = !p.stats ? 'nodata' : p.delta > 0 ? 'add' : p.delta < 0 ? 'cut' : 'keep';
      p.reason = !p.stats ? 'Нет результатов по теме — часы оставлены по программе.'
        : p.stats.lowData ? 'Мало данных (n = ' + p.stats.n + ') — часы не меняются, нужен дополнительный срез.'
        : p.delta > 0 ? 'Не освоили ' + Math.round(100 * p.stats.notMasteredShare) + '% учеников (' + p.stats.notMastered + ' из ' + p.stats.n + ').'
        : p.delta < 0 ? 'Освоили ' + Math.round(100 * p.stats.masteredShare) + '% учеников — часть часов можно передать.'
        : p.donor ? 'Тема освоена, но часы некуда передавать.'
        : 'Не освоили ' + Math.round(100 * p.stats.notMasteredShare) + '% — изменений не требуется.';
    });
    const baseTotal = plan.reduce((s, p) => s + p.base, 0);
    const recommendedTotal = plan.reduce((s, p) => s + p.recommended, 0);
    return {
      rows: plan, reserve, donated: plan.reduce((s, p) => s + p.cut, 0), unallocated, baseTotal, recommendedTotal,
      note: unallocated && !plan.some(p => p.priority > 0) ? 'Все темы освоены или данных мало: резерв оставлен на итоговое повторение.'
        : unallocated ? 'Часть резерва (' + unallocated + ' ч) не распределена из-за ограничения +' + Math.round(100 * opt(opts, 'maxBoost')) + '% к теме.' : ''
    };
  }

  function planCSV(plan) {
    const header = ['topic', 'program_hours', 'recommended_hours', 'delta', 'not_mastered_pct', 'students', 'reason'];
    return [header.join(',')].concat(plan.rows.map(p => [p.topic, p.base, p.recommended, p.delta, p.stats ? Math.round(100 * p.stats.notMasteredShare) : '', p.stats ? p.stats.n : 0, p.reason].map(quoteCSV).join(','))).join('\r\n');
  }

  /* -------------------------------------------------------------- summary */

  function insights(rows, program, options) {
    const opts = options || {};
    const stats = topicStats(rows, { ...opts, program });
    const units = studentTopic(rows);
    const mastery = opt(opts, 'mastery');
    const ranked = stats.filter(s => !s.lowData).sort((a, b) => b.notMasteredShare - a.notMasteredShare);
    const problems = ranked.filter(s => s.status !== 'ok').slice(0, 3).map(s => {
      // Typical error only from items with enough answers (live single answers must not dominate).
      const item = itemStats(rows, s.topic).find(q => q.wrong.length && q.total >= 10) || null;
      return { ...s, item };
    });
    const books = opts.compareRows ? compareBooks(opts.compareRows, { reps: opts.reps }) : null;
    const plan = planHours(rows, program, opts);
    const decisions = [];
    for (const p of problems) {
      let text = '«' + p.topic + '»: не освоили ' + Math.round(100 * p.notMasteredShare) + '% учеников.';
      if (p.item && p.item.wrong[0]) text += ' Типичная ошибка — «' + p.item.wrong[0].answer + '» в задании ' + (p.item.text.includes('«') ? '„' + p.item.text + '“' : '«' + p.item.text + '»') + ' (' + Math.round(100 * p.item.wrong[0].share) + '% ответов).';
      decisions.push({ kind: 'topic', tone: p.status, text });
    }
    if (books && (books.state === 'ok' || books.state === 'partial')) {
      for (const b of books.books.filter(b => b.verdict === 'better' || b.verdict === 'worse')) {
        decisions.push({ kind: 'book', tone: b.verdict === 'worse' ? 'risk' : 'ok', text: b.book + (b.verdict === 'worse' ? ' даёт меньший' : ' даёт больший') + ' прирост, чем ' + books.reference + ': ' + fmtSigned(b.diff) + ' п.п. (95% ДИ ' + fmtSigned(b.lo) + ' … ' + fmtSigned(b.hi) + ') с учётом учителя. Это связь, а не доказанная причина.' });
      }
    } else if (books && books.state === 'blocked') decisions.push({ kind: 'book', tone: 'watch', text: 'Сравнить учебники нельзя: ' + books.why });
    const adds = plan.rows.filter(p => p.delta > 0).sort((a, b) => b.delta - a.delta);
    const cuts = plan.rows.filter(p => p.delta < 0);
    if (adds.length) decisions.push({ kind: 'hours', tone: 'info', text: 'Часы: ' + adds.map(p => '+' + p.delta + ' ч «' + p.topic + '»').join(', ') + (cuts.length ? '; ' + cuts.map(p => '−' + Math.abs(p.delta) + ' ч «' + p.topic + '»').join(', ') : '') + '.' });
    return {
      kpi: {
        students: new Set(rows.map(r => r.student_id)).size, answers: rows.length, classes: unique(rows, 'class').length,
        score: mean(units.map(u => u.score)), masteredShare: units.length ? units.filter(u => u.score >= mastery).length / units.length : null,
        risk: stats.filter(s => s.status === 'risk' && !s.lowData).length, topics: stats.length, gain: mean(units.map(u => u.gain))
      },
      stats, problems, books, plan, decisions
    };
  }

  /* ----------------------------------------------- journal import (СОР/СОЧ) */
  // A simple table most schools already have: one row = one student's result for one
  // section (СОР) or the term (СОЧ). Headers may be Russian or Kazakh; tab-separated
  // text pasted from Excel works too. Each point becomes one answer row, so all
  // analytics work on the same scale (share of points = share of correct answers).
  const HEADER_SYNONYMS = {
    student_id: ['ученик', 'код', 'код ученика', 'фио', 'ф.и.о.', 'оқушы', 'оқушы коды', 'аты-жөні', 'student', 'student_id'],
    class: ['класс', 'сынып', 'class'],
    teacher: ['учитель', 'мұғалім', 'teacher'],
    subject: ['предмет', 'пән', 'subject'],
    textbook: ['учебник', 'оқулық', 'textbook'],
    topic: ['раздел', 'тема', 'цель', 'цель обучения', 'бөлім', 'тақырып', 'оқу мақсаты', 'topic'],
    kind: ['вид', 'вид работы', 'тип', 'сор/соч', 'жұмыс түрі', 'бжб/тжб', 'kind'],
    score: ['балл', 'баллы', 'набрано', 'ұпай', 'жинаған ұпай', 'score'],
    max: ['макс', 'макс.', 'макс балл', 'макс. балл', 'максимальный балл', 'максимум', 'из', 'ең жоғары ұпай', 'max'],
    date: ['дата', 'күні', 'date'],
    pretest: ['входной', 'входной балл', 'входная диагностика', 'бастапқы', 'pretest']
  };
  function findColumns(headers) {
    const norm = headers.map(h => String(h).trim().toLocaleLowerCase('ru'));
    const map = {};
    for (const [key, list] of Object.entries(HEADER_SYNONYMS)) { const i = norm.findIndex(h => list.includes(h)); if (i >= 0) map[key] = i; }
    return map;
  }
  function detectFormat(text) {
    const t = String(text || '').replace(/^﻿/u, '');
    const first = records(t, delimiter(t))[0];
    if (!first) return 'empty';
    const heads = first.fields.map(h => h.trim());
    if (REQUIRED_COLUMNS.every(c => heads.includes(c))) return 'answers';
    const map = findColumns(heads);
    return map.student_id != null && map.score != null && map.max != null && map.topic != null ? 'journal' : 'unknown';
  }
  // Names are replaced by stable pseudonymous codes so no personal data is stored.
  function codeFor(name) { return 'У-' + (hashStr(String(name).trim().toLocaleLowerCase('ru')) % 100000).toString().padStart(5, '0'); }
  function parseJournal(input, defaults) {
    const d = defaults || {};
    if (typeof input !== 'string') fail(1, 'ожидается таблица.');
    const text = input.replace(/^﻿/u, '');
    const data = records(text, delimiter(text));
    if (!data.length) fail(1, 'таблица пустая.');
    const heads = data[0].fields.map(h => h.trim());
    const col = findColumns(heads);
    const need = { student_id: 'Ученик (код)', class: 'Класс', topic: 'Раздел', score: 'Балл', max: 'Макс. балл' };
    const missing = Object.entries(need).filter(([k]) => col[k] == null && !(k === 'class' && d.class)).map(([, v]) => v);
    if (missing.length) fail(data[0].line, 'не найдены колонки: ' + missing.join(', ') + '. Скачайте шаблон журнала — в нём все нужные заголовки.');
    const rows = []; let renamed = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (const rec of data.slice(1)) {
      const f = k => col[k] == null ? '' : String(rec.fields[col[k]] == null ? '' : rec.fields[col[k]]).trim();
      let student = f('student_id');
      if (!student) continue;
      if (/\s/u.test(student) && /\p{L}{2,}/u.test(student)) { student = codeFor(student); renamed++; }
      const score = Number(f('score').replace(',', '.')), max = Number(f('max').replace(',', '.'));
      if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0 || max > 100 || score < 0 || score > max) fail(rec.line, `балл «${f('score')}» из «${f('max')}» не подходит: балл должен быть от 0 до максимального, максимум — от 1 до 100.`);
      const date = f('date') && validDate(f('date')) ? f('date') : (d.date || today);
      const kind = f('kind') || d.kind || 'СОР';
      const topic = f('topic');
      if (!topic) fail(rec.line, 'не заполнен раздел.');
      const pre = f('pretest') === '' ? null : Number(f('pretest').replace(',', '.'));
      const base = { student_id: student, class: f('class') || d.class, teacher: f('teacher') || d.teacher || 'Не указан', subject: f('subject') || d.subject || 'Предмет', textbook: f('textbook') || d.textbook || 'Не указан', topic, pretest: Number.isFinite(pre) ? pre : null, date };
      const points = Math.round(max), got = Math.round(score);
      for (let k = 1; k <= points; k++) rows.push({ ...base, question_id: `${kind}·${topic}·${k}`, correct: k <= got ? 1 : 0, question_text: `${kind}: ${topic}`, answer: '', correct_answer: '' });
    }
    if (!rows.length) fail(2, 'в таблице нет строк с результатами.');
    return { rows, renamed, students: new Set(rows.map(r => r.student_id)).size };
  }
  function journalTemplate() {
    return ['Ученик (код)\tКласс\tУчитель\tПредмет\tУчебник\tРаздел\tВид\tБалл\tМакс. балл\tДата',
      'S-0001\t6А\tА. Ахметова\tМатематика\tУчебник А\tОтношения и пропорции\tСОР\t7\t10\t2026-09-20',
      'S-0002\t6А\tА. Ахметова\tМатематика\tУчебник А\tОтношения и пропорции\tСОР\t9\t10\t2026-09-20'].join('\r\n');
  }

  /* ---------------------------------------------------- school indicators */
  // Kazakhstan convention: percent of points → mark (defaults 40/65/85, configurable),
  // успеваемость = share with mark ≥ 3, качество = share with mark ≥ 4,
  // levels: низкий < 40%, средний 40–84%, высокий ≥ 85%.
  const SCALE = Object.freeze([40, 65, 85]);
  function mark(pct, scale) { const s = scale || SCALE; return pct >= s[2] ? 5 : pct >= s[1] ? 4 : pct >= s[0] ? 3 : 2; }
  function indicators(list, scale) {
    const n = list.length, marks = { 2: 0, 3: 0, 4: 0, 5: 0 }, levels = { low: 0, mid: 0, high: 0 };
    for (const v of list) { marks[mark(v, scale)]++; levels[v < 40 ? 'low' : v < 85 ? 'mid' : 'high']++; }
    return { n, avg: mean(list), marks, levels, progress: n ? (marks[3] + marks[4] + marks[5]) / n : null, quality: n ? (marks[4] + marks[5]) / n : null };
  }
  function schoolMetrics(rows, options) {
    const scale = (options && options.scale) || SCALE;
    const per = new Map();
    for (const r of rows) {
      const k = r.student_id;
      if (!per.has(k)) per.set(k, { id: k, cls: r.class, ok: 0, n: 0 });
      const p = per.get(k); p.n++; p.ok += Number(r.correct);
    }
    const students = [...per.values()].map(p => ({ ...p, pct: 100 * p.ok / p.n }));
    const classesList = unique(students, 'cls');
    return {
      scale, total: indicators(students.map(s => s.pct), scale),
      classes: classesList.map(c => ({ cls: c, ...indicators(students.filter(s => s.cls === c).map(s => s.pct), scale) })),
      students
    };
  }

  // Draft of the calendar-thematic plan (КТП) from the hour recommendation.
  function ktpCSV(plan, weekly) {
    const per = Math.max(1, Number(weekly) || 3);
    let used = 0;
    const header = ['№', 'Раздел / тема', 'Часы по программе', 'Рекомендуемые часы', 'Изменение', 'Недели', 'Обоснование'];
    const lines = plan.rows.map((p, i) => {
      const from = Math.floor(used / per) + 1; used += p.recommended; const to = Math.max(from, Math.ceil(used / per));
      return [i + 1, p.topic, p.base, p.recommended, p.delta > 0 ? '+' + p.delta : String(p.delta), from === to ? String(from) : `${from}–${to}`, p.reason].map(quoteCSV).join(',');
    });
    return [header.join(',')].concat(lines).join('\r\n');
  }

  /* ------------------------------------------- formative (trainer) layer */
  // Trainer answers (lessons, game, assignments) are FORMATIVE practice. They are never
  // mixed into СОР/СОЧ indicators; instead growth is measured inside the trainer
  // (early vs late attempts of the same student on the same topic) and shown next to
  // the summative result of those students.
  function attemptsBy(form) {
    const map = new Map();
    for (const r of form) {
      const k = r.subject + '\u0000' + r.student_id + '\u0000' + r.topic;
      if (!map.has(k)) map.set(k, { student: r.student_id, cls: r.class, subject: r.subject, topic: r.topic, list: [] });
      map.get(k).list.push(r);
    }
    for (const v of map.values()) v.list.sort((a, b) => String(a.ts || a.date).localeCompare(String(b.ts || b.date)));
    return [...map.values()];
  }
  function earlyLate(list) {
    const n = list.length, third = Math.max(2, Math.floor(n / 3));
    const acc = arr => 100 * arr.reduce((s, r) => s + Number(r.correct), 0) / arr.length;
    return { n, early: acc(list.slice(0, third)), late: acc(list.slice(-third)), all: acc(list) };
  }
  function meanCI(values) {
    const n = values.length; if (!n) return { mean: null, lo: null, hi: null, n: 0 };
    const m = mean(values), sdv = sd(values), half = n > 1 ? 1.96 * sdv / Math.sqrt(n) : null;
    return { mean: m, lo: half == null ? null : m - half, hi: half == null ? null : m + half, n };
  }
  function growthCompare(summ, form, options) {
    const o = options || {};
    const minAttempts = o.minAttempts || 6, minStudents = o.minStudents || 5;
    const units = studentTopic(summ);
    const sorOf = new Map(units.map(u => [u.subject + '\u0000' + u.student + '\u0000' + u.topic, u.score]));
    const groups = attemptsBy(form);
    const topicsList = orderTopics([...new Set(groups.map(g => g.topic).concat(unique(summ, 'topic')))], o.program);
    return topicsList.map(topic => {
      const g = groups.filter(x => x.topic === topic);
      const enough = g.filter(x => x.list.length >= minAttempts).map(x => ({ ...x, ...earlyLate(x.list), sor: sorOf.get(x.subject + '\u0000' + x.student + '\u0000' + x.topic) }));
      const growth = meanCI(enough.map(x => x.late - x.early));
      const sorAll = summarize(units.filter(u => u.topic === topic), 0, o).score;
      const practicing = enough.filter(x => x.sor != null);
      return {
        topic, students: new Set(g.map(x => x.student)).size, attempts: g.reduce((s, x) => s + x.list.length, 0), measured: enough.length,
        early: mean(enough.map(x => x.early)), late: mean(enough.map(x => x.late)), growth: growth.mean, lo: growth.lo, hi: growth.hi,
        sorAll, sorPracticing: mean(practicing.map(x => x.sor)), lowData: enough.length < minStudents,
        verdict: enough.length < minStudents ? 'few' : growth.lo != null && growth.lo > 0 ? 'up' : growth.hi != null && growth.hi < 0 ? 'down' : 'flat'
      };
    }).filter(r => r.students || r.sorAll != null);
  }
  function studentTrainer(form, studentId) {
    return attemptsBy(form.filter(r => r.student_id === studentId)).map(g => ({ topic: g.topic, ...earlyLate(g.list) }));
  }
  // Progress of one assignment: who started, accuracy early→late, compared with the
  // same students' СОР result (before) on that topic.
  function assignmentProgress(asg, form, summ) {
    const own = form.filter(r => r.assignmentId === asg.id);
    const by = attemptsBy(own);
    const units = studentTopic(summ.filter(r => r.topic === asg.topic));
    const sor = new Map(units.map(u => [u.student, u.score]));
    const target = asg.students && asg.students.length ? asg.students : [...new Set(summ.filter(r => r.class === asg.cls).map(r => r.student_id))];
    const started = by.map(g => ({ student: g.student, ...earlyLate(g.list) }));
    const measured = started.filter(x => x.n >= 4);
    const growth = meanCI(measured.map(x => x.late - x.early));
    return { target: target.length, started: started.length, answers: own.length, accuracy: own.length ? 100 * own.filter(r => r.correct).length / own.length : null, early: mean(measured.map(x => x.early)), late: mean(measured.map(x => x.late)), growth: growth.mean, lo: growth.lo, hi: growth.hi, sorBefore: mean(target.map(id => sor.get(id)).filter(v => v != null)), students: started };
  }

  // Deterministic synthetic trainer history for the demo (clearly labelled in the UI):
  // students practise their weak topics; those in a demo support group get an
  // assignment and practise more, so the dashboard can show both kinds of growth.
  function buildTrainer(summ, options) {
    const o = options || {};
    const rand = mulberry32(o.seed || 909);
    const units = studentTopic(summ);
    const out = [], assignments = [];
    const start = Date.UTC(2026, 9, 19);
    const day = d => new Date(start + d * 86400000).toISOString().slice(0, 10);
    for (const subjectName of unique(summ, 'subject')) {
      const su = units.filter(u => u.subject === subjectName);
      // One demo assignment per subject: the hardest topic in the weakest class, core students.
      const topicScores = unique(su, 'topic').map(t => ({ t, s: mean(su.filter(u => u.topic === t).map(u => u.score)) })).sort((a, b) => a.s - b.s);
      const hardest = topicScores[0] && topicScores[0].t;
      const classScores = unique(su, 'cls').map(c => ({ c, s: mean(su.filter(u => u.cls === c && u.topic === hardest).map(u => u.score)) })).sort((a, b) => a.s - b.s);
      const cls = classScores[0] && classScores[0].c;
      const core = su.filter(u => u.topic === hardest && u.cls === cls && u.score <= 40).map(u => u.student).sort(cmp);
      const asg = { id: 'demo-' + (subjectName === 'Математика' ? 'm' : 'k'), title: 'Группа поддержки: ' + hardest, subject: subjectName, topic: hardest, cls, students: core, size: 8, createdAt: day(6) + 'T09:00:00Z', demo: true };
      if (core.length) assignments.push(asg);
      const byStudent = new Map();
      for (const u of su) { if (!byStudent.has(u.student)) byStudent.set(u.student, []); byStudent.get(u.student).push(u); }
      for (const [sid, list] of byStudent) {
        const inGroup = asg.students.includes(sid);
        if (!inGroup && rand() > 0.42) continue;
        const sorted = list.slice().sort((a, b) => a.score - b.score);
        const weak = inGroup ? [list.find(u => u.topic === hardest)].concat(sorted.filter(u => u.topic !== hardest).slice(0, 1)) : sorted.slice(0, 2);
        for (const u of weak) {
          const assigned = inGroup && u.topic === hardest;
          const n = assigned ? 15 + Math.floor(rand() * 9) : 9 + Math.floor(rand() * 10);
          const p0 = Math.min(0.9, Math.max(0.15, u.score / 100 * 0.85 + 0.08));
          const gain = assigned ? 0.25 + rand() * 0.2 : 0.06 + rand() * 0.18;
          for (let k = 0; k < n; k++) {
            const p = Math.min(0.97, p0 + gain * (k / Math.max(1, n - 1)));
            const d = (assigned ? 7 : 1) + Math.floor((k / n) * (assigned ? 14 : 20) + rand() * 2);
            out.push({ id: `demo-${sid}-${u.topic.length}-${k}-${subjectName.length}`, student_id: sid, class: u.cls, subject: subjectName, topic: u.topic, question_id: 'trainer', question_text: '', correct: rand() < p ? 1 : 0, answer: '', correct_answer: '', date: day(d), ts: day(d) + 'T' + String(10 + (k % 8)).padStart(2, '0') + ':00:00Z', source: assigned ? 'assignment' : (k % 2 ? 'game' : 'lesson'), assignmentId: assigned ? asg.id : null, demo: true });
          }
        }
      }
    }
    return { rows: out, assignments };
  }

  /* ------------------------------------------------------------ students */
  // Per-student profile: mastery by topic, risk level and live trainer activity.
  function studentProfiles(rows, options) {
    const opts = options || {};
    const mastery = opt(opts, 'mastery');
    const topics = orderTopics(unique(rows, 'topic'), opts.program);
    const units = studentTopic(rows);
    const live = new Map();
    for (const r of rows) if (String(r.question_id).startsWith('live-')) live.set(r.student_id, (live.get(r.student_id) || 0) + 1);
    const map = new Map();
    for (const u of units) {
      if (!map.has(u.student)) map.set(u.student, { id: u.student, cls: u.cls, teacher: u.teacher, book: u.book, topics: {}, scores: [], gains: [] });
      const p = map.get(u.student);
      p.topics[u.topic] = { score: u.score, mastered: u.score >= mastery, n: u.n };
      p.scores.push(u.score); p.gains.push(u.gain);
    }
    return [...map.values()].map(p => {
      const weak = topics.filter(t => p.topics[t] && !p.topics[t].mastered);
      const covered = topics.filter(t => p.topics[t]).length;
      const share = covered ? weak.length / covered : 0;
      return {
        id: p.id, cls: p.cls, teacher: p.teacher, book: p.book, topics: p.topics, weak, covered,
        score: mean(p.scores), gain: mean(p.gains), live: live.get(p.id) || 0,
        risk: share >= 2 / 3 ? 'high' : share >= 1 / 3 ? 'medium' : 'low'
      };
    }).sort((a, b) => b.weak.length - a.weak.length || a.score - b.score || cmp(a.id, b.id));
  }

  // Ready-made support groups: for each topic, the students who did not master it, by class.
  function supportGroups(rows, options) {
    const opts = options || {};
    const profiles = studentProfiles(rows, opts);
    const topics = orderTopics(unique(rows, 'topic'), opts.program);
    const minSize = opts.minSize || 3;
    return topics.map(topic => {
      const weak = profiles.filter(p => p.topics[topic] && !p.topics[topic].mastered);
      const byClass = new Map();
      for (const p of weak) { if (!byClass.has(p.cls)) byClass.set(p.cls, []); byClass.get(p.cls).push(p.id); }
      // "Core" = clearly struggling (≤ 40% correct): the first candidates for extra lessons.
      const core = new Set(weak.filter(p => p.topics[topic].score <= 40).map(p => p.id));
      const groups = [...byClass.entries()].sort((a, b) => cmp(a[0], b[0])).map(([cls, students]) => ({ cls, students: students.sort(cmp), core: students.filter(id => core.has(id)).sort(cmp), size: students.length, viable: students.length >= minSize }));
      const total = profiles.filter(p => p.topics[topic]).length;
      return { topic, count: weak.length, core: core.size, total, share: total ? weak.length / total : 0, groups };
    }).filter(g => g.count).sort((a, b) => b.share - a.share);
  }

  function groupsCSV(groups) {
    const header = ['topic', 'class', 'students_count', 'core_count', 'core_ids', 'student_ids'];
    const lines = [];
    for (const g of groups) for (const c of g.groups) lines.push([g.topic, c.cls, c.size, c.core.length, c.core.join(' '), c.students.join(' ')].map(quoteCSV).join(','));
    return [header.join(',')].concat(lines).join('\r\n');
  }

  // Aggregates safe to send to a model: no student codes, only topic/class/textbook numbers.
  function summaryPayload(rows, program, options) {
    const ins = insights(rows, program, options);
    return {
      subject: unique(rows, 'subject').join(', '), students: ins.kpi.students, answers: ins.kpi.answers,
      mastery: opt(options, 'mastery'),
      topics: ins.stats.map(s => ({ topic: s.topic, score: Math.round(s.score), notMastered: Math.round(100 * s.notMasteredShare), gain: Math.round(s.gain), n: s.n, lowData: s.lowData })),
      problems: ins.problems.map(p => ({ topic: p.topic, typicalError: p.item && p.item.wrong[0] ? { question: p.item.text, answer: p.item.wrong[0].answer, share: Math.round(100 * p.item.wrong[0].share) } : null })),
      textbooks: ins.books && (ins.books.state === 'ok' || ins.books.state === 'partial') ? ins.books.books.map(b => ({ book: b.book, reference: b.reference, diff: b.diff == null ? null : Math.round(b.diff * 10) / 10, lo: b.lo == null ? null : Math.round(b.lo * 10) / 10, hi: b.hi == null ? null : Math.round(b.hi * 10) / 10, verdict: b.verdict })) : { state: ins.books && ins.books.state, why: ins.books && ins.books.why },
      hours: ins.plan.rows.map(p => ({ topic: p.topic, program: p.base, recommended: p.recommended }))
    };
  }

  function fmtSigned(value) {
    if (!Number.isFinite(value)) return '—';
    const r = Math.round(value * 10) / 10;
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
  }

  return {
    REQUIRED_COLUMNS, OPTIONAL_COLUMNS, THRESHOLDS, DEFAULTS, LESSON_TOPICS, DEMO_BOOKS,
    band, parseCSV, exportCSV, templateCSV, unique, subjects, classes, topics, filterRows,
    build, demoProgram, studentTopic, topicStats, cell, itemStats,
    compareBooks, compare, detect, apportion, planHours, planCSV, insights, fmtSigned, studentProfiles, supportGroups, groupsCSV, summaryPayload, detectFormat, parseJournal, journalTemplate, codeFor, SCALE, mark, schoolMetrics, ktpCSV, growthCompare, studentTrainer, assignmentProgress, buildTrainer
  };
});
