"""Read the human-edited `availability.txt` and decide which chapters are open.

The file is grouped by year and discipline:

    4 курс
    Устройство и функционирование информационной системы
        Открытые Лекции = 2
        Открытые Практики = 1

A discipline that is not listed is unrestricted. A chapter is open when its
ordinal among the lectures (or practicals) of the course is less than or equal
to the number in the file. A missing number means that kind is unrestricted.
"""
import re
from pathlib import Path

YEAR_RE = re.compile(r"^\s*(\d+)\s*(?:курс)?\s*$", re.I)
LEK_RE = re.compile(r"^\s*Открытые\s+Лекции\s*=\s*(\d+)\s*$", re.I)
PRAKT_RE = re.compile(r"^\s*Открытые\s+Практики\s*=\s*(\d+)\s*$", re.I)


def normalize_title(value) -> str:
    text = str(value or "").casefold().replace("ё", "е")
    text = re.sub(r"[«»\"'`]", "", text)
    text = re.sub(r"[^0-9a-zа-я]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def availability_file(start: Path):
    for parent in [start, *start.parents][:6]:
        path = parent / "availability.txt"
        if path.exists():
            return path
    return None


def load_availability(start: Path) -> dict:
    """Map (year, normalized title) to (open lectures, open practicals)."""
    path = availability_file(start)
    if not path:
        return {}

    table, year, title, lek, prakt = {}, "", "", None, None

    def commit():
        if title:
            table[(year, normalize_title(title))] = (lek, prakt)

    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        match = LEK_RE.match(line)
        if match:
            lek = int(match.group(1))
            continue
        match = PRAKT_RE.match(line)
        if match:
            prakt = int(match.group(1))
            continue
        if raw[:1].isspace():
            continue
        commit()
        year_match = YEAR_RE.match(line)
        if year_match:
            year, title, lek, prakt = year_match.group(1), "", None, None
        else:
            title, lek, prakt = line.strip(), None, None
    commit()
    return table


def limits_for(course: dict, table: dict):
    """Return (open lectures, open practicals) or None when the course is unrestricted."""
    key = (str(course.get("year", "")), normalize_title(course.get("title", "")))
    return table.get(key)


def chapter_kind(chapter: dict) -> str:
    word = f'{chapter.get("dir", "")} {chapter.get("slug", "")} {chapter.get("title", "")}'.lower()
    return "prakt" if ("prakt" in word or "практ" in word) else "lek"


def chapter_ordinal(course: dict, dirname: str):
    """Return (kind, 1-based ordinal among chapters of that kind)."""
    counters = {"lek": 0, "prakt": 0}
    for chapter in course.get("chapters", []):
        current = chapter.get("dir") or f'{int(chapter["n"]):02d}-{chapter.get("slug", "")}'
        kind = chapter_kind(chapter)
        counters[kind] += 1
        if current == dirname:
            return kind, counters[kind]
    fallback = "prakt" if ("prakt" in dirname.lower() or "практ" in dirname.lower()) else "lek"
    return fallback, 0



def is_open(course: dict, dirname: str, table: dict) -> bool:
    limits = limits_for(course, table)
    if limits is None:
        return True
    kind, ordinal = chapter_ordinal(course, dirname)
    limit = limits[1] if kind == "prakt" else limits[0]
    return limit is None or ordinal <= limit


def summary(course: dict, table: dict) -> str:
    limits = limits_for(course, table)
    if limits is None:
        return ""
    lek, prakt = limits
    parts = []
    if lek is not None:
        parts.append(f"лекции {lek}")
    if prakt is not None:
        parts.append(f"практики {prakt}")
    return "Открыто: " + ", ".join(parts) if parts else ""
