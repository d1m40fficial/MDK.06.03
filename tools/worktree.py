#!/usr/bin/env python3
"""One git worktree and branch per discipline, so agents can write different
disciplines at the same time without fighting over one working tree.

Layout: a worktree lives next to the repository at ../<repo>-worktrees/<year>-<slug>
and checks out the branch discipline/<year>/<slug> from the base branch (main).

    python tools/worktree.py add <year> <slug>       create worktree + branch
    python tools/worktree.py list                    show every worktree
    python tools/worktree.py path <year> <slug>      print its path
    python tools/worktree.py remove <year> <slug>    delete the worktree (branch stays)

The branch is not deleted by `remove`; delete it with `git branch -d <branch>` when
the discipline has been merged.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKTREES = ROOT.parent / f"{ROOT.name}-worktrees"
DEFAULT_BASE = "main"

TRANS = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh",
    "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
    "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "c",
    "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu",
    "я": "ya", " ": "-", "_": "-",
}


def slugify(text: str) -> str:
    out = "".join(TRANS.get(ch, ch) for ch in text.lower())
    out = re.sub(r"[^a-z0-9-]+", "-", out).strip("-")
    return re.sub(r"-{2,}", "-", out)


def valid_year(year) -> str:
    y = str(year).strip()
    if not re.match(r"^[1-9][0-9]?$", y):
        sys.exit(f"year must be a number like 2, 3 or 4, got {year!r}")
    return y


def branch_for(year: str, slug: str) -> str:
    return f"discipline/{year}/{slug}"


def worktree_path(year: str, slug: str) -> Path:
    return WORKTREES / f"{year}-{slug}"


def git(*args, cwd=ROOT, check=True):
    r = subprocess.run(["git", *args], cwd=str(cwd), capture_output=True, text=True)
    if check and r.returncode != 0:
        sys.exit((r.stderr or r.stdout).strip() or f"git {' '.join(args)} failed")
    return r


def branch_exists(name: str) -> bool:
    r = git("rev-parse", "--verify", "--quiet", f"refs/heads/{name}", check=False)
    return r.returncode == 0


def add(year, slug, base=DEFAULT_BASE):
    year, slug = valid_year(year), slugify(slug)
    path = worktree_path(year, slug)
    branch = branch_for(year, slug)
    if path.exists():
        sys.exit(f"{path} already exists")
    path.parent.mkdir(parents=True, exist_ok=True)
    if branch_exists(branch):
        git("worktree", "add", str(path), branch)
    else:
        git("worktree", "add", "-b", branch, str(path), base)
    print(f"worktree {path}")
    print(f"branch   {branch}")
    print(f"next: cd \"{path}\" and write courses/{year}/{slug}/course.json, or use new_discipline.py")
    return path


def remove(year, slug):
    year, slug = valid_year(year), slugify(slug)
    path = worktree_path(year, slug)
    if not path.exists():
        sys.exit(f"{path} does not exist")
    git("worktree", "remove", str(path), "--force")
    print(f"removed {path} (branch {branch_for(year, slug)} stays)")


def main():
    a = sys.argv[1:]
    if len(a) == 3 and a[0] == "add":
        add(a[1], a[2])
    elif len(a) == 4 and a[0] == "add" and a[3]:
        add(a[1], a[2], a[3])
    elif a and a[0] == "list":
        print(git("worktree", "list").stdout.strip())
    elif len(a) == 3 and a[0] == "path":
        print(worktree_path(valid_year(a[1]), slugify(a[2])))
    elif len(a) == 3 and a[0] == "remove":
        remove(a[1], a[2])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
