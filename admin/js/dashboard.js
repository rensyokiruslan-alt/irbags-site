(function () {

  Admin.renderHeader('dashboard');

  // Фото-секции

  function photoSrc(val) { return val && typeof val === 'object' ? val.src : val; }

  function setupPhoto(section) {
    var key = section.dataset.key;
    section.innerHTML = '';

    var icon = Admin.el('img', 'a-photo__icon');
    icon.src = 'img/mountain.svg';
    icon.alt = '';
    section.appendChild(icon);

    var img = Admin.el('img', 'a-photo__img');
    img.alt = '';
    img.draggable = false;
    img.hidden = true;
    section.appendChild(img);

    var bar = Admin.el('div', 'a-photo__bar');
    var replace = Admin.pill('заменить', { className: 'a-pill--glass' });
    var crop    = Admin.pill('выбрать кадр', { className: 'a-pill--glass' });
    var remove  = Admin.pill('удалить фото', { className: 'a-pill--glass' });
    bar.appendChild(replace);
    bar.appendChild(crop);
    bar.appendChild(remove);
    section.appendChild(bar);

    var data = null;

    function apply(val) {
      data = val && typeof val === 'object' ? val : (val ? { src: val, x: 50, y: 50 } : null);
      var src = data && photoSrc(data);
      img.hidden = !src;
      section.classList.toggle('has-image', !!src);
      if (src) {
        img.src = src;
        img.style.objectPosition = data.x + '% ' + data.y + '%';
      }
    }

    function upload() {
      Admin.pickPhoto(1600, 1600, 0.7).then(function (src) {
        var next = { src: src, x: 50, y: 50 };
        apply(next);
        save(next);
        openCrop(section, next, onCropped);
      });
    }

    function save(val) {
      Admin.savePhoto(key, val).then(function () {
        Admin.toast('сохранено');
      }, function () {
        Admin.toast('не удалось сохранить фото', true);
      });
    }

    function onCropped(pos) {
      data = { src: data.src, x: pos.x, y: pos.y };
      apply(data);
      save(data);
    }

    replace.addEventListener('click', function (e) { e.stopPropagation(); upload(); });
    crop.addEventListener('click', function (e) { e.stopPropagation(); if (data) openCrop(section, data, onCropped); });

    remove.addEventListener('click', function (e) {
      e.stopPropagation();
      Admin.confirm('удалить фото?').then(function (ok) {
        if (!ok) return;
        apply(null);
        Admin.deletePhoto(key).catch(function () { Admin.toast('не удалось удалить фото', true); });
      });
    });

    section.addEventListener('click', function (e) {
      if (e.target.closest('.a-photo__bar')) return;
      if (!data) upload();
    });

    return apply;
  }

  // Окно выбора кадра: рамка в пропорциях блока, фото внутри двигается мышью.
  // Результат — object-position в процентах { x, y }, как и раньше.
  function openCrop(section, val, onSave) {
    var ratio = section.offsetWidth / section.offsetHeight;
    var zoom  = parseFloat(document.documentElement.style.zoom) || 1;
    var maxW  = 1600;
    var maxH  = Math.max(300, window.innerHeight / zoom - 240);
    var w = maxW, h = Math.round(maxW / ratio);
    if (h > maxH) { h = Math.round(maxH); w = Math.round(h * ratio); }

    var pos = { x: val.x != null ? val.x : 50, y: val.y != null ? val.y : 50 };

    var wrap  = Admin.el('div', 'a-crop');
    var frame = Admin.el('div', 'a-crop__frame');
    frame.style.width  = w + 'px';
    frame.style.height = h + 'px';
    var img = Admin.el('img', 'a-crop__img');
    img.src = val.src;
    img.alt = '';
    img.draggable = false;
    img.style.objectPosition = pos.x + '% ' + pos.y + '%';
    frame.appendChild(img);
    wrap.appendChild(frame);

    var foot = Admin.el('div', 'a-crop__foot');
    foot.style.width = w + 'px';
    foot.appendChild(Admin.el('span', 'a-crop__hint', 'перетащите фото, чтобы выбрать кадр'));
    var actions = Admin.el('div', 'a-group');
    var cancel = Admin.pill('отмена');
    var ok     = Admin.pill('сохранить', { className: 'a-pill--dark' });
    actions.appendChild(cancel);
    actions.appendChild(ok);
    foot.appendChild(actions);
    wrap.appendChild(foot);

    var drag = null;
    frame.addEventListener('pointerdown', function (e) {
      drag = { x0: e.clientX, y0: e.clientY, x: pos.x, y: pos.y };
      frame.setPointerCapture(e.pointerId);
      frame.classList.add('is-dragging');
    });
    frame.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var rect = frame.getBoundingClientRect();
      // тянем фото вправо → видна его левая часть → x уменьшается
      pos.x = Math.round(Math.max(0, Math.min(100, drag.x - (e.clientX - drag.x0) / rect.width  * 100)));
      pos.y = Math.round(Math.max(0, Math.min(100, drag.y - (e.clientY - drag.y0) / rect.height * 100)));
      img.style.objectPosition = pos.x + '% ' + pos.y + '%';
    });
    function endDrag() { drag = null; frame.classList.remove('is-dragging'); }
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);

    function close() {
      document.removeEventListener('keydown', onKey);
      wrap.remove();
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') { close(); onSave(pos); }
    }
    cancel.addEventListener('click', close);
    ok.addEventListener('click', function () { close(); onSave(pos); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(wrap);
  }

  var photoAppliers = {};
  document.querySelectorAll('.a-photo[data-key]').forEach(function (section) {
    photoAppliers[section.dataset.key] = setupPhoto(section);
  });

  function renderPhotos() {
    var photos = Admin.loadPhotos();
    Object.keys(photoAppliers).forEach(function (key) {
      photoAppliers[key](photos[key] || null);
    });
  }

  // Слоты товаров

  function selectUrl(gridKey, slot) {
    return 'product-select.html?grid=' + gridKey + '&slot=' + slot;
  }

  function clearSlot(gridKey, slot) {
    var dash = Admin.loadDashboard();
    dash[gridKey] = (dash[gridKey] || [null, null, null, null]).slice();
    dash[gridKey][slot] = null;
    var done = Admin.saveDashboard(dash);
    renderGrids();
    done.catch(function () { Admin.toast('не удалось сохранить', true); });
  }

  function renderGrids() {
    var dash = Admin.loadDashboard();

    document.querySelectorAll('.a-home-grid[data-grid]').forEach(function (gridEl) {
      var gridKey = gridEl.dataset.grid;
      var slots = dash[gridKey] || [null, null, null, null];
      gridEl.innerHTML = '';

      for (var i = 0; i < 4; i++) {
        var product = slots[i] !== null && slots[i] !== undefined ? Admin.findProduct(slots[i]) : null;
        var card;

        if (product) {
          card = Admin.card(product);
          var bar = Admin.el('div', 'a-group a-card__hint');
          bar.appendChild(Admin.pill('заменить', { href: selectUrl(gridKey, i), className: 'a-pill--glass' }));
          bar.appendChild(Admin.pill('убрать', {
            className: 'a-pill--glass',
            onClick: (function (g, s) { return function () { clearSlot(g, s); }; })(gridKey, i)
          }));
          card.appendChild(bar);
          card.addEventListener('click', (function (id) {
            return function (e) {
              if (e.target.closest('.a-card__hint')) return;
              window.location.href = 'product-create.html?id=' + encodeURIComponent(id);
            };
          })(product.id));
        } else {
          card = Admin.card(null, { href: selectUrl(gridKey, i) });
          card.appendChild(Admin.el('span', 'a-pill a-pill--dark a-card__add', ''));
          var add = card.lastChild;
          add.appendChild(Admin.icon('plus'));
          add.appendChild(document.createTextNode('добавить товар'));
        }
        gridEl.appendChild(card);
      }
    });
  }

  function renderAll() {
    renderPhotos();
    renderGrids();
  }

  renderAll();
  Admin.db().then(renderAll);

})();
