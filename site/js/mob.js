/* ==========================================================================
   irbags — мобильное меню
   ========================================================================== */

(function () {

  var CART_KEY = 'irbags_cart';

  /* ─── Счётчик корзины ──────────────────────────────────────────────── */

  function updateCartCount() {
    var els = document.querySelectorAll('#siteCartCount');
    try {
      var cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      var n = Array.isArray(cart) ? cart.length : 0;
      els.forEach(function (el) { el.textContent = n > 0 ? n : ''; });
    } catch (e) {
      els.forEach(function (el) { el.textContent = ''; });
    }
  }

  updateCartCount();
  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) updateCartCount();
  });

  /* ─── Кнопка «наверх» ──────────────────────────────────────────────── */

  var topBtn = document.getElementById('siteTopBtn');
  if (topBtn) {
    topBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── Мобильное меню ───────────────────────────────────────────────── */

  var menuBtn       = document.getElementById('siteMenuBtn');
  var menuClose     = document.getElementById('siteMobMenuClose');
  var mobNav        = document.getElementById('siteMobMenuNav');
  var mobSearchBtn  = document.getElementById('siteMobMenuSearchBtn');
  var mobSearchForm = document.getElementById('siteMobMenuSearch');
  var mobSearchInput = document.getElementById('siteMobMenuSearchInput');

  /* CSS у .site-mob-menu__nav/__search-btn/__search уже задаёт свой display
     (flex/block) — атрибут [hidden] браузера он перебивает, поэтому
     переключаем видимость через inline style.display, а не .hidden */

  function resetMenuSearch() {
    if (!mobNav || !mobSearchBtn || !mobSearchForm) return;
    mobNav.style.display = '';
    mobSearchBtn.style.display = '';
    mobSearchForm.style.display = 'none';
    if (mobSearchInput) mobSearchInput.value = '';
  }

  function openMenu() {
    document.body.classList.add('is-mob-menu-open');
  }

  function closeMenu() {
    document.body.classList.remove('is-mob-menu-open');
    resetMenuSearch();
  }

  if (menuBtn)   menuBtn.addEventListener('click', openMenu);
  if (menuClose) menuClose.addEventListener('click', closeMenu);

  /* ─── Поиск из меню — открывается на месте ссылок «магазин/о нас/контакты» ── */

  if (mobSearchBtn && mobSearchForm && mobNav) {
    mobSearchForm.style.display = 'none';
    mobSearchBtn.addEventListener('click', function () {
      mobNav.style.display = 'none';
      mobSearchBtn.style.display = 'none';
      mobSearchForm.style.display = 'flex';
      if (mobSearchInput) mobSearchInput.focus();
    });
  }

  if (mobSearchForm) {
    mobSearchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = mobSearchInput ? mobSearchInput.value.trim() : '';
      window.location.href = 'shop.html' + (q ? ('?q=' + encodeURIComponent(q)) : '');
    });
  }

  /* ─── Время Кишинёва в меню ──────────────────────────────────────────── */

  var mobTimeEl = document.getElementById('siteMobMenuTime');

  function getChisinauTime() {
    return new Date().toLocaleTimeString('ru-RU', {
      timeZone: 'Europe/Chisinau',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  }

  if (mobTimeEl) {
    mobTimeEl.textContent = getChisinauTime();
    setInterval(function () { mobTimeEl.textContent = getChisinauTime(); }, 1000);
  }

})();
