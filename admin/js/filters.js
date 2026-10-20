// Категории плитками, как товары в каталоге: обложка — фото первого товара категории.
// Клик по названию — переименовать, «удалить» при наведении, последняя плитка — добавить.

(function () {

  Admin.renderHeader('filters');

  var grid = document.getElementById('flGrid');

  function stats() {
    var map = {};
    Admin.loadProducts().forEach(function (p) {
      (p.categories || []).forEach(function (c) {
        if (!map[c]) map[c] = { count: 0, photo: null };
        map[c].count++;
        if (!map[c].photo) map[c].photo = Admin.firstPhoto(p);
      });
    });
    return map;
  }

  function countLabel(n) {
    return n ? n + ' ' + Admin.plural(n, 'товар', 'товара', 'товаров') : 'нет товаров';
  }

  function save(names) {
    return Admin.saveFilters(names).then(render, function () {
      Admin.toast('не удалось сохранить', true);
      render();
    });
  }

  function render() {
    var names = Admin.loadFilters();
    var map = stats();
    grid.innerHTML = '';

    names.forEach(function (name) {
      var info = map[name] || { count: 0, photo: null };
      var tile = Admin.el('div', 'fl-tile');

      var img = Admin.el('div', 'fl-tile__img');
      if (info.photo) {
        var photo = Admin.el('img', 'fl-tile__photo');
        photo.src = info.photo;
        photo.alt = '';
        photo.loading = 'lazy';
        img.appendChild(photo);
      } else {
        img.classList.add('is-empty');
      }
      img.appendChild(Admin.pill('удалить', {
        className: 'a-pill--glass fl-tile__remove',
        onClick: function () { removeCategory(name, info.count); }
      }));
      tile.appendChild(img);

      var label = Admin.el('div', 'fl-tile__label');
      var nameBtn = Admin.el('button', 'fl-tile__name', name);
      nameBtn.type = 'button';
      nameBtn.title = 'переименовать';
      nameBtn.addEventListener('click', function () { startRename(label, nameBtn, name); });
      label.appendChild(nameBtn);
      label.appendChild(Admin.el('span', 'fl-tile__count', countLabel(info.count)));
      tile.appendChild(label);

      grid.appendChild(tile);
    });

    grid.appendChild(addTile());
  }

  // Добавление

  function addTile() {
    var tile = Admin.el('div', 'fl-tile fl-add');
    var img = Admin.el('div', 'fl-tile__img');
    var pill = Admin.pill('добавить категорию', { icon: 'plus', className: 'a-pill--dark' });
    img.appendChild(pill);
    tile.appendChild(img);

    img.addEventListener('click', function () {
      if (img.querySelector('input')) return;
      var input = Admin.el('input');
      input.placeholder = 'название категории';
      input.autocomplete = 'off';
      input.spellcheck = false;
      img.replaceChild(input, pill);
      input.focus();

      var done = false;
      function finish(commit) {
        if (done) return;
        done = true;
        var name = input.value.trim().toLowerCase();
        if (!commit || !name) { render(); return; }
        var names = Admin.loadFilters();
        if (names.indexOf(name) !== -1) { Admin.toast('такая категория уже есть', true); render(); return; }
        names.push(name);
        save(names);
      }
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter')  { e.preventDefault(); finish(true); }
        if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      });
      input.addEventListener('blur', function () { finish(true); });
    });

    return tile;
  }

  // Переименование: вместе с категорией обновляются товары, где она выбрана

  function startRename(label, nameBtn, oldName) {
    var input = Admin.el('input', 'fl-name-input');
    input.value = oldName;
    input.autocomplete = 'off';
    input.spellcheck = false;
    label.replaceChild(input, nameBtn);
    input.focus();
    input.select();

    var done = false;
    function finish(commit) {
      if (done) return;
      done = true;
      var name = input.value.trim().toLowerCase();
      if (!commit || !name || name === oldName) { render(); return; }
      var names = Admin.loadFilters();
      if (names.indexOf(name) !== -1) { Admin.toast('такая категория уже есть', true); render(); return; }
      names[names.indexOf(oldName)] = name;
      save(names).then(function () { return renameInProducts(oldName, name); });
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', function () { finish(true); });
  }

  function renameInProducts(oldName, name) {
    var affected = Admin.loadProducts().filter(function (p) {
      return (p.categories || []).indexOf(oldName) !== -1;
    });
    if (!affected.length) return Promise.resolve();
    return affected.reduce(function (chain, p) {
      return chain.then(function () {
        p.categories = p.categories.map(function (c) { return c === oldName ? name : c; });
        return Admin.saveProduct(p);
      });
    }, Promise.resolve()).then(render, function () {
      Admin.toast('категория переименована, но не все товары обновились', true);
    });
  }

  // Удаление

  function removeCategory(name, used) {
    var question = 'удалить «' + name + '»?' + (used ? ' ' + countLabel(used) + ' останутся без категории' : '');
    Admin.confirm(question).then(function (ok) {
      if (!ok) return;
      save(Admin.loadFilters().filter(function (c) { return c !== name; }));
    });
  }

  render();
  Admin.db().then(render);

})();
