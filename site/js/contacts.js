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

  /* ─── Кнопка «наверх» ──────────────────────────────────────────────────── */

  var topBtn = document.getElementById('siteTopBtn');

  if (topBtn) {
    topBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

})();
