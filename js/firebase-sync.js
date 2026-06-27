/* ==========================================================================
   irbags — синхронизация общих данных (товары, дашборд, фото, фильтры)
   через Firebase (Firestore + Storage), чтобы админка и сайт показывали
   одно и то же на любом устройстве, а не только в localStorage браузера.

   Корзина (irbags_cart) НЕ синхронизируется — она остаётся личной для
   каждого посетителя на каждом устройстве.

   ВАЖНО: ниже нужно вставить свой конфиг из Firebase Console
   (Project settings → General → Your apps → Web app → SDK setup and
   configuration → Config). Пока тут заглушка — без реального конфига
   сайт продолжит работать на localStorage как раньше (offline-режим).
   ========================================================================== */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import {
  getStorage, ref, uploadString, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js';

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
var storage = null;

if (isConfigured) {
  var app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
}

/* ─── Локальный кэш (то же, что раньше читали страницы напрямую) ───────── */

function readLocal(key, fallback) {
  try {
    var s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch (e) { return fallback; }
}

function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

/* ─── Загрузка фото в Storage (если это data: URL) ─────────────────────── */

async function uploadIfDataUrl(value, path) {
  if (!value || typeof value !== 'string' || value.indexOf('data:') !== 0) return value;
  var fileRef = ref(storage, path);
  await uploadString(fileRef, value, 'data_url');
  return await getDownloadURL(fileRef);
}

/* ─── Товары (массив, photos[] может содержать data: URL для загрузки) ─── */

async function pullProducts() {
  if (!isConfigured) return readLocal(PRODUCTS_KEY, []);
  try {
    var snap = await getDoc(doc(db, 'irbags', 'products'));
    /* Если в облаке ещё ничего нет — не трогаем локальные данные
       (иначе при первом подключении затёрли бы их пустотой). */
    if (!snap.exists()) return readLocal(PRODUCTS_KEY, []);
    var list = snap.data().list || [];
    writeLocal(PRODUCTS_KEY, list);
    return list;
  } catch (e) { return readLocal(PRODUCTS_KEY, []); }
}

async function saveProducts(products) {
  if (isConfigured) {
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (!p.photos) continue;
      for (var j = 0; j < p.photos.length; j++) {
        p.photos[j] = await uploadIfDataUrl(p.photos[j], 'products/' + p.id + '/' + j + '.jpg');
      }
    }
    await setDoc(doc(db, 'irbags', 'products'), { list: products });
  }
  writeLocal(PRODUCTS_KEY, products);
  return products;
}

/* ─── Дашборд (раскладка плиток на главной) ─────────────────────────────── */

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
  if (isConfigured) {
    await setDoc(doc(db, 'irbags', 'dashboard'), data);
  }
  writeLocal(DASHBOARD_KEY, data);
  return data;
}

/* ─── Фото главной страницы (hero, две колонки, полные фото) ───────────── */

async function pullPhotos() {
  if (!isConfigured) return readLocal(PHOTOS_KEY, {});
  try {
    var snap = await getDoc(doc(db, 'irbags', 'dashboardPhotos'));
    if (!snap.exists()) return readLocal(PHOTOS_KEY, {});
    var data = snap.data();
    writeLocal(PHOTOS_KEY, data);
    return data;
  } catch (e) { return readLocal(PHOTOS_KEY, {}); }
}

async function savePhoto(key, photoData) {
  var photos = readLocal(PHOTOS_KEY, {});
  if (isConfigured) {
    photoData = Object.assign({}, photoData);
    photoData.src = await uploadIfDataUrl(photoData.src, 'dashboard/' + key + '.jpg');
    photos[key] = photoData;
    await setDoc(doc(db, 'irbags', 'dashboardPhotos'), photos);
  } else {
    photos[key] = photoData;
  }
  writeLocal(PHOTOS_KEY, photos);
  return photos;
}

/* ─── Фильтры (категории товаров) ───────────────────────────────────────── */

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
  if (isConfigured) {
    await setDoc(doc(db, 'irbags', 'filters'), { names: names });
  }
  writeLocal(FILTERS_KEY, names);
  return names;
}

/* ─── Публичный API ──────────────────────────────────────────────────────── */

window.IrbagsDB = {
  isConfigured: isConfigured,
  saveProducts: saveProducts,
  saveDashboard: saveDashboard,
  savePhoto: savePhoto,
  saveFilters: saveFilters
};

/* Подтягиваем свежие данные из Firestore в localStorage ДО того, как
   выполнятся остальные (deferred) скрипты страницы — поэтому top-level
   await, а сам этот скрипт подключается как type="module" перед ними. */
try {
  await Promise.all([pullProducts(), pullDashboard(), pullPhotos(), pullFilters()]);
} catch (e) { /* offline / нет конфига — остаёмся на localStorage */ }
