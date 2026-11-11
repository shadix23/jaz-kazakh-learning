(() => {
  'use strict';
  const L = window.JazLearning;
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    book: '<path d="M12 5v16M3 3h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z"/>',
    chat: '<path d="M21 11a8 8 0 0 1-8 8H5l-4 3 2-7a8 8 0 0 1-1-4 9 9 0 0 1 19 0Z"/><path d="M7 11h.01M12 11h.01M17 11h.01"/>',
    progress: '<path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/><path d="m15 6 3-3 3 3m-3-3v7"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    spark: '<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8z"/>',
    flame: '<path d="M12 2c1 5-4 6-4 10 0 2 1 3 2 3-1-4 5-5 4-9 5 4 6 8 4 12-1 3-4 4-7 4-5 0-8-3-8-7 0-5 6-8 9-13Z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8a2.8 2.8 0 0 1 5 1.5C14.5 12 12 11.5 12 14m0 3h.01"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    cinema: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M7 5l3 5m4-5 3 5M3 5l3-3 4 3m1 9 4 2-4 2z"/>',
    teacher: '<path d="m2 8 10-5 10 5-10 5zM6 10v7c4 3 8 3 12 0v-7m4-2v9"/>',
    social: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    gaming: '<path d="M7 7h10c3 0 4 4 4 8 0 5-3 4-6 0H9c-3 4-6 5-6 0 0-4 1-8 4-8Z"/><path d="M6 11h4m-2-2v4m8-2h.01m3 2h.01"/>',
    send: '<path d="m3 3 19 9-19 9 4-9zM7 12h15"/>',
    pencil: '<path d="m4 16 12-12 4 4L8 20H4zM14 6l4 4M3 22h18"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 7a8 8 0 0 1 13-2l2 3M4 16l2 3a8 8 0 0 0 13-2"/>',
    trophy: '<path d="M7 3h10v7a5 5 0 0 1-10 0zM7 5H3v4a4 4 0 0 0 4 4m10-8h4v4a4 4 0 0 1-4 4m-5 2v6m-4 0h8"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    run: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1.4 1.3-2.2 3-2.2s3 .8 3 2.2-1.3 2-3 2.5-3 1.1-3 2.5 1.3 2.2 3 2.2 3-.8 3-2.2"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>'
  };
  const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  const P = window.JazPractice;
  const nav = [{ id: 'home', label: 'Басты бет', icon: 'home' }, { id: 'lessons', label: 'Сабақтар', icon: 'book' }, { id: 'game', label: 'Барыс жолы', icon: 'run' }, { id: 'chat', label: 'Чат ойыны', icon: 'chat' }, { id: 'progress', label: 'Жетістіктер', icon: 'progress' }];
  let storageWarning = false;
  function readStorage(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function saveStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { storageWarning = true; } }
  let progress = L.sanitizeState(readStorage('jaz.progress.v1', null));
  let appMode = readStorage('jaz.mode.v1', 'method') === 'student' ? 'student' : 'method';
  let theme = readStorage('jaz.theme.v1', 'light') === 'dark' ? 'dark' : 'light';
  let subject = readStorage('jaz.subject.v1', P.KAZ) === P.MATH ? P.MATH : P.KAZ;
  let aiAvailable = false;
  fetch('./api/status').then((r) => r.ok ? r.json() : null).then((d) => { aiAvailable = !!(d && d.ai); }).catch(() => {});
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    const label = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
    $('[data-action="theme"]').setAttribute('aria-label', label);
    $('[data-action="theme"]').title = label;
  }
  let sessions = {};
  const savedChats = readStorage('jaz.chats.v1', {});
  for (const scenario of L.scenarios) {
    const saved = savedChats && savedChats[scenario.id];
    if (!saved || !Array.isArray(saved.messages)) continue;
    const messages = saved.messages.filter((m) => m && ['mentor', 'you', 'correction'].includes(m.role) && typeof m.text === 'string' && m.text.length <= 1600).slice(-80).map((m) => ({ role: m.role, text: m.text, original: typeof m.original === 'string' ? m.original.slice(0, 500) : '', resolved: m.resolved === true, time: typeof m.time === 'string' ? m.time.slice(0, 8) : '', ...(typeof m.corrected === 'string' ? { corrected: m.corrected.slice(0, 600), issues: Array.isArray(m.issues) ? m.issues.slice(0, 12).filter((i) => i && typeof i.from === 'string' && typeof i.to === 'string').map((i) => ({ from: i.from.slice(0, 120), to: i.to.slice(0, 120), reason: String(i.reason || '').slice(0, 300) })) : [], source: m.source === 'ai' ? 'ai' : 'rules', reply: typeof m.reply === 'string' ? m.reply.slice(0, 400) : '' } : {}) }));
    sessions[scenario.id] = { messages, turn: messages.filter((m) => m.role === 'you').length, draft: '' };
  }
  let route = 'home';
  let scenarioId = L.scenarios.some((s) => s.id === readStorage('jaz.scenario.v1', 'cinema')) ? readStorage('jaz.scenario.v1', 'cinema') : 'cinema';
  let deckIndex = 0;
  let lessonRun = null;
  let toastTimer;
  let busy = false;
  const seenChatMessages = new WeakSet();
  const openedChatScenarios = new Set();
  function day() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function time() { return new Intl.DateTimeFormat('kk-KZ', { hour: '2-digit', minute: '2-digit' }).format(new Date()); }
  function todayEvents() { return progress.events.filter((event) => event.day === day()); }
  function todayXp() { return todayEvents().reduce((total, event) => total + event.xp, 0); }
  function practicesToday() { return todayEvents().filter((event) => event.type === 'practice'); }
  function activeScenario() { return L.scenarios.find((s) => s.id === scenarioId) || L.scenarios[0]; }
  function session() {
    if (!sessions[scenarioId]) sessions[scenarioId] = { messages: [{ role: 'mentor', text: activeScenario().opening, time: time() }], turn: 0, draft: '' };
    if (!sessions[scenarioId].messages.length) sessions[scenarioId].messages.push({ role: 'mentor', text: activeScenario().opening, time: time() });
    return sessions[scenarioId];
  }
  function pendingCorrection() { const current = session(); return [...current.messages].reverse().find((m) => m.role === 'correction' && !m.resolved && m.original === current.selectedOriginal) || [...current.messages].reverse().find((m) => m.role === 'correction' && !m.resolved); }
  function saveChats() { saveStorage('jaz.chats.v1', sessions); }
  function notify(text) { clearTimeout(toastTimer); $('#toast').textContent = text; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
  function award(event) {
    const before = progress.xp;
    progress = L.reduceProgress(progress, { ...event, day: day() });
    saveStorage('jaz.progress.v1', progress);
    updateStats();
    const earned = progress.xp - before;
    if (earned) {
      notify(`+${earned} XP · ${progress.level > Math.floor(before / 100) + 1 ? 'Жаңа деңгейге өттің!' : 'Жарайсың, жалғастыра бер!'}`);
      window.JazMotion?.react('success');
    }
    return earned;
  }
  function updateStats() {
    $('#xp').textContent = progress.xp;
    $('#streak').textContent = L.getStreak(progress, day());
    $('#level').textContent = `${progress.level}-деңгей`;
    $('#sidebar-goal').textContent = Math.min(todayXp(), 30);
    $('#sidebar-meter').style.width = `${Math.min(todayXp() / 30 * 100, 100)}%`;
    $('#sidebar-level').textContent = `${progress.level}-деңгей · ${progress.level === 1 ? 'Жаңа қадам' : 'Алға басу'}`;
  }
  function renderNavigation() {
    for (const [selector, desktop] of [['#desktop-nav', true], ['#mobile-nav', false]]) {
      const container = $(selector);
      if (!container.querySelector('.nav-item')) {
        container.innerHTML = `${desktop ? '<span class="nav-active-indicator" aria-hidden="true"></span>' : ''}${nav.map((item) => `<a class="nav-item" href="#${item.id}">${icon(item.icon)}<span>${item.label}</span></a>`).join('')}`;
      }
      container.style.setProperty('--active-row', String(nav.findIndex((item) => item.id === route)));
      for (const link of container.querySelectorAll('.nav-item')) {
        const active = link.getAttribute('href') === `#${route}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    }
    $('#page-location').textContent = nav.find((item) => item.id === route).label;
  }
  const GLYPHS = { letters: 'Ә', ng: 'Ң', questions: '?', endings: 'ға', harmony: 'лар', possessive: '-ым', 'm-prop': 'a:b', 'm-circle': 'π', 'm-signed': '±', 'm-abs': '|x|', 'm-addsub': '+−', 'm-muldiv': '×÷' };
  const subjectLessons = () => L.lessons.filter((lesson) => lesson.subject === subject);
  const subjectName = (id) => (P.SUBJECTS.find((s) => s.id === id) || {}).kk || id;
  function subjectSwitch() {
    return `<div class="subject-switch" role="group" aria-label="Пәнді таңда">${P.SUBJECTS.map((s) => `<button data-action="subject" data-id="${esc(s.id)}" aria-pressed="${s.id === subject}">${icon(s.id === P.MATH ? 'calc' : 'book')}<span>${esc(s.kk)}</span></button>`).join('')}</div>`;
  }
  function subjectCards() {
    return `<section class="subject-cards" aria-label="Пәндер">${P.SUBJECTS.map((s) => {
      const list = L.lessons.filter((l) => l.subject === s.id);
      const done = list.filter((l) => progress.completedLessons.includes(l.id)).length;
      const next = list.find((l) => !progress.completedLessons.includes(l.id)) || list[0];
      const math = s.id === P.MATH;
      return `<article class="subject-card ${math ? 'math' : 'kaz'}${s.id === subject ? ' current' : ''}"><div class="subject-card-top"><span class="subject-glyph">${math ? 'π' : 'Ә'}</span><div><h3>${esc(s.kk)}</h3><small>${done} / ${list.length} тақырып аяқталды</small></div></div><div class="meter"><span style="width:${done / list.length * 100}%"></span></div><p>Келесі: <strong>${esc(next.title)}</strong></p><div class="subject-card-actions"><button class="btn btn-primary" data-action="lesson" data-id="${next.id}">Сабақ ${icon('arrow')}</button><button class="btn btn-ghost" data-action="start-game-subject" data-id="${esc(s.id)}">${icon('run')}Ойын</button></div></article>`;
    }).join('')}</section>`;
  }
  function gamePromo() {
    const stats = window.JazGame?.stats() || { best: 0, coins: 0 };
    return `<section class="game-promo"><div class="game-promo-copy"><span class="game-tag">${icon('run')}Жаңа ойын</span><h2>Барыс жолы</h2><p>Үш жол, бір дұрыс жауап. Барыспен бірге жүгіріп, ${esc(subjectName(subject).toLowerCase())} тақырыптарын бекіт.</p><div class="game-promo-stats"><span>${icon('trophy')}Рекорд <b>${stats.best}</b></span><span>${icon('coin')}Тиын <b>${stats.coins}</b></span></div><button class="btn btn-white" data-action="start-game">Жүгіруді бастау ${icon('arrow')}</button></div><div class="game-promo-art" aria-hidden="true"><span class="lane l1"></span><span class="lane l2"></span><span class="lane l3"></span><img src="./assets/mascot-kit/04-wave.png" alt="" width="200" height="183"></div></section>`;
  }
  function mascotAvatar(extraClass = '') {
    return `<span class="barys-avatar ${extraClass}"><img src="./assets/mascot-kit/03-avatar.png" alt="" width="160" height="146"></span>`;
  }
  function heroMascot() {
    return `<span class="hero-wipe" aria-hidden="true"></span><span class="banner-ornaments" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="hero-visual"><span class="letter-chip first" aria-hidden="true">${subject === P.MATH ? 'π' : 'Ә'}</span><span class="letter-chip second" aria-hidden="true">${subject === P.MATH ? '×' : 'Ң'}</span><button class="mascot-stage" data-action="mascot-hello" aria-label="Барыспен амандасу"><span class="mascot-shadow" aria-hidden="true"></span><img class="barys-character" data-state-poses src="./assets/mascot-kit/01-primary.png" alt="Көк шарфы мен қазақы тақиясы бар қар барысы" width="960" height="877" draggable="false"></button><span class="mascot-speech" aria-hidden="true">Сәлем! Мен — Барыс.</span></div>`;
  }
  function lessonTile(lesson) {
    const complete = progress.completedLessons.includes(lesson.id);
    return `<button class="lesson-tile ${complete ? 'completed' : ''}" data-action="lesson" data-id="${lesson.id}"><span class="letter-icon">${complete ? icon('check') : esc(GLYPHS[lesson.id] || '•')}</span>${icon(complete ? 'check' : 'arrow', 'tile-arrow')}<h3>${esc(lesson.title)}</h3><p>${esc(lesson.description)}</p><span class="tile-meta"><span>${esc(lesson.duration)} · ${lesson.size} тапсырма</span><strong>${complete ? 'Орындалды' : '+20 XP'}</strong></span><span class="mini-meter"><span style="width:${complete ? 100 : 0}%"></span></span></button>`;
  }
  function deck() {
    const s = L.scenarios[deckIndex];
    return `<div class="scenario-feature"><span class="eyebrow">${String(deckIndex + 1).padStart(2, '0')} / 04 · ЧАТ ОЙЫНЫ</span><h3>${esc(s.title)}</h3><p>${esc(s.task)}</p><button class="btn btn-primary" data-action="start-chat" data-id="${s.id}">Ойынды бастау ${icon('arrow')}</button><span class="scenario-glyph">${icon(s.icon)}</span></div><div class="deck-controls"><button class="deck-switch" data-action="deck-prev" aria-label="Алдыңғы жағдай">${icon('left')}</button>${L.scenarios.map((_, index) => `<button class="deck-dot ${index === deckIndex ? 'active' : ''}" data-action="deck" data-index="${index}" aria-label="${index + 1}-жағдай" ${index === deckIndex ? 'aria-current="true"' : ''}></button>`).join('')}<button class="deck-switch" data-action="deck-next" aria-label="Келесі жағдай">${icon('chevron')}</button></div>`;
  }
  function homeView() {
    const games = todayEvents().filter((event) => event.type === 'game').length;
    const tasks = [todayEvents().some((event) => event.type === 'lesson'), games > 0, practicesToday().length > 0];
    const lessons = subjectLessons();
    const nextLesson = lessons.find((lesson) => !progress.completedLessons.includes(lesson.id)) || lessons[0];
    const math = subject === P.MATH;
    return `<div class="route-enter"><section class="hero"><div class="hero-copy"><span class="eyebrow">${math ? '6-СЫНЫП · МАТЕМАТИКА' : '6-СЫНЫП · ҚАЗАҚ ТІЛІ'}</span><h1 data-type-title>${math ? 'Есепті түсін,<br>ойнап бекіт.' : 'Қазақша жазуды<br>әдетке айналдыр.'}</h1><p>${math ? 'Пропорциядан рационал сандарға дейін — сабақ пен ойын.' : 'Қысқа сабақтан баста. Ойыңды чатта жеткіз.'}</p><button class="btn btn-white" data-action="start-game">Барыс жолын бастау ${icon('arrow')}</button></div>${heroMascot()}</section>
    <div class="section-heading"><h2>Пәндерің</h2><span class="section-meta">Мұғалімнің бағдарламасы бойынша</span></div>${subjectCards()}
    <div class="section-heading subject-heading"><h2>Бүгінгі жоспарың</h2>${subjectSwitch()}</div>
    <section class="daily-plan"><div class="plan-left"><div class="plan-cover"><img class="barys-mini" src="./assets/mascot-kit/07-reading.png" alt="" width="135" height="123"></div><h3>Аз-аздан.<br>Күн сайын.</h3><p>Бүгінгі мақсат <strong>${Math.min(todayXp(), 30)} / 30 XP</strong></p><p class="plan-count">${tasks.filter(Boolean).length} / 3 орындалды</p></div><div class="plan-tasks">
    <button class="task-row ${tasks[0] ? 'done' : ''}" data-action="lesson" data-id="${nextLesson.id}"><span class="task-step">${tasks[0] ? icon('check') : '01'}</span><span><strong>Бір сабақты орында</strong><small>${esc(nextLesson.title)} · ${nextLesson.size} тапсырма</small></span>${icon('chevron')}</button>
    <button class="task-row ${tasks[1] ? 'done' : ''}" data-action="start-game"><span class="task-step">${tasks[1] ? icon('check') : '02'}</span><span><strong>Барыс жолында бір рет жүгір</strong><small>Дұрыс жауап — ұпай мен тиын</small></span>${icon('chevron')}</button>
    <button class="task-row ${tasks[2] ? 'done' : ''}" data-action="start-chat" data-id="cinema"><span class="task-step">${tasks[2] ? icon('check') : '03'}</span><span><strong>Чатта қазақша жаз</strong><small>Барыс қатеңді түзетіп береді</small></span>${icon('chevron')}</button></div><div id="scenario-deck" class="card-deck">${deck()}</div></section>
    ${gamePromo()}
    <div class="section-heading"><h2>${math ? 'Математика тақырыптары' : 'Қазақ тілі тақырыптары'}</h2><a class="text-link" href="#lessons">Барлық сабақ ${icon('arrow')}</a></div><section class="lesson-grid" aria-label="Қысқа сабақтар">${lessons.slice(0, 3).map(lessonTile).join('')}</section>
    <a class="history-strip" href="#progress"><span class="strip-icon">${icon('clock')}</span><span><strong>Өзгерісіңді байқа</strong><p>Ұпайларың, рекордтарың және түзеткен сөздерің бір жерде.</p></span>${icon('chevron')}</a></div>`;
  }
  function lessonsView() {
    const order = [subject].concat(P.SUBJECTS.map((x) => x.id).filter((id) => id !== subject));
    const lessons = subjectLessons();
    const next = lessons.find((lesson) => !progress.completedLessons.includes(lesson.id)) || lessons[0];
    const sections = order.map((id) => {
      const list = L.lessons.filter((l) => l.subject === id);
      const done = list.filter((l) => progress.completedLessons.includes(l.id)).length;
      return `<div class="section-heading subject-section"><h2>${icon(id === P.MATH ? 'calc' : 'book')}${esc(subjectName(id))}</h2><span class="section-meta">${done} / ${list.length} тақырып</span></div><section class="lesson-grid all-lessons" aria-label="${esc(subjectName(id))}">${list.map(lessonTile).join('')}</section>`;
    }).join('');
    return `<div class="route-enter"><div class="page-intro subject-heading"><div><h1>Бір тақырып. Бір қадам.</h1><p>Сабақтар мұғалімнің бағдарламасымен бірдей: қазақ тілі мен математика. Әр жолы тапсырмалар жаңарады.</p></div>${subjectSwitch()}</div><section class="lesson-banner"><div><h2>Келесі сабақ: ${esc(next.title)}</h2><p>Таңда. Ойланып көр. Қате кетсе, түсіндірмені оқып, қайта байқап көр.</p><button class="btn btn-primary" data-action="lesson" data-id="${next.id}">Сабақты бастау ${icon('arrow')}</button></div><img src="./assets/lesson-stack.svg" alt="" width="210" height="140"></section>${sections}</div>`;
  }
  function chatView() {
    const s = activeScenario();
    return `<div class="chat-view route-enter"><div class="chat-intro"><div><h1 data-type-title>Әңгімеге қосыл.</h1><p>Қазақша жаз. Қате кетсе, өзің түзетіп көр.</p></div><button class="btn btn-ghost" data-action="chat-info">${icon('help')}<span>Бұл қалай жұмыс істейді?</span></button></div><label class="sr-only" for="scenario-select">Әңгіме жағдайын таңда</label><select id="scenario-select" class="chat-mobile-select">${L.scenarios.map((scenario) => `<option value="${scenario.id}" ${scenarioId === scenario.id ? 'selected' : ''}>${esc(scenario.title)} · ${esc(scenario.persona)}</option>`).join('')}</select><div class="chat-layout"><aside class="scenario-rail" aria-label="Әңгіме жағдайлары"><span class="rail-title">КІММЕН СӨЙЛЕСЕМІЗ?</span>${L.scenarios.map((scenario) => `<button class="scenario-option ${scenario.id === scenarioId ? 'selected' : ''}" data-action="scenario" data-id="${scenario.id}" aria-pressed="${scenario.id === scenarioId}"><span class="scenario-avatar">${icon(scenario.icon)}</span><span><strong>${esc(scenario.persona)}</strong><small>${esc(scenario.title)}</small></span></button>`).join('')}<div class="rail-info"><img class="rail-barys barys-mini" src="./assets/mascot-kit/10-chat.png" alt="" width="95" height="95">Бұл — дайын жағдайлармен жұмыс істейтін жаттығу серігі. Шынайы адамдарға хабарлама жіберілмейді.</div></aside><section class="messenger" aria-label="${esc(s.persona)} кейіпкерімен жаттығу"><header class="messenger-head">${mascotAvatar('chat-barys')}<div><strong>${esc(s.persona)}</strong><span class="mentor-subtitle"><i></i>Ойын кейіпкері · жаттығу режимі</span></div><button class="icon-button" data-action="chat-info" aria-label="Чат туралы">${icon('help')}</button></header><div class="task-banner">${icon('spark')}<span>${esc(s.task)}</span></div><div class="messages" id="messages" role="log" aria-label="Хабарламалар" aria-live="polite" aria-relevant="additions"></div><div id="suggestions" class="chat-suggestions" aria-label="Хабарлама үлгілері"></div><form id="chat-form" class="composer"><p id="chat-error" class="chat-error" role="alert" hidden></p><div class="composer-box"><label class="sr-only" for="chat-input">Хабарламаңды қазақша жаз</label><textarea id="chat-input" rows="1" maxlength="500" placeholder="Қазақша жазып көр…" aria-describedby="composer-hint" enterkeyhint="send">${esc(session().draft)}</textarea><button type="submit" class="send-button" aria-label="Хабарламаны жіберу">${icon('send')}</button></div><div class="composer-footer"><span id="composer-hint">${pendingCorrection() ? 'Белгіленген сөздерді өзің түзетіп, қайта жаз.' : 'Үлгіні таңдауға немесе өзің жазуға болады.'}</span><span id="char-count">${session().draft.length} / 500</span></div></form></section></div></div>`;
  }
  function messageHtml(message, index, animate = false) {
    if (message.role === 'correction') {
      if (message.resolved) return `<div class="correction-card resolved"><div class="correction-title">${icon('check')}Белгіленген сөздерді түзеттің!</div></div>`;
      const assessment = message.corrected ? { corrected: message.corrected, issues: message.issues || [] } : L.assessMessage(message.original);
      if (!assessment.corrected) return '';
      return `<article class="correction-card${message.source === 'ai' ? ' ai' : ''} ${animate ? 'message-enter' : ''}"><div class="correction-title">${icon('pencil')}Бірге түзетіп көрейік${message.source === 'ai' ? '<span class="ai-chip">ИИ-тексеру</span>' : ''}</div><p>Мына сөздерге назар аудар:</p><p class="proposed">${esc(assessment.corrected)}</p><details><summary class="text-link">Неге бұлай жазылады?</summary><ul>${assessment.issues.map((issue) => `<li><b>${esc(issue.from)} → ${esc(issue.to)}</b><br>${esc(issue.reason)}</li>`).join('')}</ul></details><div class="correction-actions"><button class="btn btn-primary" data-action="rewrite" data-index="${index}">Өзім түзетемін ${icon('pencil')}</button><small>Өзің қайта жазсаң, +10 XP</small></div></article>`;
    }
    return `<div class="message ${message.role} ${animate ? 'message-enter' : ''}"><div class="message-body">${esc(message.text)}</div><span class="message-label">${message.role === 'you' ? 'Сен' : esc(activeScenario().persona)}${message.time ? ' · ' + esc(message.time) : ''}</span></div>`;
  }
  function renderMessages(suggestions) {
    if (route !== 'chat') return;
    const current = session();
    const openingHistory = !openedChatScenarios.has(scenarioId);
    openedChatScenarios.add(scenarioId);
    const messages = current.messages.map((message, index) => {
      const animate = !openingHistory && !seenChatMessages.has(message);
      seenChatMessages.add(message);
      return messageHtml(message, index, animate);
    }).join('');
    $('#messages').innerHTML = `<span class="chat-date">Қазақша хат алмасу</span>${messages}${busy ? '<div class="message mentor"><div class="message-body typing" aria-label="Жауап дайындалуда"><i></i><i></i><i></i></div></div>' : ''}`;
    $('#messages').scrollTop = $('#messages').scrollHeight;
    const options = suggestions || activeScenario().suggestions;
    $('#suggestions').innerHTML = options.map((text) => `<button class="suggestion" data-action="suggestion" data-text="${esc(text)}">${esc(text)}</button>`).join('');
    $('#composer-hint').textContent = pendingCorrection() ? 'Белгіленген сөздерді өзің түзетіп, қайта жаз.' : 'Үлгіні таңдауға немесе өзің жазуға болады.';
    $('.send-button').disabled = busy;
  }
  function allCorrections() {
    const result = [];
    for (const [id, current] of Object.entries(sessions)) {
      for (const message of current.messages) if (message.role === 'correction' && message.resolved) {
        const corrected = message.corrected || L.assessMessage(message.original).corrected;
        if (corrected) result.push({ original: message.original, corrected, scenario: L.scenarios.find((s) => s.id === id)?.title || '' });
      }
    }
    return result;
  }
  function progressView() {
    const practices = progress.events.filter((event) => event.type === 'practice');
    const corrections = allCorrections();
    const week = [];
    const names = ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'];
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(); d.setDate(d.getDate() - offset);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      week.push(`<div class="week-day ${progress.activeDays.includes(key) ? 'earned' : ''} ${offset === 0 ? 'today' : ''}"><span class="day-circle" title="${key}">${progress.activeDays.includes(key) ? icon('check') : d.getDate()}</span><span>${names[d.getDay()]}</span></div>`);
    }
    const gameStats = window.JazGame?.stats() || {};
    const gameBadges = P.badgesFor(gameStats);
    const badges = [{ name: 'Алғашқы қадам', icon: 'spark', earned: progress.xp > 0 }, { name: 'Сабақ шебері', icon: 'book', earned: L.lessons.filter((l) => l.subject === P.KAZ).every((l) => progress.completedLessons.includes(l.id)) }, { name: 'Үш күн қатарынан', icon: 'flame', earned: L.getStreak(progress, day()) >= 3 }]
      .concat(P.BADGES.map((badge) => ({ name: badge.title, icon: 'trophy', earned: gameBadges.includes(badge.id) })));
    return `<div class="route-enter"><div class="page-intro"><h1>Әр қадамың есепте.</h1><p>Шағын жетістіктеріңді көріп, келесі қадамды таңда.</p></div><div class="progress-grid"><article class="progress-stat"><span>${icon('spark')}Жинаған ұпайың</span><strong>${progress.xp} XP</strong><small>Тек орындаған жаттығуларыңнан.</small></article><article class="progress-stat"><span>${icon('book')}Аяқталған сабақ</span><strong>${progress.completedLessons.length} / ${L.lessons.length}</strong><small>Қазақ тілі мен математика тақырыптары.</small></article><article class="progress-stat"><span>${icon('chat')}Жаттығу хабарламалары</span><strong>${practices.length}</strong><small>Үлгіге сай жазған не түзеткен хабарламалар.</small></article></div><div class="progress-main"><section class="panel"><h2>Келесі деңгейге</h2><p>Әр 100 XP сайын жаңа деңгей ашылады.</p><div class="level-progress"><span class="level-medal">${progress.level}</span><div class="level-info"><strong>${progress.level}-деңгей</strong><div class="meter"><span style="width:${progress.xp % 100}%"></span></div><small>${progress.xp % 100} / 100 XP · келесі деңгейге ${100 - progress.xp % 100} XP</small></div></div><h2 style="margin-top:26px">Соңғы жеті күн</h2><div class="week-grid">${week.join('')}</div><p style="margin:20px 0 0;font-size:9px">Боялған күндерде жаттығу орындағансың.</p></section><section class="panel"><h2>Кішкентай жеңістер</h2><p>Белгілерді нақты қадамдармен аш.</p><div class="badge-grid">${badges.map((badge) => `<div class="badge-item ${badge.earned ? 'earned' : ''}"><span class="badge-circle">${icon(badge.earned ? badge.icon : 'lock')}</span><strong>${badge.name}</strong><span>${badge.earned ? 'Ашылды' : 'Әзірге жабық'}</span></div>`).join('')}</div><div class="section-heading" style="margin-top:30px"><h2 style="font-size:16px">Соңғы жаттығулар</h2></div>${progress.events.length ? `<div class="activity-list">${progress.events.slice(-4).reverse().map((event) => `<div class="activity-row">${icon(event.type === 'lesson' ? 'book' : event.type === 'game' ? 'run' : 'chat')}<span><strong>${esc(event.type === 'lesson' ? L.lessons.find((lesson) => lesson.id === event.lessonId)?.title : event.type === 'game' ? `Барыс жолы · ${event.correct} дұрыс` : L.scenarios.find((s) => s.id === event.scenarioId)?.title)}</strong><small>${esc(event.day)}</small></span><b>+${event.xp} XP</b></div>`).join('')}</div>` : '<div class="empty-history">Алғашқы сабақты аяқта немесе чатта бір хабарлама жаз. Жаттығуларың осында пайда болады.</div>'}</section></div><section class="panel correction-history"><h2>Түзеткен сөздерің</h2>${corrections.length ? corrections.slice(-8).reverse().map((correction) => `<div class="saved-correction"><del>${esc(correction.original)}</del><strong>${esc(correction.corrected)}</strong><small>${esc(correction.scenario)}</small></div>`).join('') : '<p style="margin:15px 0 0">Чатта қате сөзді өзің түзеткенде, осы жерге сақталады.</p>'}</section></div>`;
  }
  function render() {
    renderNavigation(); updateStats();
    document.body.dataset.mode = appMode;
    document.documentElement.lang = appMode === 'method' ? 'ru' : 'kk';
    for (const button of document.querySelectorAll('.mode-switch button')) button.setAttribute('aria-pressed', String(button.dataset.action === `mode-${appMode}`));
    $('#student-context').hidden = appMode !== 'student';
    if (appMode === 'method') {
      $('#page-location').textContent = 'Методист';
      document.body.dataset.page = 'method';
      document.title = 'Методист · Jaz!';
      window.JazMetodist.mount($('#main'));
      window.JazMotion?.mount($('#main'), { route: 'method' });
      return;
    }
    $('#main').classList.remove('metodist');
    window.JazMetodist.unmount?.();
    window.JazMetodist.renderStudentContext($('#student-context'));
    document.body.dataset.page = route;
    document.title = `${nav.find((item) => item.id === route).label} · Jaz!`;
    if (route !== 'game') window.JazGame?.destroy();
    const views = { home: homeView, lessons: lessonsView, game: () => '<div id="game-root" class="game-root"></div>', chat: chatView, progress: progressView };
    $('#main').innerHTML = `${storageWarning ? '<div class="storage-warning" role="status">Браузер деректі сақтауға рұқсат бермеді. Бұл жолғы прогресс бетті жапқанша ғана сақталады.</div>' : ''}${views[route]()}`;
    if (route === 'chat') renderMessages();
    if (route === 'game') window.JazGame?.mount($('#game-root'), { subject, topicId: pendingGameTopic, onFinish: gameFinished });
    pendingGameTopic = '';
    window.JazMotion?.mount($('#main'), { route });
  }
  let pendingGameTopic = '';
  function gameFinished(result) {
    const earned = award({ type: 'game', runId: result.runId, correct: result.correct });
    return earned;
  }
  function startGame(topicId) { pendingGameTopic = topicId || ''; navigate('game'); }
  function navigate(target) {
    if (route === target) { render(); return; }
    location.hash = target;
  }
  function startChat(id, draft) {
    if (busy) { notify('Жауап дайын болған соң жағдайды ауыстыра аласың.'); return; }
    scenarioId = L.scenarios.some((s) => s.id === id) ? id : 'cinema';
    saveStorage('jaz.scenario.v1', scenarioId);
    if (typeof draft === 'string') session().draft = draft;
    navigate('chat');
    if (route === 'chat' && draft) { $('#chat-input').value = draft; $('#char-count').textContent = `${draft.length} / 500`; $('#chat-input').focus(); }
  }
  function addMessage(role, text, extra = {}) {
    const current = session(); current.messages.push({ role, text, time: time(), ...extra });
    if (current.messages.length > 80) current.messages.splice(0, current.messages.length - 80);
    saveChats();
  }
  // Ask the server-side mentor (Claude) first; fall back to the offline rules engine.
  async function aiAssess(text, current) {
    if (!aiAvailable) return null;
    const s = activeScenario();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const response = await fetch('./api/correct', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ text, scenario: { title: s.title, persona: s.persona, task: s.task }, history: current.messages.filter((m) => m.role !== 'correction').slice(-6).map((m) => ({ role: m.role, text: m.text })) }) });
      if (!response.ok) { if (response.status === 503) aiAvailable = false; return null; }
      const data = await response.json();
      const issues = (data.issues || []).filter((i) => i && i.from !== i.to);
      if (!data.ok && issues.length && L.normalizeText(data.corrected) !== L.normalizeText(text)) return { kind: 'correction', corrected: data.corrected, issues, reply: data.reply, source: 'ai' };
      return { kind: 'recognized', reply: data.reply || 'Жақсы! Әңгімені жалғастырайық.', source: 'ai', verified: true };
    } catch { return null; } finally { clearTimeout(timer); }
  }
  async function sendMessage() {
    if (busy || route !== 'chat') return;
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) { $('#chat-error').textContent = 'Алдымен хабарлама жазып көр.'; $('#chat-error').hidden = false; input.focus(); return; }
    if (text.length > 500) { $('#chat-error').textContent = 'Бір хабарламаға 500 таңбаға дейін жазуға болады.'; $('#chat-error').hidden = false; return; }
    $('#chat-error').hidden = true;
    const id = scenarioId;
    const current = session();
    const pending = pendingCorrection();
    const rules = L.assessMessage(text, { scenarioId, turn: current.turn });
    addMessage('you', text); current.turn++; current.draft = ''; input.value = ''; $('#char-count').textContent = '0 / 500';
    busy = true; window.JazMotion?.react('thinking'); renderMessages();
    const started = Date.now();
    // A rewrite of a pending correction is checked against the stored corrected text, no model call needed.
    const rewriting = pending && L.verifyCorrection(pending.original, text, pending.corrected);
    const ai = rewriting ? null : await aiAssess(text, current);
    const assessment = ai || rules;
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 450 - (Date.now() - started))));
    busy = false;
    window.JazMotion?.react('idle');
    if (rewriting) {
      pending.resolved = true;
      current.selectedOriginal = '';
      const gained = award({ type: 'correction', text, original: pending.original, expected: pending.corrected, scenarioId: id });
      const reply = rules.kind === 'recognized' ? rules.reply : 'Белгіленген сөздерді дұрыс түзеттің. Енді әңгімемізді жалғастырайық!';
      sessions[id].messages.push({ role: 'mentor', text: `${gained ? 'Түзету қабылданды! +10 XP. ' : 'Түзету қабылданды! '}${pending.reply || reply}`, time: time() });
    } else if (assessment.kind === 'correction') {
      sessions[id].messages.push({ role: 'correction', text: assessment.reply, original: text, corrected: assessment.corrected, issues: assessment.issues, reply: ai ? ai.reply : '', source: ai ? 'ai' : 'rules', resolved: false, time: time() });
      window.JazMotion?.react('nudge');
    } else {
      const gained = assessment.kind === 'recognized' ? award({ type: 'message', text, scenarioId: id, verified: assessment.verified === true }) : 0;
      sessions[id].messages.push({ role: 'mentor', text: assessment.reply, time: time() });
      if (assessment.kind === 'recognized' && !gained) notify('Бұл үлгі үшін бүгін ұпай алғансың. Басқа хабарлама жазып көр.');
    }
    saveChats();
    if (route === 'chat' && scenarioId === id) { renderMessages(rules.suggestedReplies); $('#chat-input').focus(); }
  }
  function startLesson(id) {
    const lesson = L.lessons.find((item) => item.id === id);
    if (!lesson) return;
    const questions = P.set(id, lesson.size).map((item) => ({ id: item.id, prompt: item.prompt, options: item.options, answerIndex: item.answer, explanation: item.explanation }));
    lessonRun = { lesson: { ...lesson, questions }, index: 0, selected: null, checked: false, done: false, attempts: 0, wasComplete: progress.completedLessons.includes(id) };
    renderLesson(); $('#lesson-dialog').showModal();
  }
  function renderLesson() {
    if (!lessonRun) return;
    const run = lessonRun;
    const question = run.lesson.questions[run.index];
    $('#lesson-dialog').innerHTML = `<div class="dialog-top">${icon('book')}<h2 id="lesson-title">${esc(run.lesson.title)}</h2><button class="icon-button" data-action="close-lesson" aria-label="Сабақты жабу">${icon('close')}</button></div><div class="dialog-content">${run.done ? `<div class="lesson-complete"><img class="barys-mini" src="./assets/mascot-kit/05-celebrate.png" alt="Барыс сені құттықтайды" width="180" height="165"><h3>Жарайсың, орындадың!</h3><p>Барлық тапсырманы дұрыс аяқтадың.<br>Енді Барыс жолында бекітіп көр.</p><div class="xp-award">${run.wasComplete ? 'Қайталау аяқталды' : '+20 XP'}</div>${run.wasComplete ? '<p>Бұл сабақ үшін ұпай бұрын берілген.</p>' : ''}<button class="btn btn-primary" data-action="lesson-to-game" data-id="${esc(run.lesson.id)}">Барыс жолында бекіту ${icon('arrow')}</button></div>` : `<div class="lesson-topline"><span>${run.index + 1} / ${run.lesson.questions.length} тапсырма</span><span>Алғаш аяқтағанда +20 XP</span></div><div class="meter"><span style="width:${run.index / run.lesson.questions.length * 100}%"></span></div><h3 class="lesson-question">${esc(question.prompt)}</h3><div class="answer-list" role="group" aria-label="Жауап нұсқалары">${question.options.map((option, index) => `<button class="answer-option ${run.selected === index ? 'selected' : ''} ${run.checked && index === run.selected ? (index === question.answerIndex ? 'correct' : 'wrong') : ''}" data-action="answer" data-index="${index}" aria-pressed="${run.selected === index}" ${run.checked ? 'disabled' : ''}><span class="answer-number">${index + 1}</span>${esc(option)}</button>`).join('')}</div>${run.checked ? `<div class="answer-feedback ${run.selected !== question.answerIndex ? 'wrong' : ''}" role="status"><strong>${run.selected === question.answerIndex ? 'Дұрыс таңдадың!' : 'Тағы бір рет байқап көр.'}</strong><br>${esc(question.explanation)}</div>` : ''}<div class="dialog-actions"><button class="btn btn-primary" data-action="check-answer" ${run.selected === null ? 'disabled' : ''}>${run.checked ? (run.selected === question.answerIndex ? (run.index === run.lesson.questions.length - 1 ? 'Сабақты аяқтау' : 'Келесі тапсырма') : 'Қайта байқап көру') : 'Тексеру'} ${icon('arrow')}</button></div>`}</div>`;
  }
  function checkAnswer() {
    if (!lessonRun || lessonRun.selected === null || lessonRun.done) return;
    const run = lessonRun;
    const question = run.lesson.questions[run.index];
    if (!run.checked) {
      run.checked = true; run.attempts++;
      window.JazMetodist.recordAnswer({subject:run.lesson.subject,topic:run.lesson.topic,lessonId:run.lesson.id,lessonTitle:run.lesson.title,questionId:question.id,questionText:question.prompt,correct:run.selected === question.answerIndex ? 1 : 0,answer:question.options[run.selected],correctAnswer:question.options[question.answerIndex],date:day()});
      window.JazMotion?.react(run.selected === question.answerIndex ? 'success' : 'nudge');
    }
    else if (run.selected !== question.answerIndex) { run.selected = null; run.checked = false; }
    else if (run.index < run.lesson.questions.length - 1) { run.index++; run.selected = null; run.checked = false; }
    else { award({ type: 'lesson', lessonId: run.lesson.id }); run.done = true; render(); }
    renderLesson();
    requestAnimationFrame(() => $('#lesson-dialog .dialog-content').scrollIntoView({ block: 'nearest' }));
  }
  function info(title, body) {
    $('#info-dialog').innerHTML = `<div class="dialog-top"><h2 id="info-title">${esc(title)}</h2><button class="icon-button" data-action="close-info" aria-label="Терезені жабу">${icon('close')}</button></div><div class="dialog-content info-body">${body}</div>`;
    $('#info-dialog').showModal();
  }
  function showHelp() {
    info('Jaz! қалай жұмыс істейді?', '<p><strong>1. Сабақты орында.</strong><br>Үш қысқа тапсырмаға жауап бер. Қате болса, түсіндірмені оқып, қайта байқап көр.</p><p><strong>2. Чатта жазып көр.</strong><br>Жағдайды таңда. Үлгі хабарлама не өз сөзің арқылы әңгімеге қосыл. Түзету ұсынылса, хабарламаны өзің қайта жаз.</p><p><strong>3. Прогресіңді байқа.</strong><br>Алғаш аяқталған сабаққа +20 XP. Жаттығу үлгісіне сай хабарламаға немесе қабылданған түзетуге +10 XP. Бір хабарламаны қайталау сол күні қайта ұпай бермейді.</p><p><strong>Қазір — дайын сценарийлері бар прототип.</strong><br>Жалпы мақсаттағы ИИ моделі қосылмаған. Таныс емес мәтінді жүйе «қате» не «дұрыс» деп кесіп айтпайды және оған ұпай бермейді.</p>');
  }
  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-action]');
    if (!control) return;
    const action = control.dataset.action;
    if (action === 'mode-student' || action === 'mode-method') { appMode = action === 'mode-method' ? 'method' : 'student'; saveStorage('jaz.mode.v1', appMode); render(); }
    else if (action === 'theme') { theme = theme === 'dark' ? 'light' : 'dark'; saveStorage('jaz.theme.v1', theme); applyTheme(); }
    else if (action === 'mascot-hello') { window.JazMotion?.react('hello'); }
    else if (action === 'lesson') startLesson(control.dataset.id);
    else if (action === 'subject') { subject = control.dataset.id === P.MATH ? P.MATH : P.KAZ; saveStorage('jaz.subject.v1', subject); render(); }
    else if (action === 'start-game') startGame();
    else if (action === 'start-game-subject') { subject = control.dataset.id === P.MATH ? P.MATH : P.KAZ; saveStorage('jaz.subject.v1', subject); try { const g = JSON.parse(localStorage.getItem('jaz.game.v1') || '{}'); localStorage.setItem('jaz.game.v1', JSON.stringify({ ...g, subject, topic: '' })); } catch {} startGame(); }
    else if (action === 'lesson-to-game') { $('#lesson-dialog').close(); lessonRun = null; startGame(control.dataset.id); }
    else if (action === 'start-chat') startChat(control.dataset.id);
    else if (action === 'try-correction') startChat('cinema', 'Салем! Кинога барамыз ба?');
    else if (action === 'deck-prev' || action === 'deck-next' || action === 'deck') {
      deckIndex = action === 'deck' ? Number(control.dataset.index) : (deckIndex + (action === 'deck-next' ? 1 : 3)) % 4;
      $('#scenario-deck').innerHTML = deck();
      window.JazMotion?.deckChanged($('#scenario-deck'), action === 'deck-prev' ? -1 : 1);
    } else if (action === 'scenario') {
      if (busy) { notify('Жауап дайын болған соң жағдайды ауыстыра аласың.'); return; }
      scenarioId = control.dataset.id; saveStorage('jaz.scenario.v1', scenarioId); render();
    } else if (action === 'suggestion') {
      const text = control.dataset.text; $('#chat-input').value = text; session().draft = text; $('#char-count').textContent = `${text.length} / 500`; $('#chat-input').focus();
    } else if (action === 'rewrite') {
      const message = session().messages[Number(control.dataset.index)];
      if (!message || message.role !== 'correction') return;
      session().selectedOriginal = message.original;
      $('#chat-input').value = message.original; session().draft = message.original; $('#char-count').textContent = `${message.original.length} / 500`; $('#chat-input').focus(); saveChats();
    } else if (action === 'answer') {
      if (!lessonRun || lessonRun.checked) return;
      lessonRun.selected = Number(control.dataset.index); renderLesson();
    } else if (action === 'check-answer') checkAnswer();
    else if (action === 'close-lesson') { $('#lesson-dialog').close(); lessonRun = null; }
    else if (action === 'lesson-to-chat') { $('#lesson-dialog').close(); lessonRun = null; startChat('cinema'); }
    else if (action === 'close-info') $('#info-dialog').close();
    else if (action === 'help') showHelp();
    else if (action === 'chat-info') info('Жаттығу серігі туралы', `<p>Аян, Аружан және басқа кейіпкерлер — <strong>ойын кейіпкерлері</strong>. Бұл чатта шынайы адамдармен байланыс жоқ.</p><p>Барыс қатеңді екі жолмен тексереді. <strong>Ережелер</strong>: орыс әрпімен жазылған қазақ әріптері (салем → сәлем), үндестік заңы (мектепге → мектепке), сұраулық шылау (барамызба → барамыз ба), тәуелдік (кітапым → кітабым), бас әріп пен тыныс белгісі.</p><p>${aiAvailable ? '<strong>ИИ-тексеру қосулы:</strong> кез келген қатені табады, түзетеді және ережесін түсіндіреді.' : '<strong>ИИ-тексеру өшірулі:</strong> ережелер білмейтін сөздерді қате деп бағаламаймыз.'}</p>`);
    else if (action === 'privacy') info('Сенің деректерің', `<p>Жаттығу прогресі мен чат тарихы <strong>осы браузердің жадында</strong> сақталады. ${aiAvailable ? 'Чаттағы хабарламаң тексеру үшін мектеп серверіндегі ИИ-тексерушіге (Claude) жіберіледі. Атыңды, телефоныңды және мекенжайыңды жазба.' : 'Қазір хабарламалар осы құрылғыда, ИИ-сыз тексеріледі.'}</p><p>Сайтты басқа құрылғыдан ашсаң, жаңа прогресс басталады. Браузер деректерін тазаласаң, жергілікті тарих та өшеді.</p><p>Тіркелу, төлем және жеке дерек енгізу қажет емес.</p>`);
  });
  document.addEventListener('submit', (event) => { if (event.target.id === 'chat-form') { event.preventDefault(); sendMessage(); } });
  document.addEventListener('input', (event) => {
    if (event.target.id === 'chat-input') { session().draft = event.target.value; $('#char-count').textContent = `${event.target.value.length} / 500`; $('#chat-error').hidden = true; }
  });
  document.addEventListener('keydown', (event) => {
    if (event.target.id === 'chat-input' && event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendMessage(); }
  });
  document.addEventListener('change', (event) => {
    if (event.target.id === 'scenario-select') {
      if (busy) { event.target.value = scenarioId; notify('Жауап дайын болған соң жағдайды ауыстыра аласың.'); return; }
      scenarioId = event.target.value; saveStorage('jaz.scenario.v1', scenarioId); render();
    }
  });
  window.addEventListener('hashchange', () => { const next = location.hash.slice(1); route = nav.some((item) => item.id === next) ? next : 'home'; render(); window.scrollTo({ top: 0 }); });
  window.addEventListener('pagehide', saveChats);
  window.addEventListener('focus', updateStats);
  for (const placeholder of document.querySelectorAll('[data-icon]')) placeholder.innerHTML = icon(placeholder.dataset.icon);
  route = nav.some((item) => item.id === location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  applyTheme();
  render();
})();
