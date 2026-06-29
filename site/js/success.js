/* ==========================================================================
   irbags — результат заказа (успех / ошибка)
   ========================================================================== */

(function () {

  var CART_KEY = 'irbags_cart';

  var mainEl  = document.getElementById('successMain');
  var textEl  = document.getElementById('successText');
  var linkEl  = document.getElementById('successLink');

  if (textEl) textEl.textContent = 'всё прошло успешно — мы скоро свяжемся';
  if (linkEl) {
    linkEl.textContent = 'вернуться к покупкам';
    linkEl.href = 'shop.html';
  }

  /* ─── Счётчик корзины ──────────────────────────────────────────────────── */

  var cartCountEl = document.getElementById('siteCartCount');
  if (cartCountEl) {
    try {
      var c = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      var count = Array.isArray(c) ? c.length : 0;
      cartCountEl.textContent = count > 0 ? count : '';
    } catch (e) { cartCountEl.textContent = ''; }
  }

  /* ─── Время Кишинёва ───────────────────────────────────────────────────── */

  var timeEl = document.getElementById('siteTime');

  function getChisinauTime() {
    return new Date().toLocaleTimeString('ru-RU', {
      timeZone: 'Europe/Chisinau',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  }

  if (timeEl) {
    timeEl.textContent = getChisinauTime();
    setInterval(function () { timeEl.textContent = getChisinauTime(); }, 1000);
  }

  /* ─── Центрирование по вертикали ───────────────────────────────────────── */

  function position() {
    var zoom         = document.documentElement.clientWidth / 1920;
    var designHeight = window.innerHeight / zoom;
    var top          = designHeight / 2 - 17; /* 17 = половина строки 35px */

    if (mainEl) mainEl.style.height = designHeight + 'px';
    if (textEl) textEl.style.top    = top + 'px';
    if (linkEl) linkEl.style.top    = top + 'px';
  }

  position();
  window.addEventListener('resize', position, { passive: true });

})();
