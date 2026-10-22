# Материалы дисциплин техникума

Сайт со всеми дисциплинами, которые я вёл или веду. Структура:

```
landing (специальности, внутри годы) -> год (список дисциплин) -> дисциплина (план) -> занятие
```

Текущая дисциплина: **УФИС** (МДК.06.03), 4 курс. План на 42 занятия: 21 лекция и
практики на 21 занятие, часть по 180 минут, включая практикумы по ДЭ. Написаны
занятия 1-13 (лекции 1-7 и практики 1-6). Фигуры Anatomy стоят у лекций 1-7 и
практики 1, двухмерные схемы встроены как SVG, тесты работают на странице.

## Специальность и демонстрационный экзамен

Сайт обслуживает специальность 09.02.07 «Информационные системы и программирование».
Актуальный КИМ ДЭ 2027: [БОМ 6506](https://bom.firpo.ru/Public/6506). На экзамене
проверяются ER-диаграмма в 3НФ, база данных с импортом JSON, SQL-запрос с JOIN и
агрегацией, модули ИС с авторизацией и защитой, GET API, коллекция Postman с тестами
200/500/JSON и документация API.

Практики опираются только на доступное ПО: Excel, Word, PowerPoint, VS Code с Python,
Visual Studio 2026 Community, Postman, VirtualBox с учебными Linux и Windows 10,
браузер с draw.io, sqliteonline.com, GitHub, Kaggle, Colab и Google Docs. PlantUML,
StarUML, Enterprise Architect, Visio, PyCharm, MySQL и PostgreSQL в требованиях не
используются.

## Структура репозитория

```
courses/
  2/<slug>/                 дисциплины 2 курса
  3/<slug>/                 дисциплины 3 курса, включая mapo
  4/<slug>/                 дисциплины 4 курса, включая uifis
    course.json             план: карточка, результаты, список занятий
    chapters/01-lek-01/     лекция (chapter.md + figures/)
    reports/                шаблоны отчётов (.docx, .csv)
    dist/                   собранные страницы дисциплины
  _anatomy/                 общий движок фигур Anatomy (не редактировать вручную)
site.json                   карточки курсов для landing
availability.txt            сколько лекций и практик открыто
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

## Доступность занятий

Файл `availability.txt` в корне задаёт, сколько лекций и практик открыто для каждой
дисциплины:

```text
4 курс
Устройство и функционирование информационной системы
    Открытые Лекции = 6
    Открытые Практики = 4

3 курс
Моделирование и анализ программного обеспечения
    Открытые Лекции = 1
    Открытые Практики = 1
```

Занятие открыто, если его порядковый номер среди лекций или практик не больше
указанного числа. Закрытые страницы не собираются в `docs/`, а в плане дисциплины
показывается «закрыто». Если дисциплины нет в файле, открыты все занятия.

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
