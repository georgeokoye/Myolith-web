/* Myolith website behaviour. No libraries, no tracking. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Sticky header and reading progress ---------- */

  const header = $('.site-header');
  const progress = $('.progress');
  let ticking = false;

  function onScroll() {
    ticking = false;
    const y = window.scrollY || 0;
    if (header) header.classList.toggle('is-stuck', y > 8);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------- Sections that rise into view ---------- */

  const risers = $$('.rise');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const seen = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); seen.unobserve(entry.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    risers.forEach((el) => seen.observe(el));
  } else {
    risers.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- The 3D figure ----------
     Each stage holds the app's own WebGL figure in a frame. The page talks to it with messages.
     Until the figure says it is ready, a still picture shows in its place, so the page works
     without JavaScript or WebGL too. */

  const figures = [];

  class Figure {
    constructor(host) {
      this.host = host;
      this.frame = null;
      this.ready = false;
      this.queue = [];
      this.onReady = null;
      this.onPhase = null;
      figures.push(this);
    }

    mount() {
      if (this.frame || !this.host) return;
      const frame = document.createElement('iframe');
      frame.src = this.host.dataset.src;
      frame.title = this.host.dataset.title || 'Interactive 3D figure';
      frame.setAttribute('scrolling', 'no');
      frame.setAttribute('allow', 'fullscreen');
      this.host.insertBefore(frame, this.host.firstChild);
      this.frame = frame;
      // The hint has done its job once the figure has been touched.
      const touched = () => this.host.classList.add('is-touched');
      this.host.addEventListener('pointerdown', touched, { once: true });
      window.addEventListener('blur', () => {
        if (document.activeElement === frame) touched();
      });
    }

    send(fn, ...args) {
      if (!this.ready) { this.queue.push([fn, args]); return; }
      this.frame.contentWindow.postMessage({ to: 'myolith-figure', fn, args }, '*');
    }

    receive(message) {
      if (message.type === 'ready') {
        this.ready = true;
        const pending = this.queue;
        this.queue = [];
        if (this.onReady) this.onReady();
        pending.forEach(([fn, args]) => this.send(fn, ...args));
        // Let the first frame draw before the still picture fades out.
        window.setTimeout(() => this.host.classList.add('is-live'), 350);
      } else if (message.type === 'phase' && this.onPhase) {
        this.onPhase(message.seg);
      }
    }
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.from !== 'myolith-figure') return;
    const figure = figures.find((f) => f.frame && f.frame.contentWindow === event.source);
    if (figure) figure.receive(data);
  });

  /* ---------- Figure explorer ---------- */

  const EXERCISES = {
    'bench-press': {
      name: 'Bench Press', prime: 'Pectoralis major', syn: 'Anterior deltoid, triceps', stab: 'Latissimus dorsi, forearms',
      alt: 'Bench press on the Myolith 3D figure, with the chest muscles lit',
      cues: [['Lower', 'Lower the bar to the lower chest with the elbows tucked in, not flared.'],
             ['Touch', 'Light touch on the sternum. No bounce.'],
             ['Press', 'Press up and slightly back toward the shoulders. Drive the feet into the floor.'],
             ['Lockout', 'Lock out over the shoulders with the shoulder blades still pinned.']]
    },
    'pull-up': {
      name: 'Pull-Up', prime: 'Latissimus dorsi', syn: 'Biceps, posterior deltoid, trapezius', stab: 'Forearms, rectus abdominis',
      alt: 'Pull-up on the Myolith 3D figure, with the lats lit',
      cues: [['Pull', 'Drive the elbows down toward the hips. The chest rises to the bar.'],
             ['Top', 'Chin clears the bar without craning the neck.'],
             ['Lower', 'Lower slowly, all the way down.'],
             ['Hang', 'Reach full arm extension before the next rep.']]
    },
    'overhead-press': {
      name: 'Overhead Press', prime: 'Anterior and lateral deltoid', syn: 'Triceps, trapezius', stab: 'Abs, obliques, spinal erectors, glutes',
      alt: 'Overhead press on the Myolith 3D figure, with the shoulders lit',
      cues: [['Press', 'Press straight up. Move the head back to clear the bar, then bring it through.'],
             ['Lockout', 'Bar over the mid-foot, biceps by the ears, shoulders shrugged up slightly.'],
             ['Lower', 'Lower under control along the same path to the collarbones.'],
             ['Reset', 'Re-brace before the next rep.']]
    },
    'hammer-curl': {
      name: 'Hammer Curl', prime: 'Biceps, forearms', syn: 'None', stab: 'Anterior deltoid, trapezius',
      alt: 'Hammer curl on the Myolith 3D figure, with the biceps and forearms lit',
      cues: [['Curl', 'Curl the dumbbells up with the thumbs pointing at the ceiling.'],
             ['Squeeze', 'Hold at the top without the elbows drifting forward.'],
             ['Lower', 'Lower slowly and under control.'],
             ['Reset', 'Reach full extension before the next rep.']]
    },
    'plank': {
      name: 'Plank', prime: 'Rectus abdominis', syn: 'Obliques', stab: 'Glutes, quadriceps, anterior deltoid',
      alt: 'Plank on the Myolith 3D figure, with the abs lit',
      cues: [['Brace', 'Squeeze the glutes and pull the ribs toward the pelvis.'],
             ['Hold', 'Keep the hips level with the shoulders. Do not let them sag.'],
             ['Breathe', 'Take short breaths behind the brace without losing position.'],
             ['Reset', 'End the set when the hips start to drop.']]
    },
    'back-squat': {
      name: 'Back Squat', prime: 'Quadriceps, glutes', syn: 'Adductors, hamstrings', stab: 'Spinal erectors, abs, calves',
      alt: 'Back squat on the Myolith 3D figure, with the quadriceps and glutes lit',
      cues: [['Lower', 'Break at the hips and knees together. Knees track over the toes.'],
             ['Bottom', 'Hip crease at or just below the knee, heels flat, chest up.'],
             ['Drive', 'Push the floor away. Hips and chest rise at the same rate.'],
             ['Top', 'Stand tall, re-brace and reset your breath.']]
    }
  };

  let sex = 'm';
  try { if (window.localStorage.getItem('myolith-sex') === 'f') sex = 'f'; } catch (error) { /* private mode */ }
  let currentID = 'bench-press';

  const explorerHost = $('#explorer-stage');
  const avatarHost = $('#avatar-stage');
  const explorer = explorerHost ? new Figure(explorerHost) : null;
  const avatar = avatarHost ? new Figure(avatarHost) : null;

  const nameEl = $('#explore-title');
  const primeEl = $('#ex-prime');
  const synEl = $('#ex-syn');
  const stabEl = $('#ex-stab');
  const phaseEl = $('#ex-phase');
  const cueEl = $('#ex-cue');
  const explorerPoster = $('#explorer-poster');
  const avatarPoster = $('#avatar-poster');

  function showPhase(index) {
    const exercise = EXERCISES[currentID];
    const cue = exercise.cues[index] || exercise.cues[0];
    if (phaseEl) phaseEl.textContent = cue[0];
    if (cueEl) cueEl.textContent = cue[1];
  }

  function press(buttons, match) {
    buttons.forEach((button) => button.setAttribute('aria-pressed', match(button) ? 'true' : 'false'));
  }

  function selectExercise(id) {
    const exercise = EXERCISES[id];
    if (!exercise) return;
    currentID = id;
    press($$('.chip[data-ex]'), (b) => b.dataset.ex === id);
    press($$('[data-view]'), (b) => b.dataset.view === 'auto');
    if (nameEl) nameEl.textContent = exercise.name;
    if (primeEl) primeEl.textContent = exercise.prime;
    if (synEl) synEl.textContent = exercise.syn;
    if (stabEl) stabEl.textContent = exercise.stab;
    showPhase(0);
    if (explorerPoster) {
      explorerPoster.src = 'assets/img/ex-' + id + '.png';
      explorerPoster.alt = exercise.alt;
    }
    if (explorer) {
      explorer.send('spin', false);
      explorer.send('load', id, true);
      explorer.send('view', 'auto');
      explorer.send('play', !reduceMotion);
    }
  }

  function selectSex(value) {
    sex = value === 'f' ? 'f' : 'm';
    try { window.localStorage.setItem('myolith-sex', sex); } catch (error) { /* private mode */ }
    press($$('[data-sex]'), (b) => b.dataset.sex === sex);
    if (avatarPoster) {
      avatarPoster.src = 'assets/img/avatar-' + sex + '.png';
      avatarPoster.alt = 'The ' + (sex === 'f' ? 'female' : 'male') + ' Myolith 3D figure';
    }
    if (explorer) explorer.send('sex', sex);
    if (avatar) avatar.send('sex', sex);
  }

  $$('.chip[data-ex]').forEach((chip) => chip.addEventListener('click', () => selectExercise(chip.dataset.ex)));
  $$('[data-sex]').forEach((button) => button.addEventListener('click', () => selectSex(button.dataset.sex)));
  $$('[data-view]').forEach((button) => button.addEventListener('click', () => {
    press($$('[data-view]'), (b) => b === button);
    if (explorer) explorer.send('view', button.dataset.view);
  }));

  if (explorer) {
    explorer.onPhase = showPhase;
    explorer.onReady = () => {
      explorer.send('sex', sex);
      explorer.send('spin', false);
      explorer.send('load', currentID, true);
      explorer.send('play', !reduceMotion);
    };
  }
  if (avatar) {
    avatar.onReady = () => {
      avatar.send('sex', sex);
      avatar.send('anatomy', '', true);
      avatar.send('play', true);
      avatar.send('spin', !reduceMotion);
    };
  }
  press($$('[data-sex]'), (b) => b.dataset.sex === sex);
  if (sex === 'f' && avatarPoster) selectSex('f');

  // Start each figure only when it is close to the screen, so the page itself loads fast.
  function mountWhenNear(figure) {
    if (!figure) return;
    if (!('IntersectionObserver' in window)) { figure.mount(); return; }
    const near = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { near.disconnect(); figure.mount(); }
    }, { rootMargin: '600px 0px' });
    near.observe(figure.host);
  }
  const start = () => { mountWhenNear(explorer); mountWhenNear(avatar); };
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });

  // A figure that is off screen stops moving, which saves battery.
  if ('IntersectionObserver' in window) {
    const visible = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const figure = figures.find((f) => f.host === entry.target);
        if (figure && figure.ready) figure.send('play', entry.isIntersecting && !(reduceMotion && figure === explorer));
      }
    }, { threshold: 0.05 });
    [explorerHost, avatarHost].forEach((host) => { if (host) visible.observe(host); });
  }

  /* ---------- Hold to commit, then pricing ---------- */

  const hold = $('#hold');
  const holdButton = $('#hold-btn');
  const holdWord = $('#hold-word');
  const holdLabel = $('#hold-label');
  const pricing = $('#pricing');
  const HOLD_MS = 1600;
  let holdTimer = 0;
  let committed = false;

  function reveal(scroll) {
    if (!pricing) return;
    committed = true;
    window.clearTimeout(holdTimer);
    pricing.hidden = false;
    if (hold) { hold.classList.remove('is-holding'); hold.classList.add('is-done'); }
    if (holdWord) holdWord.textContent = 'DONE';
    if (holdLabel) holdLabel.textContent = 'You are in. Here is what it costs.';
    if (holdButton) holdButton.setAttribute('aria-expanded', 'true');
    // From here on, every "Start my free week" button goes straight to the price.
    $$('[data-cta]').forEach((link) => link.setAttribute('href', '#pricing'));
    try { window.sessionStorage.setItem('myolith-committed', '1'); } catch (error) { /* private mode */ }
    if (scroll) {
      window.requestAnimationFrame(() => pricing.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }));
    }
  }

  function startHold() {
    if (committed || !hold) return;
    window.clearTimeout(holdTimer);
    hold.classList.add('is-holding');
    if (holdLabel) holdLabel.textContent = 'Keep holding';
    holdTimer = window.setTimeout(() => reveal(true), HOLD_MS);
  }

  function endHold() {
    if (committed || !hold) return;
    window.clearTimeout(holdTimer);
    hold.classList.remove('is-holding');
    if (holdLabel) holdLabel.textContent = 'Hold to commit';
  }

  if (holdButton) {
    holdButton.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      startHold();
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => holdButton.addEventListener(type, endHold));
    holdButton.addEventListener('contextmenu', (event) => event.preventDefault());
    // Keyboards, switches and screen readers press once instead of holding.
    holdButton.addEventListener('click', (event) => { if (event.detail === 0 && !committed) reveal(true); });
  }

  let already = false;
  try { already = window.sessionStorage.getItem('myolith-committed') === '1'; } catch (error) { /* private mode */ }
  if (already) reveal(false);
})();
