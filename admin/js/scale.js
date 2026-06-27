(function () {
  function applyScale() {
    document.documentElement.style.zoom = window.innerWidth / 1920;
  }
  applyScale();
  window.addEventListener('resize', applyScale, { passive: true });
})();
