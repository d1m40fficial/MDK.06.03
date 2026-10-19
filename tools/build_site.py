#!/usr/bin/env python3
"""Assemble the whole course suite into a static site under `docs/` for GitHub Pages.

Builds every course (course page + written chapters), copies each course's output
to `docs/<slug>/`, copies downloadable reports, and writes a landing `docs/index.html`
listing the courses.

Usage:
    python3 tools/build_site.py            # from the project root
"""

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


def build_courses():
    built = []
    for cj in sorted(COURSES.glob("*/course.json")):
        r = subprocess.run([sys.executable, str(KS / "build_course.py"), str(cj.parent)],
                           capture_output=True, text=True)
        print((r.stdout or r.stderr).strip())
        if r.returncode == 0:
            built.append(cj.parent)
    return built


def copy_course(course_dir: Path):
    c = load_course(course_dir / "course.json")
    slug = c["slug"]
    src = course_dir / "dist"
    dst = SITE / slug
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns("shots*"))
    reports = course_dir / "reports"
    if reports.exists():
        for target in (dst / "reports", src / "reports"):
            target.mkdir(parents=True, exist_ok=True)
            for f in reports.iterdir():
                if f.is_file() and f.suffix.lower() in (".docx", ".csv", ".pdf", ".xlsx"):
                    shutil.copy2(f, target / f.name)
    return c


def landing(courses):
    if courses:
        first = courses[0]
        slug = esc(first["slug"])
        glyph = esc(first.get("code", ""))
        title = esc(first["title"])
        dek = esc(first.get("tagline") or "Материалы дисциплины: лекции, практические работы и отчёты.")
        hero = (f'<a class="hero-link" href="{slug}/index.html">'
                f'<header class="hero"><div class="glyph" aria-hidden="true">{glyph}</div>'
                f'<h1>{title}</h1><p class="dek">{dek}</p>'
                f'<span class="cta">Открыть курс</span></header></a>')
    else:
        hero = ('<header class="hero"><h1>Курсы</h1>'
                '<p class="dek">Материалы дисциплины: лекции, практические работы и отчёты.</p></header>')
    body = f'<main class="page">{hero}'
    if len(courses) > 1:
        cards = []
        for c in courses:
            n = lesson_slots(c.get("chapters", []))
            cards.append(
                f'<li><a href="{esc(c["slug"])}/index.html"><h3>{esc(c["title"])}</h3>'
                f'<p>{esc(c.get("tagline", ""))}</p>'
                f'<span class="spec">{esc(c.get("code", ""))} · {n} {plural_lessons(n)}</span></a></li>')
        body += (f'<article class="prose"><h2 class="nonum">Дисциплины</h2></article>'
                 f'<ol class="syllabus">{"".join(cards)}</ol>')
    body += '</main>'
    css = ('.hero-link{display:block;text-decoration:none;color:inherit}'
           '.hero-link .hero{transition:transform .15s ease, box-shadow .15s ease}'
           '.hero-link:hover .hero{transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,.10)}'
           '.hero .cta{display:inline-block;margin:0 0 26px;font:600 12px var(--font-mono);'
           'letter-spacing:.08em;text-transform:uppercase;color:var(--accent);position:relative;z-index:1}'
           '.hero-link:hover .cta{text-decoration:underline}'
           '.syllabus{list-style:none;padding:0;display:grid;gap:12px}'
           '.syllabus a{display:block;padding:16px 18px;border:1px solid var(--rule);'
           'border-radius:12px;background:var(--card);text-decoration:none}'
           '.syllabus h3{margin:0 0 4px;color:var(--ink)}'
           '.syllabus .spec{font:12px var(--font-mono);color:var(--ink-3)}')
    (SITE / "index.html").write_text(page(first.get("title", "Курсы") if courses else "Курсы", body, extra_css=css), encoding="utf-8")


def main():
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    (SITE / ".nojekyll").write_text("", encoding="utf-8")
    courses = [copy_course(d) for d in build_courses()]
    landing(courses)
    print(f"site written to {SITE}: {len(courses)} course(s)")


if __name__ == "__main__":
    main()
