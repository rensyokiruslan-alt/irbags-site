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

  /* ─── Счётчик корзины ──────────────────────────────────────────────────── */

  function updateCartCount() {
    if (!cartCountEl) return;
    var cart = loadCart();
    cartCountEl.textContent = cart.length;
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

  /* ─── Действия ─────────────────────────────────────────────────────────── */

  function changeQty(index, newQty) {
    var cart = loadCart();
    if (index < 0 || index >= cart.length) return;
    cart[index].qty = newQty;
    saveCart(cart);
    render();
    updateCartCount();
  }

  function removeItem(index) {
    var cart = loadCart();
    cart.splice(index, 1);
    saveCart(cart);
    render();
    updateCartCount();
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
    var price = document.createElement('span');
    price.className = 'cart-item__price';
    var unitPrice = itemPrice(product);
    price.textContent = (unitPrice * qty) + ' €';
    item.appendChild(price);

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
    /* zoom = window.innerWidth / 1920 → высота в design-px = innerHeight / zoom */
    var zoom         = window.innerWidth / 1920;
    var designHeight = window.innerHeight / zoom;
    var top          = designHeight / 2 - 17; /* 17 = половина высоты строки 35px */
    cartEmptyEl.style.top = top + 'px';
    if (mainEl) mainEl.style.height = designHeight + 'px';
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
      positionEmpty();
      return;
    }

    cartEmptyEl.style.display = 'none';
    cartListEl.style.display  = 'flex';
    cartTotalEl.style.display = 'flex';
    if (cartPayBtn) cartPayBtn.style.display = 'block';

    /* рендер товаров */
    cartListEl.innerHTML = '';
    cart.forEach(function (entry, i) {
      var product = productMap[entry.productId] || { name: entry.productId || '', price: '' };
      cartListEl.appendChild(createItemEl(entry, product, i));
    });

    /* итоговая сумма */
    var total = calcTotal(cart, productMap);
    if (totalPriceEl) totalPriceEl.textContent = total + ' €';

    /* позиционирование итогов и кнопки */
    positionBottom();
  }

  /* ─── Инициализация ────────────────────────────────────────────────────── */

  render();
  updateCartCount();

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
    if (e.key === CART_KEY) {
      render();
      updateCartCount();
    }
  });

})();
