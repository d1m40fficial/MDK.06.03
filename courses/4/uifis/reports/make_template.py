"""Generate the downloadable materials for UIFIS practices.

Run:  python make_template.py
Writes DOCX report templates and CSV tables next to this file for practices 1-4
and 6. Filenames are ASCII so the download links stay safe in any browser.
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
OUT_DOCX4 = HERE / "UIFIS_practice-4_report-template.docx"
OUT_CSV4 = HERE / "UIFIS_practice-4_decision-matrix.csv"
OUT_DOCX5 = HERE / "UIFIS_practice-5_report-template.docx"
OUT_CSV5 = HERE / "UIFIS_practice-5_configuration-matrix.csv"
OUT_DOCX6 = HERE / "UIFIS_practice-6_report-template.docx"
OUT_CSV6 = HERE / "UIFIS_practice-6_install-checklist.csv"
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
QUESTIONS4 = [
    "Чем архитектура отличается от платформы?",
    "Почему в матрице выбора веса критериев должны давать единицу?",
    "Когда клиент-серверная архитектура лучше трёхзвенной?",
    "Почему схема размещения должна показывать границу доступа?",
    "Почему RAID не заменяет резервное копирование?",
]
CRITERIA4 = [
    ("Пользователи и нагрузка", "0,25"),
    ("Время ответа", "0,15"),
    ("Безопасность и доступ из дома", "0,20"),
    ("Частота обновления логики", "0,15"),
    ("Бюджет (5 значит дешевле)", "0,15"),
    ("Сопровождение", "0,10"),
]
QUESTIONS6 = [
    "Почему обновления устанавливают до настройки служб, а не после?",
    "Почему вход по SSH-ключу безопаснее пароля и что проверить до отключения пароля?",
    "Зачем приложению отдельный пользователь uifis, если уже есть student с правами sudo?",
    "Что проверить, если после смены статического адреса SSH перестал подключаться?",
    "Почему снимок виртуальной машины не заменяет резервную копию данных?",
]
CHECKS6 = [
    ("Имя узла", "hostnamectl", "Static hostname: uifis-srv01"),
    ("Часовой пояс", "timedatectl", "Asia/Yekaterinburg, синхронизация включена"),
    ("Сеть", "ip -br a", "адрес из задания, интерфейс UP"),
    ("Маршрут", "ip route", "маршрут по умолчанию есть"),
    ("SSH", "systemctl status ssh", "active (running)"),
    ("Вход по ключу", "ssh student@адрес", "вход без пароля"),
    ("Firewall", "sudo ufw status verbose", "активен, разрешён только SSH"),
    ("Службы", "systemctl --failed", "нет сбойных юнитов"),
    ("Диск", "df -h, df -i", "есть свободное место и inode"),
    ("Память", "free -h", "память видна, swap не перегружен"),
    ("Каталог", "ls -ld /srv/uifis", "владелец uifis, права 0750"),
    ("Снимок", "интерфейс гипервизора", "снимок after-base-setup существует"),
]
QUESTIONS5 = [
    "Почему для расчёта берут пиковую нагрузку, а не среднюю?",
    "Зачем нужен запас 30 процентов по памяти и диску?",
    "Почему кэш СУБД включают в расчёт памяти?",
    "Почему RAID не заменяет резервную копию?",
    "Когда отказоустойчивая конфигурация избыточна?",
]
CALC5 = [
    ("Процессор", "запросы/с × время на запрос / целевая загрузка", "", "", ""),
    ("Память", "(ОС + приложение + кэш) × 1,3", "", "", ""),
    ("Диск", "(данные + журналы + временные) × 1,3", "", "", ""),
    ("Сеть", "запросы/с × размер ответа × 8 × 2", "", "", ""),
]
CONFIG5 = [
    ("Процессор", "", "", "", ""),
    ("Память", "", "", "", ""),
    ("Диск", "", "", "", ""),
    ("RAID", "", "", "", ""),
    ("Сеть", "", "", "", ""),
    ("Питание", "", "", "", ""),
    ("Резервная копия", "", "", "", ""),
    ("Относительная стоимость", "", "", "", ""),
]
CHECKS5 = [
    ("Загрузка процессора", "не выше 65-70 процентов в пике", "", ""),
    ("Память", "запас не менее 30 процентов", "", ""),
    ("Диск", "запас не менее 30 процентов", "", ""),
    ("Сеть", "запас не менее 2 раз", "", ""),
    ("Диски", "RAID 1 или RAID 10 для системы", "", ""),
    ("Питание", "UPS для рабочего узла", "", ""),
    ("Резервная копия", "хранится отдельно", "", ""),
    ("Доступность", "соответствует RTO и RPO", "", ""),
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


def make_docx4():
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name = "Times New Roman"
    st.font.size = Pt(12)

    line(doc, "Устройство и функционирование информационной системы (МДК.06.03)", bold=True, size=14,
         align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Отчёт по практической работе №4", bold=True, size=13, align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Тема: Проектирование архитектуры информационной системы",
         align=WD_ALIGN_PARAGRAPH.CENTER)
    doc.add_paragraph()
    line(doc, "ФИО студента: ______________________________________")
    line(doc, "Группа: ______________________  Дата: _______________")
    doc.add_paragraph()

    line(doc, "Цель работы", bold=True)
    line(doc, "________________________________________________________________________")
    line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Краткие теоретические сведения", bold=True)
    line(doc, "Опишите три слоя и три базовых варианта размещения:")
    line(doc, "1. Представление: _______________________________________________________")
    line(doc, "2. Логика: ______________________________________________________________")
    line(doc, "3. Данные: ______________________________________________________________")
    line(doc, "4. Файл-сервер: _________________________________________________________")
    line(doc, "5. Клиент-сервер: _______________________________________________________")
    line(doc, "6. Трёхзвенная: _________________________________________________________")
    doc.add_paragraph()

    line(doc, "Выбранная система и профиль нагрузки", bold=True)
    line(doc, "Название: _______________________________________________________________")
    line(doc, "Пользователи: ___________________________________________________________")
    line(doc, "Одновременные сессии: __________________________________________________")
    line(doc, "Данные и доступ: ________________________________________________________")
    doc.add_paragraph()

    line(doc, "Требования", bold=True)
    cols = ["Тип", "Номер", "Требование", "Значение или проверка"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for kind, prefix, count in (("Функциональное", "ФТ", 4), ("Нефункциональное", "НФТ", 5)):
        for n in range(1, count + 1):
            cells = t.add_row().cells
            cells[0].text = kind
            cells[1].text = f"{prefix}-{n}"
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
    doc.add_paragraph()

    line(doc, "Варианты архитектуры", bold=True)
    cols = ["Вариант", "Представление", "Логика", "Данные", "Что идёт по сети"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for name in ("Файл-сервер", "Клиент-сервер", "Трёхзвенная"):
        cells = t.add_row().cells
        cells[0].text = name
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
    doc.add_paragraph()

    line(doc, "Матрица выбора", bold=True)
    line(doc, "Оценки от 1 до 5. Для бюджета 5 значит дешевле. Сумма весов равна 1,00.")
    cols = ["Критерий", "Вес", "Файл-сервер", "Клиент-сервер", "Трёхзвенная"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for criterion, weight in CRITERIA4:
        cells = t.add_row().cells
        cells[0].text = criterion
        cells[1].text = weight
    cells = t.add_row().cells
    cells[0].text = "Взвешенная оценка"
    cells[1].text = "1,00"
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
    doc.add_paragraph()

    line(doc, "Решение", bold=True)
    line(doc, "Выбранный вариант: ______________________________________________________")
    line(doc, "________________________________________________________________________")
    line(doc, "Какие требования он закрывает: __________________________________________")
    line(doc, "________________________________________________________________________")
    line(doc, "Чем придётся заплатить: _________________________________________________")
    line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Схема размещения", bold=True)
    line(doc, "Покажите узлы, слои на них, сетевые связи, подписи и границу доступа.")
    slot(doc, "[ Место для схемы: нарисуйте от руки, в графическом редакторе или вставьте снимок ]")
    doc.add_paragraph()

    line(doc, "Таблица узлов", bold=True)
    cols = ["Узел", "Роль", "Программное обеспечение", "Сеть", "Резерв"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for _ in range(5):
        t.add_row()
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
    doc.add_paragraph()

    line(doc, "Риски решения", bold=True)
    cols = ["Риск", "Вероятность", "Влияние", "Мера снижения"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for _ in range(4):
        t.add_row()
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
    doc.add_paragraph()

    line(doc, "Скриншоты", bold=True)
    slot(doc, "[ Место для скриншота 1: шапка отчёта и профиль системы ]")
    doc.add_paragraph()
    slot(doc, "[ Место для скриншота 2: заполненная матрица выбора ]")
    doc.add_paragraph()
    slot(doc, "[ Место для скриншота 3: схема размещения с подписями ]")
    doc.add_paragraph()

    line(doc, "Вывод", bold=True)
    line(doc, "Какое требование было самым трудным? Почему выбранный вариант его закрывает? "
              "Что изменилось бы при другом бюджете?")
    for _ in range(6):
        line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Ответы на контрольные вопросы", bold=True)
    for i, q in enumerate(QUESTIONS4, 1):
        line(doc, f"{i}. {q}")
        for _ in range(3):
            line(doc, "________________________________________________________________________")
        doc.add_paragraph()

    doc.save(OUT_DOCX4)
    print(f"wrote {OUT_DOCX4}")


def make_csv4():
    with OUT_CSV4.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Критерий", "Вес", "Файл-сервер", "Клиент-сервер", "Трёхзвенная",
                    "Комментарий"])
        for criterion, weight in CRITERIA4:
            w.writerow([criterion, weight, "", "", "", ""])
        w.writerow(["Взвешенная оценка", "1,00", "", "", "", ""])
    print(f"wrote {OUT_CSV4}")


def make_docx6():
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name = "Times New Roman"
    st.font.size = Pt(12)

    line(doc, "Устройство и функционирование информационной системы (МДК.06.03)", bold=True, size=14,
         align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Отчёт по практической работе №6", bold=True, size=13, align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Тема: Установка и базовая настройка серверной операционной системы",
         align=WD_ALIGN_PARAGRAPH.CENTER)
    doc.add_paragraph()
    line(doc, "ФИО студента: ______________________________________")
    line(doc, "Группа: ______________________  Дата: _______________")
    doc.add_paragraph()

    line(doc, "Цель работы", bold=True)
    line(doc, "________________________________________________________________________")
    line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Параметры виртуальной машины", bold=True)
    cols = ["Параметр", "Значение"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for name in ("Имя узла", "Гипервизор", "Память", "Процессоры", "Диск", "Сеть", "Версия ОС"):
        cells = t.add_row().cells
        cells[0].text = name
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
    doc.add_paragraph()

    line(doc, "Журнал установки", bold=True)
    cols = ["Этап", "Что сделано", "Команда или наблюдение", "Результат"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for n in range(1, 8):
        cells = t.add_row().cells
        cells[0].text = str(n)
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
    doc.add_paragraph()

    line(doc, "Базовая настройка", bold=True)
    cols = ["Настройка", "Команда", "Фактический результат"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for name in ("Имя узла", "Обновления", "Часовой пояс", "Статический адрес",
                 "SSH и ключи", "Firewall", "Служебный пользователь", "Снимок"):
        cells = t.add_row().cells
        cells[0].text = name
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
    doc.add_paragraph()

    line(doc, "Чек-лист приёмки", bold=True)
    cols = ["Проверка", "Команда", "Ожидаемый результат", "Факт", "Отметка"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for name, command, expected in CHECKS6:
        cells = t.add_row().cells
        cells[0].text = name
        cells[1].text = command
        cells[2].text = expected
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(8)
    doc.add_paragraph()

    line(doc, "Скриншоты", bold=True)
    for caption in (
        "первый экран установщика",
        "вход после первой загрузки",
        "вывод ip -br a",
        "вывод systemctl --failed",
        "вывод sudo ufw status verbose",
        "успешный вход по SSH",
    ):
        slot(doc, f"[ Место для скриншота: {caption} ]")
        doc.add_paragraph()

    line(doc, "Трудности и их решение", bold=True)
    line(doc, "Какая настройка вызвала трудности? Как вы определили причину и чем проверили решение?")
    for _ in range(6):
        line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Вывод", bold=True)
    line(doc, "Что доказало, что узел готов к работе? Какие проверки вы считаете обязательными "
              "для любого сервера?")
    for _ in range(5):
        line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Ответы на контрольные вопросы", bold=True)
    for i, q in enumerate(QUESTIONS6, 1):
        line(doc, f"{i}. {q}")
        for _ in range(3):
            line(doc, "________________________________________________________________________")
        doc.add_paragraph()

    doc.save(OUT_DOCX6)
    print(f"wrote {OUT_DOCX6}")


def make_csv6():
    with OUT_CSV6.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Проверка", "Команда", "Ожидаемый результат", "Фактический результат",
                    "Отметка"])
        for name, command, expected in CHECKS6:
            w.writerow([name, command, expected, "", ""])
        w.writerow(["Итог", "принято или не принято", "", "", ""])
    print(f"wrote {OUT_CSV6}")


def make_docx5():
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name = "Times New Roman"
    st.font.size = Pt(12)

    line(doc, "Устройство и функционирование информационной системы (МДК.06.03)", bold=True, size=14,
         align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Отчёт по практической работе №5", bold=True, size=13, align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, "Тема: Подбор аппаратной конфигурации информационной системы",
         align=WD_ALIGN_PARAGRAPH.CENTER)
    doc.add_paragraph()
    line(doc, "ФИО студента: ______________________________________")
    line(doc, "Группа: ______________________  Дата: _______________")
    doc.add_paragraph()

    line(doc, "Цель работы", bold=True)
    line(doc, "________________________________________________________________________")
    line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Профиль системы", bold=True)
    cols = ["Параметр", "Значение"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for name in ("Система", "Пользователи", "Пиковые сессии", "Запросы в секунду",
                 "Средний размер ответа", "Объём данных и рост", "RTO", "RPO", "Бюджет"):
        cells = t.add_row().cells
        cells[0].text = name
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
    doc.add_paragraph()

    line(doc, "Расчёт ресурсов", bold=True)
    line(doc, "Покажите формулу, подстановку и итог. Округляйте вверх.")
    cols = ["Ресурс", "Формула", "Расчёт", "Значение", "Запас"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for name, formula, _, _, _ in CALC5:
        cells = t.add_row().cells
        cells[0].text = name
        cells[1].text = formula
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(8)
    doc.add_paragraph()

    line(doc, "Конфигурации", bold=True)
    cols = ["Компонент", "Минимальная", "Рекомендуемая", "Отказоустойчивая", "Комментарий"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for name, _, _, _, _ in CONFIG5:
        cells = t.add_row().cells
        cells[0].text = name
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(8)
    doc.add_paragraph()

    line(doc, "Проверка расчёта", bold=True)
    cols = ["Что проверить", "Норма", "Факт", "Вывод"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for name, norm, _, _ in CHECKS5:
        cells = t.add_row().cells
        cells[0].text = name
        cells[1].text = norm
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(8)
    doc.add_paragraph()

    line(doc, "Выбор конфигурации", bold=True)
    line(doc, "Выбранная конфигурация: ________________________________________________")
    line(doc, "Какие требования она закрывает: ________________________________________")
    line(doc, "________________________________________________________________________")
    line(doc, "Чем придётся заплатить: _________________________________________________")
    line(doc, "________________________________________________________________________")
    line(doc, "Почему не выбраны два других варианта: __________________________________")
    line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Риски выбранного решения", bold=True)
    cols = ["Риск", "Вероятность", "Влияние", "Мера снижения"]
    t = doc.add_table(rows=1, cols=len(cols))
    t.style = "Table Grid"
    for i, c in enumerate(cols):
        t.rows[0].cells[i].text = c
    for _ in range(4):
        t.add_row()
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
    doc.add_paragraph()

    line(doc, "Скриншоты", bold=True)
    for caption in (
        "профиль системы и требования",
        "расчётная таблица с формулами",
        "итоговая матрица конфигураций",
    ):
        slot(doc, f"[ Место для скриншота: {caption} ]")
        doc.add_paragraph()

    line(doc, "Вывод", bold=True)
    line(doc, "Какое требование было самым трудным? Почему выбранная конфигурация достаточна "
              "и что изменилось бы при другом бюджете?")
    for _ in range(5):
        line(doc, "________________________________________________________________________")
    doc.add_paragraph()

    line(doc, "Ответы на контрольные вопросы", bold=True)
    for i, q in enumerate(QUESTIONS5, 1):
        line(doc, f"{i}. {q}")
        for _ in range(3):
            line(doc, "________________________________________________________________________")
        doc.add_paragraph()

    doc.save(OUT_DOCX5)
    print(f"wrote {OUT_DOCX5}")


def make_csv5():
    with OUT_CSV5.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Компонент", "Минимальная", "Рекомендуемая", "Отказоустойчивая",
                    "Комментарий"])
        for name, _, _, _, _ in CONFIG5:
            w.writerow([name, "", "", "", ""])
        w.writerow(["Итог", "выбрано или не выбрано", "", "", ""])
    print(f"wrote {OUT_CSV5}")


if __name__ == "__main__":
    make_docx()
    make_csv()
    make_docx2()
    make_csv2()
    make_docx3()
    make_csv3()
    make_docx4()
    make_csv4()
    make_docx5()
    make_csv5()
    make_docx6()
    make_csv6()
