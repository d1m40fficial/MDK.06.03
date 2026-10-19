"""Generate the downloadable materials for Practice 1 (УФИС).

Run:  python make_template.py
Writes next to this file:
  UIFIS_practice-1_report-template.docx      шаблон отчёта
  UIFIS_practice-1_classification-table.csv  таблица для классификации
Filenames are ASCII so the download links stay safe in any browser.
"""

import csv
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

HERE = Path(__file__).parent
OUT_DOCX = HERE / "UIFIS_practice-1_report-template.docx"
OUT_CSV = HERE / "UIFIS_practice-1_classification-table.csv"
OUT_DOCX2 = HERE / "UIFIS_practice-2_report-template.docx"
OUT_CSV2 = HERE / "UIFIS_practice-2_composition-table.csv"
OUT_DOCX3 = HERE / "UIFIS_practice-3_report-template.docx"
OUT_CSV3 = HERE / "UIFIS_practice-3_flow-registry.csv"
QUESTIONS = [
    "Почему признаки классификации должны быть независимыми?",
    "Может ли одна система быть пакетной и оперативной одновременно?",
    "Чем масштаб отличается от сферы применения?",
]
QUESTIONS2 = [
    "Чем функциональная подсистема отличается от обеспечивающей?",
    "Почему функциональная подсистема не работает без обеспечивающих?",
    "К какому виду обеспечения относятся базы данных и почему?",
]
ROWS = [
    ("1", "Банковская АБС"),
    ("2", "1С:Бухгалтерия малого предприятия"),
    ("3", "Система диспетчеризации завода"),
    ("4", "Интернет-магазин"),
    ("5", "Медицинская картотека поликлиники"),
]
SYSTEMS2 = [
    "Электронный журнал колледжа",
    "Складской учёт",
    "Онлайн-запись к врачу",
]
QUESTIONS3 = [
    "Чем поток данных отличается от потока управления?",
    "Какие четыре элемента используются на диаграмме потоков данных?",
    "Почему у каждого процесса должен быть входной поток?",
    "Почему накопитель нельзя рисовать источником без процесса?",
]


def line(doc, text, bold=False, size=12, align=None):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = bold
    r.font.size = Pt(size)
    if align is not None:
        p.alignment = align
    return p


def slot(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(text)
    r.italic = True
    r.font.size = Pt(11)


def make_docx():
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name = "Times New Roman"
    st.font.size = Pt(12)

    line(doc, "Устройство и функционирование информационной системы (МДК.06.03)", bold=True, size=14,
         align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Отчёт по практической работе №1", bold=True, size=13, align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Тема: Классификация информационных систем", align=WD_ALIGN_PARAGRAPH.CENTER)
    doc.add_paragraph()
    line(doc, "ФИО студента: ______________________________________")
    line(doc, "Группа: ______________________  Дата: _______________")
    doc.add_paragraph()

    line(doc, "Цель работы", bold=True)
    line(doc, "________________________________________________________________________")
    line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Краткие теоретические сведения", bold=True)
    line(doc, "Перечислите четыре признака классификации ИС и приведите по 2–3 значения каждого:")
    line(doc, "1. Сфера применения: ____________________________________________________")
    line(doc, "2. Масштаб: _____________________________________________________________")
    line(doc, "3. Способ обработки: ____________________________________________________")
    line(doc, "4. Архитектура: _________________________________________________________")
    doc.add_paragraph()

    line(doc, "Таблица результатов классификации", bold=True)
    cols = ["№", "Информационная система", "Сфера", "Масштаб", "Способ обработки", "Архитектура",
            "Обоснование"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for n, name in ROWS:
        cells = t.add_row().cells
        cells[0].text = n
        cells[1].text = name
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
    doc.add_paragraph()

    line(doc, "Скриншоты", bold=True)
    slot(doc, "[ Место для скриншота 1: шапка отчёта с заполненными полями ]")
    doc.add_paragraph()
    slot(doc, "[ Место для скриншота 2: карточка «Банковская АБС» в классификаторе ]")
    doc.add_paragraph()

    line(doc, "Вывод", bold=True)
    line(doc, "Почему у одной системы получилось несколько классов? Чем это отличается от описания "
              "системы одним названием?")
    for _ in range(4):
        line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Ответы на контрольные вопросы", bold=True)
    for i, q in enumerate(QUESTIONS, 1):
        line(doc, f"{i}. {q}")
        for _ in range(3):
            line(doc, "________________________________________________________________________")
        doc.add_paragraph()

    doc.save(OUT_DOCX)
    print(f"wrote {OUT_DOCX}")


def make_csv():
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["№", "Информационная система", "Сфера", "Масштаб", "Способ обработки",
                    "Архитектура", "Обоснование"])
        for n, name in ROWS:
            w.writerow([n, name, "", "", "", "", ""])
    print(f"wrote {OUT_CSV}")


def make_docx2():
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name = "Times New Roman"
    st.font.size = Pt(12)

    line(doc, "Устройство и функционирование информационной системы (МДК.06.03)", bold=True, size=14,
         align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Отчёт по практической работе №2", bold=True, size=13, align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Тема: Построение схемы состава информационной системы", align=WD_ALIGN_PARAGRAPH.CENTER)
    doc.add_paragraph()
    line(doc, "ФИО студента: ______________________________________")
    line(doc, "Группа: ______________________  Дата: _______________")
    doc.add_paragraph()

    line(doc, "Цель работы", bold=True)
    line(doc, "________________________________________________________________________")
    line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Краткие теоретические сведения", bold=True)
    line(doc, "Перечислите пять видов обеспечения ИС и приведите пример каждого:")
    line(doc, "1. Техническое: _________________________________________________________")
    line(doc, "2. Программное: _________________________________________________________")
    line(doc, "3. Информационное: _____________________________________________________")
    line(doc, "4. Организационное: ____________________________________________________")
    line(doc, "5. Правовое: ___________________________________________________________")
    doc.add_paragraph()

    line(doc, "Схема состава информационной системы", bold=True)
    line(doc, "Нарисуйте схему состава выбранной системы: функциональные подсистемы, "
              "обеспечивающие подсистемы и связи между ними (какая функция на какое "
              "обеспечение опирается).")
    slot(doc, "[ Место для схемы состава: нарисуйте от руки, в графическом редакторе или вставьте снимок ]")
    doc.add_paragraph()

    line(doc, "Таблица состава", bold=True)
    cols = ["Часть", "Подсистема", "Что включает", "Опирается на"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for label in ("Функциональная",) * 3 + ("Обеспечивающая",) * 5:
        cells = t.add_row().cells
        cells[0].text = label
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
    doc.add_paragraph()

    line(doc, "Скриншоты", bold=True)
    slot(doc, "[ Место для скриншота 1: шапка отчёта с заполненными полями ]")
    doc.add_paragraph()
    slot(doc, "[ Место для скриншота 2: схема состава в рабочем виде ]")
    doc.add_paragraph()

    line(doc, "Вывод", bold=True)
    line(doc, "Почему функциональная подсистема не работает без обеспечивающих? Приведите "
              "пример из своей схемы.")
    for _ in range(4):
        line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Ответы на контрольные вопросы", bold=True)
    for i, q in enumerate(QUESTIONS2, 1):
        line(doc, f"{i}. {q}")
        for _ in range(3):
            line(doc, "________________________________________________________________________")
        doc.add_paragraph()

    doc.save(OUT_DOCX2)
    print(f"wrote {OUT_DOCX2}")


def make_csv2():
    with OUT_CSV2.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Часть", "Подсистема", "Что включает", "Опирается на"])
        for _ in range(3):
            w.writerow(["Функциональная", "", "", ""])
        for _ in range(5):
            w.writerow(["Обеспечивающая", "", "", ""])
    print(f"wrote {OUT_CSV2}")


def make_docx3():
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name = "Times New Roman"
    st.font.size = Pt(12)

    line(doc, "Устройство и функционирование информационной системы (МДК.06.03)", bold=True, size=14,
         align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Отчёт по практической работе №3", bold=True, size=13, align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Тема: Моделирование информационных потоков", align=WD_ALIGN_PARAGRAPH.CENTER)
    doc.add_paragraph()
    line(doc, "ФИО студента: ______________________________________")
    line(doc, "Группа: ______________________  Дата: _______________")
    doc.add_paragraph()

    line(doc, "Цель работы", bold=True)
    line(doc, "________________________________________________________________________")
    line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Краткие теоретические сведения", bold=True)
    line(doc, "Перечислите четыре элемента диаграммы потоков данных и их обозначения:")
    line(doc, "1. Внешняя сущность: ____________________________________________________")
    line(doc, "2. Процесс: _____________________________________________________________")
    line(doc, "3. Накопитель данных: ___________________________________________________")
    line(doc, "4. Поток данных: ________________________________________________________")
    doc.add_paragraph()

    line(doc, "Выбранная информационная система", bold=True)
    line(doc, "Название: _______________________________________________________________")
    doc.add_paragraph()

    line(doc, "Элементы системы", bold=True)
    cols = ["Тип элемента", "Название", "Что делает или хранит"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for label in ("Внешняя сущность",) * 2 + ("Процесс",) * 3 + ("Накопитель",) * 2:
        cells = t.add_row().cells
        cells[0].text = label
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
    doc.add_paragraph()

    line(doc, "Диаграмма потоков данных", bold=True)
    line(doc, "Нарисуйте диаграмму выбранной системы: внешние сущности, процессы, накопители "
              "и подписанные потоки данных. Если есть поток управления, покажите его отдельно.")
    slot(doc, "[ Место для диаграммы: нарисуйте от руки, в графическом редакторе или вставьте снимок ]")
    doc.add_paragraph()

    line(doc, "Реестр потоков", bold=True)
    cols = ["№", "Состав данных", "Источник", "Приёмник", "Тип"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for n in range(1, 9):
        cells = t.add_row().cells
        cells[0].text = str(n)
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
    doc.add_paragraph()

    line(doc, "Скриншоты", bold=True)
    slot(doc, "[ Место для скриншота 1: шапка отчёта с заполненными полями ]")
    doc.add_paragraph()
    slot(doc, "[ Место для скриншота 2: диаграмма потоков данных в рабочем виде ]")
    doc.add_paragraph()

    line(doc, "Вывод", bold=True)
    line(doc, "Какие процессы в вашей системе преобразуют данные и где они хранятся? Приведите "
              "пример потока, который было бы легко потерять.")
    for _ in range(4):
        line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Ответы на контрольные вопросы", bold=True)
    for i, q in enumerate(QUESTIONS3, 1):
        line(doc, f"{i}. {q}")
        for _ in range(3):
            line(doc, "________________________________________________________________________")
        doc.add_paragraph()

    doc.save(OUT_DOCX3)
    print(f"wrote {OUT_DOCX3}")


def make_csv3():
    with OUT_CSV3.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["№", "Состав данных", "Источник", "Приёмник", "Тип"])
        for n in range(1, 9):
            w.writerow([n, "", "", "", ""])
    print(f"wrote {OUT_CSV3}")


if __name__ == "__main__":
    make_docx()
    make_csv()
    make_docx2()
    make_csv2()
    make_docx3()
    make_csv3()
