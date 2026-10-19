// Товар: создание и редактирование (?id=ID — редактирование).
// variants: [{ color, price, discount, stock, photos: [6] }]; stock уходит в лист «Остатки».

(function () {

  var MAX_PHOTOS = 6;

  var editId     = new URLSearchParams(window.location.search).get('id');
  var isEditMode = editId !== null;

  var nameInput       = document.getElementById('pcName');
  var categoriesEl    = document.getElementById('pcCategories');
  var shortDescrInput = document.getElementById('pcShortDescr');
  var shortHint       = document.getElementById('pcShortHint');
  var descrInput      = document.getElementById('pcDescr');
  var sizeInput       = document.getElementById('pcSize');
  var colorsEl        = document.getElementById('pcColors');
  var removeColorBtn  = document.getElementById('pcRemoveColor');
  var photosEl        = document.getElementById('pcPhotos');
  var colorInput      = document.getElementById('pcColor');
  var priceInput      = document.getElementById('pcPrice');
  var discountInput   = document.getElementById('pcDiscount');
  var discountInfo    = document.getElementById('pcDiscountInfo');
  var stockInput      = document.getElementById('pcStock');
  var stockMinus      = document.getElementById('pcStockMinus');
  var stockPlus       = document.getElementById('pcStockPlus');
  var totalEl         = document.getElementById('pcTotal');

  var variants = [newVariant()];
  var active   = 0;
  var category = null;
  var dirty    = false;
  var saving   = false;

  // Шапка

  var saveBtn = Admin.pill(isEditMode ? 'сохранить' : 'добавить товар', { className: 'a-pill--dark', onClick: save });
  var right = [];
  if (isEditMode) right.push(Admin.pill('удалить', { onClick: removeProduct }));
  right.push(saveBtn);

  Admin.renderHeader(null, { left: [Admin.pill('назад', { onClick: goBack })], right: right, exit: false });

  var title = Admin.el('span', 'a-editor__title', isEditMode ? 'редактирование товара' : 'новый товар');
  document.body.appendChild(title);

  function goBack() {
    if (document.referrer && document.referrer.indexOf(location.host) !== -1 && history.length > 1) history.back();
    else window.location.href = 'products.html';
  }

  function markDirty() { dirty = true; }

  window.addEventListener('beforeunload', function (e) {
    if (dirty && !saving) { e.preventDefault(); e.returnValue = ''; }
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });

  // Основное

  [nameInput, descrInput, sizeInput].forEach(function (el) {
    el.addEventListener('input', function () { this.classList.remove('is-error'); markDirty(); });
  });

  function updateShortHint() {
    var lines = shortDescrInput.value ? shortDescrInput.value.split('\n').length : 0;
    shortHint.textContent = lines + ' / 4 строки';
  }

  shortDescrInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && this.value.split('\n').length >= 4) e.preventDefault();
  });
  shortDescrInput.addEventListener('input', function () {
    var lines = this.value.split('\n');
    if (lines.length > 4) this.value = lines.slice(0, 4).join('\n');
    updateShortHint();
    markDirty();
  });

  function renderCategories() {
    categoriesEl.innerHTML = '';
    Admin.loadFilters().forEach(function (name) {
      categoriesEl.appendChild(Admin.pill(name, {
        className: name === category ? 'is-active' : '',
        onClick: function () {
          category = category === name ? null : name;
          categoriesEl.classList.remove('is-error');
          renderCategories();
          markDirty();
        }
      }));
    });
  }

  // Цвета

  function newVariant() {
    return { color: '', price: '', discount: '', stock: 0, photos: [null, null, null, null, null, null] };
  }

  function renderColors() {
    colorsEl.innerHTML = '';
    variants.forEach(function (v, i) {
      colorsEl.appendChild(Admin.pill((v.color || 'без названия') + ' · ' + v.stock + ' шт', {
        className: i === active ? 'is-active' : '',
        onClick: function () { switchTo(i); }
      }));
    });
    colorsEl.appendChild(Admin.pill('добавить цвет', {
      icon: 'plus',
      className: 'a-pill--dark',
      onClick: function () {
        var base = variants[active];
        var v = newVariant();
        v.price = base.price;
        v.discount = base.discount;
        variants.push(v);
        switchTo(variants.length - 1);
        colorInput.focus();
        markDirty();
      }
    }));
    removeColorBtn.hidden = variants.length < 2;
    renderTotal();
  }

  removeColorBtn.addEventListener('click', function () {
    Admin.confirm('удалить цвет «' + (variants[active].color || 'без названия') + '»?').then(function (ok) {
      if (!ok) return;
      variants.splice(active, 1);
      switchTo(Math.max(0, active - 1));
      markDirty();
    });
  });

  function switchTo(i) {
    active = i;
    var v = variants[i];
    colorInput.value    = v.color;
    priceInput.value    = v.price;
    discountInput.value = v.discount;
    stockInput.value    = v.stock;
    [colorInput, priceInput, discountInput].forEach(function (el) { el.classList.remove('is-error'); });
    renderColors();
    renderPhotos();
    renderDiscount();
  }

  colorInput.addEventListener('input', function () {
    variants[active].color = this.value.trim().toLowerCase();
    this.classList.remove('is-error');
    renderColors();
    markDirty();
  });

  // Цена и скидка

  function onlyDigits(el) {
    var clean = el.value.replace(/[^0-9]/g, '');
    if (clean !== el.value) el.value = clean;
    return clean;
  }

  priceInput.addEventListener('input', function () {
    variants[active].price = onlyDigits(this);
    this.classList.remove('is-error');
    renderDiscount();
    markDirty();
  });

  discountInput.addEventListener('input', function () {
    variants[active].discount = onlyDigits(this);
    renderDiscount();
    markDirty();
  });

  function discountValid(v) {
    if (!v.discount) return true;
    var d = Admin.parsePrice(v.discount);
    return d > 0 && d < Admin.parsePrice(v.price);
  }

  function renderDiscount() {
    var v = variants[active];
    var ok = discountValid(v);
    discountInput.classList.toggle('is-error', !ok);
    discountInfo.innerHTML = '';
    if (!v.discount) return;
    if (!ok) {
      discountInfo.textContent = 'цена со скидкой должна быть меньше обычной';
      return;
    }
    var price = Admin.parsePrice(v.price);
    var percent = Math.round((1 - Admin.parsePrice(v.discount) / price) * 100);
    discountInfo.appendChild(Admin.el('b', null, '−' + percent + '%'));
    discountInfo.appendChild(document.createTextNode(' покупатель увидит ' + v.discount + ' руб вместо ' + v.price + ' руб'));
  }

  // Количество

  function setStock(n) {
    variants[active].stock = Math.max(0, n);
    stockInput.value = variants[active].stock;
    renderColors();
    markDirty();
  }

  stockInput.addEventListener('input', function () {
    variants[active].stock = Admin.parseStock(this.value);
    renderColors();
    markDirty();
  });
  stockInput.addEventListener('blur', function () { this.value = variants[active].stock; });
  stockMinus.addEventListener('click', function () { setStock(variants[active].stock - 1); });
  stockPlus.addEventListener('click',  function () { setStock(variants[active].stock + 1); });

  function renderTotal() {
    var total = variants.reduce(function (sum, v) { return sum + v.stock; }, 0);
    totalEl.innerHTML = '';
    totalEl.appendChild(document.createTextNode('всего в наличии: '));
    totalEl.appendChild(Admin.el('b', null, total + ' шт'));
    if (variants.length > 1) totalEl.appendChild(document.createTextNode(' по ' + variants.length + ' ' + Admin.plural(variants.length, 'цвету', 'цветам', 'цветам')));
    totalEl.appendChild(document.createTextNode(' · после сохранения обновится таблица остатков'));
  }

  // Фото

  var fileInput = Admin.el('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  fileInput.hidden = true;
  document.body.appendChild(fileInput);

  var pickFrom = 0;
  fileInput.addEventListener('change', function () {
    addFiles(Array.from(this.files), pickFrom);
    this.value = '';
  });

  // Файлы заполняют свободные ячейки начиная с указанной; занятая стартовая ячейка заменяется
  function addFiles(files, start) {
    files = files.filter(function (f) { return f.type.indexOf('image/') === 0; });
    if (!files.length) return;
    var photos = variants[active].photos;
    var targets = [];
    if (photos[start]) targets.push(start);
    for (var i = 0; i < MAX_PHOTOS && targets.length < files.length; i++) {
      var idx = (start + i) % MAX_PHOTOS;
      if (!photos[idx] && targets.indexOf(idx) === -1) targets.push(idx);
    }
    if (targets.length < files.length) Admin.toast('поместилось ' + targets.length + ' из ' + files.length + ' фото');

    var owner = variants[active];
    Promise.all(targets.map(function (slot, n) {
      return Admin.compress(files[n], 800, 900, 0.6).then(function (data) { owner.photos[slot] = data; });
    })).then(function () {
      if (variants[active] === owner) renderPhotos();
      markDirty();
    }, function () {
      Admin.toast('не удалось открыть фото', true);
    });
  }

  var dragFrom = null;

  function renderPhotos() {
    photosEl.innerHTML = '';
    variants[active].photos.forEach(function (src, slot) {
      var el = Admin.el('div', 'a-slot');

      if (src) {
        el.classList.add('has-image');
        el.draggable = true;
        var img = Admin.el('img', 'a-slot__img');
        img.src = src;
        img.alt = '';
        img.draggable = false;
        el.appendChild(img);
        if (slot === 0) el.appendChild(Admin.el('span', 'a-slot__badge', 'обложка'));
        var remove = Admin.pill('×', {
          className: 'a-slot__remove',
          onClick: function (e) {
            e.stopPropagation();
            variants[active].photos[slot] = null;
            renderPhotos();
            markDirty();
          }
        });
        remove.setAttribute('aria-label', 'убрать фото');
        el.appendChild(remove);
      } else {
        var empty = Admin.el('div', 'a-slot__empty');
        var plus = Admin.el('span', 'a-slot__plus');
        plus.appendChild(Admin.icon('plus'));
        empty.appendChild(plus);
        empty.appendChild(Admin.el('span', null, slot === 0 ? 'обложка' : 'фото ' + (slot + 1)));
        el.appendChild(empty);
      }

      el.addEventListener('click', function () {
        pickFrom = slot;
        fileInput.click();
      });

      el.addEventListener('dragstart', function (e) {
        dragFrom = slot;
        el.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', function () {
        dragFrom = null;
        el.classList.remove('is-dragging');
      });
      el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('is-dragover'); });
      el.addEventListener('dragleave', function () { el.classList.remove('is-dragover'); });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        el.classList.remove('is-dragover');
        if (dragFrom !== null) {
          moveTo(dragFrom, slot);
          return;
        }
        addFiles(Array.from(e.dataTransfer.files || []), slot);
      });

      photosEl.appendChild(el);
    });
  }

  // Перестановка: фото встаёт на место slot, остальные сдвигаются, пустые остаются в конце
  function moveTo(from, to) {
    if (from === to) return;
    var filled = variants[active].photos.filter(Boolean);
    var moving = variants[active].photos[from];
    var list = filled.filter(function (p) { return p !== moving; });
    var position = Math.min(to, list.length);
    list.splice(position, 0, moving);
    while (list.length < MAX_PHOTOS) list.push(null);
    variants[active].photos = list;
    renderPhotos();
    markDirty();
  }

  // Сохранение

  function validate() {
    var missing = [];

    if (!nameInput.value.trim()) { nameInput.classList.add('is-error'); missing.push('название'); }
    if (!category) { categoriesEl.classList.add('is-error'); missing.push('категорию'); }
    if (!descrInput.value.trim()) { descrInput.classList.add('is-error'); missing.push('описание'); }
    if (!sizeInput.value.trim()) { sizeInput.classList.add('is-error'); missing.push('размер'); }

    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      var noColor = variants.length > 1 && !v.color;
      if (!v.price || noColor || !discountValid(v)) {
        switchTo(i);
        if (!v.price) { priceInput.classList.add('is-error'); missing.push('цену'); }
        if (noColor) { colorInput.classList.add('is-error'); missing.push('название цвета'); }
        if (!discountValid(v)) missing.push('корректную скидку');
        break;
      }
    }

    if (missing.length) {
      Admin.toast('заполните: ' + missing.join(', '), true);
      return false;
    }
    return true;
  }

  function collect(id) {
    return {
      id:          id,
      name:        nameInput.value.trim(),
      description: descrInput.value.trim(),
      size:        sizeInput.value.trim(),
      shortDescr:  shortDescrInput.value.trim(),
      categories:  category ? [category] : [],
      variants:    variants.map(function (v) {
        return { color: v.color, price: v.price, discount: v.discount, stock: v.stock, photos: v.photos.slice() };
      })
    };
  }

  function save() {
    if (saving || !validate()) return;
    saving = true;
    saveBtn.classList.add('is-disabled');

    // id — число (Date.now): сайт читает его через parseInt
    var id = isEditMode ? (Admin.findProduct(editId) || { id: editId }).id : Date.now();

    Admin.saveProduct(collect(id)).then(function () {
      dirty = false;
      window.location.href = 'products.html';
    }, function () {
      saving = false;
      saveBtn.classList.remove('is-disabled');
      Admin.toast('не удалось сохранить, попробуйте уменьшить фото', true);
    });
  }

  function removeProduct() {
    Admin.confirm('удалить товар?').then(function (ok) {
      if (!ok) return;
      saving = true;
      Admin.deleteProducts([editId]).then(function () {
        window.location.href = 'products.html';
      }, function () {
        saving = false;
        Admin.toast('не удалось удалить', true);
      });
    });
  }

  // Загрузка

  function load() {
    var product = isEditMode ? Admin.findProduct(editId) : null;
    if (isEditMode && !product) Admin.toast('товар не найден', true);

    if (product) {
      nameInput.value       = product.name        || '';
      shortDescrInput.value = product.shortDescr  || '';
      descrInput.value      = product.description || '';
      sizeInput.value       = product.size        || '';
      category = (product.categories && product.categories[0]) || null;
      variants = Admin.getVariants(product);
    }

    renderCategories();
    updateShortHint();
    switchTo(0);
    dirty = false;
  }

  // Сразу из кэша, затем из Firestore — если пользователь ещё ничего не менял
  load();
  Admin.db().then(function () { if (!dirty) load(); });

})();
