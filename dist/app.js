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
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>'
  };
  const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  const nav = [{ id: 'home', label: 'Басты бет', icon: 'home' }, { id: 'lessons', label: 'Сабақтар', icon: 'book' }, { id: 'chat', label: 'Чат ойыны', icon: 'chat' }, { id: 'progress', label: 'Жетістіктер', icon: 'progress' }];
  let storageWarning = false;
  function readStorage(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function saveStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { storageWarning = true; } }
  let progress = L.sanitizeState(readStorage('jaz.progress.v1', null));
  let sessions = {};
  const savedChats = readStorage('jaz.chats.v1', {});
  for (const scenario of L.scenarios) {
    const saved = savedChats && savedChats[scenario.id];
    if (!saved || !Array.isArray(saved.messages)) continue;
    const messages = saved.messages.filter((m) => m && ['mentor', 'you', 'correction'].includes(m.role) && typeof m.text === 'string' && m.text.length <= 1600).slice(-80).map((m) => ({ role: m.role, text: m.text, original: typeof m.original === 'string' ? m.original.slice(0, 500) : '', resolved: m.resolved === true, time: typeof m.time === 'string' ? m.time.slice(0, 8) : '' }));
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
  const letters = ['Ә', 'Ң', '?', 'ға'];
  function mascotAvatar(extraClass = '') {
    return `<span class="barys-avatar ${extraClass}"><img src="./assets/mascot-kit/03-avatar.png" alt="" width="160" height="146"></span>`;
  }
  function heroMascot() {
    return `<span class="hero-wipe" aria-hidden="true"></span><span class="banner-ornaments" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="hero-visual"><span class="letter-chip first" aria-hidden="true">Ә</span><span class="letter-chip second" aria-hidden="true">Ң</span><button class="mascot-stage" data-action="mascot-hello" aria-label="Барыспен амандасу"><span class="mascot-shadow" aria-hidden="true"></span><img class="barys-character" data-state-poses src="./assets/mascot-kit/01-primary.png" alt="Көк шарфы мен қазақы тақиясы бар қар барысы" width="960" height="877" draggable="false"></button><span class="mascot-speech" aria-hidden="true">Сәлем! Мен — Барыс.</span></div>`;
  }
  function lessonTile(lesson, index) {
    const complete = progress.completedLessons.includes(lesson.id);
    return `<button class="lesson-tile ${complete ? 'completed' : ''}" data-action="lesson" data-id="${lesson.id}"><span class="letter-icon">${complete ? icon('check') : letters[index]}</span>${icon(complete ? 'check' : 'arrow', 'tile-arrow')}<h3>${esc(lesson.title)}</h3><p>${esc(lesson.description)}</p><span class="tile-meta"><span>${esc(lesson.duration)} · 3 тапсырма</span><strong>${complete ? 'Орындалды' : '+20 XP'}</strong></span><span class="mini-meter"><span style="width:${complete ? 100 : 0}%"></span></span></button>`;
  }
  function deck() {
    const s = L.scenarios[deckIndex];
    return `<div class="scenario-feature"><span class="eyebrow">${String(deckIndex + 1).padStart(2, '0')} / 04 · ЧАТ ОЙЫНЫ</span><h3>${esc(s.title)}</h3><p>${esc(s.task)}</p><button class="btn btn-primary" data-action="start-chat" data-id="${s.id}">Ойынды бастау ${icon('arrow')}</button><span class="scenario-glyph">${icon(s.icon)}</span></div><div class="deck-controls"><button class="deck-switch" data-action="deck-prev" aria-label="Алдыңғы жағдай">${icon('left')}</button>${L.scenarios.map((_, index) => `<button class="deck-dot ${index === deckIndex ? 'active' : ''}" data-action="deck" data-index="${index}" aria-label="${index + 1}-жағдай" ${index === deckIndex ? 'aria-current="true"' : ''}></button>`).join('')}<button class="deck-switch" data-action="deck-next" aria-label="Келесі жағдай">${icon('chevron')}</button></div>`;
  }
  function homeView() {
    const tasks = [todayEvents().some((event) => event.type === 'lesson'), practicesToday().length > 0, practicesToday().length >= 3];
    const nextLesson = L.lessons.find((lesson) => !progress.completedLessons.includes(lesson.id)) || L.lessons[0];
    return `<div class="route-enter"><section class="hero"><div class="hero-copy"><span class="eyebrow">ҚАЗАҚША ЖАЗУҒА 5 МИНУТ</span><h1 data-type-title>Қазақша жазуды<br>әдетке айналдыр.</h1><p>Қысқа сабақтан баста. Ойыңды чатта жеткіз.</p><button class="btn btn-white" data-action="start-chat" data-id="cinema">Чатты бастау ${icon('arrow')}</button></div>${heroMascot()}</section>
    <div class="section-heading"><h2>Бүгінгі жоспарың</h2><span class="section-meta">${tasks.filter(Boolean).length} / 3 орындалды<br>шамамен 8 минут</span></div>
    <section class="daily-plan"><div class="plan-left"><div class="plan-cover"><img class="barys-mini" src="./assets/mascot-kit/07-reading.png" alt="" width="135" height="123"></div><h3>Аз-аздан.<br>Күн сайын.</h3><p>Бүгінгі мақсат <strong>${Math.min(todayXp(), 30)} / 30 XP</strong></p></div><div class="plan-tasks">
    <button class="task-row ${tasks[0] ? 'done' : ''}" data-action="lesson" data-id="${nextLesson.id}"><span class="task-step">${tasks[0] ? icon('check') : '01'}</span><span><strong>Бір сабақты орында</strong><small>Үш қысқа тапсырма</small></span>${icon('chevron')}</button>
    <button class="task-row ${tasks[1] ? 'done' : ''}" data-action="try-correction"><span class="task-step">${tasks[1] ? icon('check') : '02'}</span><span><strong>Бір хабарлама жаз</strong><small>Өз сөзіңмен жаттық</small></span>${icon('chevron')}</button>
    <button class="task-row ${tasks[2] ? 'done' : ''}" data-action="start-chat" data-id="cinema"><span class="task-step">${tasks[2] ? icon('check') : '03'}</span><span><strong>Үш хабарлама жаз</strong><small>Чатта әңгіме құрастыр</small></span>${icon('chevron')}</button></div><div id="scenario-deck" class="card-deck">${deck()}</div></section>
    <div class="section-heading"><h2>Бір сабақтан баста</h2><a class="text-link" href="#lessons">Барлық сабақ ${icon('arrow')}</a></div><section class="lesson-grid" aria-label="Қысқа сабақтар">${L.lessons.slice(0, 3).map(lessonTile).join('')}</section>
    <a class="history-strip" href="#progress"><span class="strip-icon">${icon('clock')}</span><span><strong>Өзгерісіңді байқа</strong><p>Жинаған ұпайларың мен түзеткен сөздерің бір жерде.</p></span>${icon('chevron')}</a></div>`;
  }
  function lessonsView() {
    const next = L.lessons.find((lesson) => !progress.completedLessons.includes(lesson.id)) || L.lessons[0];
    return `<div class="route-enter"><div class="page-intro"><h1>Бір ереже. Бір қадам.</h1><p>Қысқа жаттығуларды орындап, күнделікті хатта қолдан.</p></div><section class="lesson-banner"><div><h2>${progress.completedLessons.length ? 'Жалғастыруға дайынсың ба?' : 'Алғашқы сабақтан бастайық.'}</h2><p>Таңда. Ойланып көр. Қате кетсе, түсіндірмеден кейін қайта байқап көр.</p><button class="btn btn-primary" data-action="lesson" data-id="${next.id}">${progress.completedLessons.length === L.lessons.length ? 'Қайталап шығу' : 'Сабақты бастау'} ${icon('arrow')}</button></div><img src="./assets/lesson-stack.svg" alt="Ә, Ң, І әріптері бар оқу карточкалары" width="210" height="140"></section><div class="section-heading"><h2>Қазақша жазу негіздері</h2><span class="section-meta">${progress.completedLessons.length} / ${L.lessons.length} сабақ орындалды</span></div><div class="lesson-list-grid">${L.lessons.map(lessonTile).join('')}</div><div class="note-row">${icon('help')}Сабақты алғаш аяқтағанда +20 XP беріледі. Қайталау ұпайды көбейтпейді.</div></div>`;
  }
  function chatView() {
    const s = activeScenario();
    return `<div class="chat-view route-enter"><div class="chat-intro"><div><h1 data-type-title>Әңгімеге қосыл.</h1><p>Қазақша жаз. Қате кетсе, өзің түзетіп көр.</p></div><button class="btn btn-ghost" data-action="chat-info">${icon('help')}<span>Бұл қалай жұмыс істейді?</span></button></div><label class="sr-only" for="scenario-select">Әңгіме жағдайын таңда</label><select id="scenario-select" class="chat-mobile-select">${L.scenarios.map((scenario) => `<option value="${scenario.id}" ${scenarioId === scenario.id ? 'selected' : ''}>${esc(scenario.title)} · ${esc(scenario.persona)}</option>`).join('')}</select><div class="chat-layout"><aside class="scenario-rail" aria-label="Әңгіме жағдайлары"><span class="rail-title">КІММЕН СӨЙЛЕСЕМІЗ?</span>${L.scenarios.map((scenario) => `<button class="scenario-option ${scenario.id === scenarioId ? 'selected' : ''}" data-action="scenario" data-id="${scenario.id}" aria-pressed="${scenario.id === scenarioId}"><span class="scenario-avatar">${icon(scenario.icon)}</span><span><strong>${esc(scenario.persona)}</strong><small>${esc(scenario.title)}</small></span></button>`).join('')}<div class="rail-info"><img class="rail-barys barys-mini" src="./assets/mascot-kit/10-chat.png" alt="" width="95" height="95">Бұл — дайын жағдайлармен жұмыс істейтін жаттығу серігі. Шынайы адамдарға хабарлама жіберілмейді.</div></aside><section class="messenger" aria-label="${esc(s.persona)} кейіпкерімен жаттығу"><header class="messenger-head">${mascotAvatar('chat-barys')}<div><strong>${esc(s.persona)}</strong><span class="mentor-subtitle"><i></i>Ойын кейіпкері · жаттығу режимі</span></div><button class="icon-button" data-action="chat-info" aria-label="Чат туралы">${icon('help')}</button></header><div class="task-banner">${icon('spark')}<span>${esc(s.task)}</span></div><div class="messages" id="messages" role="log" aria-label="Хабарламалар" aria-live="polite" aria-relevant="additions"></div><div id="suggestions" class="chat-suggestions" aria-label="Хабарлама үлгілері"></div><form id="chat-form" class="composer"><p id="chat-error" class="chat-error" role="alert" hidden></p><div class="composer-box"><label class="sr-only" for="chat-input">Хабарламаңды қазақша жаз</label><textarea id="chat-input" rows="1" maxlength="500" placeholder="Қазақша жазып көр…" aria-describedby="composer-hint" enterkeyhint="send">${esc(session().draft)}</textarea><button type="submit" class="send-button" aria-label="Хабарламаны жіберу">${icon('send')}</button></div><div class="composer-footer"><span id="composer-hint">${pendingCorrection() ? 'Белгіленген сөздерді өзің түзетіп, қайта жаз.' : 'Үлгіні таңдауға немесе өзің жазуға болады.'}</span><span id="char-count">${session().draft.length} / 500</span></div></form></section></div></div>`;
  }
  function messageHtml(message, index, animate = false) {
    if (message.role === 'correction') {
      if (message.resolved) return `<div class="correction-card resolved"><div class="correction-title">${icon('check')}Белгіленген сөздерді түзеттің!</div></div>`;
      const assessment = L.assessMessage(message.original);
      if (assessment.kind !== 'correction') return '';
      return `<article class="correction-card ${animate ? 'message-enter' : ''}"><div class="correction-title">${icon('pencil')}Бірге түзетіп көрейік</div><p>Мына сөздерге назар аудар:</p><p class="proposed">${esc(assessment.corrected)}</p><details><summary class="text-link">Неге бұлай жазылады?</summary><ul>${assessment.issues.map((issue) => `<li><b>${esc(issue.from)} → ${esc(issue.to)}</b><br>${esc(issue.reason)}</li>`).join('')}</ul></details><div class="correction-actions"><button class="btn btn-primary" data-action="rewrite" data-index="${index}">Өзім түзетемін ${icon('pencil')}</button><small>Өзің қайта жазсаң, +10 XP</small></div></article>`;
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
        const assessment = L.assessMessage(message.original);
        if (assessment.kind === 'correction') result.push({ original: message.original, corrected: assessment.corrected, scenario: L.scenarios.find((s) => s.id === id)?.title || '' });
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
    const badges = [{ name: 'Алғашқы қадам', icon: 'spark', earned: progress.xp > 0 }, { name: 'Сабақ шебері', icon: 'book', earned: progress.completedLessons.length === 4 }, { name: 'Үш күн қатарынан', icon: 'flame', earned: L.getStreak(progress, day()) >= 3 }];
    return `<div class="route-enter"><div class="page-intro"><h1>Әр қадамың есепте.</h1><p>Шағын жетістіктеріңді көріп, келесі қадамды таңда.</p></div><div class="progress-grid"><article class="progress-stat"><span>${icon('spark')}Жинаған ұпайың</span><strong>${progress.xp} XP</strong><small>Тек орындаған жаттығуларыңнан.</small></article><article class="progress-stat"><span>${icon('book')}Аяқталған сабақ</span><strong>${progress.completedLessons.length} / 4</strong><small>Әр сабақта үш қысқа тапсырма.</small></article><article class="progress-stat"><span>${icon('chat')}Жаттығу хабарламалары</span><strong>${practices.length}</strong><small>Үлгіге сай жазған не түзеткен хабарламалар.</small></article></div><div class="progress-main"><section class="panel"><h2>Келесі деңгейге</h2><p>Әр 100 XP сайын жаңа деңгей ашылады.</p><div class="level-progress"><span class="level-medal">${progress.level}</span><div class="level-info"><strong>${progress.level}-деңгей</strong><div class="meter"><span style="width:${progress.xp % 100}%"></span></div><small>${progress.xp % 100} / 100 XP · келесі деңгейге ${100 - progress.xp % 100} XP</small></div></div><h2 style="margin-top:26px">Соңғы жеті күн</h2><div class="week-grid">${week.join('')}</div><p style="margin:20px 0 0;font-size:9px">Боялған күндерде жаттығу орындағансың.</p></section><section class="panel"><h2>Кішкентай жеңістер</h2><p>Белгілерді нақты қадамдармен аш.</p><div class="badge-grid">${badges.map((badge) => `<div class="badge-item ${badge.earned ? 'earned' : ''}"><span class="badge-circle">${icon(badge.earned ? badge.icon : 'lock')}</span><strong>${badge.name}</strong><span>${badge.earned ? 'Ашылды' : 'Әзірге жабық'}</span></div>`).join('')}</div><div class="section-heading" style="margin-top:30px"><h2 style="font-size:16px">Соңғы жаттығулар</h2></div>${progress.events.length ? `<div class="activity-list">${progress.events.slice(-4).reverse().map((event) => `<div class="activity-row">${icon(event.type === 'lesson' ? 'book' : 'chat')}<span><strong>${esc(event.type === 'lesson' ? L.lessons.find((lesson) => lesson.id === event.lessonId)?.title : L.scenarios.find((s) => s.id === event.scenarioId)?.title)}</strong><small>${esc(event.day)}</small></span><b>+${event.xp} XP</b></div>`).join('')}</div>` : '<div class="empty-history">Алғашқы сабақты аяқта немесе чатта бір хабарлама жаз. Жаттығуларың осында пайда болады.</div>'}</section></div><section class="panel correction-history"><h2>Түзеткен сөздерің</h2>${corrections.length ? corrections.slice(-8).reverse().map((correction) => `<div class="saved-correction"><del>${esc(correction.original)}</del><strong>${esc(correction.corrected)}</strong><small>${esc(correction.scenario)}</small></div>`).join('') : '<p style="margin:15px 0 0">Чатта қате сөзді өзің түзеткенде, осы жерге сақталады.</p>'}</section></div>`;
  }
  function render() {
    renderNavigation(); updateStats();
    document.body.dataset.page = route;
    document.title = `${nav.find((item) => item.id === route).label} · Jaz!`;
    const views = { home: homeView, lessons: lessonsView, chat: chatView, progress: progressView };
    $('#main').innerHTML = `${storageWarning ? '<div class="storage-warning" role="status">Браузер деректі сақтауға рұқсат бермеді. Бұл жолғы прогресс бетті жапқанша ғана сақталады.</div>' : ''}${views[route]()}`;
    if (route === 'chat') renderMessages();
    window.JazMotion?.mount($('#main'), { route });
  }
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
  function sendMessage() {
    if (busy || route !== 'chat') return;
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) { $('#chat-error').textContent = 'Алдымен хабарлама жазып көр.'; $('#chat-error').hidden = false; input.focus(); return; }
    if (text.length > 500) { $('#chat-error').textContent = 'Бір хабарламаға 500 таңбаға дейін жазуға болады.'; $('#chat-error').hidden = false; return; }
    $('#chat-error').hidden = true;
    const id = scenarioId;
    const current = session();
    const pending = pendingCorrection();
    const assessment = L.assessMessage(text, { scenarioId, turn: current.turn });
    addMessage('you', text); current.turn++; current.draft = ''; input.value = ''; $('#char-count').textContent = '0 / 500';
    busy = true; window.JazMotion?.react('thinking'); renderMessages();
    setTimeout(() => {
      busy = false;
      window.JazMotion?.react('idle');
      if (pending && L.verifyCorrection(pending.original, text)) {
        pending.resolved = true;
        current.selectedOriginal = '';
        const gained = award({ type: 'correction', text, original: pending.original, scenarioId: id });
        const reply = assessment.kind === 'recognized' ? assessment.reply : 'Белгіленген сөздерді дұрыс түзеттің. Енді әңгімемізді жалғастырайық!';
        sessions[id].messages.push({ role: 'mentor', text: `${gained ? 'Түзету қабылданды! +10 XP. ' : 'Түзету қабылданды! '}${reply}`, time: time() });
      } else if (assessment.kind === 'correction') {
        sessions[id].messages.push({ role: 'correction', text: assessment.reply, original: text, resolved: false, time: time() });
        window.JazMotion?.react('nudge');
      } else {
        const gained = assessment.kind === 'recognized' ? award({ type: 'message', text, scenarioId: id }) : 0;
        sessions[id].messages.push({ role: 'mentor', text: assessment.reply, time: time() });
        if (assessment.kind === 'recognized' && !gained) notify('Бұл үлгі үшін бүгін ұпай алғансың. Басқа хабарлама жазып көр.');
      }
      saveChats();
      if (route === 'chat' && scenarioId === id) { renderMessages(assessment.suggestedReplies); $('#chat-input').focus(); }
    }, 550);
  }
  function startLesson(id) {
    const lesson = L.lessons.find((item) => item.id === id);
    if (!lesson) return;
    lessonRun = { lesson, index: 0, selected: null, checked: false, done: false, attempts: 0, wasComplete: progress.completedLessons.includes(id) };
    renderLesson(); $('#lesson-dialog').showModal();
  }
  function renderLesson() {
    if (!lessonRun) return;
    const run = lessonRun;
    const question = run.lesson.questions[run.index];
    $('#lesson-dialog').innerHTML = `<div class="dialog-top">${icon('book')}<h2 id="lesson-title">${esc(run.lesson.title)}</h2><button class="icon-button" data-action="close-lesson" aria-label="Сабақты жабу">${icon('close')}</button></div><div class="dialog-content">${run.done ? `<div class="lesson-complete"><img class="barys-mini" src="./assets/mascot-kit/05-celebrate.png" alt="Барыс сені құттықтайды" width="180" height="165"><h3>Жарайсың, орындадың!</h3><p>Үш тапсырманы да дұрыс аяқтадың.<br>Енді үйренгеніңді чатта қолданып көр.</p><div class="xp-award">${run.wasComplete ? 'Қайталау аяқталды' : '+20 XP'}</div>${run.wasComplete ? '<p>Бұл сабақ үшін ұпай бұрын берілген.</p>' : ''}<button class="btn btn-primary" data-action="lesson-to-chat">Чатта байқап көру ${icon('arrow')}</button></div>` : `<div class="lesson-topline"><span>${run.index + 1} / ${run.lesson.questions.length} тапсырма</span><span>Алғаш аяқтағанда +20 XP</span></div><div class="meter"><span style="width:${run.index / run.lesson.questions.length * 100}%"></span></div><h3 class="lesson-question">${esc(question.prompt)}</h3><div class="answer-list" role="group" aria-label="Жауап нұсқалары">${question.options.map((option, index) => `<button class="answer-option ${run.selected === index ? 'selected' : ''} ${run.checked && index === run.selected ? (index === question.answerIndex ? 'correct' : 'wrong') : ''}" data-action="answer" data-index="${index}" aria-pressed="${run.selected === index}" ${run.checked ? 'disabled' : ''}><span class="answer-number">${index + 1}</span>${esc(option)}</button>`).join('')}</div>${run.checked ? `<div class="answer-feedback ${run.selected !== question.answerIndex ? 'wrong' : ''}" role="status"><strong>${run.selected === question.answerIndex ? 'Дұрыс таңдадың!' : 'Тағы бір рет байқап көр.'}</strong><br>${esc(question.explanation)}</div>` : ''}<div class="dialog-actions"><button class="btn btn-primary" data-action="check-answer" ${run.selected === null ? 'disabled' : ''}>${run.checked ? (run.selected === question.answerIndex ? (run.index === run.lesson.questions.length - 1 ? 'Сабақты аяқтау' : 'Келесі тапсырма') : 'Қайта байқап көру') : 'Тексеру'} ${icon('arrow')}</button></div>`}</div>`;
  }
  function checkAnswer() {
    if (!lessonRun || lessonRun.selected === null || lessonRun.done) return;
    const run = lessonRun;
    const question = run.lesson.questions[run.index];
    if (!run.checked) { run.checked = true; run.attempts++; window.JazMotion?.react(run.selected === question.answerIndex ? 'success' : 'nudge'); }
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
    if (action === 'mascot-hello') { window.JazMotion?.react('hello'); }
    else if (action === 'lesson') startLesson(control.dataset.id);
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
    else if (action === 'chat-info') info('Жаттығу серігі туралы', '<p>Аян, Аружан және басқа кейіпкерлер — <strong>ойын кейіпкерлері</strong>. Бұл чатта шынайы адамдармен байланыс жоқ.</p><p>Осы прототип дайын жағдайлар мен белгілі сөз қателерін қолданады. Мысалы, «салем» → «сәлем». Мағынасы күмәнді қысқартуды бірден қатеге жатқызбай, нақтылауды сұрайды.</p><p><strong>Еркін ИИ-диалог әзірге қосылмаған.</strong> Жүйе танымаған хабарламаны бағаламайды. Төмендегі үлгілер арқылы жаттығуды жалғастыруға болады.</p>');
    else if (action === 'privacy') info('Сенің деректерің', '<p>Жаттығу прогресі мен чат тарихы <strong>осы браузердің жадында</strong> сақталады. Хабарламалар сыртқы ИИ қызметіне жіберілмейді.</p><p>Сайтты басқа құрылғыдан ашсаң, жаңа прогресс басталады. Браузер деректерін тазаласаң, жергілікті тарих та өшеді.</p><p>Тіркелу, төлем және жеке дерек енгізу қажет емес.</p>');
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
  render();
})();
