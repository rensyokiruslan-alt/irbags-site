/* ==========================================================================
   irbags — оформление заказа
   ========================================================================== */

(function () {

  var CART_KEY     = 'irbags_cart';
  var PRODUCTS_KEY = 'irbags_products';

  /* URL веб-приложения Google Apps Script */
  var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyvSTGv2yocJAEsUjYAPIla6u2rCeUC5R3H7NVIZWbMn9ItjAeo7DEiVPwGn8tSXIv1/exec';

  /* ─── DOM ──────────────────────────────────────────────────────────────── */

  var backBtn           = document.getElementById('checkoutBackBtn');
  var leftEl            = document.getElementById('checkoutLeft');
  var phoneInput        = document.getElementById('checkoutPhone');
  var emailInput        = document.getElementById('checkoutEmail');
  var firstNameInput    = document.getElementById('checkoutFirstName');
  var lastNameInput     = document.getElementById('checkoutLastName');
  var addressInput      = document.getElementById('checkoutAddress');
  var cityInput         = document.getElementById('checkoutCity');
  var deliveryOptionsEl = document.getElementById('checkoutDeliveryOptions');
  var deliveryValueEl   = document.getElementById('checkoutDeliveryValue');
  var paymentOptionsEl  = document.getElementById('checkoutPaymentOptions');
  var itemsEl           = document.getElementById('checkoutItems');
  var totalPriceEl      = document.getElementById('checkoutTotalPrice');
  var agreeCheckbox     = document.getElementById('checkoutAgree');
  var submitBtn         = document.getElementById('checkoutSubmit');

  /* ─── Состояние ────────────────────────────────────────────────────────── */

  var selectedDelivery = 'курьером';
  var selectedPayment  = 'онлайн';

  /* ─── Хранилище ────────────────────────────────────────────────────────── */

  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { return []; }
  }

  function loadProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); } catch (e) { return []; }
  }

  /* ─── Защита от пустой корзины ─────────────────────────────────────────── */

  var cart = loadCart();
  if (cart.length === 0) {
    window.location.href = 'shop.html';
    return;
  }

  /* ─── Кнопка «назад» ───────────────────────────────────────────────────── */

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      window.location.href = 'cart.html';
    });
  }

  /* ─── Высота левой колонки = высота вьюпорта ───────────────────────────── */

  function setLeftHeight() {
    if (!leftEl) return;
    var zoom         = document.documentElement.clientWidth / 1920;
    var designHeight = window.innerHeight / zoom;
    leftEl.style.height = designHeight + 'px';
  }

  setLeftHeight();
  window.addEventListener('resize', setLeftHeight, { passive: true });

  /* ─── Телефон: +373 появляется при фокусе ──────────────────────────────── */

  if (phoneInput) {
    phoneInput.addEventListener('focus', function () {
      if (!this.value) this.value = '+373';
    });

    phoneInput.addEventListener('blur', function () {
      if (this.value === '+373') this.value = '';
    });

    phoneInput.addEventListener('keydown', function (e) {
      if ((e.key === 'Backspace' || e.key === 'Delete') && this.value === '+373') {
        e.preventDefault();
      }
    });

    phoneInput.addEventListener('input', function () {
      var val = this.value;
      if (!val.startsWith('+373')) {
        val = '+373' + val.replace(/\D/g, '');
      } else {
        val = '+373' + val.slice(4).replace(/\D/g, '');
      }
      this.value = val;
      this.classList.remove('is-error');
    });
  }

  /* ─── Сброс ошибки при вводе / фокусе ─────────────────────────────────── */

  [emailInput, firstNameInput, lastNameInput, addressInput, cityInput].forEach(function (el) {
    if (!el) return;
    el.addEventListener('focus', function () { this.classList.remove('is-error'); });
    el.addEventListener('input', function () { this.classList.remove('is-error'); });
  });

  /* ─── Доставка ─────────────────────────────────────────────────────────── */

  function setDelivery(value) {
    selectedDelivery = value;
    if (deliveryValueEl) deliveryValueEl.textContent = value;
    updateAddressFields();
    if (!deliveryOptionsEl) return;
    deliveryOptionsEl.querySelectorAll('.checkout-option').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.value === value);
    });
  }

  function updateAddressFields() {
    var isPickup = selectedDelivery === 'самовывоз';
    if (addressInput) addressInput.style.display = isPickup ? 'none' : '';
    if (cityInput)    cityInput.style.display    = isPickup ? 'none' : '';
  }

  if (deliveryOptionsEl) {
    deliveryOptionsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.checkout-option');
      if (btn) setDelivery(btn.dataset.value);
    });
  }

  /* ─── Оплата ───────────────────────────────────────────────────────────── */

  function setPayment(value) {
    selectedPayment = value;
    if (!paymentOptionsEl) return;
    paymentOptionsEl.querySelectorAll('.checkout-option').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.value === value);
    });
  }

  if (paymentOptionsEl) {
    paymentOptionsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.checkout-option');
      if (btn) setPayment(btn.dataset.value);
    });
  }

  /* ─── Цена ─────────────────────────────────────────────────────────────── */

  function parsePrice(str) {
    if (!str) return 0;
    var n = parseFloat(String(str).replace(/[^0-9.,]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  function itemPrice(product) {
    var raw = (product.discount && product.discount.trim()) ? product.discount : product.price;
    return parsePrice(raw);
  }

  function formatRub(n) { return n + ' руб'; }

  /* Цена строки товара — старая цена (зачёркнута) + плашка «-X% новая цена» */
  function buildPriceEl(product, qty) {
    var container = document.createElement('div');
    container.className = 'checkout-item__price';

    var hasDiscount = product.discount && product.discount.trim() && product.price && product.price.trim();
    if (!hasDiscount) {
      container.textContent = formatRub(parsePrice(product.price) * qty);
      return container;
    }

    var unitOld = parsePrice(product.price);
    var unitNew = parsePrice(product.discount);
    var percent = unitOld > 0 ? Math.round((1 - unitNew / unitOld) * 100) : 0;

    var row = document.createElement('div');
    row.className = 'checkout-item__price-row';

    var oldText = document.createElement('span');
    oldText.className = 'checkout-item__price-old-text';
    oldText.textContent = formatRub(unitOld * qty);
    row.appendChild(oldText);

    var badge = document.createElement('div');
    badge.className = 'checkout-discount-badge';
    var percentEl = document.createElement('span');
    percentEl.className = 'checkout-discount-badge__percent';
    percentEl.textContent = '-' + Math.abs(percent) + '%';
    var newEl = document.createElement('span');
    newEl.className = 'checkout-discount-badge__price';
    newEl.textContent = formatRub(unitNew * qty);
    badge.appendChild(percentEl);
    badge.appendChild(newEl);
    row.appendChild(badge);

    container.appendChild(row);
    return container;
  }

  /* ─── Рендер товаров ───────────────────────────────────────────────────── */

  function renderItems() {
    if (!itemsEl) return;
    var products   = loadProducts();
    var productMap = {};
    products.forEach(function (p) { productMap[p.id] = p; });

    itemsEl.innerHTML = '';
    var total = 0;

    cart.forEach(function (entry) {
      var product = productMap[entry.productId] || { name: '', price: '' };
      var qty     = entry.qty || 1;
      total += itemPrice(product) * qty;

      var item = document.createElement('div');
      item.className = 'checkout-item';

      var imgWrap = document.createElement('div');
      imgWrap.className = 'checkout-item__img';
      var firstPhoto = product.photos && product.photos[0];
      if (firstPhoto) {
        var img = document.createElement('img');
        img.src = firstPhoto;
        img.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';
        imgWrap.appendChild(img);
      }
      item.appendChild(imgWrap);

      item.appendChild(buildPriceEl(product, qty));

      var nameEl = document.createElement('span');
      nameEl.className = 'checkout-item__name';
      nameEl.textContent = product.name || '';
      item.appendChild(nameEl);

      if (entry.color) {
        var colorEl = document.createElement('span');
        colorEl.className = 'checkout-item__color';
        colorEl.textContent = entry.color;
        item.appendChild(colorEl);
      }

      var qtyEl = document.createElement('span');
      qtyEl.className = 'checkout-item__qty';
      qtyEl.textContent = 'х' + qty;
      item.appendChild(qtyEl);

      itemsEl.appendChild(item);
    });

    if (totalPriceEl) totalPriceEl.textContent = formatRub(total);
  }

  renderItems();
  updateAddressFields();

  /* ─── Чекбокс → кнопка ─────────────────────────────────────────────────── */

  if (agreeCheckbox && submitBtn) {
    agreeCheckbox.addEventListener('change', function () {
      submitBtn.disabled = !this.checked;
    });
  }

  /* ─── Валидация с мерцанием ────────────────────────────────────────────── */

  function flashError(el) {
    /* перезапуск анимации даже если класс уже стоит */
    el.classList.remove('is-error');
    void el.offsetWidth; /* reflow */
    el.classList.add('is-error');
  }

  function validate() {
    var ok = true;

    function check(el, condition) {
      if (!el) return;
      if (!condition) {
        flashError(el);
        ok = false;
      } else {
        el.classList.remove('is-error');
      }
    }

    var phone     = phoneInput     ? phoneInput.value.trim()     : '';
    var email     = emailInput     ? emailInput.value.trim()     : '';
    var firstName = firstNameInput ? firstNameInput.value.trim() : '';
    var lastName  = lastNameInput  ? lastNameInput.value.trim()  : '';
    var address   = addressInput   ? addressInput.value.trim()   : '';
    var city      = cityInput      ? cityInput.value.trim()      : '';
    var isPickup  = selectedDelivery === 'самовывоз';

    check(phoneInput,     phone.length > 4);
    check(emailInput,     /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    check(firstNameInput, firstName.length > 0);
    check(lastNameInput,  lastName.length > 0);
    if (!isPickup) {
      check(addressInput, address.length > 0);
      check(cityInput,    city.length > 0);
    }

    return ok;
  }

  /* ─── Отправка заказа ──────────────────────────────────────────────────── */

  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      if (!validate()) return;

      submitBtn.disabled = true;

      var products   = loadProducts();
      var productMap = {};
      products.forEach(function (p) { productMap[p.id] = p; });

      var itemsText = cart.map(function (entry) {
        var p = productMap[entry.productId] || {};
        return (p.name || String(entry.productId)) +
               (entry.color ? ' (' + entry.color + ')' : '') +
               ' х' + (entry.qty || 1);
      }).join('; ');

      var total = cart.reduce(function (sum, entry) {
        var p = productMap[entry.productId];
        return sum + (p ? itemPrice(p) * (entry.qty || 1) : 0);
      }, 0);

      var isPickup = selectedDelivery === 'самовывоз';

      var data = {
        date:      new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Chisinau' }),
        phone:     phoneInput.value.trim(),
        email:     emailInput.value.trim(),
        delivery:  selectedDelivery,
        firstName: firstNameInput.value.trim(),
        lastName:  lastNameInput.value.trim(),
        address:   isPickup ? '' : (addressInput ? addressInput.value.trim() : ''),
        city:      isPickup ? '' : (cityInput    ? cityInput.value.trim()    : ''),
        payment:   selectedPayment,
        items:     itemsText,
        total:     formatRub(total)
      };

      if (!SCRIPT_URL) {
        localStorage.removeItem(CART_KEY);
        window.location.href = 'success.html';
        return;
      }

      /* text/plain — simple request без preflight, Apps Script возвращает JSON */
      var timeout = new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('timeout')); }, 10000);
      });

      Promise.race([
        fetch(SCRIPT_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'text/plain' },
          body:    JSON.stringify(data)
        }).then(function (r) { return r.json(); }),
        timeout
      ])
      .then(function (result) {
        if (result && result.status === 'ok') {
          localStorage.removeItem(CART_KEY);
          window.location.href = 'success.html';
        } else {
          window.location.href = 'fail.html';
        }
      })
      .catch(function () {
        window.location.href = 'fail.html';
      });
    });
  }

})();
