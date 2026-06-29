(function () {
  var MOBILE_MAX = 768;

  function applyScale() {
    var w = document.documentElement.clientWidth;
    if (w < MOBILE_MAX) {
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
