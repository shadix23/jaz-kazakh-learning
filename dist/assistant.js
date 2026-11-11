/*
 * «Барыс-көмекші» - a small chibi study helper for the learner.
 * Floating button (outside lessons) or the «Кеңес» button inside a lesson opens a panel.
 * The learner asks for advice about the current topic: the rule, an example, where to start,
 * why an answer was wrong. Server AI (/api/hint) answers when available; otherwise the
 * offline helper builds the advice from the curriculum topic itself.
 * The helper never shows the answer to the current task.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JazAssistant = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const IMG = { idle: './assets/assistant/03-avatar.png', wave: './assets/assistant/04-wave.png', think: './assets/assistant/06-thinking.png', wink: './assets/assistant/11-wink.png' };
  const QUICK = [['rule', 'Ережені түсіндірші'], ['example', 'Мысал келтірші'], ['start', 'Неден бастаймын?'], ['mistake', 'Неге қателестім?']];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------ offline advice (pure, testable) */
  // ctx: { topicId, topicKk, desc, task, lastExplanation }, P: JazPractice
  function localHint(kind, ctx, P, question) {
    const c = ctx || {};
    const name = c.topicKk || 'бұл тақырып';
    if (kind === 'rule') return { reply: `«${name}»: ${c.desc || 'ережені сабақтағы түсіндірмеден оқы.'}`, steps: c.task ? ['Ережені қазіргі тапсырмаға қолданып көр.', 'Әр нұсқаны ережемен салыстыр.'] : ['«Сабақтар» бөлімінде осы тақырыпты ашып көр.'] };
    if (kind === 'example') {
      let ex = null;
      try { if (P && c.topicId) { for (let i = 0; i < 4 && (!ex || ex.prompt === c.task); i++) ex = P.generate(c.topicId); } } catch (_) { ex = null; }
      if (ex && ex.prompt !== c.task) return { reply: `Мысал: ${ex.prompt}\nДұрыс жауабы: ${ex.options[ex.answer]}.\nНеге: ${ex.explanation}`, steps: ['Енді өз тапсырмаңды осы мысал сияқты шешіп көр.'] };
      return { reply: `«${name}» бойынша мысалды «Сабақтар» бөлімінен ал.`, steps: [] };
    }
    if (kind === 'mistake') {
      if (c.lastExplanation) return { reply: `Түсіндірме: ${c.lastExplanation}`, steps: ['Ережені тағы бір рет оқы.', 'Келесі тапсырмада асықпай тексер.'] };
      return { reply: 'Алдымен жауап беріп көр. Қате болса, неге екенін бірге қараймыз.', steps: [] };
    }
    if (kind === 'start') return { reply: `«${name}» тақырыбын үш қадаммен меңгересің.`, steps: [`Ережені оқы: ${c.desc || 'сабақтың басындағы түсіндірме'}`, '«Сабақтар» бөлімінде 5 тапсырманы шеш.', '«Барыс жолы» ойынында бекіт.'] };
    // free question without AI
    return { reply: `Қазір мен желісіз режимдемін, сондықтан осы тақырып бойынша ғана көмектесемін. «${name}»: ${c.desc || ''}`.trim(), steps: ['Төмендегі батырмалардың бірін таңда: ереже, мысал немесе неден бастау.'] };
  }

  /* ------------------------------------------------ UI */
  let el = null, panel = null, provider = () => null, busy = false, hintedOnce = false;
  const doc = typeof document !== 'undefined' ? document : null;
  const reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function face(state) { if (!panel) return; panel.querySelector('.bx-face').src = IMG[state] || IMG.wave; panel.dataset.state = state; }
  function addMsg(who, text, steps) {
    const log = panel.querySelector('.bx-log');
    const item = doc.createElement('div');
    item.className = 'bx-msg ' + who;
    item.innerHTML = `<p>${esc(text).replace(/\n/g, '<br>')}</p>${steps && steps.length ? `<ol>${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}`;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }
  function context() { try { return provider() || {}; } catch (_) { return {}; } }
  function renderContext() {
    const c = context();
    panel.querySelector('.bx-ctx').textContent = c.topicKk ? `Тақырып: ${c.topicKk}${c.task ? ' · тапсырма ашық' : ''}` : 'Тақырыпты «Сабақтар» бөлімінен таңда';
  }

  async function ask(kind, text) {
    if (busy) return;
    const c = context();
    const label = text || (QUICK.find(q => q[0] === kind) || [, ''])[1];
    addMsg('you', label);
    busy = true; face('think'); panel.classList.add('is-busy');
    let answer = null;
    if (root.__jazAiAvailable) {
      try {
        const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000);
        const r = await fetch('./api/hint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
          body: JSON.stringify({ kind, question: String(text || label).slice(0, 300), subject: c.subjectKk || '', topic: c.topicKk || c.topic || '', desc: c.desc || '', task: c.task || '', lastExplanation: c.lastExplanation || '' }) });
        clearTimeout(timer);
        if (r.ok) { const d = await r.json(); if (d && typeof d.reply === 'string' && d.reply) answer = { reply: d.reply, steps: Array.isArray(d.steps) ? d.steps.slice(0, 3) : [] }; }
      } catch (_) { answer = null; }
    }
    if (!answer) answer = localHint(text ? 'free' : kind, c, root.JazPractice, text);
    await new Promise(r => setTimeout(r, reduce() ? 0 : 350));
    busy = false; panel.classList.remove('is-busy');
    addMsg('barys', answer.reply, answer.steps);
    face('wink'); setTimeout(() => panel && panel.dataset.state === 'wink' && face('wave'), 1600);
  }

  // A modal dialog (lesson) makes everything outside it inert, so the panel lives inside the open dialog.
  function place() { const host = doc.querySelector('dialog[open]') || doc.body; if (panel.parentNode !== host) host.appendChild(panel); }
  function open() {
    if (!el) return;
    renderContext();
    place();
    panel.hidden = false;
    el.classList.add('is-open'); el.querySelector('.bx-fab').setAttribute('aria-expanded', 'true');
    if (!panel.querySelector('.bx-msg')) { face('wave'); addMsg('barys', 'Сәлем! Мен Барыспын. Сабақ бойынша кеңес керек пе? Ережені түсіндіріп, мысал көрсетемін - бірақ жауапты өзің табасың.'); }
    setTimeout(() => panel.querySelector('.bx-form input').focus({ preventScroll: true }), 50);
  }
  function close() {
    if (!el) return;
    panel.hidden = true;
    el.classList.remove('is-open'); el.querySelector('.bx-fab').setAttribute('aria-expanded', 'false');
  }

  function mount() {
    if (!doc || el) return;
    el = doc.createElement('div');
    el.className = 'bx-root';
    el.innerHTML = `<button class="bx-fab" type="button" aria-expanded="false" aria-controls="bx-panel" aria-label="Барыс-көмекшіден кеңес сұрау"><img src="${IMG.idle}" alt="" width="64" height="64"><span class="bx-bubble" aria-hidden="true">Кеңес керек пе?</span></button>`;
    panel = doc.createElement('section');
    panel.id = 'bx-panel'; panel.className = 'bx-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Барыс-көмекші'); panel.hidden = true;
    panel.innerHTML = `<header class="bx-head"><img class="bx-face" src="${IMG.wave}" alt="" width="52" height="52"><div class="bx-title"><strong>Барыс-көмекші</strong><small class="bx-ctx"></small></div><button class="bx-close" type="button" aria-label="Жабу">×</button></header>
      <div class="bx-log" aria-live="polite"></div>
      <div class="bx-typing" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="bx-quick">${QUICK.map(([k, t]) => `<button type="button" data-kind="${k}">${esc(t)}</button>`).join('')}</div>
      <form class="bx-form"><input type="text" maxlength="300" placeholder="Сұрағыңды жаз…" aria-label="Барысқа сұрақ"><button type="submit" aria-label="Жіберу"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-6 16-2-7z"/></svg></button></form>`;
    doc.body.appendChild(el); doc.body.appendChild(panel);
    el.querySelector('.bx-fab').addEventListener('click', () => (el.classList.contains('is-open') ? close() : open()));
    panel.querySelector('.bx-close').addEventListener('click', close);
    panel.querySelector('.bx-quick').addEventListener('click', e => { const b = e.target.closest('[data-kind]'); if (b) ask(b.dataset.kind); });
    panel.querySelector('.bx-form').addEventListener('submit', e => { e.preventDefault(); const i = panel.querySelector('.bx-form input'); const v = i.value.trim(); if (v) { i.value = ''; ask('free', v); } });
    panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    // When the lesson dialog closes, bring the panel back to the page (closed).
    doc.addEventListener('close', e => { if (e.target && e.target.tagName === 'DIALOG' && panel.parentNode === e.target) { doc.body.appendChild(panel); close(); } }, true);
    // A one-time friendly nudge.
    let seen = false; try { seen = sessionStorage.getItem('jaz.bx.hint') === '1'; } catch (_) {}
    if (!seen && !hintedOnce) { hintedOnce = true; setTimeout(() => { if (el && !el.classList.contains('is-open')) { el.classList.add('show-bubble'); setTimeout(() => el && el.classList.remove('show-bubble'), 5000); } try { sessionStorage.setItem('jaz.bx.hint', '1'); } catch (_) {} }, 3500); }
  }

  // Keep an open panel usable when a lesson dialog opens or closes.
  function raise() { if (panel && !panel.hidden) { place(); renderContext(); } }

  return { mount, open, close, raise, setContext: fn => { provider = typeof fn === 'function' ? fn : provider; if (panel && !panel.hidden) renderContext(); }, localHint };
});
