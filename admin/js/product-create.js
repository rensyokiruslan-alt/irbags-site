// Товар: создание и редактирование (?id=ID — редактирование).
// variants: [{ color, hex, price, discount, stock, photos: [6] }]; stock уходит в лист «Остатки».

(function () {

  var MAX_PHOTOS = 6;

  var PALETTE = [
    { name: 'чёрный',     hex: '#141414' },
    { name: 'молочный',   hex: '#ebe5da' },
    { name: 'бежевый',    hex: '#cdb79a' },
    { name: 'коричневый', hex: '#6b4a35' },
    { name: 'бордовый',   hex: '#6e1f2a' },
    { name: 'оливковый',  hex: '#6b6b45' },
    { name: 'синий',      hex: '#24345c' },
    { name: 'серый',      hex: '#9a9a9a' }
  ];

  var SVG_PLUS = '<svg class="pe-svg" width="%s" height="%s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  var SVG_X = '<svg class="pe-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function plusIcon(size) { return SVG_PLUS.replace('%s', size).replace('%s', size); }

  var editId     = new URLSearchParams(window.location.search).get('id');
  var isEditMode = editId !== null;

  var $ = function (id) { return document.getElementById(id); };

  var coverEl         = $('pcCover');
  var thumbsEl        = $('pcThumbs');
  var nameInput       = $('pcName');
  var shortDescrInput = $('pcShortDescr');
  var priceInput      = $('pcPrice');
  var discountInput   = $('pcDiscount');
  var pctEl           = $('pcPct');
  var discountError   = $('pcDiscountError');
  var stockInput      = $('pcStock');
  var stockLabel      = $('pcStockLabel');
  var categoryField   = $('pcCategoryField');
  var categoriesEl    = $('pcCategories');
  var colorsEl        = $('pcColors');
  var pickerEl        = $('pcPicker');
  var descrInput      = $('pcDescr');
  var sizeInput       = $('pcSize');

  var variants = [newVariant()];
  var active   = 0;
  var category = null;
  var dirty    = false;
  var saving   = false;

  // Высота экрана в координатах макета (страница масштабируется через zoom)

  function fitHeight() {
    var zoom = parseFloat(document.documentElement.style.zoom) || 1;
    document.documentElement.style.setProperty('--app-h', Math.round(window.innerHeight / zoom) + 'px');
  }
  fitHeight();
  window.addEventListener('resize', fitHeight, { passive: true });

  // Шапка

  var saveBtn   = Admin.pill(isEditMode ? 'сохранить' : 'опубликовать', { className: 'a-pill--dark', onClick: save });
  var deleteBtn = Admin.pill('удалить');
  var previewBtn = Admin.pill('предпросмотр', { onClick: preview });
  var right = isEditMode ? [deleteBtn, previewBtn, saveBtn] : [previewBtn, saveBtn];

  Admin.renderHeader(null, { left: [Admin.pill('отмена', { onClick: goBack })], right: right, exit: false });

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
    if (e.key === 'Escape') closePicker();
  });

  function fieldOf(el) { return el.closest('.pe-field'); }
  function setError(el, on) { var f = fieldOf(el); if (f) f.classList.toggle('is-error', on); }

  // Текстовые поля

  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  [nameInput, descrInput, sizeInput].forEach(function (el) {
    el.addEventListener('input', function () { setError(this, false); markDirty(); });
  });

  shortDescrInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && this.value.split('\n').length >= 4) e.preventDefault();
  });
  shortDescrInput.addEventListener('input', function () {
    var lines = this.value.split('\n');
    if (lines.length > 4) this.value = lines.slice(0, 4).join('\n');
    autoGrow(this);
    markDirty();
  });

  // Категория

  function renderCategories() {
    categoriesEl.innerHTML = '';
    Admin.loadFilters().forEach(function (name) {
      var b = Admin.el('button', 'pe-chip' + (name === category ? ' is-active' : ''), name);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', name === category ? 'true' : 'false');
      b.addEventListener('click', function () {
        category = name;
        categoryField.classList.remove('is-error');
        renderCategories();
        markDirty();
      });
      categoriesEl.appendChild(b);
    });
  }

  // Цвета: каждый цвет — отдельный вариант со своими фото, ценой и количеством

  function newVariant(color, hex) {
    return { color: color || '', hex: hex || '', price: '', discount: '', stock: 0, photos: [null, null, null, null, null, null] };
  }

  function hexFor(v) {
    if (v.hex) return v.hex;
    for (var i = 0; i < PALETTE.length; i++) if (PALETTE[i].name === v.color) return PALETTE[i].hex;
    return '#d4d4d4';
  }

  function hasColors() { return variants.some(function (v) { return !!v.color; }); }

  function indexOfColor(name) {
    for (var i = 0; i < variants.length; i++) if (variants[i].color === name) return i;
    return -1;
  }

  function addColor(name, hex) {
    name = name.trim().toLowerCase();
    if (!name) return;
    var existing = indexOfColor(name);
    if (existing !== -1) { switchTo(existing); return; }

    if (!hasColors()) {
      variants[0].color = name;
      variants[0].hex = hex || '';
      switchTo(0);
    } else {
      var base = variants[active];
      var v = newVariant(name, hex);
      v.price = base.price;
      v.discount = base.discount;
      variants.push(v);
      switchTo(variants.length - 1);
    }
    markDirty();
  }

  function removeColor(i) {
    var v = variants[i];
    var hasData = v.photos.some(Boolean) || v.stock > 0;
    var go = hasData ? Admin.confirm('удалить цвет «' + v.color + '» вместе с его фото и количеством?') : Promise.resolve(true);
    go.then(function (ok) {
      if (!ok) return;
      if (variants.length === 1) {
        v.color = '';
        v.hex = '';
      } else {
        variants.splice(i, 1);
      }
      switchTo(Math.min(active, variants.length - 1));
      markDirty();
    });
  }

  function renderColors() {
    colorsEl.innerHTML = '';
    if (hasColors()) {
      variants.forEach(function (v, i) {
        var chip = Admin.el('div', 'pe-chip pe-chip--color' + (i === active ? ' is-active' : ''));
        chip.style.cursor = 'pointer';
        var dot = Admin.el('span', 'pe-chip__dot');
        dot.style.background = hexFor(v);
        chip.appendChild(dot);
        chip.appendChild(Admin.el('span', null, (v.color || 'без названия') + ' · ' + v.stock + ' шт'));
        var x = Admin.el('button', 'pe-chip__x');
        x.type = 'button';
        x.setAttribute('aria-label', 'удалить цвет ' + v.color);
        x.innerHTML = SVG_X;
        x.addEventListener('click', function (e) { e.stopPropagation(); removeColor(i); });
        chip.appendChild(x);
        chip.addEventListener('click', function () { switchTo(i); });
        colorsEl.appendChild(chip);
      });
    }

    var add = Admin.el('button', 'pe-chip pe-chip--add' + (pickerEl.hidden ? '' : ' is-active'));
    add.type = 'button';
    add.setAttribute('aria-expanded', pickerEl.hidden ? 'false' : 'true');
    add.innerHTML = plusIcon(14);
    add.appendChild(document.createTextNode('добавить цвет'));
    add.addEventListener('click', function (e) {
      e.stopPropagation();
      if (pickerEl.hidden) openPicker(); else closePicker();
    });
    colorsEl.appendChild(add);

    stockLabel.textContent = hasColors() && variants[active].color
      ? 'в наличии · ' + variants[active].color
      : 'в наличии';
  }

  function openPicker() {
    pickerEl.hidden = false;
    renderPicker();
    renderColors();
  }

  function closePicker() {
    if (pickerEl.hidden) return;
    pickerEl.hidden = true;
    renderColors();
  }

  document.addEventListener('click', function (e) {
    if (!pickerEl.hidden && !pickerEl.contains(e.target)) closePicker();
  });

  function renderPicker() {
    pickerEl.innerHTML = '';
    PALETTE.forEach(function (c) {
      var added = indexOfColor(c.name) !== -1;
      var b = Admin.el('button', 'pe-chip' + (added ? ' is-active' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', added ? 'true' : 'false');
      var dot = Admin.el('span', 'pe-chip__dot');
      dot.style.background = c.hex;
      b.appendChild(dot);
      b.appendChild(document.createTextNode(c.name));
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = indexOfColor(c.name);
        if (idx !== -1) removeColor(idx); else addColor(c.name, c.hex);
        renderPicker();
      });
      pickerEl.appendChild(b);
    });

    var custom = Admin.el('form', 'pe-picker__custom');
    var input = Admin.el('input', 'pe-input');
    input.placeholder = 'другой цвет';
    input.autocomplete = 'off';
    input.spellcheck = false;
    var ok = Admin.el('button', 'pe-chip', 'добавить');
    ok.type = 'submit';
    custom.appendChild(input);
    custom.appendChild(ok);
    custom.addEventListener('submit', function (e) {
      e.preventDefault();
      addColor(input.value, '');
      closePicker();
    });
    pickerEl.appendChild(custom);
  }

  function switchTo(i) {
    active = i;
    var v = variants[i];
    priceInput.value    = v.price;
    discountInput.value = v.discount;
    stockInput.value    = v.stock;
    setError(priceInput, false);
    renderColors();
    renderPhotos();
    renderDiscount();
  }

  // Цена, скидка, количество

  function onlyDigits(el) {
    var clean = el.value.replace(/[^0-9]/g, '');
    if (clean !== el.value) el.value = clean;
    return clean;
  }

  priceInput.addEventListener('input', function () {
    variants[active].price = onlyDigits(this);
    setError(this, false);
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
    var price = Admin.parsePrice(v.price);
    var showPct = ok && !!v.discount && price > 0;
    pctEl.hidden = !showPct;
    if (showPct) pctEl.textContent = '−' + Math.round((1 - Admin.parsePrice(v.discount) / price) * 100) + '%';
    discountError.hidden = ok;
    setError(discountInput, !ok);
  }

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
  $('pcStockMinus').addEventListener('click', function () { setStock(variants[active].stock - 1); });
  $('pcStockPlus').addEventListener('click',  function () { setStock(variants[active].stock + 1); });

  // Фото: обложка + 5 миниатюр

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

  function pickFiles(from) {
    pickFrom = from;
    fileInput.click();
  }

  function compact(photos) {
    var list = photos.filter(Boolean);
    while (list.length < MAX_PHOTOS) list.push(null);
    return list;
  }

  // Файлы заполняют свободные ячейки начиная с указанной
  function addFiles(files, start) {
    files = files.filter(function (f) { return f.type.indexOf('image/') === 0; });
    if (!files.length) return;
    var owner = variants[active];
    var targets = [];
    for (var i = 0; i < MAX_PHOTOS && targets.length < files.length; i++) {
      var idx = (start + i) % MAX_PHOTOS;
      if (!owner.photos[idx]) targets.push(idx);
    }
    if (!targets.length) { Admin.toast('уже 6 фото — удалите лишнее', true); return; }
    if (targets.length < files.length) Admin.toast('поместилось ' + targets.length + ' из ' + files.length + ' фото');

    Promise.all(targets.map(function (slot, n) {
      return Admin.compress(files[n], 800, 900, 0.6).then(function (data) { owner.photos[slot] = data; });
    })).then(function () {
      owner.photos = compact(owner.photos);
      if (variants[active] === owner) renderPhotos();
      markDirty();
    }, function () {
      Admin.toast('не удалось открыть фото', true);
    });
  }

  function removePhoto(slot) {
    var v = variants[active];
    v.photos[slot] = null;
    v.photos = compact(v.photos);
    renderPhotos();
    markDirty();
  }

  function makeCover(slot) {
    var p = variants[active].photos;
    var tmp = p[0]; p[0] = p[slot]; p[slot] = tmp;
    renderPhotos();
    markDirty();
  }

  // Перетаскивание: фото встаёт на место slot, остальные сдвигаются
  var dragFrom = null;

  function moveTo(from, to) {
    if (from === to) return;
    var v = variants[active];
    var moving = v.photos[from];
    var list = v.photos.filter(function (p) { return p && p !== moving; });
    list.splice(Math.min(to, list.length), 0, moving);
    v.photos = compact(list);
    renderPhotos();
    markDirty();
  }

  function bindDrop(el, slot) {
    el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('is-dragover'); });
    el.addEventListener('dragleave', function () { el.classList.remove('is-dragover'); });
    el.addEventListener('drop', function (e) {
      e.preventDefault();
      el.classList.remove('is-dragover');
      if (dragFrom !== null) { moveTo(dragFrom, slot); return; }
      addFiles(Array.from(e.dataTransfer.files || []), slot);
    });
  }

  function bindDrag(el, slot) {
    el.draggable = true;
    el.addEventListener('dragstart', function (e) {
      dragFrom = slot;
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', function () { dragFrom = null; });
  }

  function smallBtn(text, onClick, cls) {
    var b = Admin.el('button', 'pe-btn' + (cls ? ' ' + cls : ''));
    b.type = 'button';
    if (text) b.textContent = text;
    b.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
    return b;
  }

  function renderPhotos() {
    var photos = variants[active].photos;
    var count = photos.filter(Boolean).length;

    coverEl.innerHTML = '';
    coverEl.classList.toggle('has-image', !!photos[0]);
    if (photos[0]) {
      var img = Admin.el('img');
      img.src = photos[0];
      img.alt = '';
      img.draggable = false;
      coverEl.appendChild(img);
      coverEl.appendChild(Admin.el('span', 'pe-cover__tag', 'обложка'));
      var del = smallBtn('удалить', function () { removePhoto(0); }, 'pe-cover__remove');
      coverEl.appendChild(del);
      bindDrag(coverEl, 0);
    } else {
      coverEl.draggable = false;
      var up = Admin.el('button', 'pe-upload');
      up.type = 'button';
      var circle = Admin.el('span', 'pe-upload__plus');
      circle.innerHTML = plusIcon(24);
      up.appendChild(circle);
      up.appendChild(document.createTextNode('загрузить фото'));
      up.appendChild(Admin.el('span', 'pe-upload__hint', 'jpg или png · можно выбрать сразу несколько'));
      up.addEventListener('click', function () { pickFiles(0); });
      coverEl.appendChild(up);
    }
    var label = count + ' из 6 фото';
    if (variants[active].color) label += ' · ' + variants[active].color;
    coverEl.appendChild(Admin.el('span', 'pe-cover__count', label));
    bindDrop(coverEl, 0);

    thumbsEl.innerHTML = '';
    for (var i = 1; i < MAX_PHOTOS; i++) {
      (function (slot) {
        var t = Admin.el('div', 'pe-thumb');
        if (photos[slot]) {
          t.classList.add('has-image');
          var timg = Admin.el('img');
          timg.src = photos[slot];
          timg.alt = '';
          timg.draggable = false;
          t.appendChild(timg);
          var actions = Admin.el('div', 'pe-thumb__actions');
          actions.appendChild(smallBtn('сделать обложкой', function () { makeCover(slot); }));
          var x = smallBtn('', function () { removePhoto(slot); }, 'pe-btn--icon');
          x.innerHTML = SVG_X;
          x.setAttribute('aria-label', 'удалить фото ' + (slot + 1));
          actions.appendChild(x);
          t.appendChild(actions);
          bindDrag(t, slot);
        } else {
          var add = Admin.el('button', 'pe-thumb__add');
          add.type = 'button';
          add.innerHTML = plusIcon(20);
          add.appendChild(document.createTextNode('добавить фото'));
          add.addEventListener('click', function () { pickFiles(slot); });
          t.appendChild(add);
        }
        bindDrop(t, slot);
        thumbsEl.appendChild(t);
      })(i);
    }
  }

  // Сохранение

  function validate() {
    var missing = [];

    if (!nameInput.value.trim()) { setError(nameInput, true); missing.push('название'); }
    if (!category) { categoryField.classList.add('is-error'); missing.push('категорию'); }
    if (!descrInput.value.trim()) { setError(descrInput, true); missing.push('материалы'); }
    if (!sizeInput.value.trim()) { setError(sizeInput, true); missing.push('размер'); }

    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      if (!v.price || !discountValid(v)) {
        switchTo(i);
        if (!v.price) { setError(priceInput, true); missing.push(v.color ? 'цену для цвета «' + v.color + '»' : 'цену'); }
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
        return {
          color: v.color, hex: v.hex, price: v.price, discount: v.discount,
          stock: v.stock, photos: v.photos.slice()
        };
      })
    };
  }

  // Предпросмотр: черновик открывается на обычной странице товара сайта, без сохранения
  function preview() {
    var id = isEditMode ? (Admin.findProduct(editId) || { id: editId }).id : 0;
    try {
      localStorage.setItem('irbags_preview', JSON.stringify(collect(id)));
    } catch (e) {
      Admin.toast('не хватает места для предпросмотра — уменьшите фото', true);
      return;
    }
    window.open('../site/product.html?id=' + encodeURIComponent(id) + '&preview=1', 'irbags-preview');
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

  deleteBtn.addEventListener('click', function () {
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
  });

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
    autoGrow(shortDescrInput);
    switchTo(0);
    dirty = false;
  }

  // Сразу из кэша, затем из Firestore — если пользователь ещё ничего не менял
  load();
  Admin.db().then(function () { if (!dirty) load(); });

})();
