/* Myolith home page behaviour. No libraries. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function press(buttons, match) {
    buttons.forEach((button) => button.setAttribute('aria-pressed', match(button) ? 'true' : 'false'));
  }

  /* ---------- Scroll: sticky header, progress line, drifting phones, the lit sentence ---------- */

  const header = $('.top');
  const progress = $('.progress');
  const drifters = $$('[data-drift]');
  const show = $('.show');
  const lit = $('[data-lit]');
  let litWords = [];

  if (lit && !reduceMotion) {
    const words = lit.textContent.trim().split(/\s+/);
    lit.setAttribute('aria-label', lit.textContent.trim());
    lit.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word;
      span.setAttribute('aria-hidden', 'true');
      lit.appendChild(span);
      if (i < words.length - 1) lit.appendChild(document.createTextNode(' '));
      litWords.push(span);
    });
  }

  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY || 0;
    const vh = window.innerHeight;
    if (header) header.classList.toggle('is-stuck', y > 8);
    if (progress) {
      const max = document.documentElement.scrollHeight - vh;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }
    if (show && !reduceMotion) {
      const box = show.getBoundingClientRect();
      if (box.bottom > 0 && box.top < vh) {
        const t = clamp((vh - box.top) / (vh + box.height), 0, 1);
        drifters.forEach((el) => {
          el.style.transform = 'translate3d(' + (Number(el.dataset.drift) * (t - 0.3) * 46).toFixed(1) + 'px,' + ((0.5 - t) * 70).toFixed(1) + 'px,0)';
        });
      }
    }
    if (litWords.length) {
      const box = lit.getBoundingClientRect();
      const t = clamp((vh * 0.85 - box.top) / (vh * 0.5 + box.height), 0, 1);
      const upTo = Math.round(t * litWords.length);
      litWords.forEach((span, i) => span.classList.toggle('is-lit', i < upTo));
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

  /* ---------- Pointer play: phones that lean, cards that catch the light, a button that follows ---------- */

  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach((el) => {
      const host = el.parentElement;
      host.addEventListener('pointermove', (event) => {
        const box = host.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        el.classList.add('is-moving');
        el.style.setProperty('--ry', (x * 16).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
      });
      host.addEventListener('pointerleave', () => {
        el.classList.remove('is-moving');
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--rx', '0deg');
      });
    });

    $$('[data-spot]').forEach((el) => {
      el.addEventListener('pointermove', (event) => {
        const box = el.getBoundingClientRect();
        el.style.setProperty('--mx', (event.clientX - box.left) + 'px');
        el.style.setProperty('--my', (event.clientY - box.top) + 'px');
      });
    });

    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('pointermove', (event) => {
        const box = el.getBoundingClientRect();
        const x = event.clientX - (box.left + box.width / 2);
        const y = event.clientY - (box.top + box.height / 2);
        el.style.transform = 'translate(' + (x * 0.18).toFixed(1) + 'px,' + (y * 0.3).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
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

  /* ---------- The hero phone: a goblet squat you can turn ---------- */

  const GOBLET = [
    ['Lower', 'Sit straight down between the heels.'],
    ['Bottom', 'Elbows brush the inside of the knees with the chest up.'],
    ['Drive', 'Drive through the whole foot back to standing.'],
    ['Top', 'Squeeze the glutes and re-brace.']
  ];
  const heroHost = $('#hero-stage');
  const hero = heroHost ? new Figure(heroHost) : null;
  const heroPhase = $('#hero-phase');
  const heroCue = $('#hero-cue');
  const heroSlow = $('#hero-slow');
  let heroPanel = 'see';

  if (hero) {
    hero.onPhase = (index) => {
      const cue = GOBLET[index] || GOBLET[0];
      if (heroPhase) heroPhase.textContent = cue[0];
      if (heroCue) heroCue.textContent = cue[1];
    };
    hero.onReady = () => {
      hero.send('sex', 'f');
      hero.send('spin', false);
      hero.send('load', 'goblet-squat', true);
      hero.send('view', '180');
      hero.send('play', !reduceMotion);
    };
    $$('[data-hview]').forEach((button) => button.addEventListener('click', () => {
      press($$('[data-hview]'), (b) => b === button);
      hero.send('view', button.dataset.hview);
    }));
    if (heroSlow) heroSlow.addEventListener('click', () => {
      const slow = heroSlow.getAttribute('aria-pressed') !== 'true';
      heroSlow.setAttribute('aria-pressed', slow ? 'true' : 'false');
      hero.send('speed', slow ? 0.35 : 1);
      hero.send('play', true);
    });
    $$('[data-muscle]').forEach((button) => {
      const light = (on) => hero.send('hover', on ? button.dataset.muscle : null);
      button.addEventListener('pointerenter', () => light(true));
      button.addEventListener('pointerleave', () => { if (button.getAttribute('aria-pressed') !== 'true') light(false); });
      button.addEventListener('click', () => {
        const on = button.getAttribute('aria-pressed') !== 'true';
        press($$('[data-muscle]'), (b) => on && b === button);
        light(on);
      });
    });
  }

  // See, Train, Plan: swap what the middle phone shows.
  const panels = $$('[data-panel]');
  $$('[data-screen]').forEach((button) => button.addEventListener('click', () => {
    heroPanel = button.dataset.screen;
    press($$('[data-screen]'), (b) => b === button);
    panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== heroPanel; });
    if (hero && hero.ready) hero.send('play', heroPanel === 'see' && !reduceMotion);
  }));

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
    'goblet-squat': {
      name: 'Goblet Squat', prime: 'Quadriceps, glutes', syn: 'Adductors', stab: 'Abs, spinal erectors, anterior deltoid',
      alt: 'Goblet squat on the Myolith 3D figure, seen from behind, with the glutes and quadriceps lit',
      poster: 'assets/img/goblet-back.webp',
      cues: GOBLET
    },
    'back-squat': {
      name: 'Back Squat', prime: 'Quadriceps, glutes', syn: 'Adductors, hamstrings', stab: 'Spinal erectors, abs, calves',
      alt: 'Back squat on the Myolith 3D figure, with the quadriceps and glutes lit',
      cues: [['Lower', 'Break at the hips and knees together. Knees track over the toes.'],
             ['Bottom', 'Hip crease at or just below the knee, heels flat, chest up.'],
             ['Drive', 'Push the floor away. Hips and chest rise at the same rate.'],
             ['Top', 'Stand tall, re-brace and reset your breath.']]
    },
    'push-up': {
      name: 'Push-Up', prime: 'Pectoralis major', syn: 'Triceps, anterior deltoid', stab: 'Rectus abdominis, obliques, glutes',
      cues: [['Lower', 'Lower as one piece with the elbows about 45° from the ribs.'],
             ['Bottom', 'Chest an inch from the floor, hips level with the shoulders.'],
             ['Press', 'Push the floor away and keep the body rigid.'],
             ['Top', 'Finish by spreading the shoulder blades apart.']]
    },
    'incline-dumbbell-press': {
      name: 'Incline Dumbbell Press', prime: 'Pectoralis major, anterior deltoid', syn: 'Triceps', stab: 'Latissimus dorsi, forearms',
      cues: [['Lower', 'Lower the dumbbells to the upper chest with the elbows about 45° from the torso.'],
             ['Stretch', 'Pause with the dumbbells level with the collarbones.'],
             ['Press', 'Press up and slightly in until the dumbbells meet over the shoulders.'],
             ['Lockout', 'Stop just short of touching to keep the chest loaded.']]
    },
    'dumbbell-fly': {
      name: 'Dumbbell Fly', prime: 'Pectoralis major', syn: 'Anterior deltoid', stab: 'Biceps, forearms',
      cues: [['Open', 'Lower the dumbbells out in a wide arc, as if hugging a large tree.'],
             ['Stretch', 'Stop when the upper arms reach the line of the bench and the chest feels stretched.'],
             ['Close', 'Squeeze the chest to bring the dumbbells back along the same arc.'],
             ['Top', 'Stop with the dumbbells a hand’s width apart.']]
    },
    'bent-over-row': {
      name: 'Bent-Over Row', prime: 'Latissimus dorsi, trapezius', syn: 'Posterior deltoid, biceps', stab: 'Spinal erectors, hamstrings, glutes, forearms',
      cues: [['Pull', 'Pull the bar to the lower ribs, leading with the elbows.'],
             ['Squeeze', 'Pinch the shoulder blades together for a beat.'],
             ['Lower', 'Lower until the arms are straight and the shoulder blades spread.'],
             ['Reset', 'Check the torso angle has not crept upward.']]
    },
    'lat-pulldown': {
      name: 'Lat Pulldown', prime: 'Latissimus dorsi', syn: 'Biceps, posterior deltoid, trapezius', stab: 'Rectus abdominis, forearms',
      cues: [['Pull', 'Drive the elbows down and back. Bring the bar to the top of the chest.'],
             ['Squeeze', 'Hold with the shoulder blades pulled down and together.'],
             ['Return', 'Let the bar rise over three seconds until the arms are straight.'],
             ['Reach', 'Let the lats stretch at the top without lifting off the seat.']]
    },
    'deadlift': {
      name: 'Deadlift', prime: 'Glutes, hamstrings, spinal erectors', syn: 'Quadriceps, trapezius, adductors', stab: 'Latissimus dorsi, forearms, rectus abdominis',
      cues: [['Pull', 'Push the floor away. The bar stays in contact with the legs.'],
             ['Lockout', 'Stand tall with the hips through and the glutes squeezed.'],
             ['Lower', 'Push the hips back first, then bend the knees once the bar passes them.'],
             ['Reset', 'Let the plates settle and re-brace before the next rep.']]
    },
    'lateral-raise': {
      name: 'Lateral Raise', prime: 'Lateral deltoid', syn: 'Anterior deltoid, trapezius', stab: 'Rectus abdominis, spinal erectors',
      cues: [['Raise', 'Sweep the arms out and slightly forward, leading with the elbows.'],
             ['Peak', 'Stop at shoulder height with the hands no higher than the elbows.'],
             ['Lower', 'Take two seconds down and keep tension at the bottom.'],
             ['Reset', 'Stop just short of the thighs.']]
    },
    'dumbbell-shoulder-press': {
      name: 'Dumbbell Shoulder Press', prime: 'Anterior deltoid, lateral deltoid', syn: 'Triceps, trapezius', stab: 'Rectus abdominis, obliques, spinal erectors',
      cues: [['Press', 'Press up and slightly in until the arms are straight.'],
             ['Lockout', 'Dumbbells over the shoulders, biceps beside the ears.'],
             ['Lower', 'Lower to ear level over three seconds.'],
             ['Reset', 'Keep the forearms vertical before the next rep.']]
    },
    'face-pull': {
      name: 'Face Pull', prime: 'Posterior deltoid', syn: 'Trapezius, lateral deltoid', stab: 'Rectus abdominis, spinal erectors, forearms',
      cues: [['Pull', 'Pull the rope toward the face, splitting the ends apart.'],
             ['Peak', 'Finish with the hands beside the ears and the elbows high, like a double-biceps pose.'],
             ['Return', 'Let the arms extend under control.'],
             ['Reset', 'Keep the shoulders down before the next rep.']]
    },
    'barbell-curl': {
      name: 'Barbell Curl', prime: 'Biceps', syn: 'Forearms', stab: 'Anterior deltoid, rectus abdominis, spinal erectors',
      cues: [['Curl', 'Curl the bar up in an arc with the elbows pinned.'],
             ['Squeeze', 'Squeeze at the top without letting the elbows come forward.'],
             ['Lower', 'Lower for three seconds to full extension.'],
             ['Reset', 'Pause at the bottom so the next rep starts without momentum.']]
    },
    'triceps-pushdown': {
      name: 'Triceps Pushdown', prime: 'Triceps', syn: 'None', stab: 'Latissimus dorsi, rectus abdominis, forearms',
      cues: [['Push', 'Press the bar down until the arms are fully straight.'],
             ['Lockout', 'Squeeze the triceps hard at the bottom.'],
             ['Return', 'Let the bar rise until the forearms pass parallel to the floor.'],
             ['Reset', 'Elbows stay put. Only the forearms move.']]
    },
    'skull-crusher': {
      name: 'Skull Crusher', prime: 'Triceps', syn: 'None', stab: 'Latissimus dorsi, forearms, pectoralis major',
      cues: [['Lower', 'Bend only at the elbows and lower the bar toward the top of the head.'],
             ['Stretch', 'Pause just above the forehead with the elbows pointing at the ceiling.'],
             ['Extend', 'Straighten the arms back to the start.'],
             ['Top', 'Keep the arms angled back so the triceps stay loaded.']]
    },
    'hanging-leg-raise': {
      name: 'Hanging Leg Raise', prime: 'Rectus abdominis', syn: 'Obliques, quadriceps', stab: 'Forearms, latissimus dorsi',
      cues: [['Raise', 'Lift the legs by tucking the pelvis under. Do not swing.'],
             ['Peak', 'Legs at or above parallel with the lower back slightly rounded.'],
             ['Lower', 'Lower slowly and resist the swing.'],
             ['Hang', 'Come to a dead stop.']]
    },
    'dead-bug': {
      name: 'Dead Bug', prime: 'Rectus abdominis', syn: 'Obliques', stab: 'Quadriceps, anterior deltoid',
      cues: [['Extend', 'Lower one arm overhead and straighten the opposite leg toward the floor.'],
             ['Hover', 'Stop just above the floor. The lower back has not moved.'],
             ['Return', 'Bring both back to the start with control.'],
             ['Reset', 'Re-press the lower back down and switch sides.']]
    },
    'ab-wheel-rollout': {
      name: 'Ab Wheel Rollout', prime: 'Rectus abdominis', syn: 'Latissimus dorsi, obliques', stab: 'Triceps, anterior deltoid, spinal erectors',
      cues: [['Roll out', 'Let the hips and shoulders travel forward together. Keep the tuck.'],
             ['Stretch', 'Go only as far as you can without the lower back sagging.'],
             ['Pull back', 'Pull the wheel back with the abs and lats, not by piking the hips.'],
             ['Reset', 'Return to the start and re-tuck.']]
    },
    'romanian-deadlift': {
      name: 'Romanian Deadlift', prime: 'Hamstrings, glutes', syn: 'Spinal erectors, adductors', stab: 'Latissimus dorsi, trapezius, forearms',
      cues: [['Lower', 'Push the hips straight back. The bar slides down the thighs.'],
             ['Stretch', 'Stop when the hamstrings are fully stretched, usually just below the knee. Spine stays neutral.'],
             ['Drive', 'Drive the hips forward and squeeze the glutes. The bar retraces the same path.'],
             ['Top', 'Finish tall without leaning back.']]
    },
    'hip-thrust': {
      name: 'Barbell Hip Thrust', prime: 'Glutes', syn: 'Hamstrings, adductors', stab: 'Rectus abdominis, spinal erectors, quadriceps',
      cues: [['Drive', 'Drive through the heels and push the hips toward the ceiling.'],
             ['Squeeze', 'Hold at the top with the ribs down and the glutes squeezed hard.'],
             ['Lower', 'Lower the hips under control, pivoting on the bench.'],
             ['Reset', 'Touch down lightly and go again.']]
    },
    'split-squat': {
      name: 'Dumbbell Split Squat', prime: 'Quadriceps, glutes', syn: 'Adductors, hamstrings', stab: 'Calves, rectus abdominis, obliques',
      cues: [['Lower', 'Drop the back knee straight down toward the floor.'],
             ['Bottom', 'Back knee just above the floor, front shin close to vertical.'],
             ['Drive', 'Push through the front heel to stand back up.'],
             ['Top', 'Stop short of locking the front knee. Finish all reps, then switch legs.']]
    }
  };

  // Each body part offers a few exercises. The first one shows when the body part is tapped.
  const PARTS = {
    chest: { label: 'Chest', ex: ['bench-press', 'push-up', 'incline-dumbbell-press', 'dumbbell-fly'] },
    back: { label: 'Back', ex: ['pull-up', 'bent-over-row', 'lat-pulldown', 'deadlift'] },
    shoulders: { label: 'Shoulders', ex: ['overhead-press', 'lateral-raise', 'dumbbell-shoulder-press', 'face-pull'] },
    arms: { label: 'Arms', ex: ['hammer-curl', 'barbell-curl', 'triceps-pushdown', 'skull-crusher'] },
    core: { label: 'Core', ex: ['plank', 'hanging-leg-raise', 'dead-bug', 'ab-wheel-rollout'] },
    legs: { label: 'Legs', ex: ['goblet-squat', 'back-squat', 'romanian-deadlift', 'hip-thrust', 'split-squat'] }
  };

  // Every visit starts with the female figure doing a goblet squat, seen from behind.
  const FIRST_PART = 'legs';
  const FIRST_VIEW = '180';
  let sex = 'f';
  let currentID = 'goblet-squat';

  const explorerHost = $('#explorer-stage');
  const explorer = explorerHost ? new Figure(explorerHost) : null;
  const nameEl = $('#explore-title');
  const primeEl = $('#ex-prime');
  const synEl = $('#ex-syn');
  const stabEl = $('#ex-stab');
  const phaseEl = $('#ex-phase');
  const cueEl = $('#ex-cue');
  const explorerPoster = $('#explorer-poster');
  const pickEl = $('#ex-pick');

  function showPhase(index) {
    const exercise = EXERCISES[currentID];
    const cue = exercise.cues[index] || exercise.cues[0];
    if (phaseEl) phaseEl.textContent = cue[0];
    if (cueEl) cueEl.textContent = cue[1];
  }

  function selectExercise(id, view = 'auto') {
    const exercise = EXERCISES[id];
    if (!exercise) return;
    currentID = id;
    press($$('[data-ex]'), (b) => b.dataset.ex === id);
    press($$('[data-view]'), (b) => b.dataset.view === view);
    if (nameEl) nameEl.textContent = exercise.name;
    if (primeEl) primeEl.textContent = exercise.prime;
    if (synEl) synEl.textContent = exercise.syn;
    if (stabEl) stabEl.textContent = exercise.stab;
    showPhase(0);
    // Only the starter exercises have a still picture. The others keep the last one until the figure is live.
    if (explorerPoster && exercise.alt) {
      explorerPoster.src = exercise.poster || 'assets/img/ex-' + id + '.png';
      explorerPoster.alt = exercise.alt;
    }
    if (explorer) {
      explorer.send('spin', false);
      explorer.send('load', id, true);
      explorer.send('view', view);
      explorer.send('play', !reduceMotion);
    }
  }

  function selectPart(part, view) {
    const group = PARTS[part];
    if (!group) return;
    press($$('.chip[data-part]'), (b) => b.dataset.part === part);
    if (pickEl) {
      pickEl.textContent = '';
      pickEl.setAttribute('aria-label', group.label + ' exercises');
      group.ex.forEach((id) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pick';
        button.dataset.ex = id;
        button.setAttribute('aria-pressed', 'false');
        button.textContent = EXERCISES[id].name;
        button.addEventListener('click', () => selectExercise(id));
        pickEl.appendChild(button);
      });
      pickEl.hidden = false;
    }
    selectExercise(group.ex[0], view);
  }

  function selectSex(value) {
    sex = value === 'm' ? 'm' : 'f';
    press($$('[data-sex]'), (b) => b.dataset.sex === sex);
    if (explorer) explorer.send('sex', sex);
  }

  $$('.chip[data-part]').forEach((chip) => chip.addEventListener('click', () => selectPart(chip.dataset.part, 'auto')));
  $$('[data-sex]').forEach((button) => button.addEventListener('click', () => selectSex(button.dataset.sex)));
  $$('[data-view]').forEach((button) => button.addEventListener('click', () => {
    press($$('[data-view]'), (b) => b === button);
    if (explorer) explorer.send('view', button.dataset.view);
  }));
  $$('[data-speed]').forEach((button) => button.addEventListener('click', () => {
    press($$('[data-speed]'), (b) => b === button);
    if (explorer) { explorer.send('speed', Number(button.dataset.speed)); explorer.send('play', true); }
  }));

  if (explorer) {
    explorer.onPhase = showPhase;
    explorer.onReady = () => {
      explorer.send('sex', sex);
      explorer.send('spin', false);
      explorer.send('load', currentID, true);
      explorer.send('view', $('[data-view][aria-pressed="true"]') ? $('[data-view][aria-pressed="true"]').dataset.view : FIRST_VIEW);
      explorer.send('play', !reduceMotion);
    };
  }
  press($$('[data-sex]'), (b) => b.dataset.sex === sex);
  selectPart(FIRST_PART, FIRST_VIEW);

  // Start each figure only when it is close to the screen, so the page itself loads fast.
  function mountWhenNear(figure) {
    if (!figure) return;
    if (!('IntersectionObserver' in window)) { figure.mount(); return; }
    const near = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { near.disconnect(); figure.mount(); }
    }, { rootMargin: '600px 0px' });
    near.observe(figure.host);
  }
  const start = () => { mountWhenNear(hero); mountWhenNear(explorer); };
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });

  // A figure that is off screen stops moving, which saves battery.
  if ('IntersectionObserver' in window) {
    const visible = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const figure = figures.find((f) => f.host === entry.target);
        if (!figure || !figure.ready) continue;
        const wanted = figure === hero ? heroPanel === 'see' : true;
        figure.send('play', entry.isIntersecting && wanted && !reduceMotion);
      }
    }, { threshold: 0.05 });
    [heroHost, explorerHost].forEach((host) => { if (host) visible.observe(host); });
  }

  /* ---------- The feature rail: arrows, drag with a mouse, and a line that shows how far along you are ---------- */

  const rail = $('#rail');
  const railBar = $('#rail-bar');
  const railPrev = $('#rail-prev');
  const railNext = $('#rail-next');

  if (rail) {
    const step = () => {
      const card = $('.card', rail);
      return card ? card.getBoundingClientRect().width + 20 : 320;
    };
    const sync = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const seen = rail.clientWidth / rail.scrollWidth;
      const t = max > 0 ? rail.scrollLeft / max : 0;
      if (railBar) railBar.style.transform = 'scaleX(' + (seen + (1 - seen) * t).toFixed(3) + ')';
      if (railPrev) railPrev.disabled = rail.scrollLeft < 4;
      if (railNext) railNext.disabled = rail.scrollLeft > max - 4;
    };
    rail.addEventListener('scroll', () => window.requestAnimationFrame(sync), { passive: true });
    window.addEventListener('resize', sync, { passive: true });
    sync();
    const go = (dir) => rail.scrollBy({ left: dir * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
    if (railPrev) railPrev.addEventListener('click', () => go(-1));
    if (railNext) railNext.addEventListener('click', () => go(1));
    rail.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); go(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); }
    });

    // Mouse drag. Touch screens already scroll the rail with a finger.
    let dragFrom = null;
    rail.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      dragFrom = { x: event.clientX, left: rail.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', (event) => {
      if (!dragFrom) return;
      const dx = event.clientX - dragFrom.x;
      if (!dragFrom.moved && Math.abs(dx) > 4) { dragFrom.moved = true; rail.classList.add('is-dragging'); }
      if (dragFrom.moved) rail.scrollLeft = dragFrom.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!dragFrom) return;
      dragFrom = null;
      rail.classList.remove('is-dragging');
    });
    rail.addEventListener('dragstart', (event) => event.preventDefault());
  }
})();
