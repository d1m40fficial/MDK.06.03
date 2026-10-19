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

from _pages import esc, load_course, page  # noqa: E402

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
    cards = []
    for c in courses:
        n = c.get("chapterCount") or len(c.get("chapters", []))
        cards.append(
            f'<li><a href="{esc(c["slug"])}/index.html"><h3>{esc(c["title"])}</h3>'
            f'<p>{esc(c.get("tagline", ""))}</p>'
            f'<span class="spec">{esc(c.get("code", ""))} · {n} занятий</span></a></li>')
    body = (f'<main class="page"><header class="hero"><div class="glyph" aria-hidden="true">УФИС</div>'
            f'<h1>Устройство и функционирование информационной системы</h1>'
            f'<p class="dek">Материалы дисциплины: лекции, практические работы и отчёты.</p></header>'
            f'<article class="prose"><h2 class="nonum">Дисциплины</h2></article>'
            f'<ol class="syllabus">{"".join(cards)}</ol></main>')
    css = ('.syllabus{list-style:none;padding:0;display:grid;gap:12px}'
           '.syllabus a{display:block;padding:16px 18px;border:1px solid var(--rule);'
           'border-radius:12px;background:var(--card);text-decoration:none}'
           '.syllabus h3{margin:0 0 4px;color:var(--ink)}'
           '.syllabus .spec{font:12px var(--font-mono);color:var(--ink-3)}')
    (SITE / "index.html").write_text(page("Курсы", body, extra_css=css), encoding="utf-8")


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
