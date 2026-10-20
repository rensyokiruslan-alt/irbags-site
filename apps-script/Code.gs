/**
 * Web app: приём заказов (лист «Заказы») и остатков из админки (лист «Остатки»).
 * Деплой — см. README.md, раздел «Google Apps Script».
 */

var STOCK_HEADER = [
  'ID', 'Название', 'Категория', 'Цвет', 'Количество', 'Цена', 'Скидка', 'Обновлено'
];

var MAX_FIELD_LENGTH = 2000;
var MAX_STOCK_ROWS   = 5000;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.type === 'stock') {
      writeStock(Array.isArray(data.rows) ? data.rows : []);
      return json({ status: 'ok' });
    }

    writeOrder(data);
    return json({ status: 'ok' });

  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

/* Текст из запроса → безопасное значение ячейки.
   Строки, начинающиеся с = + - @, таблица выполнила бы как формулу
   (например, =IMPORTXML(...) в имени покупателя) — пишем их как текст. */
function cell(value) {
  var s = String(value == null ? '' : value).slice(0, MAX_FIELD_LENGTH);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
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
    cell(data.date),
    cell(data.phone),
    cell(data.email),
    cell(data.delivery),
    cell(data.firstName),
    cell(data.lastName),
    cell(data.address),
    cell(data.city),
    cell(data.payment),
    cell(data.items),
    cell(data.total)
  ]);
}

/* Лист «Остатки» — одна строка на каждый цвет каждого товара */
function writeStock(rows) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Остатки') || ss.insertSheet('Остатки');

  rows = rows.slice(0, MAX_STOCK_ROWS);

  sheet.clearContents();
  sheet.getRange(1, 1, 1, STOCK_HEADER.length).setValues([STOCK_HEADER]);
  sheet.setFrozenRows(1);

  if (!rows.length) return;

  var values = rows.map(function (r) {
    r = r || {};
    var stock = parseInt(r.stock, 10);
    return [
      cell(r.id),
      cell(r.name),
      cell(r.category),
      cell(r.color),
      isNaN(stock) || stock < 0 ? 0 : stock,
      cell(r.price),
      cell(r.discount),
      cell(r.updated)
    ];
  });
  sheet.getRange(2, 1, values.length, STOCK_HEADER.length).setValues(values);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
