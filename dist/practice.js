/*
 * Jaz! Practice bank: generated items for the 12 curriculum topics.
 * Topic names (ru) match the methodist analytics exactly, so every learner
 * answer lands in the right row. Learner-facing text is Kazakh.
 * Every item: { id, subject, topic, topicKk, prompt, options[3], answer, explanation }.
 */
(function (root, factory) {
  const api = factory(root.JazKazakh || (typeof require === 'function' ? require('./kazakh.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JazPractice = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (K) {
  'use strict';

  const MATH = 'Математика', KAZ = 'Казахский язык';
  const minus = '−';
  const num = n => {
    const r = Math.round(n * 100) / 100;
    const s = Math.abs(r).toLocaleString('ru-RU', { maximumFractionDigits: 2 }).replace(/ /g, ' ');
    return (r < 0 ? minus : '') + s;
  };
  const paren = n => n < 0 ? `(${num(n)})` : num(n);
  const int = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
  const choice = (rand, list) => list[Math.floor(rand() * list.length)];
  function shuffle(rand, list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // Build an item from a correct answer and distractors; guarantees 3 distinct options.
  function item(rand, base, correct, wrong, fill) {
    const opts = [String(correct)];
    for (const w of wrong.concat(fill || [])) { const s = String(w); if (!opts.includes(s) && opts.length < 3) opts.push(s); }
    let guard = 0;
    while (opts.length < 3 && guard++ < 20) { const extra = String(fill && fill.length ? fill[guard % fill.length] + '' + guard : correct + guard); if (!opts.includes(extra)) opts.push(extra); }
    const options = shuffle(rand, opts);
    return { ...base, options, answer: options.indexOf(String(correct)) };
  }

  /* ---------------------------------------------------------------- math */
  const MATH_TOPICS = [
    { id: 'm-prop', topic: 'Отношения и пропорции', kk: 'Қатынас және пропорция', desc: 'Пропорция, бағасы, кері пропорция.', gen: [
      rand => { const x = int(rand, 2, 12), k = int(rand, 2, 5), a = int(rand, 2, 9); const c = a * k, d = x * k;
        return item(rand, { prompt: `${a} : x = ${c} : ${d}. x = ?`, explanation: `Пропорцияда шеткі мүшелердің көбейтіндісі ортаңғы мүшелердің көбейтіндісіне тең: ${a} · ${d} = x · ${c}, сондықтан x = ${a * d} : ${c} = ${x}.` }, x, [x * k, x + k, d - a]); },
      rand => { const q = int(rand, 5, 30) * 10, n = int(rand, 2, 6); let m = int(rand, 2, 9); if (m === n) m++; const p = n * q;
        return item(rand, { prompt: `${n} дәптер ${p} теңге тұрады. ${m} дәптер қанша тұрады?`, explanation: `Алдымен бір дәптердің бағасы: ${p} : ${n} = ${q} тг. Тура пропорция: ${m} · ${q} = ${m * q} тг.` }, `${m * q} тг`, [`${Math.round(p * n / m)} тг`, `${p + m} тг`, `${m * q + q} тг`]); },
      rand => { const w = choice(rand, [2, 3, 4, 6]), d = choice(rand, [4, 6, 8, 12]), total = w * d; const w2 = choice(rand, [2, 3, 4, 6, 8, 12].filter(v => v !== w && total % v === 0));
        return item(rand, { prompt: `${w} жұмысшы жұмысты ${d} күнде бітіреді. ${w2} жұмысшы неше күнде бітіреді?`, explanation: `Жұмысшы көбейсе, уақыт азаяды — бұл кері пропорция: ${w} · ${d} = ${w2} · x, x = ${total} : ${w2} = ${total / w2}.` }, total / w2, [d * w2 / w, d + (w2 - w), d], [d + 1]); }
    ] },
    { id: 'm-circle', topic: 'Окружность, круг и масштаб', kk: 'Шеңбер, дөңгелек, масштаб', desc: 'Шеңбер ұзындығы, дөңгелек ауданы, масштаб.', gen: [
      rand => { const r = int(rand, 2, 9);
        return item(rand, { prompt: `Радиусы r = ${r} см шеңбердің ұзындығы (π ≈ 3,14)?`, explanation: `Шеңбер ұзындығы C = 2πr = 2 · 3,14 · ${r} = ${num(2 * 3.14 * r)} см. πr — бұл жарты шеңбер ғана.` }, `${num(2 * 3.14 * r)} см`, [`${num(3.14 * r)} см`, `${num(3.14 * r * r)} см`]); },
      rand => { const r = int(rand, 2, 9);
        return item(rand, { prompt: `Радиусы r = ${r} см дөңгелектің ауданы (π ≈ 3,14)?`, explanation: `Дөңгелек ауданы S = πr² = 3,14 · ${r}² = ${num(3.14 * r * r)} см². 2πr — шеңбердің ұзындығы, аудан емес.` }, `${num(3.14 * r * r)} см²`, [`${num(2 * 3.14 * r)} см²`, `${num(3.14 * 2 * r)} см`, `${num(3.14 * r)} см²`]); },
      rand => { const r = int(rand, 2, 15), d = 2 * r;
        return item(rand, { prompt: `Шеңбердің диаметрі ${d} см. Радиусы неше см?`, explanation: `Радиус — диаметрдің жартысы: r = d : 2 = ${d} : 2 = ${r} см.` }, `${r} см`, [`${2 * d} см`, `${d} см`]); },
      rand => { const k = choice(rand, [100000, 200000, 500000, 1000000]), n = int(rand, 2, 9), km = n * k / 100000;
        return item(rand, { prompt: `Масштаб 1 : ${k.toLocaleString('ru-RU').replace(/ /g, ' ')}. Картадағы ${n} см жерде неше км?`, explanation: `Картадағы 1 см жерде ${k.toLocaleString('ru-RU').replace(/ /g, ' ')} см = ${k / 100000} км. Онда ${n} см → ${n} · ${k / 100000} = ${num(km)} км.` }, `${num(km)} км`, [`${num(km * 10)} км`, `${num(km / 10)} км`]); }
    ] },
    { id: 'm-signed', topic: 'Положительные и отрицательные числа', kk: 'Оң және теріс сандар', desc: 'Салыстыру, қарама-қарсы сан, температура.', gen: [
      rand => { const a = int(rand, 1, 9); let b = int(rand, 1, 9); if (b === a) b = a + 1; const big = -Math.min(a, b);
        return item(rand, { prompt: `Қай сан үлкен: ${num(-a)} әлде ${num(-b)}?`, explanation: `Сан түзуінде оңға қарай сандар үлкейеді. ${num(big)} нөлге жақын, сондықтан ол үлкен.` }, num(big), [num(-Math.max(a, b)), 'Олар тең']); },
      rand => { const n = int(rand, 2, 30) * (rand() < 0.5 ? -1 : 1);
        return item(rand, { prompt: `${num(n)} санына қарама-қарсы сан?`, explanation: `Қарама-қарсы сандар нөлден бірдей қашықтықта, бірақ таңбасы әртүрлі: ${num(n)} пен ${num(-n)}.` }, num(-n), [num(n), `1/${Math.abs(n)}`]); },
      rand => { const t = -int(rand, 1, 9), r = int(rand, 2, 12);
        return item(rand, { prompt: `Таңертең ${num(t)}° болды, күндіз ${r}° жылыды. Неше градус болды?`, explanation: `Жылыса, температура артады: ${num(t)} + ${r} = ${num(t + r)}°.` }, `${num(t + r)}°`, [`${num(t - r)}°`, `${num(-(t + r))}°`, `${num(r)}°`]); }
    ] },
    { id: 'm-abs', topic: 'Модуль числа', kk: 'Санның модулі', desc: 'Модуль, |x| = a теңдеуі, қашықтық.', gen: [
      rand => { const a = int(rand, 2, 40);
        return item(rand, { prompt: `|${num(-a)}| = ?`, explanation: `Модуль — санның нөлге дейінгі қашықтығы, ол теріс болмайды: |${num(-a)}| = ${a}.` }, num(a), [num(-a), '0']); },
      rand => { const c = int(rand, 2, 20);
        return item(rand, { prompt: `|x| = ${c} теңдеуінің шешімі?`, explanation: `Нөлден ${c} бірлік қашықтықта екі сан бар: ${c} және ${num(-c)}.` }, `${c} және ${num(-c)}`, [`${c}`, `${num(-c)}`]); },
      rand => { const a = int(rand, 2, 15), b = int(rand, 2, 15);
        return item(rand, { prompt: `|${num(-a)}| + |${b}| = ?`, explanation: `Алдымен модульдер: |${num(-a)}| = ${a}, |${b}| = ${b}. Қосындысы ${a + b}.` }, num(a + b), [num(b - a === a + b ? b + 1 : b - a), num(-(a + b))]); },
      rand => { const a = int(rand, 1, 9), b = int(rand, 1, 9);
        return item(rand, { prompt: `Сан түзуіндегі ${num(-a)} және ${b} нүктелерінің арақашықтығы?`, explanation: `Арақашықтық = |${b} − (${num(-a)})| = |${b} + ${a}| = ${a + b}.` }, num(a + b), [num(Math.abs(b - a) || a + b + 2), num(-(a + b))]); }
    ] },
    { id: 'm-addsub', topic: 'Сложение и вычитание рациональных чисел', kk: 'Рационал сандарды қосу және азайту', desc: 'Таңбалары әртүрлі сандарды қосу, азайту.', gen: [
      rand => { const a = int(rand, 2, 19); let b = int(rand, 1, 19); if (b === a) b++;
        return item(rand, { prompt: `${num(-a)} + ${b} = ?`, explanation: `Таңбалары әртүрлі: модульдері үлкенінен кішісін азайтамыз (${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(b - a)}) және модулі үлкен санның таңбасын қоямыз: ${num(b - a)}.` }, num(b - a), [num(-(a + b)), num(a - b), num(a + b)]); },
      rand => { const a = int(rand, 2, 15); let b = int(rand, 2, 15); if (b === a) b++;
        return item(rand, { prompt: `${num(-a)} − ${paren(-b)} = ?`, explanation: `Теріс санды азайту — оған қарама-қарсы санды қосу: ${num(-a)} − ${paren(-b)} = ${num(-a)} + ${b} = ${num(b - a)}.` }, num(b - a), [num(-a - b), num(a + b), num(a - b)]); },
      rand => { const a = int(rand, 1, 12), b = a + int(rand, 1, 12);
        return item(rand, { prompt: `${a} − ${b} = ?`, explanation: `Кішіден үлкенді азайтсақ, нәтиже теріс: ${a} − ${b} = ${num(a - b)}.` }, num(a - b), [num(b - a), num(a + b)]); },
      rand => { const a = int(rand, 1, 12), b = int(rand, 1, 12);
        return item(rand, { prompt: `${num(-a)} + ${paren(-b)} = ?`, explanation: `Екі теріс санды қосқанда модульдерді қосып, минус қоямыз: ${num(-(a + b))}.` }, num(-(a + b)), [num(a + b), num(b - a || a + 1), num(a - b || -1)]); }
    ] },
    { id: 'm-muldiv', topic: 'Умножение и деление рациональных чисел', kk: 'Рационал сандарды көбейту және бөлу', desc: 'Таңба ережесі, дәреже.', gen: [
      rand => { const a = int(rand, 2, 12), b = int(rand, 2, 12);
        return item(rand, { prompt: `${paren(-a)} · ${paren(-b)} = ?`, explanation: `Таңбалары бірдей сандардың көбейтіндісі оң: ${a} · ${b} = ${a * b}.` }, num(a * b), [num(-a * b), num(-(a + b))]); },
      rand => { const a = int(rand, 2, 12), b = int(rand, 2, 9);
        return item(rand, { prompt: `${paren(-a * b)} : ${b} = ?`, explanation: `Таңбалары әртүрлі сандарды бөлгенде нәтиже теріс: ${a * b} : ${b} = ${a}, таңбасы минус → ${num(-a)}.` }, num(-a), [num(a), num(-a * b + b)]); },
      rand => { const a = int(rand, 2, 5), n = choice(rand, [2, 3]); const v = Math.pow(-a, n);
        return item(rand, { prompt: `${paren(-a)}${n === 2 ? '²' : '³'} = ?`, explanation: `Теріс санның ${n === 2 ? 'жұп' : 'тақ'} дәрежесі ${n === 2 ? 'оң' : 'теріс'}: ${paren(-a)}${n === 2 ? '²' : '³'} = ${num(v)}.` }, num(v), [num(-v), num(-a * n)]); },
      rand => { const k = int(rand, 2, 6);
        return item(rand, { prompt: `${k} теріс санның көбейтіндісінің таңбасы қандай?`, explanation: `Әр жұп теріс көбейткіш оң береді. ${k} — ${k % 2 ? 'тақ' : 'жұп'} сан, сондықтан таңба ${k % 2 ? 'минус' : 'плюс'}.` }, k % 2 ? 'Минус' : 'Плюс', [k % 2 ? 'Плюс' : 'Минус', 'Нөл болады']); }
    ] }
  ];

  /* -------------------------------------------------------------- kazakh */
  const RUS = { 'ә': 'а', 'қ': 'к', 'ғ': 'г', 'ң': 'н', 'ө': 'о', 'ұ': 'у', 'ү': 'у', 'і': 'и', 'һ': 'х' };
  const russify = (w, all) => { let done = false; return [...w].map(ch => { if (RUS[ch] && (all || !done)) { done = true; return RUS[ch]; } return ch; }).join(''); };
  const LETTER_WORDS = [['сәлем', 'привет'], ['жақсы', 'хорошо'], ['білім', 'знание'], ['мұғалім', 'учитель'], ['қала', 'город'], ['бүгін', 'сегодня'], ['көше', 'улица'], ['өзен', 'река'], ['сұрақ', 'вопрос'], ['үй', 'дом'], ['қыз', 'девочка'], ['ағаш', 'дерево'], ['гүл', 'цветок'], ['әке', 'отец'], ['көл', 'озеро'], ['тағы', 'ещё'], ['құс', 'птица'], ['өмір', 'жизнь'], ['әдемі', 'красивый'], ['қазақ', 'казах']];
  const NG_WORDS = [['жаңа', 'новый'], ['таң', 'утро'], ['мың', 'тысяча'], ['оң', 'правый'], ['теңіз', 'море'], ['қоңыр', 'коричневый'], ['аңыз', 'легенда'], ['сенің', 'твой'], ['менің', 'мой'], ['жаңбыр', 'дождь'], ['кең', 'широкий'], ['келдің', 'ты пришёл'], ['барасың', 'ты идёшь'], ['оңтүстік', 'юг']];
  const NOUNS = [['мектеп', 'школа'], ['кино', 'кино'], ['саябақ', 'парк'], ['үй', 'дом'], ['дүкен', 'магазин'], ['қала', 'город'], ['ауыл', 'село'], ['көл', 'озеро'], ['тау', 'гора'], ['өзен', 'река'], ['кітап', 'книга'], ['дәптер', 'тетрадь'], ['қалам', 'ручка'], ['бала', 'ребёнок'], ['гүл', 'цветок'], ['күн', 'день'], ['дос', 'друг'], ['сынып', 'класс'], ['көше', 'улица'], ['телефон', 'телефон'], ['ат', 'лошадь'], ['қыз', 'девочка']];
  const PREDICATES = ['келесің', 'барасың', 'оқыдың', 'дайынсың', 'кітап', 'мектепте', 'бос', 'жақсы', 'ойнаймыз', 'көрдің', 'түсіндің', 'дос', 'сабақ', 'телефон', 'үйде', 'қазір', 'бірге', 'ертең', 'келеді', 'бітті'];
  const whyEnd = w => { const c = K.endClass(w); return { vowel: 'дауысты дыбысқа', sonorant: `«${w.slice(-1)}» үнді дыбысына`, nasal: `«${w.slice(-1)}» мұрын жолды дыбысқа`, voiced: `«${w.slice(-1)}» ұяң дыбысқа`, voiceless: `«${w.slice(-1)}» қатаң дыбысқа` }[c]; };
  const harmonyWord = w => K.isBack(w) ? 'жуан' : 'жіңішке';

  const KAZ_TOPICS = [
    { id: 'letters', topic: 'Особые буквы: Ә, Ғ, Қ, Ң, Ө, Ұ, Ү, І', kk: 'Ерекше әріптер', desc: 'Ә, Ғ, Қ, Ң, Ө, Ұ, Ү, І әріптерін орнымен жаз.', gen: [
      rand => { const [w, ru] = choice(rand, LETTER_WORDS); const kz = [...w].filter(ch => RUS[ch]);
        const ALT = { 'ә': 'э', 'қ': 'х', 'ғ': 'х', 'ң': 'нг', 'ө': 'е', 'ұ': 'ү', 'ү': 'ұ', 'і': 'ы', 'һ': 'г' };
        const alt = [...w].map(ch => ALT[ch] || ch).join('');
        return item(rand, { prompt: `Дұрыс жазылуын таңда: «${ru}»`, explanation: `«${w}» сөзінде ${[...new Set(kz)].join(', ')} әрпі жазылады. Орыс әрпі (${[...new Set(kz.map(c => RUS[c]))].join(', ')}) басқа дыбысты білдіреді.` }, w, [russify(w, true), alt, russify(w, false)]); }
    ] },
    { id: 'ng', topic: 'Звуки Н и Ң', kk: 'Н мен Ң', desc: 'Н мен Ң айырмасын байқап, дұрыс жаз.', gen: [
      rand => { const [w, ru] = choice(rand, NG_WORDS);
        return item(rand, { prompt: `Дұрыс жазылуын таңда: «${ru}»`, explanation: `«${w}» сөзінде мұрын жолды ң дыбысы бар, ол ң әрпімен жазылады. «н» мен «нг» — басқа дыбыстар.` }, w, [w.replace(/ң/g, 'н'), w.replace(/ң/g, 'нг'), russify(w, true)]); }
    ] },
    { id: 'questions', topic: 'Вопросительные частицы ма/ме, ба/бе, па/пе', kk: 'Сұраулық шылау', desc: 'Ма/ме, ба/бе, па/пе: дұрысын таңдап, бөлек жаз.', gen: [
      rand => { const w = choice(rand, PREDICATES); const ok = K.particle(w);
        const others = ['ма', 'ме', 'ба', 'бе', 'па', 'пе'].filter(p => p !== ok);
        const sameHarm = others.filter(p => (p.endsWith('а')) === ok.endsWith('а'));
        const oppHarm = others.filter(p => (p.endsWith('а')) !== ok.endsWith('а') && p[0] === ok[0]);
        return item(rand, { prompt: `«${w[0].toLocaleUpperCase('kk-KZ') + w.slice(1)} ___?» — қай шылау?`, explanation: `«${w}» сөзі ${whyEnd(w)} аяқталады және ${harmonyWord(w)}, сондықтан «${ok}». Шылау бөлек жазылады: ${w} ${ok}?` }, ok, [choice(rand, sameHarm), oppHarm[0] || others[0]], others); }
    ] },
    { id: 'endings', topic: 'Окончания направления -ға/-ге/-қа/-ке', kk: 'Барыс септік жалғауы', desc: 'Киноға, мектепке, саябаққа: жалғауды дұрыс таңда.', gen: [
      rand => { const [w, ru] = choice(rand, NOUNS); const ok = K.RULES.dative.get(w);
        const all = ['ға', 'ге', 'қа', 'ке'].filter(x => x !== ok);
        return item(rand, { prompt: `${w[0].toLocaleUpperCase('kk-KZ') + w.slice(1)}___ барамын (${ru})`, explanation: `«${w}» — ${harmonyWord(w)} сөз, ${whyEnd(w)} аяқталады, сондықтан -${ok}: ${w}${ok}.` }, '-' + ok, shuffle(rand, all).map(x => '-' + x)); }
    ] },
    { id: 'harmony', topic: 'Закон сингармонизма', kk: 'Үндестік заңы', desc: 'Жуан сөзге жуан, жіңішке сөзге жіңішке жалғау.', gen: [
      rand => { const [w, ru] = choice(rand, NOUNS); const ok = K.plural(w); const suf = ok.slice(w.length);
        const flipH = suf.replace(/а/, 'Е').replace(/е/, 'а').replace('Е', 'е');
        const flipC = (suf[0] === 'л' ? 'д' : suf[0] === 'д' ? 'т' : 'л') + suf.slice(1);
        return item(rand, { prompt: `«${w}» (${ru}) көпше түрде:`, explanation: `«${w}» — ${harmonyWord(w)} сөз, ${whyEnd(w)} аяқталады: -${suf}. ${K.RULES.plural.why}` }, ok, [w + flipH, w + flipC, w + flipC.replace(/а/, 'е')]); }
    ] },
    { id: 'possessive', topic: 'Притяжательные окончания (тәуелдік)', kk: 'Тәуелдік жалғау', desc: 'Менің кітабым, сенің үйің: тәуелдік жалғау.', gen: [
      rand => { const [w, ru] = choice(rand, NOUNS); const person = int(rand, 1, 2); const pron = person === 1 ? 'менің' : 'сенің';
        const ok = K.possessive(w, person); const other = K.possessive(w, person === 1 ? 2 : 1);
        const noVoice = /[пкқ]$/.test(w) ? w + ok.slice(w.length) : null;
        const flip = ok.replace(/ы([мң])$/, 'і$1').replace(/і([мң])$/, 'ы$1');
        return item(rand, { prompt: `${pron[0].toLocaleUpperCase('kk-KZ') + pron.slice(1)} ${w}___ (${person === 1 ? 'мой' : 'твой'}: ${ru})`, explanation: `${person === 1 ? 'I жақ: -м/-ым/-ім' : 'II жақ: -ң/-ың/-ің'}. «${w}» — ${harmonyWord(w)} сөз${/[пкқ]$/.test(w) ? `, соңғы ${w.slice(-1)} дауыстының алдында ұяңданады` : ''}: ${ok}.` }, ok, [noVoice, flip, other, w + (person === 1 ? 'ым' : 'ың'), w + (person === 1 ? 'ім' : 'ің')].filter(x => x && x !== ok)); }
    ] }
  ];

  const TOPICS = [
    ...KAZ_TOPICS.map(t => ({ ...t, subject: KAZ })),
    ...MATH_TOPICS.map(t => ({ ...t, subject: MATH }))
  ];
  const SUBJECTS = [{ id: KAZ, kk: 'Қазақ тілі' }, { id: MATH, kk: 'Математика' }];

  let seq = 0;
  function generate(topicId, rand) {
    const r = rand || Math.random;
    const t = TOPICS.find(x => x.id === topicId);
    if (!t) throw new Error('Unknown topic ' + topicId);
    const g = t.gen[Math.floor(r() * t.gen.length)];
    const it = g(r);
    return { id: `${t.id}-${(++seq).toString(36)}-${Math.floor(r() * 1e6).toString(36)}`, subject: t.subject, topic: t.topic, topicId: t.id, topicKk: t.kk, ...it };
  }
  // A set of n items without repeated prompts.
  function set(topicIds, n, rand) {
    const r = rand || Math.random;
    const ids = [].concat(topicIds);
    const out = [], seen = new Set();
    let guard = 0;
    while (out.length < n && guard++ < n * 30) {
      const it = generate(ids[out.length % ids.length === 0 ? Math.floor(r() * ids.length) : Math.floor(r() * ids.length)], r);
      if (seen.has(it.prompt)) continue;
      seen.add(it.prompt); out.push(it);
    }
    return out;
  }
  function topicsFor(subject) { return TOPICS.filter(t => !subject || t.subject === subject); }

  /* -------------------------------------------------------- gamification */
  // Game run → XP: 10 for finishing plus 2 per correct gate, capped at 60.
  function runXp(stats) { return stats && stats.correct > 0 ? Math.min(60, 10 + 2 * stats.correct) : 0; }
  const BADGES = [
    { id: 'first-run', title: 'Алғашқы жол', desc: 'Барыс жолын бірінші рет аяқта.', test: s => s.runs >= 1 },
    { id: 'combo-5', title: 'Комбо ×5', desc: 'Қатарынан 5 дұрыс жауап.', test: s => s.bestCombo >= 5 },
    { id: 'combo-10', title: 'Тоқтаусыз', desc: 'Қатарынан 10 дұрыс жауап.', test: s => s.bestCombo >= 10 },
    { id: 'perfect', title: 'Мінсіз жол', desc: 'Бір жүгірісте 8+ дұрыс, қатесіз.', test: s => s.perfectRuns >= 1 },
    { id: 'score-300', title: '300 ұпай', desc: 'Бір жүгірісте 300 ұпай жина.', test: s => s.best >= 300 },
    { id: 'both', title: 'Екі пән', desc: 'Қазақ тілі мен математикадан да ойна.', test: s => s.subjects && s.subjects.length >= 2 },
    { id: 'coins-100', title: 'Тиын жинаушы', desc: 'Барлығы 100 тиын жина.', test: s => s.coins >= 100 }
  ];
  function badgesFor(stats) { return BADGES.filter(b => b.test(stats || {})).map(b => b.id); }

  return { MATH, KAZ, TOPICS, SUBJECTS, generate, set, topicsFor, runXp, BADGES, badgesFor, num };
});
