/* ==========================================================================
   admin · фильтры
   Режимы:
     обычный        → body (без классов)
     выбор удаления → body.is-delete-mode  (ничего не выбрано, «удалить» 20%)
     есть выбранные → body.is-delete-mode.has-selection («удалить» активна)
     поп-ап         → fl-popup.is-open
   Хранение: localStorage key = 'irbags_filters'
   ========================================================================== */

(function () {

  var STORAGE_KEY = 'irbags_filters';
  var DEFAULT_FILTERS = ['сумки', 'ремни', 'платки', 'подвесы', 'брелки', 'обложки', 'визитницы'];

  var body         = document.body;
  var header       = document.getElementById('flHeader');
  var addBtn       = document.getElementById('flAddBtn');
  var deleteBtn    = document.getElementById('flDeleteBtn');
  var list         = document.getElementById('flList');
  var popup        = document.getElementById('flPopup');
  var popupOverlay = document.getElementById('flPopupOverlay');
  var popupConfirm = document.getElementById('flPopupConfirm');

  var selectedItems = new Set();

  /* ─── Хранилище ────────────────────────────────────────────────────────── */

  function loadFilters() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return DEFAULT_FILTERS.slice();
  }

  function saveFilters() {
    var names = Array.from(list.querySelectorAll('.fl-item:not(.fl-item--new)'))
      .map(function (li) { return li.dataset.name; })
      .filter(Boolean);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(names)); } catch (e) {}
  }

  /* ─── Рендер начального списка ─────────────────────────────────────────── */

  function renderList() {
    list.innerHTML = '';
    loadFilters().forEach(function (name) {
      list.appendChild(createItem(name));
    });
  }

  /* ─── Создание элемента списка ─────────────────────────────────────────── */

  function createItem(name) {
    var li = document.createElement('li');
    li.className = 'fl-item';
    li.dataset.name = name;

    var span = document.createElement('span');
    span.className = 'fl-item__text';
    span.textContent = name;

    li.appendChild(span);
    return li;
  }

  /* ─── Добавление нового фильтра ────────────────────────────────────────── */

  function addNewItem() {
    /* Не добавляем второй «новая», если уже есть */
    if (list.querySelector('.fl-item--new')) return;

    var li = document.createElement('li');
    li.className = 'fl-item fl-item--new';

    var span = document.createElement('span');
    span.className = 'fl-item__text';
    span.textContent = 'новая';

    li.appendChild(span);
    list.appendChild(li);

    /* Клик по «новая» → переходим в режим редактирования */
    li.addEventListener('click', function () {
      startEditing(li);
    });
  }

  /* ─── Редактирование названия фильтра ──────────────────────────────────── */

  function startEditing(li) {
    if (li.querySelector('.fl-item__input')) return; /* уже редактируется */

    li.innerHTML = '';

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'fl-item__input';
    input.placeholder = 'название';
    input.autocomplete = 'off';
    input.spellcheck = false;
    li.appendChild(input);
    input.focus();

    var committed = false;

    function commit() {
      if (committed) return;
      committed = true;

      var value = input.value.trim().toLowerCase();
      if (value) {
        li.className = 'fl-item';
        li.dataset.name = value;
        li.innerHTML = '';
        var span = document.createElement('span');
        span.className = 'fl-item__text';
        span.textContent = value;
        li.appendChild(span);
        saveFilters();
      } else {
        li.remove();
      }
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { committed = true; li.remove(); }
    });

    input.addEventListener('blur', commit);
  }

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

  /* ─── Кнопка «добавить» ────────────────────────────────────────────────── */

  if (addBtn) {
    addBtn.addEventListener('click', function () {
      addNewItem();
    });
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

  /* ─── Клик по фильтру (только в режиме удаления) ──────────────────────── */

  list.addEventListener('click', function (e) {
    if (!body.classList.contains('is-delete-mode')) return;

    var item = e.target.closest('.fl-item');
    if (!item || item.classList.contains('fl-item--new')) return;

    if (selectedItems.has(item)) {
      item.classList.remove('is-selected');
      selectedItems.delete(item);
    } else {
      item.classList.add('is-selected');
      selectedItems.add(item);
    }

    body.classList.toggle('has-selection', selectedItems.size > 0);
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

  if (popupOverlay) {
    popupOverlay.addEventListener('click', hidePopup);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popup.classList.contains('is-open')) {
      hidePopup();
    }
  });

  if (popupConfirm) {
    popupConfirm.addEventListener('click', function () {
      selectedItems.forEach(function (item) { item.remove(); });
      selectedItems.clear();
      hidePopup();
      exitDeleteMode();
      saveFilters();
    });
  }

  /* ─── Выход из режима удаления ─────────────────────────────────────────── */

  function exitDeleteMode() {
    selectedItems.forEach(function (item) { item.classList.remove('is-selected'); });
    selectedItems.clear();
    body.classList.remove('is-delete-mode', 'has-selection');
  }

  /* ─── Инициализация ────────────────────────────────────────────────────── */

  renderList();

})();
