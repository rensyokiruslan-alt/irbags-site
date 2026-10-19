(function () {

  var editId     = new URLSearchParams(window.location.search).get('id');
  var isEditMode = editId !== null;

  var nameInput       = document.getElementById('pcName');
  var categoriesEl    = document.getElementById('pcCategories');
  var colorsEl        = document.getElementById('pcColors');
  var colorInput      = document.getElementById('pcColor');
  var priceInput      = document.getElementById('pcPrice');
  var discountInput   = document.getElementById('pcDiscount');
  var stockInput      = document.getElementById('pcStock');
  var stockMinus      = document.getElementById('pcStockMinus');
  var stockPlus       = document.getElementById('pcStockPlus');
  var shortDescrInput = document.getElementById('pcShortDescr');
  var descrInput      = document.getElementById('pcDescr');
  var sizeInput       = document.getElementById('pcSize');
  var photosEl        = document.getElementById('pcPhotos');

  var variants  = [];
  var active    = 0;
  var category  = null;
  var dirty     = false;
  var saving    = false;

  // Шапка

  var backBtn = Admin.pill('назад', { onClick: goBack });
  var saveBtn = Admin.pill(isEditMode ? 'сохранить' : 'добавить', { className: 'a-pill--dark', onClick: save });
  var right = [];
  if (isEditMode) right.push(Admin.pill('удалить', { onClick: removeProduct }));
  right.push(saveBtn);

  Admin.renderHeader(null, { left: [backBtn], right: right, exit: false });

  function goBack() {
    if (document.referrer && document.referrer.indexOf(location.host) !== -1 && history.length > 1) history.back();
    else window.location.href = 'products.html';
  }

  function markDirty() { dirty = true; }

  window.addEventListener('beforeunload', function (e) {
    if (dirty && !saving) { e.preventDefault(); e.returnValue = ''; }
  });

  // Текстовые поля

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  [shortDescrInput, descrInput].forEach(function (ta) {
    ta.addEventListener('input', function () { autoResize(this); });
  });

  /* краткое описание — не более 4 строк */
  shortDescrInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && this.value.split('\n').length >= 4) e.preventDefault();
  });
  shortDescrInput.addEventListener('input', function () {
    var lines = this.value.split('\n');
    if (lines.length > 4) this.value = lines.slice(0, 4).join('\n');
  });

  [nameInput, shortDescrInput, descrInput, sizeInput].forEach(function (el) {
    el.addEventListener('input', function () { this.classList.remove('is-error'); markDirty(); });
  });

  // Категории (одна на товар)

  function renderCategories() {
    categoriesEl.innerHTML = '';
    Admin.loadFilters().forEach(function (name) {
      var b = Admin.pill(name, {
        className: name === category ? 'is-active' : '',
        onClick: function () {
          category = category === name ? null : name;
          categoriesEl.classList.remove('is-error');
          renderCategories();
          markDirty();
        }
      });
      categoriesEl.appendChild(b);
    });
  }

  // Цвета (варианты)

  function newVariant() {
    return { color: '', price: '', discount: '', stock: 0, photos: [null, null, null, null, null, null] };
  }

  function renderColors() {
    colorsEl.innerHTML = '';
    variants.forEach(function (v, i) {
      var label = (v.color || 'без названия') + ' · ' + v.stock;
      colorsEl.appendChild(Admin.pill(label, {
        className: i === active ? 'is-active' : '',
        onClick: function () { switchTo(i); }
      }));
    });
    colorsEl.appendChild(Admin.pill('цвет', {
      icon: 'plus',
      className: 'a-pill--dark',
      onClick: function () {
        variants.push(newVariant());
        switchTo(variants.length - 1);
        colorInput.focus();
        markDirty();
      }
    }));
    if (variants.length > 1) {
      colorsEl.appendChild(Admin.pill('удалить цвет', {
        onClick: function () {
          var name = variants[active].color || 'без названия';
          Admin.confirm('удалить цвет «' + name + '»?').then(function (ok) {
            if (!ok) return;
            variants.splice(active, 1);
            switchTo(Math.max(0, active - 1));
            markDirty();
          });
        }
      }));
    }
  }

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
  }

  colorInput.addEventListener('input', function () {
    variants[active].color = this.value.trim().toLowerCase();
    this.classList.remove('is-error');
    renderColors();
    markDirty();
  });

  priceInput.addEventListener('input', function () {
    variants[active].price = this.value.trim();
    this.classList.remove('is-error');
    checkDiscount();
    markDirty();
  });

  discountInput.addEventListener('input', function () {
    variants[active].discount = this.value.trim();
    checkDiscount();
    markDirty();
  });

  /* скидка — цена со скидкой, должна быть меньше обычной */
  function discountValid(v) {
    if (!v.discount) return true;
    var d = Admin.parsePrice(v.discount);
    return d > 0 && d < Admin.parsePrice(v.price);
  }

  function checkDiscount() {
    discountInput.classList.toggle('is-error', !discountValid(variants[active]));
  }

  // Количество

  function setStock(n) {
    n = Math.max(0, n);
    variants[active].stock = n;
    stockInput.value = n;
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

  // Фото активного цвета

  function setPhoto(slot, src) {
    variants[active].photos[slot] = src;
    renderPhotos();
    markDirty();
  }

  function renderPhotos() {
    photosEl.innerHTML = '';
    variants[active].photos.forEach(function (src, slot) {
      var el = Admin.el('div', 'a-slot');

      if (src) {
        var img = Admin.el('img', 'a-slot__img');
        img.src = src;
        img.alt = '';
        el.appendChild(img);
        var remove = Admin.pill('убрать', {
          className: 'a-pill--glass a-slot__remove',
          onClick: function (e) { e.stopPropagation(); setPhoto(slot, null); }
        });
        el.appendChild(remove);
      } else {
        var icon = Admin.el('img', 'a-card__icon');
        icon.src = 'img/mountain.svg';
        icon.alt = '';
        el.appendChild(icon);
      }
      el.appendChild(Admin.el('span', 'a-slot__num', slot === 0 ? 'обложка' : String(slot + 1)));

      el.addEventListener('click', function () {
        Admin.pickPhoto(800, 900, 0.6).then(function (data) { setPhoto(slot, data); });
      });

      /* перетаскивание файла прямо на слот */
      el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('is-dragover'); });
      el.addEventListener('dragleave', function () { el.classList.remove('is-dragover'); });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        el.classList.remove('is-dragover');
        var file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file || file.type.indexOf('image/') !== 0) return;
        Admin.compress(file, 800, 900, 0.6).then(function (data) { setPhoto(slot, data); });
      });

      photosEl.appendChild(el);
    });
  }

  // Проверка и сохранение

  function validate() {
    var errors = [];

    if (!nameInput.value.trim()) { nameInput.classList.add('is-error'); errors.push('название'); }
    if (!category) errors.push('категорию');
    if (!descrInput.value.trim()) { descrInput.classList.add('is-error'); errors.push('описание'); }
    if (!sizeInput.value.trim()) { sizeInput.classList.add('is-error'); errors.push('размер'); }

    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      var bad = !v.price || (variants.length > 1 && !v.color) || !discountValid(v);
      if (bad) {
        switchTo(i);
        if (!v.price) { priceInput.classList.add('is-error'); errors.push('цену'); }
        if (variants.length > 1 && !v.color) { colorInput.classList.add('is-error'); errors.push('название цвета'); }
        if (!discountValid(v)) { discountInput.classList.add('is-error'); errors.push('скидка должна быть меньше цены'); }
        break;
      }
    }

    if (errors.length) {
      Admin.toast('заполните: ' + errors.join(', '), true);
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
          color:    v.color,
          price:    v.price,
          discount: v.discount,
          stock:    v.stock,
          photos:   v.photos.slice()
        };
      })
    };
  }

  function save() {
    if (saving || !validate()) return;
    saving = true;
    saveBtn.classList.add('is-disabled');

    /* id — число (Date.now), как и раньше: сайт читает его через parseInt */
    var id = isEditMode ? (Admin.findProduct(editId) || { id: editId }).id : Date.now();

    Admin.saveProduct(collect(id)).then(function () {
      dirty = false;
      window.location.href = 'products.html';
    }, function () {
      saving = false;
      saveBtn.classList.remove('is-disabled');
      Admin.toast('не удалось сохранить — фото слишком большие?', true);
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

  // Инициализация

  function load() {
    var product = isEditMode ? Admin.findProduct(editId) : null;

    if (isEditMode && !product) {
      Admin.toast('товар не найден', true);
    }

    if (product) {
      nameInput.value       = product.name        || '';
      shortDescrInput.value = product.shortDescr  || '';
      descrInput.value      = product.description || '';
      sizeInput.value       = product.size        || '';
      category  = (product.categories && product.categories[0]) || null;
      variants  = Admin.getVariants(product);
    } else {
      variants = [newVariant()];
    }

    renderCategories();
    switchTo(0);
    autoResize(shortDescrInput);
    autoResize(descrInput);
    dirty = false;
  }

  /* ждём свежие данные из Firestore, чтобы не редактировать устаревшую копию */
  Admin.db().then(load);

})();
