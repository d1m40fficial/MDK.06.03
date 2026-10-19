#!/usr/bin/env python3
"""Create a new discipline: its own worktree, branch and starter course.json.

    python tools/new_discipline.py <year> <slug> [--title "..."] [--code "..."]
                                   [--hours 84] [--base main] [--here]

Default: creates the worktree ../<repo>-worktrees/<year>-<slug> on the branch
discipline/<year>/<slug> from `main`, then writes
courses/<year>/<slug>/course.json inside that worktree.

--here: scaffolds the discipline in the current working tree instead (use inside a
worktree that already exists, or when you do not want a separate worktree).

After scaffolding, open course.json and plan the chapters (see
.opencode/skills/course-studio/references/course-design.md), then write chapter by
chapter and build with `python tools/build_site.py`.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import worktree

ROOT = Path(__file__).resolve().parent.parent
COURSES = ROOT / "courses"


def parse(a):
    args = {"title": "", "code": "", "hours": 0, "base": worktree.DEFAULT_BASE, "here": False}
    positional = []
    i = 0
    while i < len(a):
        if a[i] in ("--title", "--code", "--hours", "--base"):
            if i + 1 >= len(a):
                sys.exit(f"{a[i]} needs a value")
            key = a[i].lstrip("-")
            args[key] = a[i + 1]
            i += 2
        elif a[i] == "--here":
            args["here"] = True
            i += 1
        else:
            positional.append(a[i])
            i += 1
    if len(positional) != 2:
        sys.exit(__doc__)
    return positional[0], positional[1], args


def course_json(year, slug, title, code, hours):
    return {
        "slug": slug,
        "code": code or slug[:4].upper(),
        "title": title or slug,
        "tagline": "",
        "level": "СПО",
        "hours": int(hours or 0),
        "languages": [],
        "status": "planned",
        "price": None,
        "currency": "RUB",
        "year": str(year),
        "order": 1,
        "audience": "",
        "prerequisites": [],
        "outcomes": [],
        "chapters": [],
    }


def main():
    year_raw, slug_raw, args = parse(sys.argv[1:])
    year = worktree.valid_year(year_raw)
    slug = worktree.slugify(slug_raw)
    if not re.match(r"^[a-z0-9][a-z0-9-]*$", slug):
        sys.exit(f"cannot build a latin slug from {slug_raw!r}; pass a latin slug")

    if args["here"]:
        target = ROOT
    else:
        existing = [p for p in COURSES.glob(f"*/{slug}/course.json")]
        if existing:
            sys.exit(f"{slug} already exists at {existing[0]}")
        target = worktree.add(year, slug, args["base"])

    d = target / "courses" / year / slug
    if (d / "course.json").exists():
        sys.exit(f"{d / 'course.json'} already exists")
    d.mkdir(parents=True, exist_ok=True)
    (d / "chapters").mkdir(exist_ok=True)
    (d / "reports").mkdir(exist_ok=True)
    cj = d / "course.json"
    cj.write_text(json.dumps(course_json(year, slug, args["title"], args["code"], args["hours"]),
                             indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {cj}")
    print(f"next: fill the plan in {cj}, then run `python tools/build_site.py`")
    if not args["here"]:
        print(f"work in {target} (branch {worktree.branch_for(year, slug)})")


if __name__ == "__main__":
    main()
