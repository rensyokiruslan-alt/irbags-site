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
      els.forEach(function (el) { el.textContent = n; });
    } catch (e) {
      els.forEach(function (el) { el.textContent = '0'; });
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

  var menuBtn   = document.getElementById('siteMenuBtn');
  var menuClose = document.getElementById('siteMobMenuClose');

  function openMenu() {
    document.body.classList.add('is-mob-menu-open');
  }

  function closeMenu() {
    document.body.classList.remove('is-mob-menu-open');
  }

  if (menuBtn)   menuBtn.addEventListener('click', openMenu);
  if (menuClose) menuClose.addEventListener('click', closeMenu);

})();
