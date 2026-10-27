(function () {

  /* Тот же веб-апп Apps Script, что принимает заказы (site/js/checkout.js) */
  var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyvSTGv2yocJAEsUjYAPIla6u2rCeUC5R3H7NVIZWbMn9ItjAeo7DEiVPwGn8tSXIv1/exec';

  var AUTH_KEY        = 'irbags_admin';
  var PRODUCTS_KEY    = 'irbags_products';
  var DASHBOARD_KEY   = 'irbags_dashboard';
  var PHOTOS_KEY      = 'irbags_dashboard_photos';
  var FILTERS_KEY     = 'irbags_filters';
  var DEFAULT_FILTERS = ['сумки', 'ремни', 'платки', 'подвесы', 'брелки', 'обложки', 'визитницы'];

  var A = window.Admin = {};

  // Вход

  A.isAuthed = function () {
    try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return true; }
  };

  A.login = function () {
    try { sessionStorage.setItem(AUTH_KEY, '1'); } catch (e) {}
  };

  A.logout = function () {
    try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
    var go = function () { window.location.href = 'index.html'; };
    A.loadDB().then(function (db) { return db && db.signOut(); }).then(go, go);
  };

  // Быстрая проверка по отметке в sessionStorage, затем — настоящая сессия Firebase
  A.requireAuth = function () {
    if (!A.isAuthed()) { window.location.replace('index.html'); return; }
    A.loadDB().then(function (db) {
      if (!db || !db.isConfigured) return;
      return db.currentAdmin().then(function (user) { if (!user) A.logout(); });
    });
  };

  // DOM-хелперы

  A.el = function (tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  A.icon = function (name, extraClass) {
    var img = A.el('img', 'a-icon' + (extraClass ? ' ' + extraClass : ''));
    img.src = 'img/' + name + '.svg';
    img.alt = '';
    return img;
  };

  A.pill = function (text, opts) {
    opts = opts || {};
    var node = A.el(opts.href ? 'a' : 'button', 'a-pill' + (opts.className ? ' ' + opts.className : ''));
    if (opts.href) node.href = opts.href; else node.type = 'button';
    if (opts.icon) node.appendChild(A.icon(opts.icon));
    if (text) node.appendChild(document.createTextNode(text));
    if (opts.onClick) node.addEventListener('click', opts.onClick);
    return node;
  };

  // Шапка

  var NAV = [
    { href: 'dashboard.html', key: 'dashboard', label: 'главная' },
    { href: 'products.html',  key: 'products',  label: 'товары'  },
    { href: 'filters.html',   key: 'filters',   label: 'фильтры' }
  ];

  /* Пилюля поиска: иконка + поле. onInput(query) — при каждом вводе */
  A.searchPill = function (onInput) {
    var label = A.el('label', 'a-pill a-search');
    label.appendChild(A.icon('search'));
    var input = A.el('input');
    input.type = 'search';
    input.placeholder = 'поиск';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'поиск');
    input.addEventListener('input', function () {
      label.classList.toggle('has-value', !!this.value);
      onInput(this.value.trim());
    });
    label.appendChild(input);
    return label;
  };

  /* left: массив узлов слева (по умолчанию — навигация), right: справа (+ «выйти») */
  A.renderHeader = function (active, opts) {
    opts = opts || {};
    var left = A.el('div', 'a-top a-top--left');
    if (opts.left) {
      opts.left.forEach(function (n) { left.appendChild(n); });
    } else {
      NAV.forEach(function (item) {
        left.appendChild(A.pill(item.label, {
          href: item.href,
          className: item.key === active ? 'is-active' : ''
        }));
      });
    }

    var right = A.el('div', 'a-top a-top--right');
    (opts.right || []).forEach(function (n) { right.appendChild(n); });
    if (opts.exit !== false) {
      right.appendChild(A.pill('выйти', { className: 'a-pill--dark', onClick: A.logout }));
    }

    document.body.insertBefore(right, document.body.firstChild);
    document.body.insertBefore(left, document.body.firstChild);

    // Предупреждение о несохранённом в облаке, если страница сменилась сразу после сохранения
    try {
      if (sessionStorage.getItem('irbags_cloud_warn')) {
        sessionStorage.removeItem('irbags_cloud_warn');
        A.toast('последние изменения сохранены только в этом браузере — нет связи с базой', true);
      }
    } catch (e) {}

    /* прятать шапку при скролле вниз */
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      document.body.classList.toggle('is-scrolled-down', y > lastY && y > 60);
      lastY = y;
    }, { passive: true });
  };

  // Ряд категорий: «категории ›» раскрывается в список фильтров

  A.categoryRow = function (onChange, startOpen) {
    var row = A.el('div', 'a-cats');
    var current = null;

    var head = A.pill('категории');
    var list = A.el('div', 'a-cats__list');
    var toggle = A.el('button', 'a-pill a-pill--icon a-cats__toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'показать категории');
    toggle.appendChild(A.icon('chevron-right'));

    function setOpen(open) {
      row.classList.toggle('is-open', open);
      head.classList.toggle('is-active', open);
      if (!open && current !== null) select(null);
    }

    function select(name) {
      current = name;
      Array.from(list.children).forEach(function (b) {
        b.classList.toggle('is-active', b.dataset.name === name);
      });
      onChange(name);
    }

    A.loadFilters().forEach(function (name) {
      var b = A.pill(name, {
        onClick: function () { select(current === name ? null : name); }
      });
      b.dataset.name = name;
      list.appendChild(b);
    });

    head.addEventListener('click', function () { setOpen(!row.classList.contains('is-open')); });
    toggle.addEventListener('click', function () { setOpen(!row.classList.contains('is-open')); });

    var wrap = A.el('div', 'a-cats__wrap');
    wrap.appendChild(list);
    wrap.appendChild(toggle);
    row.appendChild(head);
    row.appendChild(wrap);
    if (startOpen) setOpen(true);
    return row;
  };

  A.byCategory = function (products, category) {
    if (!category) return products;
    return products.filter(function (p) { return (p.categories || []).indexOf(category) !== -1; });
  };

  // Карточка товара (как на сайте: фото 480×683 + название, цена)

  A.card = function (product, opts) {
    opts = opts || {};
    var card = A.el(opts.href ? 'a' : 'div', 'a-card');
    if (opts.href) card.href = opts.href;
    if (product) card.dataset.id = String(product.id);

    var img = A.el('div', 'a-card__img');
    var src = product ? A.firstPhoto(product) : null;
    if (src) {
      var photo = A.el('img');
      if (window.IrbagsImages) IrbagsImages.apply(photo, src); else photo.src = src;
      photo.alt = '';
      photo.loading = 'lazy';
      img.appendChild(photo);
    } else {
      img.classList.add('is-empty');
      if (product) {
        var ic = A.el('img', 'a-card__icon');
        ic.src = 'img/mountain.svg';
        ic.alt = '';
        img.appendChild(ic);
      }
    }
    card.appendChild(img);

    if (product) {
      var label = A.el('div', 'a-card__label');
      label.appendChild(A.el('span', 'a-card__name', product.name || 'название'));
      label.appendChild(A.priceEl(product));
      if (opts.stock) {
        var total = A.totalStock(product);
        var stock = A.el('span', 'a-card__stock', total > 0 ? 'в наличии: ' + total + ' шт' : 'нет в наличии');
        if (total === 0) stock.classList.add('is-out');
        label.appendChild(stock);
      }
      card.appendChild(label);
    }
    return card;
  };

  A.priceEl = function (product) {
    var el = A.el('span', 'a-card__price');
    var v = A.getVariants(product)[0];
    if (!v || !v.price) { el.textContent = 'сумма'; return el; }
    if (v.discount) {
      el.appendChild(A.el('s', null, A.formatRub(A.parsePrice(v.price))));
      el.appendChild(document.createTextNode(A.formatRub(A.parsePrice(v.discount))));
    } else {
      el.textContent = A.formatRub(A.parsePrice(v.price));
    }
    return el;
  };

  // Локальное хранилище

  function readLocal(key, fallback) {
    try {
      var s = localStorage.getItem(key);
      return s ? JSON.parse(s) : fallback;
    } catch (e) { return fallback; }
  }

  function writeLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  A.loadProducts  = function () { return readLocal(PRODUCTS_KEY, []); };
  A.loadFilters   = function () { return readLocal(FILTERS_KEY, DEFAULT_FILTERS.slice()); };
  A.loadPhotos    = function () { return readLocal(PHOTOS_KEY, {}); };
  A.loadDashboard = function () {
    return readLocal(DASHBOARD_KEY, { grid1: [null, null, null, null], grid2: [null, null, null, null] });
  };

  A.findProduct = function (id) {
    var list = A.loadProducts();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) return list[i];
    }
    return null;
  };

  // firebase-sync.js (type="module") и его первичная загрузка данных
  var loadPromise = null;
  A.loadDB = function () {
    if (loadPromise) return loadPromise;
    loadPromise = new Promise(function (resolve) {
      var tries = 0;
      (function check() {
        if (window.IrbagsDB) {
          Promise.resolve(window.IrbagsDB.ready).then(
            function () { resolve(window.IrbagsDB); },
            function () { resolve(window.IrbagsDB); }
          );
          return;
        }
        if (++tries > 200) { resolve(null); return; }
        setTimeout(check, 25);
      })();
    });
    return loadPromise;
  };

  // То же + восстановленная сессия администратора: без неё запись в Firestore запрещена правилами
  var dbPromise = null;
  A.db = function () {
    if (dbPromise) return dbPromise;
    dbPromise = A.loadDB().then(function (db) {
      if (!db || !db.isConfigured) return db;
      var back = function () { return db; };
      return db.currentAdmin().then(back, back);
    });
    return dbPromise;
  };

  // Сохранение: сначала в браузер (интерфейс обновляется сразу), затем в Firestore.
  // Промис завершается после ответа облака или таймаута (8 с) — страницы, которые уходят
  // после сохранения, ждут его, чтобы запись не оборвалась.

  var cloudWarned = 0;

  function warnCloud() {
    if (Date.now() - cloudWarned > 4000) {
      cloudWarned = Date.now();
      A.toast('сохранено только в этом браузере — нет связи с базой', true);
    }
    try { sessionStorage.setItem('irbags_cloud_warn', '1'); } catch (e) {}
    // если страница не сменилась, предупреждение уже увидели
    setTimeout(function () { try { sessionStorage.removeItem('irbags_cloud_warn'); } catch (e) {} }, 3000);
  }

  function toCloud(write) {
    return A.db().then(function (db) {
      if (!db) return;
      return write(db).catch(function (err) {
        if (!err || err.code !== 'cloud') throw err;
        warnCloud();
      });
    });
  }

  function storeLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      A.toast('в браузере не хватает места — уменьшите фото', true);
      throw e;
    }
  }

  // Фото: новые (img:local-…) и старые встроенные (data:…) загружаются в irbags_images,
  // в данных остаётся ссылка img:<id>. Без связи фото остаётся как было и загрузится при следующем сохранении.
  // одно и то же новое фото загружается один раз, даже если его сохраняют повторно
  var uploads = {};
  var uploaded = {};

  function resolvePhoto(value) {
    return uploaded[value] || value;
  }

  function persistPhoto(value) {
    var Img = window.IrbagsImages;
    if (!value || !Img) return Promise.resolve(value);
    var inline = !Img.isRef(value) && value.indexOf('data:') === 0;
    if (!inline && !Img.isLocal(value)) return Promise.resolve(value);
    if (uploaded[value]) return Promise.resolve(uploaded[value]);
    if (uploads[value]) return uploads[value];

    var job = (inline ? Promise.resolve(value) : Img.load(value)).then(function (src) {
      if (!src) return value;
      var id = Img.newId();
      return A.db().then(function (db) {
        if (!db || !db.isConfigured) throw { code: 'cloud' };
        return db.saveImage(id, src);
      }).then(function () {
        Img.put(id, src);
        uploaded[value] = 'img:' + id;
        delete uploads[value];
        return 'img:' + id;
      }, function () {
        warnCloud();
        delete uploads[value];
        return value;
      });
    });
    uploads[value] = job;
    return job;
  }

  function photoRefs(product) {
    var refs = [];
    if (!product || !window.IrbagsImages) return refs;
    A.getVariants(product).forEach(function (v) {
      v.photos.forEach(function (p) {
        if (IrbagsImages.isRef(p) && !IrbagsImages.isLocal(p)) refs.push(IrbagsImages.idOf(p));
      });
    });
    return refs;
  }

  function dropImages(ids) {
    if (!ids.length) return Promise.resolve();
    return toCloud(function (db) { return db.deleteImages(ids); });
  }

  A.saveProduct = function (product) {
    var before = photoRefs(A.findProduct(product.id));

    return Promise.all((product.variants || []).map(function (v) {
      return Promise.all((v.photos || []).map(persistPhoto)).then(function (photos) { v.photos = photos; });
    })).then(function () {
      var list = A.loadProducts();
      var idx = list.findIndex(function (p) { return String(p.id) === String(product.id); });
      if (idx === -1) list.push(product); else list[idx] = product;
      storeLocal(PRODUCTS_KEY, list);
      A.syncStock(list);

      var after = photoRefs(product);
      var unused = before.filter(function (id) { return after.indexOf(id) === -1; });
      return Promise.all([
        toCloud(function (db) { return db.saveProduct(product); }),
        dropImages(unused)
      ]).then(function () { return list; });
    });
  };

  /* Удаление товаров + очистка их слотов на главной */
  A.deleteProducts = function (ids) {
    var keys = ids.map(String);
    var images = [];
    A.loadProducts().forEach(function (p) {
      if (keys.indexOf(String(p.id)) !== -1) images = images.concat(photoRefs(p));
    });
    var list = A.loadProducts().filter(function (p) { return keys.indexOf(String(p.id)) === -1; });
    writeLocal(PRODUCTS_KEY, list);
    A.syncStock(list);

    var dash = A.loadDashboard();
    var changed = false;
    ['grid1', 'grid2'].forEach(function (g) {
      dash[g] = (dash[g] || []).map(function (id) {
        if (id !== null && keys.indexOf(String(id)) !== -1) { changed = true; return null; }
        return id;
      });
    });

    return Promise.all([
      toCloud(function (db) { return db.deleteProducts(keys); }),
      dropImages(images),
      changed ? A.saveDashboard(dash) : null
    ]).then(function () { return list; });
  };

  A.saveDashboard = function (data) {
    writeLocal(DASHBOARD_KEY, data);
    return toCloud(function (db) { return db.saveDashboard(data); }).then(function () { return data; });
  };

  function homePhotoRef(val) {
    var src = val && typeof val === 'object' ? val.src : val;
    return window.IrbagsImages && IrbagsImages.isRef(src) && !IrbagsImages.isLocal(src) ? IrbagsImages.idOf(src) : null;
  }

  // Положение и ссылка на фото записываются в браузер сразу, загрузка в базу — следом
  A.storePhotoLocal = function (key, data) {
    var photos = A.loadPhotos();
    // уже загруженное фото не откатываем обратно на локальную ссылку
    photos[key] = data && { src: resolvePhoto(data.src), x: data.x, y: data.y };
    writeLocal(PHOTOS_KEY, photos);
  };

  A.savePhoto = function (key, data) {
    var oldRef = homePhotoRef(A.loadPhotos()[key]);
    var original = resolvePhoto(data.src);
    A.storePhotoLocal(key, data);
    return persistPhoto(original).then(function (src) {
      var photos = A.loadPhotos();
      var current = photos[key];
      // пока фото загружалось, его удалили или заменили — загруженная копия не нужна
      if (!current || current.src !== original) {
        var uploaded = homePhotoRef({ src: src });
        return (uploaded && uploaded !== homePhotoRef(current) ? dropImages([uploaded]) : Promise.resolve())
          .then(function () { return photos; });
      }
      data = { src: src, x: current.x, y: current.y };
      photos[key] = data;
      storeLocal(PHOTOS_KEY, photos);
      var newRef = homePhotoRef(data);
      return Promise.all([
        toCloud(function (db) { return db.savePhoto(key, data); }),
        oldRef && oldRef !== newRef ? dropImages([oldRef]) : null
      ]).then(function () { return photos; });
    });
  };

  A.deletePhoto = function (key) {
    var photos = A.loadPhotos();
    var src = photos[key] && resolvePhoto(photos[key].src);
    var oldRef = homePhotoRef(src);
    delete photos[key];
    writeLocal(PHOTOS_KEY, photos);
    // фото ещё загружается — удаляем копию, как только загрузка закончится
    var late = !oldRef && uploads[src] ? uploads[src].then(function (ref) {
      var id = homePhotoRef(ref);
      return id ? dropImages([id]) : null;
    }) : null;
    return Promise.all([
      toCloud(function (db) { return db.deletePhoto(key); }),
      oldRef ? dropImages([oldRef]) : null,
      late
    ]).then(function () { return photos; });
  };

  A.saveFilters = function (names) {
    writeLocal(FILTERS_KEY, names);
    return toCloud(function (db) { return db.saveFilters(names); }).then(function () { return names; });
  };

  // Товар: варианты, цена, остаток

  A.parseStock = function (val) {
    var n = parseInt(String(val == null ? '' : val).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  };

  A.getVariants = function (product) {
    var list = (product.variants && product.variants.length)
      ? product.variants
      : ((product.colors && product.colors.length) ? product.colors : ['']).map(function (color) {
          return { color: color, price: product.price, discount: product.discount, photos: product.photos };
        });
    return list.map(function (v) {
      var photos = (v.photos || []).slice(0, 6);
      while (photos.length < 6) photos.push(null);
      return {
        color:    v.color    || '',
        price:    v.price    || '',
        discount: v.discount || '',
        stock:    A.parseStock(v.stock),
        photos:   photos
      };
    });
  };

  A.totalStock = function (product) {
    return A.getVariants(product).reduce(function (sum, v) { return sum + v.stock; }, 0);
  };

  A.firstPhoto = function (product) {
    var variants = A.getVariants(product);
    for (var i = 0; i < variants.length; i++) {
      for (var j = 0; j < variants[i].photos.length; j++) {
        if (variants[i].photos[j]) return variants[i].photos[j];
      }
    }
    return null;
  };

  A.parsePrice = function (str) {
    if (!str) return 0;
    var n = parseFloat(String(str).replace(/[^0-9.,]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };

  A.formatRub = function (n) { return n + ' руб'; };

  A.filterProducts = function (products, query) {
    if (!query) return products;
    var q = query.toLowerCase();
    return products.filter(function (p) {
      var nameMatch = (p.name || '').toLowerCase().indexOf(q) !== -1;
      var catMatch  = (p.categories || []).some(function (c) {
        return c.toLowerCase().indexOf(q) !== -1;
      });
      return nameMatch || catMatch;
    });
  };

  // Остатки → Google Таблица

  function stamp() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : String(n); }
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' +
           p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* Полная перезапись листа «Остатки»: одна строка на каждый цвет товара */
  A.syncStock = function (products) {
    if (!SCRIPT_URL) return Promise.resolve();
    var updated = stamp();
    var rows = [];
    (products || []).forEach(function (p) {
      A.getVariants(p).forEach(function (v) {
        rows.push({
          id:       p.id,
          name:     p.name || '',
          category: (p.categories || []).join(', '),
          color:    v.color,
          stock:    v.stock,
          price:    v.price,
          discount: v.discount,
          updated:  updated
        });
      });
    });

    /* text/plain — simple request без preflight, как в оформлении заказа */
    return fetch(SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      keepalive: true,
      body:    JSON.stringify({ type: 'stock', rows: rows })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || res.status !== 'ok') throw new Error((res && res.message) || 'error');
      })
      .catch(function () {
        A.toast('таблица остатков не обновилась', true);
      });
  };

  // Фото

  // Сжатие в WebP data URL (в браузерах без WebP — JPEG на белом фоне).
  // Документ Firestore — до 1 МБ: если фото тяжелее MAX_PHOTO_LENGTH,
  // сначала снижается качество, потом размер.
  var MAX_PHOTO_LENGTH = 900000;

  function encode(canvas, quality) {
    var url = canvas.toDataURL('image/webp', quality);
    if (url.indexOf('data:image/webp') === 0) return url;
    var flat = document.createElement('canvas');
    flat.width = canvas.width;
    flat.height = canvas.height;
    var ctx = flat.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(canvas, 0, 0);
    return flat.toDataURL('image/jpeg', quality);
  }

  function fitToLimit(img, maxW, maxH, quality) {
    var scale = Math.min(1, maxW / img.width, maxH / img.height);
    var canvas;
    for (var attempt = 0; attempt < 8; attempt++) {
      canvas = document.createElement('canvas');
      canvas.width  = Math.max(1, Math.round(img.width  * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (var q = quality; q >= 0.6; q -= 0.06) {
        var url = encode(canvas, q);
        if (url.length <= MAX_PHOTO_LENGTH) return url;
      }
      scale *= 0.85;
    }
    return encode(canvas, 0.6);
  }

  A.compress = function (file, maxW, maxH, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function (e) {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          resolve(fitToLimit(img, maxW, maxH, quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  /* Открыть выбор файла и вернуть сжатое фото */
  var fileInput = null;
  A.pickPhoto = function (maxW, maxH, quality) {
    return new Promise(function (resolve) {
      if (!fileInput) {
        fileInput = A.el('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.hidden = true;
        document.body.appendChild(fileInput);
      }
      fileInput.value = '';
      fileInput.onchange = function () {
        var file = fileInput.files[0];
        if (!file) return;
        A.compress(file, maxW, maxH, quality).then(resolve, function () {
          A.toast('не удалось открыть фото', true);
        });
      };
      fileInput.click();
    });
  };

  // Уведомление

  var toastEl = null;
  var toastTimer = null;

  A.toast = function (text, isError) {
    if (!toastEl) {
      toastEl = A.el('div', 'a-pill a-toast');
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.toggle('a-pill--danger', !!isError);
    toastEl.classList.toggle('a-pill--dark', !isError);
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2600);
  };

  // Поп-ап подтверждения

  A.confirm = function (question, actionLabel) {
    return new Promise(function (resolve) {
      var wrap = A.el('div', 'a-modal');
      wrap.appendChild(A.el('p', 'a-modal__title', question));
      var actions = A.el('div', 'a-group');
      var no  = A.pill('отмена');
      var yes = A.pill(actionLabel || 'удалить', { className: 'a-pill--dark' });
      actions.appendChild(no);
      actions.appendChild(yes);
      wrap.appendChild(actions);

      function close(result) {
        document.removeEventListener('keydown', onKey);
        wrap.remove();
        resolve(result);
      }
      function onKey(e) { if (e.key === 'Escape') close(false); }

      wrap.addEventListener('click', function (e) { if (e.target === wrap) close(false); });
      no.addEventListener('click',  function () { close(false); });
      yes.addEventListener('click', function () { close(true); });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      yes.focus();
    });
  };

  A.plural = function (n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };

})();
