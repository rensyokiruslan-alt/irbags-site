// Категории: добавление, переименование, удаление, порядок перетаскиванием.
// Порядок сохраняется в irbags_filters и используется фильтром магазина на сайте.

(function () {

  Admin.renderHeader('filters');

  var list     = document.getElementById('flList');
  var addForm  = document.getElementById('flAdd');
  var newInput = document.getElementById('flNew');

  var HANDLE = '<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">' +
    '<circle cx="2" cy="2" r="1.6"/><circle cx="8" cy="2" r="1.6"/>' +
    '<circle cx="2" cy="8" r="1.6"/><circle cx="8" cy="8" r="1.6"/>' +
    '<circle cx="2" cy="14" r="1.6"/><circle cx="8" cy="14" r="1.6"/></svg>';

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

  // Список сохраняется в браузере сразу, облако догоняет в фоне
  function save(names) {
    var done = Admin.saveFilters(names);
    render();
    return done.catch(function () { Admin.toast('не удалось сохранить', true); });
  }

  // Список

  var dragIndex = null;

  function render() {
    var names = Admin.loadFilters();
    var map = counts();
    list.innerHTML = '';

    if (!names.length) {
      list.appendChild(Admin.el('li', 'fl-empty', 'пока нет ни одной категории'));
      return;
    }

    names.forEach(function (name, i) {
      var row = Admin.el('li', 'fl-row');
      row.draggable = true;

      var handle = Admin.el('span', 'fl-handle');
      handle.innerHTML = HANDLE;
      handle.title = 'перетащите';
      row.appendChild(handle);

      var label = Admin.el('button', 'fl-name', name);
      label.type = 'button';
      label.title = 'нажмите, чтобы переименовать';
      label.addEventListener('click', function () { startRename(row, label, name); });
      row.appendChild(label);

      row.appendChild(Admin.el('span', 'fl-count', countLabel(map[name] || 0)));

      var remove = Admin.el('button', 'fl-remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'удалить категорию ' + name);
      remove.appendChild(Admin.icon('close'));
      remove.addEventListener('click', function () { removeCategory(name, map[name] || 0); });
      row.appendChild(remove);

      row.addEventListener('dragstart', function (e) {
        dragIndex = i;
        row.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', function () {
        dragIndex = null;
        row.classList.remove('is-dragging');
      });
      row.addEventListener('dragover', function (e) {
        if (dragIndex === null) return;
        e.preventDefault();
        row.classList.add('is-over');
      });
      row.addEventListener('dragleave', function () { row.classList.remove('is-over'); });
      row.addEventListener('drop', function (e) {
        e.preventDefault();
        row.classList.remove('is-over');
        if (dragIndex === null || dragIndex === i) return;
        var next = Admin.loadFilters();
        var moved = next.splice(dragIndex, 1)[0];
        next.splice(i, 0, moved);
        save(next);
      });

      list.appendChild(row);
    });
  }

  // Добавление

  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = newInput.value.trim().toLowerCase();
    if (!name) { newInput.focus(); return; }
    var names = Admin.loadFilters();
    if (names.indexOf(name) !== -1) { Admin.toast('такая категория уже есть', true); return; }
    names.push(name);
    newInput.value = '';
    save(names);
  });

  // Переименование: вместе с категорией обновляются товары, где она выбрана

  function startRename(row, label, oldName) {
    var input = Admin.el('input', 'fl-name-input');
    input.value = oldName;
    input.autocomplete = 'off';
    input.spellcheck = false;
    row.draggable = false;
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
      save(names);
      renameInProducts(oldName, name);
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
    // локальные копии обновляются сразу, облако — параллельно
    return Promise.all(affected.map(function (p) {
      p.categories = p.categories.map(function (c) { return c === oldName ? name : c; });
      return Admin.saveProduct(p);
    })).then(function () {
      render();
      Admin.toast(affected.length ? 'переименовано, товаров обновлено: ' + affected.length : 'переименовано');
    }, function () {
      Admin.toast('категория переименована, но не все товары обновились', true);
    });
  }

  // Удаление

  function removeCategory(name, used) {
    var question = 'удалить категорию «' + name + '»?' +
      (used ? ' ' + countLabel(used) + ' останутся без категории' : '');
    Admin.confirm(question).then(function (ok) {
      if (!ok) return;
      var names = Admin.loadFilters().filter(function (c) { return c !== name; });
      save(names);
    });
  }

  render();
  Admin.db().then(render);

})();
