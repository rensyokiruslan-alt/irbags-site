/* ==========================================================================
   irbags — 404
   ========================================================================== */

(function () {

  var mainEl = document.getElementById('notFoundMain');
  var codeEl = document.getElementById('notFoundCode');
  var textEl = document.getElementById('notFoundText');
  var linkEl = document.getElementById('notFoundLink');

  function position() {
    var zoom         = document.documentElement.clientWidth / 1920;
    var designHeight = window.innerHeight / zoom;
    var top          = designHeight / 2 - 17; /* 17 = половина строки 35px */

    if (mainEl) mainEl.style.height = designHeight + 'px';
    if (codeEl) codeEl.style.top    = top + 'px';
    if (textEl) textEl.style.top    = top + 'px';
    if (linkEl) linkEl.style.top    = top + 'px';
  }

  position();
  window.addEventListener('resize', position, { passive: true });

})();
