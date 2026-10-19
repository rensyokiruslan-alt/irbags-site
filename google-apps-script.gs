/**
 * irbags — Google Apps Script: приём заказов + остатки товаров
 *
 * Инструкция по деплою:
 * 1. Откройте Google Таблицы → Extensions → Apps Script
 * 2. Вставьте этот код, сохраните
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Скопируйте URL деплоя
 * 5. Вставьте его в site/js/checkout.js и admin/js/common.js в SCRIPT_URL
 *
 * Обновление кода без смены URL:
 * Deploy → Manage deployments → ✎ (edit) → Version: New version → Deploy
 *
 * Запросы:
 *   { type: 'stock', rows: [...] } — админка: полностью перезаписывает лист «Остатки»
 *   { date, phone, ... }           — сайт: новый заказ на лист «Заказы»
 */

var STOCK_HEADER = [
  'ID', 'Название', 'Категория', 'Цвет', 'Количество', 'Цена', 'Скидка', 'Обновлено'
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.type === 'stock') {
      writeStock(data.rows || []);
      return json({ status: 'ok' });
    }

    writeOrder(data);
    return json({ status: 'ok' });

  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

function writeOrder(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Заказы');

  if (!sheet) {
    sheet = ss.insertSheet('Заказы');
    sheet.appendRow([
      'Дата', 'Телефон', 'Почта',
      'Доставка', 'Имя', 'Фамилия', 'Адрес', 'Город',
      'Оплата', 'Товары', 'Итого'
    ]);
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    data.date      || '',
    data.phone     || '',
    data.email     || '',
    data.delivery  || '',
    data.firstName || '',
    data.lastName  || '',
    data.address   || '',
    data.city      || '',
    data.payment   || '',
    data.items     || '',
    data.total     || ''
  ]);
}

/* Лист «Остатки» — одна строка на каждый цвет каждого товара */
function writeStock(rows) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Остатки') || ss.insertSheet('Остатки');

  sheet.clearContents();
  sheet.getRange(1, 1, 1, STOCK_HEADER.length).setValues([STOCK_HEADER]);
  sheet.setFrozenRows(1);

  if (!rows.length) return;

  var values = rows.map(function (r) {
    return [
      String(r.id || ''),
      r.name     || '',
      r.category || '',
      r.color    || '',
      Number(r.stock) || 0,
      r.price    || '',
      r.discount || '',
      r.updated  || ''
    ];
  });
  sheet.getRange(2, 1, values.length, STOCK_HEADER.length).setValues(values);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
