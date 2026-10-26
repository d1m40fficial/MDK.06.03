"""One-off cleanup of the generated report templates.

Adds a «Ход работы» section, removes answer fields and header screenshots,
drops lesson durations and renames the screenshot section.
"""
from pathlib import Path

from docx import Document
from docx.shared import Pt


def is_blank(text: str) -> bool:
    return not text or set(text.strip()) <= {"_", " ", "\u00a0"}


def fix(path: Path) -> list:
    doc = Document(path)
    changed = []
    paragraphs = list(doc.paragraphs)

    # Drop lesson duration lines.
    for p in paragraphs:
        if p.text.strip().lower().startswith("продолжительность:"):
            p._element.getparent().remove(p._element)
            changed.append("duration")

    # Insert «Ход работы» after the goal block.
    paragraphs = list(doc.paragraphs)
    if not any(p.text.strip() == "Ход работы" for p in paragraphs):
        goal = next((i for i, p in enumerate(paragraphs) if p.text.strip() == "Цель работы"), None)
        if goal is not None:
            target = None
            for p in paragraphs[goal + 1:]:
                if is_blank(p.text):
                    continue
                target = p
                break
            if target is not None:
                new = target.insert_paragraph_before("Ход работы")
                new.runs[0].bold = True
                new.runs[0].font.size = Pt(12)
                changed.append("work-section")

    # Rename the screenshot section and drop header/title placeholders.
    for p in list(doc.paragraphs):
        text = p.text.strip()
        if text == "Скриншоты":
            for run in p.runs:
                run.text = ""
            p.runs[0].text = "Скриншоты выполнения работы"
            changed.append("shots-title")
        if "шапка отчёта" in text.lower() or "титульный лист" in text.lower():
            p._element.getparent().remove(p._element)
            changed.append("header-shot")

    # Remove answer fields: everything from the answers heading to the end.
    paragraphs = list(doc.paragraphs)
    cut = next((i for i, p in enumerate(paragraphs) if p.text.strip() == "Ответы на контрольные вопросы"), None)
    if cut is not None:
        for p in paragraphs[cut:]:
            p._element.getparent().remove(p._element)
        changed.append("answers-removed")

    if changed:
        doc.save(path)
    return changed


def main():
    roots = sorted(Path("courses").glob("*/*/reports"))
    for root in roots:
        for path in sorted(root.glob("*.docx")):
            if "template" not in path.name:
                continue
            changes = fix(path)
            if changes:
                print(path, ", ".join(sorted(set(changes))))


if __name__ == "__main__":
    main()
