/* Approximate reference timings: mascot pop ~280ms, title starts ~300ms,
   curved hero reveal ~700ms, cards separated by ~80-100ms.
   Nav sliding and character reactions are original adaptations. */
(() => {
  'use strict';
  let visibilityObserver;
  let reactionTimer;
  let reactionToken = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const states = new Set(['idle', 'hello', 'nudge', 'success', 'thinking']);
  const poseFiles = {
    idle: '01-primary.png', hello: '04-wave.png', success: '05-celebrate.png',
    thinking: '06-thinking.png', nudge: '11-wink.png'
  };
  const poseImages = new Map();
  let warmedPoses = false;

  function poseImage(file) {
    if (!poseImages.has(file)) {
      const image = new Image();
      image.decoding = 'async';
      image.src = `./assets/mascot-kit/${file}`;
      poseImages.set(file, image);
    }
    return poseImages.get(file);
  }

  function syncPose(state, token) {
    const file = poseFiles[state] || poseFiles.idle;
    const preload = poseImage(file);
    const replace = () => {
      // A late asset response must not restore an older reaction or an old route.
      if (reactionToken !== token || document.body.dataset.mascotState !== state) return;
      for (const image of document.querySelectorAll('[data-state-poses]')) {
        image.src = preload.src;
        image.dataset.poseState = state;
      }
    };
    if (preload.complete && preload.naturalWidth) replace();
    else preload.addEventListener('load', replace, { once: true });
  }

  function typeTitle(title) {
    if (title.dataset.typeReady === 'true') return;
    // Translate first (global «Қаз | Рус» switch): after splitting into letters the dictionary cannot match.
    if (window.JazI18n) window.JazI18n.apply(title);
    const label = title.getAttribute('aria-label') || title.innerText.replace(/\s+/gu, ' ').trim();
    const original = [...title.childNodes];
    let index = 0;
    const fragment = document.createDocumentFragment();
    function append(node, target) {
      if (node.nodeType === Node.TEXT_NODE) {
        for (const character of Array.from(node.textContent)) {
          const span = document.createElement('span');
          span.className = 'type-char';
          span.textContent = character;
          span.setAttribute('aria-hidden', 'true');
          span.style.setProperty('--type-index', String(index++));
          target.appendChild(span);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const copy = node.cloneNode(false);
        if (node.tagName === 'BR') target.appendChild(copy);
        else {
          [...node.childNodes].forEach((child) => append(child, copy));
          target.appendChild(copy);
        }
      }
    }
    original.forEach((node) => append(node, fragment));
    title.replaceChildren(fragment);
    title.setAttribute('aria-label', label);
    title.dataset.typeReady = 'true';
  }

  function reveal(element, delay) {
    element.classList.add('motion-reveal');
    element.style.setProperty('--reveal-delay', `${delay}ms`);
  }

  function mount(root, options = {}) {
    if (!root) return;
    document.body.classList.add('motion-ready');
    root.dataset.motionRoute = options.route || '';
    root.querySelectorAll('[data-type-title]').forEach(typeTitle);
    const hasHero = Boolean(root.querySelector('.hero'));
    root.querySelectorAll('.hero .eyebrow, .hero p, .hero .btn').forEach((element, index) => reveal(element, 380 + index * 70));
    root.querySelectorAll('.page-intro, .chat-intro').forEach((element) => reveal(element, 30));
    root.querySelectorAll('.section-heading').forEach((element, index) => reveal(element, (hasHero ? 340 : 120) + index * 100));
    root.querySelectorAll('.daily-plan, .lesson-banner, .scenario-rail, .messenger, .history-strip').forEach((element, index) => reveal(element, (hasHero ? 420 : 140) + index * 75));
    root.querySelectorAll('.lesson-tile, .progress-stat, .progress-main > .panel').forEach((element, index) => reveal(element, (hasHero ? 490 : 200) + index * 80));
    root.querySelectorAll('.hero-visual').forEach((element) => element.classList.add('mascot-entrance'));
    if (visibilityObserver) visibilityObserver.disconnect();
    if ('IntersectionObserver' in window) {
      visibilityObserver = new IntersectionObserver((entries) => entries.forEach((entry) => entry.target.classList.toggle('mascot-paused', !entry.isIntersecting)), { threshold: 0.05 });
      root.querySelectorAll('.mascot-stage').forEach((element) => visibilityObserver.observe(element));
    }
    if (!document.body.dataset.mascotState) document.body.dataset.mascotState = 'idle';
    syncPose(document.body.dataset.mascotState, reactionToken);
    if (!warmedPoses) {
      warmedPoses = true;
      setTimeout(() => [...new Set(Object.values(poseFiles))].forEach(poseImage), 500);
    }
  }

  function react(state) {
    if (!states.has(state)) state = 'idle';
    clearTimeout(reactionTimer);
    const token = ++reactionToken;
    document.body.dataset.mascotState = state;
    syncPose(state, token);
    if (state === 'success') {
      const counter = document.querySelector('.xp-pill');
      if (counter) {
        counter.classList.remove('xp-earned');
        void counter.offsetWidth;
        counter.classList.add('xp-earned');
      }
    }
    if (state !== 'thinking' && state !== 'idle') {
      reactionTimer = setTimeout(() => {
        if (reactionToken === token) {
          document.body.dataset.mascotState = 'idle';
          syncPose('idle', token);
        }
      }, 1100);
    }
  }

  function deckChanged(root, direction = 1) {
    if (!root) return;
    const feature = root.querySelector('.scenario-feature');
    if (!feature || reduced.matches) return;
    feature.style.setProperty('--deck-direction', Number(direction) < 0 ? '-1' : '1');
    feature.classList.remove('deck-arriving');
    void feature.offsetWidth;
    feature.classList.add('deck-arriving');
  }

  document.addEventListener('visibilitychange', () => document.body.classList.toggle('motion-hidden', document.hidden));
  window.JazMotion = { mount, react, deckChanged };
})();
