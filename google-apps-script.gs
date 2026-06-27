/**
 * irbags — Google Apps Script для приёма заказов
 *
 * Инструкция по деплою:
 * 1. Откройте Google Таблицы → Extensions → Apps Script
 * 2. Вставьте этот код, сохраните
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Скопируйте URL деплоя
 * 5. Вставьте его в js/checkout.js в переменную SCRIPT_URL
 */

function doPost(e) {
  try {
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

    var data = JSON.parse(e.postData.contents);

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

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
