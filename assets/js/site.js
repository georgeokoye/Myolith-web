/* Myolith website behaviour. No libraries. */
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
    legs: { label: 'Legs', ex: ['back-squat', 'romanian-deadlift', 'hip-thrust', 'split-squat'] }
  };

  // The female figure is the default. A visitor who picked the male one keeps it.
  let sex = 'f';
  try { if (window.localStorage.getItem('myolith-sex') === 'm') sex = 'm'; } catch (error) { /* private mode */ }
  let currentID = 'bench-press';
  let currentPart = 'chest';

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
  const pickEl = $('#ex-pick');

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
    press($$('[data-ex]'), (b) => b.dataset.ex === id);
    press($$('[data-view]'), (b) => b.dataset.view === 'auto');
    if (nameEl) nameEl.textContent = exercise.name;
    if (primeEl) primeEl.textContent = exercise.prime;
    if (synEl) synEl.textContent = exercise.syn;
    if (stabEl) stabEl.textContent = exercise.stab;
    showPhase(0);
    // Only the starter exercises have a still picture. The others keep the last one until the figure is live.
    if (explorerPoster && exercise.alt) {
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

  function selectPart(part) {
    const group = PARTS[part];
    if (!group) return;
    currentPart = part;
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
    selectExercise(group.ex[0]);
  }

  function selectSex(value) {
    sex = value === 'm' ? 'm' : 'f';
    try { window.localStorage.setItem('myolith-sex', sex); } catch (error) { /* private mode */ }
    press($$('[data-sex]'), (b) => b.dataset.sex === sex);
    if (avatarPoster) {
      avatarPoster.src = 'assets/img/avatar-' + sex + '.png';
      avatarPoster.alt = 'The ' + (sex === 'f' ? 'female' : 'male') + ' Myolith 3D figure';
    }
    if (explorer) explorer.send('sex', sex);
    if (avatar) avatar.send('sex', sex);
  }

  $$('.chip[data-part]').forEach((chip) => chip.addEventListener('click', () => selectPart(chip.dataset.part)));
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
  // Sample training for the avatar: how hard each muscle worked this week, from 0 to 1.
  // Above 0.66 glows red, above 0.33 amber, anything else blue.
  const SAMPLE_WEEK = {
    chest: 0.9, delt_front: 0.75, triceps: 0.6,
    lats: 0.85, traps: 0.45, biceps: 0.5, delt_rear: 0.3,
    quads: 1, glutes: 0.8, hamstrings: 0.55, calves: 0.2,
    abs: 0.4, obliques: 0.25, forearms: 0.15
  };

  if (avatar) {
    avatar.onReady = () => {
      avatar.send('sex', sex);
      avatar.send('heat', SAMPLE_WEEK, true);
      avatar.send('play', true);
      avatar.send('spin', !reduceMotion);
    };
  }
  press($$('[data-sex]'), (b) => b.dataset.sex === sex);
  if (sex === 'm' && avatarPoster) selectSex('m');
  selectPart(currentPart);

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
