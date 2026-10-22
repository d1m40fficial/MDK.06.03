---
name: course-studio
description: Use in the MDK repository (d1m40fficial/MDK.06.03) to plan and write disciplines, courses, syllabi, lesson plans, lectures, practices, chapters and notes for the technical college, and to build the static GitHub Pages site under docs/. Combines three skills into one, namely Course Studio (course.json, chapters, page building), Anatomy (interactive isometric SVG figures whose working is the concept, bundled in anatomy/) and Visualise (inline SVG/HTML diagrams, charts and widgets, in references/visualise/). Trigger on Russian or English requests such as «дисциплина», «курс», «план дисциплины», «лекция», «практика», «занятие», «методичка», «добавь дисциплину», «сделай фигуру», «нарисуй схему», "add a discipline", "write lesson 4", "build the course site", "make a figure for this lecture".
license: MIT
compatibility: Repository-local merged skill. Bundles the Anatomy figure engine (MIT) and references for Visualise. Needs Python 3.9+ with markdown, pyyaml, pygments, python-docx (playwright + Chromium for page checks) and Node.js 20.10+ for figures.
---

# Course Studio (merged: Course Studio + Anatomy + Visualise)

This is the repository-local skill for `d1m40fficial/MDK.06.03`, the website of all
disciplines taught at the technical college. It merges three skills into one place so
any agent working with this repository can discover and use them:

- **Course Studio**: plans a discipline, writes its syllabus, lectures and practices,
  and builds the HTML pages. Sources: `course-design.md`, `writing.md`, `figures.md`,
  `object-atlas.md`, `scripts/`, `assets/`, `examples/`.
- **Anatomy**: builds the interactive isometric SVG figures. The engine is bundled in
  `anatomy/` (kit, scripts, references, examples); its guide is `anatomy/ANATOMY.md`.
  Read it before building any figure.
- **Visualise**: renders lighter inline SVG diagrams, charts and HTML widgets when a
  full Anatomy machine would be overkill. Sources: `references/visualise/` (read
  `design-system.md` first, then `diagrams.md`, `components.md` or `charts.md`).

The original three skills are also installed globally in `~/.config/opencode/skills/`
(`course-studio`, `anatomy`, `visualise`); this repository copy is the merged, project
specific one and takes precedence inside this repo.

## Project structure (read this first)

```
courses/
  2/<discipline>/            year 2 disciplines
  3/<discipline>/            year 3 disciplines
  4/uifis/                   year 4, current discipline (УФИС, МДК.06.03)
    course.json              card, outcomes, syllabus, chapters
    chapters/<nn-slug>/      chapter.md + figures/<fig-id>/
    reports/                 report templates (.docx, .csv)
  _anatomy/                  shared vendored Anatomy engine (do not edit by hand)
_reference/miapo/            old personal notes, ignored by git, read-only reference
tools/
  build_site.py              builds docs/ (landing, year pages, course pages)
  new_discipline.py          scaffolds a discipline and its worktree
  worktree.py                one git worktree per discipline
  ks/                        page engine (Russian locale)
docs/                        generated site for GitHub Pages (do not edit by hand)
site.json                    specialties and their year cards on the landing page
availability.txt             open lectures and practicals per discipline (when present)
.opencode/skills/course-studio/   this merged skill
AGENTS.md                    entry point for any agent
```

## Specialty 09.02.07 and the 2027 demo exam

This repository serves SPO specialty 09.02.07 «Информационные системы и
программирование», qualification «Специалист по информационным системам». The current
demo exam is KIM 09.02.07-5-2027 in BOM 6506:
https://bom.firpo.ru/Public/6506. Read it before planning or rewriting a discipline.

Exam structure:

- PA, 1 h 10 min, 3 tasks: ER diagram in 3NF saved as PDF; database with tables,
  constraints and JSON import; SQL query with JOIN and aggregation.
- GIA basic level, 3 h 30 min, 6 tasks: the three PA tasks; IS modules (authorization,
  user blocking, smart captcha, admin CRUD, uniqueness, GUI); a GET API that transforms
  database data and is published at a URL; a Postman collection with tests for 200, 500
  and valid JSON; API documentation from the supplied template.
- The evaluated competencies include PK 2.2-2.4, 5.1-5.4, 7.1-7.4 and 11.1-11.5, plus
  OK 01, 02, 04 and 09. MAPO contributes requirements, ER/3NF, SQL, API design, Postman
  tests and documentation; UIFIS contributes IS composition, architecture, DBMS,
  networks, security and operation.
- Every practical task must end in an exam artefact: ER PDF, database script, SQL
  script, running application, Postman collection, Word document or PowerPoint deck.

Available software policy:

- Use only Excel, Word, PowerPoint; VS Code with Python; Visual Studio 2026 Community;
  Postman; VirtualBox with the learning Linux and Windows 10 images; a browser with
  draw.io, sqliteonline.com, GitHub, Kaggle, Colab and Google Docs.
- Do not require PlantUML, StarUML, Enterprise Architect, Visio, PyCharm, a MySQL or
  PostgreSQL server, or paid cloud services.
- Host PC settings are locked by the administrator. Run OS and system labs inside
  VirtualBox; use NAT and port forwarding, never host-only adapters, admin rights or
  Windows changes on the host.
- Diagrams: draw.io. Database: SQLite through Python or sqliteonline.com, or LocalDB if
  it is present in Visual Studio. API: Python with Flask/FastAPI in VS Code, or ASP.NET
  Core in Visual Studio. Tests: Postman. Documentation: Word and PowerPoint. Version
  control: GitHub. Operating systems: VirtualBox with the learning Linux and Windows 10
  images.

Rules that always hold:

- One discipline is one folder `courses/<year>/<slug>/` with one `course.json` and a
  `"year"` field. Keep the slug lowercase Latin. `"code"` is the official discipline code
  (`ОП.01`, `МДК.03.01`), not a short label; the card and hero show it. Every course also
  has `"assessment": "Зачёт"` or `"Экзамен"`.
- `"status": "available"` shows «Доступно». `"status": "planned"` shows «Не готово»
  and a light transparency on the discipline card.
- The site is generated: never edit `docs/` directly; edit sources and run
  `python tools/build_site.py` (set `$env:PYTHONUTF8=1` on Windows).
- No em dashes and no single hyphen used as a dash in generated prose, `course.json`,
  briefs or figure captions. `build_chapter.py` and `check_pages.py` warn about them.
- Do not push the old `_reference/miapo/` notes; they are reference material only.
- Each discipline should be developed in its own git worktree and branch (below) so
  several agents can write different disciplines at the same time.

## Worktrees: one per discipline

Each discipline gets its own worktree and branch. That lets parallel agents commit
different disciplines without fighting over one working tree.

```powershell
# from the repository root
python tools/worktree.py add 3 otp          # worktree at ../mdk-worktrees/3-otp, branch discipline/3/otp
python tools/worktree.py list
python tools/worktree.py remove 3 otp
```

`tools/new_discipline.py` does both steps in one go and writes a starter `course.json`:

```powershell
python tools/new_discipline.py 3 otp --title "Основы теории прочности" --code "ОТП"
```

Work in the worktree, commit there, and merge the discipline branch into `main` when the
discipline is ready. `docs/` is rebuilt from `main`, so finished disciplines are merged
into `main` before publishing.

## Decide the scope first

| The user asks for | You produce | Read |
|---|---|---|
| a new discipline, its plan or syllabus ("добавь дисциплину", "план дисциплины") | worktree + `courses/<year>/<slug>/course.json` + built course page | `course-design.md`, this file |
| a lecture, practice or lesson ("сделай лекцию 4", "занятие 7") | `chapters/<nn-slug>/chapter.md` + its figure(s) + built page | `writing.md`, `figures.md`, `object-atlas.md` |
| a figure for a lesson ("сделай фигуру к лекции") | `figures/<id>/brief.md` + Anatomy figure + rebuilt chapter | `figures.md`, `anatomy/ANATOMY.md` |
| a lighter diagram, chart or widget | inline SVG/HTML in the chapter or a standalone page | `references/visualise/` |
| notes, a cheat sheet, revision material | `notes.md` / `cheatsheet.md`, minimal or no figures | `writing.md` §6 |

Say the scope in one line before starting. A whole discipline is planned at once but
written chapter by chapter unless the user asks for a batch.

## Workflow for a new discipline

1. Read `site.json` and the closest existing discipline (`courses/4/uifis/`). Check
   `_reference/miapo/` for old personal notes on the subject; they are a source to
   reconcile against, never to copy verbatim into the public site.
2. Create the worktree and course: `python tools/new_discipline.py <year> <slug>`.
   Fill `course.json` following `course-design.md`: outcomes, prerequisites, chapters in
   dependency order, sized to the card's hours. Give every chapter one planned figure.
3. Build the plan: `python tools/build_site.py`, open the generated pages, fix the plan.
4. Write the discipline chapter by chapter (the workflow below), committing in the
   worktree. Merge the branch into `main` when the discipline is published.

## Workflow for a chapter (the main path)

1. **Context.** Read the discipline's `course.json` and the previous chapters. Confirm
   the chapter fits the sequence, vocabulary and figure family.
2. **Outline.** Write the section list with one outcome sentence each
   (`writing.md` §2). Find the single insight that most needs to be seen moving; that is
   the signature figure (`figures.md` §1). Pick its object from `object-atlas.md` or
   invent one with the atlas method.
3. **Brief the figure early.** Write the paragraph around `::figure` and fill
   `figures/<id>/brief.md`: insight, truth model with the chapter's exact numbers,
   object and mapping, interaction and tour beats, card text (`figures.md` §3).
4. **Build the figure with Anatomy.** Put the truth model in `figures/<id>/model.mjs` so
   the figure and the chapter share one source. Read `anatomy/ANATOMY.md` and follow its
   workflow. Output contract: one `node build.mjs` writes `<id>.html` and
   `<id>-light.html` next to it. When several figures are pending, brief them all and
   hand each to a subagent; write the chapter meanwhile (`figures.md` §5).
5. **Write the chapter** in `chapter.md` following the arc and rules. Run every code
   block; verify every number and real-world claim against sources. End every lecture with
   a `::quiz` of 15 questions: 6 single-choice (`+`/`-`), 6 multiple-choice (several `+`)
   and 3 short-answer (`=`), each with an explanation `!`. Practices do not get a test.
6. **Build and check.** `python tools/ks/scripts/build_chapter.py <chapter.md>`, then
   `python tools/build_site.py`. Use `tools/ks/scripts/check_pages.py <dist-dir>` where
   Playwright/Chromium is available, including `--mobile` and `--dark`.
7. **Reconcile text and figure.** The text must name the moments the figure shows with
   the same numbers and words. Update `course.json` and rebuild.
8. **Deliver** with one line on what was made, what is pending, and the next chapter.

## Figures: Anatomy or Visualise

Choose the lighter tool that still teaches the idea.

- **Anatomy** (`anatomy/`): the default for a concept that should be seen moving: a
  detailed isometric machine whose working *is* the concept, with a live readout, calm
  motion, light and dark themes, optional WebGL and optional 3D. Use it for the
  signature figure of a lecture or practice. It is real work; follow the sizing rule in
  `anatomy/ANATOMY.md` (do not quote a time for a Figure; give an estimate only for a
  Hero, never start an Epic unasked).
- **Visualise** (`references/visualise/`): for supporting material: a flowchart, a
  structural or comparison diagram, a table figure, a chart, a small interactive
  explainer, or a quick inline SVG. Read `design-system.md` once per conversation, then
  the module for the type. ViewBox width 680, stroke 0.5, 2-3 color ramps, no gradients
  or shadows while streaming.
- **Old Excalidraw diagrams** in `_reference/miapo/` were only a means to make
  screenshots. Do not ship them. Rebuild the idea as an Anatomy figure, an inline SVG
  from Visualise, or a small 3D Anatomy figure if the subject truly needs depth.
- **Diagrams stay light.** Anatomy iframes always load the light build, and `.diagram`
  SVGs use fixed light tokens even when the page is in dark theme. Do not make diagrams
  follow the page theme.

## Page building

The repository has its own builders under `tools/`; prefer them over the skill's sample
scripts so the year and landing structure stays consistent.

- `python tools/build_site.py`: builds every `courses/<year>/<slug>/course.json` into
  `courses/<year>/<slug>/dist/`, copies it to `docs/<year>/<slug>/`, and writes
  `docs/index.html` (three year cards `2`, `3`, `4`) and `docs/<year>/index.html`
  (the discipline cards of that year). This is the publish command.
- `python tools/ks/scripts/build_chapter.py <chapter.md>`: rebuilds one chapter page.
- `python tools/worktree.py` and `python tools/new_discipline.py`: the worktree and
  scaffold workflow above.

The site flow is: landing (specialty rows, each opening year cards) -> year page
(discipline cards, same look as the current УФИС card) -> course page (the discipline
plan) -> chapter/lesson pages. The 09.02.07 row opens years 2, 3 and 4; 09.02.12 and
09.02.13 are empty placeholders.

## Quality bar

- One discipline plan is complete: outcomes, prerequisites, chapter sequence, one
  planned figure per chapter, all consistent with `hours` and `minutes`.
- Practicals may be 90 or 180 minutes. A 180-minute practical counts as two lesson slots,
  keeps the total hours unchanged and reduces the number of graded works. Do not merge a
  written practical without moving its text.
- A chapter teaches one insight so well that the self-checks are easy after reading and
  hard before.
- Chapter prose does not state lesson duration or per-step minutes. Duration lives in
  `course.json` and the syllabus card.
- Every lecture ends with a 15-question test: 6 single-choice, 6 multiple-choice, 3
  short-answer, all with explanations. The test footer, PDF button, reading progress,
  warning button, dark-theme toggle and submission dialog come from the shared builder;
  do not rebuild them
  inside a chapter.
- The figure is an Anatomy figure that passes Anatomy's own verification, not a diagram
  of boxes, and it shows exactly the moments the text refers to with the same numbers.
- Visualise diagrams follow the design system and stay readable at 390 px.
- Nothing is padded; every code block has been run; every number and fact is true and,
  for real-world subjects, sourced.
- **No em dashes** in anything generated. Pages pass `check_pages.py` on desktop, phone
  and dark where the tooling is available.
