# AGENTS.md: репозиторий MDK.06.03

Сайт со всеми дисциплинами техникума. Работай по локальному скиллу
`.opencode/skills/course-studio/SKILL.md`: это объединённый скилл Course Studio +
Anatomy + Visualise, он описывает план дисциплин, написание занятий, построение фигур и
сборку сайта. Прочитай его перед любой задачей про курсы, лекции, практики, схемы,
фигуры, план дисциплины или сборку сайта.

## Что где лежит

- `courses/<year>/<slug>/course.json`: план дисциплины (карточка, результаты, занятия).
  Годы: `courses/2/`, `courses/3/`, `courses/4/`; текущая дисциплина: `courses/4/uifis/`.
- `courses/<year>/<slug>/chapters/<nn-slug>/`: занятие: `chapter.md` + `figures/<fig-id>/`.
- `site.json`: карточки курсов для landing.
- `availability.txt`: сколько лекций и практик открыто для каждой дисциплины.
- `docs/`: сгенерированный сайт. **Не редактировать вручную**: правь источники и запускай
  `python tools/build_site.py` (на Windows сначала `$env:PYTHONUTF8=1`).
- `_reference/miapo/`: старые личные заметки, в git не входят; только опорный материал
  для сверки, публиковать их нельзя.
- `.opencode/skills/course-studio/`: объединённый скилл; `anatomy/` внутри него: движок
  фигур, `references/visualise/`: лёгкие SVG/HTML-схемы.
- `tools/new_discipline.py` и `tools/worktree.py`: дисциплина и её отдельный worktree.

## Главные правила

- Одна дисциплина = одна папка `courses/<year>/<slug>/` + своё поле `"year"` в `course.json`.
- Каждая дисциплина разрабатывается в своём worktree и ветке `discipline/<year>/<slug>`,
  чтобы агенты работали параллельно. Готовую ветку вливают в `main` перед публикацией.
- Сайт генерируется: landing (3 карточки курсов) → год (список дисциплин) → дисциплина
  (план) → занятие. Не правь `docs/` вручную.
- Фигуры: движок Anatomy (`anatomy/`) для главной фигуры занятия, Visualise
  (`references/visualise/`) для лёгких схем, таблиц, графиков и виджетов. Excalidraw не
  используем: старые диаграммы заменяем на Anatomy/SVG (при необходимости 3D).
- Никаких длинных тире и одиночного дефиса как тире в текстах, `course.json`, брифах и
  подписях фигур. Это проверяют сборка главы и `check_pages.py`.
- Доступность занятий задаётся в `availability.txt`: занятие с номером больше
  указанного не собирается в `docs/` и помечается в плане как закрытое.
- Не коммить `_reference/` и личные заметки; не трогай `courses/_anatomy/` руками.

## Частые команды

```powershell
$env:PYTHONUTF8=1
python tools/build_site.py                 # собрать сайт в docs/
python tools/new_discipline.py 3 otp --title "..." --code "ОТП"
python tools/worktree.py add 3 otp         # только worktree
python tools/ks/scripts/build_chapter.py courses/4/uifis/chapters/01-lek-01/chapter.md
```

## Навыки, доступные агенту

Три исходных скилла также установлены глобально: `course-studio`, `anatomy`,
`visualise` в `~/.config/opencode/skills/`. Внутри этого репозитория приоритет у
локального `.opencode/skills/course-studio/`.
