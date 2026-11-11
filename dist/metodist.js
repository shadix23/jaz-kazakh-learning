/*
 * Jaz! Методист — рабочее место методиста.
 * Обзор → Темы → Учебники → Часы → Отчёт → Данные.
 * Rendering is string templates; animations are progressive (CSS + small JS tweens).
 */
(function (global) {
  'use strict';
  const KEY = 'jaz.methodist.v2';
  const C = () => global.JazCurriculum;
  const doc = global.document;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const reduced = () => !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const raf = global.requestAnimationFrame ? global.requestAnimationFrame.bind(global) : fn => setTimeout(fn, 16);

  const TABS = [
    { id: 'home', label: 'Главная', title: 'Здравствуйте! Что нужно сделать?', sub: 'Выберите задачу — система проведёт по шагам. Нажмите «?» рядом с любым словом, чтобы увидеть объяснение.', icon: 'M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z' },
    { id: 'overview', label: 'Обзор', title: 'Сводка для решения', sub: 'Главное о результатах, учебниках и часах на одном экране.', icon: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z' },
    { id: 'topics', label: 'Темы', title: 'Где возникают затруднения', sub: 'Освоение тем по классам и разбор заданий с типичными ошибками.', icon: 'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16' },
    { id: 'students', label: 'Ученики', title: 'Ученики и группы поддержки', sub: 'Кому и по какой теме нужна помощь — готовые списки для дополнительных занятий.', icon: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8' },
    { id: 'books', label: 'Учебники', title: 'Эффективность учебников', sub: 'Сравнение прироста с учётом учителя: вывод только там, где данные позволяют.', icon: 'M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4zM5 16a4 4 0 0 1 4-4h10' },
    { id: 'hours', label: 'Часы', title: 'Распределение учебных часов', sub: 'Программа → рекомендация. Сумма часов сохраняется, каждое изменение обосновано.', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2' },
    { id: 'report', label: 'Отчёт', title: 'Отчёт для педсовета', sub: 'Одна страница: печать или сохранение в PDF.', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' },
    { id: 'data', label: 'Данные', title: 'Данные и качество', sub: 'Импорт CSV, шаблон, проверка полноты и живые ответы из тренажёра.', icon: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3' }
  ];
  const STATUS = { risk: 'Зона риска', watch: 'Наблюдать', ok: 'Освоено', missing: 'Нет данных' };
  // Interface language for the main screens and the official report (ru / kk).
  const KK = {
    'tab.home': ['Басты бет', 'Сәлеметсіз бе! Не істейміз?', 'Тапсырманы таңдаңыз — жүйе қадам-қадаммен көрсетеді. Түсініксіз сөздің жанындағы «?» белгісін басыңыз.'],
    'tab.overview': ['Қорытынды', 'Шешім қабылдауға арналған жиынтық', 'Үлгерім, білім сапасы, тақырыптар мен сағаттар — бір бетте.'],
    'tab.topics': ['Тақырыптар', 'Қай жерде қиындық бар', 'Тақырыптарды сыныптар бойынша меңгеру және тапсырмалардағы жиі қателер.'],
    'tab.students': ['Оқушылар', 'Оқушылар және қолдау топтары', 'Кімге және қай тақырыптан көмек керек — қосымша сабақтарға дайын тізімдер.'],
    'tab.books': ['Оқулықтар', 'Оқулықтардың тиімділігі', 'Мұғалімді ескере отырып салыстыру: қорытынды тек деректер жеткілікті болғанда.'],
    'tab.hours': ['Сағаттар', 'Оқу сағаттарын бөлу', 'Вариативтік және түзету сағаттары: әр өзгерістің негіздемесі бар.'],
    'tab.report': ['Анықтама', 'Педагогикалық кеңеске анықтама', 'Талдау анықтамасы: Word-қа жүктеу немесе басып шығару.'],
    'tab.data': ['Деректер', 'Деректерді жүктеу', 'БЖБ/ТЖБ нәтижелерін Excel-ден қойыңыз немесе файл таңдаңыз.'],
    class: 'Сынып', allClasses: 'Бүкіл параллель', allPeriod: 'Барлық кезең', days30: '30 күн', days14: '14 күн', masteredAt: 'Меңгерді',
    demo: 'Демо-деректер (синтетика)', yours: 'Сіздің деректеріңіз', live: 'тірі', size: 'Мәтін өлшемі', lang: 'Тіл'
  };
  const RU = { class: 'Класс', allClasses: 'Вся параллель', allPeriod: 'Весь период', days30: '30 дней', days14: '14 дней', masteredAt: 'Освоено при', demo: 'Демо-данные (синтетика)', yours: 'Ваши данные', live: 'живых', size: 'Размер текста', lang: 'Язык' };
  const t = key => (st.lang === 'kk' ? KK[key] : RU[key]) || RU[key] || key;
  const tabText = (tab, i) => st.lang === 'kk' && KK['tab.' + tab.id] ? KK['tab.' + tab.id][i] : [tab.label, tab.title, tab.sub][i];
  // Plain-language explanations for the terms methodists meet in the reports.
  const HELP = {
    progress: ['Успеваемость', 'Доля учеников без «2»: получили 3, 4 или 5. Оценка выставляется по проценту баллов: от 40% — «3», от 65% — «4», от 85% — «5».'],
    quality: ['Качество знаний', 'Доля учеников, получивших «4» и «5» (65% баллов и выше).'],
    levels: ['Уровни', 'Низкий — меньше 40% баллов, средний — от 40 до 84%, высокий — 85% и выше. Так же считают в справках по СОР и СОЧ.'],
    mastery: ['«Освоено»', 'Ученик освоил тему, если набрал по ней не меньше выбранного порога (обычно 70% баллов).'],
    gain: ['Прирост', 'На сколько процентных пунктов результат выше входной диагностики. Если входной диагностики нет, сравниваются итоговые результаты.'],
    pp: ['п.п. (процентный пункт)', 'Разница между процентами: было 60%, стало 70% — это +10 п.п.'],
    ci: ['Надёжность вывода (95% интервал)', 'Диапазон, в котором с высокой вероятностью лежит настоящая разница. Если он целиком выше или ниже нуля — разница не случайна. Если включает ноль — делать вывод рано.'],
    core: ['«Ядро» группы', 'Ученики, набравшие по теме 40% и меньше. Им дополнительные занятия нужны в первую очередь.'],
    risk: ['Зона риска', 'Тема, которую не освоили 40% учеников и больше.'],
    lowdata: ['Мало данных', 'Меньше 10 учеников или 30 ответов: выводы ненадёжны, нужен ещё один срез.'],
    reserve: ['Вариативные и коррекционные часы', 'Часы сверх обязательной сетки, которые школа может направить на повторение трудных тем. Сетка часов программы не меняется.']
  };
  const helpBtn = key => `<button type="button" class="mx-help" data-mx-help="${key}" aria-label="Что это: ${esc(HELP[key][0])}">?</button>`;
  const VERDICT_KK = { better: 'өсімі жоғары', worse: 'өсімі төмен', same: 'айырма расталмады', small: 'айырма аз (< 5 п.т.)', few: 'деректер аз', reference: 'салыстыру негізі', incomparable: 'салыстыру мүмкін емес' };
  const VERDICT = { better: 'Больше прирост', worse: 'Меньше прирост', same: 'Разница не подтверждена', small: 'Разница мала (< 5 п.п.)', few: 'Мало данных', reference: 'База сравнения', incomparable: 'Нельзя сравнить' };

  /* ---------------------------------------------------------------- state */
  let rows = [], baseRows = [], liveRows = [], pending = [], version = 0;
  let st = { zoom: 1, lang: 'ru', tab: 'home', subject: 'Математика', className: '', period: 0, mastery: 70, scenario: 'clean', source: 'demo', reserve: 4, rebalance: false, program: {}, weights: {}, bookTopic: '', reference: '' };
  let selection = null, drawer = null, error = '', notice = '', storageError = false, riskFilter = 'high', aiAvailable = false, aiBusy = false;
  const aiSummary = {};
  let imp = { text: '', preview: null, error: '', name: '', subject: '' };
  let host = null, navHost = null, studentHost = null;
  const memo = new Map();
  const prevBars = new Map(), prevNums = new Map(), prevSeg = new Map();

  function setRows(next) { baseRows = next; rows = baseRows.concat(liveRows); version++; memo.clear(); }
  function addLive(row) { liveRows.push(row); rows.push(row); version++; memo.clear(); }
  function cached(key, fn) { const k = version + '|' + key; if (!memo.has(k)) { if (memo.size > 200) memo.clear(); memo.set(k, fn()); } return memo.get(k); }
  function subjectRows() { return cached('s|' + st.subject + '|' + st.period, () => C().filterRows(rows, { subject: st.subject, period: st.period })); }
  function viewRows() { return st.className ? cached('v|' + st.subject + '|' + st.period + '|' + st.className, () => subjectRows().filter(r => r.class === st.className)) : subjectRows(); }
  function program(subject) {
    const s = subject || st.subject;
    if (!st.program[s]) {
      const demo = C().demoProgram()[s];
      st.program[s] = demo ? demo.map(p => ({ ...p })) : C().topics(rows, s).map((topic, order) => ({ topic, hours: 4, order }));
    }
    const known = new Set(st.program[s].map(p => p.topic));
    C().topics(rows, s).forEach(topic => { if (!known.has(topic)) st.program[s].push({ topic, hours: 4, order: st.program[s].length }); });
    return st.program[s];
  }
  const opts = () => ({ mastery: st.mastery, program: program() });

  function save() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify({
        st: { ...st, tab: st.tab }, csv: st.source === 'csv' ? C().exportCSV(baseRows) : '', live: liveRows, pending: pending.slice(-50), selection
      }));
      storageError = false;
    } catch (_) { storageError = true; }
  }
  function restore() {
    let saved = null;
    try { saved = JSON.parse(global.localStorage.getItem(KEY) || 'null'); } catch (_) { notice = 'Сохранённые данные не удалось прочитать.'; }
    if (saved && typeof saved === 'object') {
      if (saved.st && typeof saved.st === 'object') {
        const s = saved.st;
        if (TABS.some(t => t.id === s.tab)) st.tab = s.tab;
        if (typeof s.subject === 'string') st.subject = s.subject;
        if (typeof s.className === 'string') st.className = s.className;
        if ([0, 14, 30].includes(s.period)) st.period = s.period;
        if ([60, 70, 80].includes(s.mastery)) st.mastery = s.mastery;
        st.scenario = s.scenario === 'confounded' ? 'confounded' : 'clean';
        st.source = s.source === 'csv' ? 'csv' : 'demo';
        if (Number.isSafeInteger(s.reserve) && s.reserve >= 0 && s.reserve <= 100) st.reserve = s.reserve;
        st.rebalance = s.rebalance === true;
        if ([1, 1.15, 1.3].includes(s.zoom)) st.zoom = s.zoom;
        st.lang = s.lang === 'kk' ? 'kk' : 'ru';
        if (s.program && typeof s.program === 'object') st.program = s.program;
        if (s.weights && typeof s.weights === 'object') st.weights = s.weights;
        if (typeof s.bookTopic === 'string') st.bookTopic = s.bookTopic;
        if (typeof s.reference === 'string') st.reference = s.reference;
      }
      if (Array.isArray(saved.live)) liveRows = saved.live.filter(r => r && typeof r.student_id === 'string' && typeof r.topic === 'string' && (r.correct === 0 || r.correct === 1));
      if (Array.isArray(saved.pending)) pending = saved.pending.filter(p => p && typeof p.questionId === 'string');
      if (saved.selection && typeof saved.selection.class === 'string') selection = saved.selection;
      if (st.source === 'csv') {
        try { setRows(typeof saved.csv === 'string' && saved.csv.trim() ? C().parseCSV(saved.csv) : []); return; }
        catch (_) { notice = 'Сохранённый CSV не прочитан — загружены демо-данные.'; st.source = 'demo'; }
      }
    }
    setRows(C().build(st.scenario));
  }

  /* ------------------------------------------------------------ formatting */
  const fmt = {
    pct: v => Number.isFinite(v) ? (Math.round(v * 10) / 10).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '%' : '—',
    pct0: v => Number.isFinite(v) ? Math.round(v) + '%' : '—',
    int: v => Number.isFinite(v) ? Math.round(v).toLocaleString('ru-RU') : '—',
    pp: v => Number.isFinite(v) ? C().fmtSigned(v) + ' п.п.' : '—',
    signed: v => Number.isFinite(v) ? C().fmtSigned(v) : '—',
    hours: v => Number.isFinite(v) ? Math.round(v) + ' ч' : '—'
  };
  const num = (key, value, kind, cls = '') => `<b class="mx-num ${cls}" data-num="${Number.isFinite(value) ? value : ''}" data-fmt="${kind}" data-key="${esc(key)}">${fmt[kind](value)}</b>`;
  const clip = v => `inset(0 ${(100 - v).toFixed(2)}% 0 0 round 99px)`;
  const bar = (key, value, tone, label = '') => { const v = Math.max(0, Math.min(100, value || 0)); return `<span class="mx-bar" role="presentation"><i class="tone-${tone}" data-bar data-key="${esc(key)}" data-to="${v}" style="clip-path:${clip(v)}"></i>${label}</span>`; };
  const toneOfScore = score => ({ good: 'good', mid: 'mid', low: 'low', missing: 'none' })[C().band(score)];
  const icon = (path, cls = '') => `<svg class="mx-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  const I = {
    arrow: 'M5 12h14M13 6l6 6-6 6', close: 'M6 6l12 12M18 6L6 18', warn: 'M12 4l9 16H3zM12 10v4M12 17v.5', check: 'M5 12.5l4.5 4.5L19 7',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5', book: TABS.find(t => t.id === 'books').icon, clock: TABS.find(t => t.id === 'hours').icon, topic: TABS.find(t => t.id === 'topics').icon,
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14', upload: 'M12 20V9M7 14l5-5 5 5M5 4h14', print: 'M7 9V4h10v5M7 17H4v-7h16v7h-3M7 14h10v6H7z', reset: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4', minus: 'M6 12h12', plus: 'M12 6v12M6 12h12'
  };
  const seg = (key, field, items, value, extra = '') => `<div class="mx-seg" data-seg="${esc(key)}" role="group"><div class="mx-seg-row">${items.map(([v, label]) => `<button type="button" data-mx-set="${field}" data-value="${esc(v)}"${extra} aria-pressed="${String(v) === String(value)}">${esc(label)}</button>`).join('')}</div><div class="mx-seg-row mx-seg-active" aria-hidden="true">${items.map(([, label]) => `<span>${esc(label)}</span>`).join('')}</div></div>`;
  const select = (field, items, value, label) => `<label class="mx-select"><span>${label}</span><select data-mx-field="${field}">${items.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const card = (title, body, extra = '', i = 0, aside = '') => `<section class="mx-card mx-in ${extra}" style="--i:${i}"><div class="mx-card-head"><h2>${title}</h2>${aside}</div>${body}</section>`;
  const pill = (tone, text) => `<span class="mx-pill tone-${tone}">${esc(text)}</span>`;
  const quote = text => String(text).includes('«') ? '„' + text + '“' : '«' + text + '»';
  const short = (text, n = 46) => text.length > n ? text.slice(0, n - 1) + '…' : text;

  /* ------------------------------------------------------------- chrome */
  function filtersUI() {
    const subjects = C().subjects(rows);
    if (subjects.length && !subjects.includes(st.subject)) st.subject = subjects[0];
    const classes = C().classes(subjectRows());
    if (st.className && !classes.includes(st.className)) st.className = '';
    const classDisabled = st.tab === 'books';
    return `<div class="mx-filters mx-in" style="--i:1">
      ${subjects.length > 1 ? seg('subject', 'subject', subjects.map(s => [s, s]), st.subject) : `<span class="mx-chip">${esc(st.subject)}</span>`}
      <label class="mx-select${classDisabled ? ' is-disabled' : ''}" title="${classDisabled ? 'Учебники сравниваются по всей параллели' : ''}"><span>${t('class')}</span><select data-mx-field="className"${classDisabled ? ' disabled' : ''}>${[['', t('allClasses')]].concat(classes.map(c => [c, c])).map(([v, t]) => `<option value="${esc(v)}"${v === st.className ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      ${seg('period', 'period', [[0, t('allPeriod')], [30, t('days30')], [14, t('days14')]], st.period)}
      ${select('mastery', [[60, '≥ 60%'], [70, '≥ 70%'], [80, '≥ 80%']], st.mastery, t('masteredAt'))}${helpBtn('mastery')}
    </div>`;
  }
  function sourceChip() {
    const label = st.source === 'csv' ? t('yours') : st.scenario === 'confounded' ? 'Демо: учитель = учебник' : t('demo');
    return `<button type="button" class="mx-source tone-${st.source === 'csv' ? 'good' : 'info'}" data-mx-tab="data"><i></i>${label}${liveRows.length ? ` · +${liveRows.length} ${t('live')}` : ''}</button>`;
  }
  function prefsUI() {
    return `<div class="mx-prefs">${seg('zoom', 'zoom', [[1, 'A'], [1.15, 'A+'], [1.3, 'A++']], st.zoom).replace('role="group"', `role="group" aria-label="${t('size')}"`)}${seg('lang', 'lang', [['ru', 'Рус'], ['kk', 'Қаз']], st.lang).replace('role="group"', `role="group" aria-label="${t('lang')}"`)}</div>`;
  }
  function renderNav() {
    if (!navHost) return;
    if (navHost.dataset.lang !== st.lang) { navHost.dataset.lang = st.lang; navHost.dataset.ready = ''; }
    if (navHost.style) navHost.style.zoom = Math.min(st.zoom, 1.1); // the sidebar has a fixed width
    if (!navHost.dataset.ready) {
      if (!navHost.dataset.bound) { navHost.dataset.bound = '1'; navHost.addEventListener('click', onClick); }
      navHost.innerHTML = `<span class="mx-nav-pill" aria-hidden="true"></span>${TABS.map(tb => `<button type="button" class="mx-nav-item" data-mx-tab="${tb.id}">${icon(tb.icon)}<span>${tabText(tb, 0)}</span></button>`).join('')}<div class="mx-nav-foot"><strong>Data-Driven Curriculum</strong><span>${st.lang === 'kk' ? 'Тест нәтижелерінен — оқулықтар мен сағаттар туралы шешімге.' : 'От результатов тестов — к решениям об учебниках и часах.'}</span></div>`;
      navHost.dataset.ready = '1';
    }
    navHost.querySelectorAll('[data-mx-tab]').forEach(b => { const on = b.dataset.mxTab === st.tab; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const active = navHost.querySelector('.mx-nav-item.active'), pillEl = navHost.querySelector('.mx-nav-pill');
    if (active && pillEl) { pillEl.style.transform = `translateY(${active.offsetTop}px)`; pillEl.style.height = active.offsetHeight + 'px'; pillEl.style.opacity = active.offsetHeight ? '1' : '0'; }
  }

  function emptyUI(text) {
    return `<div class="mx-empty mx-in"><span class="mx-empty-art" aria-hidden="true"><i></i><i></i><i></i></span><h3>${rows.length ? 'Нет ответов по выбранным фильтрам' : 'Начните с данных'}</h3><p>${esc(text || (rows.length ? 'Выберите другой класс или период.' : 'Скачайте шаблон CSV, заполните и загрузите — аналитика появится автоматически.'))}</p>${rows.length ? '' : '<button type="button" class="mx-btn primary" data-mx-tab="data">Перейти к данным</button>'}</div>`;
  }

  /* ---------------------------------------------------------------- home */
  const HOME_TASKS = [
    { tab: 'data', n: 1, icon: 'M12 20V9M7 14l5-5 5 5M5 4h14', ru: ['Загрузить результаты СОР/СОЧ', 'Вставьте таблицу из Excel или выберите файл. ФИО автоматически заменятся кодами.'], kk: ['БЖБ/ТЖБ нәтижелерін жүктеу', 'Excel кестесін қойыңыз немесе файл таңдаңыз. Аты-жөні кодқа ауыстырылады.'] },
    { tab: 'overview', n: 2, icon: 'M4 20V10m6 10V4m6 16v-7m5 7H2', ru: ['Посмотреть итоги', 'Успеваемость, качество знаний, оценки и уровни по каждому классу.'], kk: ['Қорытындыны көру', 'Әр сынып бойынша үлгерім, білім сапасы, бағалар мен деңгейлер.'] },
    { tab: 'topics', n: 3, icon: 'M12 4l9 16H3zM12 10v4M12 17v.5', ru: ['Найти трудные темы', 'Какие разделы не освоены и какие ошибки повторяются у учеников.'], kk: ['Қиын тақырыптарды табу', 'Қай бөлімдер меңгерілмеген және қандай қателер қайталанады.'] },
    { tab: 'students', n: 4, icon: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', ru: ['Составить группы поддержки', 'Готовые списки учеников по темам для дополнительных занятий.'], kk: ['Қолдау топтарын құру', 'Қосымша сабақтарға тақырыптар бойынша дайын тізімдер.'] },
    { tab: 'report', n: 5, icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6', ru: ['Подготовить справку', 'Аналитическая справка по итогам СОР/СОЧ на русском или казахском — в Word.'], kk: ['Анықтама дайындау', 'БЖБ/ТЖБ қорытындысы бойынша талдау анықтамасы — Word форматында.'] },
    { tab: 'hours', n: 6, icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', ru: ['Распределить часы', 'Куда направить вариативные и коррекционные часы. Черновик КТП.'], kk: ['Сағаттарды бөлу', 'Вариативтік және түзету сағаттарын қайда бағыттау. ҚТЖ жобасы.'] }
  ];
  function homeUI() {
    const subjects = C().subjects(rows);
    const students = new Set(rows.map(r => r.student_id)).size;
    const status = {
      data: rows.length ? (st.lang === 'kk' ? `${subjects.length} пән · ${students} оқушы` : `${subjects.length} предм. · ${students} учеников`) : (st.lang === 'kk' ? 'Деректер жоқ' : 'Данных нет'),
      overview: rows.length ? (() => { const m = C().schoolMetrics(subjectRows()); return (st.lang === 'kk' ? 'Сапа ' : 'Качество ') + fmt.pct0(100 * m.total.quality); })() : '',
      topics: rows.length ? (() => { const n = C().topicStats(subjectRows(), opts()).filter(x => x.status === 'risk' && !x.lowData).length; return (st.lang === 'kk' ? 'Қауіп аймағында: ' : 'В зоне риска: ') + n; })() : '',
      students: '', report: '', hours: ''
    };
    const steps = st.lang === 'kk' ? ['Деректерді жүктеңіз', 'Қорытындыны қараңыз', 'Анықтаманы жүктеңіз'] : ['Загрузите результаты', 'Посмотрите итоги и трудные темы', 'Скачайте справку для педсовета'];
    return `<section class="mx-home-steps" aria-label="Как это работает">${steps.map((x, i) => `<div><b>${i + 1}</b><span>${esc(x)}</span></div>`).join('<i aria-hidden="true">→</i>')}</section>
      <section class="mx-tasks">${HOME_TASKS.map(task => { const [title, desc] = task[st.lang] || task.ru; return `<button type="button" class="mx-task" data-mx-tab="${task.tab}"><span class="mx-task-icon">${icon(task.icon)}</span><span class="mx-task-text"><strong>${esc(title)}</strong><span>${esc(desc)}</span>${status[task.tab] ? `<em>${esc(status[task.tab])}</em>` : ''}</span><span class="mx-task-go">${icon(I.arrow)}</span></button>`; }).join('')}</section>
      <section class="mx-home-help"><span class="mx-help static">?</span><p>${st.lang === 'kk' ? 'Кез келген терминнің жанындағы «?» белгісін басыңыз — қарапайым түсіндірме шығады. Мәтінді үлкейту үшін жоғарыдағы «A+» батырмасын басыңыз.' : 'Нажмите «?» рядом с любым термином — появится объяснение простыми словами. Чтобы увеличить текст, нажмите «A+» вверху.'}</p></section>`;
  }

  // Classic school indicators: успеваемость, качество знаний, marks and levels per class.
  function metricsUI(data) {
    const m = cached('met|' + st.subject + st.period + st.className, () => C().schoolMetrics(data));
    const T = m.total;
    const strip = `<div class="mx-kpis">
      <article class="mx-kpi"><span>Успеваемость ${helpBtn('progress')}</span>${num('sm:p', 100 * T.progress, 'pct0')}<small>получили «3», «4» или «5»</small>${bar('sm:p', 100 * T.progress, 'good')}</article>
      <article class="mx-kpi"><span>Качество знаний ${helpBtn('quality')}</span>${num('sm:q', 100 * T.quality, 'pct0')}<small>получили «4» и «5»</small>${bar('sm:q', 100 * T.quality, toneOfScore(100 * T.quality))}</article>
      <article class="mx-kpi"><span>Средний процент баллов</span>${num('sm:a', T.avg, 'pct')}<small>${T.n} учеников</small>${bar('sm:a', T.avg, toneOfScore(T.avg))}</article>
      <article class="mx-kpi"><span>Уровни ${helpBtn('levels')}</span><b class="mx-levels"><i class="lv-low" style="flex:${T.levels.low}" title="Низкий"></i><i class="lv-mid" style="flex:${T.levels.mid}" title="Средний"></i><i class="lv-high" style="flex:${T.levels.high}" title="Высокий"></i></b><small>низкий ${T.levels.low} · средний ${T.levels.mid} · высокий ${T.levels.high}</small></article>
    </div>`;
    const table = `<div class="mx-table-wrap"><table class="mx-table mx-classes"><thead><tr><th>Класс</th><th>Учеников</th><th>Средний %</th><th>Успеваемость</th><th>Качество</th><th>«5»</th><th>«4»</th><th>«3»</th><th>«2»</th><th>Низкий / средний / высокий</th></tr></thead><tbody>${m.classes.map(c => `<tr><th scope="row">${esc(c.cls)}</th><td>${c.n}</td><td>${fmt.pct0(c.avg)}</td><td><b class="tone-text-${c.progress >= 0.9 ? 'good' : c.progress >= 0.75 ? 'mid' : 'low'}">${fmt.pct0(100 * c.progress)}</b></td><td><b class="tone-text-${c.quality >= 0.6 ? 'good' : c.quality >= 0.4 ? 'mid' : 'low'}">${fmt.pct0(100 * c.quality)}</b></td><td>${c.marks[5]}</td><td>${c.marks[4]}</td><td>${c.marks[3]}</td><td>${c.marks[2]}</td><td><span class="mx-levels small"><i class="lv-low" style="flex:${c.levels.low || 0.0001}"></i><i class="lv-mid" style="flex:${c.levels.mid || 0.0001}"></i><i class="lv-high" style="flex:${c.levels.high || 0.0001}"></i></span><small>${c.levels.low} / ${c.levels.mid} / ${c.levels.high}</small></td></tr>`).join('')}<tr class="mx-total"><th scope="row">Итого</th><td>${T.n}</td><td>${fmt.pct0(T.avg)}</td><td><b>${fmt.pct0(100 * T.progress)}</b></td><td><b>${fmt.pct0(100 * T.quality)}</b></td><td>${T.marks[5]}</td><td>${T.marks[4]}</td><td>${T.marks[3]}</td><td>${T.marks[2]}</td><td><small>${T.levels.low} / ${T.levels.mid} / ${T.levels.high}</small></td></tr></tbody></table></div>`;
    return { strip, table, m };
  }

  /* ------------------------------------------------------------ overview */
  function insights() {
    return cached('ins|' + st.subject + '|' + st.period + '|' + st.className + '|' + st.mastery + '|' + JSON.stringify(program()) + st.reserve + st.rebalance + JSON.stringify(st.weights[st.subject] || {}),
      () => C().insights(viewRows(), program(), { mastery: st.mastery, reserve: st.reserve, rebalance: st.rebalance, weights: st.weights[st.subject] || {}, compareRows: subjectRows() }));
  }
  function overviewUI() {
    const data = viewRows();
    if (!data.length) return emptyUI();
    const ins = insights(), k = ins.kpi;
    const met = metricsUI(data);
    const kpis = met.strip + card('Итоги по классам', `<p class="mx-lead">Как в справке по СОР/СОЧ: оценка ставится по проценту баллов (40% — «3», 65% — «4», 85% — «5»).</p>${met.table}`, '', 2);
    const topicsList = `<ul class="mx-topic-bars">${ins.stats.map((s, i) => `<li class="mx-in" style="--i:${6 + i}"><button type="button" data-mx-topic="${esc(s.topic)}" class="mx-topic-row"><span class="mx-topic-name"><i class="mx-dot tone-${s.status}"></i>${esc(s.topic)}</span>${bar('ov:' + s.topic, 100 * s.masteredShare, s.status === 'risk' ? 'low' : s.status === 'watch' ? 'mid' : 'good')}<span class="mx-topic-val">${num('ovn:' + s.topic, 100 * s.notMasteredShare, 'pct0')}<small>не освоили</small></span></button></li>`).join('')}</ul>`;
    const decisions = ins.decisions.length ? `<ol class="mx-decisions">${ins.decisions.map((d, i) => `<li class="tone-${d.tone}"><span class="mx-dec-icon">${icon(d.kind === 'book' ? I.book : d.kind === 'hours' ? I.clock : I.topic)}</span><p>${esc(d.text)}</p></li>`).join('')}</ol>` : '<p class="mx-muted">Существенных проблем не найдено.</p>';
    const books = ins.books;
    const booksBody = !books || books.state === 'empty' ? '<p class="mx-muted">Нет данных.</p>' : books.state === 'single' || books.state === 'blocked' ? `<div class="mx-callout tone-watch">${icon(I.warn)}<p>${esc(books.state === 'single' ? books.why : 'Вывод заблокирован: учитель и учебник не разделены.')}</p></div>` : forest(books, 'ov', true);
    const plan = ins.plan;
    const hours = `<ul class="mx-delta-list">${plan.rows.filter(p => p.delta).sort((a, b) => b.delta - a.delta).map((p, i) => `<li class="mx-in" style="--i:${10 + i}"><span>${esc(p.topic)}</span><span class="mx-delta ${p.delta > 0 ? 'up' : 'down'}">${p.delta > 0 ? '+' : '−'}${Math.abs(p.delta)} ч</span></li>`).join('') || '<li><span class="mx-muted">Изменений не требуется</span></li>'}</ul><p class="mx-foot">Программа ${plan.baseTotal} ч + резерв ${plan.reserve} ч → ${plan.recommendedTotal} ч</p>`;
    return `${kpis}<div class="mx-grid two">
      ${card('Освоение тем ' + helpBtn('mastery'), topicsList, 'span-rows', 6, '<span class="mx-legend"><i class="mx-dot tone-good"></i>освоили <i class="mx-dot tone-none"></i>нет</span>')}
      ${card('Решения для педсовета', decisions, 'accent', 7, `<button type="button" class="mx-link" data-mx-tab="report">Отчёт ${icon(I.arrow)}</button>`)}
      ${card('Учебники · с учётом учителя', booksBody, '', 8, `<button type="button" class="mx-link" data-mx-tab="books">Подробнее ${icon(I.arrow)}</button>`)}
      ${card('Часы · было → стало', hours, '', 9, `<button type="button" class="mx-link" data-mx-tab="hours">План ${icon(I.arrow)}</button>`)}
      ${card('Живые данные из тренажёра', liveUI(), '', 10, `<button type="button" class="mx-link" data-mx-tab="students">Ученики ${icon(I.arrow)}</button>`)}
    </div>`;
  }

  /* -------------------------------------------------------------- topics */
  function topicsUI() {
    const data = viewRows();
    if (!data.length) return emptyUI();
    const stats = C().topicStats(data, opts());
    const classes = C().classes(data);
    const cols = classes.length > 1 ? classes.concat(['']) : classes;
    let n = 0;
    const heat = `<div class="mx-table-wrap"><table class="mx-heat"><caption class="mx-sr">Средний результат по темам и классам</caption><thead><tr><th scope="col">Тема</th>${cols.map(c => `<th scope="col">${c ? esc(c) : 'Параллель'}</th>`).join('')}</tr></thead><tbody>${stats.map(s => `<tr><th scope="row"><span>${esc(s.topic)}</span>${pill(s.status, STATUS[s.status])}</th>${cols.map(c => {
      const cell = cached('cell|' + st.subject + st.period + st.mastery + s.topic + '|' + c + '|' + st.className, () => C().cell(data, s.topic, c, { mastery: st.mastery }));
      const tone = cell.answers ? toneOfScore(cell.score) : 'none';
      return `<td><button type="button" class="mx-cell mx-pop tone-${tone}${cell.lowData && cell.answers ? ' is-low' : ''}${c ? '' : ' is-total'}" style="--i:${n++}" data-mx-topic="${esc(s.topic)}" data-class="${esc(c)}" aria-label="${esc(s.topic)}, ${c ? 'класс ' + esc(c) : 'параллель'}: ${fmt.pct(cell.score)}, ${cell.n} учеников"><strong>${fmt.pct0(cell.score)}</strong><small>не освоили ${fmt.pct0(100 * cell.notMasteredShare)} · n ${cell.n}</small></button></td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`;
    const legend = `<div class="mx-legend wide">${C().THRESHOLDS.map(t => `<span><i class="mx-sw tone-${t.key}"></i>${esc(t.label)}</span>`).join('')}<span><i class="mx-sw is-low"></i>мало данных (&lt; 10 учеников или 30 ответов)</span></div>`;
    const items = stats.flatMap(s => C().itemStats(data, s.topic).filter(q => q.flags.length).map(q => ({ ...q, topic: s.topic }))).sort((a, b) => b.errorRate - a.errorRate).slice(0, 6);
    const itemList = items.length ? `<ul class="mx-items">${items.map((q, i) => `<li class="mx-in" style="--i:${4 + i}"><button type="button" data-mx-topic="${esc(q.topic)}" data-class="${esc(st.className)}"><span class="mx-item-top"><strong>${esc(q.text)}</strong>${q.flags.map(flagPill).join('')}</span><span class="mx-item-meta">${esc(q.topic)} · верно ${fmt.pct0(q.p)}${q.wrong[0] ? ` · частый неверный ответ «${esc(q.wrong[0].answer)}» — ${fmt.pct0(100 * q.wrong[0].share)}` : ''}</span></button></li>`).join('')}</ul>` : '<p class="mx-muted">Проблемных заданий не найдено.</p>';
    return `${card('Тема × класс', `<p class="mx-lead">Средний результат учеников (доля верных). Нажмите на ячейку — откроется разбор темы.</p>${legend}${heat}`, '', 2)}
      ${card('Задания, требующие внимания', `<p class="mx-lead">Трудные задания, задания с плохой различающей способностью и устойчивые ошибки — материал для методобъединения.</p>${itemList}`, '', 3)}`;
  }
  function flagPill(flag) { return ({ hard: pill('low', 'Трудное'), weak: pill('watch', 'Плохо различает'), misconception: pill('info', 'Типичная ошибка') })[flag] || ''; }

  function liveUI() {
    const live = liveRows.filter(r => r.subject === st.subject);
    if (!live.length) return `<p class="mx-muted">Ответы учеников из тренажёра появятся здесь сразу — из уроков и игры «Барыс жолы». Переключитесь в режим «Ученик», выберите класс и код ученика и пройдите задание.</p>`;
    const ok = live.filter(r => r.correct).length;
    const byTopic = new Map();
    for (const r of live) { const t = byTopic.get(r.topic) || { n: 0, ok: 0 }; t.n++; t.ok += r.correct; byTopic.set(r.topic, t); }
    return `<div class="mx-live-kpis"><div>${num('lv:n', live.length, 'int')}<span>ответов</span></div><div>${num('lv:acc', 100 * ok / live.length, 'pct0')}<span>верно</span></div><div>${num('lv:s', new Set(live.map(r => r.student_id)).size, 'int')}<span>учеников</span></div></div>
      <ul class="mx-live-topics">${[...byTopic.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 5).map(([t, v]) => `<li><span>${esc(t)}</span>${bar('lvt:' + t, 100 * v.ok / v.n, toneOfScore(100 * v.ok / v.n))}<b>${v.ok}/${v.n}</b></li>`).join('')}</ul>
      <p class="mx-foot">${icon(I.info)} Живые ответы сразу учитываются в диагностике тем и в плане часов.</p>`;
  }

  /* ------------------------------------------------------------- students */
  const RISK = { high: 'Высокий риск', medium: 'Средний риск', low: 'Освоено' };
  function studentsUI() {
    const data = viewRows();
    if (!data.length) return emptyUI();
    const profiles = cached('prof|' + st.subject + st.period + st.className + st.mastery, () => C().studentProfiles(data, opts()));
    const groups = cached('grp|' + st.subject + st.period + st.className + st.mastery, () => C().supportGroups(data, opts()));
    const high = profiles.filter(p => p.risk === 'high'), medium = profiles.filter(p => p.risk === 'medium');
    const active = profiles.filter(p => p.live > 0).length;
    const topics = C().topicStats(data, opts()).map(t => t.topic);
    const list = riskFilter === 'all' ? profiles : profiles.filter(p => p.risk === riskFilter);
    const kpis = `<div class="mx-kpis">
      <article class="mx-kpi"><span>Высокий риск</span>${num('st:h', high.length, 'int')}<small>не освоено ≥ 2/3 тем</small>${bar('st:h', 100 * high.length / profiles.length, 'low')}</article>
      <article class="mx-kpi"><span>Средний риск</span>${num('st:m', medium.length, 'int')}<small>не освоено ≥ 1/3 тем</small>${bar('st:m', 100 * medium.length / profiles.length, 'mid')}</article>
      <article class="mx-kpi"><span>Учеников</span>${num('st:n', profiles.length, 'int')}<small>${st.className ? 'класс ' + esc(st.className) : 'вся параллель'}</small>${bar('st:n', 100, 'info')}</article>
      <article class="mx-kpi"><span>Занимаются в тренажёре</span>${num('st:a', active, 'int')}<small>есть живые ответы</small>${bar('st:a', profiles.length ? 100 * active / profiles.length : 0, 'good')}</article>
    </div>`;
    const groupList = groups.length ? `<ul class="mx-groups">${groups.slice(0, 8).map(g => `<li><details><summary><span class="mx-g-topic"><strong>${esc(g.topic)}</strong><small>не освоили ${g.count} из ${g.total} · ядро ${g.core} (≤ 40%)</small></span><span class="mx-g-classes">${g.groups.map(c => `<span class="mx-class-chip">${esc(c.cls)} · ${c.core.length || c.size}</span>`).join('')}</span></summary><div class="mx-g-body">${g.groups.map(c => `<div><b>${esc(c.cls)}</b><span>${c.core.length ? 'ядро: ' + c.core.map(esc).join(', ') : 'ядра нет'}</span><small>все не освоившие (${c.size}): ${c.students.map(esc).join(', ')}</small></div>`).join('')}</div></details></li>`).join('')}</ul>` : '<p class="mx-muted">Все темы освоены.</p>';
    const table = `<div class="mx-controls">${seg('risk', 'risk', [['high', 'Высокий'], ['medium', 'Средний'], ['all', 'Все']], riskFilter)}<span class="mx-chip">${list.length} учеников</span></div>
      <div class="mx-table-wrap"><table class="mx-table mx-students"><thead><tr><th>Код</th><th>Класс</th><th>Темы</th><th>Не освоено</th><th>Результат</th><th>Прирост</th><th>Тренажёр</th></tr></thead><tbody>${list.slice(0, 40).map(p => `<tr><th scope="row"><button type="button" class="mx-link" data-mx-student="${esc(p.id)}">${esc(p.id)}</button></th><td>${esc(p.cls)}</td><td><span class="mx-dots">${topics.map(t => { const v = p.topics[t]; return `<i class="tone-${!v ? 'none' : v.mastered ? 'good' : v.score <= 40 ? 'low' : 'mid'}" title="${esc(t)}: ${v ? fmt.pct0(v.score) : '—'}"></i>`; }).join('')}</span></td><td>${p.weak.length} / ${p.covered}</td><td>${fmt.pct0(p.score)}</td><td>${fmt.pp(p.gain)}</td><td>${p.live ? p.live + ' отв.' : '—'}</td></tr>`).join('')}</tbody></table></div>${list.length > 40 ? `<p class="mx-foot">Показаны первые 40. Полный список — в CSV групп.</p>` : ''}`;
    return `${kpis}
      ${card('Группы поддержки по темам', `<p class="mx-lead">Для каждой трудной темы — кто не освоил её в каждом классе. «Ядро» (≤ 40% верных) — первые кандидаты на дополнительные занятия из резерва часов.</p>${groupList}<div class="mx-actions"><button type="button" class="mx-btn primary" data-mx-action="groups-csv">${icon(I.download)}Скачать списки групп (CSV)</button><button type="button" class="mx-btn" data-mx-tab="hours">${icon(I.clock)}Связать с планом часов</button></div>`, '', 3)}
      ${card('Ученики в зоне риска', `<p class="mx-lead">Квадраты — темы программы: зелёный — освоено, янтарный — повторить, красный — ≤ 40%. Нажмите на код, чтобы открыть профиль.</p>${table}`, '', 4)}
      <p class="mx-foot">${icon(I.info)} Только псевдонимные коды. Риск — сигнал для внимания методиста и учителя, а не оценка ученика.</p>`;
  }
  function studentDrawerUI() {
    const data = viewRows();
    const p = C().studentProfiles(data, opts()).find(x => x.id === drawer.student);
    if (!p) return '';
    const topics = C().topicStats(data, opts()).map(t => t.topic);
    const live = liveRows.filter(r => r.student_id === p.id && r.subject === st.subject);
    const body = `<div class="mx-mini-kpis"><div><span>Результат</span>${num('sd:s', p.score, 'pct0')}</div><div><span>Не освоено</span>${num('sd:w', p.weak.length, 'int')}<small>из ${p.covered} тем</small></div><div><span>Прирост</span>${num('sd:g', p.gain, 'pp')}</div></div>
      <h3>Темы</h3><ul class="mx-class-bars mx-topic-mini">${topics.map(t => { const v = p.topics[t]; return `<li><span title="${esc(t)}">${esc(t)}</span>${bar('sdt:' + t, v ? v.score : 0, v ? toneOfScore(v.score) : 'none')}<b>${v ? fmt.pct0(v.score) : '—'}</b></li>`; }).join('')}</ul>
      <h3>Тренажёр</h3><p class="mx-muted">${live.length ? `${live.length} живых ответов, верно ${live.filter(r => r.correct).length}.` : 'Живых ответов пока нет.'}</p>
      <h3>Что сделать</h3><ul class="mx-todo">${p.weak.length ? p.weak.slice(0, 3).map(t => `<li>Включить в группу поддержки по теме «${esc(t)}»${p.topics[t].score <= 40 ? ' (ядро группы)' : ''}.</li>`).join('') + `<li>Назначить в тренажёре уроки и «Барыс жолы» по теме «${esc(p.weak[0])}».</li>` : '<li>Все темы освоены — можно давать задания повышенной сложности.</li>'}</ul>`;
    return `<div class="mx-drawer-backdrop" data-mx-close></div><aside class="mx-drawer" role="dialog" aria-modal="true" aria-labelledby="mx-drawer-title"><header><div><h2 id="mx-drawer-title">${esc(p.id)}</h2><p class="mx-drawer-sub">${esc(p.cls)} · ${esc(p.teacher)} · ${esc(p.book)} · ${RISK[p.risk]}</p></div><button type="button" class="mx-icon-btn" data-mx-close aria-label="Закрыть">${icon(I.close)}</button></header><div class="mx-drawer-body">${body}</div></aside>`;
  }

  function drawerUI() {
    if (drawer && drawer.student) return studentDrawerUI();
    if (!drawer) return '';
    const base = subjectRows();
    const data = drawer.className ? base.filter(r => r.class === drawer.className) : base;
    const topicRows = data.filter(r => r.topic === drawer.topic);
    const s = topicRows.length ? C().cell(topicRows, drawer.topic, '', { mastery: st.mastery }) : null;
    const classes = C().classes(base.filter(r => r.topic === drawer.topic));
    const perClass = classes.map(c => ({ c, ...C().cell(base, drawer.topic, c, { mastery: st.mastery }) }));
    const plan = insights().plan.rows.find(p => p.topic === drawer.topic);
    const bookCmp = C().compareBooks(base, { topic: drawer.topic, reps: 200 });
    const worse = (bookCmp.books || []).filter(b => b.verdict === 'worse');
    const body = !s ? '<p class="mx-muted">Нет ответов.</p>' : `
      <div class="mx-mini-kpis">
        <div><span>Результат</span>${num('dr:score', s.score, 'pct')}</div>
        <div><span>Не освоили</span>${num('dr:not', 100 * s.notMasteredShare, 'pct0')}<small>${s.notMastered} из ${s.n}</small></div>
        <div><span>Прирост</span>${num('dr:gain', s.gain, 'pp')}</div>
      </div>
      ${s.lowData ? `<div class="mx-callout tone-watch">${icon(I.warn)}<p>Мало данных — интерпретируйте осторожно.</p></div>` : ''}
      <h3>Классы</h3>
      <ul class="mx-class-bars">${perClass.map(p => `<li class="${p.c === drawer.className ? 'is-current' : ''}"><span>${esc(p.c)}</span>${bar('drc:' + p.c, p.score, toneOfScore(p.score))}<b>${fmt.pct0(p.score)}</b></li>`).join('')}</ul>
      <h3>Задания</h3>
      <ul class="mx-q">${s.questions.map(q => `<li><div class="mx-q-head"><strong>${esc(q.text)}</strong><span>${fmt.pct0(q.p)} верно</span></div>${bar('drq:' + q.id, q.p, toneOfScore(q.p))}<div class="mx-q-meta">${q.correctAnswer ? `<span class="ok">${icon(I.check)}${esc(q.correctAnswer)}</span>` : ''}${q.wrong.map(w => `<span class="bad">${esc(w.answer)} · ${fmt.pct0(100 * w.share)}</span>`).join('')}</div><div class="mx-q-foot">${q.flags.map(flagPill).join('')}<span class="mx-muted">различает: ${q.discrimination == null ? '—' : q.discrimination.toFixed(2).replace('.', ',')}</span></div></li>`).join('')}</ul>
      <h3>Что сделать</h3>
      <ul class="mx-todo">
        ${(() => { const q = s.questions.find(x => x.wrong[0] && x.total >= 10); return q ? `<li>Разобрать с учителями ошибку «${esc(q.wrong[0].answer)}» в задании ${esc(quote(q.text))}.</li>` : ''; })()}
        ${plan && plan.delta > 0 ? `<li>Добавить ${plan.delta} ч к теме (план: ${plan.base} → ${plan.recommended} ч).</li>` : ''}
        ${worse.map(b => `<li>В классах с «${esc(b.book)}» прирост ниже на ${esc(fmt.pp(Math.abs(b.diff)))} — дать дополнительные материалы.</li>`).join('')}
        ${s.status === 'ok' ? '<li>Тема освоена — достаточно поддерживающего повторения.</li>' : ''}
      </ul>`;
    return `<div class="mx-drawer-backdrop" data-mx-close></div><aside class="mx-drawer" role="dialog" aria-modal="true" aria-labelledby="mx-drawer-title"><header><div><h2 id="mx-drawer-title">${esc(drawer.topic)}</h2><p class="mx-drawer-sub">${esc(st.subject)} · ${drawer.className ? 'класс ' + esc(drawer.className) : 'вся параллель'}</p></div><button type="button" class="mx-icon-btn" data-mx-close aria-label="Закрыть">${icon(I.close)}</button></header><div class="mx-drawer-body">${body}</div></aside>`;
  }

  /* --------------------------------------------------------------- books */
  function forest(res, keyPrefix, compact) {
    const items = res.books.filter(b => b.comparable);
    const ext = Math.max(10, ...items.filter(b => !b.reference).map(b => Math.max(Math.abs(b.lo || 0), Math.abs(b.hi || 0)))) * 1.15;
    const W = compact ? 440 : 860, L = compact ? 104 : 150, R = 24, rowH = compact ? 38 : 46, H = items.length * rowH + 34;
    const x = v => L + (v + ext) / (2 * ext) * (W - L - R);
    const band = C().DEFAULTS.meaningful;
    const ticks = [-ext, -ext / 2, 0, ext / 2, ext].map(v => Math.round(v));
    return `<svg class="mx-forest${compact ? ' is-compact' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Разница прироста относительно ${esc(res.reference)} с 95% интервалами">
      <rect x="${x(-band)}" y="4" width="${x(band) - x(-band)}" height="${H - 30}" class="mx-f-band"/>
      ${ticks.map(t => `<line x1="${x(t)}" x2="${x(t)}" y1="4" y2="${H - 26}" class="${t === 0 ? 'mx-f-zero' : 'mx-f-grid'}"/><text x="${x(t)}" y="${H - 8}" text-anchor="middle" class="mx-f-tick">${t > 0 ? '+' : ''}${t}</text>`).join('')}
      ${items.map((b, i) => {
        const y = 4 + i * rowH + rowH / 2;
        const tone = b.verdict === 'better' ? 'good' : b.verdict === 'worse' ? 'low' : b.reference ? 'ref' : 'neutral';
        return `<g class="mx-f-row tone-${tone}" style="--i:${i}"><text x="8" y="${y + 4}" class="mx-f-label">${esc(short(b.book, compact ? 14 : 20))}</text>${b.reference ? `<rect x="${x(0) - 5}" y="${y - 5}" width="10" height="10" rx="2" class="mx-f-ref"/><text x="${x(0) + 12}" y="${y + 4}" class="mx-f-note">база</text>` : `<line x1="${x(b.lo)}" x2="${x(b.hi)}" y1="${y}" y2="${y}" class="mx-f-ci" pathLength="1"/><circle cx="${x(b.diff)}" cy="${y}" r="6.5" class="mx-f-dot"/><text x="${Math.min(W - 70, x(b.hi) + 10)}" y="${y + 4}" class="mx-f-note">${esc(fmt.signed(b.diff))}</text>`}</g>`;
      }).join('')}
    </svg>`;
  }
  function booksUI() {
    const data = subjectRows();
    if (!data.length) return emptyUI();
    const topics = C().topics(data);
    if (st.bookTopic && !topics.includes(st.bookTopic)) st.bookTopic = '';
    const books = C().unique(data, 'textbook');
    if (st.reference && !books.includes(st.reference)) st.reference = '';
    const res = C().compareBooks(data, { topic: st.bookTopic || null, reference: st.reference || null });
    const controls = `<div class="mx-controls">${select('bookTopic', [['', 'Все темы (с учётом темы)']].concat(topics.map(t => [t, t])), st.bookTopic, 'Тема')}${select('reference', [['', 'Авто (самый массовый)']].concat(books.map(b => [b, b])), st.reference, 'База сравнения')}<span class="mx-chip">Сравнение по всей параллели</span></div>`;
    const design = `<div class="mx-table-wrap"><table class="mx-table mx-design"><thead><tr><th>Учитель</th>${books.map(b => `<th>${esc(b)}</th>`).join('')}</tr></thead><tbody>${res.design.map(d => `<tr><th scope="row">${esc(d.teacher)}</th>${d.cells.map(c => `<td>${c.classes.length ? c.classes.map(cl => `<span class="mx-class-chip">${esc(cl)}</span>`).join('') + `<small>n ${c.n}</small>` : '<span class="mx-muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const designNote = res.state === 'blocked' || res.state === 'partial'
      ? `<div class="mx-callout tone-risk">${icon(I.warn)}<div><strong>Почему вывод ${res.state === 'blocked' ? 'заблокирован' : 'частичный'}</strong><p>${esc(res.why)}</p><strong>Что исправит</strong><ul>${res.fixes.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div></div>`
      : res.state === 'single' ? `<div class="mx-callout tone-watch">${icon(I.info)}<p>${esc(res.why)}</p></div>`
      : `<div class="mx-callout tone-good">${icon(I.check)}<p>Учебники связаны через общих учителей — разницу можно оценить внутри учителей.</p></div>`;
    let result = '';
    if (res.state === 'ok' || res.state === 'partial') {
      result = card(st.bookTopic ? 'Разница прироста · ' + esc(st.bookTopic) : 'Разница прироста · все темы', `
        <p class="mx-lead">Насколько прирост «результат − входная диагностика» отличается от «${esc(res.reference)}», при одинаковом учителе${st.bookTopic ? '' : ' и теме'}. Отрезок — 95% интервал, серая полоса — ±${C().DEFAULTS.meaningful} п.п. (практически незаметная разница).</p>
        ${forest(res, 'bk')}
        <div class="mx-table-wrap"><table class="mx-table"><thead><tr><th>Учебник</th><th>Учеников</th><th>Классы</th><th>Результат</th><th>Прирост (сырой)</th><th>Разница с учётом учителя</th><th>Вывод</th></tr></thead><tbody>${res.books.map(b => `<tr><th scope="row">${esc(b.book)}</th><td>${b.n}</td><td>${b.classes.map(esc).join(', ')}</td><td>${fmt.pct(b.rawScore)}</td><td>${fmt.pp(b.rawGain)}</td><td>${b.reference ? '—' : b.comparable ? `${fmt.pp(b.diff)}<small>ДИ ${fmt.signed(b.lo)} … ${fmt.signed(b.hi)}</small>` : '—'}</td><td>${pill(b.verdict === 'better' ? 'good' : b.verdict === 'worse' ? 'risk' : b.verdict === 'incomparable' ? 'watch' : 'neutral', VERDICT[b.verdict] || '')}</td></tr>`).join('')}</tbody></table></div>
        ${res.notes.map(n => `<p class="mx-foot">${icon(I.info)} ${esc(n)}</p>`).join('')}
        <p class="mx-foot">${icon(I.info)} Это наблюдаемая связь, а не доказанная причина: классы не распределялись между учебниками случайно.</p>`, '', 4);
    }
    let matrix = '';
    if (!st.bookTopic && (res.state === 'ok' || res.state === 'partial')) {
      const per = topics.map(t => ({ t, r: C().compareBooks(data, { topic: t, reference: res.reference, reps: 200 }) }));
      const others = books.filter(b => b !== res.reference);
      matrix = card('Учебник × тема', `<p class="mx-lead">Разница прироста с «${esc(res.reference)}» по каждой теме. Обводка — разница подтверждена (95% ДИ не включает 0). Нажмите на тему, чтобы открыть подробное сравнение.</p><div class="mx-table-wrap"><table class="mx-table mx-bt"><thead><tr><th>Тема</th>${others.map(b => `<th>${esc(b)}</th>`).join('')}</tr></thead><tbody>${per.map(({ t, r }, i) => `<tr><th scope="row"><button type="button" class="mx-link" data-mx-set="bookTopic" data-value="${esc(t)}">${esc(t)}</button></th>${others.map(b => { const x = r.books.find(y => y.book === b); if (!x || x.diff == null) return '<td><span class="mx-muted">—</span></td>'; const sig = x.lo > 0 || x.hi < 0; const a = Math.min(1, Math.abs(x.diff) / 20); return `<td><span class="mx-div mx-pop ${x.diff >= 0 ? 'pos' : 'neg'}${sig ? ' is-sig' : ''}" style="--a:${a.toFixed(2)};--i:${i}">${esc(fmt.signed(x.diff))}</span></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`, '', 5);
    }
    const method = `<details class="mx-details mx-in" style="--i:6"><summary>Как считается сравнение</summary><ol><li>Для каждого ученика по теме: прирост = доля верных ответов − входная диагностика.</li><li>Модель наименьших квадратов: прирост ~ учебник + учитель${st.bookTopic ? '' : ' + тема'}. Разница учебников оценивается внутри одного учителя.</li><li>Если учебник используется только «своими» учителями, вывод блокируется и система предлагает, какой класс перевести.</li><li>95% интервал — ${res.reps || 400} повторов бутстрэпа: ученики пересэмплируются внутри своих классов.</li><li>«Больше/меньше прирост» — только если интервал не включает 0 и разница ≥ ${C().DEFAULTS.meaningful} п.п.</li></ol></details>`;
    return `${controls}${card('Кто по какому учебнику работает', `${design}${designNote}`, '', 3)}${result}${matrix}${method}`;
  }

  /* --------------------------------------------------------------- hours */
  function hoursUI() {
    const data = viewRows();
    if (!data.length) return emptyUI();
    const plan = insights().plan;
    const maxH = Math.max(1, ...plan.rows.map(p => Math.max(p.base, p.recommended)));
    const weights = st.weights[st.subject] || {};
    const items = plan.rows.map((p, i) => `<li class="mx-hrow mx-in status-${p.status}" style="--i:${3 + i}">
      <div class="mx-h-topic"><strong>${esc(p.topic)}</strong>${p.stats ? `<span>${pill(p.stats.status, STATUS[p.stats.status])} не освоили ${fmt.pct0(100 * p.stats.notMasteredShare)} · n ${p.stats.n}</span>` : `<span>${pill('missing', 'Нет данных')}</span>`}</div>
      <div class="mx-h-base"><span class="mx-h-label">Программа</span><div class="mx-stepper"><button type="button" data-mx-hours="${esc(p.topic)}" data-delta="-1" aria-label="Уменьшить часы: ${esc(p.topic)}"${p.base <= 0 ? ' disabled' : ''}>${icon(I.minus)}</button><output>${p.base}</output><button type="button" data-mx-hours="${esc(p.topic)}" data-delta="1" aria-label="Увеличить часы: ${esc(p.topic)}">${icon(I.plus)}</button></div></div>
      <div class="mx-h-viz" aria-hidden="true"><span class="mx-hbar base">${bar('hb:' + p.topic, 100 * p.base / maxH, 'neutral')}</span><span class="mx-hbar rec">${bar('hr:' + p.topic, 100 * p.recommended / maxH, 'info')}</span></div>
      <div class="mx-h-rec"><span class="mx-h-label">Рекомендуем</span>${num('hn:' + p.topic, p.recommended, 'hours', 'big')}<span class="mx-delta ${p.delta > 0 ? 'up' : p.delta < 0 ? 'down' : 'zero'}">${p.delta > 0 ? '+' : p.delta < 0 ? '−' : '±'}${Math.abs(p.delta)}</span></div>
      <div class="mx-h-weight"><span class="mx-h-label">Важность</span>${seg('w:' + p.topic, 'weight', [[1, '1'], [2, '2'], [3, '3']], weights[p.topic] || 1, ` data-topic="${esc(p.topic)}"`)}</div>
      <p class="mx-h-reason">${esc(p.reason)}${reasonExtra(p)}</p>
    </li>`).join('');
    const summary = `<div class="mx-sum mx-in" style="--i:2">
      <div><span>Программа</span>${num('hs:base', plan.baseTotal, 'hours')}</div><i>+</i>
      <div><span>Вариативные и коррекционные часы ${helpBtn('reserve')}</span><div class="mx-stepper"><button type="button" data-mx-reserve="-1" aria-label="Уменьшить резерв"${st.reserve <= 0 ? ' disabled' : ''}>${icon(I.minus)}</button><output>${st.reserve}</output><button type="button" data-mx-reserve="1" aria-label="Увеличить резерв">${icon(I.plus)}</button></div></div><i>=</i>
      <div><span>Итого в плане</span>${num('hs:total', plan.recommendedTotal, 'hours')}</div>
      <div><span>Перенесено с освоенных тем</span>${num('hs:don', plan.donated, 'hours')}</div>
      <label class="mx-switch"><input type="checkbox" data-mx-field="rebalance"${st.rebalance ? ' checked' : ''}><span aria-hidden="true"></span>Разрешить перенос до 20% часов с хорошо освоенных тем (только если это допускает КТП)</label>
    </div>`;
    return `${summary}${plan.note ? `<div class="mx-callout tone-watch mx-in" style="--i:2">${icon(I.info)}<p>${esc(plan.note)}</p></div>` : ''}
      ${card('План по темам', `<ul class="mx-hours">${items}</ul><div class="mx-actions"><button type="button" class="mx-btn primary" data-mx-action="plan-csv">${icon(I.download)}Скачать план (CSV)</button><button type="button" class="mx-btn primary" data-mx-action="ktp-csv">${icon(I.download)}Черновик КТП (CSV)</button><button type="button" class="mx-btn" data-mx-action="reset-program">${icon(I.reset)}Сбросить программу</button><button type="button" class="mx-btn" data-mx-tab="report">${icon(I.print)}В отчёт</button></div>`, '', 3, `<span class="mx-legend"><span><i class="mx-sw tone-neutral"></i>программа</span><span><i class="mx-sw tone-info"></i>рекомендация</span></span>`)}
      <details class="mx-details mx-in" style="--i:10"><summary>Как считается рекомендация</summary><ol><li>Сетка часов программы сохраняется; меняется только распределение резерва и (по желанию) часов освоенных тем.</li><li>Потребность темы = доля не освоивших × часы темы × важность (1–3).</li><li>Резерв и перенесённые часы делятся пропорционально потребности, не больше +50% к теме, целыми часами (метод наибольших остатков).</li><li>Темы с малым числом данных не меняются — нужен дополнительный срез.</li><li>Это правило приоритизации, а не прогноз прироста баллов.</li></ol></details>`;
  }
  function reasonExtra(p) {
    if (!p.stats || p.delta <= 0) return '';
    const data = viewRows();
    const q = C().itemStats(data, p.topic).find(x => x.wrong.length && x.total >= 10);
    const cmp = C().compareBooks(subjectRows(), { topic: p.topic, reps: 200 });
    const worse = (cmp.books || []).filter(b => b.verdict === 'worse').map(b => b.book);
    return (q ? ' Частая ошибка: «' + esc(q.wrong[0].answer) + '» в задании ' + esc(quote(short(q.text, 40))) + '.' : '') + (worse.length ? ' Слабее результаты у: ' + worse.map(esc).join(', ') + ' — нужны доп. материалы.' : '');
  }

  /* -------------------------------------------------------------- report */
  // Analytical report in the format schools already use for СОР/СОЧ (ru / kk).
  function spravkaHTML(lang) {
    const kk = lang === 'kk';
    const L = (ru, k) => kk ? k : ru;
    const data = viewRows();
    const ins = insights(), m = C().schoolMetrics(data), plan = ins.plan;
    const dates = data.map(r => r.date).sort();
    const fmtD = d => d ? d.split('-').reverse().join('.') : '—';
    const subjectKk = { 'Математика': 'Математика', 'Казахский язык': 'Қазақ тілі' }[st.subject] || st.subject;
    const pct = v => v == null ? '—' : Math.round(v) + '%';
    const achieved = ins.stats.filter(x => !x.lowData && x.status === 'ok');
    const hard = ins.stats.filter(x => !x.lowData && x.status !== 'ok').sort((x, y) => y.notMasteredShare - x.notMasteredShare);
    const groups = C().supportGroups(data, opts());
    const books = ins.books;
    const key = [st.subject, st.className, st.period, st.mastery].join('|');
    const ai = aiSummary[key];
    const cell = 'border:1px solid #999;padding:4px 6px;';
    const th = cell + 'background:#eef2f7;font-weight:bold;';
    const errorOf = topic => { const p = ins.problems.find(x => x.topic === topic); return p && p.item && p.item.wrong[0] ? L(` Типичная ошибка: «${p.item.wrong[0].answer}» в задании «${p.item.text}».`, ` Жиі қате: «${p.item.text}» тапсырмасында «${p.item.wrong[0].answer}».`) : ''; };
    const recs = [];
    if (hard[0]) recs.push(L(`Провести коррекционную работу по разделам: ${hard.slice(0, 3).map(x => '«' + x.topic + '»').join(', ')}.`, `Мына бөлімдер бойынша түзету жұмысын жүргізу: ${hard.slice(0, 3).map(x => '«' + x.topic + '»').join(', ')}.`));
    if (groups[0]) recs.push(L(`Организовать группы поддержки; в первую очередь — ${groups[0].core} учащихся с результатом ≤ 40% по разделу «${groups[0].topic}».`, `Қолдау топтарын құру; бірінші кезекте — «${groups[0].topic}» бөлімі бойынша нәтижесі ≤ 40% ${groups[0].core} оқушы.`));
    recs.push(L('Обсудить типичные ошибки на заседании методического объединения, включить задания на эти ошибки в формативное оценивание.', 'Жиі қателерді әдістемелік бірлестік отырысында талқылау, оларға арналған тапсырмаларды қалыптастырушы бағалауға енгізу.'));
    const adds = plan.rows.filter(p => p.delta > 0);
    if (adds.length) recs.push(L(`Направить вариативные/коррекционные часы: ${adds.map(p => '+' + p.delta + ' ч «' + p.topic + '»').join(', ')}.`, `Вариативтік/түзету сағаттарын бағыттау: ${adds.map(p => '+' + p.delta + ' сағ. «' + p.topic + '»').join(', ')}.`));
    if (books && books.books) for (const bk of books.books.filter(x => x.verdict === 'worse')) recs.push(L(`В классах, работающих по «${bk.book}», дать дополнительные материалы по проблемным разделам (прирост ниже на ${Math.abs(Math.round(bk.diff))} п.п. с учётом учителя).`, `«${bk.book}» бойынша оқитын сыныптарға қиын бөлімдерге қосымша материал беру (мұғалімді ескергенде өсім ${Math.abs(Math.round(bk.diff))} п.т. төмен).`));
    return `<div style="font-family:'Times New Roman',serif;font-size:13pt;line-height:1.4;color:#000">
      <p style="text-align:center;font-weight:bold;margin:0">${L('АНАЛИТИЧЕСКАЯ СПРАВКА', 'ТАЛДАУ АНЫҚТАМАСЫ')}</p>
      <p style="text-align:center;margin:0 0 12pt">${L('по итогам суммативного оценивания', 'жиынтық бағалау қорытындысы бойынша')}</p>
      <p><b>${L('Предмет', 'Пән')}:</b> ${esc(kk ? subjectKk : st.subject)}. <b>${L('Классы', 'Сыныптар')}:</b> ${esc(st.className || m.classes.map(c => c.cls).join(', '))}. <b>${L('Период', 'Кезең')}:</b> ${fmtD(dates[0])} – ${fmtD(dates[dates.length - 1])}. <b>${L('Количество учащихся', 'Оқушылар саны')}:</b> ${m.total.n}.</p>
      <p><b>${L('Цель', 'Мақсаты')}:</b> ${L('анализ уровня достижения целей обучения по разделам учебной программы, выявление затруднений и планирование коррекционной работы.', 'оқу бағдарламасының бөлімдері бойынша оқу мақсаттарына жету деңгейін талдау, қиындықтарды анықтау және түзету жұмысын жоспарлау.')}</p>
      <p style="font-weight:bold;margin-top:12pt">1. ${L('Итоги по классам', 'Сыныптар бойынша қорытынды')}</p>
      <table style="border-collapse:collapse;width:100%;font-size:11pt"><tr><th style="${th}">${L('Класс', 'Сынып')}</th><th style="${th}">${L('Учащихся', 'Оқушы')}</th><th style="${th}">${L('Средний %', 'Орташа %')}</th><th style="${th}">${L('Низкий (0–39%)', 'Төмен (0–39%)')}</th><th style="${th}">${L('Средний (40–84%)', 'Орта (40–84%)')}</th><th style="${th}">${L('Высокий (85–100%)', 'Жоғары (85–100%)')}</th><th style="${th}">${L('Успеваемость', 'Үлгерім')}</th><th style="${th}">${L('Качество', 'Сапа')}</th></tr>
      ${m.classes.concat([{ cls: L('Итого', 'Барлығы'), ...m.total }]).map(c => `<tr><td style="${cell}">${esc(c.cls)}</td><td style="${cell}">${c.n}</td><td style="${cell}">${pct(c.avg)}</td><td style="${cell}">${c.levels.low}</td><td style="${cell}">${c.levels.mid}</td><td style="${cell}">${c.levels.high}</td><td style="${cell}">${pct(100 * c.progress)}</td><td style="${cell}">${pct(100 * c.quality)}</td></tr>`).join('')}</table>
      <p style="font-weight:bold;margin-top:12pt">2. ${L('Разделы, успешно освоенные учащимися', 'Оқушылар жақсы меңгерген бөлімдер')}</p>
      <p>${achieved.length ? achieved.map(x => `«${esc(x.topic)}» (${pct(x.score)})`).join('; ') + '.' : L('Разделов с высоким уровнем освоения нет.', 'Жоғары деңгейде меңгерілген бөлімдер жоқ.')}</p>
      <p style="font-weight:bold;margin-top:12pt">3. ${L('Разделы, вызвавшие затруднения', 'Қиындық туғызған бөлімдер')}</p>
      ${hard.length ? `<ul>${hard.map(x => `<li>«${esc(x.topic)}»: ${L('не освоили', 'меңгермеген')} ${Math.round(100 * x.notMasteredShare)}% (${x.notMastered} ${L('из', '/')} ${x.n}).${esc(errorOf(x.topic))}</li>`).join('')}</ul>` : `<p>${L('Существенных затруднений не выявлено.', 'Елеулі қиындықтар анықталмады.')}</p>`}
      <p style="font-weight:bold;margin-top:12pt">4. ${L('Учебники', 'Оқулықтар')}</p>
      <p>${books && (books.state === 'ok' || books.state === 'partial') ? books.books.map(bk => bk.reference ? L(`«${esc(bk.book)}» — база сравнения`, `«${esc(bk.book)}» — салыстыру негізі`) : `«${esc(bk.book)}»: ${bk.diff == null ? '—' : (bk.diff > 0 ? '+' : '') + Math.round(bk.diff * 10) / 10 + L(' п.п.', ' п.т.')} (${esc((kk ? VERDICT_KK : VERDICT)[bk.verdict] || '')})`).join('; ') + L('. Сравнение учитывает учителя; это связь, а не доказанная причина.', '. Салыстыру мұғалімді ескереді; бұл байланыс, дәлелденген себеп емес.') : esc(books && books.why ? books.why : L('Сравнение учебников по этим данным невозможно.', 'Бұл деректер бойынша оқулықтарды салыстыру мүмкін емес.'))}</p>
      <p style="font-weight:bold;margin-top:12pt">5. ${L('Выводы и рекомендации', 'Қорытынды және ұсыныстар')}</p>
      ${ai ? `<p>${esc(ai.summary)}</p>` : ''}
      <ol>${(ai && ai.actions && ai.actions.length ? ai.actions : recs).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <p style="font-weight:bold;margin-top:12pt">6. ${L('План часов (вариативный и коррекционный компонент)', 'Сағаттар жоспары (вариативтік және түзету компоненті)')}</p>
      <table style="border-collapse:collapse;width:100%;font-size:11pt"><tr><th style="${th}">${L('Раздел', 'Бөлім')}</th><th style="${th}">${L('По программе', 'Бағдарлама бойынша')}</th><th style="${th}">${L('Рекомендуется', 'Ұсынылады')}</th></tr>${plan.rows.map(p => `<tr><td style="${cell}">${esc(p.topic)}</td><td style="${cell}">${p.base}</td><td style="${cell}">${p.recommended}${p.delta ? ` (${p.delta > 0 ? '+' : ''}${p.delta})` : ''}</td></tr>`).join('')}</table>
      ${st.source === 'csv' ? '' : `<p style="font-size:10pt;color:#555;margin-top:10pt">${L('Примечание: справка составлена на демонстрационных (синтетических) данных.', 'Ескерту: анықтама демонстрациялық (синтетикалық) деректер негізінде жасалды.')}</p>`}
      <p style="margin-top:24pt">${L('Заместитель директора по учебной работе / методист', 'Директордың оқу ісі жөніндегі орынбасары / әдіскер')}: ____________________</p>
      <p>${L('Дата', 'Күні')}: ${fmtD(new Date().toISOString().slice(0, 10))}</p>
    </div>`;
  }
  function reportUI() {
    const data = viewRows();
    if (!data.length) return emptyUI();
    const key = [st.subject, st.className, st.period, st.mastery].join('|');
    const ai = aiSummary[key];
    const lang = st.docLang || st.lang;
    return `<div class="mx-actions"><span class="mx-select"><span>Язык справки</span></span>${seg('docLang', 'docLang', [['ru', 'Русский'], ['kk', 'Қазақша']], lang)}
      <button type="button" class="mx-btn primary big" data-mx-action="word">${icon(I.download)}Скачать справку (Word)</button>
      <button type="button" class="mx-btn big" data-mx-action="print">${icon(I.print)}Печать / PDF</button>
      <button type="button" class="mx-btn" data-mx-action="ai-summary"${aiAvailable && !aiBusy ? '' : ' disabled'} title="${aiAvailable ? 'Отправляются только сводные цифры, без кодов учеников' : 'ИИ доступен, если на сервере задан ANTHROPIC_API_KEY'}">${icon(I.info)}${aiBusy ? 'Формулирую выводы…' : ai ? 'Обновить выводы ИИ' : 'Выводы с помощью ИИ'}</button>${aiAvailable ? '' : '<span class="mx-chip">ИИ выключен: на сервере нет ключа</span>'}</div>
      <p class="mx-lead">Справка составлена автоматически по выбранному предмету, классу и периоду. Перед подписью проверьте выводы. ${ai ? 'Раздел «Выводы» дополнен ИИ — это черновик.' : ''}</p>
      <article class="mx-report mx-doc">${spravkaHTML(lang)}</article>`;
  }
  function downloadWord(lang) {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Справка</title><style>@page{size:A4;margin:2cm}</style></head><body>${spravkaHTML(lang)}</body></html>`;
    const blob = new Blob(['﻿' + html], { type: 'application/msword' });
    const a = doc.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${lang === 'kk' ? 'Анықтама' : 'Справка'}-${st.subject.replace(/\s+/g, '-')}${st.className ? '-' + st.className : ''}.doc`;
    doc.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------------------------------------------------------------- data */
  function importUI() {
    const pv = imp.preview;
    const subjects = C().subjects(rows);
    return `<div class="mx-import">
      <div class="mx-step"><b>1</b><div><h3>Вставьте таблицу результатов</h3><p class="mx-lead">Выделите таблицу в Excel или электронном журнале, нажмите <kbd>Ctrl</kbd>+<kbd>C</kbd>, затем щёлкните в поле ниже и нажмите <kbd>Ctrl</kbd>+<kbd>V</kbd>. Нужны колонки: <b>Ученик</b>, <b>Класс</b>, <b>Раздел</b>, <b>Балл</b>, <b>Макс. балл</b> (по-русски или по-казахски). Фамилии автоматически заменятся кодами.</p>
        <textarea class="mx-textarea" data-mx-import-text rows="6" spellcheck="false" placeholder="Ученик&#9;Класс&#9;Раздел&#9;Вид&#9;Балл&#9;Макс. балл&#10;S-0001&#9;6А&#9;Отношения и пропорции&#9;СОР&#9;7&#9;10">${esc(imp.text)}</textarea>
        <div class="mx-actions"><button type="button" class="mx-btn primary big" data-mx-action="import-check">${icon(I.check)}Проверить таблицу</button><label class="mx-btn big" for="mx-file">${icon(I.upload)}Выбрать файл</label><input type="file" id="mx-file" accept=".csv,.tsv,.txt,text/csv" data-mx-file hidden><button type="button" class="mx-btn" data-mx-action="journal-template">${icon(I.download)}Шаблон журнала СОР/СОЧ</button><button type="button" class="mx-btn" data-mx-action="template">${icon(I.download)}Подробный шаблон (по заданиям)</button></div>
        <div class="mx-drop" data-mx-drop><label for="mx-file" class="mx-drop-inner">${icon(I.upload)}<span>или перетащите файл сюда</span></label></div>
      </div></div>
      ${imp.error ? `<div class="mx-alert" role="alert">${icon(I.warn)}<p><b>Таблицу не удалось прочитать.</b> ${esc(imp.error)}</p></div>` : ''}
      ${pv ? `<div class="mx-step"><b>2</b><div><h3>Проверьте, что всё распознано верно</h3>
        <div class="mx-callout tone-good">${icon(I.check)}<div><strong>${pv.format === 'journal' ? 'Журнал СОР/СОЧ (баллы по разделам)' : 'Подробная таблица (ответы по заданиям)'}${imp.name ? ' · ' + esc(imp.name) : ''}</strong><p>${pv.students} учеников · классы: ${esc(pv.classes.join(', '))} · разделов: ${pv.topics.length} · предмет: ${esc(pv.subjects.join(', '))}</p>${pv.renamed ? `<p>Фамилии заменены кодами для ${pv.renamed} строк — личные данные не сохраняются.</p>` : ''}</div></div>
        ${pv.format === 'journal' && pv.noSubject ? `<label class="mx-select mx-subject-input"><span>Предмет</span><input type="text" list="mx-subjects" data-mx-import-subject value="${esc(imp.subject || st.subject)}"><datalist id="mx-subjects">${subjects.map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>` : ''}
        <div class="mx-table-wrap"><table class="mx-table"><thead><tr><th>Ученик</th><th>Класс</th><th>Раздел</th><th>Результат</th></tr></thead><tbody>${pv.sample.map(x => `<tr><td>${esc(x.student)}</td><td>${esc(x.cls)}</td><td>${esc(x.topic)}</td><td>${fmt.pct0(x.score)}</td></tr>`).join('')}</tbody></table></div>
      </div></div>
      <div class="mx-step"><b>3</b><div><h3>Сохраните</h3><div class="mx-actions"><button type="button" class="mx-btn primary big" data-mx-action="import-replace">${icon(I.check)}Заменить данные</button><button type="button" class="mx-btn big" data-mx-action="import-append">Добавить к текущим</button><button type="button" class="mx-btn" data-mx-action="import-cancel">Отмена</button></div></div></div>` : ''}
    </div>`;
  }
  function checkImport() {
    imp.error = ''; imp.preview = null;
    const text = imp.text || '';
    try {
      const format = C().detectFormat(text);
      let parsed, renamed = 0, noSubject = false;
      if (format === 'journal') {
        const heads = (text.split(/\r?\n/)[0] || '').toLocaleLowerCase('ru');
        noSubject = !/(предмет|пән|subject)/u.test(heads);
        const r = C().parseJournal(text, { subject: imp.subject || st.subject }); parsed = r.rows; renamed = r.renamed;
      } else if (format === 'answers') parsed = C().parseCSV(text);
      else throw new Error(format === 'empty' ? 'Поле пустое — вставьте таблицу или выберите файл.' : 'Не нашли нужные колонки. Нужны: Ученик, Класс, Раздел, Балл, Макс. балл. Скачайте «Шаблон журнала СОР/СОЧ» — в нём правильные заголовки.');
      const units = C().studentTopic(parsed);
      imp.preview = { format, rows: parsed, renamed, noSubject, students: new Set(parsed.map(x => x.student_id)).size, classes: C().unique(parsed, 'class'), topics: C().unique(parsed, 'topic'), subjects: C().unique(parsed, 'subject'), sample: units.slice(0, 6).map(u => ({ student: u.student, cls: u.cls, topic: u.topic, score: u.score })) };
    } catch (e) { imp.error = String(e.message || e); }
  }
  function applyImport(mode) {
    const pv = imp.preview; if (!pv) return;
    const next = mode === 'append' && st.source === 'csv' ? baseRows.concat(pv.rows) : mode === 'append' ? baseRows.concat(pv.rows) : pv.rows;
    liveRows = mode === 'append' ? liveRows : []; pending = mode === 'append' ? pending : [];
    setRows(next); st.source = 'csv'; st.className = '';
    const subj = C().subjects(pv.rows); if (subj.length) st.subject = subj[0];
    notice = `Загружено: ${pv.students} учеников, ${pv.topics.length} разделов. Откройте «Итоги» или «Справку».`;
    imp = { text: '', preview: null, error: '', name: '', subject: '' };
    save(); render('enter');
  }
  function dataUI() {
    const subjects = C().subjects(rows);
    const quality = subjects.map(s => {
      const r = rows.filter(x => x.subject === s);
      const cmp = C().compareBooks(r, { reps: 0 });
      const stats = C().topicStats(r, { mastery: st.mastery });
      const dates = r.map(x => x.date).sort();
      const checks = [
        [cmp.state === 'ok', cmp.state === 'ok' ? 'Учебники связаны через общих учителей — сравнение возможно' : cmp.state === 'single' ? 'Один учебник — сравнение невозможно' : 'Учебник и учитель смешаны — сравнение ограничено'],
        [!stats.some(t => t.lowData), stats.some(t => t.lowData) ? 'Темы с малым числом данных: ' + stats.filter(t => t.lowData).map(t => t.topic).join(', ') : 'По всем темам достаточно данных'],
        [r.every(x => x.question_text), r.every(x => x.question_text) ? 'Тексты заданий есть' : 'Нет текстов части заданий — в разборе будут только коды'],
        [r.some(x => x.answer), r.some(x => x.answer) ? 'Неверные ответы указаны — анализ ошибок доступен' : 'Нет колонки answer — типичные ошибки не определяются']
      ];
      return `<article class="mx-q-card mx-in" style="--i:4"><h3>${esc(s)}</h3><dl><div><dt>Учеников</dt><dd>${new Set(r.map(x => x.student_id)).size}</dd></div><div><dt>Классов</dt><dd>${C().unique(r, 'class').length}</dd></div><div><dt>Учителей</dt><dd>${C().unique(r, 'teacher').length}</dd></div><div><dt>Учебников</dt><dd>${C().unique(r, 'textbook').length}</dd></div><div><dt>Тем</dt><dd>${stats.length}</dd></div><div><dt>Период</dt><dd>${dates[0] || '—'} — ${dates[dates.length - 1] || '—'}</dd></div></dl><ul class="mx-checks">${checks.map(([ok, t]) => `<li class="${ok ? 'ok' : 'warn'}">${icon(ok ? I.check : I.warn)}${esc(t)}</li>`).join('')}</ul></article>`;
    }).join('');
    const cols = [['student_id', 'Код ученика (без ФИО)'], ['class', 'Класс'], ['teacher', 'Учитель (можно код)'], ['subject', 'Предмет'], ['textbook', 'Учебник'], ['topic', 'Тема программы'], ['question_id', 'Код задания'], ['correct', '1 — верно, 0 — неверно'], ['pretest', 'Входная диагностика по теме, 0–100'], ['date', 'Дата, ГГГГ-ММ-ДД'], ['question_text', 'Текст задания (необязательно)'], ['answer', 'Ответ ученика (необязательно)'], ['correct_answer', 'Верный ответ (необязательно)']];
    return `${card('Загрузить результаты СОР/СОЧ', importUI(), '', 1)}${card('Источник данных', `<p class="mx-lead">${st.source === 'csv' ? `Загружены данные школы: ${fmt.int(baseRows.length)} ответов.` : `Демо-школа: 6 классов, 3 учителя и 3 учебника по каждому предмету. Данные синтетические и подписаны так везде.`}${liveRows.length ? ` Плюс ${liveRows.length} живых ответов из тренажёра ученика.` : ''}</p>
      <div class="mx-controls">${select('scenario', [['clean', 'Демо: учителя ведут разные учебники'], ['confounded', 'Демо: у каждого учителя один учебник']], st.source === 'csv' ? '' : st.scenario, 'Демо-сценарий')}</div>
      <div class="mx-actions"><button type="button" class="mx-btn" data-mx-action="export">${icon(I.download)}Экспорт текущих данных</button>${st.source === 'csv' || liveRows.length ? `<button type="button" class="mx-btn" data-mx-action="demo">${icon(I.reset)}Вернуть демо-данные</button>` : ''}</div>
      <p class="mx-foot">${icon(I.info)} Данные хранятся только в этом браузере. Не вводите ФИО — достаточно кодов учеников.${storageError ? ' Браузер не дал сохранить данные: после перезагрузки они пропадут.' : ''}</p>`, '', 2)}
      <div class="mx-grid two">${quality}</div>
      ${card('Формат CSV', `<div class="mx-table-wrap"><table class="mx-table"><thead><tr><th>Колонка</th><th>Что означает</th></tr></thead><tbody>${cols.map(([c, d]) => `<tr><td><code>${c}</code></td><td>${d}</td></tr>`).join('')}</tbody></table></div>`, '', 5)}
      ${card('Живые ответы из тренажёра', liveRows.length || pending.length ? `<ul class="mx-live">${pending.slice(-6).reverse().map(p => `<li><span class="mx-dot tone-${p.linked ? 'good' : 'watch'}"></span><span>${esc(p.questionText || p.questionId)}</span><small>${p.correct ? 'верно' : 'неверно'} · ${esc(p.date)}${p.linked ? ' · ' + esc(p.context.class) + ' / ' + esc(p.context.student_id) : ' · не привязан к ученику'}</small></li>`).join('')}</ul>` : '<p class="mx-muted">Переключитесь в режим «Ученик», выберите класс и код ученика и пройдите урок — ответы появятся здесь и в аналитике по казахскому языку.</p>', '', 6)}`;
  }

  /* -------------------------------------------------------------- render */
  function render(mode) {
    if (!host || !C()) return;
    renderNav();
    const tab = TABS.find(t => t.id === st.tab) || TABS[0];
    const views = { home: homeUI, overview: overviewUI, topics: topicsUI, students: studentsUI, books: booksUI, hours: hoursUI, report: reportUI, data: dataUI };
    const focusKey = doc && doc.activeElement && host.contains(doc.activeElement) ? focusId(doc.activeElement) : null;
    const scrollY = global.scrollY;
    host.classList.add('metodist');
    if (host.style) host.style.zoom = st.zoom;
    host.innerHTML = `<div class="mx" data-tab="${tab.id}">
      <header class="mx-head"><div><h1>${esc(tabText(tab, 1))}</h1><p>${esc(tabText(tab, 2))}</p></div><div class="mx-head-side">${prefsUI()}${sourceChip()}</div></header>
      <nav class="mx-tabs-m" aria-label="Разделы методиста">${TABS.map(tb => `<button type="button" data-mx-tab="${tb.id}" aria-pressed="${tb.id === st.tab}">${esc(tabText(tb, 0))}</button>`).join('')}</nav>
      ${error ? `<div class="mx-alert" role="alert">${icon(I.warn)}<p>${esc(error)}</p><button type="button" class="mx-icon-btn" data-mx-action="dismiss" aria-label="Скрыть">${icon(I.close)}</button></div>` : ''}
      ${notice ? `<div class="mx-notice" role="status">${icon(I.info)}<p>${esc(notice)}</p><button type="button" class="mx-icon-btn" data-mx-action="dismiss" aria-label="Скрыть">${icon(I.close)}</button></div>` : ''}
      ${tab.id === 'data' || tab.id === 'home' ? '' : filtersUI()}
      <div class="mx-view${mode === 'enter' ? ' is-entering' : ''}">${views[tab.id]()}</div>
      ${drawerUI()}
    </div>`;
    if (mode !== 'enter') global.scrollTo && global.scrollTo(0, scrollY);
    if (focusKey) { const el = host.querySelector(focusKey); if (el) el.focus({ preventScroll: true }); }
    animate(mode);
  }
  function focusId(el) {
    const attrs = ['data-mx-tab', 'data-mx-set', 'data-mx-field', 'data-mx-hours', 'data-mx-reserve', 'data-mx-topic', 'data-mx-action'];
    for (const a of attrs) if (el.hasAttribute && el.hasAttribute(a)) {
      let sel = `[${a}="${CSS && CSS.escape ? CSS.escape(el.getAttribute(a)) : el.getAttribute(a)}"]`;
      if (el.dataset.value != null) sel += `[data-value="${CSS && CSS.escape ? CSS.escape(el.dataset.value) : el.dataset.value}"]`;
      if (el.dataset.delta != null) sel += `[data-delta="${el.dataset.delta}"]`;
      if (el.dataset.topic != null) sel += `[data-topic="${CSS && CSS.escape ? CSS.escape(el.dataset.topic) : el.dataset.topic}"]`;
      return sel;
    }
    return null;
  }

  /* ----------------------------------------------------------- animation */
  function animate(mode) {
    if (!host || !host.querySelectorAll) return;
    const still = reduced();
    const bars = [...host.querySelectorAll('[data-bar]')];
    const nums = [...host.querySelectorAll('[data-num]')];
    // Segmented controls: the active copy is revealed with clip-path, gliding from the previous option.
    const segs = [...host.querySelectorAll('.mx-seg')].map(s => {
      const btn = s.querySelector('button[aria-pressed="true"]'), layer = s.querySelector('.mx-seg-active');
      if (!btn || !layer || !s.offsetWidth) return null;
      const W = s.offsetWidth, l = btn.offsetLeft, r = W - btn.offsetLeft - btn.offsetWidth;
      const to = `inset(4px ${r}px 4px ${l}px round 9px)`;
      const from = prevSeg.get(s.dataset.seg) || to;
      layer.style.transition = 'none'; layer.style.clipPath = from;
      prevSeg.set(s.dataset.seg, to);
      return { layer, to };
    }).filter(Boolean);
    // Data bars morph from their previous value (filters) or grow once when a section opens.
    bars.forEach(el => {
      const to = Number(el.dataset.to), key = el.dataset.key;
      const from = still ? to : prevBars.has(key) ? prevBars.get(key) : mode === 'enter' ? 0 : to;
      el.style.transition = 'none'; el.style.clipPath = clip(from);
      prevBars.set(key, to);
    });
    void host.offsetWidth;
    raf(() => {
      segs.forEach(({ layer, to }) => { layer.style.transition = ''; layer.style.clipPath = to; });
      bars.forEach(el => { el.style.transition = ''; el.style.clipPath = clip(Number(el.dataset.to)); });
    });
    nums.forEach(el => {
      const to = Number(el.dataset.num), key = el.dataset.key, kind = el.dataset.fmt;
      if (el.dataset.num === '' || !Number.isFinite(to)) return;
      const from = prevNums.has(key) ? prevNums.get(key) : mode === 'enter' ? 0 : to;
      prevNums.set(key, to);
      if (still || from === to) { el.textContent = fmt[kind](to); return; }
      const start = global.performance ? global.performance.now() : Date.now(), dur = 520;
      // Same curve as the bars (ease-in-out for on-screen morphing).
      const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const step = now => {
        const t = Math.min(1, ((now || Date.now()) - start) / dur), v = from + (to - from) * ease(t);
        el.textContent = fmt[kind](kind === 'int' || kind === 'hours' ? Math.round(v) : v);
        if (t < 1 && el.isConnected !== false) raf(step);
      };
      raf(step);
    });
  }

  function go(tab) {
    if (tab === st.tab) { global.scrollTo && global.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }); return; }
    const view = host && host.querySelector && host.querySelector('.mx-view');
    const swap = () => { st.tab = tab; drawer = null; save(); render('enter'); global.scrollTo && global.scrollTo({ top: 0 }); };
    if (view && view.animate) { view.classList.add('is-leaving'); setTimeout(swap, 120); }
    else swap();
  }
  function openDrawer(topic, className) { drawer = { topic, className: className || '' }; render('update'); const d = host.querySelector('.mx-drawer'); if (d) { d.classList.add('is-opening'); const b = d.querySelector('[data-mx-close]'); if (b) b.focus({ preventScroll: true }); } if (doc) doc.body.classList.add('mx-lock'); }
  function closeDrawer() {
    const d = host.querySelector('.mx-drawer'), bd = host.querySelector('.mx-drawer-backdrop');
    const done = () => { drawer = null; if (doc) doc.body.classList.remove('mx-lock'); render('update'); };
    if (d) { d.classList.add('is-closing'); if (bd) bd.classList.add('is-closing'); setTimeout(done, reduced() ? 120 : 200); } else done();
  }
  async function requestSummary() {
    if (aiBusy || !aiAvailable) return;
    aiBusy = true; render('update');
    const key = [st.subject, st.className, st.period, st.mastery].join('|');
    try {
      const payload = C().summaryPayload(viewRows(), program(), { mastery: st.mastery, reserve: st.reserve, rebalance: st.rebalance, weights: st.weights[st.subject] || {}, compareRows: subjectRows(), reps: 200 });
      const res = await fetch('./api/summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(String(res.status));
      aiSummary[key] = await res.json();
      toast('Выводы ИИ добавлены в отчёт.');
    } catch (_) {
      if (String(_ && _.message) === '503') aiAvailable = false;
      notice = 'ИИ сейчас недоступен — в отчёте остаются автоматические выводы по правилам.';
    }
    aiBusy = false; render('update');
  }
  function showHelp(btn, key) {
    const [title, text] = HELP[key] || ['', ''];
    const root = host.querySelector('.mx');
    const pop = doc.createElement('div');
    pop.className = 'mx-popover'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', title);
    pop.innerHTML = `<strong>${esc(title)}</strong><p>${esc(text)}</p><button type="button" class="mx-btn" data-mx-popclose>Понятно</button>`;
    root.appendChild(pop);
    const r = btn.getBoundingClientRect(), rr = root.getBoundingClientRect(), z = st.zoom || 1;
    const left = Math.max(8, Math.min((r.left - rr.left) / z - 140, rr.width / z - 312));
    pop.style.left = left + 'px'; pop.style.top = ((r.bottom - rr.top) / z + 8) + 'px';
    pop.querySelector('[data-mx-popclose]').addEventListener('click', () => pop.remove());
    pop.querySelector('button').focus({ preventScroll: true });
  }
  function toast(text) {
    if (!doc || !doc.createElement) return;
    let el = doc.querySelector('.mx-toast');
    if (!el) { el = doc.createElement('div'); el.className = 'mx-toast'; el.setAttribute('role', 'status'); doc.body.appendChild(el); }
    el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function download(name, text) {
    const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    const a = doc.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; doc.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importText(text, name) {
    imp.text = text; imp.name = name || ''; checkImport();
    if (imp.preview || imp.error) { st.tab = 'data'; return render('update'); }
    try {
      const parsed = C().parseCSV(text);
      liveRows = []; pending = []; setRows(parsed); st.source = 'csv'; st.className = ''; st.program = {}; st.weights = {}; error = '';
      const subjects = C().subjects(parsed); if (subjects.length) st.subject = subjects[0];
      notice = parsed.length ? `Загружено ${parsed.length} ответов из «${name}».` : 'Файл содержит только заголовок — данных пока нет.';
      save(); render('enter');
    } catch (e) { error = e.message; render('update'); }
  }

  /* -------------------------------------------------------------- events */
  function onClick(event) {
    const t = event.target.closest ? event.target.closest('[data-mx-help],[data-mx-tab],[data-mx-set],[data-mx-topic],[data-mx-student],[data-mx-close],[data-mx-hours],[data-mx-reserve],[data-mx-action],[data-mx-import]') : null;
    const pop = host && host.querySelector('.mx-popover');
    if (pop && !(event.target.closest && event.target.closest('.mx-popover'))) pop.remove();
    if (!t) return;
    if (t.dataset.mxHelp) { event.preventDefault(); return showHelp(t, t.dataset.mxHelp); }
    const d = t.dataset;
    if (d.mxTab) return go(d.mxTab);
    if (d.mxClose !== undefined) return closeDrawer();
    if (d.mxTopic) return openDrawer(d.mxTopic, d.class != null ? d.class : st.className);
    if (d.mxStudent) { drawer = { student: d.mxStudent }; render('update'); const dr = host.querySelector('.mx-drawer'); if (dr) { dr.classList.add('is-opening'); const b = dr.querySelector('[data-mx-close]'); if (b) b.focus({ preventScroll: true }); } if (doc) doc.body.classList.add('mx-lock'); return; }
    if (d.mxSet) {
      const v = d.value;
      if (d.mxSet === 'subject') { st.subject = v; st.className = ''; st.bookTopic = ''; st.reference = ''; }
      else if (d.mxSet === 'period') st.period = Number(v);
      else if (d.mxSet === 'bookTopic') st.bookTopic = v;
      else if (d.mxSet === 'risk') riskFilter = v;
      else if (d.mxSet === 'docLang') st.docLang = v === 'kk' ? 'kk' : 'ru';
      else if (d.mxSet === 'zoom') { st.zoom = Number(v); prevSeg.clear(); save(); return render('enter'); }
      else if (d.mxSet === 'lang') { st.lang = v === 'kk' ? 'kk' : 'ru'; save(); return render('enter'); }
      else if (d.mxSet === 'weight') { st.weights[st.subject] = { ...(st.weights[st.subject] || {}), [d.topic]: Number(v) }; }
      save(); return render(d.mxSet === 'bookTopic' ? 'enter' : 'update');
    }
    if (d.mxHours) {
      const p = program().find(x => x.topic === d.mxHours);
      if (p) p.hours = Math.max(0, Math.min(200, (Number(p.hours) || 0) + Number(d.delta)));
      memo.clear(); save(); return render('update');
    }
    if (d.mxReserve) { st.reserve = Math.max(0, Math.min(100, st.reserve + Number(d.mxReserve))); save(); return render('update'); }
    const a = d.mxAction;
    if (a === 'dismiss') { error = ''; notice = ''; return render('update'); }
    if (a === 'print') return global.print && global.print();
    if (a === 'word') { downloadWord(st.docLang || st.lang); return toast('Справка скачана в формате Word (.doc).'); }
    if (a === 'ktp-csv') { const plan = insights().plan; download('jaz-ktp-' + st.subject.replace(/\s+/g, '-') + '.csv', C().ktpCSV(plan, Math.max(1, Math.round(plan.baseTotal / 9)))); return toast('Черновик КТП скачан: часы и недели по темам.'); }
    if (a === 'import-check') { const ta = host.querySelector('[data-mx-import-text]'); imp.text = ta ? ta.value : imp.text; const si = host.querySelector('[data-mx-import-subject]'); if (si) imp.subject = si.value; checkImport(); return render('update'); }
    if (a === 'import-replace' || a === 'import-append') { const si = host.querySelector('[data-mx-import-subject]'); if (si && si.value && si.value !== imp.subject) { imp.subject = si.value; checkImport(); } return applyImport(a === 'import-append' ? 'append' : 'replace'); }
    if (a === 'import-cancel') { imp = { text: '', preview: null, error: '', name: '', subject: '' }; return render('update'); }
    if (a === 'journal-template') { download('jaz-zhurnal-SOR-SOCH.csv', C().journalTemplate().replace(/\t/g, ';')); return toast('Шаблон журнала скачан: откройте его в Excel, заполните и вставьте сюда.'); }
    if (a === 'groups-csv') { download('jaz-groups-' + st.subject.replace(/\s+/g, '-') + '.csv', C().groupsCSV(C().supportGroups(viewRows(), opts()))); return toast('Списки групп поддержки скачаны.'); }
    if (a === 'ai-summary') return requestSummary();
    if (a === 'template') { download('jaz-template.csv', C().templateCSV(baseRows.slice(0, 30))); return toast('Шаблон скачан: первые строки — пример заполнения.'); }
    if (a === 'export') { download('jaz-data.csv', C().exportCSV(rows)); return toast('Данные выгружены в CSV.'); }
    if (a === 'plan-csv') { download('jaz-plan-' + st.subject.replace(/\s+/g, '-') + '.csv', C().planCSV(insights().plan)); return toast('План часов скачан.'); }
    if (a === 'reset-program') { delete st.program[st.subject]; delete st.weights[st.subject]; memo.clear(); save(); toast('Программа восстановлена.'); return render('update'); }
    if (a === 'demo') { liveRows = []; pending = []; st.source = 'demo'; st.program = {}; st.weights = {}; setRows(C().build(st.scenario)); notice = 'Загружены демо-данные.'; save(); return render('enter'); }
  }
  function onChange(event) {
    const t = event.target;
    if (t.matches && t.matches('[data-mx-file]')) { const f = t.files && t.files[0]; if (f) f.text().then(text => importText(text, f.name)); return; }
    const field = t.dataset && t.dataset.mxField;
    if (!field) return;
    if (field === 'className') st.className = t.value;
    else if (field === 'mastery') st.mastery = Number(t.value);
    else if (field === 'bookTopic') st.bookTopic = t.value;
    else if (field === 'reference') st.reference = t.value;
    else if (field === 'rebalance') st.rebalance = t.checked;
    else if (field === 'scenario') { st.scenario = t.value === 'confounded' ? 'confounded' : 'clean'; st.source = 'demo'; liveRows = []; pending = []; st.program = {}; setRows(C().build(st.scenario)); notice = st.scenario === 'confounded' ? 'Сценарий «учитель = учебник»: посмотрите, как блокируется сравнение учебников.' : 'Сценарий с перекрёстным распределением учебников.'; }
    save(); render(field === 'scenario' ? 'enter' : 'update');
  }
  function onKey(event) { if (event.key === 'Escape' && drawer) closeDrawer(); }
  function onDrop(event) {
    const zone = event.target.closest && event.target.closest('[data-mx-drop]');
    if (!zone) return;
    event.preventDefault();
    if (event.type === 'dragover') { zone.classList.add('is-over'); return; }
    if (event.type === 'dragleave') { zone.classList.remove('is-over'); return; }
    zone.classList.remove('is-over');
    const f = event.dataTransfer && event.dataTransfer.files[0];
    if (f) f.text().then(text => importText(text, f.name));
  }

  /* ----------------------------------------------- student trainer link */
  // Any subject: the trainer now covers both Kazakh and Mathematics.
  function studentRows() { return rows; }
  function renderStudentContext(container) {
    if (!container) return;
    studentHost = container;
    if (!C()) { container.innerHTML = ''; return; }
    const available = studentRows();
    if (!available.length) { container.innerHTML = '<p class="met-student-note">Казақ тілі бойынша деректер жоқ — жауаптар талдауға қосылмайды.</p>'; return; }
    const classes = C().unique(available, 'class');
    if (selection && !available.some(r => r.class === selection.class && (!selection.student_id || r.student_id === selection.student_id))) selection = null;
    if (!selection && st.source === 'demo') selection = { class: available[0].class, student_id: available[0].student_id };
    const chosen = selection ? selection.class : '';
    const students = C().unique(available.filter(r => r.class === chosen), 'student_id');
    container.innerHTML = `<details class="met-student-context"><summary>Оқу деректері${selection && selection.student_id ? ` · ${esc(selection.class)} / ${esc(selection.student_id)}` : ''}</summary><div class="met-controls"><label>Сынып<select data-met-student-class>${['<option value="">Сыныпты таңдаңыз</option>'].concat(classes.map(c => `<option value="${esc(c)}"${c === chosen ? ' selected' : ''}>${esc(c)}</option>`)).join('')}</select></label><label>Оқушы коды<select data-met-student-id>${['<option value="">Кодты таңдаңыз</option>'].concat(students.map(s => `<option value="${esc(s)}"${selection && s === selection.student_id ? ' selected' : ''}>${esc(s)}</option>`)).join('')}</select></label></div><p>Сабақтағы жауаптар әдіскердің талдауына осы код арқылы қосылады.</p></details>`;
    if (!container.dataset.mxBound) {
      container.dataset.mxBound = '1';
      container.addEventListener('change', event => {
        if (event.target.matches('[data-met-student-class]')) { selection = { class: event.target.value, student_id: '' }; save(); renderStudentContext(container); const det = container.querySelector('details'); if (det) det.open = true; }
        if (event.target.matches('[data-met-student-id]')) { selection = { class: container.querySelector('[data-met-student-class]').value, student_id: event.target.value }; save(); }
      });
    }
  }
  function recordAnswer(payload) {
    if (!payload || typeof payload.lessonId !== 'string' || typeof payload.questionId !== 'string' || ![true, false, 0, 1].includes(payload.correct)) return;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(payload.date || '') ? payload.date : new Date().toISOString().slice(0, 10);
    const topic = typeof payload.topic === 'string' && payload.topic ? payload.topic : C().LESSON_TOPICS[payload.lessonId] || String(payload.lessonTitle || payload.lessonId);
    const subjectName = typeof payload.subject === 'string' && payload.subject ? payload.subject : 'Казахский язык';
    const answer = { lessonId: payload.lessonId, subject: subjectName, topic, questionId: payload.questionId, questionText: String(payload.questionText || ''), correct: Boolean(payload.correct), date, context: selection ? { ...selection } : null, linked: false };
    const baseline = selection && selection.student_id && studentRows().find(r => r.class === selection.class && r.student_id === selection.student_id && r.subject === subjectName && r.topic === topic);
    if (baseline) {
      addLive({ ...baseline, question_id: 'live-' + payload.questionId, question_text: answer.questionText, correct: answer.correct ? 1 : 0, answer: String(payload.answer || ''), correct_answer: String(payload.correctAnswer || ''), date });
      answer.linked = true;
    }
    pending.push(answer); save();
    if (doc && doc.body && doc.body.dataset.mode === 'method') render('update');
  }

  function mount(container) {
    if (!container) return;
    if (!C()) { container.textContent = 'Модуль аналитики не загружен. Обновите страницу.'; return; }
    if (host !== container) {
      if (host) { host.removeEventListener('click', onClick); host.removeEventListener('change', onChange); }
      host = container;
      host.addEventListener('click', onClick);
      host.addEventListener('change', onChange);
      host.addEventListener('input', e => { if (e.target.matches && e.target.matches('[data-mx-import-text]')) imp.text = e.target.value; if (e.target.matches && e.target.matches('[data-mx-import-subject]')) imp.subject = e.target.value; });
      ['dragover', 'dragleave', 'drop'].forEach(type => host.addEventListener(type, onDrop));
      if (doc && doc.addEventListener) doc.addEventListener('keydown', onKey);
    }
    navHost = doc && doc.getElementById ? doc.getElementById('method-nav') : null;
    if (global.fetch) global.fetch('./api/status').then(r => r.ok ? r.json() : null).then(d => { const was = aiAvailable; aiAvailable = !!(d && d.ai); if (was !== aiAvailable && st.tab === 'report') render('update'); }).catch(() => {});
    render('enter');
  }
  function unmount() { if (doc && doc.body) doc.body.classList.remove('mx-lock'); drawer = null; }

  global.JazMetodist = { mount, unmount, renderStudentContext, recordAnswer, _state: () => ({ st, rows, liveRows, pending }) };
  if (C()) restore();
})(window);
