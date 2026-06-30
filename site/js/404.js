/* ==========================================================================
   irbags — 404
   ========================================================================== */

(function () {

  var mainEl = document.getElementById('notFoundMain');
  var codeEl = document.getElementById('notFoundCode');
  var textEl = document.getElementById('notFoundText');
  var linkEl = document.getElementById('notFoundLink');

  function position() {
    var isMobile     = document.body.classList.contains('is-mobile');
    var baseWidth    = isMobile ? 375 : 1920;
    var zoom         = document.documentElement.clientWidth / baseWidth;
    var designHeight = window.innerHeight / zoom;

    if (mainEl) mainEl.style.height = designHeight + 'px';

    if (isMobile) {
      /* код — у верха, текст — у низа (CSS), кнопка — по центру */
      if (linkEl) linkEl.style.top = (designHeight / 2 - 10) + 'px';
    } else {
      var top = designHeight / 2 - 17; /* 17 = половина строки 35px */
      if (codeEl) codeEl.style.top = top + 'px';
      if (textEl) textEl.style.top = top + 'px';
      if (linkEl) linkEl.style.top = top + 'px';
    }
  }

  position();
  window.addEventListener('resize', position, { passive: true });

})();
