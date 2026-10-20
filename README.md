# irbags

Интернет-магазин irbags: публичная витрина и панель администратора.
Статический фронтенд на HTML, CSS и JavaScript без сборки; данные хранятся
в Firebase Firestore, заказы и остатки выгружаются в Google Таблицу.

## Структура

```
.
├── site/                  витрина
│   ├── *.html             страницы: главная, магазин, товар, корзина, оформление и др.
│   ├── css/
│   └── js/
├── admin/                 панель администратора
│   ├── index.html         вход
│   ├── products.html      товары
│   ├── product-create.html  создание и редактирование товара
│   ├── product-select.html  выбор товара для блока на главной
│   ├── dashboard.html     раскладка главной страницы
│   ├── filters.html       категории
│   ├── migrate.html       перенос локальных данных в Firestore
│   ├── css/
│   ├── js/
│   └── img/
├── shared/                общие ресурсы витрины и админки
│   ├── css/               fonts.css, tokens.css (дизайн-токены)
│   ├── js/                firebase-sync.js (синхронизация с Firestore)
│   └── fonts/             Helvetica Neue (woff, otf)
└── apps-script/
    └── Code.gs            Google Apps Script: заказы и остатки
```

## Локальный запуск

Страницы используют ES-модули, поэтому их нужно открывать через веб-сервер,
а не напрямую из файловой системы:

```bash
npx http-server .        # или: python -m http.server 8000
```

- витрина — `http://localhost:8000/site/`
- админка — `http://localhost:8000/admin/`

## Данные

| Коллекция / документ Firestore | Ключ localStorage           | Содержимое                          |
|--------------------------------|-----------------------------|-------------------------------------|
| `irbags_products/{id}`         | `irbags_products`           | товары                              |
| `irbags/dashboard`             | `irbags_dashboard`          | товары в блоках главной страницы    |
| `irbags_dashboard_photos/{key}`| `irbags_dashboard_photos`   | фото главной страницы               |
| `irbags/filters`               | `irbags_filters`            | категории                           |

localStorage используется как кэш: при загрузке страницы `shared/js/firebase-sync.js`
подтягивает свежие данные из Firestore. Корзина (`irbags_cart`) хранится только локально.

Товар:

```js
{
  id, name, description, size, shortDescr,
  categories: ['сумки'],
  variants: [
    { color, price, discount, stock, photos: [/* до 6 data URL */] }
  ]
}
```

`stock` — количество товара данного цвета. Фото хранятся в Firestore в виде
сжатых JPEG data URL (лимит документа — 1 МБ).

Конфигурация Firebase — в `shared/js/firebase-sync.js`.

## Google Apps Script

`apps-script/Code.gs` — веб-приложение, привязанное к Google Таблице:

- запрос от оформления заказа добавляет строку на лист «Заказы»;
- запрос `{ type: 'stock', rows }` из админки перезаписывает лист «Остатки»
  (одна строка на каждый цвет товара: ID, название, категория, цвет,
  количество, цена, скидка, дата обновления).

Первый деплой:

1. Google Таблица → Extensions → Apps Script, вставить `Code.gs`.
2. Deploy → New deployment → Web app; Execute as: Me; Who has access: Anyone.
3. URL деплоя прописать в `SCRIPT_URL` в `site/js/checkout.js` и `admin/js/common.js`.

Обновление кода без смены URL: Deploy → Manage deployments → Edit →
Version: New version → Deploy.

## Дизайн-токены

`shared/css/tokens.css`:

| Токен              | Значение   | Назначение                          |
|--------------------|------------|-------------------------------------|
| `--color-white`    | `#ffffff`  | фон                                 |
| `--color-black`    | `#000000`  | текст                               |
| `--color-gray-100` | `#efefef`  | плейсхолдеры изображений            |
| `--color-gray-200` | `#e4e4e4`  | второстепенные блоки                |
| `--color-gray-300` | `#d7d7d7`  | второстепенные блоки                |
| `--color-error`    | `#ff4646`  | ошибки                              |
| `--font-size-body` | `20px`     | основной текст                      |
| `--font-size-lead` | `35px`     | крупный текст                       |

Шрифт — Helvetica Neue Medium, весь текст в нижнем регистре.
Макеты рассчитаны на ширину 1920px; страницы масштабируются через `js/scale.js`.

## Доступ к админке

Вход — одно поле «пароль». Пароль проверяет Firebase Authentication: админка входит
под служебной учётной записью `admin@irbags.site` (задана в `shared/js/firebase-sync.js`).
Сменить пароль: Firebase Console → Authentication → Users → `admin@irbags.site` → Reset password.

Правила Firestore: чтение открыто для всех, запись — только для этой учётной записи.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.email == 'admin@irbags.site';
    }
  }
}
```

Самостоятельная регистрация пользователей должна быть выключена:
Authentication → Settings → User actions → Enable create (sign-up).

## Известные ограничения

- Веб-приложение Apps Script принимает запросы без авторизации: лист «Остатки»
  может перезаписать любой, кто знает его адрес.
- Helvetica Neue — коммерческий шрифт; для веб-использования нужна лицензия.
