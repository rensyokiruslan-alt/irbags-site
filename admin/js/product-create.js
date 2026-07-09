/* ==========================================================================
   admin · товар (создание / редактирование)
   Режим определяется по URL: ?id=TIMESTAMP → редактирование, иначе → создание

   Структура товара (новый формат):
   {
     id, name, description, size, shortDescr, categories,
     variants: [{ color, price, discount, photos:[6] }, ...]
   }
   Старый формат (price/discount/photos/colors на верхнем уровне) конвертируется
   в один вариант при загрузке.
   ========================================================================== */

(function () {

  var FILTERS_KEY     = 'irbags_filters';
  var PRODUCTS_KEY    = 'irbags_products';
  var DEFAULT_FILTERS = ['сумки', 'ремни', 'платки', 'подвесы', 'брелки', 'обложки', 'визитницы'];

  /* ─── DOM ──────────────────────────────────────────────────────────────── */

  var addBtn          = document.getElementById('pcAddBtn');
  var saveBtn         = document.getElementById('pcSaveBtn');
  var deleteBtn       = document.getElementById('pcDeleteBtn');
  var backBtn         = document.getElementById('pcBackBtn');
  var popup           = document.getElementById('pcPopup');
  var popupOverlay    = document.getElementById('pcPopupOverlay');
  var popupConfirm    = document.getElementById('pcPopupConfirm');
  var descrInput      = document.getElementById('pcDescr');
  var sizeInput       = document.getElementById('pcSize');
  var nameInput       = document.getElementById('pcName');
  var priceInput      = document.getElementById('pcPrice');
  var discountInput   = document.getElementById('pcDiscount');
  var shortDescrInput = document.getElementById('pcShortDescr');
  var colorsList      = document.getElementById('pcColorsList');
  var addColorBtn     = document.getElementById('pcAddColorBtn');
  var categories      = document.getElementById('pcCategories');

  /* ─── Хранилище ────────────────────────────────────────────────────────── */

  function loadProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveProducts(list) {
    try { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(list)); } catch (e) {}
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

  var editId     = getEditId();
  var isEditMode = editId !== null;
  var hasChanges = false;

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

  /* ─── Ограничение «краткое описание» — не более 4 строк ────────────────── */

  if (shortDescrInput) {
    shortDescrInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var lines = this.value.split('\n').length;
        if (lines >= 4) e.preventDefault();
      }
    });

    shortDescrInput.addEventListener('input', function () {
      var lines = this.value.split('\n');
      if (lines.length > 4) this.value = lines.slice(0, 4).join('\n');
    });
  }

  /* ─── Отслеживание изменений (режим редактирования) ───────────────────── */

  function markChanged() {
    if (isEditMode && !hasChanges) {
      hasChanges = true;
      if (saveBtn) saveBtn.classList.add('is-visible');
    }
  }

  /* ─── Варианты товара ──────────────────────────────────────────────────── */
  /*
   * Каждый вариант: { color, price, discount, photos:[6] }
   * Активный вариант — тот, чьи фото и цены отображаются на экране.
   * Переключение: клик на пункт цвета → applyVariant(idx)
   * Редактирование имени: клик на уже активный пункт → startVariantEdit
   */

  var variants         = [];
  var activeVariantIdx = 0;

  function newVariant(color) {
    return { color: color || '', price: '', discount: '',
             photos: [null, null, null, null, null, null] };
  }

  /* Сохранить значения полей price/discount в активный вариант */
  function flushActiveFields() {
    var v = variants[activeVariantIdx];
    if (!v) return;
    v.price    = priceInput    ? priceInput.value.trim()    : '';
    v.discount = discountInput ? discountInput.value.trim() : '';
  }

  /* Переключиться на вариант с индексом idx */
  function applyVariant(idx) {
    flushActiveFields();
    activeVariantIdx = idx;
    var v = variants[idx];

    /* поля цены */
    if (priceInput)    priceInput.value    = v.price    || '';
    if (discountInput) discountInput.value = v.discount || '';

    /* фото-слоты */
    document.querySelectorAll('.pc-photo').forEach(function (slot) {
      var si      = parseInt(slot.getAttribute('data-slot'), 10);
      var preview = slot.querySelector('.pc-photo__preview');
      var url     = v.photos[si] || '';
      if (url) {
        preview.src = url;
        slot.classList.add('has-image');
      } else {
        preview.src = '';
        slot.classList.remove('has-image');
      }
    });

    /* активный индикатор */
    if (colorsList) {
      Array.from(colorsList.children).forEach(function (li, i) {
        li.classList.toggle('is-active', i === idx);
      });
    }

    checkDiscount();
    checkValidity();
  }

  /* Создать <li> для варианта с индексом idx */
  function makeVariantLi(idx) {
    var li   = document.createElement('li');
    var span = document.createElement('span');
    span.className  = 'pc-color-item';
    span.textContent = variants[idx].color || '';
    li.appendChild(span);
    li.classList.toggle('is-active', idx === activeVariantIdx);

    li.addEventListener('click', function () {
      if (activeVariantIdx === idx) {
        startVariantEdit(li, span, idx);
      } else {
        applyVariant(idx);
      }
    });

    return li;
  }

  /* Инлайн-редактирование имени варианта */
  function startVariantEdit(li, span, idx) {
    li.innerHTML = '';

    var input = document.createElement('input');
    input.type         = 'text';
    input.className    = 'pc-color-input';
    input.placeholder  = 'цвет';
    input.autocomplete = 'off';
    input.spellcheck   = false;
    input.value        = variants[idx].color || '';
    input.style.width  = Math.max(4, (input.value.length || 4)) + 'ch';
    input.addEventListener('input', function () {
      this.style.width = Math.max(4, this.value.length || 4) + 'ch';
    });
    li.appendChild(input);
    input.focus();
    input.select();

    var done = false;
    function commit() {
      if (done) return; done = true;
      var val = input.value.trim().toLowerCase();
      variants[idx].color  = val;
      span.textContent     = val;
      li.innerHTML         = '';
      li.appendChild(span);
      checkValidity();
      markChanged();
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { done = true; li.innerHTML = ''; li.appendChild(span); }
    });
    input.addEventListener('blur', commit);
  }

  /* Добавить новый вариант */
  function addVariant() {
    flushActiveFields();
    var idx = variants.length;
    variants.push(newVariant(''));
    activeVariantIdx = idx;

    var li = makeVariantLi(idx);
    colorsList.appendChild(li);

    /* обновить подсветку всех пунктов */
    Array.from(colorsList.children).forEach(function (el, i) {
      el.classList.toggle('is-active', i === idx);
    });

    /* очистить поля цены и фото-слоты */
    if (priceInput)    priceInput.value    = '';
    if (discountInput) discountInput.value = '';
    document.querySelectorAll('.pc-photo').forEach(function (slot) {
      var preview = slot.querySelector('.pc-photo__preview');
      if (preview) preview.src = '';
      slot.classList.remove('has-image');
    });

    /* открыть редактирование имени нового варианта */
    var span = li.querySelector('.pc-color-item');
    startVariantEdit(li, span, idx);

    checkValidity();
    markChanged();
  }

  if (addColorBtn) addColorBtn.addEventListener('click', addVariant);

  /* ─── Фото ─────────────────────────────────────────────────────────────── */

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
    var fileInput = slot.querySelector('.pc-photo__input');
    var preview   = slot.querySelector('.pc-photo__preview');
    var slotIndex = parseInt(slot.getAttribute('data-slot'), 10);

    slot.addEventListener('click', function () { fileInput.click(); });

    fileInput.addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      preview.src = URL.createObjectURL(file);
      slot.classList.add('has-image');
      compressToDataURL(file, 800, 900, 0.6, function (dataUrl) {
        if (variants[activeVariantIdx]) {
          variants[activeVariantIdx].photos[slotIndex] = dataUrl;
        }
        markChanged();
      });
    });
  });

  /* ─── Скидка не может быть больше или равна цене ───────────────────────── */

  function parsePrice(str) {
    if (!str) return 0;
    var n = parseFloat(String(str).replace(/[^0-9.,]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  function isDiscountValid() {
    if (!discountInput || !discountInput.value.trim()) return true;
    var price    = parsePrice(priceInput ? priceInput.value : '');
    var discount = parsePrice(discountInput.value);
    return discount > 0 && discount < price;
  }

  function flashDiscountError() {
    if (!discountInput) return;
    discountInput.classList.remove('is-error');
    void discountInput.offsetWidth;
    discountInput.classList.add('is-error');
  }

  function checkDiscount() {
    if (!discountInput) return true;
    var valid = isDiscountValid();
    discountInput.classList.toggle('is-error', !valid);
    return valid;
  }

  /* ─── Валидация «добавить» (только режим создания) ────────────────────── */

  function checkValidity() {
    if (isEditMode) return;
    var ok = descrInput    && descrInput.value.trim()    !== '' &&
             sizeInput     && sizeInput.value.trim()     !== '' &&
             nameInput     && nameInput.value.trim()     !== '' &&
             priceInput    && priceInput.value.trim()    !== '' &&
             variants.length > 0 &&
             categories    && categories.querySelector('.is-selected') !== null &&
             isDiscountValid();
    if (addBtn) {
      addBtn.disabled = !ok;
      addBtn.classList.toggle('is-active', !!ok);
    }
  }

  /* price/discount сразу пишут в активный вариант */
  if (priceInput) {
    priceInput.addEventListener('focus', function () { this.classList.remove('is-error'); });
    priceInput.addEventListener('input', function () {
      if (variants[activeVariantIdx]) variants[activeVariantIdx].price = this.value.trim();
      checkDiscount(); checkValidity(); markChanged();
    });
  }

  if (discountInput) {
    discountInput.addEventListener('input', function () {
      if (variants[activeVariantIdx]) variants[activeVariantIdx].discount = this.value.trim();
      checkDiscount(); checkValidity(); markChanged();
    });
  }

  [descrInput, sizeInput, nameInput, shortDescrInput].forEach(function (el) {
    if (!el) return;
    el.addEventListener('focus', function () { this.classList.remove('is-error'); });
    el.addEventListener('input', function () { checkValidity(); markChanged(); });
  });

  /* ─── Категории ────────────────────────────────────────────────────────── */

  function renderCategories(preselectName) {
    if (!categories) return;
    categories.innerHTML = '';
    loadFilters().forEach(function (name) {
      var li = document.createElement('li');
      li.className  = 'pc-categories__item';
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

  /* ─── Рендер списка вариантов ──────────────────────────────────────────── */

  function renderVariantsList() {
    if (!colorsList) return;
    colorsList.innerHTML = '';
    variants.forEach(function (_, idx) {
      colorsList.appendChild(makeVariantLi(idx));
    });
  }

  /* ─── Сбор данных формы ─────────────────────────────────────────────────── */

  function collectFormData(id) {
    flushActiveFields();
    return {
      id:          id,
      name:        nameInput        ? nameInput.value.trim()        : '',
      description: descrInput       ? descrInput.value.trim()       : '',
      size:        sizeInput        ? sizeInput.value.trim()        : '',
      shortDescr:  shortDescrInput  ? shortDescrInput.value.trim()  : '',
      categories:  Array.from(categories ? categories.querySelectorAll('.is-selected') : [])
                     .map(function (el) { return el.textContent; }),
      variants:    variants.map(function (v) {
                     return {
                       color:    v.color    || '',
                       price:    v.price    || '',
                       discount: v.discount || '',
                       photos:   v.photos.slice()
                     };
                   })
    };
  }

  /* ─── Кнопка «добавить» (только создание) ─────────────────────────────── */

  if (addBtn && !isEditMode) {
    addBtn.addEventListener('click', async function () {
      if (!this.classList.contains('is-active')) return;
      if (!checkDiscount()) { flashDiscountError(); return; }
      var product  = collectFormData(Date.now());
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
      if (!checkDiscount()) { flashDiscountError(); return; }
      var products = loadProducts();
      for (var j = 0; j < products.length; j++) {
        if (products[j].id === editId) {
          products[j] = collectFormData(editId);
          break;
        }
      }
      saveProducts(products);
      if (window.IrbagsDB) await window.IrbagsDB.saveProducts(products);
      if (window.history.length > 1) history.back();
      else window.location.href = 'products.html';
    });
  }

  /* ─── Поп-ап удаления ──────────────────────────────────────────────────── */

  function showPopup() { popup.classList.add('is-open'); popup.setAttribute('aria-hidden', 'false'); }
  function hidePopup()  { popup.classList.remove('is-open'); popup.setAttribute('aria-hidden', 'true'); }

  if (deleteBtn)    deleteBtn.addEventListener('click', showPopup);
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

  /* ─── Конвертация старого формата в варианты ───────────────────────────── */

  function legacyToVariants(product) {
    var colors = product.colors && product.colors.length ? product.colors : [''];
    return colors.map(function (color) {
      return {
        color:    color,
        price:    product.price    || '',
        discount: product.discount || '',
        photos:   (product.photos  || [null, null, null, null, null, null]).slice()
      };
    });
  }

  /* ─── Инициализация ────────────────────────────────────────────────────── */

  if (isEditMode) {
    document.body.classList.add('is-edit-mode');

    var allProducts = loadProducts();
    var editProduct = null;
    for (var k = 0; k < allProducts.length; k++) {
      if (allProducts[k].id === editId) { editProduct = allProducts[k]; break; }
    }

    if (editProduct) {
      if (descrInput)      { descrInput.value = editProduct.description || ''; autoResize(descrInput); }
      if (sizeInput)       sizeInput.value    = editProduct.size         || '';
      if (nameInput)       nameInput.value    = editProduct.name         || '';
      if (shortDescrInput) { shortDescrInput.value = editProduct.shortDescr || ''; autoResize(shortDescrInput); }

      variants = (editProduct.variants && editProduct.variants.length > 0)
        ? editProduct.variants.map(function (v) {
            return {
              color:    v.color    || '',
              price:    v.price    || '',
              discount: v.discount || '',
              photos:   (v.photos  || [null, null, null, null, null, null]).slice()
            };
          })
        : legacyToVariants(editProduct);

      activeVariantIdx = 0;
      renderVariantsList();
      applyVariant(0);

      var preselect = (editProduct.categories && editProduct.categories[0]) || null;
      renderCategories(preselect);
    } else {
      variants = [newVariant('')];
      renderVariantsList();
      renderCategories(null);
    }

  } else {
    /* режим создания — один пустой вариант автоматически */
    variants         = [newVariant('')];
    activeVariantIdx = 0;
    renderVariantsList();
    renderCategories(null);
    checkValidity();
  }

})();
