(() => {
  'use strict';

  const FPS = 24;          // frame-sequence playback speed (seq_01, seq_03)
  const SMOOTHING = 0.14;  // scroll easing (lower = floatier)

  // Scroll timeline, in viewport heights scrolled into the stage.
  const T = {
    heroOut: 0.4,  // logo + tagline fade out
    seq02: 3.0,    // seq_02 scrubs from 0 to here; its end frame then becomes the card photo
    frame6: 4.5,   // one continuous move: full screen → card (Figma frame 4 → 6 shapes)
    open: 4.55,    // past here the carousel fans out (timed, so it always comes in slowly)
    end: 6.2,      // the carousel holds until here, then the page scrolls on to the finale
  };
  const FINALE_PLAY = 4.5; // seconds the soft-opening drawing takes once it is in view

  // Card shape along the seq_02 → Frame 6 move, as [Figma frame, point on the move].
  // "2" is the full-screen seq_02 end frame.
  const MORPH = [[2, 0], [4, 0.5], [6, 1]];
  const CARD_SCALE = 0.8; // the carousel's centre card, relative to the Figma Frame 6 card
  const HOME = 2;         // the house card sits in the middle of the carousel

  // Cover-flow placement by distance from the active card: sideways offset (in card
  // widths, leaving a gap between cards), turn (deg), scale and opacity.
  const FAN = [
    { x: 0, ry: 0, sc: 1, op: 1 },
    { x: 1.0, ry: 18, sc: 0.84, op: 1 },
    { x: 1.78, ry: 24, sc: 0.7, op: 0.9 },
    { x: 2.45, ry: 28, sc: 0.6, op: 0 },
  ];

  // Figma artboard
  const ART_W = 2560;
  const ART_H = 1440;

  const sequence = (dir, count) => ({
    count,
    frames: new Array(count),
    src: (i) => `${dir}/${String(i).padStart(3, '0')}.webp`,
  });

  const SEQ_01 = sequence('asset/frames/seq_01', 193);
  const SEQ_02 = sequence('asset/frames/seq_02', 193);

  const root = document.documentElement;
  const stage = document.querySelector('.stage');
  const sticky = document.querySelector('.stage__sticky');
  const canvas = document.querySelector('.stage__canvas');
  const ctx = canvas.getContext('2d');
  const hero = document.querySelector('.hero');
  const cue = document.querySelector('.scroll-cue');
  const showcase = document.querySelector('.showcase');
  const mono = document.querySelector('.scenes__mono');
  const carousel = document.querySelector('.carousel');
  const slots = [...carousel.querySelectorAll('.slot')];
  const cards = slots.map((slot) => slot.querySelector('.card'));
  const bodies = cards.map((card) => card.querySelector('.card__body'));
  const [prevBtn, nextBtn] = document.querySelectorAll('.carousel-nav__btn');
  const counter = document.querySelector('.carousel-nav__count');
  const finale = document.querySelector('.finale');
  const finaleLines = document.querySelector('.finale__lines');
  const loaderBar = document.querySelector('.loader__bar');
  const loaderLabel = document.querySelector('.loader__label');
  const introBar = document.querySelector('.intro-progress__track');
  const introLabel = document.querySelector('.intro-progress__label');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width: 760px)');

  let current = null; // image currently painted on the stage canvas

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const progress = (p, from, to) => clamp((p - from) / (to - from), 0, 1);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad2 = (n) => String(n).padStart(2, '0');

  // Only touch the DOM when a value actually changes, so held states cost nothing.
  function setStyle(el, prop, value) {
    const cache = (el._styleCache ??= {});
    if (cache[prop] === value) return;
    cache[prop] = value;
    if (prop.startsWith('--')) el.style.setProperty(prop, value);
    else el.style[prop] = value;
  }

  // ---------- Loading ----------

  function loadFrame(seq, i) {
    const img = new Image();
    img.decoding = 'async';
    img.src = seq.src(i);
    return new Promise((resolve) => {
      img.onload = () => {
        seq.frames[i] = img;
        // Decode up front so playback doesn't stutter, but don't wait on it for long:
        // browsers can hold decode() back while the page isn't being drawn.
        Promise.race([img.decode().catch(() => {}), wait(1500)]).then(resolve);
      };
      img.onerror = resolve; // a missing frame falls back to its nearest loaded neighbour
    });
  }

  function loadSequence(seq, onProgress) {
    let done = 0;
    return Promise.all(
      Array.from({ length: seq.count }, (_, i) =>
        loadFrame(seq, i).then(() => onProgress && onProgress(++done / seq.count))
      )
    );
  }

  function nearestFrame(seq, i) {
    for (let j = i; j >= 0; j--) if (seq.frames[j]) return seq.frames[j];
    return null;
  }

  // ---------- Canvas ----------

  // Paints an image like object-fit: cover.
  function paint(context, img) {
    const { width: cw, height: ch } = context.canvas;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    context.imageSmoothingQuality = 'high';
    context.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function draw(img, force = false) {
    if (!img || (img === current && !force)) return;
    current = img;
    paint(ctx, img);
  }

  function sizeCanvas(el, maxDpr) {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    el.width = Math.round(el.clientWidth * dpr);
    el.height = Math.round(el.clientHeight * dpr);
  }

  function resize() {
    sizeCanvas(canvas, 2);
    draw(current, true);
  }

  // ---------- Scroll lock while the intro plays ----------

  const blockTouch = (e) => e.preventDefault();

  function lockScroll() {
    root.classList.add('is-locked');
    addEventListener('touchmove', blockTouch, { passive: false });
  }

  function unlockScroll() {
    root.classList.remove('is-locked');
    removeEventListener('touchmove', blockTouch);
  }

  // ---------- seq_01: plays on its own ----------

  function playIntro() {
    const last = SEQ_01.count - 1;
    const duration = (last / FPS) * 1000;
    root.classList.add('is-revealed', 'is-playing'); // logo + tagline fade in as the video starts

    return new Promise((resolve) => {
      let start = null;
      const tick = (now) => {
        start ??= now;
        const elapsed = now - start;
        const i = Math.min(last, Math.floor((elapsed / 1000) * FPS));
        const done = Math.min(1, elapsed / duration);
        draw(nearestFrame(SEQ_01, i));
        introBar.style.setProperty('--p', done.toFixed(4));
        introLabel.textContent = String(Math.round(done * 100));
        if (i < last) {
          requestAnimationFrame(tick);
        } else {
          root.classList.remove('is-playing');
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  // ---------- Scenes: one full-screen video (or frame sequence) per card ----------

  const videoSize = () => (sticky.clientWidth * (window.devicePixelRatio || 1) > 1400 ? 1080 : 720);

  function videoScene(el, video) {
    return {
      el,
      load() {
        if (video.src) return;
        video.preload = 'auto';
        video.src = `${video.dataset.src}-${videoSize()}.mp4`;
      },
      play(on) {
        if (on && video.paused) video.play().catch(() => {});
        else if (!on && !video.paused) video.pause();
      },
      tick() {},
      resize() {},
    };
  }

  // A frame sequence (seq_03) looped on a canvas, so it behaves like the videos.
  function framesScene(el, sceneCanvas) {
    const seq = sequence(sceneCanvas.dataset.frames, Number(sceneCanvas.dataset.count));
    const context = sceneCanvas.getContext('2d');
    let loading = null;
    let playing = false;
    let startedAt = 0;
    let shown = null;
    return {
      el,
      load() {
        loading ??= loadSequence(seq);
      },
      play(on) {
        if (on && !playing) startedAt = performance.now();
        playing = on;
      },
      tick(now) {
        if (!playing) return;
        const img = nearestFrame(seq, Math.floor(((now - startedAt) / 1000) * FPS) % seq.count);
        if (!img || img === shown) return;
        shown = img;
        paint(context, img);
      },
      resize() {
        sizeCanvas(sceneCanvas, 1.5);
        if (shown) paint(context, shown);
      },
    };
  }

  const scenes = Object.fromEntries(
    [...document.querySelectorAll('.scene')].map((el) => {
      const media = el.querySelector('.scene__media');
      return [el.dataset.scene, media.tagName === 'VIDEO' ? videoScene(el, media) : framesScene(el, media)];
    })
  );

  // ---------- Showcase: seq_02 end frame → card → carousel ----------

  let view = null; // viewport-dependent layout, rebuilt on resize
  let active = HOME;
  let open = false;
  let openingTimer = 0;

  function measure() {
    const vw = sticky.clientWidth;
    const vh = sticky.clientHeight;
    // Artboard scale: fit the 2560×1440 frame, but stay legible on narrow screens.
    const s = vw < 900 ? Math.min(vw / 760, vh / 1100) : Math.min(vw / ART_W, vh / ART_H);
    const fit = (w, h) => ({ w: Math.min(w * s, vw - 32), h: Math.min(h * s, vh - 32) });
    const box = (size, r, extra) => ({ ...size, r, pad: 0, mediaH: size.h, mediaR: r, zoom: 1, bg: 0, ...extra });

    const frame6 = box(fit(585, 882), 46.34 * s, { pad: 13.49 * s, mediaH: 546.39 * s, mediaR: 36.68 * s, zoom: 1.2256, bg: 1 });
    view = {
      vw, vh, s,
      unit: frame6.w * CARD_SCALE, // carousel spacing: one centre-card width
      cards: {
        2: box({ w: vw, h: vh }, 0),
        4: box(fit(1437, 808), 90 * s),
        6: frame6,
      },
    };
    showcase.style.setProperty('--s', s.toFixed(4));

    // The colour window: the centre card's photo window once the carousel is up.
    const left = (vw - frame6.w) / 2 + frame6.pad;
    const top = (vh - frame6.h) / 2 + frame6.pad;
    setStyle(mono, '--hole-x', `${(vw / 2 + (left - vw / 2) * CARD_SCALE).toFixed(1)}px`);
    setStyle(mono, '--hole-y', `${(vh / 2 + (top - vh / 2) * CARD_SCALE).toFixed(1)}px`);
    setStyle(mono, '--hole-w', `${((frame6.w - frame6.pad * 2) * CARD_SCALE).toFixed(1)}px`);
    setStyle(mono, '--hole-h', `${(frame6.mediaH * CARD_SCALE).toFixed(1)}px`);
    setStyle(showcase, '--nav-top', `${(vh / 2 + (frame6.h * CARD_SCALE) / 2 + clamp(vh * 0.035, 16, 56)).toFixed(1)}px`);

    Object.values(scenes).forEach((scene) => scene.resize());
    layoutCarousel();
  }

  // Card shape at point m (0–1) of the move; straight lines between the Figma frames.
  function cardState(m) {
    let i = 1;
    while (i < MORPH.length - 1 && m > MORPH[i][1]) i++;
    const [fromFrame, fromAt] = MORPH[i - 1];
    const [toFrame, toAt] = MORPH[i];
    const a = view.cards[fromFrame];
    const b = view.cards[toFrame];
    const t = clamp((m - fromAt) / (toAt - fromAt), 0, 1);
    return Object.fromEntries(Object.keys(a).map((key) => [key, lerp(a[key], b[key], t)]));
  }

  function layoutCarousel() {
    slots.forEach((slot, i) => {
      const d = i - active;
      const fan = open || d === 0 ? FAN[Math.min(Math.abs(d), FAN.length - 1)] : { x: 0, ry: 0, sc: 0.9, op: 0 };
      const side = Math.sign(d);
      setStyle(slot, '--x', `${(side * fan.x * view.unit).toFixed(1)}px`);
      setStyle(slot, '--ry', `${side * fan.ry}deg`);
      setStyle(slot, '--sc', String(fan.sc));
      setStyle(slot, '--op', String(fan.op));
      setStyle(slot, '--delay', `${Math.max(0, Math.abs(d) - 1) * 0.3}s`);
      setStyle(slot, 'zIndex', String(10 - Math.abs(d)));
      cards[i].classList.toggle('is-active', i === active);
      cards[i].classList.toggle('is-showing-scene', open && i === active && cards[i].dataset.scene !== 'none');
      cards[i].setAttribute('aria-current', String(i === active));
    });

    counter.textContent = `${pad2(active + 1)} / ${pad2(cards.length)}`;
    prevBtn.disabled = active === 0;
    nextBtn.disabled = active === cards.length - 1;

    // Only the active card's scene shows and plays; its neighbours preload.
    const name = open ? cards[active].dataset.scene : 'none';
    Object.entries(scenes).forEach(([key, scene]) => {
      const on = key === name;
      scene.el.classList.toggle('is-active', on);
      if (on) scene.load();
      scene.play(on);
    });
    if (open) {
      [active - 1, active + 1].forEach((i) => scenes[cards[i]?.dataset.scene]?.load());
    }
    showcase.classList.toggle('is-dark-scene', name !== 'none');
  }

  function setOpen(next) {
    if (next === open) return;
    open = next;
    if (!open) active = HOME;
    clearTimeout(openingTimer);
    carousel.classList.toggle('is-opening', open);
    if (open) openingTimer = setTimeout(() => carousel.classList.remove('is-opening'), 2600);
    carousel.classList.toggle('is-open', open);
    showcase.classList.toggle('is-carousel', open);
    bodies.forEach((body, i) => i !== HOME && body.classList.toggle('is-in', open));
    layoutCarousel();
  }

  function go(i) {
    const next = clamp(i, 0, cards.length - 1);
    if (!open || next === active) return;
    active = next;
    clearTimeout(openingTimer);
    carousel.classList.remove('is-opening');
    layoutCarousel();
  }

  function renderShowcase(p) {
    const showing = p > T.seq02;
    showcase.classList.toggle('is-active', showing);
    canvas.style.visibility = showing ? 'hidden' : '';
    setOpen(p > T.open);
    if (!showing) return;

    const m = ease(progress(p, T.seq02, T.frame6));
    const k = lerp(1, CARD_SCALE, clamp(m / 0.5, 0, 1));
    const { w, h, r, pad, mediaH, mediaR, zoom, bg } = cardState(m);

    setStyle(carousel, '--cx', `${((view.vw - w) / 2).toFixed(1)}px`);
    setStyle(carousel, '--cy', `${((view.vh - h) / 2).toFixed(1)}px`);
    setStyle(carousel, '--cw', `${w.toFixed(1)}px`);
    setStyle(carousel, '--ch', `${h.toFixed(1)}px`);
    setStyle(carousel, '--cr', `${r.toFixed(1)}px`);
    setStyle(carousel, '--ck', k.toFixed(4));
    setStyle(carousel, '--pad', `${pad.toFixed(1)}px`);
    setStyle(carousel, '--mw', `${(w - pad * 2).toFixed(1)}px`);
    setStyle(carousel, '--mh', `${mediaH.toFixed(1)}px`);
    setStyle(carousel, '--mr', `${mediaR.toFixed(1)}px`);
    setStyle(carousel, '--zoom', zoom.toFixed(4));
    setStyle(carousel, '--bg', bg.toFixed(3));

    // The house card's text comes in once it has settled.
    bodies[HOME].classList.toggle('is-in', p > T.frame6 - 0.1);
  }

  // ---------- Carousel input: buttons, card clicks, drag/swipe, keys, sideways wheel ----------

  function bindCarousel() {
    prevBtn.addEventListener('click', () => go(active - 1));
    nextBtn.addEventListener('click', () => go(active + 1));

    let dragX = null;
    let dragged = false;
    carousel.addEventListener('pointerdown', (e) => {
      if (!open) return;
      dragX = e.clientX;
      dragged = false;
    });
    addEventListener('pointermove', (e) => {
      if (dragX !== null && Math.abs(e.clientX - dragX) > 8) dragged = true;
    });
    addEventListener('pointerup', (e) => {
      if (dragX === null) return;
      const dx = e.clientX - dragX;
      dragX = null;
      if (Math.abs(dx) > 40) go(active - Math.sign(dx));
    });
    addEventListener('pointercancel', () => { dragX = null; });

    cards.forEach((card, i) => {
      card.addEventListener('click', () => {
        if (!dragged) go(i);
      });
    });

    const inView = () => open && stage.getBoundingClientRect().bottom > window.innerHeight * 0.6;
    addEventListener('keydown', (e) => {
      if (!inView() || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft') go(active - 1);
      if (e.key === 'ArrowRight') go(active + 1);
    });

    let swept = 0;
    let lastSweep = 0;
    addEventListener('wheel', (e) => {
      if (!inView() || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      swept += e.deltaX;
      const now = performance.now();
      if (Math.abs(swept) > 60 && now - lastSweep > 650) {
        go(active + Math.sign(swept));
        swept = 0;
        lastSweep = now;
      }
    }, { passive: true });
  }

  // ---------- Finale: soft-opening line drawing ----------

  function setFinaleView() {
    // Phones show just the storefront; desktop draws the whole poster board.
    finaleLines.setAttribute('viewBox', narrow.matches ? '470 270 870 450' : '0 0 1683 934');
  }

  // ---------- Scroll-driven part ----------

  function startScrub() {
    const last = SEQ_02.count - 1;
    let target = 0;
    let shown = 0;
    let rendered = -1;
    let finaleState = 'waiting'; // → 'play' once half in view → back to 'waiting' once out of view
    let finaleStart = 0;

    stage.style.height = `${(T.end + 1) * 100}vh`;
    bodies.forEach((body, i) => i !== HOME && body.style.setProperty('--body-delay', '0.5s'));

    const read = () => {
      const vh = window.innerHeight;
      target = clamp(-stage.getBoundingClientRect().top / vh, 0, T.end);
      // The finale plays through once it is half way into view, and resets once it has
      // left the screen so it plays again next time.
      const top = finale.getBoundingClientRect().top;
      if (finaleState === 'waiting' && top < vh * 0.5) finaleState = 'start';
      if (finaleState !== 'waiting' && top >= vh) finaleState = 'reset';
    };

    const render = (p) => {
      draw(nearestFrame(SEQ_02, Math.round(clamp(p / T.seq02, 0, 1) * last)));

      const out = clamp(p / T.heroOut, 0, 1);
      setStyle(hero, 'opacity', (1 - out).toFixed(3));
      setStyle(hero, 'transform', `translateY(${(-out * 40).toFixed(1)}px)`);

      renderShowcase(p);
      cue.classList.toggle('is-hidden', p > T.end - 0.05); // the cue stays until the finale
      rendered = p;
    };

    const tick = (now) => {
      shown += (target - shown) * SMOOTHING;
      if (Math.abs(target - shown) < 0.0005) shown = target;
      if (shown !== rendered) render(shown);
      // Taupe over the white page, light over the scenes (which change without scrolling).
      cue.classList.toggle('is-on-light', shown > lerp(T.seq02, T.frame6, 0.2) && !showcase.classList.contains('is-dark-scene'));

      if (finaleState === 'start') {
        finaleState = 'play';
        finaleStart = now;
      } else if (finaleState === 'reset') {
        finaleState = 'waiting';
      }
      const q = finaleState === 'play' ? Math.min(1, (now - finaleStart) / (FINALE_PLAY * 1000)) : 0;
      setStyle(finale, '--q', q.toFixed(4));

      Object.values(scenes).forEach((scene) => scene.tick(now));
      requestAnimationFrame(tick);
    };

    addEventListener('scroll', read, { passive: true });
    addEventListener('resize', () => {
      measure();
      read();
      render(shown);
    });
    measure();
    bindCarousel();
    read();
    requestAnimationFrame(tick);
  }

  // ---------- Boot ----------

  async function init() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    lockScroll();
    resize();
    addEventListener('resize', resize);
    setFinaleView();
    narrow.addEventListener('change', setFinaleView);

    // seq_01 has to be fully in memory before it plays, so it never stutters.
    await loadSequence(SEQ_01, (p) => {
      loaderBar.style.setProperty('--p', p);
      loaderLabel.textContent = `${Math.round(p * 100)}%`;
    });
    draw(SEQ_01.frames[0] ?? nearestFrame(SEQ_01, SEQ_01.count - 1));

    // seq_02 streams in while seq_01 plays; then the scenes either side of the house card.
    loadSequence(SEQ_02).then(() => {
      scenes[cards[HOME - 1].dataset.scene]?.load();
      scenes[cards[HOME + 1].dataset.scene]?.load();
    });

    root.classList.remove('is-loading');

    if (reduceMotion) {
      draw(nearestFrame(SEQ_01, SEQ_01.count - 1));
      root.classList.add('is-revealed');
    } else {
      await wait(600); // let the loader start fading before the first frame moves
      await playIntro();
    }

    unlockScroll();
    root.classList.add('is-scroll-ready');
    startScrub();
  }

  init();
})();
