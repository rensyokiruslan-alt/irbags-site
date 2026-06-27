(function () {
  var MOBILE_MAX = 768;
  var NARROW_MAX = 1280;

  /* ─── Оверлей для неподдерживаемых ширин 768–1279px ───────────────────── */

  var narrowOverlay = null;

  function ensureNarrowOverlay() {
    if (narrowOverlay) return;
    var style = document.createElement('style');
    style.textContent =
      '.narrow-overlay{' +
        'display:none;' +
        'position:fixed;inset:0;' +
        'z-index:9999;' +
        'background:#fff;' +
        'align-items:center;justify-content:center;' +
        'font-family:var(--font-family-base,inherit);font-size:16px;letter-spacing:-0.32px;color:#000;' +
        'text-align:center;' +
      '}' +
      '.narrow-overlay.is-visible{display:flex;}';
    document.head.appendChild(style);

    narrowOverlay = document.createElement('div');
    narrowOverlay.className = 'narrow-overlay';
    narrowOverlay.textContent = 'опа, так не работает';
    document.body.appendChild(narrowOverlay);
  }

  function applyScale() {
    var w = window.innerWidth;
    if (w < MOBILE_MAX) {
      document.documentElement.style.zoom = w / 375;
      document.body.classList.add('is-mobile');
      document.body.classList.remove('is-narrow');
    } else if (w < NARROW_MAX) {
      document.documentElement.style.zoom = w / 1920;
      document.body.classList.remove('is-mobile');
      document.body.classList.add('is-narrow');
    } else {
      document.documentElement.style.zoom = w / 1920;
      document.body.classList.remove('is-mobile', 'is-narrow');
    }

    if (document.body) {
      ensureNarrowOverlay();
      narrowOverlay.classList.toggle('is-visible', w >= MOBILE_MAX && w < NARROW_MAX);
    }
  }

  applyScale();
  window.addEventListener('resize', applyScale, { passive: true });
})();
