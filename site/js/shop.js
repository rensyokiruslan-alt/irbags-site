/* ==========================================================================
   irbags — магазин
   - Время Кишинёва
   - Счётчик корзины
   - Категории из irbags_filters
   - Товары из irbags_products с фильтром / поиском / сортировкой
   ========================================================================== */

(function () {

  var PRODUCTS_KEY = 'irbags_products';
  var FILTERS_KEY  = 'irbags_filters';
  var CART_KEY     = 'irbags_cart';

  /* ─── Состояние ────────────────────────────────────────────────────────── */

  var isFilterOpen = false;
  var currentCat   = '';        /* '' = все */
  var currentQuery = '';
  var currentSize  = '';        /* UI-only, фильтр не применяется */
  var currentMat   = '';        /* '' = все равно */
  var currentSort  = 'default'; /* default | new | price-desc | price-asc */

  /* ─── DOM ──────────────────────────────────────────────────────────────── */

  var body         = document.body;
  var timeEl       = document.getElementById('siteTime');
  var cartCountEl  = document.getElementById('siteCartCount');
  var topBtn       = document.getElementById('siteTopBtn');
  var catBtn       = document.getElementById('shopCatBtn');
  var catValue     = document.getElementById('shopCatValue');
  var searchEl     = document.getElementById('shopSearch');
  var clearBtn     = document.getElementById('shopClearBtn');
  var filterBtn    = document.getElementById('shopFilterBtn');
  var filterCount  = document.getElementById('shopFilterCount');
  var closeBtn     = document.getElementById('shopCloseBtn');
  var panelCat     = document.getElementById('shopPanelCat');
  var gridEl       = document.getElementById('shopGrid');

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
    } catch (e) {
      cartCountEl.textContent = '';
    }
  }

  updateCartCount();
  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) updateCartCount();
  });

  /* ─── Кнопка «наверх» ──────────────────────────────────────────────────── */

  if (topBtn) {
    topBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── Загрузка данных ──────────────────────────────────────────────────── */

  function loadProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); } catch (e) { return []; }
  }

  function loadCategories() {
    try {
      var raw = JSON.parse(localStorage.getItem(FILTERS_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.map(function (f) {
        return typeof f === 'string' ? f : (f.name || '');
      }).filter(Boolean);
    } catch (e) { return []; }
  }

  /* ─── Фильтр по имени / категории ─────────────────────────────────────── */

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

  /* ─── Разбор цены для сортировки ───────────────────────────────────────── */

  function parsePrice(str) {
    if (!str) return 0;
    var n = parseFloat(String(str).replace(/[^0-9.,]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  function formatRub(n) {
    return n + ' руб';
  }

  /* ─── Цена / скидка — старая цена (зачёркнута) + плашка «-X% новая цена» ── */

  function buildPriceBlock(price, discount) {
    if (discount && discount.trim() && price && price.trim()) {
      var oldNum   = parsePrice(price);
      var newNum   = parsePrice(discount);
      var percent  = oldNum > 0 ? Math.round((1 - newNum / oldNum) * 100) : 0;

      var priceRow = document.createElement('div');
      priceRow.className = 'site-price-row';

      var origText = document.createElement('span');
      origText.className = 'site-price-orig__text';
      origText.textContent = formatRub(oldNum);
      priceRow.appendChild(origText);

      var badge = document.createElement('div');
      badge.className = 'site-discount-badge';
      var percentEl = document.createElement('span');
      percentEl.className = 'site-discount-badge__percent';
      percentEl.textContent = '-' + Math.abs(percent) + '%';
      var newEl = document.createElement('span');
      newEl.className = 'site-discount-badge__price';
      newEl.textContent = formatRub(newNum);
      badge.appendChild(percentEl);
      badge.appendChild(newEl);
      priceRow.appendChild(badge);

      return priceRow;
    }

    var priceSpan = document.createElement('span');
    priceSpan.className = 'site-item__price';
    priceSpan.textContent = price ? formatRub(parsePrice(price)) : '';
    return priceSpan;
  }

  /* ─── Применение фильтров и сортировки ────────────────────────────────── */

  function applyAll(products) {
    var result = products.slice();

    if (currentCat) {
      result = result.filter(function (p) {
        return (p.categories || []).indexOf(currentCat) !== -1;
      });
    }

    result = filterProducts(result, currentQuery);

    if (currentMat) {
      result = result.filter(function (p) {
        return (p.material || '') === currentMat;
      });
    }

    if (currentSort === 'new') {
      result.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
    } else if (currentSort === 'price-desc') {
      result.sort(function (a, b) { return parsePrice(b.price) - parsePrice(a.price); });
    } else if (currentSort === 'price-asc') {
      result.sort(function (a, b) { return parsePrice(a.price) - parsePrice(b.price); });
    }

    return result;
  }

  /* ─── Корзина ─────────────────────────────────────────────────────────── */

  function addToCart(product) {
    try {
      var cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      var existing = cart.filter(function (e) { return e.productId === product.id; })[0];
      if (existing) {
        existing.qty = (existing.qty || 1) + 1;
      } else {
        var color = (product.colors && product.colors.length) ? product.colors[0] : '';
        cart.push({ productId: product.id, qty: 1, color: color });
      }
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      updateCartCount();
    } catch (e) {}
  }

  /* ─── Создание карточки товара ─────────────────────────────────────────── */

  function createCard(product) {
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

    label.appendChild(buildPriceBlock(product.price, product.discount));

    item.appendChild(label);
    return item;
  }

  /* ─── Рендер сетки ─────────────────────────────────────────────────────── */

  function renderGrid() {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    var all      = loadProducts();
    var filtered = applyAll(all);

    if (filtered.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'shop-empty';
      empty.textContent = 'товары не найдены';
      gridEl.appendChild(empty);
      return;
    }

    filtered.forEach(function (p) {
      gridEl.appendChild(createCard(p));
    });
  }

  /* ─── Рендер категорий в панели ────────────────────────────────────────── */

  function renderCategories() {
    if (!panelCat) return;
    panelCat.innerHTML = '';
    var cats = loadCategories();

    var allBtn = document.createElement('button');
    allBtn.className = 'shop-panel__opt' + (currentCat === '' ? ' shop-panel__opt--active' : '');
    allBtn.textContent = 'все';
    allBtn.addEventListener('click', function () { selectCategory(''); });
    panelCat.appendChild(allBtn);

    cats.forEach(function (cat) {
      var btn = document.createElement('button');
      btn.className = 'shop-panel__opt' + (currentCat === cat ? ' shop-panel__opt--active' : '');
      btn.textContent = cat;
      btn.addEventListener('click', function () { selectCategory(cat); });
      panelCat.appendChild(btn);
    });

    updatePanelHeight();
  }

  function updatePanelHeight() {
    var inner = document.querySelector('.shop-panel__inner');
    if (!inner) return;
    var catCount  = panelCat ? panelCat.children.length : 0;
    var maxCount  = Math.max(catCount, 4); /* 4 = количество опций сортировки */
    var lineH     = 24; /* line-height: normal для 20px Helvetica Neue Medium */
    inner.style.height = (maxCount * lineH) + 'px';
  }

  function selectCategory(cat) {
    currentCat = cat;
    if (catValue) catValue.textContent = cat || 'все';
    renderCategories();
    renderGrid();
  }

  /* ─── Счётчик активных фильтров (размер + материал) ───────────────────── */

  function updateFilterCount() {
    var count = (currentSize ? 1 : 0) + (currentMat ? 1 : 0);
    if (filterCount) {
      filterCount.textContent = count;
      filterCount.classList.toggle('is-zero', count === 0);
    }
  }

  /* ─── Открыть / закрыть панель ─────────────────────────────────────────── */

  function openFilter() {
    isFilterOpen = true;
    body.classList.add('is-filter-open');
  }

  function closeFilter() {
    isFilterOpen = false;
    body.classList.remove('is-filter-open');
  }

  /* ─── Сброс всех фильтров ──────────────────────────────────────────────── */

  function clearFilters() {
    currentSize = '';
    currentMat  = '';
    currentSort = 'default';

    document.querySelectorAll('.shop-panel__opt[data-size]').forEach(function (b) {
      b.classList.remove('shop-panel__opt--active');
    });
    document.querySelectorAll('.shop-panel__opt[data-mat]').forEach(function (b) {
      b.classList.toggle('shop-panel__opt--active', b.getAttribute('data-mat') === '');
    });
    document.querySelectorAll('.shop-panel__opt[data-sort]').forEach(function (b) {
      b.classList.toggle('shop-panel__opt--active', b.getAttribute('data-sort') === 'default');
    });

    updateFilterCount();
    renderGrid();
  }

  /* ─── События ──────────────────────────────────────────────────────────── */

  if (filterBtn) {
    filterBtn.addEventListener('click', function () {
      if (!isFilterOpen) openFilter();
    });
  }

  if (catBtn) {
    catBtn.addEventListener('click', function () {
      if (!isFilterOpen) openFilter();
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeFilter);
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);

  if (searchEl) {
    searchEl.addEventListener('input', function () {
      currentQuery = this.value.trim();
      renderGrid();
    });
  }

  /* Размер (UI-only) */
  document.querySelectorAll('.shop-panel__opt[data-size]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var size = this.getAttribute('data-size');
      if (currentSize === size) {
        currentSize = '';
        this.classList.remove('shop-panel__opt--active');
      } else {
        document.querySelectorAll('.shop-panel__opt[data-size]').forEach(function (b) {
          b.classList.remove('shop-panel__opt--active');
        });
        currentSize = size;
        this.classList.add('shop-panel__opt--active');
      }
      updateFilterCount();
    });
  });

  /* Материал */
  document.querySelectorAll('.shop-panel__opt[data-mat]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentMat = this.getAttribute('data-mat');
      document.querySelectorAll('.shop-panel__opt[data-mat]').forEach(function (b) {
        b.classList.toggle('shop-panel__opt--active', b === btn);
      });
      updateFilterCount();
      renderGrid();
    });
  });

  /* Сортировка */
  document.querySelectorAll('.shop-panel__opt[data-sort]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentSort = this.getAttribute('data-sort');
      document.querySelectorAll('.shop-panel__opt[data-sort]').forEach(function (b) {
        b.classList.toggle('shop-panel__opt--active', b === btn);
      });
      renderGrid();
    });
  });

  /* ─── Запрос поиска из URL (?q=...) — из мобильного поиска в меню ───────── */

  try {
    var initialQuery = new URLSearchParams(window.location.search).get('q');
    if (initialQuery) {
      currentQuery = initialQuery.trim();
      if (searchEl) searchEl.value = currentQuery;
    }
  } catch (e) {}

  /* ─── Инициализация ────────────────────────────────────────────────────── */

  renderCategories();
  renderGrid();
  updateFilterCount();

})();
