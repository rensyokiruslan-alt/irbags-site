(function () {

  var params     = new URLSearchParams(window.location.search);
  var targetGrid = params.get('grid');
  var targetSlot = parseInt(params.get('slot'), 10);
  var isPicker   = (targetGrid === 'grid1' || targetGrid === 'grid2') && targetSlot >= 0 && targetSlot < 4;

  var page    = document.getElementById('prPage');
  var grid    = document.getElementById('prGrid');
  var emptyEl = document.getElementById('prEmpty');
  var body    = document.body;

  var query    = '';
  var category = null;
  var selected = new Set();

  // Шапка

  var search = Admin.searchPill(function (q) { query = q; render(); });
  var addNewBtn = Admin.pill('добавить новый', { href: 'product-create.html', className: 'a-pill--dark' });
  var addBtn = null;

  if (isPicker) {
    Admin.renderHeader(null, {
      left:  [Admin.pill('отмена', { href: 'dashboard.html' })],
      right: [search, addNewBtn],
      exit:  false
    });
  } else {
    Admin.renderHeader('products', { right: [search] });
  }

  /* категории над сеткой; в режиме выбора — сразу раскрыты */
  var catRow = Admin.categoryRow(function (name) { category = name; render(); }, isPicker);
  page.insertBefore(catRow, page.firstChild);

  // Нижние кнопки (только «товары»)

  var deleteBtn = null;

  if (!isPicker) {
    var bottom = Admin.el('div', 'a-bottom');
    addBtn = Admin.pill('добавить', { href: 'product-create.html', className: 'a-pill--dark' });
    deleteBtn  = Admin.pill('удалить', { onClick: onDeleteClick });
    bottom.appendChild(addBtn);
    bottom.appendChild(deleteBtn);
    body.appendChild(bottom);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('is-delete-mode')) exitDeleteMode();
    });
  }

  function updateDeleteBtn() {
    if (!deleteBtn) return;
    var on = body.classList.contains('is-delete-mode');
    deleteBtn.textContent = on
      ? (selected.size ? 'удалить (' + selected.size + ')' : 'отмена')
      : 'удалить';
    deleteBtn.classList.toggle('a-pill--danger', on && selected.size > 0);
  }

  function exitDeleteMode() {
    selected.clear();
    body.classList.remove('is-delete-mode');
    grid.querySelectorAll('.a-card.is-selected').forEach(function (c) { c.classList.remove('is-selected'); });
    updateDeleteBtn();
  }

  function onDeleteClick() {
    if (!body.classList.contains('is-delete-mode')) {
      body.classList.add('is-delete-mode');
      updateDeleteBtn();
      return;
    }
    if (!selected.size) { exitDeleteMode(); return; }

    var n = selected.size;
    Admin.confirm('удалить ' + n + ' ' + Admin.plural(n, 'товар', 'товара', 'товаров') + '?').then(function (ok) {
      if (!ok) return;
      Admin.deleteProducts(Array.from(selected)).then(function () {
        exitDeleteMode();
        render();
        Admin.toast('удалено');
      }, function () {
        Admin.toast('не удалось удалить', true);
      });
    });
  }

  // Рендер

  function render() {
    var all  = Admin.loadProducts();
    var list = Admin.byCategory(Admin.filterProducts(all, query), category);

    // Пока товаров нет совсем — без категорий, поиска и удаления, только кнопка добавления
    var noProducts = !all.length;
    catRow.hidden = noProducts;
    search.hidden = noProducts;
    if (deleteBtn) deleteBtn.hidden = noProducts;
    if (addBtn) addBtn.hidden = noProducts;
    addNewBtn.hidden = noProducts;

    grid.innerHTML = '';
    emptyEl.innerHTML = '';
    emptyEl.hidden = list.length > 0;

    if (!list.length) {
      emptyEl.appendChild(Admin.el('p', null, all.length ? 'ничего не найдено' : 'пока товаров нет'));
      if (!all.length) {
        emptyEl.appendChild(Admin.pill('добавить товар', {
          href: 'product-create.html', icon: 'plus', className: 'a-pill--dark'
        }));
      }
      return;
    }

    list.forEach(function (product) {
      var card = Admin.card(product, { stock: true });
      if (!isPicker) {
        var tag = Admin.el('span', 'a-pill a-card__tag', 'выбрать');
        card.appendChild(tag);
        if (selected.has(String(product.id))) {
          card.classList.add('is-selected');
          tag.textContent = 'выбрано';
        }
      }
      grid.appendChild(card);
    });
  }

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.a-card');
    if (!card) return;
    var id = card.dataset.id;

    if (isPicker) { pickForSlot(id); return; }

    if (body.classList.contains('is-delete-mode')) {
      var on = !selected.has(id);
      if (on) selected.add(id); else selected.delete(id);
      card.classList.toggle('is-selected', on);
      card.querySelector('.a-card__tag').textContent = on ? 'выбрано' : 'выбрать';
      updateDeleteBtn();
      return;
    }

    window.location.href = 'product-create.html?id=' + encodeURIComponent(id);
  });

  // Режим выбора: поставить товар в слот главной

  function pickForSlot(id) {
    var product = Admin.findProduct(id);
    if (!product) return;
    var dash = Admin.loadDashboard();
    dash[targetGrid] = (dash[targetGrid] || [null, null, null, null]).slice();
    dash[targetGrid][targetSlot] = product.id;
    Admin.saveDashboard(dash).then(function () {
      window.location.href = 'dashboard.html';
    }, function () {
      Admin.toast('не удалось сохранить', true);
    });
  }

  /* сначала из кэша, потом — свежие данные из Firestore */
  render();
  Admin.db().then(render);

})();
