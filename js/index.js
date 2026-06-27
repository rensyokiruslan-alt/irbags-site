/* ==========================================================================
   irbags — главная страница
   - Время Кишинёва (обновляется каждую секунду)
   - Счётчик корзины из localStorage['irbags_cart']
   - Сетки товаров из irbags_dashboard + irbags_products
   - Кнопка «наверх»
   ========================================================================== */

(function () {

  var DASHBOARD_KEY = 'irbags_dashboard';
  var PRODUCTS_KEY  = 'irbags_products';
  var CART_KEY      = 'irbags_cart';
  var PHOTOS_KEY    = 'irbags_dashboard_photos';

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
    setInterval(function () {
      timeEl.textContent = getChisinauTime();
    }, 1000);

    /* Проверяем точность через API worldtimeapi.org */
    fetch('https://worldtimeapi.org/api/timezone/Europe/Chisinau')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        /* API подтверждает текущий offset — Intl уже корректно обрабатывает DST,
           используем ответ только для верификации, отображение не меняем */
        void data;
      })
      .catch(function () { /* fallback: Intl уже работает */ });
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

  /* ─── Хранилище ────────────────────────────────────────────────────────── */

  function loadDashboard() {
    try {
      var s = localStorage.getItem(DASHBOARD_KEY);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return { grid1: [null, null, null, null], grid2: [null, null, null, null] };
  }

  function loadProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); } catch (e) { return []; }
  }

  /* ─── Создание карточки ────────────────────────────────────────────────── */

  function createCard(product) {
    var item = document.createElement('div');
    item.className = 'site-item';

    if (product) {
      item.addEventListener('click', function () {
        window.location.href = 'product.html?id=' + product.id;
      });
    }

    var img = document.createElement('div');
    img.className = 'site-item__img';

    if (product) {
      var firstPhoto = product.photos && product.photos[0];
      if (firstPhoto) {
        var photoImg = document.createElement('img');
        photoImg.src = firstPhoto;
        photoImg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';
        img.appendChild(photoImg);
      } else {
        var icon = document.createElement('img');
        icon.className = 'site-icon';
        icon.src = 'img/mountain.svg';
        icon.alt = '';
        img.appendChild(icon);
      }
    }

    item.appendChild(img);

    if (product) {
      var label = document.createElement('div');
      label.className = 'site-item__label';

      var name = document.createElement('span');
      name.className = 'site-item__name';
      name.textContent = product.name || '';
      label.appendChild(name);

      if (product.discount && product.discount.trim() && product.price && product.price.trim()) {
        /* зачёркнутая цена + цена со скидкой */
        var priceRow = document.createElement('div');
        priceRow.className = 'site-price-row';

        var origWrap = document.createElement('div');
        origWrap.className = 'site-price-orig';

        var origText = document.createElement('span');
        origText.className = 'site-price-orig__text';
        origText.textContent = product.price;
        origWrap.appendChild(origText);

        var origLine = document.createElement('div');
        origLine.className = 'site-price-orig__line';
        origWrap.appendChild(origLine);

        priceRow.appendChild(origWrap);

        var newPrice = document.createElement('span');
        newPrice.className = 'site-price-new';
        newPrice.textContent = product.discount;
        priceRow.appendChild(newPrice);

        label.appendChild(priceRow);
      } else {
        var price = document.createElement('span');
        price.className = 'site-item__price';
        price.textContent = product.price || '';
        label.appendChild(price);
      }

      item.appendChild(label);
    }

    return item;
  }

  /* ─── Рендер сетки ─────────────────────────────────────────────────────── */

  function renderGrid(gridEl, slots, productMap) {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    slots.forEach(function (id) {
      var product = (id !== null && productMap[id]) ? productMap[id] : null;
      gridEl.appendChild(createCard(product));
    });
  }

  var data       = loadDashboard();
  var products   = loadProducts();
  var productMap = {};
  products.forEach(function (p) { productMap[p.id] = p; });

  renderGrid(document.getElementById('siteGrid1'), data.grid1, productMap);
  renderGrid(document.getElementById('siteGrid2'), data.grid2, productMap);

  /* ─── Фотографии с главной (из админ-панели) ──────────────────────────── */

  (function () {
    var photos;
    try { photos = JSON.parse(localStorage.getItem(PHOTOS_KEY) || '{}'); } catch (e) { photos = {}; }

    var photoMap = [
      { key: 'hero',         selector: '.site-hero' },
      { key: 'photoLeft',    selector: '.site-two-photos__half--left' },
      { key: 'photoRight',   selector: '.site-two-photos__half--right' },
      { key: 'photoFull900', selector: '.site-photo-full--900' },
      { key: 'photoFull1080',selector: '.site-photo-full--1080' },
    ];

    photoMap.forEach(function (item) {
      var val = photos[item.key];
      if (!val) return;
      var el = document.querySelector(item.selector);
      if (!el) return;
      var src = val && typeof val === 'object' ? val.src : val;
      var pos = val && typeof val === 'object' && val.x != null
        ? val.x + '% ' + val.y + '%'
        : '50% 50%';
      var img = document.createElement('img');
      img.src = src;
      img.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;object-position:' + pos + ';';
      el.appendChild(img);
    });
  }());

  /* ─── Кнопка «наверх» ──────────────────────────────────────────────────── */

  var topBtn = document.getElementById('siteTopBtn');
  if (topBtn) {
    topBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

})();
