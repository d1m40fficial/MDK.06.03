#!/usr/bin/env python3
"""Assemble the whole course suite into a static site under `docs/` for GitHub Pages.

The site is three levels deep:

    docs/index.html                 the landing: one card per year (2, 3, 4)
    docs/<year>/index.html          the year page: one card per discipline
    docs/<year>/<slug>/index.html   the discipline plan (syllabus)
    docs/<year>/<slug>/<chapter>.html  a lecture or a practical

Sources:
    site.json                       the year cards (id, title, tagline, accent)
    courses/<year>/<slug>/course.json   the discipline card + syllabus

Builds every discipline (course page + written chapters), copies each one to
docs/<year>/<slug>/, copies downloadable reports, and writes the landing and
year pages.

Usage:
    python tools/build_site.py            # from the project root
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
KS = HERE / "ks" / "scripts"
sys.path.insert(0, str(KS))

from _pages import esc, lesson_slots, load_course, page, plural_lessons  # noqa: E402

SITE = ROOT / "docs"
COURSES = ROOT / "courses"
SITE_JSON = ROOT / "site.json"

YEAR_FALLBACK = {"accent": "#2F6F5E", "tint": "#DDEBE5", "accentDark": "#5CC4A4", "tintDark": "#18302A"}

CARD_CSS = (
    ".course-card{--c-accent:var(--cl-accent);--c-tint:var(--cl-tint)}"
    "@media (prefers-color-scheme: dark){:root:not([data-theme=light]) .course-card"
    "{--c-accent:var(--cd-accent);--c-tint:var(--cd-tint)}}"
    ":root[data-theme=dark] .course-card{--c-accent:var(--cd-accent);--c-tint:var(--cd-tint)}"
)


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
    return {"title": "Материалы дисциплин", "tagline": "", "years": []}


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
    reports = course_dir / "reports"
    if reports.exists():
        for target in (dst / "reports", src / "reports"):
            target.mkdir(parents=True, exist_ok=True)
            for f in reports.iterdir():
                if f.is_file() and f.suffix.lower() in (".docx", ".csv", ".pdf", ".xlsx"):
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
    spec = " · ".join(x for x in [esc(c.get("code", "")), esc(c.get("level", "")),
                                  f"{c['hours']} ч" if c.get("hours") else None,
                                  f"{n} {plural_lessons(n)}" if n else None] if x)
    return (
        f'<a class="course-card" href="{esc(c["slug"])}/index.html" style="{card_vars(c)}">'
        f'<div class="art"><span class="pill{" dark" if avail else ""}">'
        f'{"Доступно" if avail else "Скоро"}</span><span class="ch">{n} зан.</span>'
        f'<div class="glyph" aria-hidden="true">{esc(c.get("code", ""))}</div></div>'
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
        body += f'{head}<div class="grid">{cards}</div>'
    else:
        body += '<article class="prose"><p>Дисциплины этого курса ещё не добавлены.</p></article>'
    body += '</main>'
    css = '.crumbs{margin:0 0 16px}' + CARD_CSS
    out = SITE / yid / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page(f'{y.get("title", yid)} · Материалы дисциплин', body,
                        year_vars(y), css), encoding="utf-8")
    print(f"wrote {out}: {len(courses)} {plural_disciplines(len(courses))}")


def landing(site: dict, by_year: dict):
    years = sorted(site.get("years", []), key=lambda y: y.get("order", 99))
    cards = []
    for y in years:
        yid = str(y["id"])
        courses = by_year.get(yid, [])
        total = sum(lesson_slots(c.get("chapters", [])) for c in courses)
        spec = (f'{len(courses)} {plural_disciplines(len(courses))}'
                + (f" · {total} {plural_lessons(total)}" if total else ""))
        cards.append(
            f'<a class="course-card" href="{esc(yid)}/index.html" style="{year_vars(y)}">'
            f'<div class="art"><span class="ch">{len(courses)} дисц.</span>'
            f'<div class="glyph" aria-hidden="true">{esc(y.get("code", yid))}</div></div>'
            f'<div class="body"><h3>{esc(y.get("title", yid))}</h3>'
            f'<p>{esc(y.get("tagline", ""))}</p><div class="spec">{esc(spec)}</div></div></a>')
    body = (f'<main class="catalog"><header class="hero">'
            f'<h1 style="max-width:100%">{esc(site.get("title", "Материалы дисциплин"))}</h1>'
            f'<p class="dek" style="max-width:100%">{esc(site.get("tagline", ""))}</p></header>'
            f'<div class="grid">{"".join(cards)}</div></main>')
    (SITE / "index.html").write_text(
        page(site.get("title", "Материалы дисциплин"), body, "", CARD_CSS), encoding="utf-8")
    print(f"wrote {SITE / 'index.html'}: {len(years)} years")


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

    for y in site.get("years", []):
        year_page(y, by_year.get(str(y["id"]), []))
    landing(site, by_year)
    print(f"site written to {SITE}: {len(built)} course(s)")


if __name__ == "__main__":
    main()
