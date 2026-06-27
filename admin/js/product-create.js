/* ==========================================================================
   admin · товар (создание / редактирование)
   Режим определяется по URL: ?id=TIMESTAMP → редактирование, иначе → создание
   ========================================================================== */

(function () {

  var FILTERS_KEY  = 'irbags_filters';
  var PRODUCTS_KEY = 'irbags_products';
  var DEFAULT_FILTERS = ['сумки', 'ремни', 'платки', 'подвесы', 'брелки', 'обложки', 'визитницы'];

  /* ─── DOM ──────────────────────────────────────────────────────────────── */

  var addBtn        = document.getElementById('pcAddBtn');
  var saveBtn       = document.getElementById('pcSaveBtn');
  var deleteBtn     = document.getElementById('pcDeleteBtn');
  var backBtn       = document.getElementById('pcBackBtn');
  var popup         = document.getElementById('pcPopup');
  var popupOverlay  = document.getElementById('pcPopupOverlay');
  var popupConfirm  = document.getElementById('pcPopupConfirm');
  var descrInput    = document.getElementById('pcDescr');
  var sizeInput     = document.getElementById('pcSize');
  var nameInput     = document.getElementById('pcName');
  var priceInput    = document.getElementById('pcPrice');
  var discountInput = document.getElementById('pcDiscount');
  var shortDescrInput = document.getElementById('pcShortDescr');
  var colorsList    = document.getElementById('pcColorsList');
  var addColorBtn   = document.getElementById('pcAddColorBtn');
  var categories    = document.getElementById('pcCategories');

  /* ─── Хранилище ────────────────────────────────────────────────────────── */

  function loadProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveProducts(products) {
    try { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products)); } catch (e) {}
  }

  function loadFilters() {
    try {
      var s = localStorage.getItem(FILTERS_KEY);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return DEFAULT_FILTERS.slice();
  }

  /* ─── Режим: создание vs редактирование ───────────────────────────────── */

  function getEditId() {
    var m = window.location.search.match(/[?&]id=([^&]+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  var editId      = getEditId();
  var isEditMode  = editId !== null;
  var hasChanges  = false;

  /* ─── «Назад» ──────────────────────────────────────────────────────────── */

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (window.history.length > 1) history.back();
      else window.location.href = isEditMode ? 'products.html' : 'dashboard.html';
    });
  }

  /* ─── Авторесайз textarea ──────────────────────────────────────────────── */

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  document.querySelectorAll('.pc-textarea').forEach(function (ta) {
    ta.addEventListener('input', function () { autoResize(this); });
    autoResize(ta);
  });

  /* ─── Отслеживание изменений (режим редактирования) ───────────────────── */

  function markChanged() {
    if (isEditMode && !hasChanges) {
      hasChanges = true;
      if (saveBtn) saveBtn.classList.add('is-visible');
    }
  }

  /* ─── Валидация «добавить» (только режим создания) ────────────────────── */

  function checkValidity() {
    if (isEditMode) return;
    var ok = descrInput    && descrInput.value.trim()    !== '' &&
             sizeInput     && sizeInput.value.trim()     !== '' &&
             nameInput     && nameInput.value.trim()     !== '' &&
             priceInput    && priceInput.value.trim()    !== '' &&
             colorsList    && colorsList.querySelectorAll('.pc-color-item').length > 0 &&
             categories    && categories.querySelector('.is-selected') !== null;
    if (addBtn) {
      addBtn.disabled = !ok;
      addBtn.classList.toggle('is-active', ok);
    }
  }

  [descrInput, sizeInput, nameInput, priceInput, discountInput, shortDescrInput]
    .forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', function () { checkValidity(); markChanged(); });
    });

  /* ─── Фото — сжатие через canvas и сохранение как base64 ─────────────── */

  /* 6 слотов: null = фото не выбрано */
  var photoData = [null, null, null, null, null, null];

  function compressToDataURL(file, maxW, maxH, quality, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var scale  = Math.min(1, maxW / img.width, maxH / img.height);
        var canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  document.querySelectorAll('.pc-photo').forEach(function (slot) {
    var fileInput  = slot.querySelector('.pc-photo__input');
    var preview    = slot.querySelector('.pc-photo__preview');
    var slotIndex  = parseInt(slot.getAttribute('data-slot'), 10);

    slot.addEventListener('click', function () { fileInput.click(); });

    fileInput.addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      /* показываем превью сразу */
      preview.src = URL.createObjectURL(file);
      slot.classList.add('has-image');
      /* сжимаем и сохраняем в памяти */
      compressToDataURL(file, 960, 1080, 0.75, function (dataUrl) {
        photoData[slotIndex] = dataUrl;
        markChanged();
      });
    });
  });

  /* ─── Категории ────────────────────────────────────────────────────────── */

  function renderCategories(preselectName) {
    if (!categories) return;
    categories.innerHTML = '';
    loadFilters().forEach(function (name) {
      var li = document.createElement('li');
      li.className = 'pc-categories__item';
      li.textContent = name;
      if (preselectName && name === preselectName) {
        li.classList.add('is-selected');
        categories.classList.add('has-selection');
      }
      li.addEventListener('click', function () {
        var wasSelected = this.classList.contains('is-selected');
        categories.querySelectorAll('.pc-categories__item').forEach(function (el) {
          el.classList.remove('is-selected');
        });
        if (wasSelected) {
          categories.classList.remove('has-selection');
        } else {
          this.classList.add('is-selected');
          categories.classList.add('has-selection');
        }
        checkValidity();
        markChanged();
      });
      categories.appendChild(li);
    });
    positionCategories();
  }

  function positionCategories() {
    if (!categories) return;
    var zoom      = parseFloat(document.documentElement.style.zoom) || 1;
    var viewportH = window.innerHeight / zoom;
    categories.style.top = Math.round(viewportH - 20 - categories.offsetHeight) + 'px';
  }

  window.addEventListener('resize', positionCategories, { passive: true });

  /* ─── Цвета ────────────────────────────────────────────────────────────── */

  function makeColorSpan(li, value) {
    li.innerHTML = '';
    var span = document.createElement('span');
    span.className = 'pc-color-item';
    span.textContent = value;
    li.appendChild(span);
    span.addEventListener('click', function () { startEditingColor(li, span); });
  }

  function createColorInput(value) {
    var input = document.createElement('input');
    input.type        = 'text';
    input.className   = 'pc-color-input';
    input.placeholder = 'цвет';
    input.autocomplete = 'off';
    input.spellcheck  = false;
    input.value       = value;
    input.style.width = Math.max(4, (value.length || 4)) + 'ch';
    input.addEventListener('input', function () {
      this.style.width = Math.max(4, this.value.length || 4) + 'ch';
    });
    return input;
  }

  function bindColorInput(input, li, fallbackSpan) {
    var committed = false;
    function commit() {
      if (committed) return;
      committed = true;
      var value = input.value.trim().toLowerCase();
      if (value) {
        makeColorSpan(li, value);
      } else if (fallbackSpan) {
        li.innerHTML = '';
        li.appendChild(fallbackSpan);
        fallbackSpan.addEventListener('click', function () { startEditingColor(li, fallbackSpan); });
      } else {
        li.remove();
      }
      checkValidity();
      markChanged();
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  { e.preventDefault(); commit(); }
      if (e.key === 'Escape') {
        committed = true;
        if (fallbackSpan) {
          li.innerHTML = '';
          li.appendChild(fallbackSpan);
          fallbackSpan.addEventListener('click', function () { startEditingColor(li, fallbackSpan); });
        } else { li.remove(); }
        checkValidity();
      }
    });
    input.addEventListener('blur', commit);
  }

  function addColorItem() {
    var li    = document.createElement('li');
    var input = createColorInput('');
    li.appendChild(input);
    colorsList.appendChild(li);
    input.focus();
    bindColorInput(input, li, null);
  }

  function startEditingColor(li, span) {
    var prev  = span.textContent;
    li.innerHTML = '';
    var input = createColorInput(prev);
    li.appendChild(input);
    input.focus();
    input.select();
    bindColorInput(input, li, span);
  }

  if (addColorBtn) addColorBtn.addEventListener('click', addColorItem);

  /* ─── Кнопка «добавить» (только создание) ─────────────────────────────── */

  if (addBtn && !isEditMode) {
    addBtn.addEventListener('click', async function () {
      if (!this.classList.contains('is-active')) return;
      var product = collectFormData(Date.now());
      var products = loadProducts();
      products.push(product);
      saveProducts(products);
      if (window.IrbagsDB) await window.IrbagsDB.saveProducts(products);
      if (window.history.length > 1) history.back();
      else window.location.href = 'products.html';
    });
  }

  /* ─── Кнопка «сохранить» (только редактирование) ──────────────────────── */

  if (saveBtn && isEditMode) {
    saveBtn.addEventListener('click', async function () {
      if (!this.classList.contains('is-visible')) return;
      var products = loadProducts();
      for (var i = 0; i < products.length; i++) {
        if (products[i].id === editId) {
          products[i] = collectFormData(editId);
          break;
        }
      }
      saveProducts(products);
      if (window.IrbagsDB) await window.IrbagsDB.saveProducts(products);
      if (window.history.length > 1) history.back();
      else window.location.href = 'products.html';
    });
  }

  /* ─── Сбор данных формы ────────────────────────────────────────────────── */

  function collectFormData(id) {
    return {
      id:          id,
      photos:      photoData.slice(),
      name:        nameInput        ? nameInput.value.trim()        : '',
      price:       priceInput       ? priceInput.value.trim()       : '',
      discount:    discountInput    ? discountInput.value.trim()    : '',
      description: descrInput       ? descrInput.value.trim()       : '',
      size:        sizeInput        ? sizeInput.value.trim()        : '',
      shortDescr:  shortDescrInput  ? shortDescrInput.value.trim()  : '',
      colors:      Array.from(colorsList ? colorsList.querySelectorAll('.pc-color-item') : [])
                     .map(function (el) { return el.textContent; }),
      categories:  Array.from(categories ? categories.querySelectorAll('.is-selected') : [])
                     .map(function (el) { return el.textContent; })
    };
  }

  /* ─── Поп-ап удаления ──────────────────────────────────────────────────── */

  function showPopup() { popup.classList.add('is-open'); popup.setAttribute('aria-hidden', 'false'); }
  function hidePopup()  { popup.classList.remove('is-open'); popup.setAttribute('aria-hidden', 'true'); }

  if (deleteBtn && isEditMode) {
    deleteBtn.addEventListener('click', showPopup);
  }

  if (popupOverlay) popupOverlay.addEventListener('click', hidePopup);

  if (popupConfirm) {
    popupConfirm.addEventListener('click', async function () {
      if (isEditMode && editId) {
        var products = loadProducts().filter(function (p) { return p.id !== editId; });
        saveProducts(products);
        if (window.IrbagsDB) await window.IrbagsDB.saveProducts(products);
        window.location.href = 'products.html';
      } else {
        hidePopup();
        history.back();
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popup.classList.contains('is-open')) hidePopup();
  });

  /* ─── Инициализация режима ─────────────────────────────────────────────── */

  if (isEditMode) {
    /* переключаем кнопки */
    document.body.classList.add('is-edit-mode');

    /* загружаем товар */
    var product = null;
    var products = loadProducts();
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === editId) { product = products[i]; break; }
    }

    if (product) {
      if (descrInput)       { descrInput.value = product.description || ''; autoResize(descrInput); }
      if (sizeInput)        sizeInput.value    = product.size         || '';
      if (nameInput)        nameInput.value    = product.name         || '';
      if (priceInput)       priceInput.value   = product.price        || '';
      if (discountInput)    discountInput.value = product.discount    || '';
      if (shortDescrInput)  { shortDescrInput.value = product.shortDescr || ''; autoResize(shortDescrInput); }

      /* фотографии */
      (product.photos || []).forEach(function (dataUrl, idx) {
        if (!dataUrl) return;
        photoData[idx] = dataUrl;
        var slot = document.querySelector('.pc-photo[data-slot="' + idx + '"]');
        if (!slot) return;
        var preview = slot.querySelector('.pc-photo__preview');
        if (preview) { preview.src = dataUrl; slot.classList.add('has-image'); }
      });

      /* цвета */
      (product.colors || []).forEach(function (colorName) {
        var li = document.createElement('li');
        colorsList.appendChild(li);
        makeColorSpan(li, colorName);
      });

      /* категория */
      var preselect = (product.categories && product.categories[0]) || null;
      renderCategories(preselect);
    } else {
      renderCategories(null);
    }

  } else {
    /* режим создания */
    renderCategories(null);
    checkValidity();
  }

})();
