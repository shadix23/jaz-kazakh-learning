(function (root, factory) {
  const req = name => typeof require === 'function' ? require(name) : null;
  const K = root.JazKazakh || req('./kazakh.js');
  if (!root.JazKazakh && K) root.JazKazakh = K;
  const P = root.JazPractice || req('./practice.js');
  const api = factory(K, P);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JazLearning = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (K, P) {
  'use strict';

  const scenarios = [
    { id: 'cinema', title: 'Киноға барамыз ба?', persona: 'Аян', icon: 'cinema', task: 'Досыңмен кездесу уақыты мен орнын келіс.', opening: 'Сәлем! Бүгін кешке боссың ба? Бірге киноға барсақ қайтеді? 🍿', suggestions: ['Салем! Кинога барамыз ба?', 'Сәлем! Иә, мен боспын.', 'Сағат жетіде кездесейік.'] },
    { id: 'teacher', title: 'Мұғалімге хабарлама', persona: 'Айгүл апай', icon: 'teacher', task: 'Тапсырма туралы сыпайы сұрақ қой.', opening: 'Сәлем! Тапсырма бойынша сұрағың бар ма? Қай жері түсініксіз екенін айта ғой.', suggestions: ['Сәлеметсіз бе! Сұрағым бар.', 'Тапсырманы түсіндіріп жібересіз бе?', 'Көмегіңізге рақмет!'] },
    { id: 'social', title: 'Суретке бір пікір', persona: 'Аружан', icon: 'social', task: 'Досыңның суретіне пікір жазып, әңгімеге қосыл.', opening: 'Бүгін тауға шықтым! Мына суретке қандай жазба жазсам болады? 📸', suggestions: ['Суретің өте әдемі!', 'Бугин күн жаксы екен.', 'Табиғат қандай әдемі!'] },
    { id: 'gaming', title: 'Командаға қосыл', persona: 'Данияр', icon: 'gaming', task: 'Командаласыңмен ойын уақытын келіс.', opening: 'Сәлем! Бүгін бірге ойнаймыз ба? Қай уақытта қосыла аласың? 🎮', suggestions: ['Сәлем! Бірге ойнайық.', 'Сағат сегізде қосыламын.', 'Сен не истеп жатсын?'] }
  ];

  // Lessons are the curriculum topics (same names as in the methodist analytics).
  // Questions are generated fresh for every run by JazPractice.
  const lessons = P.TOPICS.map(function (t) {
    return { id: t.id, subject: t.subject, topic: t.topic, title: t.kk, description: t.desc, xp: 20, duration: '3 минут', size: 5 };
  });

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
      social: value.includes('қай жер') ? 'Бұл - таудағы соқпақ. Келесі жолы бірге барайық па?' : 'Рақмет! Сен де табиғатта серуендегенді ұнатасың ба?',
      gaming: value.includes('сегізде') ? 'Келістік, сегізде күтемін! Қай ойынды таңдаймыз?' : 'Керемет! Қай уақытта қосыласың? Мен сегізде бос боламын.'
    };
    if (value === 'көріскенше' || value === 'сау бол' || value === 'сау болыңыз') return 'Көріскенше! Бүгінгі әңгімеге рақмет. 👋';
    if (value === 'рақмет' || value === 'рахмет') return 'Оқасы жоқ! Әңгімені жалғастырайық.';
    if (value.includes('не істеп жатырсың')) return scenarioId === 'gaming' ? 'Ойынға дайындалып отырмын. Бірге ойнаймыз ба?' : 'Бүгінгі кешті жоспарлап отырмын. Сен не істегің келеді?';
    return replies[scenarioId] || (turn % 2 ? 'Жақсы! Әңгімемізді жалғастырайық.' : 'Сәлем! Бүгінгі жоспарың қандай?');
  }

  // Offline assessment. The rules engine (JazKazakh) repairs Kazakh letters typed
  // with Russian ones, suffix harmony, the question particle, capital letters and
  // punctuation. Words it does not know are never marked wrong.
  function assessMessage(text, options) {
    options = options || {};
    const scenario = scenarioFor(options.scenarioId);
    const base = { kind: 'unverified', corrected: null, issues: [], reply: '', suggestedReplies: scenario.suggestions.slice(), verified: false, unknown: [] };
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
    const checked = K.check(text);
    // Only lexical/grammar issues ask the learner to rewrite; tiny style fixes alone do not.
    const real = checked.issues.filter(function (i) { return i.type !== 'case' && i.type !== 'punct' && i.type !== 'spacing'; });
    if (real.length) {
      return Object.assign(base, {
        kind: 'correction', corrected: checked.corrected, issues: checked.issues, verified: true,
        reply: 'Ойың түсінікті! Белгіленген сөздерді өзің түзетіп, хабарламаны қайта жіберіп көр.'
      });
    }
    const allowed = commonPhrases.concat(scenarioPhrases[scenario.id]);
    const turn = Number.isFinite(options.turn) ? options.turn : 0;
    if (allowed.includes(canonical) || (checked.total && checked.coverage >= 0.6)) {
      return Object.assign(base, {
        kind: 'recognized', verified: true, issues: checked.issues, corrected: checked.issues.length ? checked.corrected : null,
        reply: (checked.issues.length ? 'Жақсы жаздың! Кішкене кеңес: ' + checked.issues.map(function (i) { return i.reason; }).join(' ') + ' ' : '') + nextReply(scenario.id, text, turn),
        suggestedReplies: scenarioPhrases[scenario.id].slice(0, 3).map(function (value) { return value[0].toLocaleUpperCase('kk-KZ') + value.slice(1) + '.'; })
      });
    }
    const unknown = text.normalize('NFC').match(/[\p{L}-]+/gu).filter(function (w) { return K.analyse(w).status === 'unknown'; });
    const words = text.normalize('NFC').match(/[\p{L}-]+/gu) || [];
    if (words.length && !/[әғқңөұүһі]/iu.test(text) && unknown.length / words.length > 0.6) {
      return Object.assign(base, { unknown: unknown, reply: 'Бұл хабарлама орысша сияқты. Ойыңды қазақша жазып көр - қате болса, бірге түзетеміз.' });
    }
    return Object.assign(base, {
      unknown: unknown,
      reply: 'Бұл хабарламада мен тексере алмайтын сөздер бар (' + unknown.slice(0, 4).join(', ') + '). Оларды қате деп бағаламаймын. ' + nextReply(scenario.id, text, turn)
    });
  }

  // A rewrite is accepted when it matches the expected corrected text
  // (from the rules engine or from the server-side model).
  function verifyCorrection(original, candidate, expected) {
    if (typeof candidate !== 'string' || candidate.length > 500) return false;
    const target = typeof expected === 'string' && expected ? expected : (function () { const a = assessMessage(original); return a.kind === 'correction' ? a.corrected : null; })();
    return !!target && canonicalText(target) !== canonicalText(original) && canonicalText(candidate) === canonicalText(target);
  }

  // Combine a model's answer with the rules engine: the model may miss a rule
  // (e.g. plural harmony) or return ok=true while changing the text. The rules
  // engine re-checks the model's corrected text and adds what it still finds.
  function mergeAiCorrection(text, data) {
    const original = String(text || '');
    const reply = data && typeof data.reply === 'string' && data.reply ? data.reply : '';
    let corrected = data && typeof data.corrected === 'string' && data.corrected.trim() ? data.corrected.trim() : original;
    let issues = (data && Array.isArray(data.issues) ? data.issues : []).filter(function (i) { return i && typeof i.from === 'string' && typeof i.to === 'string' && i.from !== i.to; })
      .map(function (i) { return { from: i.from, to: i.to, reason: String(i.reason || '') }; });
    const extra = K.check(corrected);
    const real = extra.issues.filter(function (i) { return i.type !== 'case' && i.type !== 'punct' && i.type !== 'spacing'; });
    if (real.length) {
      corrected = extra.corrected;
      real.forEach(function (i) { if (!issues.some(function (x) { return x.from === i.from; })) issues.push({ from: i.from, to: i.to, reason: i.reason }); });
    }
    if (canonicalText(corrected) === canonicalText(original)) return { kind: 'recognized', reply: reply || 'Жақсы! Әңгімені жалғастырайық.', verified: true, source: 'ai' };
    // Every changed word gets an explanation: from the rules engine when it knows the word, otherwise a neutral hint.
    const strip = function (w) { return w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''); };
    const own = K.check(original).issues;
    const a = original.split(/\s+/u), b = corrected.split(/\s+/u);
    if (a.length === b.length) a.forEach(function (w, n) {
      const from = strip(w), to = strip(b[n]);
      if (!from || canonicalText(from) === canonicalText(to) || issues.some(function (x) { return canonicalText(x.from).indexOf(canonicalText(from)) >= 0; })) return;
      const known = own.find(function (i) { return canonicalText(i.from) === canonicalText(from); });
      issues.push({ from: from, to: to, reason: known ? known.reason : 'Түзетілген нұсқамен салыстыр.' });
    });
    if (!issues.length) issues.push({ from: original, to: corrected, reason: 'Түзетілген нұсқамен салыстыр.' });
    return { kind: 'correction', corrected: corrected, issues: issues.slice(0, 12), reply: reply, source: real.length ? 'ai+rules' : 'ai' };
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
      } else if (entry.type === 'game') {
        if (typeof entry.runId !== 'string' || entry.id !== 'game:' + entry.runId || !Number.isInteger(entry.xp) || entry.xp < 1 || entry.xp > 60) continue;
        events.push({ id: entry.id, type: 'game', runId: entry.runId, day: entry.day, xp: entry.xp, correct: Number(entry.correct) || 0 });
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
      if (event.type === 'message' && event.verified !== true && assessMessage(event.text, { scenarioId: event.scenarioId }).kind !== 'recognized') return state;
      if (event.type === 'correction' && !verifyCorrection(event.original, event.text, event.expected)) return state;
      const canonical = canonicalText(event.text);
      if (!canonical) return state;
      award = { id: 'practice:' + event.scenarioId + ':' + event.day + ':' + canonical, type: 'practice', scenarioId: event.scenarioId, text: canonical, day: event.day, xp: 10 };
    } else if (event.type === 'game') {
      const xp = P.runXp({ correct: event.correct });
      if (typeof event.runId !== 'string' || !event.runId || event.runId.length > 60 || !xp) return state;
      award = { id: 'game:' + event.runId, type: 'game', runId: event.runId, day: event.day, xp: xp, correct: event.correct };
    } else return state;
    if (state.events.some(function (entry) { return entry.id === award.id; })) return state;
    return sanitizeState({ events: state.events.concat(award) });
  }

  return { scenarios: scenarios, lessons: lessons, assessMessage: assessMessage, verifyCorrection: verifyCorrection, mergeAiCorrection: mergeAiCorrection, normalizeText: normalizeText, initialState: initialState, sanitizeState: sanitizeState, reduceProgress: reduceProgress, getStreak: getStreak };
});
