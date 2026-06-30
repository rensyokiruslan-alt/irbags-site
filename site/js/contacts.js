/* ==========================================================================
   irbags — контакты
   - Время Кишинёва
   - Счётчик корзины
   - Кнопка «наверх»
   ========================================================================== */

(function () {

  var CART_KEY = 'irbags_cart';

  /* ─── Время Кишинёва ───────────────────────────────────────────────────── */

  var timeEl = document.getElementById('siteTime');

  function getChisinauTime() {
    return new Date().toLocaleTimeString('ru-RU', {
      timeZone: 'Europe/Chisinau',
      hour:     '2-digit',
      minute:   '2-digit',
      second:   '2-digit',
      hour12:   false
    });
  }

  if (timeEl) {
    timeEl.textContent = getChisinauTime();
    setInterval(function () { timeEl.textContent = getChisinauTime(); }, 1000);
  }

  /* ─── Счётчик корзины ──────────────────────────────────────────────────── */

  var cartCountEl = document.getElementById('siteCartCount');

  function updateCartCount() {
    if (!cartCountEl) return;
    try {
      var cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      var count = Array.isArray(cart) ? cart.length : 0;
      cartCountEl.textContent = count > 0 ? count : '';
    } catch (e) {
      cartCountEl.textContent = '';
    }
  }

  updateCartCount();

  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) updateCartCount();
  });

  /* ─── Высота main = реальный первый экран, без скролла ─────────────────── */
  /* zoom = clientWidth / baseWidth → высота в design-px = innerHeight / zoom
     (тот же приём, что в cart.js positionEmpty — vh ненадёжен под css-zoom) */

  var mainEl = document.querySelector('.contacts-main');

  function fitToScreen() {
    if (!mainEl) return;
    var baseWidth    = document.body.classList.contains('is-mobile') ? 375 : 1920;
    var zoom         = document.documentElement.clientWidth / baseWidth;
    var designHeight = window.innerHeight / zoom;
    mainEl.style.height = designHeight + 'px';
  }

  fitToScreen();
  window.addEventListener('load',   fitToScreen);
  window.addEventListener('resize', fitToScreen, { passive: true });

})();
