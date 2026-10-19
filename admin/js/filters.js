(function () {

  Admin.renderHeader('filters');

  var list = document.getElementById('flList');
  var body = document.body;
  var selected = new Set();

  // Нижние кнопки

  var bottom    = Admin.el('div', 'a-bottom');
  var addBtn    = Admin.pill('добавить', { className: 'a-pill--dark', onClick: startAdd });
  var deleteBtn = Admin.pill('удалить', { onClick: onDeleteClick });
  bottom.appendChild(addBtn);
  bottom.appendChild(deleteBtn);
  body.appendChild(bottom);

  function counts() {
    var map = {};
    Admin.loadProducts().forEach(function (p) {
      (p.categories || []).forEach(function (c) { map[c] = (map[c] || 0) + 1; });
    });
    return map;
  }

  function render() {
    var map = counts();
    list.innerHTML = '';
    Admin.loadFilters().forEach(function (name) {
      var pill = Admin.pill(name, { className: selected.has(name) ? 'is-active' : '' });
      pill.appendChild(Admin.el('span', 'a-filters__count', String(map[name] || 0)));
      pill.addEventListener('click', function () {
        if (!body.classList.contains('is-delete-mode')) return;
        if (selected.has(name)) selected.delete(name); else selected.add(name);
        render();
      });
      list.appendChild(pill);
    });
    updateDeleteBtn();
  }

  // Добавление

  function startAdd() {
    if (list.querySelector('input')) { list.querySelector('input').focus(); return; }
    exitDeleteMode();

    var pill = Admin.el('label', 'a-pill is-active');
    var input = Admin.el('input');
    input.type = 'text';
    input.placeholder = 'новая';
    input.autocomplete = 'off';
    input.spellcheck = false;
    pill.appendChild(input);
    list.appendChild(pill);
    input.focus();

    var done = false;
    function commit() {
      if (done) return;
      done = true;
      var name = input.value.trim().toLowerCase();
      var names = Admin.loadFilters();
      if (!name) { render(); return; }
      if (names.indexOf(name) !== -1) { Admin.toast('такая категория уже есть', true); render(); return; }
      names.push(name);
      Admin.saveFilters(names).then(render, function () { Admin.toast('не удалось сохранить', true); });
      render();
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { done = true; render(); }
    });
    input.addEventListener('blur', commit);
  }

  // Удаление

  function updateDeleteBtn() {
    var on = body.classList.contains('is-delete-mode');
    deleteBtn.textContent = on ? (selected.size ? 'удалить (' + selected.size + ')' : 'отмена') : 'удалить';
    deleteBtn.classList.toggle('a-pill--danger', on && selected.size > 0);
  }

  function exitDeleteMode() {
    selected.clear();
    body.classList.remove('is-delete-mode');
    render();
  }

  function onDeleteClick() {
    if (!body.classList.contains('is-delete-mode')) {
      body.classList.add('is-delete-mode');
      updateDeleteBtn();
      return;
    }
    if (!selected.size) { exitDeleteMode(); return; }

    var n = selected.size;
    var used = counts();
    var withProducts = Array.from(selected).filter(function (c) { return used[c]; }).length;
    var question = 'удалить ' + n + ' ' + Admin.plural(n, 'категорию', 'категории', 'категорий') + '?' +
      (withProducts ? ' товары из них останутся, но без категории' : '');

    Admin.confirm(question).then(function (ok) {
      if (!ok) return;
      var names = Admin.loadFilters().filter(function (c) { return !selected.has(c); });
      Admin.saveFilters(names).then(function () {
        exitDeleteMode();
        Admin.toast('удалено');
      }, function () {
        Admin.toast('не удалось удалить', true);
      });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && body.classList.contains('is-delete-mode')) exitDeleteMode();
  });

  render();
  Admin.db().then(render);

})();
