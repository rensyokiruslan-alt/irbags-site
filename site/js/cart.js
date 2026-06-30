/* ==========================================================================
   irbags — сумка (корзина)
   Структура элемента: { productId, qty, color }
   ========================================================================== */

(function () {

  var CART_KEY     = 'irbags_cart';
  var PRODUCTS_KEY = 'irbags_products';

  /* ─── DOM ──────────────────────────────────────────────────────────────── */

  var timeEl       = document.getElementById('siteTime');
  var cartCountEl  = document.getElementById('siteCartCount');
  var cartListEl   = document.getElementById('cartList');
  var cartEmptyEl  = document.getElementById('cartEmpty');
  var cartTotalEl  = document.getElementById('cartTotal');
  var totalPriceEl = document.getElementById('cartTotalPrice');
  var cartPayBtn   = document.getElementById('cartPayBtn');
  var mainEl       = document.getElementById('cartMain');
  var cartLinkEl   = document.getElementById('siteCartLink');
  var cartLabelEl  = document.getElementById('siteCartLabel');

  /* страница, с которой пришли в сумку — туда же возвращаемся при «закрыть» */
  var returnUrl = (document.referrer && document.referrer.indexOf(location.origin) === 0)
    ? document.referrer
    : 'shop.html';

  /* на странице сумки кнопка всегда «закрыть» — и пустая, и заполненная,
     ведёт обратно на страницу, с которой пришли */
  function updateCartLinkMode() {
    if (!cartLinkEl || !cartLabelEl) return;
    cartLabelEl.textContent = 'закрыть';
    if (cartCountEl) cartCountEl.textContent = '';
    cartLinkEl.href = returnUrl;
  }

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

  /* ─── Хранилище ────────────────────────────────────────────────────────── */

  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function loadProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); } catch (e) { return []; }
  }

  /* ─── Цена ─────────────────────────────────────────────────────────────── */

  function parsePrice(str) {
    if (!str) return 0;
    var n = parseFloat(String(str).replace(/[^0-9.,]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  function itemPrice(product) {
    /* если есть скидка — берём её, иначе основную цену */
    var raw = (product.discount && product.discount.trim()) ? product.discount : product.price;
    return parsePrice(raw);
  }

  function calcTotal(cart, productMap) {
    return cart.reduce(function (sum, entry) {
      var p = productMap[entry.productId];
      return sum + (p ? itemPrice(p) * (entry.qty || 1) : 0);
    }, 0);
  }

  function formatRub(n) { return n + ' руб'; }

  /* Цена строки товара — старая цена (зачёркнута) + плашка «-X% новая цена» */
  function buildCartPriceBlock(product, qty) {
    var container = document.createElement('div');
    container.className = 'cart-item__price';

    var hasDiscount = product.discount && product.discount.trim() && product.price && product.price.trim();
    if (!hasDiscount) {
      container.textContent = formatRub(parsePrice(product.price) * qty);
      return container;
    }

    var unitOld = parsePrice(product.price);
    var unitNew = parsePrice(product.discount);
    var percent = unitOld > 0 ? Math.round((1 - unitNew / unitOld) * 100) : 0;

    var row = document.createElement('div');
    row.className = 'site-price-row';

    var origText = document.createElement('span');
    origText.className = 'site-price-orig__text';
    origText.textContent = formatRub(unitOld * qty);
    row.appendChild(origText);

    var badge = document.createElement('div');
    badge.className = 'site-discount-badge';
    var percentEl = document.createElement('span');
    percentEl.className = 'site-discount-badge__percent';
    percentEl.textContent = '-' + Math.abs(percent) + '%';
    var newEl = document.createElement('span');
    newEl.className = 'site-discount-badge__price';
    newEl.textContent = formatRub(unitNew * qty);
    badge.appendChild(percentEl);
    badge.appendChild(newEl);
    row.appendChild(badge);

    container.appendChild(row);
    return container;
  }

  /* ─── Действия ─────────────────────────────────────────────────────────── */

  function changeQty(index, newQty) {
    var cart = loadCart();
    if (index < 0 || index >= cart.length) return;
    cart[index].qty = newQty;
    saveCart(cart);
    render();
  }

  function removeItem(index) {
    var cart = loadCart();
    cart.splice(index, 1);
    saveCart(cart);
    render();
  }

  /* ─── Создание карточки товара ─────────────────────────────────────────── */

  function createItemEl(entry, product, index) {
    var qty = entry.qty || 1;

    var item = document.createElement('div');
    item.className = 'cart-item';

    /* изображение */
    var imgWrap = document.createElement('div');
    imgWrap.className = 'cart-item__img';
    item.appendChild(imgWrap);

    /* название */
    var name = document.createElement('span');
    name.className = 'cart-item__name';
    name.textContent = product.name || '';
    item.appendChild(name);

    /* цвет */
    if (entry.color) {
      var color = document.createElement('span');
      color.className = 'cart-item__color';
      color.textContent = entry.color;
      item.appendChild(color);
    }

    /* управление количеством */
    var controls = document.createElement('div');
    controls.className = 'cart-item__controls';

    var minusBtn = document.createElement('button');
    minusBtn.className = 'cart-item__ctrl cart-item__ctrl--minus';
    minusBtn.textContent = '−';
    if (qty <= 1) minusBtn.classList.add('is-disabled');
    minusBtn.addEventListener('click', function () {
      if (qty > 1) changeQty(index, qty - 1);
    });

    var qtySpan = document.createElement('span');
    qtySpan.className = 'cart-item__qty';
    qtySpan.textContent = qty;

    var plusBtn = document.createElement('button');
    plusBtn.className = 'cart-item__ctrl cart-item__ctrl--plus';
    plusBtn.textContent = '+';
    plusBtn.addEventListener('click', function () {
      changeQty(index, qty + 1);
    });

    controls.appendChild(minusBtn);
    controls.appendChild(qtySpan);
    controls.appendChild(plusBtn);
    item.appendChild(controls);

    /* цена */
    item.appendChild(buildCartPriceBlock(product, qty));

    /* удалить */
    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'cart-item__delete';
    deleteBtn.textContent = 'удалить';
    deleteBtn.addEventListener('click', function () {
      removeItem(index);
    });
    item.appendChild(deleteBtn);

    return item;
  }

  /* ─── Позиционирование нижних элементов ────────────────────────────────── */

  function positionBottom() {
    if (!cartListEl || !cartTotalEl) return;
    /* на мобильном итого/доставка/оплатить идут обычным потоком (см. mobile.css),
       высоту и top считать не нужно — это только для десктопа */
    if (document.body.classList.contains('is-mobile')) return;

    var listBottom  = cartListEl.offsetTop + cartListEl.offsetHeight;
    var totalTop    = listBottom + 100;

    cartTotalEl.style.top = totalTop + 'px';

    if (cartPayBtn) {
      var totalHeight = cartTotalEl.offsetHeight;
      var payTop = totalTop + totalHeight + 80;
      cartPayBtn.style.top = payTop + 'px';
      if (mainEl) mainEl.style.height = (payTop + 20 + 150) + 'px';
    }
  }

  /* ─── Позиционирование пустого состояния по центру вьюпорта ───────────── */

  function positionEmpty() {
    if (!cartEmptyEl) return;
    var isMobile     = document.body.classList.contains('is-mobile');
    var baseWidth    = isMobile ? 375 : 1920;
    /* zoom = clientWidth / baseWidth → высота в design-px = innerHeight / zoom */
    var zoom         = document.documentElement.clientWidth / baseWidth;
    var designHeight = window.innerHeight / zoom;

    if (mainEl) mainEl.style.height = designHeight + 'px';

    if (isMobile) {
      /* кнопка — по центру экрана, текст пришит к низу (CSS bottom:10px) */
      var emptyLinkEl = cartEmptyEl.querySelector('.cart-empty__link');
      if (emptyLinkEl) emptyLinkEl.style.top = (designHeight / 2 - 10) + 'px';
    } else {
      var top = designHeight / 2 - 17; /* 17 = половина высоты строки 35px */
      cartEmptyEl.style.top = top + 'px';
    }
  }

  /* ─── Рендер ───────────────────────────────────────────────────────────── */

  function render() {
    var cart     = loadCart();
    var products = loadProducts();
    var productMap = {};
    products.forEach(function (p) { productMap[p.id] = p; });

    if (cart.length === 0) {
      cartListEl.style.display  = 'none';
      cartTotalEl.style.display = 'none';
      if (cartPayBtn) cartPayBtn.style.display = 'none';
      cartEmptyEl.style.display = 'block';
      document.body.classList.add('is-cart-empty');
      updateCartLinkMode();
      positionEmpty();
      return;
    }

    document.body.classList.remove('is-cart-empty');
    cartEmptyEl.style.display = 'none';
    cartListEl.style.display  = 'flex';
    cartTotalEl.style.display = 'flex';
    /* на мобильном кнопка — position:fixed+display:flex, иначе — block */
    if (cartPayBtn) cartPayBtn.style.display = document.body.classList.contains('is-mobile') ? 'flex' : 'block';
    updateCartLinkMode();

    /* рендер товаров */
    cartListEl.innerHTML = '';
    cart.forEach(function (entry, i) {
      var product = productMap[entry.productId] || { name: entry.productId || '', price: '' };
      cartListEl.appendChild(createItemEl(entry, product, i));
    });

    /* итоговая сумма */
    var total = calcTotal(cart, productMap);
    if (totalPriceEl) totalPriceEl.textContent = formatRub(total);

    /* позиционирование итогов и кнопки */
    positionBottom();
  }

  /* ─── Инициализация ────────────────────────────────────────────────────── */

  render();

  if (cartPayBtn) {
    cartPayBtn.addEventListener('click', function () {
      window.location.href = 'checkout.html';
    });
  }

  window.addEventListener('load', function () {
    positionBottom();
    positionEmpty();
  });
  window.addEventListener('resize', function () {
    positionBottom();
    positionEmpty();
  });

  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) render();
  });

})();
