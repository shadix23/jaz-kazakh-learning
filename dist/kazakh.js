/*
 * Jaz! Kazakh rules engine (offline).
 * Vowel harmony, suffix selection, Russian-keyboard spelling repair and
 * sentence checks. Used by the chat mentor and by the practice generators.
 * Explanations are in Kazakh because they are shown to learners.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JazKazakh = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BACK = 'аоұыя';
  const FRONT = 'әөүіеэ';
  const VOWELS = 'аәоөұүыіеэиуюя';
  const SONORANT = 'лруй';
  const NASAL = 'мнң';
  const VOICED_FRIC = 'жз';

  const lower = s => String(s).normalize('NFC').toLocaleLowerCase('kk-KZ');
  const isVowel = ch => VOWELS.includes(ch);

  // Harmony is decided by the last unambiguous vowel (и, у, ю are neutral).
  function isBack(word) {
    const w = lower(word);
    for (let i = w.length - 1; i >= 0; i--) {
      if (BACK.includes(w[i])) return true;
      if (FRONT.includes(w[i])) return false;
    }
    return true;
  }
  function endClass(word) {
    const ch = lower(word).slice(-1);
    if (isVowel(ch)) return 'vowel';
    if (SONORANT.includes(ch)) return 'sonorant';
    if (NASAL.includes(ch)) return 'nasal';
    if (VOICED_FRIC.includes(ch)) return 'voiced';
    return 'voiceless';
  }
  const pick = (word, back, front) => isBack(word) ? back : front;

  /* ------------------------------------------------------- suffix rules */
  // Each rule returns the correct suffix for a stem and a short reason.
  const RULES = {
    plural: {
      name: 'көптік жалғау', variants: ['лар', 'лер', 'дар', 'дер', 'тар', 'тер'],
      get(stem) { const c = endClass(stem); const base = c === 'vowel' || c === 'sonorant' && stem.slice(-1) !== 'л' ? 'л' : c === 'nasal' || c === 'voiced' || stem.slice(-1) === 'л' ? 'д' : 'т'; return base + pick(stem, 'ар', 'ер'); },
      why: 'Дауыстыдан және р, у, й-дан кейін -лар/-лер; л, м, н, ң, ж, з-дан кейін -дар/-дер; қатаң дыбыстан кейін -тар/-тер.'
    },
    dative: {
      name: 'барыс септік', variants: ['ға', 'ге', 'қа', 'ке', 'га', 'ка'],
      get(stem) { return endClass(stem) === 'voiceless' ? pick(stem, 'қа', 'ке') : pick(stem, 'ға', 'ге'); },
      why: 'Қатаң дыбыстан кейін -қа/-ке, қалған жағдайда -ға/-ге. Жуан сөзге -ға/-қа, жіңішке сөзге -ге/-ке.'
    },
    locative: {
      name: 'жатыс септік', variants: ['да', 'де', 'та', 'те'],
      get(stem) { return endClass(stem) === 'voiceless' ? pick(stem, 'та', 'те') : pick(stem, 'да', 'де'); },
      why: 'Қатаң дыбыстан кейін -та/-те, қалған жағдайда -да/-де.'
    },
    ablative: {
      name: 'шығыс септік', variants: ['дан', 'ден', 'тан', 'тен', 'нан', 'нен'],
      get(stem) { const c = endClass(stem); return c === 'voiceless' ? pick(stem, 'тан', 'тен') : c === 'nasal' ? pick(stem, 'нан', 'нен') : pick(stem, 'дан', 'ден'); },
      why: 'М, н, ң-нан кейін -нан/-нен, қатаң дыбыстан кейін -тан/-тен, қалған жағдайда -дан/-ден.'
    },
    genitive: {
      name: 'ілік септік', variants: ['ның', 'нің', 'дың', 'дің', 'тың', 'тің'],
      get(stem) { const c = endClass(stem); return c === 'vowel' || c === 'nasal' ? pick(stem, 'ның', 'нің') : c === 'voiceless' ? pick(stem, 'тың', 'тің') : pick(stem, 'дың', 'дің'); },
      why: 'Дауыстыдан және м, н, ң-нан кейін -ның/-нің, қатаң дыбыстан кейін -тың/-тің, қалғанында -дың/-дің.'
    },
    accusative: {
      name: 'табыс септік', variants: ['ны', 'ні', 'ды', 'ді', 'ты', 'ті'],
      get(stem) { const c = endClass(stem); return c === 'vowel' ? pick(stem, 'ны', 'ні') : c === 'voiceless' ? pick(stem, 'ты', 'ті') : pick(stem, 'ды', 'ді'); },
      why: 'Дауыстыдан кейін -ны/-ні, қатаң дыбыстан кейін -ты/-ті, қалғанында -ды/-ді.'
    },
    instrumental: {
      name: 'көмектес септік', variants: ['мен', 'бен', 'пен'],
      get(stem) { const c = endClass(stem); return c === 'voiceless' ? 'пен' : c === 'voiced' ? 'бен' : 'мен'; },
      why: 'Дауыстыдан және л, р, у, й, м, н, ң-нан кейін -мен, ж, з-дан кейін -бен, қатаң дыбыстан кейін -пен.'
    }
  };
  // Question particle: written separately.
  function particle(prev) {
    const c = endClass(prev);
    return c === 'vowel' || c === 'sonorant' ? pick(prev, 'ма', 'ме') : c === 'nasal' || c === 'voiced' ? pick(prev, 'ба', 'бе') : pick(prev, 'па', 'пе');
  }
  const PARTICLES = ['ма', 'ме', 'ба', 'бе', 'па', 'пе'];
  const PARTICLE_WHY = 'Сұраулық шылау бөлек жазылады: дауыстыдан және л, р, у, й-дан кейін ма/ме, м, н, ң, ж, з-дан кейін ба/бе, қатаң дыбыстан кейін па/пе.';

  // Possessive forms soften a final п/к/қ before a vowel: кітап → кітабым.
  function voiceStem(stem) {
    const last = stem.slice(-1);
    const map = { 'п': 'б', 'к': 'г', 'қ': 'ғ' };
    return map[last] ? stem.slice(0, -1) + map[last] : stem;
  }
  function possessive(stem, person) {
    const vowel = isVowel(lower(stem).slice(-1)) && !/[уи]$/u.test(lower(stem));
    if (person === 1) return vowel ? stem + 'м' : voiceStem(stem) + pick(stem, 'ым', 'ім');
    if (person === 2) return vowel ? stem + 'ң' : voiceStem(stem) + pick(stem, 'ың', 'ің');
    return vowel ? stem + pick(stem, 'сы', 'сі') : voiceStem(stem) + pick(stem, 'ы', 'і');
  }
  function plural(stem) { return stem + RULES.plural.get(stem); }
  function dative(stem) { return stem + RULES.dative.get(stem); }

  /* --------------------------------------------------------- dictionary */
  // Common correct word forms for school chat practice (stems and frequent forms).
  const WORDS = (`
сәлем сәлеметсіз сәлеметсің салам қалайсың қалайсыз қалай жақсы жақсымын өте өзің өзіңіз рақмет рахмет иә жоқ әрине
келістік көріскенше сау бол болыңыз болсын кеш кешке кешір кешіріңіз ертең бүгін кеше қазір сосын кейін ерте таңертең түсте түнде
мен сен сіз ол біз сендер сіздер олар менің сенің сіздің оның біздің олардың маған саған сізге оған бізге мені сені оны бізді
мында онда қайда қайдан қашан неге неліктен не кім қандай қанша неше қалай қайсы қай бұл осы сол анау мынау
бар жоқ емес иә керек мүмкін болады болмайды дайын дайынмын бос боспын бос емеспін жұмыстамын үйдемін мектептемін сабақтамын
бару барамын барасың барасыз барады барамыз барайық бардым бардың барды бардық барғым барғың
келу келемін келесің келесіз келеді келеміз келейік келдім келдің келді келдік келші келіңіз
кездесу кездесеміз кездесейік кездестік көру көремін көресің көреді көреміз көрейік көрдім көрдің көрді көрдік
ойнау ойнаймын ойнайсың ойнайды ойнаймыз ойнайық ойнадым ойнадық ойын ойынды ойынға ойнайтын
оқу оқимын оқисың оқиды оқимыз оқыдым оқыдың оқыды жазу жазамын жазасың жазады жазамыз жаздым жаздың жазды жазып
істеу істеймін істейсің істейді істеп жатырмын жатырсың жатыр жатырмыз жатырсыз отырмын отырсың отыр
түсіну түсінемін түсінбедім түсіндім түсіндіріп түсіндіріңізші түсіндіресіз жіберу жіберемін жіберші жібересіз жібердім
білу білемін білесің біледі білмеймін сұрау сұраймын сұрағым сұрақ сұрағым сұрақтар жауап жауабы көмек көмектес көмектесемін көмектесіңізші
сөйлесу сөйлесейік айту айтамын айтшы айтыңызшы тыңдау тыңдаймын қарау қараймын қарашы күту күтемін күтемін күтем күтейін
ұнайды ұнады ұнайды ұнатамын қалаймын қалайсың келеді жүр жүрміз жүрейік тұрамын тұрасың тұрады
мектеп сынып сабақ мұғалім мұғалімге оқушы кітап дәптер қалам үй тапсырма тапсырманы тапсырмаға емтихан бақылау жұмыс сабақтан
кино кинотеатр фильм комедия саябақ дүкен кафе қала ауыл көше аула спорт футбол доп команда командаға клуб
дос досым досың достар достарым ата апа ана әке аға әпке іні сіңлі бауыр отбасы бала балалар адам адамдар
сурет суретің суретім әдемі керемет тамаша жақсы жаман үлкен кішкентай жаңа ескі әдемі ыстық суық жылы таза
табиғат тау өзен көл орман ауа күн ай жұлдыз жер су гүл ағаш жол
сағат минут күн апта ай жыл уақыт бірінші екінші біреу бір екі үш төрт бес алты жеті сегіз тоғыз он жүз мың
сегізде жетіде алтыда бесте тоғызда онда
тамақ нан сүт шай кофе алма ет
телефон компьютер интернет хабарлама хат чат видео ойыншы
қазақ қазақша тіл қазақ тілі орысша ағылшынша сөз сөйлем әріп дыбыс
жарайды жарайсың жарайсыз құттықтаймын туған тойың құтты болсын
және мен бен пен да де та те бірге тағы әлі енді тек барлығы бәрі көп аз өте тым
алдында артында қасында ішінде үстінде астында
боламын боласың болады боламыз болдым болды
жаңалық сапар демалыс мереке қонақ
кітабым кітабың кітабы мектебім мектебің мектебі сыныбым сыныбымыз үйім үйің үйі досымыз
таң жаңа мың оң сең кең тең теңіз аңыз қоңыр
`).split(/\s+/).filter(Boolean);
  const DICT = new Set(WORDS.map(lower));
  // Words learners often type with Russian letters; the key is the misspelling.
  const LETTER_NAMES = { 'ә': 'ә', 'қ': 'қ', 'ғ': 'ғ', 'ң': 'ң', 'ө': 'ө', 'ұ': 'ұ', 'ү': 'ү', 'і': 'і', 'һ': 'һ' };
  const SUBS = { 'а': ['ә'], 'к': ['қ'], 'г': ['ғ'], 'н': ['ң'], 'о': ['ө'], 'у': ['ұ', 'ү'], 'и': ['і'], 'х': ['һ', 'қ'], 'ы': ['і'], 'э': ['е'] };

  function letterVariants(word, limit) {
    const w = lower(word);
    const idx = [];
    for (let i = 0; i < w.length; i++) if (SUBS[w[i]]) idx.push(i);
    const out = new Set();
    const max = Math.min(idx.length, 4);
    // Try 1..3 substitutions (enough for real learner typos), breadth-first.
    function rec(start, cur, depth) {
      if (out.size > (limit || 400)) return;
      if (depth) out.add(cur);
      if (depth >= 3) return;
      for (let k = start; k < idx.length && k < start + max + 4; k++) {
        const i = idx[k];
        for (const s of SUBS[w[i]]) rec(k + 1, cur.slice(0, i) + s + cur.slice(i + 1), depth + 1);
      }
    }
    rec(0, w, 0);
    return [...out];
  }

  function diffLetters(a, b) {
    const res = [];
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i] && LETTER_NAMES[b[i]]) res.push(b[i]);
    return [...new Set(res)];
  }

  // Analyse one word: is it known? If not, can we repair letters and/or the suffix?
  const END_DESC = { vowel: () => 'дауысты дыбысқа', sonorant: w => `«${w.slice(-1)}» үнді дыбысына`, nasal: w => `«${w.slice(-1)}» мұрын жолды дыбысқа`, voiced: w => `«${w.slice(-1)}» ұяң дыбысқа`, voiceless: w => `«${w.slice(-1)}» қатаң дыбысқа` };
  const SUFFIX_KEYS = ['plural', 'ablative', 'genitive', 'accusative', 'dative', 'locative', 'instrumental'];
  function analyse(word) {
    const w = lower(word);
    if (w.length < 2 || DICT.has(w) || /[^а-яәғқңөұүһіё-]/u.test(w)) return { status: DICT.has(w) ? 'known' : 'unknown' };
    // 1. Suffix family with a known stem.
    for (const key of SUFFIX_KEYS) {
      const rule = RULES[key];
      for (const v of rule.variants.slice().sort((a, b) => b.length - a.length)) {
        if (!w.endsWith(v) || w.length - v.length < 2) continue;
        const stem = w.slice(0, -v.length);
        for (const s of [stem].concat(letterVariants(stem, 120))) {
          if (!DICT.has(s)) continue;
          const expected = rule.get(s);
          const fixed = s + expected;
          if (fixed === w) return { status: 'known' };
          const letters = s !== stem ? diffLetters(stem, s) : [];
          return { status: 'fix', to: fixed, kind: expected !== v ? 'suffix' : 'letters', reason: expected !== v
            ? `«${s}» — ${isBack(s) ? 'жуан' : 'жіңішке'} сөз, ${END_DESC[endClass(s)](s)} аяқталады, сондықтан ${rule.name} жалғауы -${expected}: ${fixed}.`
            : `«${s}» сөзінде ${letters.join(', ')} әрпі жазылады.` };
        }
      }
    }
    // 2. Possessive written without softening: кітапым → кітабым.
    for (const [end, person] of [['ым', 1], ['ім', 1], ['ың', 2], ['ің', 2], ['ы', 3], ['і', 3]]) {
      if (!w.endsWith(end)) continue;
      const stem = w.slice(0, -end.length);
      if (DICT.has(stem) && /[пкқ]$/u.test(stem)) {
        const fixed = possessive(stem, person);
        if (fixed !== w) return { status: 'fix', to: fixed, kind: 'suffix', reason: `Тәуелдік жалғауы жалғанғанда соңғы ${stem.slice(-1)} дыбысы ұяңданады: ${fixed}.` };
      }
    }
    // 3. Question particle glued to a known word: кездесемізбе → кездесеміз бе.
    for (const p of PARTICLES) {
      if (!w.endsWith(p)) continue;
      const head = w.slice(0, -2);
      if (DICT.has(head)) return { status: 'fix', to: head + ' ' + particle(head), kind: 'particle', reason: PARTICLE_WHY };
    }
    // 4. Whole-word letter repair.
    const hits = letterVariants(w).filter(v => DICT.has(v));
    if (hits.length) {
      const best = hits.sort((a, b) => diffLetters(w, a).length - diffLetters(w, b).length)[0];
      return { status: 'fix', to: best, kind: 'letters', reason: `«${best}» сөзінде ${diffLetters(w, best).join(', ')} әрпі жазылады. Орыс әрпі емес, қазақ әрпін таңда.` };
    }
    return { status: 'unknown' };
  }

  function keepCase(src, dst) {
    if (src.length > 1 && src === src.toLocaleUpperCase('kk-KZ')) return dst.toLocaleUpperCase('kk-KZ');
    if (src[0] && src[0] === src[0].toLocaleUpperCase('kk-KZ') && src[0] !== src[0].toLocaleLowerCase('kk-KZ')) return dst[0].toLocaleUpperCase('kk-KZ') + dst.slice(1);
    return dst;
  }

  const PHRASES = [
    [/(?<=сен не (?:істеп|истеп) )жат(?:сын|сың|сн)(?=[\s?.!]|$)/giu, 'жатырсың', '«Сен не істеп жатырсың?» сұрағында екінші жақ тұлғасы — жатырсың.'],
    [/(?<=мен не (?:істеп|истеп) )жат(?:сын|сың)(?=[\s?.!]|$)/giu, 'жатырмын', 'Бірінші жақта: мен ... жатырмын.'],
    [/боватр енд/giu, 'болып жатыр енді', 'Толық жазылуы: «болып жатыр енді».']
  ];
  const QUESTION_WORDS = ['қайда', 'қайдан', 'қашан', 'неге', 'неліктен', 'не', 'кім', 'қандай', 'қанша', 'неше', 'қалай', 'қайсы', 'қалайсың', 'қалайсыз'];

  // Check a whole message. Returns the corrected text, issues and coverage.
  function check(text) {
    const source = String(text || '').normalize('NFC');
    const issues = [];
    let known = 0, total = 0;
    // Phrase-level fixes that need context (a word can be valid elsewhere).
    let pre = source;
    for (const [re, to, reason] of PHRASES) pre = pre.replace(re, (m) => { issues.push({ from: m, to: keepCase(m, to), reason, type: 'grammar' }); return keepCase(m, to); });
    // Word-level pass.
    let out = pre.replace(/[\p{L}-]+/gu, word => {
      if (!/[а-яәғқңөұүһі]/iu.test(word)) return word;
      total++;
      const r = analyse(word);
      if (r.status === 'known') { known++; return word; }
      if (r.status === 'fix') { known++; const to = keepCase(word, r.to); issues.push({ from: word, to, reason: r.reason, type: r.kind }); return to; }
      return word;
    });
    // Separate particle with wrong harmony: келесің ба → келесің бе.
    out = out.replace(/([\p{L}]+)(\s+)(ма|ме|ба|бе|па|пе)(?=[\s?.!,]|$)/giu, (m, prev, sp, p) => {
      const expected = particle(prev);
      if (lower(p) === expected) return m;
      issues.push({ from: `${prev} ${p}`, to: `${prev} ${expected}`, reason: PARTICLE_WHY, type: 'particle' });
      return prev + sp + expected;
    });
    // Sentence-level: spacing, capital letter, question mark.
    const tidy = out.replace(/\s+([,.!?])/gu, '$1').replace(/\s{2,}/gu, ' ').trim();
    if (tidy !== out.trim()) issues.push({ from: 'бос орын', to: 'бір бос орын', reason: 'Тыныс белгісінің алдына бос орын қойылмайды, сөздер арасында бір ғана бос орын болады.', type: 'spacing' });
    out = tidy;
    const words = lower(out).replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    const isQuestion = words.some(x => PARTICLES.includes(x)) || QUESTION_WORDS.includes(words[0]) || words.some(x => ['қайда', 'қайдан', 'қашан', 'неге', 'не', 'кім', 'қандай', 'қанша', 'неше', 'қалайсың', 'қалайсыз'].includes(x));
    if (isQuestion && out && !/[?]$/u.test(out)) {
      out = out.replace(/[.!]?$/u, '?');
      issues.push({ from: 'тыныс белгісі', to: '?', reason: 'Сұраулы сөйлемнің соңына сұрақ белгісі қойылады.', type: 'punct' });
    }
    if (out && /^\p{Ll}/u.test(out) && total > 1) {
      const first = out.split(/\s+/)[0].replace(/[^\p{L}-]/gu, '');
      out = out[0].toLocaleUpperCase('kk-KZ') + out.slice(1);
      issues.push({ from: first, to: first[0].toLocaleUpperCase('kk-KZ') + first.slice(1), reason: 'Сөйлем бас әріппен басталады.', type: 'case' });
    }
    // Capital letter after a sentence end inside the message.
    const afterStop = out.replace(/([.!?]\s+)(\p{Ll})/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase('kk-KZ'));
    if (afterStop !== out) { issues.push({ from: 'кіші әріп', to: 'бас әріп', reason: 'Нүкте, леп не сұрақ белгісінен кейін жаңа сөйлем бас әріппен басталады.', type: 'case' }); out = afterStop; }
    return { corrected: out, issues, known, total, coverage: total ? known / total : 0 };
  }

  return { isBack, endClass, particle, possessive, plural, dative, RULES, DICT, analyse, check, letterVariants, voiceStem, lower };
});
