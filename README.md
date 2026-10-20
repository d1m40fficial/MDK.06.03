# Материалы дисциплин техникума

Сайт со всеми дисциплинами, которые я вёл или веду. Структура трёхуровневая:

```
landing (3 карточки курсов) -> год (список дисциплин) -> дисциплина (план) -> занятие
```

Текущая дисциплина: **УФИС** (МДК.06.03), 4 курс. План на 42 занятия: 21 лекция и
14 практических работ, семь из них занимают два занятия. Написаны занятия 1-10
(лекции 1-6 и практики 1-4). Фигуры Anatomy стоят у лекций 1-6 и практики 1,
двухмерные схемы встроены как SVG, тесты работают на странице.

## Структура репозитория

```
courses/
  2/<slug>/                 дисциплины 2 курса
  3/<slug>/                 дисциплины 3 курса
  4/uifis/                  УФИС (МДК.06.03), 4 курс
    course.json             план: карточка, результаты, список занятий
    chapters/01-lek-01/     лекция (chapter.md + figures/)
    reports/                шаблоны отчётов (.docx, .csv)
    dist/                   собранные страницы дисциплины
  _anatomy/                 общий движок фигур Anatomy (не редактировать вручную)
site.json                   карточки курсов для landing
docs/                       итоговый сайт для GitHub Pages
.opencode/skills/course-studio/   объединённый скилл (Course Studio + Anatomy + Visualise)
AGENTS.md                   памятка для любого агента, работающего с репозиторием
tools/
  build_site.py             сборка сайта в docs/
  new_discipline.py         создать дисциплину и её worktree
  worktree.py               отдельный git worktree на дисциплину
  ks/                       движок сборки страниц (с русской локализацией)
_reference/miapo/           старые личные заметки, в git не входят, только для сверки
```

## Как добавить дисциплину

Каждая дисциплина разрабатывается в своём worktree и ветке, чтобы несколько агентов
могли писать разные дисциплины одновременно.

```powershell
$env:PYTHONUTF8=1
python tools/new_discipline.py 3 otp --title "Основы теории прочности" --code "ОТП"
```

Скрипт создаёт worktree `../mdk-worktrees/3-otp`, ветку `discipline/3/otp` и
`courses/3/otp/course.json`. Заполните план, пишите занятия по одному, коммитьте в
ветке и влейте её в `main`, когда дисциплина готова к публикации.

Отдельно только worktree:

```powershell
python tools/worktree.py add 3 otp
python tools/worktree.py list
python tools/worktree.py remove 3 otp
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
python tools/ks/scripts/check_pages.py courses/4/uifis/dist
python tools/ks/scripts/check_pages.py courses/4/uifis/dist --mobile
python tools/ks/scripts/check_pages.py courses/4/uifis/dist --dark
```

Отдельная страница занятия собирается так:

```powershell
python tools/ks/scripts/build_chapter.py courses/4/uifis/chapters/01-lek-01/chapter.md
```

## Скиллы

Три скилла установлены глобально (`~/.config/opencode/skills/`): `course-studio`,
`anatomy`, `visualise`. В репозитории они объединены в один скилл
`.opencode/skills/course-studio/`, который агент находит автоматически и читает по
`AGENTS.md`. Он описывает план дисциплин, написание занятий, построение фигур Anatomy,
лёгкие схемы Visualise, структуру сайта и работу с worktree.

Старые диаграммы Excalidraw из `_reference/miapo/` были нужны только чтобы получить
скриншоты для лекций. В публикуемых занятиях их заменяют фигуры Anatomy или SVG
(Visualise), при необходимости с 3D-режимом Anatomy.

## Публикация на GitHub Pages

1. В ветке `main` включите **Settings → Pages → Source: GitHub Actions**.
2. Workflow `.github/workflows/pages.yml` сам вызовет `python tools/build_site.py` и
   опубликует `docs/`.
3. Итоговый адрес: `https://d1m40fficial.github.io/MDK.06.03/`.

## Правило оформления

В текстах занятий не используются длинное тире и одиночный дефис как тире. Проверка
страниц (`check_pages.py`) и сборка главы сообщают о таких случаях.
