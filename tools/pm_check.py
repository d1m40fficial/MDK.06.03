"""Quick structural check for the project management chapters.

Run from the repository root:
    python tools/pm_check.py [all|lek|prakt]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "courses" / "3" / "project-management"
CH = COURSE / "chapters"
FIGDIR = COURSE / "reports"

# A lesson duration (45, 90, 180, ...) is banned in prose, while a domain
# number such as "8 минут на заявку" is a legitimate example.
DURATION = re.compile(r"\b(?:45|90|135|180|225|270)\s*минут", re.I)


def minutes_hits(src: str) -> list[str]:
    hits = []
    for line in src.splitlines():
        if "Продолжительность" in line:
            continue
        if DURATION.search(line):
            hits.append(line.strip()[:120])
    return hits


def quiz_stats(block: str) -> tuple[int, int, int, int, int]:
    """Count questions by type from Q: lines, so blank lines are harmless."""
    starts = [m.start() for m in re.finditer(r"(?m)^\s*Q:", block)]
    chunks = [block[a:b] for a, b in zip(starts, starts[1:] + [len(block)])]
    singles = multis = shorts = whys = 0
    for q in chunks:
        plus = len(re.findall(r"(?m)^\s*\+", q))
        eq = len(re.findall(r"(?m)^\s*=", q))
        if eq and not plus:
            shorts += 1
        elif plus == 1:
            singles += 1
        elif plus > 1:
            multis += 1
        if re.search(r"(?m)^\s*!", q):
            whys += 1
    return len(chunks), singles, multis, shorts, whys


def check(path: Path) -> tuple[list[str], int]:
    src = path.read_text(encoding="utf-8")
    out = []
    name = path.parent.name
    lek = "lek" in name
    if "\u2014" in src:
        out.append("U+2014 em dash")
    if " -- " in src:
        out.append("' -- ' instead of dash")
    for line in minutes_hits(src):
        out.append(f"lesson duration in: {line}")
    if re.search(r"демонстрационн\w* экзамен", src, re.I):
        out.append("mentions demo exam")
    if "http://" in src or "https://" in src:
        out.append("external link")
    gates = len(re.findall(r"(?m)^::gate\b", src))
    closes = len(re.findall(r"(?m)^::/gate\b", src))
    if lek:
        if gates != closes:
            out.append(f"gates {gates} open / {closes} close")
        if not (2 <= gates <= 4):
            out.append(f"gates={gates}, expected 2-4")
        if "::quiz" not in src:
            out.append("no ::quiz")
        else:
            block = src.split("::quiz", 1)[1]
            block = block.split("::/gate", 1)[0]
            total, singles, multis, shorts, whys = quiz_stats(block)
            if total != 15:
                out.append(f"quiz count {total} != 15")
            if (singles, multis, shorts) != (9, 3, 3):
                out.append(f"quiz types {singles}/{multis}/{shorts} not 9/3/3")
            if whys != total:
                out.append("quiz without explanation")
    else:
        if gates or closes:
            out.append("practice has gates")
        if "::quiz" in src:
            out.append("practice has quiz")
    for fid in re.findall(r"::figure\s+(fig-[\w-]+)", src):
        if not list(CH.glob(f"*/figures/{fid}/*.html")):
            out.append(f"missing figure {fid}")
    for link in re.findall(r"\(\.\./\.\./reports/([^)]+)\)", src):
        if not (FIGDIR / link).exists():
            out.append(f"missing file {link}")
    return out, len(src.split())


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    paths = sorted(CH.glob("*/chapter.md"))
    total = 0
    for p in paths:
        name = p.parent.name
        if mode == "lek" and "lek" not in name:
            continue
        if mode == "prakt" and "prakt" not in name:
            continue
        res, w = check(p)
        total += w
        flag = "ok " if not res else "!! "
        print(f"{flag}{name:14s} {w:5d} words  " + "; ".join(res))
    print(f"{len(paths)} chapters, {total} words")


if __name__ == "__main__":
    main()
