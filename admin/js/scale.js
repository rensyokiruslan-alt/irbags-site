(function () {
  var ADMIN_MIN = 1280;

  var overlay = null;

  function ensureOverlay() {
    if (overlay) return;
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

    overlay = document.createElement('div');
    overlay.className = 'narrow-overlay';
    overlay.textContent = 'опа, так не работает';
    document.body.appendChild(overlay);
  }

  function applyScale() {
    var w = document.documentElement.clientWidth;
    document.documentElement.style.zoom = w / 1920;
    ensureOverlay();
    overlay.classList.toggle('is-visible', w < ADMIN_MIN);
  }

  applyScale();
  window.addEventListener('resize', applyScale, { passive: true });
})();
