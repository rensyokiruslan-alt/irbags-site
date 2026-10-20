// Категории: список текстом; клик по названию — переименовать, крестик — удалить,
// поле внизу — добавить (Enter).

(function () {

  Admin.renderHeader('filters');

  var list     = document.getElementById('flList');
  var newInput = document.getElementById('flNew');

  function counts() {
    var map = {};
    Admin.loadProducts().forEach(function (p) {
      (p.categories || []).forEach(function (c) { map[c] = (map[c] || 0) + 1; });
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
    var map = counts();
    list.innerHTML = '';

    if (!names.length) {
      list.appendChild(Admin.el('li', 'fl-empty', 'пока нет ни одной категории'));
      return;
    }

    names.forEach(function (name) {
      var row = Admin.el('li', 'fl-row');

      var label = Admin.el('button', 'fl-name', name);
      label.type = 'button';
      label.title = 'переименовать';
      label.addEventListener('click', function () { startRename(row, label, name); });
      row.appendChild(label);

      row.appendChild(Admin.el('span', 'fl-count', String(map[name] || 0)));

      var remove = Admin.el('button', 'fl-remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'удалить категорию ' + name);
      remove.appendChild(Admin.icon('close'));
      remove.addEventListener('click', function () { removeCategory(name, map[name] || 0); });
      row.appendChild(remove);

      list.appendChild(row);
    });
  }

  // Добавление

  newInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { this.value = ''; this.blur(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var name = this.value.trim().toLowerCase();
    if (!name) return;
    var names = Admin.loadFilters();
    if (names.indexOf(name) !== -1) { Admin.toast('такая категория уже есть', true); return; }
    names.push(name);
    this.value = '';
    save(names);
  });

  // Переименование: вместе с категорией обновляются товары, где она выбрана

  function startRename(row, label, oldName) {
    var input = Admin.el('input', 'fl-name-input');
    input.value = oldName;
    input.autocomplete = 'off';
    input.spellcheck = false;
    row.replaceChild(input, label);
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
