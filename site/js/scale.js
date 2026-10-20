(function () {
  // Страница скрывает футер и прочее, пока не отрисована скриптом (html.is-loading, см. index.css)
  window.siteReady = function () {
    document.documentElement.classList.remove('is-loading');
  };

  // cb — когда firebase-sync загрузил свежие данные; если база молчит — через 4 с с тем, что есть
  window.onSiteData = function (cb) {
    var called = false;
    function run() { called = true; cb(); }
    if (window.IrbagsDB && window.IrbagsDB.loaded) { run(); return; }
    window.addEventListener('irbags:data', run, { once: true });
    setTimeout(function () { if (!called) cb(); }, 4000);
  };

  var MOBILE_MAX = 768;

  function applyScale() {
    var w = document.documentElement.clientWidth;
    if (w <= MOBILE_MAX) {
      document.documentElement.style.zoom = w / 375;
      document.body.classList.add('is-mobile');
    } else {
      document.documentElement.style.zoom = w / 1920;
      document.body.classList.remove('is-mobile');
    }
  }

  applyScale();
  window.addEventListener('resize', applyScale, { passive: true });
})();
