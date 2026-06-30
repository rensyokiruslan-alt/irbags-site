/* ==========================================================================
   admin · товары
   Режимы:
     обычный        → body (без классов)
     выбор удаления → body.is-delete-mode
     есть выбранные → body.is-delete-mode.has-selection
     поп-ап         → pr-popup.is-open
   Данные: localStorage['irbags_products']
   ========================================================================== */

(function () {

  var PRODUCTS_KEY = 'irbags_products';

  var body           = document.body;
  var deleteBtn      = document.getElementById('prDeleteBtn');
  var popup          = document.getElementById('prPopup');
  var popupOverlay   = document.getElementById('prPopupOverlay');
  var popupConfirm   = document.getElementById('prPopupConfirm');
  var header         = document.getElementById('prHeader');
  var itemsContainer = document.getElementById('prItems');
  var searchInput    = document.querySelector('.pr-header__search-input');

  var selectedItems = new Set();
  var currentQuery  = '';

  /* ─── Хранилище ────────────────────────────────────────────────────────── */

  function loadProducts() {
    try {
      var stored = localStorage.getItem(PRODUCTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  }

  function saveProducts(products) {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    } catch (e) {}
  }

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
      priceRow.className = 'pr-price-row';

      var origText = document.createElement('span');
      origText.className = 'pr-price-orig__text';
      origText.textContent = formatRub(oldNum);
      priceRow.appendChild(origText);

      var badge = document.createElement('div');
      badge.className = 'pr-discount-badge';
      var percentEl = document.createElement('span');
      percentEl.className = 'pr-discount-badge__percent';
      percentEl.textContent = '-' + Math.abs(percent) + '%';
      var newEl = document.createElement('span');
      newEl.className = 'pr-discount-badge__price';
      newEl.textContent = formatRub(newNum);
      badge.appendChild(percentEl);
      badge.appendChild(newEl);
      priceRow.appendChild(badge);

      return priceRow;
    }

    var priceSpan = document.createElement('span');
    priceSpan.className = 'pr-item__price';
    priceSpan.textContent = price ? formatRub(parsePrice(price)) : 'сумма';
    return priceSpan;
  }

  /* ─── Создание карточки товара ─────────────────────────────────────────── */

  function createProductCard(product) {
    var item = document.createElement('div');
    item.className = 'pr-item';
    item.dataset.productId = product.id;

    /* фото */
    var img = document.createElement('div');
    img.className = 'pr-item__img';
    var firstPhoto = product.photos && product.photos[0];
    if (firstPhoto) {
      var photoImg = document.createElement('img');
      photoImg.src = firstPhoto;
      photoImg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';
      img.appendChild(photoImg);
    } else {
      var icon = document.createElement('img');
      icon.className = 'pr-icon';
      icon.src = 'img/mountain.svg';
      icon.alt = '';
      img.appendChild(icon);
    }
    item.appendChild(img);

    /* оверлей выбора */
    var overlay = document.createElement('div');
    overlay.className = 'pr-item__overlay';
    item.appendChild(overlay);

    /* тег «выбрано» */
    var tag = document.createElement('span');
    tag.className = 'pr-item__tag';
    tag.textContent = 'выбрано';
    item.appendChild(tag);

    /* подпись */
    var label = document.createElement('div');
    label.className = 'pr-item__label';

    var name = document.createElement('span');
    name.className = 'pr-item__name';
    name.textContent = product.name || 'название';
    label.appendChild(name);

    label.appendChild(buildPriceBlock(product.price, product.discount));

    item.appendChild(label);
    return item;
  }

  /* ─── Рендер сетки ─────────────────────────────────────────────────────── */

  function renderProducts() {
    if (!itemsContainer) return;
    itemsContainer.innerHTML = '';
    selectedItems.clear();

    var allProducts = loadProducts();
    var products    = filterProducts(allProducts, currentQuery);

    if (allProducts.length === 0) {
      body.classList.add('is-empty');
      return;
    }
    body.classList.remove('is-empty');

    if (products.length === 0) {
      var emptyRow = document.createElement('div');
      emptyRow.className = 'pr-row';
      for (var e = 0; e < 4; e++) {
        var emptySlot = document.createElement('div');
        emptySlot.className = 'pr-item pr-item--empty';
        emptyRow.appendChild(emptySlot);
      }
      itemsContainer.appendChild(emptyRow);
      return;
    }

    for (var i = 0; i < products.length; i += 4) {
      var row = document.createElement('div');
      row.className = 'pr-row';

      for (var j = i; j < Math.min(i + 4, products.length); j++) {
        row.appendChild(createProductCard(products[j]));
      }

      while (row.children.length < 4) {
        var slot = document.createElement('div');
        slot.className = 'pr-item pr-item--empty';
        row.appendChild(slot);
      }

      itemsContainer.appendChild(row);
    }
  }

  renderProducts();

  /* ─── Поиск — фильтрация при вводе ─────────────────────────────────────── */

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      currentQuery = this.value.trim();
      exitDeleteMode();
      renderProducts();
    });
  }

  /* ─── Скрытие хедера при скролле ──────────────────────────────────────── */

  if (header) {
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var currentY = window.scrollY;
      if (currentY > lastY && currentY > 60) {
        header.classList.add('is-hidden');
      } else {
        header.classList.remove('is-hidden');
      }
      lastY = currentY;
    }, { passive: true });
  }

  /* ─── Кнопка «удалить» ─────────────────────────────────────────────────── */

  if (deleteBtn) {
    deleteBtn.addEventListener('click', function () {
      if (body.classList.contains('has-selection')) {
        showPopup();
        return;
      }
      if (!body.classList.contains('is-delete-mode')) {
        body.classList.add('is-delete-mode');
        return;
      }
      exitDeleteMode();
    });
  }

  /* ─── Клик по товару ───────────────────────────────────────────────────── */

  if (itemsContainer) {
    itemsContainer.addEventListener('click', function (e) {
      var item = e.target.closest('.pr-item');
      if (!item || item.classList.contains('pr-item--empty')) return;

      if (body.classList.contains('is-delete-mode')) {
        if (selectedItems.has(item)) {
          item.classList.remove('is-selected');
          selectedItems.delete(item);
        } else {
          item.classList.add('is-selected');
          selectedItems.add(item);
        }
        body.classList.toggle('has-selection', selectedItems.size > 0);
      } else {
        var productId = item.dataset.productId;
        if (productId) {
          window.location.href = 'product-create.html?id=' + productId;
        }
      }
    });
  }

  /* ─── Поп-ап ───────────────────────────────────────────────────────────── */

  function showPopup() {
    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');
  }

  function hidePopup() {
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
  }

  if (popupOverlay) popupOverlay.addEventListener('click', hidePopup);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popup.classList.contains('is-open')) hidePopup();
  });

  /* «Удалить» в поп-апе → удалить из хранилища и перерендерить */
  if (popupConfirm) {
    popupConfirm.addEventListener('click', async function () {
      var idsToDelete = Array.from(selectedItems).map(function (item) {
        return parseInt(item.dataset.productId, 10);
      }).filter(Boolean);

      if (idsToDelete.length > 0) {
        var products = loadProducts().filter(function (p) {
          return idsToDelete.indexOf(p.id) === -1;
        });
        saveProducts(products);
        if (window.IrbagsDB) await window.IrbagsDB.saveProducts(products);
      }

      selectedItems.clear();
      hidePopup();
      exitDeleteMode();
      renderProducts();
    });
  }

  /* ─── Выход из режима удаления ─────────────────────────────────────────── */

  function exitDeleteMode() {
    selectedItems.forEach(function (item) { item.classList.remove('is-selected'); });
    selectedItems.clear();
    body.classList.remove('is-delete-mode', 'has-selection');
  }

})();
