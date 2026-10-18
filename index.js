document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Появление блоков при скролле ---------- */
  const revealEls = document.querySelectorAll('.reveal');

  if (!reducedMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach((el) => {
      el.classList.add('reveal-hidden');
      io.observe(el);
    });
  }

  /* ---------- Слайдер «До / После» ---------- */
  const slider = document.querySelector('.comparison-slider');
  if (!slider) return;

  const beforeImg   = slider.querySelector('.foreground-img');
  const handle      = slider.querySelector('.slider-handle');
  const line        = slider.querySelector('.slider-line');
  const labelBefore = slider.querySelector('.label-before');
  const labelAfter  = slider.querySelector('.label-after');

  if (!beforeImg || !handle) return;

  let pos = 50;
  let dragging = false;
  let hasInteracted = false;
  let introPlayed = false;
  let introRAF = null;

  function applyPos(value) {
    pos = Math.min(100, Math.max(0, value));
    const percent = pos + '%';

    // Обрезаем верхний слой, НЕ меняя его ширину:
    // так фото «До» и «После» совпадают по масштабу.
    beforeImg.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';

    handle.style.left = percent;
    if (line) line.style.left = percent;

    handle.setAttribute('aria-valuenow', String(Math.round(pos)));

    if (labelBefore) labelBefore.style.opacity = pos < 16 ? '0' : '1';
    if (labelAfter)  labelAfter.style.opacity  = pos > 84 ? '0' : '1';
  }

  function setPos(value, animate) {
    slider.classList.toggle('is-animating', Boolean(animate) && !reducedMotion);
    applyPos(value);
  }

  function posFromClientX(clientX, animate) {
    const rect = slider.getBoundingClientRect();
    if (rect.width === 0) return;
    setPos(((clientX - rect.left) / rect.width) * 100, animate);
  }

  /* ---------- Мышь + тач ---------- */
  slider.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    dragging = true;
    hasInteracted = true;
    slider.classList.add('is-active');

    if (introRAF) cancelAnimationFrame(introRAF);

    try { slider.setPointerCapture(e.pointerId); } catch (_) {}

    if (e.target.closest('.slider-handle')) {
      handle.focus({ preventScroll: true });
    }

    posFromClientX(e.clientX, true);
    e.preventDefault();
  });

  slider.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    posFromClientX(e.clientX, false);
  });

  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((evt) => {
    slider.addEventListener(evt, () => { dragging = false; });
  });

  /* ---------- Клавиатура ---------- */
  handle.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 3;
    let handled = true;

    hasInteracted = true;
    slider.classList.add('is-active');

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':  setPos(pos - step, true); break;
      case 'ArrowRight':
      case 'ArrowUp':    setPos(pos + step, true); break;
      case 'Home':       setPos(0, true); break;
      case 'End':        setPos(100, true); break;
      default:           handled = false;
    }

    if (handled) e.preventDefault();
  });

  /* ---------- Интро-демо один раз при появлении ---------- */
  function playIntro() {
    if (introPlayed || reducedMotion || hasInteracted) return;
    introPlayed = true;

    const keyframes = [
      { to: 72, dur: 900 },
      { to: 30, dur: 1400 },
      { to: 50, dur: 900 }
    ];

    const easeInOut = (t) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    let index = 0;
    let from = pos;
    let start = null;

    function frame(ts) {
      if (hasInteracted) return;
      if (start === null) start = ts;

      const kf = keyframes[index];
      const t = Math.min(1, (ts - start) / kf.dur);

      applyPos(from + (kf.to - from) * easeInOut(t));

      if (t < 1) {
        introRAF = requestAnimationFrame(frame);
      } else if (++index < keyframes.length) {
        from = pos;
        start = null;
        introRAF = requestAnimationFrame(frame);
      } else {
        introRAF = null;
      }
    }

    introRAF = requestAnimationFrame(frame);
  }

  if ('IntersectionObserver' in window) {
    const sliderIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          sliderIO.unobserve(entry.target);
          setTimeout(playIntro, 700);
        }
      });
    }, { threshold: 0.4 });

    sliderIO.observe(slider);
  }

  applyPos(50);
});