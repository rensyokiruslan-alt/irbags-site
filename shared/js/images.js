// Фото товаров и главной. В данных фото — ссылка «img:<id>» на документ irbags_images/<id>
// (или старый встроенный data URL). Загруженные картинки кешируются в IndexedDB:
// каждый браузер скачивает фото один раз. «img:local-…» — ещё не загруженное фото
// из админки (лежит только в IndexedDB этого браузера до сохранения товара).
(function () {

  var DB_NAME = 'irbags-images';
  var STORE   = 'images';
  var mem     = {};
  var dbPromise = null;

  function idb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      try {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
    return dbPromise;
  }

  function idbGet(id) {
    return idb().then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve) {
        try {
          var req = db.transaction(STORE).objectStore(STORE).get(id);
          req.onsuccess = function () { resolve(req.result || null); };
          req.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
    });
  }

  function idbPut(id, src) {
    mem[id] = src;
    return idb().then(function (db) {
      if (!db) return;
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(src, id);
          tx.oncomplete = tx.onerror = function () { resolve(); };
        } catch (e) { resolve(); }
      });
    });
  }

  // firebase-sync.js подключается модулем и появляется чуть позже
  function waitFirebase() {
    return new Promise(function (resolve) {
      var tries = 0;
      (function check() {
        if (window.IrbagsDB) { resolve(window.IrbagsDB); return; }
        if (++tries > 400) { resolve(null); return; }
        setTimeout(check, 25);
      })();
    });
  }

  function isRef(value) { return typeof value === 'string' && value.indexOf('img:') === 0; }
  function idOf(ref) { return ref.slice(4); }
  function isLocal(value) { return isRef(value) && idOf(value).indexOf('local-') === 0; }

  function newId(prefix) {
    return (prefix || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // Значение фото → src для <img> (или null)
  function load(value) {
    if (!value) return Promise.resolve(null);
    if (!isRef(value)) return Promise.resolve(value);
    var id = idOf(value);
    if (mem[id]) return Promise.resolve(mem[id]);
    return idbGet(id).then(function (src) {
      if (src || isLocal(value)) return src;
      return waitFirebase().then(function (db) {
        return db && db.isConfigured ? db.loadImage(id) : null;
      }).then(function (remote) {
        if (remote) idbPut(id, remote);
        return remote;
      });
    }).then(function (src) {
      if (src) mem[id] = src;
      return src || null;
    }, function () { return null; });
  }

  function apply(img, value) {
    if (!value) return;
    if (!isRef(value)) { img.src = value; return; }
    img.dataset.photo = value;
    load(value).then(function (src) {
      if (src && img.dataset.photo === value) img.src = src;
    });
  }

  // Новое фото из админки — в IndexedDB до сохранения товара
  function storeLocal(src) {
    var id = newId('local-');
    return idbPut(id, src).then(function () { return 'img:' + id; });
  }

  window.IrbagsImages = {
    isRef: isRef,
    isLocal: isLocal,
    idOf: idOf,
    newId: newId,
    load: load,
    apply: apply,
    put: idbPut,
    storeLocal: storeLocal
  };

})();
