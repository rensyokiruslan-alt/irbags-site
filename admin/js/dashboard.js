/* ==========================================================================
   admin dashboard
   Данные: localStorage['irbags_dashboard'] = { grid1: [id|null,…], grid2: [id|null,…] }
           localStorage['irbags_dashboard_photos'] = { hero, photoLeft, … }
   ========================================================================== */

(function () {

  var DASHBOARD_KEY = 'irbags_dashboard';
  var PRODUCTS_KEY  = 'irbags_products';
  var PHOTOS_KEY    = 'irbags_dashboard_photos';

  var body         = document.body;
  var header       = document.getElementById('admHeader');
  var deleteBtn    = document.getElementById('admDeleteBtn');
  var grid1        = document.getElementById('admGrid1');
  var grid2        = document.getElementById('admGrid2');
  var popup        = document.getElementById('admPopup');
  var popupOverlay = document.getElementById('admPopupOverlay');
  var popupConfirm = document.getElementById('admPopupConfirm');

  /* Set of keys «gridKey:slotIndex» для выбранных слотов */
  var selectedSlots = new Set();

  /* ─── Хранилище ────────────────────────────────────────────────────────── */

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

  function loadProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); } catch (e) { return []; }
  }

  /* ─── Создание карточек ────────────────────────────────────────────────── */

  function createFilledCard(product, gridKey, slotIndex) {
    var item = document.createElement('div');
    item.className = 'adm-item';
    item.dataset.grid = gridKey;
    item.dataset.slot = slotIndex;

    var img = document.createElement('div');
    img.className = 'adm-item__img';
    var firstPhoto = product.photos && product.photos[0];
    if (firstPhoto) {
      var photoImg = document.createElement('img');
      photoImg.src = firstPhoto;
      photoImg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;';
      img.appendChild(photoImg);
    } else {
      var icon = document.createElement('img');
      icon.className = 'adm-icon';
      icon.src = 'img/mountain.svg';
      icon.alt = '';
      img.appendChild(icon);
    }
    item.appendChild(img);

    var overlay = document.createElement('div');
    overlay.className = 'adm-item__overlay';
    item.appendChild(overlay);

    var tag = document.createElement('span');
    tag.className = 'adm-item__tag';
    tag.textContent = 'выбрано';
    item.appendChild(tag);

    var hint = document.createElement('a');
    hint.className = 'adm-item__hint';
    hint.href = 'product-select.html?grid=' + gridKey + '&slot=' + slotIndex;
    hint.textContent = 'заменить';
    item.appendChild(hint);

    var label = document.createElement('div');
    label.className = 'adm-item__label';

    var name = document.createElement('span');
    name.className = 'adm-item__name';
    name.textContent = product.name || 'название';
    label.appendChild(name);

    var price = document.createElement('span');
    price.className = 'adm-item__price';
    price.textContent = product.price || '';
    label.appendChild(price);

    item.appendChild(label);
    return item;
  }

  function createEmptyCard(gridKey, slotIndex) {
    var item = document.createElement('a');
    item.className = 'adm-item adm-item--add';
    item.href = 'product-select.html?grid=' + gridKey + '&slot=' + slotIndex;

    var img = document.createElement('div');
    img.className = 'adm-item__img adm-item__img--add';
    item.appendChild(img);

    var text = document.createElement('span');
    text.className = 'adm-item__add-text';
    text.textContent = 'добавить товар';
    item.appendChild(text);

    return item;
  }

  /* ─── Рендер сетки ─────────────────────────────────────────────────────── */

  function renderGrid(gridEl, gridKey, slots, productMap) {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    slots.forEach(function (id, i) {
      var card;
      if (id !== null && productMap[id]) {
        card = createFilledCard(productMap[id], gridKey, i);
      } else {
        card = createEmptyCard(gridKey, i);
      }
      gridEl.appendChild(card);
    });
  }

  function renderAll() {
    var data = loadDashboard();
    var products = loadProducts();
    var productMap = {};
    products.forEach(function (p) { productMap[p.id] = p; });
    renderGrid(grid1, 'grid1', data.grid1, productMap);
    renderGrid(grid2, 'grid2', data.grid2, productMap);
  }

  renderAll();

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

  /* ─── Клик по сетке — выбор в режиме удаления ─────────────────────────── */

  [grid1, grid2].forEach(function (gridEl) {
    if (!gridEl) return;
    gridEl.addEventListener('click', function (e) {
      if (!body.classList.contains('is-delete-mode')) return;
      var item = e.target.closest('.adm-item');
      if (!item || item.classList.contains('adm-item--add')) return;
      e.preventDefault();

      var key = item.dataset.grid + ':' + item.dataset.slot;
      if (selectedSlots.has(key)) {
        item.classList.remove('is-selected');
        selectedSlots.delete(key);
      } else {
        item.classList.add('is-selected');
        selectedSlots.add(key);
      }
      body.classList.toggle('has-selection', selectedSlots.size > 0);
    });
  });

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

  if (popupConfirm) {
    popupConfirm.addEventListener('click', function () {
      var data = loadDashboard();
      selectedSlots.forEach(function (key) {
        var parts = key.split(':');
        var gridKey   = parts[0];
        var slotIndex = parseInt(parts[1], 10);
        if (data[gridKey]) data[gridKey][slotIndex] = null;
      });
      saveDashboard(data);
      selectedSlots.clear();
      hidePopup();
      exitDeleteMode();
      renderAll();
    });
  }

  /* ─── Выход из режима удаления ─────────────────────────────────────────── */

  function exitDeleteMode() {
    document.querySelectorAll('.adm-item.is-selected').forEach(function (item) {
      item.classList.remove('is-selected');
    });
    selectedSlots.clear();
    body.classList.remove('is-delete-mode', 'has-selection');
  }

  /* ─── Хранилище фотографий ─────────────────────────────────────────────── */

  function loadPhotos() {
    try { return JSON.parse(localStorage.getItem(PHOTOS_KEY) || '{}'); } catch (e) { return {}; }
  }

  function savePhoto(key, data) {
    try {
      var photos = loadPhotos();
      photos[key] = data;
      localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
    } catch (e) {}
  }

  function photoSrc(val) {
    return val && typeof val === 'object' ? val.src : val;
  }

  function photoPos(val) {
    if (!val || typeof val !== 'object') return '50% 50%';
    return (val.x != null ? val.x : 50) + '% ' + (val.y != null ? val.y : 50) + '%';
  }

  /* ─── Редактор позиции фото ─────────────────────────────────────────────── */

  var ed = null;

  function buildEditor() {
    if (ed) return;

    var el = document.createElement('div');
    el.className = 'adm-editor';

    var frame = document.createElement('div');
    frame.className = 'adm-editor__frame';

    var img = document.createElement('img');
    img.className = 'adm-editor__img';
    img.alt = '';
    img.draggable = false;
    frame.appendChild(img);

    var hint = document.createElement('span');
    hint.className = 'adm-editor__hint';
    hint.textContent = 'перетащите фото';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'adm-editor__btn adm-editor__btn--save';
    saveBtn.type = 'button';
    saveBtn.textContent = 'сохранить';

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'adm-editor__btn adm-editor__btn--cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'отменить';

    el.appendChild(frame);
    el.appendChild(hint);
    el.appendChild(saveBtn);
    el.appendChild(cancelBtn);
    document.body.appendChild(el);

    ed = {
      el: el, frame: frame, img: img, hint: hint,
      saveBtn: saveBtn, cancelBtn: cancelBtn,
      section: null, dataUrl: null,
      drag: { on: false, x0: 0, y0: 0, ox: 0, oy: 0 },
      ox: 0, oy: 0
    };

    frame.addEventListener('mousedown',    edDragStart);
    document.addEventListener('mousemove', edDragMove);
    document.addEventListener('mouseup',   edDragEnd);
    frame.addEventListener('touchstart',   edTouchStart, { passive: false });
    document.addEventListener('touchmove', edTouchMove,  { passive: false });
    document.addEventListener('touchend',  edTouchEnd);
    saveBtn.addEventListener('click',      edSave);
    cancelBtn.addEventListener('click',    edClose);
  }

  function edOpen(section, dataUrl) {
    buildEditor();
    ed.section = section;
    ed.dataUrl  = dataUrl;

    var zoom = window.innerWidth / 1920;
    var dh   = window.innerHeight / zoom;
    var pad  = 80;
    var maxW = 1920 - pad * 2;
    var maxH = dh - pad * 2 - 40;

    var ratio = section.w / section.h;
    var fw, fh;
    if (maxW / ratio <= maxH) { fw = maxW; fh = Math.round(fw / ratio); }
    else                      { fh = maxH; fw = Math.round(fh * ratio); }

    var fl = Math.round((1920 - fw) / 2);
    var ft = Math.round(40 + (maxH - fh) / 2);

    ed.frame.style.cssText = 'width:' + fw + 'px;height:' + fh + 'px;left:' + fl + 'px;top:' + ft + 'px;';
    ed.hint.style.top = (ft + fh + 15) + 'px';

    ed.img.onload = function () {
      var nw = ed.img.naturalWidth  || fw;
      var nh = ed.img.naturalHeight || fh;
      var s  = Math.max(fw / nw, fh / nh);
      var iw = Math.round(nw * s);
      var ih = Math.round(nh * s);
      ed.img.style.width  = iw + 'px';
      ed.img.style.height = ih + 'px';
      ed.ox = Math.round((fw - iw) / 2);
      ed.oy = Math.round((fh - ih) / 2);
      edApply();
    };
    ed.img.src = dataUrl;

    ed.el.classList.add('is-open');
  }

  function edApply() {
    var fw = ed.frame.offsetWidth;
    var fh = ed.frame.offsetHeight;
    var iw = parseFloat(ed.img.style.width)  || fw;
    var ih = parseFloat(ed.img.style.height) || fh;
    ed.ox = Math.min(0, Math.max(fw - iw, ed.ox));
    ed.oy = Math.min(0, Math.max(fh - ih, ed.oy));
    ed.img.style.transform = 'translate(' + ed.ox + 'px,' + ed.oy + 'px)';
  }

  function edZ() { return window.innerWidth / 1920; }

  function edDragStart(e) {
    ed.drag.on = true;
    ed.drag.x0 = e.clientX; ed.drag.y0 = e.clientY;
    ed.drag.ox = ed.ox;     ed.drag.oy = ed.oy;
    ed.frame.classList.add('is-dragging');
    e.preventDefault();
  }

  function edDragMove(e) {
    if (!ed || !ed.drag.on) return;
    var z = edZ();
    ed.ox = ed.drag.ox + (e.clientX - ed.drag.x0) / z;
    ed.oy = ed.drag.oy + (e.clientY - ed.drag.y0) / z;
    edApply();
  }

  function edDragEnd() {
    if (!ed) return;
    ed.drag.on = false;
    ed.frame.classList.remove('is-dragging');
  }

  function edTouchStart(e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    ed.drag.on = true;
    ed.drag.x0 = t.clientX; ed.drag.y0 = t.clientY;
    ed.drag.ox = ed.ox;     ed.drag.oy = ed.oy;
    e.preventDefault();
  }

  function edTouchMove(e) {
    if (!ed || !ed.drag.on || e.touches.length !== 1) return;
    var t = e.touches[0];
    var z = edZ();
    ed.ox = ed.drag.ox + (t.clientX - ed.drag.x0) / z;
    ed.oy = ed.drag.oy + (t.clientY - ed.drag.y0) / z;
    edApply();
    e.preventDefault();
  }

  function edTouchEnd() { if (ed) ed.drag.on = false; }

  function edSave() {
    if (!ed || !ed.section) return;
    var fw = ed.frame.offsetWidth;
    var fh = ed.frame.offsetHeight;
    var iw = parseFloat(ed.img.style.width)  || fw;
    var ih = parseFloat(ed.img.style.height) || fh;
    var ew = iw - fw;
    var eh = ih - fh;
    var xp = ew > 0 ? Math.round(-ed.ox / ew * 100) : 50;
    var yp = eh > 0 ? Math.round(-ed.oy / eh * 100) : 50;
    xp = Math.max(0, Math.min(100, xp));
    yp = Math.max(0, Math.min(100, yp));

    var data = { src: ed.dataUrl, x: xp, y: yp };
    savePhoto(ed.section.key, data);

    var sEl = document.getElementById(ed.section.id);
    if (sEl) {
      var prev = sEl.querySelector('.adm-photo-preview');
      if (prev) { prev.src = ed.dataUrl; prev.style.objectPosition = xp + '% ' + yp + '%'; }
      sEl.classList.add('has-image');
    }
    edClose();
  }

  function edClose() {
    if (!ed) return;
    ed.el.classList.remove('is-open');
    ed.frame.classList.remove('is-dragging');
    ed.drag.on = false;
    ed.section = null;
    ed.dataUrl = null;
  }

  /* ─── Фото-секции ───────────────────────────────────────────────────────── */

  var photoSections = [
    { id: 'admHero',          key: 'hero',          w: 1920, h: 1080 },
    { id: 'admPhotoLeft',     key: 'photoLeft',     w: 960,  h: 1080 },
    { id: 'admPhotoRight',    key: 'photoRight',    w: 960,  h: 1080 },
    { id: 'admPhotoFull900',  key: 'photoFull900',  w: 1920, h: 900  },
    { id: 'admPhotoFull1080', key: 'photoFull1080', w: 1920, h: 1080 },
  ];

  var savedPhotos = loadPhotos();

  photoSections.forEach(function (section) {
    var el = document.getElementById(section.id);
    if (!el) return;

    var input   = el.querySelector('.adm-photo-input');
    var preview = el.querySelector('.adm-photo-preview');

    var saved = savedPhotos[section.key];
    if (saved) {
      preview.src = photoSrc(saved);
      preview.style.objectPosition = photoPos(saved);
      el.classList.add('has-image');
    }

    el.addEventListener('click', function (e) {
      if (e.target === input) return;
      input.click();
    });

    input.addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) { edOpen(section, ev.target.result); };
      reader.readAsDataURL(file);
    });
  });

})();
