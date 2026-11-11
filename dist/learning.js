(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JazLearning = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const scenarios = [
    { id: 'cinema', title: 'Киноға барамыз ба?', persona: 'Аян', icon: 'cinema', task: 'Досыңмен кездесу уақыты мен орнын келіс.', opening: 'Сәлем! Бүгін кешке боссың ба? Бірге киноға барсақ қайтеді? 🍿', suggestions: ['Салем! Кинога барамыз ба?', 'Сәлем! Иә, мен боспын.', 'Сағат жетіде кездесейік.'] },
    { id: 'teacher', title: 'Мұғалімге хабарлама', persona: 'Айгүл апай', icon: 'teacher', task: 'Тапсырма туралы сыпайы сұрақ қой.', opening: 'Сәлем! Тапсырма бойынша сұрағың бар ма? Қай жері түсініксіз екенін айта ғой.', suggestions: ['Сәлеметсіз бе! Сұрағым бар.', 'Тапсырманы түсіндіріп жібересіз бе?', 'Көмегіңізге рақмет!'] },
    { id: 'social', title: 'Суретке бір пікір', persona: 'Аружан', icon: 'social', task: 'Досыңның суретіне пікір жазып, әңгімеге қосыл.', opening: 'Бүгін тауға шықтым! Мына суретке қандай жазба жазсам болады? 📸', suggestions: ['Суретің өте әдемі!', 'Бугин күн жаксы екен.', 'Табиғат қандай әдемі!'] },
    { id: 'gaming', title: 'Командаға қосыл', persona: 'Данияр', icon: 'gaming', task: 'Командаласыңмен ойын уақытын келіс.', opening: 'Сәлем! Бүгін бірге ойнаймыз ба? Қай уақытта қосыла аласың? 🎮', suggestions: ['Сәлем! Бірге ойнайық.', 'Сағат сегізде қосыламын.', 'Сен не истеп жатсын?'] }
  ];

  const lessons = [
    { id: 'letters', title: 'Әр әріп маңызды', description: 'Ә, і, қ, ғ әріптерін орнымен қолдан.', xp: 20, duration: '3 минут', questions: [
      { id: 'letters-1', prompt: 'Досыңа қалай амандасасың?', options: ['Салем!', 'Сәлем!', 'Сэлем!'], answerIndex: 1, explanation: '«Сәлем» сөзінде ә әрпі жазылады.' },
      { id: 'letters-2', prompt: 'Дұрыс жазылған сөзді таңда.', options: ['жаксы', 'жақсы', 'жақсыы'], answerIndex: 1, explanation: '«Жақсы» сөзінде қ әрпі қолданылады.' },
      { id: 'letters-3', prompt: 'Қай сөйлем дұрыс жазылған?', options: ['Бугін күн жақсы.', 'Бүгин күн жақсы.', 'Бүгін күн жақсы.'], answerIndex: 2, explanation: '«Бүгін» сөзінде ү және і әріптері жазылады.' }
    ] },
    { id: 'ng', title: 'Н мен Ң', description: 'Айырмасын байқап, дұрыс жаз.', xp: 20, duration: '3 минут', questions: [
      { id: 'ng-1', prompt: 'Қай сұрақ дұрыс жазылған?', options: ['Сен қайда барасын?', 'Сен қайда барасың?', 'Сен қайда барасын.'], answerIndex: 1, explanation: '«Сен» деп сөйлегенде «барасың» тұлғасында ң жазылады.' },
      { id: 'ng-2', prompt: 'Сөйлемді толықтыр: «Бұл — ... кітабым».', options: ['менің', 'менін', 'меним'], answerIndex: 0, explanation: 'Ілік септіктегі дұрыс тұлға — «менің».' },
      { id: 'ng-3', prompt: 'Досыңның суретін мақта.', options: ['Суретін әдемі!', 'Суретің әдемі!', 'Суретин әдемі!'], answerIndex: 1, explanation: '«Сенің суретің» дегенде тәуелдік жалғауы ң әрпімен жазылады.' }
    ] },
    { id: 'questions', title: 'Сұрақ қоя біл', description: 'Сұраулық шылау мен сұрақ белгісі.', xp: 20, duration: '2 минут', questions: [
      { id: 'questions-1', prompt: 'Сұрақты дұрыс жаз.', options: ['Бүгін кездесемізбе?', 'Бүгін кездесеміз бе?', 'Бүгін кездесеміз бе.'], answerIndex: 1, explanation: 'Сұраулық «бе» бөлек жазылады. Сұрақ соңына сұрақ белгісі қойылады.' },
      { id: 'questions-2', prompt: 'Досыңды ойынға шақыр.', options: ['Бірге ойнаймызба?', 'Бірге ойнаймыз ба?', 'Бірге ойнаймыз па?'], answerIndex: 1, explanation: 'Бұл сөйлемде сұраулық шылау «ба» түрінде бөлек жазылады.' },
      { id: 'questions-3', prompt: 'Қай нұсқа сұраулы сөйлем?', options: ['Кешке келесің бе?', 'Кешке келесің.', 'Кешке кел!'], answerIndex: 0, explanation: '«Келесің бе?» сұрақты білдіреді.' }
    ] },
    { id: 'endings', title: 'Қайда барамыз?', description: 'Киноға, мектепке, саябаққа.', xp: 20, duration: '3 минут', questions: [
      { id: 'endings-1', prompt: 'Қай нұсқа дұрыс?', options: ['Кинога барамын.', 'Киноға барамын.', 'Киноке барамын.'], answerIndex: 1, explanation: '«Кино» сөзіне -ға жалғауы жалғанады: киноға.' },
      { id: 'endings-2', prompt: 'Сөйлемді толықтыр: «Мен ... барамын».', options: ['мектепға', 'мектепке', 'мектепге'], answerIndex: 1, explanation: '«Мектеп» сөзіне -ке жалғанады: мектепке.' },
      { id: 'endings-3', prompt: 'Кездесетін орынды дұрыс жаз.', options: ['Саябаққа барайық.', 'Саябақға барайық.', 'Саябақке барайық.'], answerIndex: 0, explanation: '«Саябақ» сөзіне -қа жалғанады: саябаққа.' }
    ] }
  ];

  const fixes = {
    'салем': ['сәлем', '«Сәлем» сөзінде ә әрпі жазылады.'],
    'калай': ['қалай', '«Қалай» сөзінде қ әрпі жазылады.'],
    'жаксы': ['жақсы', '«Жақсы» сөзінде қ әрпі жазылады.'],
    'кинога': ['киноға', '«Кино» сөзіне -ға жалғауы жалғанады: киноға.'],
    'истеп': ['істеп', '«Істеп» сөзінде і әрпі жазылады.'],
    'жатсын': ['жатырсың', 'Бұл жаттығудағы «сен не істеп жатырсың?» сұрағында «жатырсың» тұлғасы қолданылады.'],
    'бугин': ['бүгін', '«Бүгін» сөзінде ү және і әріптері жазылады.'],
    'сенин': ['сенің', '«Сенің» сөзінің соңында ң әрпі жазылады.'],
    'менин': ['менің', '«Менің» сөзінің соңында ң әрпі жазылады.'],
    'сурак': ['сұрақ', '«Сұрақ» сөзінде ұ және қ әріптері жазылады.']
  };

  // A finite practice vocabulary, not a general-purpose grammar checker.
  const commonPhrases = [
    'сәлем', 'сәлем қалайсың', 'қалайсың', 'жақсы өзің', 'жақсымын рақмет',
    'жақсымын рахмет', 'рақмет', 'рахмет', 'иә', 'жоқ', 'келістік',
    'көріскенше', 'сен не істеп жатырсың', 'мен үйдемін', 'сау бол', 'сау болыңыз'
  ];
  const scenarioPhrases = {
    cinema: ['сәлем иә мен боспын', 'иә мен боспын', 'бүгін кешке боспын', 'киноға барамыз ба', 'сәлем киноға барамыз ба', 'киноға барайық', 'мен киноға барамын', 'сағат жетіде кездесейік', 'сағат жетіде', 'кинотеатрдың алдында кездесейік', 'қандай фильм көреміз', 'комедия көрейік', 'бірге барайық', 'бүгін бара алмаймын'],
    teacher: ['сәлеметсіз бе', 'сәлеметсіз бе сұрағым бар', 'сұрағым бар', 'тапсырманы түсіндіріп жібересіз бе', 'тапсырманы түсінбедім', 'қайырлы күн', 'көмегіңізге рақмет', 'көмегіңізге рахмет', 'тапсырманы қашан тапсырамыз', 'рақмет түсіндім', 'рахмет түсіндім'],
    social: ['суретің өте әдемі', 'суретің әдемі', 'бүгін күн жақсы екен', 'табиғат қандай әдемі', 'бұл қай жер', 'мен де барғым келеді', 'таза ауа тамаша көрініс', 'керемет сурет', 'бірге барайық'],
    gaming: ['сәлем бірге ойнайық', 'бірге ойнайық', 'сағат сегізде қосыламын', 'сағат сегізде', 'бүгін бірге ойнаймыз ба', 'мен дайынмын', 'қай ойынды ойнаймыз', 'командаға қосыламын', 'ойын қызық болды', 'ертең ойнайық']
  };

  function normalizeText(value) {
    return typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('kk-KZ') : '';
  }

  function canonicalText(value) {
    return normalizeText(value).replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/gu, ' ').trim();
  }

  function scenarioFor(id) {
    return scenarios.find(function (scenario) { return scenario.id === id; }) || scenarios[0];
  }

  function preserveCase(source, replacement) {
    if (source === source.toLocaleUpperCase('kk-KZ')) return replacement.toLocaleUpperCase('kk-KZ');
    if (source[0] === source[0].toLocaleUpperCase('kk-KZ')) return replacement[0].toLocaleUpperCase('kk-KZ') + replacement.slice(1);
    return replacement;
  }

  function nextReply(scenarioId, text, turn) {
    const value = canonicalText(text);
    const replies = {
      cinema: value.includes('жетіде') ? 'Келістік! Кинотеатрдың алдында кездесейік. Қандай фильм көргің келеді?' : value.includes('комедия') ? 'Комедия жақсы таңдау! Онда сағат жетіде кинотеатрдың алдында кездесейік пе?' : 'Тамаша! Сағат нешеде кездесейік? Мен жетіде босаймын.',
      teacher: value.includes('рақмет') || value.includes('рахмет') ? 'Оқасы жоқ! Қосымша сұрақ туындаса, жаза ғой.' : 'Әрине, көмектесемін. Тапсырманың қай жерін түсінбедің?',
      social: value.includes('қай жер') ? 'Бұл — таудағы соқпақ. Келесі жолы бірге барайық па?' : 'Рақмет! Сен де табиғатта серуендегенді ұнатасың ба?',
      gaming: value.includes('сегізде') ? 'Келістік, сегізде күтемін! Қай ойынды таңдаймыз?' : 'Керемет! Қай уақытта қосыласың? Мен сегізде бос боламын.'
    };
    if (value === 'көріскенше' || value === 'сау бол' || value === 'сау болыңыз') return 'Көріскенше! Бүгінгі әңгімеге рақмет. 👋';
    if (value === 'рақмет' || value === 'рахмет') return 'Оқасы жоқ! Әңгімені жалғастырайық.';
    if (value.includes('не істеп жатырсың')) return scenarioId === 'gaming' ? 'Ойынға дайындалып отырмын. Бірге ойнаймыз ба?' : 'Бүгінгі кешті жоспарлап отырмын. Сен не істегің келеді?';
    return replies[scenarioId] || (turn % 2 ? 'Жақсы! Әңгімемізді жалғастырайық.' : 'Сәлем! Бүгінгі жоспарың қандай?');
  }

  function assessMessage(text, options) {
    options = options || {};
    const scenario = scenarioFor(options.scenarioId);
    const base = { kind: 'unverified', corrected: null, issues: [], reply: '', suggestedReplies: scenario.suggestions.slice(), verified: false };
    if (typeof text !== 'string' || !text.trim()) return Object.assign(base, { reply: 'Алдымен қысқа хабарлама жазып көр.' });
    if (text.length > 500) return Object.assign(base, { reply: 'Бір хабарламаға 500 таңбаға дейін жаз. Ойыңды бірнеше хабарламаға бөліп көр.' });
    if (/[<>]/u.test(text)) return Object.assign(base, { reply: 'Жаттығуды кәдімгі мәтінмен жалғастырайық. Қысқа хабарлама жазып көр.' });
    const canonical = canonicalText(text);
    if (/(?:^| )боватр енд(?: |$)/u.test(canonical)) {
      return Object.assign(base, {
        kind: 'clarify',
        reply: '«Болып жатыр енді» дегің келді ме? Әлде басқа ой айтқың келді ме? Мағынасын нақтылап, қайта жазып көр.',
        suggestedReplies: ['Болып жатыр енді.', 'Ойымды басқаша айтайын.']
      });
    }
    const issues = [];
    const corrected = text.normalize('NFC').replace(/[\p{L}]+/gu, function (word, offset) {
      const key = normalizeText(word);
      if (!Object.prototype.hasOwnProperty.call(fixes, key)) return word;
      const fix = fixes[key];
      // The imperative "жатсын" can be valid outside this second-person question.
      const prefix = canonicalText(text.normalize('NFC').slice(0, offset + word.length));
      if (normalizeText(word) === 'жатсын' && !/(?:^| )сен не (?:істеп|истеп) жатсын$/u.test(prefix)) return word;
      const replacement = preserveCase(word, fix[0]);
      issues.push({ from: word, to: replacement, reason: fix[1] });
      return replacement;
    });
    if (issues.length) {
      return Object.assign(base, {
        kind: 'correction', corrected: corrected,
        issues: issues, verified: true,
        reply: 'Ойың түсінікті! Белгіленген сөздерді өзің түзетіп, хабарламаны қайта жіберіп көр.'
      });
    }
    const allowed = commonPhrases.concat(scenarioPhrases[scenario.id]);
    if (allowed.includes(canonical)) {
      return Object.assign(base, {
        kind: 'recognized', verified: true,
        reply: nextReply(scenario.id, text, Number.isFinite(options.turn) ? options.turn : 0),
        suggestedReplies: scenarioPhrases[scenario.id].slice(0, 3).map(function (value) { return value[0].toLocaleUpperCase('kk-KZ') + value.slice(1) + '.'; })
      });
    }
    return Object.assign(base, {
      reply: 'Бұл еркін хабарламаны толық тексере алмаймын. Оны қате деп бағаламаймын. Төмендегі жаттығу үлгілерінің бірін қолданып көр немесе қысқа хабарлама жаз.'
    });
  }

  function verifyCorrection(original, candidate) {
    const assessment = assessMessage(original);
    return assessment.kind === 'correction' && typeof candidate === 'string' && candidate.length <= 500 && canonicalText(candidate) === canonicalText(assessment.corrected);
  }

  function validDay(day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(day)) return false;
    const parsed = new Date(day + 'T00:00:00.000Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
  }

  function dayDistance(first, second) {
    return (Date.parse(second + 'T00:00:00.000Z') - Date.parse(first + 'T00:00:00.000Z')) / 86400000;
  }

  function initialState() {
    return { xp: 0, level: 1, streak: 0, lastActiveDay: null, activeDays: [], events: [], completedLessons: [] };
  }

  function sanitizeState(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.events)) return initialState();
    const seen = new Set();
    const events = [];
    for (const entry of value.events) {
      if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || entry.id.length > 650 || !validDay(entry.day) || seen.has(entry.id)) continue;
      if (entry.type === 'lesson') {
        if (!lessons.some(function (lesson) { return lesson.id === entry.lessonId; }) || entry.id !== 'lesson:' + entry.lessonId || entry.xp !== 20) continue;
        events.push({ id: entry.id, type: 'lesson', lessonId: entry.lessonId, day: entry.day, xp: 20 });
      } else if (entry.type === 'practice') {
        const scenarioId = entry.scenarioId;
        if (!scenarios.some(function (scenario) { return scenario.id === scenarioId; }) || typeof entry.text !== 'string' || entry.text.length > 500 || !entry.text || entry.xp !== 10) continue;
        if (entry.id !== 'practice:' + scenarioId + ':' + entry.day + ':' + canonicalText(entry.text)) continue;
        events.push({ id: entry.id, type: 'practice', scenarioId: scenarioId, text: entry.text, day: entry.day, xp: 10 });
      } else continue;
      seen.add(entry.id);
    }
    const activeDays = [...new Set(events.map(function (event) { return event.day; }))].sort();
    let streak = activeDays.length ? 1 : 0;
    for (let i = activeDays.length - 1; i > 0 && dayDistance(activeDays[i - 1], activeDays[i]) === 1; i--) streak++;
    const xp = events.reduce(function (sum, event) { return sum + event.xp; }, 0);
    return {
      xp: xp, level: Math.floor(xp / 100) + 1, streak: streak,
      lastActiveDay: activeDays.length ? activeDays[activeDays.length - 1] : null,
      activeDays: activeDays, events: events,
      completedLessons: events.filter(function (event) { return event.type === 'lesson'; }).map(function (event) { return event.lessonId; })
    };
  }

  function getStreak(value, day) {
    const state = sanitizeState(value);
    if (!state.lastActiveDay || !validDay(day)) return 0;
    const distance = dayDistance(state.lastActiveDay, day);
    return distance === 0 || distance === 1 ? state.streak : 0;
  }

  function reduceProgress(value, event) {
    const state = sanitizeState(value);
    if (!event || !validDay(event.day)) return state;
    let award;
    if (event.type === 'lesson') {
      if (!lessons.some(function (lesson) { return lesson.id === event.lessonId; })) return state;
      award = { id: 'lesson:' + event.lessonId, type: 'lesson', lessonId: event.lessonId, day: event.day, xp: 20 };
    } else if (event.type === 'message' || event.type === 'correction') {
      if (!scenarios.some(function (scenario) { return scenario.id === event.scenarioId; }) || typeof event.text !== 'string' || event.text.length > 500) return state;
      if (event.type === 'message' && assessMessage(event.text, { scenarioId: event.scenarioId }).kind !== 'recognized') return state;
      if (event.type === 'correction' && !verifyCorrection(event.original, event.text)) return state;
      const canonical = canonicalText(event.text);
      if (!canonical) return state;
      award = { id: 'practice:' + event.scenarioId + ':' + event.day + ':' + canonical, type: 'practice', scenarioId: event.scenarioId, text: canonical, day: event.day, xp: 10 };
    } else return state;
    if (state.events.some(function (entry) { return entry.id === award.id; })) return state;
    return sanitizeState({ events: state.events.concat(award) });
  }

  return { scenarios: scenarios, lessons: lessons, assessMessage: assessMessage, verifyCorrection: verifyCorrection, normalizeText: normalizeText, initialState: initialState, sanitizeState: sanitizeState, reduceProgress: reduceProgress, getStreak: getStreak };
});
