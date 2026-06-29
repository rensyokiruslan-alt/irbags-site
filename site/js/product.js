/* ==========================================================================
   irbags — карточка товара
   URL: product.html?id=PRODUCT_ID
   ========================================================================== */

(function () {

  var PRODUCTS_KEY = 'irbags_products';
  var CART_KEY     = 'irbags_cart';

  /* ─── DOM ──────────────────────────────────────────────────────────────── */

  var backBtn       = document.getElementById('productBackBtn');
  var timeEl        = document.getElementById('siteTime');
  var cartCountEl   = document.getElementById('siteCartCount');
  var topBtn        = document.getElementById('siteTopBtn');
  var mainEl        = document.getElementById('productMain');
  var leftWrapEl    = document.getElementById('productLeftWrap');
  var rightWrapEl   = document.getElementById('productRightWrap');
  var leftEl        = document.getElementById('productLeft');
  var rightEl       = document.getElementById('productRight');
  var descrEl      = document.getElementById('productDescr');
  var sizeEl       = document.getElementById('productSize');
  var namePriceEl  = document.getElementById('productNamePrice');
  var shortDescrEl = document.getElementById('productShortDescr');
  var colorsEl     = document.getElementById('productColors');
  var addBtnEl     = document.getElementById('productAddBtn');
  var photosEl     = document.getElementById('productPhotos');
  var suggestEl    = document.getElementById('productSuggest');
  var suggestGrid  = document.getElementById('productSuggestGrid');

  /* ─── Время Кишинёва ───────────────────────────────────────────────────── */

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

  /* ─── Счётчик корзины ──────────────────────────────────────────────────── */

  function updateCartCount() {
    if (!cartCountEl) return;
    try {
      var cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      var count = Array.isArray(cart) ? cart.length : 0;
      cartCountEl.textContent = count > 0 ? count : '';
    } catch (e) { cartCountEl.textContent = ''; }
  }

  updateCartCount();
  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) updateCartCount();
  });

  /* ─── Кнопка «назад» ───────────────────────────────────────────────────── */

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (window.history.length > 1) history.back();
      else window.location.href = 'shop.html';
    });
  }

  /* ─── Кнопка «наверх» ──────────────────────────────────────────────────── */

  if (topBtn) {
    topBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── Данные ───────────────────────────────────────────────────────────── */

  function loadProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); } catch (e) { return []; }
  }

  function getProductId() {
    try {
      var params = new URLSearchParams(window.location.search);
      var id = params.get('id');
      return id ? parseInt(id, 10) : null;
    } catch (e) { return null; }
  }

  /* ─── Фото — 6 плейсхолдеров ──────────────────────────────────────────── */
  /*
   * Компоновка центрального столбца (design-px):
   *  photo 1 — 930×1080, centered (left=495), top=0,    bg=#fafafa
   *  photo 2 — 930×1080, centered (left=495), top=1080, bg=#fafafa
   *  photo 3 — 960×1080, left=0,              top=2160, bg=#efefef
   *  photo 4 — 960×1080, left=960,            top=2160, bg=#efefef
   *  photo 5 — 960×1080, left=0,              top=3240, bg=#efefef, opacity=0.7
   *  photo 6 — 960×1080, left=960,            top=3240, bg=#efefef, opacity=0.5
   */

  var PHOTOS_LAYOUT = [
    { left: 495, top:    0, width: 930, height: 1080, bg: '#fafafa', opacity: 1   },
    { left: 495, top: 1080, width: 930, height: 1080, bg: '#fafafa', opacity: 1   },
    { left:   0, top: 2160, width: 960, height: 1080, bg: '#efefef', opacity: 1   },
    { left: 960, top: 2160, width: 960, height: 1080, bg: '#efefef', opacity: 0.8 },
    { left:   0, top: 3240, width: 960, height: 1080, bg: '#efefef', opacity: 0.7 },
    { left: 960, top: 3240, width: 960, height: 1080, bg: '#efefef', opacity: 0.5 }
  ];

  var TWO_PHOTOS_TOP = 2160; /* top of the side-by-side pair */

  function renderPhotos(product) {
    if (!photosEl) return;
    photosEl.innerHTML = '';
    PHOTOS_LAYOUT.forEach(function (p, i) {
      var div = document.createElement('div');
      div.className = 'product-photo';
      div.style.left   = p.left   + 'px';
      div.style.top    = p.top    + 'px';
      div.style.width  = p.width  + 'px';
      div.style.height = p.height + 'px';

      var photoUrl = product.photos && product.photos[i];
      if (photoUrl) {
        var img = document.createElement('img');
        img.src = photoUrl;
        img.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';
        div.appendChild(img);
      } else {
        div.style.background = p.bg;
        div.style.opacity    = p.opacity;
      }

      photosEl.appendChild(div);
    });
  }

  /* ─── Sticky-высота обёрток ───────────────────────────────────────────── */
  /*
   * Панели используют position:sticky внутри обёрток (position:absolute, top:220).
   * CSS sticky держит панель на top:220 от вьюпорта без какого-либо JS на скролл.
   * Когда обёртка заканчивается, sticky сам отпускает панель — она уходит вверх
   * вместе с контентом страницы, имитируя «расфиксирование».
   *
   * Высота обёртки = FREEZE_SCROLL + высота_панели.
   * FREEZE_SCROLL = TWO_PHOTOS_TOP − BUTTON_VIEWPORT_TOP − TRIGGER_MARGIN
   *              = 2160 − 600 − 400 = 1160 design-px
   */

  var BUTTON_VIEWPORT_TOP = 600; /* 220 (wrap top) + 380 (button offset in panel) */
  var TRIGGER_MARGIN      = 400;
  var FREEZE_SCROLL       = TWO_PHOTOS_TOP - BUTTON_VIEWPORT_TOP - TRIGGER_MARGIN; /* 1160 */

  function setupStickyWraps() {
    if (leftWrapEl  && leftEl)  leftWrapEl.style.height  = (FREEZE_SCROLL + leftEl.offsetHeight)  + 'px';
    if (rightWrapEl && rightEl) rightWrapEl.style.height = (FREEZE_SCROLL + rightEl.offsetHeight) + 'px';
  }

  window.addEventListener('resize', setupStickyWraps, { passive: true });

  /* ─── Цвета ────────────────────────────────────────────────────────────── */

  var selectedColor = '';

  function renderColors(colors) {
    if (!colorsEl) return;
    colorsEl.innerHTML = '';
    if (!colors || colors.length === 0) return;

    selectedColor = colors[0];

    colors.forEach(function (color, i) {
      var btn = document.createElement('button');
      btn.className = 'product-color' + (i === 0 ? ' is-active' : '');
      btn.textContent = color;
      btn.addEventListener('click', function () {
        selectedColor = color;
        colorsEl.querySelectorAll('.product-color').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
      });
      colorsEl.appendChild(btn);
    });
  }

  /* ─── Корзина ──────────────────────────────────────────────────────────── */

  function addToCart(productId) {
    try {
      var cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      var existing = cart.filter(function (e) {
        return e.productId === productId && e.color === selectedColor;
      })[0];
      if (existing) {
        existing.qty = (existing.qty || 1) + 1;
      } else {
        cart.push({ productId: productId, qty: 1, color: selectedColor });
      }
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      updateCartCount();
    } catch (e) {}
  }

  /* ─── Еженедельная ротация «предлагаем» ───────────────────────────────── */

  function weeklyShuffled(pool) {
    var week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
    var seed = week;
    var arr  = pool.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      seed  = ((seed * 1664525) + 1013904223) | 0;
      var j = Math.abs(seed) % (i + 1);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* ─── Карточка «предлагаем» ────────────────────────────────────────────── */

  function createSuggestCard(product) {
    var item = document.createElement('div');
    item.className = 'site-item';
    item.addEventListener('click', function () {
      window.location.href = 'product.html?id=' + product.id;
    });

    var img = document.createElement('div');
    img.className = 'site-item__img';
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
    item.appendChild(img);

    var label = document.createElement('div');
    label.className = 'site-item__label';

    var name = document.createElement('span');
    name.className = 'site-item__name';
    name.textContent = product.name || '';
    label.appendChild(name);

    if (product.discount && product.discount.trim() && product.price && product.price.trim()) {
      var priceRow = document.createElement('div');
      priceRow.className = 'site-price-row';

      var origWrap = document.createElement('div');
      origWrap.className = 'site-price-orig';
      var origText = document.createElement('span');
      origText.className = 'site-price-orig__text';
      origText.textContent = product.price;
      var origLine = document.createElement('div');
      origLine.className = 'site-price-orig__line';
      origWrap.appendChild(origText);
      origWrap.appendChild(origLine);

      var newPrice = document.createElement('span');
      newPrice.className = 'site-price-new';
      newPrice.textContent = product.discount;

      priceRow.appendChild(origWrap);
      priceRow.appendChild(newPrice);
      label.appendChild(priceRow);
    } else {
      var price = document.createElement('span');
      price.className = 'site-item__price';
      price.textContent = product.price || '';
      label.appendChild(price);
    }

    item.appendChild(label);
    return item;
  }

  /* ─── Секция «предлагаем» ──────────────────────────────────────────────── */

  function renderSuggest(product, allProducts) {
    if (!suggestEl || !suggestGrid) return;

    var cats = product.categories || [];
    var pool = allProducts.filter(function (p) {
      if (p.id === product.id) return false;
      if (cats.length === 0) return true;
      return (p.categories || []).some(function (c) { return cats.indexOf(c) !== -1; });
    });

    var selected = weeklyShuffled(pool).slice(0, 4);

    suggestGrid.innerHTML = '';
    selected.forEach(function (p) {
      suggestGrid.appendChild(createSuggestCard(p));
    });

    if (selected.length === 0) {
      suggestEl.style.display = 'none';
    }
  }

  /* ─── Название и цена ──────────────────────────────────────────────────── */

  function renderNamePrice(product) {
    if (!namePriceEl) return;
    namePriceEl.innerHTML = '';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'product-right__name';
    nameSpan.textContent = product.name || '';
    namePriceEl.appendChild(nameSpan);

    if (product.discount && product.discount.trim() && product.price && product.price.trim()) {
      /* строка: [старая цена зачёркнутая] [новая цена] */
      var priceRow = document.createElement('div');
      priceRow.className = 'product-right__price-row';

      var oldWrap = document.createElement('div');
      oldWrap.className = 'product-right__price-old';

      var oldText = document.createElement('span');
      oldText.className = 'product-right__price-old-text';
      oldText.textContent = product.price;

      var oldLine = document.createElement('div');
      oldLine.className = 'product-right__price-old-line';

      oldWrap.appendChild(oldText);
      oldWrap.appendChild(oldLine);
      priceRow.appendChild(oldWrap);

      var newSpan = document.createElement('span');
      newSpan.className = 'product-right__price-new';
      newSpan.textContent = product.discount;
      priceRow.appendChild(newSpan);

      namePriceEl.appendChild(priceRow);
    } else {
      var priceSpan = document.createElement('span');
      priceSpan.className = 'product-right__price';
      priceSpan.textContent = product.price || '';
      namePriceEl.appendChild(priceSpan);
    }
  }

  /* ─── Главный рендер ───────────────────────────────────────────────────── */

  function render() {
    var id       = getProductId();
    var products = loadProducts();
    var product  = products.filter(function (p) { return p.id === id; })[0];

    if (!product) {
      if (mainEl) {
        var zoom = document.documentElement.clientWidth / 1920;
        mainEl.style.height = (window.innerHeight / zoom) + 'px';
      }
      return;
    }

    document.title = (product.name || 'товар') + ' — irbags';

    renderPhotos(product);
    renderNamePrice(product);

    if (descrEl)      descrEl.textContent      = product.description || '';
    if (sizeEl)       sizeEl.textContent        = product.size        || '';
    if (shortDescrEl) shortDescrEl.textContent  = product.shortDescr  || '';

    renderColors(product.colors || []);

    if (addBtnEl) {
      addBtnEl.addEventListener('click', function () { addToCart(product.id); });
    }

    renderSuggest(product, products);

    /* высота main: последнее фото заканчивается в 4320, «предлагаем» в 4420+60+743 */
    var SUGGEST_TOP  = 4420;
    var CARD_HEIGHT  = 683 + 60; /* изображение + ярлык */
    if (mainEl) mainEl.style.height = (SUGGEST_TOP + 60 + CARD_HEIGHT + 80) + 'px';

    setupStickyWraps();
  }

  render();
  window.addEventListener('load', setupStickyWraps);

})();
