/* ==========================================================================
   admin · выбор товара
   URL params: ?grid=grid1&slot=0  (или grid2, слот 0-3)
   Клик по карточке → выбор одного товара
   Поиск → фильтрация по названию и категории
   «добавить» → сохранить в irbags_dashboard и вернуться на dashboard
   ========================================================================== */

(function () {

  var PRODUCTS_KEY  = 'irbags_products';
  var DASHBOARD_KEY = 'irbags_dashboard';

  var addBtn      = document.getElementById('psAddBtn');
  var psItems     = document.getElementById('psItems');
  var searchInput = document.querySelector('.ps-header__search-input');

  var selectedItem      = null;
  var selectedProductId = null;
  var currentQuery      = '';

  /* ─── Хранилище ────────────────────────────────────────────────────────── */

  function loadProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); } catch (e) { return []; }
  }

  function loadDashboard() {
    try {
      var s = localStorage.getItem(DASHBOARD_KEY);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return { grid1: [null, null, null, null], grid2: [null, null, null, null] };
  }

  function saveDashboard(data) {
    try { localStorage.setItem(DASHBOARD_KEY, JSON.stringify(data)); } catch (e) {}
  }

  /* ─── Цена / скидка ──────────────────────────────────────────────────────── */

  function parsePrice(str) {
    if (!str) return 0;
    var n = parseFloat(String(str).replace(/[^0-9.,]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  function formatRub(n) {
    return n + ' руб';
  }

  function buildPriceBlock(price, discount) {
    if (discount && discount.trim() && price && price.trim()) {
      var oldNum  = parsePrice(price);
      var newNum  = parsePrice(discount);
      var percent = oldNum > 0 ? Math.round((1 - newNum / oldNum) * 100) : 0;

      var priceRow = document.createElement('div');
      priceRow.className = 'ps-price-row';

      var origText = document.createElement('span');
      origText.className = 'ps-price-orig__text';
      origText.textContent = formatRub(oldNum);
      priceRow.appendChild(origText);

      var badge = document.createElement('div');
      badge.className = 'ps-discount-badge';
      var percentEl = document.createElement('span');
      percentEl.className = 'ps-discount-badge__percent';
      percentEl.textContent = '-' + Math.abs(percent) + '%';
      var newEl = document.createElement('span');
      newEl.className = 'ps-discount-badge__price';
      newEl.textContent = formatRub(newNum);
      badge.appendChild(percentEl);
      badge.appendChild(newEl);
      priceRow.appendChild(badge);

      return priceRow;
    }

    var priceSpan = document.createElement('span');
    priceSpan.className = 'ps-item__price';
    priceSpan.textContent = price ? formatRub(parsePrice(price)) : '';
    return priceSpan;
  }

  /* ─── URL параметры ────────────────────────────────────────────────────── */

  function getParam(name) {
    var m = window.location.search.match(new RegExp('[?&]' + name + '=([^&]+)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  var targetGrid = getParam('grid');
  var targetSlot = parseInt(getParam('slot'), 10);

  /* ─── Поиск ────────────────────────────────────────────────────────────── */

  function filterProducts(products, query) {
    if (!query) return products;
    var q = query.toLowerCase();
    return products.filter(function (p) {
      var nameMatch = (p.name || '').toLowerCase().indexOf(q) !== -1;
      var catMatch  = (p.categories || []).some(function (c) {
        return c.toLowerCase().indexOf(q) !== -1;
      });
      return nameMatch || catMatch;
    });
  }

  /* ─── Создание карточки ────────────────────────────────────────────────── */

  function createProductCard(product) {
    var item = document.createElement('div');
    item.className = 'ps-item';
    item.dataset.productId = product.id;

    var img = document.createElement('div');
    img.className = 'ps-item__img';
    var firstPhoto = product.photos && product.photos[0];
    if (firstPhoto) {
      var photoImg = document.createElement('img');
      photoImg.src = firstPhoto;
      photoImg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';
      img.appendChild(photoImg);
    } else {
      var icon = document.createElement('img');
      icon.className = 'ps-icon';
      icon.src = 'img/mountain.svg';
      icon.alt = '';
      img.appendChild(icon);
    }
    item.appendChild(img);

    var overlay = document.createElement('div');
    overlay.className = 'ps-item__overlay';
    item.appendChild(overlay);

    var tag = document.createElement('span');
    tag.className = 'ps-item__tag';
    tag.textContent = 'выбрано';
    item.appendChild(tag);

    var label = document.createElement('div');
    label.className = 'ps-item__label';

    var name = document.createElement('span');
    name.className = 'ps-item__name';
    name.textContent = product.name || 'название';
    label.appendChild(name);

    label.appendChild(buildPriceBlock(product.price, product.discount));

    item.appendChild(label);
    return item;
  }

  /* ─── Рендер сетки ─────────────────────────────────────────────────────── */

  function renderProducts() {
    if (!psItems) return;
    psItems.innerHTML = '';
    selectedItem      = null;
    selectedProductId = null;
    setAddActive(false);

    var allProducts = loadProducts();
    var products    = filterProducts(allProducts, currentQuery);

    if (products.length === 0) return;

    for (var i = 0; i < products.length; i += 4) {
      var row = document.createElement('div');
      row.className = 'ps-row';
      for (var j = i; j < Math.min(i + 4, products.length); j++) {
        row.appendChild(createProductCard(products[j]));
      }
      while (row.children.length < 4) {
        var empty = document.createElement('div');
        empty.className = 'ps-item ps-item--empty';
        row.appendChild(empty);
      }
      psItems.appendChild(row);
    }
  }

  /* ─── Инициализация ────────────────────────────────────────────────────── */

  if (loadProducts().length === 0) {
    document.body.classList.add('is-empty');
  } else {
    renderProducts();
  }

  /* ─── Поиск ────────────────────────────────────────────────────────────── */

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      currentQuery = this.value.trim();
      renderProducts();
    });
  }

  /* ─── Выбор товара ─────────────────────────────────────────────────────── */

  if (psItems) {
    psItems.addEventListener('click', function (e) {
      var item = e.target.closest('.ps-item');
      if (!item || item.classList.contains('ps-item--empty')) return;

      if (selectedItem === item) {
        item.classList.remove('is-selected');
        selectedItem      = null;
        selectedProductId = null;
        setAddActive(false);
        return;
      }

      if (selectedItem) selectedItem.classList.remove('is-selected');
      item.classList.add('is-selected');
      selectedItem      = item;
      selectedProductId = parseInt(item.dataset.productId, 10);
      setAddActive(true);
    });
  }

  /* ─── Кнопка «добавить» ────────────────────────────────────────────────── */

  function setAddActive(active) {
    if (!addBtn) return;
    addBtn.classList.toggle('is-active', active);
  }

  if (addBtn) {
    addBtn.addEventListener('click', async function () {
      if (!this.classList.contains('is-active')) return;
      if (!selectedProductId || !targetGrid || isNaN(targetSlot)) return;

      var data = loadDashboard();
      if (!data[targetGrid]) data[targetGrid] = [null, null, null, null];
      data[targetGrid][targetSlot] = selectedProductId;
      saveDashboard(data);
      if (window.IrbagsDB) await window.IrbagsDB.saveDashboard(data);

      if (window.history.length > 1) history.back();
      else window.location.href = 'dashboard.html';
    });
  }

})();
