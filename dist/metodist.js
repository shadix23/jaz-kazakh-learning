(function (global) {
  'use strict';
  const KEY = 'jaz.methodist.v1';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const unique = values => [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b), 'ru'));
  let rows = [], pending = [], selection = null, storageError = false, scenario = 'clean', source = 'demo', topic = '', books = [], reserve = 8, weights = {};
  let host = null, studentHost = null, tab = 'diagnosis', subject = 'Математика', className = '', period = 0, detail = null, error = '', notice = '';
  const engine = () => global.JazCurriculum;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ csv: engine().exportCSV(rows), pending, selection, source, scenario })); }
    catch (_) { storageError = true; }
  }
  function restore() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!value || typeof value !== 'object') return;
      if (typeof value.csv === 'string' && value.csv.trim()) rows = engine().parseCSV(value.csv);
      pending = Array.isArray(value.pending) ? value.pending.filter(item => item && typeof item.lessonId === 'string' && typeof item.questionId === 'string' && typeof item.correct === 'boolean') : [];
      selection = value.selection && typeof value.selection.student_id === 'string' && typeof value.selection.class === 'string' ? value.selection : null;
      source = value.source === 'csv' ? 'csv' : 'demo'; scenario = value.scenario || 'clean';
    } catch (_) { notice = 'Сохранённые данные не удалось прочитать. Загрузите CSV повторно.'; }
  }
  function filtered() { return engine().filterRows(rows, { subject, className, period }); }
  function options(values, selected, all) { return (all ? `<option value="">${all}</option>` : '') + values.map(value => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(value)}</option>`).join(''); }
  function button(text, action, extra = '') { return `<button type="button" class="met-btn" data-met-action="${action}" ${extra}>${text}</button>`; }
  function percent(value) { return Number.isFinite(value) ? `${(Math.round((value + 1e-9) * 10) / 10).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%` : '—'; }
  function box(title, body, kind = '') { return `<section class="met-card ${kind}"><h2>${title}</h2>${body}</section>`; }
  function sourceUI() {
    const subjects = unique(['Математика', 'Казахский язык', ...rows.map(row => row.subject)]);
    const classes = unique(rows.filter(row => row.subject === subject).map(row => row.class));
    return `<section class="met-card met-source"><div class="met-source-heading"><div><h2>Источник данных</h2><p>${rows.length ? `${source === 'csv' ? 'Данные CSV' : 'Демо-данные'} · ${rows.length} ответов · ${unique(rows.map(row => row.student_id)).length} кодов учеников` : 'Загрузите таблицу ответов, чтобы увидеть диагностику.'}</p></div><span class="met-badge">Демо-данные · локальный режим</span></div><div class="met-controls"><label>Предмет<select data-met-field="subject">${options(subjects, subject)}</select></label><label>Сценарий<select data-met-field="scenario"><option value="clean"${source === 'demo' && scenario === 'clean' ? ' selected' : ''}>Чистый</option><option value="confounded"${source === 'demo' && scenario === 'confounded' ? ' selected' : ''}>Смешение</option><option value="csv"${source === 'csv' ? ' selected' : ''}${source === 'csv' ? '' : ' disabled'}>Данные CSV</option></select></label><label>Класс<select data-met-field="class">${options(classes, className, 'Все классы')}</select></label><label>Период<select data-met-field="period"><option value="0"${!period ? ' selected' : ''}>Вся четверть</option><option value="14"${period === 14 ? ' selected' : ''}>Последние 14 дней</option><option value="7"${period === 7 ? ' selected' : ''}>Последние 7 дней</option></select></label></div><div class="met-actions">${button('Загрузить свой CSV', 'import', '')}${button('Скачать шаблон CSV', 'template')}<input type="file" accept=".csv,text/csv" data-met-file hidden></div><p class="met-hint">Период отсчитывается от последней даты выбранного предмета. Используются только коды учеников; данные сохраняются в этом браузере. Кнопка шаблона скачивает текущий набор с обязательными колонками CSV.</p><details class="met-schema"><summary>Формат CSV</summary><p>Обязательные колонки: <code>student_id, class, teacher, subject, textbook, topic, question_id, correct, pretest, date</code>. Ответ: 0 или 1; входной балл: 0–100; дата: ГГГГ-ММ-ДД. Для разбора ошибок добавьте <code>question_text, answer, correct_answer</code>.</p></details></section>`;
  }
  function emptyUI() { return `<div class="met-empty"><span class="met-empty-icon" aria-hidden="true">▦</span><h3>${rows.length ? 'Нет ответов по выбранным фильтрам' : 'Диагностика начинается с данных'}</h3><p>${rows.length ? 'Выберите другой предмет, класс или период.' : 'Скачайте CSV-шаблон, заполните его и загрузите. Аналитика появится здесь.'}</p></div>`; }
  function legend() {
    return `<div class="met-legend">${engine().THRESHOLDS.map(item => `<span><i class="met-dot met-${item.key}"></i>${esc(item.label)}</span>`).join('')}<span><i class="met-hatch-key"></i>Мало данных</span></div>`;
  }
  function diagnosisUI() {
    const data = filtered();
    if (!data.length) return box('Диагностика тем', emptyUI());
    const topics = unique(data.map(row => row.topic)), classes = unique(data.map(row => row.class));
    const heatmap = `<div class="met-table-wrap"><table class="met-heatmap"><caption class="met-sr">Доля верных ответов по темам и классам</caption><thead><tr><th scope="col">Тема / класс</th>${classes.map(name => `<th scope="col">${esc(name)}</th>`).join('')}</tr></thead><tbody>${topics.map((topic, ti) => `<tr><th scope="row">${esc(topic)}</th>${classes.map((name, ci) => {
      const cell = engine().cell(data, topic, name);
      return `<td><button type="button" data-met-cell="${ti}:${ci}" class="met-cell met-${engine().band(cell.score)}${cell.lowData && cell.answers ? ' met-hatched' : ''}" aria-label="${esc(topic)}, класс ${esc(name)}: ${percent(cell.score)}, ${cell.n} учеников, ${cell.answers} ответов${cell.lowData ? ', мало данных' : ''}"><strong>${percent(cell.score)}</strong><small>n = ${cell.n} · ${cell.answers} отв.</small>${cell.lowData && cell.answers ? '<em>Мало данных</em>' : ''}</button></td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`;
    return box('Где возникают затруднения', `<p>Нажмите на ячейку, чтобы разобрать задания и ошибки.</p>${legend()}${heatmap}<p class="met-hint">n — число учеников. Штриховка: меньше 10 учеников или 30 ответов. Доля верных ответов описывает результат теста и сама по себе не измеряет эффект учебника.</p>${detailUI(data)}`);
  }
  function detailUI(data) {
    if (!detail) return '';
    const result = engine().cell(data, detail.topic, detail.className);
    if (!result.answers) return '';
    return `<section class="met-detail" aria-live="polite"><div class="met-section-row"><h3>${esc(detail.topic)} · ${esc(detail.className)}</h3>${button('Закрыть', 'close-detail')}</div><p>${percent(result.score)} верных · n = ${result.n} · ${result.answers} ответов${result.lowData ? ' · Мало данных: интерпретируйте осторожно.' : ''}</p><div class="met-table-wrap"><table class="met-table"><thead><tr><th>Задание</th><th>Ошибки</th><th>Частый неверный ответ</th></tr></thead><tbody>${result.questions.map(question => `<tr><td><strong>${esc(question.id)}</strong><small>${esc(question.text || 'Текст задания не передан')}</small></td><td>${percent(question.errorRate)}<small>${question.wrongCount} из ${question.total}</small></td><td>${esc(question.frequentWrong || 'Не указан')}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  function blockedUI(hours) {
    return box(hours ? 'Решение и часы' : 'Сравнение учебников', '<div class="met-blocked"><h3>Расчётный модуль не загрузился</h3><p>Обновите страницу. Исходные ответы сохраняются в этом браузере.</p></div>');
  }
  function comparisonState() {
    const data = filtered(), topics = unique(data.map(row => row.topic)), materials = unique(data.map(row => row.textbook));
    if (!topics.includes(topic)) topic = topics[0] || '';
    if (books.length !== 2 || books.some(book => !materials.includes(book)) || books[0] === books[1]) books = materials.slice(0, 2);
    return { data, topics, materials, result: topic && books.length === 2 ? engine().compare(data, topic, books) : null };
  }
  function signed(value) { return Number.isFinite(value) ? `${value > 0 ? '+' : ''}${(Math.round((value + 1e-9) * 10) / 10).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}` : '—'; }
  function verdict(result) {
    if (!result) return 'Для сравнения нужны два учебника и ответы по одной теме.';
    if (result.state === 'blocked') return 'Вывод заблокирован: учебник и учитель не разделены.';
    if (result.state === 'few') return 'Мало данных: в одной из групп меньше 10 учеников. Вывод не делается.';
    if (result.lo <= 0 && result.hi >= 0) return 'Различие не подтверждено данными: 95% интервал включает 0.';
    return `${result.diff > 0 ? books[1] : books[0]} связан с большим приростом. Это наблюдаемая связь, причинность не доказана.`;
  }
  function comparisonUI() {
    if (!engine().compare) return blockedUI(false);
    const state = comparisonState(), result = state.result;
    if (!state.data.length) return box('Сравнение учебников', emptyUI());
    const controls = `<div class="met-controls"><label>Одна тема<select data-met-field="topic">${options(state.topics, topic)}</select></label><label>Учебник А<select data-met-field="bookA">${options(state.materials, books[0])}</select></label><label>Учебник Б<select data-met-field="bookB">${options(state.materials, books[1])}</select></label></div>`;
    if (!result) return box('Сравнение учебников', `${controls}<p>${verdict(result)}</p>`);
    const det = result.det, teacherName = id => det.tn ? det.tn(id) : id;
    const teachers = unique(Object.keys(result.cells));
    const matrix = `<h3>Учитель × учебник</h3><div class="met-table-wrap"><table class="met-table"><thead><tr><th>Учитель</th><th>${esc(books[0])} · классы</th><th>${esc(books[1])} · классы</th></tr></thead><tbody>${teachers.map(teacher => `<tr><th scope="row">${esc(teacherName(teacher))}</th>${['A', 'B'].map(mat => `<td>${esc(result.perClass.filter(item => String(item.teacher) === teacher && item.mat === mat && item.n).map(item => item.id).join(', ') || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const classTable = `<h3>Наблюдаемые результаты по классам</h3><div class="met-table-wrap"><table class="met-table"><thead><tr><th>Класс</th><th>Учитель</th><th>Учебник</th><th>n</th><th>Верные</th><th>Прирост, п.п.</th></tr></thead><tbody>${result.perClass.map(item => `<tr><td>${esc(item.id)}</td><td>${esc(teacherName(item.teacher))}</td><td>${esc(books[item.mat === 'A' ? 0 : 1])}</td><td>${item.n}</td><td>${percent(item.score)}</td><td>${signed(item.gain)}</td></tr>`).join('')}</tbody></table></div>`;
    let analysis;
    if (result.state === 'blocked') {
      const concrete = ['A', 'B'].flatMap(mat => {
        const used = result.perClass.filter(item => item.mat === mat && item.n).map(item => item.teacher);
        if (new Set(used).size >= 2) return [];
        const targetBook = books[mat === 'A' ? 0 : 1], oppositeBook = books[mat === 'A' ? 1 : 0];
        const candidates = [...new Map(state.data.filter(row => row.topic === topic).map(row => [JSON.stringify([row.class, row.teacher]), row])).values()];
        const other = candidates.find(item => !used.includes(item.teacher) && item.textbook !== targetBook && candidates.some(sibling => sibling.teacher === item.teacher && sibling.class !== item.class && sibling.textbook === oppositeBook));
        return other ? [`Например, класс ${other.class} (${other.teacher}) переходит с ${other.textbook} на ${targetBook}; другой класс этого учителя продолжает использовать ${oppositeBook}.`] : [];
      });
      analysis = `<div class="met-blocked"><h3>Почему нельзя</h3><p>${esc(det.why)}</p><h3>Что можно сказать</h3><p>Можно описать результаты классов ниже. Разницу нельзя приписать учебнику.</p><h3>Что исправит</h3><ul>${(concrete.length ? concrete : det.fix).map(fix => `<li>${esc(fix)}</li>`).join('')}</ul><p>После изменения распределения повторно проверьте, что каждый учебник используют два учителя и есть общий учитель.</p></div>`;
    } else {
      const strata = `<div class="met-table-wrap"><table class="met-table"><thead><tr><th>Учитель</th><th>n А</th><th>Прирост А</th><th>n Б</th><th>Прирост Б</th></tr></thead><tbody>${(result.strata || []).map(item => `<tr><th>${esc(teacherName(item.t))}</th><td>${item.nA}</td><td>${signed(item.gA)}</td><td>${item.nB}</td><td>${signed(item.gB)}</td></tr>`).join('')}</tbody></table></div>`;
      const numeric = result.state === 'ok' && Number.isFinite(result.diff) ? `<div class="met-estimate"><strong>${signed(result.diff)} п.п.</strong><span>Б − А · 95% ДИ: ${signed(result.lo)} … ${signed(result.hi)}</span></div>${intervalSVG(result)}` : '';
      analysis = `${numeric}<p class="met-verdict">${esc(verdict(result))}</p>${strata}`;
    }
    return box('Сравнение по одной теме', `${controls}<p>Прирост = доля верных ответов ученика − входной балл. Разность Б − А считается внутри учителей; вес = nА × nБ / (nА + nБ). Интервал: 1000 воспроизводимых bootstrap-повторов по ученикам.</p>${matrix}${analysis}${classTable}`);
  }
  function intervalSVG(result) {
    const extent = Math.max(Math.abs(result.lo), Math.abs(result.hi), 1) * 1.25;
    const x = value => 30 + (value + extent) / (2 * extent) * 540;
    return `<svg class="met-interval" role="img" aria-label="95-процентный интервал от ${signed(result.lo)} до ${signed(result.hi)}, нулевая линия" viewBox="0 0 600 95"><line x1="30" y1="40" x2="570" y2="40" stroke="currentColor" opacity=".2"/><line x1="300" y1="12" x2="300" y2="65" stroke="currentColor" stroke-dasharray="4 4"/><line x1="${x(result.lo)}" y1="40" x2="${x(result.hi)}" y2="40" stroke="var(--met-blue)" stroke-width="6" stroke-linecap="round"/><circle cx="${x(result.diff)}" cy="40" r="8" fill="var(--met-blue)"/><text x="300" y="86" text-anchor="middle" fill="currentColor" font-size="13">0 п.п.</text></svg>`;
  }
  function hoursPlan() { return engine().planRows(filtered(), { reserve, weights, className: '', period: 0 }); }
  function hoursUI() {
    if (!engine().planRows) return blockedUI(true);
    const data = filtered(); if (!data.length) return box('Решение и часы', emptyUI());
    const plan = hoursPlan();
    return box('Резерв занятий', `<label class="met-reserve">Резерв занятий<input type="number" min="0" max="10000" step="1" value="${reserve}" data-met-reserve></label><p>Приоритет = доля учеников, не освоивших тему × вес темы. Не освоил: меньше 60% верных. Резерв распределяется методом наибольших остатков.</p><span class="met-badge">Правило приоритизации, а не прогноз прироста баллов</span>${plan.note ? `<p class="met-notice">${esc(plan.note)}</p>` : ''}<div class="met-table-wrap"><table class="met-table"><thead><tr><th>Тема</th><th>Не освоили</th><th>Доля</th><th>Вес</th><th>Приоритет</th><th>Занятия</th></tr></thead><tbody>${plan.rows.map((item, index) => `<tr><th>${esc(item.t.ru)}</th><td>${item.notM} / ${item.n}</td><td>${percent(item.share * 100)}</td><td><select aria-label="Вес темы ${esc(item.t.ru)}" data-met-weight="${index}">${[1, 2, 3].map(weight => `<option${weight === item.w ? ' selected' : ''}>${weight}</option>`).join('')}</select></td><td>${item.pr.toLocaleString('ru-RU', { maximumFractionDigits: 3 })}</td><td><strong>${item.h}</strong></td></tr>`).join('')}</tbody><tfoot><tr><th colspan="5">Распределено из резерва ${reserve}</th><td><strong>${plan.rows.reduce((sum, item) => sum + item.h, 0)}</strong></td></tr></tfoot></table></div><div class="met-decision-grid">${plan.rows.map(item => {
      const result = engine().cell(data, item.t.ru, ''), hardest = result.questions[0];
      return `<article class="met-decision"><h3>${esc(item.t.ru)}</h3><ol><li><strong>Затруднение:</strong> ${item.notM} из ${item.n} учеников не освоили тему.</li><li><strong>Доказательство:</strong> ${hardest ? `${esc(hardest.id)} — ${percent(hardest.errorRate)} ошибок` : 'Нет ответов'}.</li><li><strong>Материал:</strong> ${esc(unique(data.filter(row => row.topic === item.t.ru).map(row => row.textbook)).join(', '))}. Раздел и страницы требуют проверки методистом.</li><li><strong>Часы:</strong> ${item.h} занятий из резерва; вес ${item.w}.</li><li><strong>Ограничения:</strong> ${result.lowData ? 'Мало данных. ' : ''}Часы распределены по правилу; прирост не прогнозируется.</li></ol></article>`;
    }).join('')}</div>`);
  }
  function reportUI() {
    const data = filtered();
    if (!data.length) return box('Отчёт', emptyUI());
    const plan = engine().planRows ? hoursPlan() : null;
    const materials = unique(data.map(row => row.textbook));
    const reportBooks = books.length === 2 && books.every(book => materials.includes(book)) ? books : materials.slice(0, 2);
    const summaryRows = [['topic', 'score', 'n', 'answers', 'hardest_question', 'error_rate', 'comparison_status', 'diff', 'lo', 'hi', 'lessons']];
    return box('Отчёт по выбранным данным', `<p>Описательные результаты тестирования и распределение резерва ${reserve} занятий. Сравниваются ${esc(reportBooks.join(' и '))}; причинность не доказана.</p><div class="met-table-wrap"><table class="met-table"><thead><tr><th>Тема</th><th>Верные</th><th>Ученики / ответы</th><th>Трудное задание</th><th>Сравнение / занятия</th></tr></thead><tbody>${unique(data.map(row => row.topic)).map(topic => {
      const result = engine().cell(data, topic, '');
      const comparison = engine().compare && reportBooks.length === 2 ? engine().compare(data, topic, reportBooks) : null;
      const allocated = plan && plan.rows.find(item => item.t.ru === topic);
      const status = comparison ? comparison.state === 'ok' ? comparison.lo <= 0 && comparison.hi >= 0 ? 'Различие не подтверждено' : `${signed(comparison.diff)} п.п. (Б − А); связь` : comparison.state === 'few' ? 'Мало данных' : 'Смешение: вывод заблокирован' : 'Нет двух учебников';
      summaryRows.push([topic, result.score, result.n, result.answers, result.questions[0] ? result.questions[0].id : '', result.questions[0] ? result.questions[0].errorRate : '', status, comparison && comparison.state === 'ok' ? comparison.diff : '', comparison && comparison.state === 'ok' ? comparison.lo : '', comparison && comparison.state === 'ok' ? comparison.hi : '', allocated ? allocated.h : '']);
      return `<tr><th scope="row">${esc(topic)}</th><td>${percent(result.score)}${result.lowData ? '<small>Мало данных</small>' : ''}</td><td>${result.n} / ${result.answers}</td><td>${result.questions[0] ? `${esc(result.questions[0].id)}<small>${percent(result.questions[0].errorRate)} ошибок</small>` : '—'}</td><td>${esc(status)}${comparison && comparison.state === 'ok' ? `<small>95% ДИ ${signed(comparison.lo)} … ${signed(comparison.hi)}</small>` : ''}<small>${allocated ? allocated.h + ' занятий' : 'Часы не рассчитаны'}</small></td></tr>`;
    }).join('')}</tbody></table></div><div class="met-section-row"><h3>Отчёт CSV</h3><div class="met-actions">${button('Скопировать отчёт', 'copy')}${button('Скачать отчёт', 'summary')}${button('Скачать ответы CSV', 'export')}</div></div><p class="met-hint">Отчёт содержит результаты по темам, статусы сравнения, интервалы и распределённые занятия. Исходные ответы можно скачать отдельно.</p><textarea class="met-csv" aria-label="CSV отчёта по темам" readonly>${esc(summaryRows.map(row => row.map(value => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`).join(',')).join('\r\n'))}</textarea><p data-met-copy-status role="status"></p>`);
  }
  function render() {
    if (!host || document.body.dataset.mode === 'student') return;
    host.classList.add('metodist');
    const tabs = [['diagnosis', 'Диагностика тем'], ['comparison', 'Сравнение учебников'], ['hours', 'Решение и часы'], ['report', 'Отчёт']];
    host.innerHTML = `<div class="met-heading"><div><span class="met-eyebrow">Jaz! / Методист</span><h1>Учебная программа в данных</h1><p>От ответов учеников к разбору тем и заданий.</p></div></div>${sourceUI()}${error ? `<div class="met-alert" role="alert">${esc(error)}</div>` : ''}${notice ? `<p class="met-notice" role="status">${esc(notice)}</p>` : ''}${storageError ? '<p class="met-alert" role="status">Браузер не сохранил данные. Они доступны до закрытия страницы; скачайте CSV.</p>' : ''}<nav class="met-tabs" aria-label="Разделы методиста">${tabs.map(([id, label]) => `<button type="button" data-met-tab="${id}" aria-current="${tab === id ? 'page' : 'false'}" class="${tab === id ? 'is-active' : ''}">${label}</button>`).join('')}</nav>${tab === 'diagnosis' ? diagnosisUI() : tab === 'report' ? reportUI() : tab === 'hours' ? hoursUI() : comparisonUI()}<p class="met-footnote">Ответов из уроков в локальной очереди: ${pending.length}. Они добавляются в аналитику только при выбранном коде ученика и наличии входного балла по теме.</p>`;
  }
  function download(text, filename) {
    const blob = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function onClick(event) {
    const target = event.target.closest('[data-met-action], [data-met-tab], [data-met-cell]');
    if (!target || !host.contains(target)) return;
    if (target.dataset.metTab) { tab = target.dataset.metTab; render(); return; }
    if (target.dataset.metCell) {
      const data = filtered(), [ti, ci] = target.dataset.metCell.split(':').map(Number);
      detail = { topic: unique(data.map(row => row.topic))[ti], className: unique(data.map(row => row.class))[ci] }; render(); return;
    }
    const action = target.dataset.metAction;
    if (action === 'import') host.querySelector('[data-met-file]').click();
    if (action === 'template') download(engine().templateCSV(rows), 'jaz-template.csv');
    if (action === 'export') download(engine().exportCSV(filtered()), 'jaz-answers.csv');
    if (action === 'summary') download(host.querySelector('.met-csv').value, 'jaz-report.csv');
    if (action === 'close-detail') { detail = null; render(); }
    if (action === 'copy') {
      const textarea = host.querySelector('.met-csv'), status = host.querySelector('[data-met-copy-status]');
      try { await navigator.clipboard.writeText(textarea.value); status.textContent = 'CSV скопирован.'; }
      catch (_) { textarea.focus(); textarea.select(); status.textContent = 'Текст выделен. Нажмите Ctrl+C или ⌘C для копирования.'; }
    }
  }
  async function onChange(event) {
    const target = event.target;
    if (target.matches('[data-met-file]')) {
      const file = target.files[0]; if (!file) return;
      try {
        const next = engine().parseCSV(await file.text());
        source = 'csv'; rows = next; className = ''; detail = null; error = '';
        const subjects = unique(rows.map(row => row.subject));
        if (!subjects.includes(subject) && subjects.length) subject = subjects[0];
        notice = `CSV загружен: ${rows.length} ответов. Предыдущий набор заменён.`;
        save(); renderStudentContext(studentHost);
      } catch (problem) { error = problem.message || 'Не удалось прочитать CSV. Проверьте формат файла.'; }
      target.value = ''; render(); return;
    }
    if (target.dataset.metField === 'scenario' && target.value !== 'csv') { scenario = target.value; source = 'demo'; rows = [...engine().build(scenario, 'Математика'), ...engine().build(scenario, 'Казахский язык')]; className = ''; selection = null; error = ''; notice = 'Выбран демонстрационный сценарий. Предыдущий набор заменён.'; save(); renderStudentContext(studentHost); }
    if (target.dataset.metField === 'subject') { subject = target.value; className = ''; }
    if (target.dataset.metField === 'class') className = target.value;
    if (target.dataset.metField === 'period') period = Number(target.value);
    if (target.dataset.metField === 'topic') topic = target.value;
    if (target.dataset.metField === 'bookA') { if (target.value === books[1]) books.reverse(); else books[0] = target.value; }
    if (target.dataset.metField === 'bookB') { if (target.value === books[0]) books.reverse(); else books[1] = target.value; }
    if (target.matches('[data-met-reserve]')) { const value = Number(target.value); reserve = Number.isSafeInteger(value) ? Math.max(0, Math.min(10000, value)) : 0; }
    if (target.matches('[data-met-weight]')) { const item = hoursPlan().rows[Number(target.dataset.metWeight)]; if (item) weights[item.t.id] = Number(target.value); }
    detail = null; render();
  }
  function studentRows() { return rows.filter(row => row.subject === 'Казахский язык'); }
  function renderStudentContext(container) {
    if (container) studentHost = container;
    if (!studentHost) return;
    studentHost.classList.add('metodist');
    const available = studentRows(), classes = unique(available.map(row => row.class));
    if (!available.length) {
      studentHost.innerHTML = '<details class="met-student-context"><summary>Оқу деректері</summary><p>Жауаптар осы браузерде сақталады. Талдауға қосу үшін әдіскер режимінде «Казахский язык» пәні бар CSV жүктеп, сынып пен оқушы кодын таңдаңыз. Бастапқы балл ойдан қосылмайды.</p></details>'; return;
    }
    if (selection && selection.student_id && !available.some(row => row.student_id === selection.student_id && row.class === selection.class)) selection = null;
    if (!selection && source === 'demo') selection = { class: available[0].class, student_id: available[0].student_id };
    const chosenClass = selection ? selection.class : '', students = unique(available.filter(row => row.class === chosenClass).map(row => row.student_id));
    studentHost.innerHTML = `<details class="met-student-context"><summary>Оқу деректері${selection ? ` · ${esc(selection.class)} / ${esc(selection.student_id)}` : ''}</summary><div class="met-controls"><label>Сынып<select data-met-student-class>${options(classes, chosenClass, 'Сыныпты таңдаңыз')}</select></label><label>Оқушы коды<select data-met-student-id${chosenClass ? '' : ' disabled'}>${options(students, selection ? selection.student_id : '', 'Кодты таңдаңыз')}</select></label></div><p>Тек кодты таңдаңыз. Жауап тақырыбы мен бастапқы балл CSV деректеріне сәйкес келгенде талдауға қосылады.</p></details>`;
    studentHost.onchange = event => {
      if (event.target.matches('[data-met-student-class]')) { selection = { class: event.target.value, student_id: '' }; save(); renderStudentContext(studentHost); const details = studentHost.querySelector('details'); details.open = true; }
      if (event.target.matches('[data-met-student-id]')) { selection = { class: studentHost.querySelector('[data-met-student-class]').value, student_id: event.target.value }; save(); }
    };
  }
  function recordAnswer(payload) {
    if (!payload || typeof payload.lessonId !== 'string' || typeof payload.questionId !== 'string' || ![true, false, 0, 1].includes(payload.correct)) return;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(payload.date || '') ? payload.date : new Date().toISOString().slice(0, 10);
    const answer = { lessonId: payload.lessonId, lessonTitle: String(payload.lessonTitle || payload.lessonId), questionId: payload.questionId, questionText: String(payload.questionText || ''), correct: Boolean(payload.correct), answer: String(payload.answer || ''), correctAnswer: String(payload.correctAnswer || ''), date, context: selection ? { ...selection } : null, linked: false };
    const mappedTopic = ({ letters: 'Буквы Ә, І, Қ, Ғ', ng: 'Н и Ң', questions: 'Вопросительные слова', endings: 'Окончания направления' })[payload.lessonId] || answer.lessonTitle;
    const context = selection && studentRows().filter(row => row.class === selection.class && row.student_id === selection.student_id && (row.topic === mappedTopic || row.topic === answer.lessonTitle));
    if (context && context.length) {
      const baseline = context[0];
      const contexts = unique(context.map(row => JSON.stringify([row.teacher, row.textbook, row.pretest])));
      if (contexts.length === 1) {
        rows.push({ ...baseline, question_id: answer.questionId, question_text: answer.questionText, correct: answer.correct ? 1 : 0, answer: answer.answer, correct_answer: answer.correctAnswer, date });
        answer.linked = true;
      }
    }
    pending.push(answer); save(); render();
  }
  function mount(container) {
    if (!container) return;
    if (!engine()) { container.textContent = 'Модуль данных не загружен. Обновите страницу.'; return; }
    if (host !== container) { if (host) { host.removeEventListener('click', onClick); host.removeEventListener('change', onChange); } host = container; host.addEventListener('click', onClick); host.addEventListener('change', onChange); }
    render();
  }
  global.JazMetodist = { mount, renderStudentContext, recordAnswer };
  if (engine()) { restore(); if (!rows.length && source !== 'csv' && engine().build) rows = [...engine().build('clean', 'Математика'), ...engine().build('clean', 'Казахский язык')]; }
})(window);
