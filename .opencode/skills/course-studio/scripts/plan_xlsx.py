#!/usr/bin/env python3
"""Write the discipline syllabus as an Excel workbook without extra dependencies.

The workbook is a real .xlsx file: a minimal OOXML package assembled with
zipfile and inline strings. It is deterministic, so rebuilding the site leaves
the docs tree byte-identical.

Usage:
    from plan_xlsx import plan_filename, write_plan_xlsx
    write_plan_xlsx(course, dist / plan_filename(course))
"""
import math
import re
import zipfile
from pathlib import Path

from _pages import lesson_slots

CT = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>"""

ROOT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

WORKBOOK = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Учебный план" sheetId="1" r:id="rId1"/></sheets>
</workbook>"""

WB_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""

STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><name val="Calibri"/></font>
<font><b/><sz val="13"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><color rgb="FF666666"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F2937"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>
<left style="thin"><color rgb="FFD9D9D9"/></left>
<right style="thin"><color rgb="FFD9D9D9"/></right>
<top style="thin"><color rgb="FFD9D9D9"/></top>
<bottom style="thin"><color rgb="FFD9D9D9"/></bottom>
<diagonal/>
</border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
<alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
<alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
<alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
<alignment vertical="center" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>"""


def esc_xml(value) -> str:
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", str(value if value is not None else ""))
    return (text.replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def is_practice(ch: dict) -> bool:
    marker = f'{ch.get("dir", "")} {ch.get("slug", "")}'
    return "prakt" in marker or "практ" in marker


def plan_rows(course: dict) -> list:
    rows = []
    slot = 1
    for ch in course.get("chapters", []):
        pairs = max(1, round(int(ch.get("minutes") or 90) / 90))
        number = str(slot) if pairs == 1 else f"{slot}-{slot + pairs - 1}"
        slot += pairs
        rows.append({
            "number": number,
            "kind": "Практика" if is_practice(ch) else "Лекция",
            "title": ch.get("title", ""),
            "minutes": int(ch.get("minutes") or 90),
            "summary": ch.get("summary", ""),
            "topics": ", ".join(ch.get("topics", []) or []),
        })
    return rows


def plan_meta(course: dict) -> str:
    bits = []
    if course.get("code"):
        bits.append(f'Код: {course["code"]}')
    if course.get("year"):
        bits.append(f'{course["year"]} курс')
    if course.get("hours"):
        bits.append(f'{course["hours"]} ч')
    count = lesson_slots(course.get("chapters", []))
    if count:
        tail = "занятий"
        if count % 10 == 1 and count % 100 != 11:
            tail = "занятие"
        elif count % 10 in (2, 3, 4) and count % 100 not in (12, 13, 14):
            tail = "занятия"
        bits.append(f"{count} {tail}")
    if course.get("assessment"):
        bits.append(course["assessment"])
    return " · ".join(bits)


def plan_filename(course: dict) -> str:
    raw = f'Учебный_план_{course.get("title", "")}'
    raw = re.sub(r"[^\w\- ]+", "", raw, flags=re.UNICODE)
    raw = re.sub(r"\s+", "_", raw.strip())
    raw = re.sub(r"_+", "_", raw).strip("._-")
    return (raw[:110] or "Учебный_план") + ".xlsx"


def inline(ref: str, value, style: int) -> str:
    return (f'<c r="{ref}" s="{style}" t="inlineStr"><is>'
            f'<t xml:space="preserve">{esc_xml(value)}</t></is></c>')


def number(ref: str, value: int, style: int) -> str:
    return f'<c r="{ref}" s="{style}"><v>{int(value)}</v></c>'


def row_xml(index: int, cells: list, height: int = 0) -> str:
    ht = f' ht="{height}" customHeight="1"' if height else ""
    return f'<row r="{index}"{ht}>{"".join(cells)}</row>'


def plural_positions(n: int) -> str:
    n = abs(int(n)) % 100
    if 11 <= n <= 14:
        return "позиций"
    n %= 10
    if n == 1:
        return "позиция"
    if n in (2, 3, 4):
        return "позиции"
    return "позиций"


def sheet_xml(course: dict) -> str:
    rows = plan_rows(course)
    last = 5 + len(rows)
    total_row = last + 1
    out = []
    out.append(row_xml(1, [inline("A1", "Учебный план", 1)], 28))
    out.append(row_xml(2, [inline("A2", course.get("title", ""), 2)], 24))
    out.append(row_xml(3, [inline("A3", plan_meta(course), 3)], 18))
    out.append('<row r="4" ht="8" customHeight="1"/>')
    out.append(row_xml(5, [
        inline("A5", "№", 4), inline("B5", "Тип", 4), inline("C5", "Тема занятия", 4),
        inline("D5", "Минуты", 4), inline("E5", "Содержание", 4),
        inline("F5", "Ключевые понятия", 4),
    ], 32))
    for i, item in enumerate(rows, start=6):
        length = max(len(item["summary"]) / 74, len(item["topics"]) / 44, len(item["title"]) / 56)
        height = max(30, min(120, int(15 * (math.ceil(length) + 1))))
        out.append(row_xml(i, [
            inline(f"A{i}", item["number"], 6),
            inline(f"B{i}", item["kind"], 6),
            inline(f"C{i}", item["title"], 5),
            number(f"D{i}", item["minutes"], 6),
            inline(f"E{i}", item["summary"], 5),
            inline(f"F{i}", item["topics"], 5),
        ], height))
    total = sum(item["minutes"] for item in rows)
    out.append(row_xml(total_row, [
        inline(f"A{total_row}", "Итого", 7),
        inline(f"B{total_row}", "", 7),
        inline(f"C{total_row}", "", 7),
        number(f"D{total_row}", total, 6),
        inline(f"E{total_row}", f"{len(rows)} {plural_positions(len(rows))}", 6),
        inline(f"F{total_row}", "", 5),
    ], 22))
    cols = ('<cols><col min="1" max="1" width="7" customWidth="1"/>'
            '<col min="2" max="2" width="12" customWidth="1"/>'
            '<col min="3" max="3" width="55" customWidth="1"/>'
            '<col min="4" max="4" width="9" customWidth="1"/>'
            '<col min="5" max="5" width="70" customWidth="1"/>'
            '<col min="6" max="6" width="42" customWidth="1"/></cols>')
    merges = (f'<mergeCells count="4"><mergeCell ref="A1:F1"/><mergeCell ref="A2:F2"/>'
              f'<mergeCell ref="A3:F3"/><mergeCell ref="A{total_row}:C{total_row}"/></mergeCells>')
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:F{total_row}"/>
<sheetViews><sheetView tabSelected="1" workbookViewId="0">
<pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/>
<selection pane="bottomLeft" activeCell="A6" sqref="A6"/>
</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
{cols}
<sheetData>{''.join(out)}</sheetData>
<autoFilter ref="A5:F{last}"/>
{merges}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
</worksheet>"""


def write_plan_xlsx(course: dict, path: Path) -> None:
    files = [
        ("[Content_Types].xml", CT),
        ("_rels/.rels", ROOT_RELS),
        ("xl/workbook.xml", WORKBOOK),
        ("xl/_rels/workbook.xml.rels", WB_RELS),
        ("xl/styles.xml", STYLES),
        ("xl/worksheets/sheet1.xml", sheet_xml(course)),
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in files:
            info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o600 << 16
            zf.writestr(info, data.encode("utf-8"))
