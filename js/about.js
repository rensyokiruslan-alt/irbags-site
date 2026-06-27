/* ==========================================================================
   irbags — о нас
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
      cartCountEl.textContent = Array.isArray(cart) ? cart.length : 0;
    } catch (e) {
      cartCountEl.textContent = '0';
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

  /* ─── Позиционирование всех блоков ниже фото ──────────────────────────── */
  /*
   * Фото ставится на: низ текста «каждая модель» + 20px
   * Всё ниже фото двигается цепочкой с теми же смещениями, что в Figma:
   *   delivery  = photo_bottom + 20          (Figma: 1720 + 20 = 1740)
   *   payments  = delivery_top + 540         (Figma: 2280 - 1740)
   *   contacts  = delivery_top + 930         (Figma: 2670 - 1740)
   *   footer    = delivery_top + 1328        (Figma: 3068 - 1740)
   */

  var weRight  = document.getElementById('aboutWeRight');
  var photo    = document.getElementById('aboutPhoto');
  var delivery = document.getElementById('aboutDelivery');
  var payments = document.getElementById('aboutPayments');
  var contacts = document.getElementById('aboutContacts');
  var footer   = document.getElementById('aboutFooter');
  var mainEl   = document.querySelector('.about-main');

  function positionAll() {
    if (!weRight || !photo) return;

    var photoTop    = weRight.offsetTop + weRight.offsetHeight + 20;
    var photoBottom = photoTop + 900;
    var deliveryTop = photoBottom + 20;

    photo.style.top = photoTop + 'px';

    if (delivery) delivery.style.top = deliveryTop + 'px';
    if (payments) payments.style.top = (deliveryTop + 540) + 'px';
    if (contacts) contacts.style.top = (deliveryTop + 930) + 'px';
    if (footer)   footer.style.top   = (deliveryTop + 1328) + 'px';
    if (mainEl)   mainEl.style.height = (deliveryTop + 1328 + 40) + 'px';
  }

  positionAll();
  window.addEventListener('load', positionAll);
  window.addEventListener('resize', positionAll);

})();
