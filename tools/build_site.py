#!/usr/bin/env python3
"""Assemble the whole course suite into a static site under `docs/` for GitHub Pages.

The site is four levels deep:

    docs/index.html                 the landing: specialties with year cards inside
    docs/<year>/index.html          the year page: one card per discipline
    docs/<year>/<slug>/index.html   the discipline plan (syllabus)
    docs/<year>/<slug>/<chapter>.html  a lecture or a practical

Sources:
    site.json                       specialties, their year cards and accents
    courses/<year>/<slug>/course.json   the discipline card + syllabus

Builds every discipline (course page + written chapters), copies each one to
docs/<year>/<slug>/, copies downloadable reports, and writes the landing and
year pages.

Usage:
    python tools/build_site.py            # from the project root
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
KS = HERE / "ks" / "scripts"
ASSETS = HERE / "ks" / "assets"
sys.path.insert(0, str(KS))

from _pages import code_class, esc, lesson_slots, load_course, page, plural_lessons  # noqa: E402

SITE = ROOT / "docs"
COURSES = ROOT / "courses"
SITE_JSON = ROOT / "site.json"

YEAR_FALLBACK = {"accent": "#2F6F5E", "tint": "#DDEBE5", "accentDark": "#5CC4A4", "tintDark": "#18302A"}

CARD_CSS = r"""
.course-card{--c-accent:var(--cl-accent);--c-tint:var(--cl-tint)}
@media (prefers-color-scheme: dark){:root:not([data-theme=light]) .course-card{--c-accent:var(--cd-accent);--c-tint:var(--cd-tint)}}
:root[data-theme=dark] .course-card{--c-accent:var(--cd-accent);--c-tint:var(--cd-tint)}
.course-card.pending{opacity:.62}.course-card.pending:hover{opacity:1}
.course-card .art .glyph.code-md{font-size:84px;right:-2px;bottom:-12px}
.course-card .art .glyph.code-lg{font-size:56px;right:10px;bottom:10px;letter-spacing:-.04em}
.course-card .art .glyph.code-xl{font-size:42px;right:12px;bottom:14px;letter-spacing:-.03em}

/* bento grid for the discipline and year cards */
.bento{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:18px;grid-auto-flow:dense}
.bento .course-card{grid-column:span 2}
.bento .course-card:nth-child(5n+1),.bento .course-card:nth-child(5n+2){grid-column:span 3}
.bento .course-card:nth-child(5n+1) .art{height:236px}
.bento .course-card:nth-child(5n+2) .art{height:216px}
.years-grid.bento{grid-template-columns:repeat(3,minmax(0,1fr))}
.years-grid.bento .course-card,.years-grid.bento .course-card:nth-child(n){grid-column:span 1;height:100%}
.years-grid.bento .year-card{background:linear-gradient(150deg,var(--c-tint),var(--card) 74%)}
.years-grid.bento .year-card .art{background:transparent}
.years-grid.bento .year-card .body{background:transparent}
@media(max-width:980px){
  .bento,.years-grid.bento{grid-template-columns:repeat(2,minmax(0,1fr))}
  .bento .course-card,.bento .course-card:nth-child(n),
  .years-grid.bento .course-card,.years-grid.bento .course-card:nth-child(n){grid-column:span 1}
  .bento .course-card:nth-child(3n+1) .art,.bento .course-card:nth-child(3n+2) .art{height:220px}
}
@media(max-width:620px){
  .bento,.years-grid.bento{grid-template-columns:1fr}
  .years-grid.bento .course-card:nth-child(3n+1),.years-grid.bento .course-card:nth-child(3n){grid-column:span 1}
}

/* live shader background on discipline cards */
.shader-card{position:relative;isolation:isolate;overflow:hidden;background:#08090D;color:#fff;border-color:rgba(255,255,255,.14)}
.shader-card.pending{opacity:.8}
.shader-card .shader-bg{position:absolute;inset:0;display:block;width:100%;height:100%;z-index:0;pointer-events:none;background:linear-gradient(135deg,#08090D,var(--c-accent) 58%,#08090D)}
.shader-card .art,.shader-card .body{position:relative;z-index:1}
.shader-card .art{background:transparent}
.shader-card .body{background:rgba(8,9,13,.68);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-top:1px solid rgba(255,255,255,.12)}
.shader-card .pill{background:rgba(8,9,13,.55);color:#fff;border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(10px)}
.shader-card .pill.dark{background:color-mix(in srgb,var(--c-accent) 72%,#08090D);border-color:color-mix(in srgb,var(--c-accent) 55%,#fff);color:#fff}
.shader-card .ch{color:rgba(255,255,255,.7);text-shadow:0 1px 10px rgba(0,0,0,.7)}
.shader-card .glyph{color:var(--c-accent);opacity:.9;text-shadow:0 2px 18px rgba(0,0,0,.8),0 0 2px rgba(0,0,0,.5)}
.shader-card h3{color:#fff}
.shader-card p{color:rgba(255,255,255,.76)}
.shader-card .spec{color:rgba(255,255,255,.6)}
.shader-card:hover{box-shadow:0 26px 70px -28px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.16)}

/* year cards stay light but follow the same bento rhythm */
.years-grid.bento .year-card .art{background:var(--c-tint)}
.years-grid.bento .year-card:nth-child(3n) .body{padding-bottom:26px}

.specialty{border:1px solid var(--rule);border-radius:var(--radius);background:var(--card);margin:0 0 14px;overflow:hidden}
.specialty summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:12px;padding:16px 20px;font:700 18px/1.3 var(--font-display)}
.specialty summary::-webkit-details-marker{display:none}
.specialty summary::after{content:'+';margin-left:8px;font:600 18px var(--font-mono);color:var(--accent)}
.specialty[open] summary::after{content:'−'}
.specialty .spec-count{font:12px var(--font-mono);color:var(--ink-2);margin-left:auto}
.specialty .years-grid{padding:0 16px 16px}
.specialty-empty{margin:0;padding:0 20px 18px;color:var(--ink-2)}
"""

SHADER_SCRIPT = (ASSETS / "shader.js").read_text(encoding="utf-8")



def plural_disciplines(n: int) -> str:
    n = abs(int(n)) % 100
    if 11 <= n <= 14:
        return "дисциплин"
    n %= 10
    if n == 1:
        return "дисциплина"
    if n in (2, 3, 4):
        return "дисциплины"
    return "дисциплин"


def load_site() -> dict:
    if SITE_JSON.exists():
        return json.loads(SITE_JSON.read_text(encoding="utf-8"))
    return {"title": "Материалы", "tagline": "Все курсы", "specialties": []}


def all_years(site: dict) -> list:
    years = []
    for specialty in site.get("specialties", []):
        years.extend(specialty.get("years", []))
    if not years:
        years = site.get("years", [])
    return sorted(years, key=lambda y: y.get("order", 99))


def plural_courses(n: int) -> str:
    n = abs(int(n)) % 100
    if 11 <= n <= 14:
        return "курсов"
    n %= 10
    if n == 1:
        return "курс"
    if n in (2, 3, 4):
        return "курса"
    return "курсов"


def year_of(course_dir: Path) -> str:
    """The year is the folder between courses/ and the discipline slug."""
    return course_dir.parent.name


def discover_courses():
    """Every courses/<year>/<slug>/course.json, sorted by year then order/title."""
    found = []
    for cj in sorted(COURSES.glob("*/*/course.json")):
        if cj.parts[-3] == "_anatomy":
            continue
        c = load_course(cj)
        found.append((year_of(cj.parent), cj.parent, c))
    found.sort(key=lambda t: (t[0], t[2].get("order", 99), t[2].get("title", "")))
    return found


def build_courses(discovered):
    built = []
    for year, course_dir, _ in discovered:
        r = subprocess.run([sys.executable, str(KS / "build_course.py"), str(course_dir)],
                           capture_output=True, text=True)
        print((r.stdout or r.stderr).strip())
        if r.returncode == 0:
            built.append((year, course_dir))
    return built


def copy_course(year: str, course_dir: Path) -> dict:
    c = load_course(course_dir / "course.json")
    slug = c["slug"]
    src = course_dir / "dist"
    dst = SITE / year / slug
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns("shots*"))
    for shots_dir in dst.glob("shots*"):
        shutil.rmtree(shots_dir, ignore_errors=True)
    for page in dst.rglob("*.html"):
        text = page.read_text(encoding="utf-8")
        if 'href="#course-list"' in text:
            rel = os.path.relpath(SITE / "index.html", page.parent).replace("\\", "/")
            page.write_text(text.replace('href="#course-list"', f'href="{rel}"'), encoding="utf-8")
    reports = course_dir / "reports"
    if reports.exists():
        for target in (dst / "reports", src / "reports"):
            target.mkdir(parents=True, exist_ok=True)
            for f in reports.iterdir():
                if f.is_file() and f.suffix.lower() in (
                    ".docx", ".csv", ".pdf", ".xlsx", ".sql", ".json", ".yaml", ".yml", ".py"
                ) and not f.name.startswith("make_"):
                    shutil.copy2(f, target / f.name)
    return c


def year_vars(y: dict) -> str:
    return (f"--cl-accent:{esc(y.get('accent', YEAR_FALLBACK['accent']))};"
            f"--cl-tint:{esc(y.get('tint', YEAR_FALLBACK['tint']))};"
            f"--cd-accent:{esc(y.get('accentDark', YEAR_FALLBACK['accentDark']))};"
            f"--cd-tint:{esc(y.get('tintDark', YEAR_FALLBACK['tintDark']))};")


def card_vars(c: dict) -> str:
    accent_dark = c.get("accentDark") or c.get("accent") or YEAR_FALLBACK["accentDark"]
    tint_dark = c.get("tintDark") or c.get("tint") or YEAR_FALLBACK["tintDark"]
    return (f"--cl-accent:{esc(c.get('accent', YEAR_FALLBACK['accent']))};"
            f"--cl-tint:{esc(c.get('tint', YEAR_FALLBACK['tint']))};"
            f"--cd-accent:{esc(accent_dark)};"
            f"--cd-tint:{esc(tint_dark)};")


def discipline_card(c: dict) -> str:
    n = lesson_slots(c.get("chapters", []))
    avail = c.get("status") == "available"
    code = c.get("code", "")
    spec = " · ".join(x for x in [esc(code), esc(c.get("level", "")),
                                  f"{c['hours']} ч" if c.get("hours") else None,
                                  f"{n} {plural_lessons(n)}" if n else None,
                                  esc(c.get("assessment", ""))] if x)
    card_class = "course-card shader-card" if avail else "course-card pending shader-card"
    glyph_class = "glyph" + (f" {code_class(code)}" if code_class(code) else "")
    accent = c.get("accent", YEAR_FALLBACK["accent"])
    seed = (sum(ord(ch) for ch in c.get("slug", "")) % 97) / 97.0
    return (
        f'<a class="{card_class}" href="{esc(c["slug"])}/index.html" style="{card_vars(c)}" '
        f'data-shader data-accent="{esc(accent)}" data-seed="{seed:.3f}">'
        f'<canvas class="shader-bg" width="640" height="360" aria-hidden="true" '
        f'style="background:linear-gradient(135deg,#08090D,{esc(accent)} 58%,#08090D)"></canvas>'
        f'<div class="art"><span class="pill{" dark" if avail else ""}">'
        f'{"Доступно" if avail else "Не готово"}</span><span class="ch">{n} зан.</span>'
        f'<div class="{glyph_class}" aria-hidden="true">{esc(code)}</div></div>'
        f'<div class="body"><h3>{esc(c["title"])}</h3>'
        f'<p>{esc(c.get("tagline", ""))}</p>'
        f'<div class="spec">{spec}</div></div></a>')


def year_page(y: dict, courses: list):
    yid = str(y["id"])
    body = (f'<main class="catalog">'
            f'<div class="crumbs"><a href="../index.html">Все курсы</a><span>/</span>'
            f'<span>{esc(y.get("title", yid))}</span></div>'
            f'<header class="hero"><div class="badges"><span class="pill dark">'
            f'{esc(y.get("title", yid))}</span></div>'
            f'<h1 style="max-width:100%">{esc(y.get("title", yid))}</h1>'
            f'<p class="dek" style="max-width:100%">{esc(y.get("tagline", ""))}</p>'
            f'<div class="glyph" aria-hidden="true">{esc(y.get("code", yid))}</div></header>')
    if courses:
        cards = "".join(discipline_card(c) for c in courses)
        head = (f'<div class="catalog-head"><h2 class="nonum">Дисциплины</h2>'
                f'<span class="count">{len(courses)} {plural_disciplines(len(courses))}</span></div>')
        body += f'{head}<div class="grid bento">{cards}</div>'
    else:
        body += '<article class="prose"><p>Дисциплины этого курса ещё не добавлены.</p></article>'
    body += '</main>'
    css = '.crumbs{margin:0 0 16px}' + CARD_CSS
    out = SITE / yid / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page(f'{y.get("title", yid)} · Материалы дисциплин', body,
                        year_vars(y), css, SHADER_SCRIPT), encoding="utf-8")
    print(f"wrote {out}: {len(courses)} {plural_disciplines(len(courses))}")


def year_card(y: dict, courses: list) -> str:
    yid = str(y["id"])
    total = sum(lesson_slots(c.get("chapters", [])) for c in courses)
    spec = (f'{len(courses)} {plural_disciplines(len(courses))}'
            + (f" · {total} {plural_lessons(total)}" if total else ""))
    return (
        f'<a class="course-card year-card" href="{esc(yid)}/index.html" style="{year_vars(y)}">'
        f'<div class="art"><span class="ch">{len(courses)} дисц.</span>'
        f'<div class="glyph" aria-hidden="true">{esc(y.get("code", yid))}</div></div>'
        f'<div class="body"><h3>{esc(y.get("title", yid))}</h3>'
        f'<p>{esc(y.get("tagline", ""))}</p><div class="spec">{esc(spec)}</div></div></a>')


def landing(site: dict, by_year: dict):
    blocks = []
    specialties = site.get("specialties", [])
    for specialty in specialties:
        years = sorted(specialty.get("years", []), key=lambda y: y.get("order", 99))
        cards = "".join(year_card(y, by_year.get(str(y["id"]), [])) for y in years)
        body = (f'<div class="grid years-grid bento">{cards}</div>' if cards
                else '<p class="specialty-empty">Дисциплины пока не добавлены.</p>')
        open_attr = " open" if specialty.get("open") else ""
        blocks.append(
            f'<details class="specialty"{open_attr}><summary>'
            f'<span>{esc(specialty.get("title", specialty.get("id", "")))}</span>'
            f'<span class="spec-count">{len(years)} {plural_courses(len(years))}</span>'
            f'</summary>{body}</details>')
    body = (f'<main class="catalog"><header class="hero hero-glass">'
            f'<h1>{esc(site.get("title", "Материалы"))}</h1></header>'
            f'<div class="specialties">{"".join(blocks)}</div></main>')
    (SITE / "index.html").write_text(
        page(site.get("title", "Материалы"), body, "", CARD_CSS), encoding="utf-8")
    print(f"wrote {SITE / 'index.html'}: {len(specialties)} specialties, {len(all_years(site))} years")


def main():
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    (SITE / ".nojekyll").write_text("", encoding="utf-8")

    site = load_site()
    discovered = discover_courses()
    built = build_courses(discovered)
    by_year = {}
    for year, course_dir in built:
        c = copy_course(year, course_dir)
        by_year.setdefault(year, []).append(c)

    for y in all_years(site):
        year_page(y, by_year.get(str(y["id"]), []))
    landing(site, by_year)
    print(f"site written to {SITE}: {len(built)} course(s)")


if __name__ == "__main__":
    main()
