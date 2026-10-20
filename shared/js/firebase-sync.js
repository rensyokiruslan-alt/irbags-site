import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

var firebaseConfig = {
  apiKey:            'AIzaSyB2wgaWmptZU061ykxu1dwJ5LkGe7FX9z8',
  authDomain:        'irbags-site.firebaseapp.com',
  projectId:         'irbags-site',
  storageBucket:     'irbags-site.firebasestorage.app',
  messagingSenderId: '46087240674',
  appId:             '1:46087240674:web:c2ba353a1514b0c209d7bb'
};

var PRODUCTS_KEY = 'irbags_products';
var DASHBOARD_KEY = 'irbags_dashboard';
var PHOTOS_KEY    = 'irbags_dashboard_photos';
var FILTERS_KEY   = 'irbags_filters';

var DEFAULT_DASHBOARD = { grid1: [null, null, null, null], grid2: [null, null, null, null] };
var DEFAULT_FILTERS   = ['сумки', 'ремни', 'платки', 'подвесы', 'брелки', 'обложки', 'визитницы'];

var isConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';
var db = null;

if (isConfigured) {
  var app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

// Локальный кэш (то же, что раньше читали страницы напрямую)

function readLocal(key, fallback) {
  try {
    var s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch (e) { return fallback; }
}

function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

/* Запись в облако. Локальная копия уже сохранена до вызова; если Firestore не ответил
   за CLOUD_TIMEOUT или отказал — ошибка с code = 'cloud', чтобы интерфейс предупредил. */
var CLOUD_TIMEOUT = 8000;

function cloud(promise) {
  var timer;
  var timeout = new Promise(function (_, reject) {
    timer = setTimeout(function () { reject(new Error('timeout')); }, CLOUD_TIMEOUT);
  });
  return Promise.race([promise, timeout]).then(function (v) {
    clearTimeout(timer);
    return v;
  }, function (err) {
    clearTimeout(timer);
    var e = new Error('cloud: ' + (err && err.message));
    e.code = 'cloud';
    throw e;
  });
}

// Товары — отдельный документ на каждый товар

async function pullProducts() {
  if (!isConfigured) return readLocal(PRODUCTS_KEY, []);
  try {
    var snap = await getDocs(collection(db, 'irbags_products'));
    if (snap.empty) return readLocal(PRODUCTS_KEY, []);
    var list = [];
    snap.forEach(function (d) { list.push(d.data()); });
    writeLocal(PRODUCTS_KEY, list);
    return list;
  } catch (e) { return readLocal(PRODUCTS_KEY, []); }
}

async function saveProducts(products) {
  writeLocal(PRODUCTS_KEY, products);
  if (isConfigured) {
    await cloud((async function () {
      var existing = await getDocs(collection(db, 'irbags_products'));
      var keepIds = products.map(function (p) { return String(p.id); });
      var deletions = [];
      existing.forEach(function (d) {
        if (keepIds.indexOf(d.id) === -1) deletions.push(deleteDoc(d.ref));
      });
      await Promise.all(deletions);
      await Promise.all(products.map(function (p) {
        return setDoc(doc(db, 'irbags_products', String(p.id)), p);
      }));
    })());
  }
  return products;
}

/* Сохранить один товар (не трогая остальные документы) */
async function saveProduct(product) {
  var list = readLocal(PRODUCTS_KEY, []);
  var idx = list.findIndex(function (p) { return String(p.id) === String(product.id); });
  if (idx === -1) list.push(product); else list[idx] = product;
  writeLocal(PRODUCTS_KEY, list);
  if (isConfigured) await cloud(setDoc(doc(db, 'irbags_products', String(product.id)), product));
  return list;
}

/* Удалить товары по id */
async function deleteProducts(ids) {
  var keys = ids.map(String);
  var list = readLocal(PRODUCTS_KEY, []).filter(function (p) {
    return keys.indexOf(String(p.id)) === -1;
  });
  writeLocal(PRODUCTS_KEY, list);
  if (isConfigured) {
    await cloud(Promise.all(keys.map(function (id) {
      return deleteDoc(doc(db, 'irbags_products', id));
    })));
  }
  return list;
}

// Дашборд (раскладка плиток на главной — только id товаров)

async function pullDashboard() {
  if (!isConfigured) return readLocal(DASHBOARD_KEY, DEFAULT_DASHBOARD);
  try {
    var snap = await getDoc(doc(db, 'irbags', 'dashboard'));
    if (!snap.exists()) return readLocal(DASHBOARD_KEY, DEFAULT_DASHBOARD);
    var data = snap.data();
    writeLocal(DASHBOARD_KEY, data);
    return data;
  } catch (e) { return readLocal(DASHBOARD_KEY, DEFAULT_DASHBOARD); }
}

async function saveDashboard(data) {
  writeLocal(DASHBOARD_KEY, data);
  if (isConfigured) await cloud(setDoc(doc(db, 'irbags', 'dashboard'), data));
  return data;
}

// Фото главной страницы — отдельный документ на каждую секцию

async function pullPhotos() {
  if (!isConfigured) return readLocal(PHOTOS_KEY, {});
  try {
    var snap = await getDocs(collection(db, 'irbags_dashboard_photos'));
    if (snap.empty) return readLocal(PHOTOS_KEY, {});
    var photos = {};
    snap.forEach(function (d) { photos[d.id] = d.data(); });
    writeLocal(PHOTOS_KEY, photos);
    return photos;
  } catch (e) { return readLocal(PHOTOS_KEY, {}); }
}

async function savePhoto(key, photoData) {
  var photos = readLocal(PHOTOS_KEY, {});
  photos[key] = photoData;
  writeLocal(PHOTOS_KEY, photos);
  if (isConfigured) await cloud(setDoc(doc(db, 'irbags_dashboard_photos', key), photoData));
  return photos;
}

// Фильтры (категории товаров)

async function pullFilters() {
  if (!isConfigured) return readLocal(FILTERS_KEY, DEFAULT_FILTERS.slice());
  try {
    var snap = await getDoc(doc(db, 'irbags', 'filters'));
    if (!snap.exists()) return readLocal(FILTERS_KEY, DEFAULT_FILTERS.slice());
    var names = snap.data().names || DEFAULT_FILTERS.slice();
    writeLocal(FILTERS_KEY, names);
    return names;
  } catch (e) { return readLocal(FILTERS_KEY, DEFAULT_FILTERS.slice()); }
}

async function saveFilters(names) {
  writeLocal(FILTERS_KEY, names);
  if (isConfigured) await cloud(setDoc(doc(db, 'irbags', 'filters'), { names: names }));
  return names;
}

// Публичный API

/* ready — промис первичной загрузки; админка ждёт его перед рендером */
var ready = Promise.all([pullProducts(), pullDashboard(), pullPhotos(), pullFilters()])
  .catch(function () { /* offline / нет конфига — остаёмся на localStorage */ });

// Вход администратора (Firebase Authentication). Модуль подгружается только в админке.
// Почта служебная и общая для админки; пользователь вводит только пароль.
var ADMIN_EMAIL = 'admin@irbags.site';
var AUTH_URL = 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
var authPromise = null;

function loadAuth() {
  if (!authPromise) {
    authPromise = import(AUTH_URL).then(function (m) {
      var auth = m.getAuth(app);
      return new Promise(function (resolve) {
        // первый вызов — восстановленная сессия (или её отсутствие)
        var off = m.onAuthStateChanged(auth, function () { off(); resolve({ m: m, auth: auth }); });
      });
    });
  }
  return authPromise;
}

async function currentAdmin() {
  if (!isConfigured) return null;
  var a = await loadAuth();
  return a.auth.currentUser;
}

async function signIn(password) {
  var a = await loadAuth();
  return a.m.signInWithEmailAndPassword(a.auth, ADMIN_EMAIL, password);
}

async function signOut() {
  if (!isConfigured) return;
  var a = await loadAuth();
  return a.m.signOut(a.auth);
}

window.IrbagsDB = {
  isConfigured: isConfigured,
  ready: ready,
  currentAdmin: currentAdmin,
  signIn: signIn,
  signOut: signOut,
  saveProducts: saveProducts,
  saveProduct: saveProduct,
  deleteProducts: deleteProducts,
  saveDashboard: saveDashboard,
  savePhoto: savePhoto,
  saveFilters: saveFilters
};

await ready;
