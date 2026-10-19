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
    bar.appendChild(replace);
    bar.appendChild(Admin.el('span', 'a-pill a-pill--glass', 'перетащите, чтобы выбрать кадр'));
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
      });
    }

    function save(val) {
      Admin.savePhoto(key, val).then(function () {
        Admin.toast('сохранено');
      }, function () {
        Admin.toast('не удалось сохранить фото', true);
      });
    }

    replace.addEventListener('click', function (e) { e.stopPropagation(); upload(); });

    /* перетаскивание кадра: сдвиг мыши → смещение object-position */
    var drag = null;

    section.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.a-photo__bar')) return;
      if (!data) return;
      drag = { x0: e.clientX, y0: e.clientY, x: data.x, y: data.y, moved: false };
      section.setPointerCapture(e.pointerId);
      section.classList.add('is-dragging');
    });

    section.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var rect = section.getBoundingClientRect();
      var dx = (e.clientX - drag.x0) / rect.width  * 100;
      var dy = (e.clientY - drag.y0) / rect.height * 100;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) drag.moved = true;
      /* тянем фото вправо → показываем его левую часть → x уменьшается */
      data.x = Math.round(Math.max(0, Math.min(100, drag.x - dx)));
      data.y = Math.round(Math.max(0, Math.min(100, drag.y - dy)));
      img.style.objectPosition = data.x + '% ' + data.y + '%';
    });

    function endDrag() {
      if (!drag) return;
      var moved = drag.moved;
      drag = null;
      section.classList.remove('is-dragging');
      if (moved) save(data);
    }
    section.addEventListener('pointerup', endDrag);
    section.addEventListener('pointercancel', endDrag);

    section.addEventListener('click', function (e) {
      if (e.target.closest('.a-photo__bar')) return;
      if (!data) upload();
    });

    return apply;
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
    Admin.saveDashboard(dash).then(renderGrids, function () {
      Admin.toast('не удалось сохранить', true);
    });
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
