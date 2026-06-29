/* ==========================================================================
   irbags — ошибка оплаты
   ========================================================================== */

(function () {

  var mainEl = document.getElementById('failMain');
  var textEl = document.getElementById('failText');
  var linkEl = document.getElementById('failLink');

  if (textEl) textEl.textContent = 'что-то пошло не так — попробуйте ещё раз';
  if (linkEl) {
    linkEl.textContent = 'вернуться к оформлению';
    linkEl.href = 'checkout.html';
  }

  /* ─── Центрирование по вертикали ───────────────────────────────────────── */

  function position() {
    var isMobile     = document.body.classList.contains('is-mobile');
    var zoom         = document.documentElement.clientWidth / (isMobile ? 375 : 1920);
    var designHeight = window.innerHeight / zoom;
    var top          = designHeight / 2 - 17;

    if (mainEl) mainEl.style.height = designHeight + 'px';
    if (textEl) textEl.style.top    = top + 'px';
    if (linkEl) linkEl.style.top    = top + 'px';
  }

  position();
  window.addEventListener('resize', position, { passive: true });

})();
