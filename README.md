# irbags — assets

Шрифты и цветовые токены для проекта **irbags | noomai studio**.
Извлечено из Figma (`main 1920`, node `67:26`).

## Структура

```
irbags-assets/
├── fonts/
│   ├── HelveticaNeue-Thin.{otf,woff}      // 100
│   ├── HelveticaNeue-Light.{otf,woff}     // 300
│   ├── HelveticaNeue-Roman.{otf,woff}     // 400
│   ├── HelveticaNeue-Medium.{otf,woff}    // 500  ← основной в макете
│   └── HelveticaNeue-Bold.{otf,woff}      // 700
├── css/
│   ├── fonts.css      // @font-face для всех 5 начертаний
│   └── tokens.css     // CSS-переменные: цвета, типографика, layout
├── site/              // витрина (см. START.md)
├── admin/             // админка (см. START.md)
└── README.md
```

## Подключение

```html
<link rel="stylesheet" href="css/fonts.css">
<link rel="stylesheet" href="css/tokens.css">
```

После этого по умолчанию `body` уже использует Helvetica Neue Medium 20/–0.4px lowercase на белом — как в макете.

## Палитра

| Токен | HEX | Где используется |
|---|---|---|
| `--color-white` / `--color-bg` | `#ffffff` | фон страницы |
| `--color-black` / `--color-text` | `#000000` | весь текст |
| `--color-gray-100` / `--color-surface` | `#efefef` | hero, плейсхолдеры карточек, нижний блок |
| `--color-gray-200` | `#e4e4e4` | левая колонка двойного блока |
| `--color-gray-300` | `#d7d7d7` | правая колонка двойного блока |

Градация прозрачности на карточках товаров: **1.0 → 0.7 → 0.5 → 0.3**
(`--opacity-card-1…4`).

## Типографика

| Токен | Значение |
|---|---|
| `--font-family-base` | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| `--font-weight-medium` | `500` (по умолчанию) |
| `--font-size-body` | `20px` (меню, футер, цены) |
| `--font-size-lead` | `35px` (текст-манифест) |
| `--letter-spacing-body` | `-0.4px` |
| `--letter-spacing-lead` | `-0.7px` |
| `--text-transform-default` | `lowercase` |

## О форматах

- **`.woff`** — основной для веба (поддержка во всех современных браузерах).
- **`.otf`** — fallback, тот же файл что вы загрузили.
- **`.woff2`** *здесь не сгенерирован* — для него нужен модуль `brotli`,
  которого нет в этом окружении (нет доступа в сеть для установки).
  Когда будете деплоить, пережмите локально:

  ```bash
  pip install fonttools brotli
  python -c "from fontTools.ttLib import TTFont; \
             import glob; \
             [TTFont(f).save(f.replace('.otf', '.woff2'), reorderTables=False) \
              or open(f.replace('.otf', '.woff2'), 'rb') for f in glob.glob('fonts/*.otf')]"
  ```

  …или проще — через `pyftsubset` / `woff2_compress` из Google. После этого
  добавьте `url("../fonts/*.woff2") format("woff2")` первой строкой в каждом
  `@font-face` в `fonts.css`.

## Лицензия шрифта

Helvetica Neue — коммерческий шрифт Linotype/Monotype. Убедитесь, что у проекта
есть валидная лицензия на веб-использование, прежде чем выкатывать в продакшен.
