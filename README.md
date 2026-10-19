# Устройство и функционирование информационной системы (МДК.06.03)

Учебные материалы дисциплины для специальности 09.02.07: 21 лекция и 21 практическая
работа. Каждое занятие это отдельная страница; 3D-схемы собраны движком Anatomy,
двухмерные схемы встроены как SVG, тесты и вопросы для самопроверки работают прямо
на странице.

## Что уже готово

- Учебный план на 42 занятия (21 лекция + 21 практика), дисциплина `uifis`.
- Лекция 1: «Информация, данные и информационная система» с тестом.
- Практика 1: «Классификация информационных систем» с методическими указаниями,
  схемами, местами под скриншоты и шаблоном отчёта.
- Готовый к публикации статический сайт в `docs/`.

## Структура

```
courses/uifis/
  course.json                 план: список всех 42 занятий
  chapters/01-lek-01/         лекция 1 (chapter.md + figures/)
  chapters/02-prakt-01/       практика 1 (chapter.md + figures/)
  reports/                    шаблоны отчётов (.docx)
  dist/                       собранные страницы курса
docs/                         итоговый сайт для GitHub Pages
tools/ks/                     движок сборки страниц (с русской локализацией)
tools/build_site.py           сборка сайта в docs/
```

## Локальная сборка

Нужны Python 3.12+, Node.js и зависимости `markdown pygments pyyaml python-docx`.

```powershell
$env:PYTHONUTF8=1
pip install markdown pygments pyyaml python-docx
python tools/build_site.py
```

Проверка страниц в headless-браузере (нужен `playwright install chromium`):

```powershell
python tools/ks/scripts/check_pages.py courses/uifis/dist
python tools/ks/scripts/check_pages.py courses/uifis/dist --mobile
python tools/ks/scripts/check_pages.py courses/uifis/dist --dark
```

Отдельная страница занятия собирается так:

```powershell
python tools/ks/scripts/build_chapter.py courses/uifis/chapters/01-lek-01/chapter.md
```

## Публикация на GitHub Pages

1. Создайте репозиторий и запушьте ветку `main`:

   ```powershell
   git init
   git add .
   git commit -m "Курс УФИС: план, лекция 1 и практика 1"
   git branch -M main
   git remote add origin https://github.com/d1m40fficial/<repo>.git
   git push -u origin main
   ```

2. В настройках репозитория: **Settings → Pages → Source: GitHub Actions**.
   Workflow `.github/workflows/pages.yml` соберёт сайт и опубликует `docs/`.

3. Итоговый адрес: `https://d1m40fficial.github.io/<repo>/`.

## Правило оформления

В текстах занятий не используются длинное тире и одиночный дефис как тире. Проверка
страниц (`check_pages.py`) сообщает о таких случаях.
