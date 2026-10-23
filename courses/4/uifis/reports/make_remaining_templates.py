"""Generate downloadable materials for UIFIS practices 10-18.

Run from the repository root:
    python courses/4/uifis/reports/make_remaining_templates.py

Practice 10 is written first. The other practices are added as their chapters
are produced, so every download link in a chapter points at a real file.
"""

import csv
import json
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt

HERE = Path(__file__).parent


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


def set_table_font(table, size=9):
    for row in table.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(size)


def base_doc(number, theme):
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name = "Times New Roman"
    st.font.size = Pt(12)
    line(doc, "Устройство и функционирование информационной системы (МДК.06.03)",
         bold=True, size=14, align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, f"Отчёт по практической работе {number}", bold=True, size=13,
         align=WD_ALIGN_PARAGRAPH.CENTER)
    line(doc, f"Тема: {theme}", align=WD_ALIGN_PARAGRAPH.CENTER)
    doc.add_paragraph()
    line(doc, "ФИО студента: ______________________________________")
    line(doc, "Группа: ______________________  Дата: _______________")
    doc.add_paragraph()
    return doc


def goal(doc, text):
    line(doc, "Цель работы", bold=True)
    for part in text:
        line(doc, part)
    doc.add_paragraph()


def table(doc, title, columns, rows, size=9):
    line(doc, title, bold=True)
    t = doc.add_table(rows=1, cols=len(columns))
    t.style = "Table Grid"
    for i, c in enumerate(columns):
        t.rows[0].cells[i].text = c
    for row in rows:
        cells = t.add_row().cells
        for i, value in enumerate(row):
            cells[i].text = str(value)
    set_table_font(t, size)
    doc.add_paragraph()
    return t


def shots(doc, captions):
    line(doc, "Скриншоты", bold=True)
    for caption in captions:
        slot(doc, f"[ Место для скриншота: {caption} ]")
        doc.add_paragraph()


def conclusion(doc, text, questions):
    line(doc, "Вывод", bold=True)
    for part in text:
        line(doc, part)
    for _ in range(5):
        line(doc, "________________________________________________________________________")
    doc.add_paragraph()
    line(doc, "Ответы на контрольные вопросы", bold=True)
    for i, q in enumerate(questions, 1):
        line(doc, f"{i}. {q}")
        for _ in range(3):
            line(doc, "________________________________________________________________________")
        doc.add_paragraph()


def make_practice10():
    doc = base_doc(10, "Работа с веб-API информационной системы")
    goal(doc, [
        "Запустить учебный веб-сервис, проверить его запросы в Postman и написать "
        "клиент на Python, который читает страницы, обрабатывает ошибки и сохраняет "
        "данные. Сверить результаты двух инструментов и оформить отчёт.",
    ])
    table(doc, "Контракт учебного API", ["Метод", "Путь", "Код", "Назначение"], [
        ("GET", "/api/students?group=&limit=&offset=", "200", "Список студентов с пагинацией"),
        ("GET", "/api/students/{id}", "200/404", "Карточка студента или ошибка"),
        ("POST", "/api/students", "201/400", "Создать студента с валидацией"),
        ("GET", "/api/error", "500", "Учебная ошибка сервера"),
        ("GET", "/health.json", "200", "Состояние сервиса"),
    ])
    table(doc, "Проверки Postman", ["Проверка", "Запрос", "Ожидаемый результат", "Факт"], [
        ("Список", "GET /api/students", "200, items не пуст, есть count и next"),
        ("Фильтр", "GET /api/students?group=ИС-41", "все group равны ИС-41"),
        ("Пагинация", "GET /api/students?limit=3&offset=3", "3 элемента, next не пуст"),
        ("Карточка", "GET /api/students/1", "200, обязательные поля"),
        ("Нет студента", "GET /api/students/999", "404, error"),
        ("Создание", "POST /api/students", "201, Location, id"),
        ("Неверный email", "POST /api/students", "400, field email"),
        ("Ошибка сервера", "GET /api/error", "500, error"),
        ("Время", "любой запрос", "responseTime ниже 1000 мс"),
        ("Секрет", "любой ответ", "нет password и token"),
    ])
    table(doc, "Сверка клиента и Postman", ["Показатель", "Postman", "Python", "Расхождение"], [
        ("Код ответа", "", "", ""),
        ("Число записей", "", "", ""),
        ("Первый id", "", "", ""),
        ("Время, мс", "", "", ""),
        ("Текст ошибки", "", "", ""),
    ])
    table(doc, "Разбор отказов", ["Симптом", "Где смотреть", "Причина", "Исправление"], [
        ("404 на известном пути", "URL и path", "", ""),
        ("400 при создании", "тело JSON и поля", "", ""),
        ("500 на /api/error", "это учебная ошибка", "", ""),
        ("Таймаут", "сервис и порт", "", ""),
        ("Пустая страница", "limit и offset", "", ""),
        ("Повтор создал дубль", "ключ и уникальность", "", ""),
    ])
    shots(doc, [
        "запуск mock API и вывод health.json",
        "коллекция и окружение Postman",
        "успешные тесты Postman",
        "тест 404 и тест 400",
        "запуск api_client.py и файл students.json",
        "сравнение ответов Postman и Python",
    ])
    conclusion(doc, [
        "Почему код 200 не доказывает корректность данных? Как вы проверяли поля и "
        "количество записей? Что изменится, если сервис начнёт возвращать данные "
        "страницами по 5 записей?",
        "Какая ошибка была самой трудной и как вы нашли её причину?",
    ], [
        "Чем API отличается от прямого доступа к базе данных?",
        "Зачем нужны коды 400, 404 и 500 и чем они различаются?",
        "Что такое пагинация и почему клиент должен её поддерживать?",
        "Почему повтор запроса на создание требует ключа идемпотентности?",
        "Какие поля ответа нельзя писать в журнал?",
        "Чем проверка в Postman отличается от проверки в коде клиента?",
    ])
    out = HERE / "UIFIS_practice-10_report-template.docx"
    doc.save(out)
    print("wrote", out)

    rows = [
        ("Сервис", "python mock_api.py", "порт 8090, health 200"),
        ("Список", "GET /api/students", "200, items и count"),
        ("Фильтр", "GET /api/students?group=ИС-41", "только ИС-41"),
        ("Пагинация", "GET /api/students?limit=3&offset=3", "3 элемента"),
        ("Карточка", "GET /api/students/1", "200, поля студента"),
        ("Нет студента", "GET /api/students/999", "404"),
        ("Создание", "POST /api/students", "201"),
        ("Неверный email", "POST /api/students", "400"),
        ("Ошибка сервера", "GET /api/error", "500"),
        ("Postman tests", "Tests", "все проверки зелёные"),
        ("Python клиент", "python api_client.py", "students.json создан"),
        ("Сверка", "сравнить id и count", "числа совпали"),
    ]
    out = HERE / "UIFIS_practice-10_checklist.csv"
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Проверка", "Команда или запрос", "Ожидаемый результат", "Факт", "Вывод"])
        for row in rows:
            w.writerow([*row, "", ""])
        w.writerow(["Итог", "12 проверок", "все выполнены", "", ""])
    print("wrote", out)

    collection = {
        "info": {
            "name": "UIFIS Practice 10 - Students API",
            "description": "Учебная коллекция запросов к mock API на порту 8090.",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "variable": [{"key": "baseUrl", "value": "http://127.0.0.1:8090"}],
        "item": [
            {
                "name": "01 Health",
                "request": {"method": "GET", "url": "{{baseUrl}}/health.json"},
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "pm.test('JSON content type', () => pm.response.to.have.header('Content-Type', /application\\/json/));",
                    "const body = pm.response.json();",
                    "pm.test('service is healthy', () => pm.expect(body.status).to.eql('ok'));",
                    "pm.test('fast enough', () => pm.expect(pm.response.responseTime).to.be.below(1000));",
                ]}}],
            },
            {
                "name": "02 Students list",
                "request": {"method": "GET", "url": "{{baseUrl}}/api/students"},
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "const body = pm.response.json();",
                    "pm.test('items is array', () => pm.expect(body.items).to.be.an('array'));",
                    "pm.test('count is number', () => pm.expect(body.count).to.be.a('number'));",
                    "pm.test('required fields', () => body.items.forEach(s => { pm.expect(s).to.have.property('id'); pm.expect(s).to.have.property('full_name'); pm.expect(s).to.have.property('email'); pm.expect(s).to.have.property('group'); }));",
                    "pm.test('no password', () => pm.expect(JSON.stringify(body)).to.not.include('password'));",
                ]}}],
            },
            {
                "name": "03 Filter by group",
                "request": {"method": "GET", "url": "{{baseUrl}}/api/students?group=ИС-41"},
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "const body = pm.response.json();",
                    "pm.test('only IS-41', () => body.items.forEach(s => pm.expect(s.group).to.eql('ИС-41')));",
                ]}}],
            },
            {
                "name": "04 Page",
                "request": {"method": "GET", "url": "{{baseUrl}}/api/students?limit=3&offset=3"},
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "const body = pm.response.json();",
                    "pm.test('three items', () => pm.expect(body.items.length).to.eql(3));",
                    "pm.test('next present', () => pm.expect(body.next).to.be.a('string'));",
                ]}}],
            },
            {
                "name": "05 Student card",
                "request": {"method": "GET", "url": "{{baseUrl}}/api/students/1"},
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "const body = pm.response.json();",
                    "pm.test('id 1', () => pm.expect(body.id).to.eql(1));",
                ]}}],
            },
            {
                "name": "06 Missing student",
                "request": {"method": "GET", "url": "{{baseUrl}}/api/students/999"},
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('404 Not Found', () => pm.response.to.have.status(404));",
                    "pm.test('error field', () => pm.expect(pm.response.json()).to.have.property('error'));",
                ]}}],
            },
            {
                "name": "07 Create student",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {"mode": "raw", "raw": "{\n  \"full_name\": \"Соколов Пётр Ильич\",\n  \"email\": \"sokolov@example.ru\",\n  \"group\": \"ИС-42\"\n}"},
                    "url": "{{baseUrl}}/api/students",
                },
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('201 Created', () => pm.response.to.have.status(201));",
                    "const body = pm.response.json();",
                    "pm.test('id returned', () => pm.expect(body.id).to.be.a('number'));",
                    "pm.test('Location header', () => pm.response.to.have.header('Location'));",
                ]}}],
            },
            {
                "name": "08 Invalid email",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {"mode": "raw", "raw": "{\n  \"full_name\": \"Ошибка\",\n  \"email\": \"not-an-email\",\n  \"group\": \"ИС-42\"\n}"},
                    "url": "{{baseUrl}}/api/students",
                },
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('400 Bad Request', () => pm.response.to.have.status(400));",
                    "pm.test('field email', () => pm.expect(pm.response.json().field).to.eql('email'));",
                ]}}],
            },
            {
                "name": "09 Server error",
                "request": {"method": "GET", "url": "{{baseUrl}}/api/error"},
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('500 Server Error', () => pm.response.to.have.status(500));",
                    "pm.test('error field', () => pm.expect(pm.response.json()).to.have.property('error'));",
                ]}}],
            },
        ],
    }
    out = HERE / "UIFIS_practice-10_postman-collection.json"
    out.write_text(json.dumps(collection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", out)


def make_practice11():
    doc = base_doc(11, "Формирование требований и функциональная модель ИС")
    goal(doc, [
        "Разобрать учебный сценарий, сформулировать функциональные и нефункциональные "
        "требования, построить контекстную диаграмму и декомпозицию процесса, связать "
        "требования с элементами модели и проверить полноту.",
    ])
    line(doc, "Учебный сценарий", bold=True)
    line(doc, "Колледж принимает заявки на справку через сайт. Студент заполняет форму, "
              "сотрудник проверяет данные, готовит справку и меняет статус заявки. "
              "Студент видит статус и получает уведомление.")
    doc.add_paragraph()
    table(doc, "Требования", ["ID", "Тип", "Требование", "Приоритет", "Проверка"], [
        ("ФТ-1", "Функциональное", "Студент создаёт заявку с типом справки", "высокий", ""),
        ("ФТ-2", "Функциональное", "Сотрудник видит очередь заявок", "высокий", ""),
        ("ФТ-3", "Функциональное", "Сотрудник меняет статус заявки", "высокий", ""),
        ("ФТ-4", "Функциональное", "Студент видит статус только своей заявки", "высокий", ""),
        ("ФТ-5", "Функциональное", "Система хранит журнал изменений", "средний", ""),
        ("НФТ-1", "Нефункциональное", "Ответ на создание заявки не дольше 2 секунд", "средний", ""),
        ("НФТ-2", "Нефункциональное", "Пароль и персональные данные не попадают в журнал", "высокий", ""),
        ("НФТ-3", "Нефункциональное", "Форма работает с клавиатуры", "средний", ""),
        ("НФТ-4", "Нефункциональное", "Одновременно работают 30 сотрудников", "средний", ""),
        ("НФТ-5", "Нефункциональное", "Данные сохраняются при перезапуске", "высокий", ""),
    ])
    table(doc, "Сценарии использования", ["Актор", "Сценарий", "Результат", "Требования"], [
        ("Студент", "Создать заявку", "Заявка в статусе «новая»", "ФТ-1"),
        ("Студент", "Посмотреть статус", "Видна только своя заявка", "ФТ-4"),
        ("Сотрудник", "Обработать заявку", "Статус изменён", "ФТ-2, ФТ-3"),
        ("Сотрудник", "Отклонить заявку", "Указана причина", "ФТ-3, ФТ-5"),
        ("Администратор", "Посмотреть журнал", "История изменений", "ФТ-5, НФТ-2"),
    ])
    line(doc, "Контекстная диаграмма", bold=True)
    line(doc, "Покажите один процесс «Обработать заявку на справку», внешних участников, "
              "входы, выходы, управление и механизмы.")
    slot(doc, "[ Место для контекстной диаграммы: студент, сотрудник, администратор, процесс ]")
    doc.add_paragraph()
    line(doc, "Декомпозиция", bold=True)
    line(doc, "Раскройте процесс на 4 подпроцесса и подпишите потоки между ними.")
    slot(doc, "[ Место для декомпозиции: проверить, согласовать, подготовить, уведомить ]")
    doc.add_paragraph()
    table(doc, "Матрица прослеживаемости", ["Требование", "Элемент модели", "Проверка", "Покрыто"], [
        ("ФТ-1", "", "", ""),
        ("ФТ-2", "", "", ""),
        ("ФТ-3", "", "", ""),
        ("ФТ-4", "", "", ""),
        ("ФТ-5", "", "", ""),
        ("НФТ-1", "", "", ""),
        ("НФТ-2", "", "", ""),
    ])
    shots(doc, [
        "список требований с приоритетами",
        "контекстная диаграмма",
        "декомпозиция процесса",
        "матрица прослеживаемости",
        "проверка требования на тестовом сценарии",
    ])
    conclusion(doc, [
        "Какое требование было самым неоднозначным? Как вы сделали его проверяемым? "
        "Почему функциональная модель без границ контекста быстро разрастается?",
    ], [
        "Чем функциональное требование отличается от нефункционального?",
        "Зачем на контекстной диаграмме показывают управление и механизмы?",
        "Что такое декомпозиция и когда её прекращают?",
        "Почему требование должно иметь проверку?",
        "Что покажет матрица прослеживаемости при изменении требования?",
        "Почему сценарий использования ещё не является функциональной моделью?",
    ])
    out = HERE / "UIFIS_practice-11_report-template.docx"
    doc.save(out)
    print("wrote", out)

    rows = [
        ("ФТ-1", "Функциональное", "Создание заявки", "высокий", "Студент", "", ""),
        ("ФТ-2", "Функциональное", "Очередь заявок", "высокий", "Сотрудник", "", ""),
        ("ФТ-3", "Функциональное", "Смена статуса", "высокий", "Сотрудник", "", ""),
        ("ФТ-4", "Функциональное", "Доступ только к своим", "высокий", "Студент", "", ""),
        ("ФТ-5", "Функциональное", "Журнал изменений", "средний", "Администратор", "", ""),
        ("НФТ-1", "Нефункциональное", "Ответ до 2 секунд", "средний", "Пользователь", "", ""),
        ("НФТ-2", "Нефункциональное", "Нет секретов в журнале", "высокий", "Безопасность", "", ""),
        ("НФТ-3", "Нефункциональное", "Клавиатурный доступ", "средний", "Доступность", "", ""),
    ]
    out = HERE / "UIFIS_practice-11_requirements-matrix.csv"
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["ID", "Тип", "Требование", "Приоритет", "Источник", "Элемент модели", "Проверка", "Покрыто"])
        for row in rows:
            w.writerow(row)
        w.writerow(["Итог", "", "8 требований", "", "", "", "", ""])
    print("wrote", out)


def make_practice12():
    doc = base_doc(12, "Проектирование моделей данных ИС")
    goal(doc, [
        "Построить ER-модель учебной библиотеки, привести её к третьей нормальной "
        "форме, описать логическую и физическую модель, создать таблицы SQLite с "
        "ключами и ограничениями и проверить их на тестовых данных.",
    ])
    table(doc, "Сущности и ключи", ["Сущность", "Первичный ключ", "Атрибуты", "Связи"], [
        ("Читатель", "reader_id", "full_name, email, status", "один ко многим с выдачей"),
        ("Книга", "book_id", "title, author, isbn", "один ко многим с экземпляром"),
        ("Экземпляр", "copy_id", "book_id, inventory_no, state", "многие к одной книге"),
        ("Выдача", "loan_id", "reader_id, copy_id, issued_at, returned_at", "многие к читателю и экземпляру"),
        ("Штраф", "fine_id", "loan_id, amount, paid_at", "один к одной выдаче"),
    ])
    table(doc, "Нормализация", ["Форма", "Что убираем", "Проверка"], [
        ("1НФ", "Повторяющиеся группы и списки в одном поле", "в каждом поле одно значение"),
        ("2НФ", "Зависимость части составного ключа", "все неключевые поля зависят от всего ключа"),
        ("3НФ", "Зависимость неключевого поля от неключевого", "нет транзитивных зависимостей"),
    ])
    line(doc, "Логическая модель", bold=True)
    line(doc, "Покажите сущности, атрибуты, ключи, кардинальность и связи. Подпишите, "
              "где находится внешний ключ.")
    slot(doc, "[ Место для ER-диаграммы: читатель, книга, экземпляр, выдача, штраф ]")
    doc.add_paragraph()
    table(doc, "Физическая модель", ["Таблица", "Тип", "Ограничения", "Индекс"], [
        ("readers", "справочник", "PK, UNIQUE email, CHECK status", "email"),
        ("books", "справочник", "PK, UNIQUE isbn, CHECK title", "isbn"),
        ("copies", "экземпляры", "PK, FK book_id, UNIQUE inventory_no", "book_id"),
        ("loans", "операции", "PK, FK reader_id, FK copy_id, CHECK returned_at", "reader_id, copy_id"),
        ("fines", "операции", "PK, FK loan_id, CHECK amount", "loan_id"),
    ])
    table(doc, "Проверки ограничений", ["Проверка", "Действие", "Ожидаемый результат", "Факт"], [
        ("Повтор email", "INSERT reader с тем же email", "UNIQUE отклоняет"),
        ("Несуществующая книга", "INSERT copy с book_id 999", "FOREIGN KEY отклоняет"),
        ("Отрицательный штраф", "INSERT fine с amount -1", "CHECK отклоняет"),
        ("Повтор выдачи", "INSERT loan с тем же copy_id и returned_at IS NULL", "частичный UNIQUE отклоняет"),
        ("Удаление книги", "DELETE book с экземплярами", "RESTRICT отклоняет"),
    ])
    line(doc, "SQL-схема", bold=True)
    line(doc, "Приложите скрипт создания таблиц и вставки тестовых строк. "
              "Включите PRAGMA foreign_keys = ON.")
    slot(doc, "[ Место для скриншота: список таблиц и .schema ]")
    doc.add_paragraph()
    shots(doc, [
        "ER-диаграмма с ключами и кардинальностью",
        "схема SQLite после выполнения скрипта",
        "ошибка UNIQUE при повторном email",
        "ошибка FOREIGN KEY при несуществующей книге",
        "результат запроса с соединением таблиц",
    ])
    conclusion(doc, [
        "Почему выдача хранится отдельно от читателя и экземпляра? Где в схеме "
        "появился бы дубликат, если хранить название книги в каждой выдаче?",
    ], [
        "Чем логическая модель данных отличается от физической?",
        "Что такое первичный и внешний ключ?",
        "Почему email лучше сделать UNIQUE?",
        "Что проверяет третья нормальная форма?",
        "Почему RAID не заменяет резервную копию?",
        "Когда денормализация допустима?",
    ])
    out = HERE / "UIFIS_practice-12_report-template.docx"
    doc.save(out)
    print("wrote", out)

    rows = [
        ("Сущности", "5 сущностей выделены", "", ""),
        ("Ключи", "у каждой таблицы есть PK", "", ""),
        ("Связи", "кардинальность подписана", "", ""),
        ("1НФ", "нет списков в полях", "", ""),
        ("2НФ", "нет зависимости от части ключа", "", ""),
        ("3НФ", "нет транзитивных зависимостей", "", ""),
        ("FK", "внешние ключи включены", "", ""),
        ("CHECK", "ограничения проверены", "", ""),
        ("Тестовые данные", "5 таблиц заполнены", "", ""),
        ("Запрос", "JOIN возвращает ожидаемые строки", "", ""),
    ]
    out = HERE / "UIFIS_practice-12_er-checklist.csv"
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Проверка", "Ожидание", "Факт", "Вывод"])
        for row in rows:
            w.writerow(row)
        w.writerow(["Итог", "10 проверок", "", ""])
    print("wrote", out)


def make_practice13():
    doc = base_doc(13, "Резервное копирование и разграничение доступа")
    goal(doc, [
        "Составить план резервного копирования учебной базы и конфигурации, создать "
        "копию, восстановить её в отдельный каталог и проверить целостность. Настроить "
        "группы и права доступа, включить журнал изменений и доказать, что чужой "
        "пользователь не может прочитать данные.",
    ])
    table(doc, "План резервного копирования", ["Объект", "Тип копии", "Расписание", "Хранение", "Проверка"], [
        ("База SQLite", "полная", "ежедневно", "отдельный диск", "открыть и выполнить COUNT"),
        ("Конфигурация", "полная", "после изменения", "репозиторий", "сравнить контрольную сумму"),
        ("Журналы", "инкрементальная", "ежечасно", "отдельный узел", "прочитать последнюю запись"),
        ("Секреты", "зашифрованная", "при смене", "хранилище секретов", "не попадает в копию БД"),
    ])
    table(doc, "Разграничение доступа", ["Роль", "Группа", "Чтение", "Запись", "Удаление", "Аудит"], [
        ("Наблюдатель", "uifis_read", "разрешено", "запрещено", "запрещено", "свои действия"),
        ("Оператор", "uifis_write", "разрешено", "разрешено", "запрещено", "свои действия"),
        ("Администратор", "uifis_admin", "разрешено", "разрешено", "разрешено", "все действия"),
        ("Гость", "uifis_guest", "только отчёт", "запрещено", "запрещено", "вход и выход"),
    ])
    table(doc, "Проверка восстановления", ["Проверка", "Команда", "Ожидаемый результат", "Факт"], [
        ("Копия создана", "ls -l backup/", "файл с датой и размером"),
        ("Целостность", "sha256sum backup/*.sqlite", "сумма совпала с журналом"),
        ("Восстановление", "cp backup/... restore/", "файл открывается"),
        ("Число строк", "SELECT COUNT(*) FROM ...", "совпало с исходным"),
        ("Права", "ls -l restore/", "только владелец и группа"),
        ("Чужой доступ", "sudo -u guest cat ...", "Permission denied"),
        ("Аудит", "tail -n 5 audit.log", "видны вход и отказ"),
    ])
    shots(doc, [
        "расписание копирования",
        "созданная копия и контрольная сумма",
        "восстановленная база и COUNT",
        "группы и права каталога",
        "отказ в доступе для гостя",
        "записи аудита",
    ])
    conclusion(doc, [
        "Почему копия, которая ни разу не восстанавливалась, считается ненадёжной? "
        "Как вы доказали, что восстановление действительно работает? Что изменится, "
        "если RPO уменьшить с суток до часа?",
    ], [
        "Чем RTO отличается от RPO?",
        "Почему RAID не заменяет резервную копию?",
        "Зачем хранить копию отдельно от основного узла?",
        "Что такое минимальные права и как их проверить?",
        "Почему аудит не должен хранить пароли?",
        "Когда полная копия лучше инкрементальной?",
    ])
    out = HERE / "UIFIS_practice-13_report-template.docx"
    doc.save(out)
    print("wrote", out)

    rows = [
        ("База", "полная", "ежедневно 02:00", "backup/db", "COUNT и целостность", "4 ч", "24 ч", "Администратор"),
        ("Конфигурация", "полная", "после изменения", "git", "diff и sha256", "1 ч", "0", "Администратор"),
        ("Журналы", "инкрементальная", "каждый час", "backup/logs", "последняя запись", "24 ч", "1 ч", "Оператор"),
        ("Секреты", "шифрованная", "при смене", "secret store", "нет в копии БД", "1 ч", "0", "Администратор"),
    ]
    out = HERE / "UIFIS_practice-13_backup-plan.csv"
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Объект", "Тип копии", "Расписание", "Место хранения", "Проверка", "RTO", "RPO", "Ответственный"])
        for row in rows:
            w.writerow(row)
        w.writerow(["Итог", "", "", "", "план проверен", "", "", ""])
    print("wrote", out)


def make_practice14():
    doc = base_doc(14, "Комплексное задание: паспорт информационной системы")
    goal(doc, [
        "Собрать паспорт учебной информационной системы по всем изученным разделам, "
        "связать функции, данные, архитектуру, эксплуатацию, безопасность и "
        "эффективность в один документ и защитить решения перед группой.",
    ])
    table(doc, "Разделы паспорта", ["Раздел", "Что включить", "Источник", "Готово"], [
        ("Общие сведения", "название, назначение, владелец, версия", "приказ и договор", ""),
        ("Пользователи", "роли, число, права, сценарии", "требования", ""),
        ("Функции", "подсистемы и основные процессы", "функциональная модель", ""),
        ("Данные", "сущности, объёмы, сроки хранения, персональные данные", "ER-модель", ""),
        ("Архитектура", "слои, узлы, интеграции, сеть", "схема размещения", ""),
        ("ПО и оборудование", "ОС, СУБД, серверы, рабочие места", "спецификация", ""),
        ("Жизненный цикл", "этап, владелец, план развития", "план ЖЦ", ""),
        ("Эксплуатация", "регламент, поддержка, SLA, обучение", "инструкции", ""),
        ("Безопасность", "угрозы, доступ, аудит, копии", "модель угроз", ""),
        ("Надёжность", "RTO, RPO, резервирование, проверка", "план восстановления", ""),
        ("Эффективность", "показатели, мониторинг, узкие места", "метрики", ""),
        ("Риски", "вероятность, влияние, меры", "реестр рисков", ""),
    ])
    table(doc, "Защита паспорта", ["Критерий", "Вопрос комиссии", "Ответ", "Оценка"], [
        ("Полнота", "Все ли разделы связаны между собой?", "", ""),
        ("Доказательность", "Чем подтверждено каждое число?", "", ""),
        ("Непротиворечивость", "Не спорят ли архитектура и нагрузка?", "", ""),
        ("Эксплуатируемость", "Кто и как будет поддерживать систему?", "", ""),
        ("Безопасность", "Кто имеет доступ и как это проверяется?", "", ""),
        ("Риски", "Что случится при отказе узла?", "", ""),
    ])
    shots(doc, [
        "титульный лист паспорта",
        "схема архитектуры",
        "таблица функций и данных",
        "раздел эксплуатации и SLA",
        "раздел безопасности и копий",
        "выступление с паспортом",
    ])
    conclusion(doc, [
        "Какой раздел оказался самым трудным и почему? Какое решение в паспорте "
        "пришлось изменить после проверки на другом разделе? Что бы вы сделали "
        "в первую очередь, если бы систему передали вам на сопровождение завтра?",
    ], [
        "Зачем паспорт нужен, если есть техническое задание?",
        "Кто является владельцем системы и что это меняет?",
        "Почему паспорт без актуальных данных опасен?",
        "Как связать функции, данные и архитектуру в одном документе?",
        "Какие показатели эффективности вы выбрали и почему?",
        "Что должно быть в плане вывода из эксплуатации?",
    ])
    out = HERE / "UIFIS_practice-14_report-template.docx"
    doc.save(out)
    print("wrote", out)

    rows = [
        ("Общие сведения", "название, владелец, версия", "", ""),
        ("Пользователи", "роли и права", "", ""),
        ("Функции", "подсистемы и процессы", "", ""),
        ("Данные", "сущности и объёмы", "", ""),
        ("Архитектура", "слои и узлы", "", ""),
        ("ПО и оборудование", "спецификация", "", ""),
        ("Жизненный цикл", "этап и план", "", ""),
        ("Эксплуатация", "SLA и поддержка", "", ""),
        ("Безопасность", "доступ и аудит", "", ""),
        ("Надёжность", "RTO и RPO", "", ""),
        ("Эффективность", "метрики и мониторинг", "", ""),
        ("Риски", "реестр и меры", "", ""),
    ]
    out = HERE / "UIFIS_practice-14_passport-checklist.csv"
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Раздел", "Что проверить", "Факт", "Вывод"])
        for row in rows:
            w.writerow(row)
        w.writerow(["Итог", "12 разделов", "", ""])
    print("wrote", out)


def make_practice15():
    doc = base_doc(15, "ER-модель и 3НФ; База данных и импорт JSON")
    goal(doc, [
        "Спроектировать ER-модель заявок на обслуживание, привести её к третьей "
        "нормальной форме, создать базу SQLite с ограничениями, импортировать "
        "подготовленный JSON и проверить целостность и выборки.",
    ])
    table(doc, "Сущности и связи", ["Сущность", "Ключ", "Поля", "Связи"], [
        ("Клиент", "client_id", "name, email, phone", "один ко многим с заявкой"),
        ("Оборудование", "equipment_id", "client_id, model, serial_no", "многие к клиенту"),
        ("Заявка", "request_id", "equipment_id, created_at, status, priority", "многие к оборудованию"),
        ("Работа", "work_id", "request_id, description, hours, cost", "многие к заявке"),
        ("Запчасть", "part_id", "name, price, stock", "многие ко многим через расход"),
        ("Расход", "usage_id", "work_id, part_id, qty", "многие к работе и запчасти"),
    ])
    table(doc, "Нормализация", ["Форма", "Проверка", "Что исправить"], [
        ("1НФ", "нет списков и повторяющихся групп", "вынести запчасти в отдельную таблицу"),
        ("2НФ", "неключевые поля зависят от всего ключа", "разделить работу и расход"),
        ("3НФ", "нет зависимости неключевого от неключевого", "вынести клиента и оборудование"),
    ])
    table(doc, "Импорт JSON", ["Показатель", "Ожидание", "Факт"], [
        ("Строк в файле", "6 заявок", ""),
        ("Импортировано", "6", ""),
        ("Отклонено", "0", ""),
        ("Повторный импорт", "0 новых строк", ""),
        ("Ошибка email", "строка отклонена с причиной", ""),
        ("Проверка COUNT", "совпало с файлом", ""),
    ])
    table(doc, "Ограничения", ["Ограничение", "Проверка", "Ожидаемый результат"], [
        ("PRIMARY KEY", "повтор id", "отклонено"),
        ("UNIQUE email", "повтор email", "отклонено"),
        ("FOREIGN KEY", "заявка на несуществующее оборудование", "отклонено"),
        ("CHECK status", "status = done", "отклонено"),
        ("CHECK qty", "qty = 0", "отклонено"),
        ("ON DELETE RESTRICT", "удалить клиента с заявками", "отклонено"),
    ])
    shots(doc, [
        "ER-диаграмма в 3НФ",
        "список таблиц и .schema",
        "импорт JSON и сообщение об успехе",
        "ошибка ограничения CHECK",
        "результат JOIN-запроса",
    ])
    conclusion(doc, [
        "Почему заявка не хранит название оборудования и имя клиента? Что произойдёт "
        "при повторном импорте без ключа? Как вы проверяли, что база соответствует "
        "ER-модели?",
    ], [
        "Чем логическая модель отличается от физической?",
        "Что такое третья нормальная форма?",
        "Зачем нужен внешний ключ?",
        "Почему импорт выполняют в транзакции?",
        "Как проверить, что JSON не создал дубликаты?",
        "Когда денормализация оправдана?",
    ])
    out = HERE / "UIFIS_practice-15_report-template.docx"
    doc.save(out)
    print("wrote", out)

    schema = """-- UIFIS practice 15: schema template for SQLite
PRAGMA foreign_keys = ON;

CREATE TABLE clients (
  client_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT
);

CREATE TABLE equipment (
  equipment_id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(client_id) ON DELETE RESTRICT,
  model TEXT NOT NULL,
  serial_no TEXT NOT NULL UNIQUE
);

CREATE TABLE requests (
  request_id INTEGER PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES equipment(equipment_id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high'))
);

CREATE TABLE works (
  work_id INTEGER PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(request_id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  hours REAL NOT NULL CHECK (hours > 0),
  cost REAL NOT NULL CHECK (cost >= 0)
);

CREATE TABLE parts (
  part_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL CHECK (stock >= 0)
);

CREATE TABLE usage (
  usage_id INTEGER PRIMARY KEY,
  work_id INTEGER NOT NULL REFERENCES works(work_id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES parts(part_id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  UNIQUE (work_id, part_id)
);

CREATE INDEX idx_requests_equipment ON requests(equipment_id);
CREATE INDEX idx_works_request ON works(request_id);
CREATE INDEX idx_usage_work ON usage(work_id);
"""
    out = HERE / "UIFIS_practice-15_schema-template.sql"
    out.write_text(schema, encoding="utf-8")
    print("wrote", out)

    import_data = [
        {"request_id": 1, "client": "ООО Ромашка", "email": "romashka@example.ru", "equipment": "Принтер HP-01", "serial_no": "HP-1001", "created_at": "2026-09-01T09:15:00", "status": "new", "priority": "high"},
        {"request_id": 2, "client": "ИП Соколов", "email": "sokolov@example.ru", "equipment": "Сканер Epson-02", "serial_no": "EP-2002", "created_at": "2026-09-01T10:40:00", "status": "in_progress", "priority": "normal"},
        {"request_id": 3, "client": "ООО Вектор", "email": "vector@example.ru", "equipment": "МФУ Canon-03", "serial_no": "CN-3003", "created_at": "2026-09-02T08:05:00", "status": "done", "priority": "low"},
        {"request_id": 4, "client": "Колледж", "email": "college@example.ru", "equipment": "Проектор BenQ-04", "serial_no": "BQ-4004", "created_at": "2026-09-02T12:20:00", "status": "new", "priority": "normal"},
        {"request_id": 5, "client": "ООО Ромашка", "email": "romashka@example.ru", "equipment": "Принтер HP-01", "serial_no": "HP-1001", "created_at": "2026-09-03T14:10:00", "status": "in_progress", "priority": "high"},
        {"request_id": 6, "client": "ИП Соколов", "email": "sokolov@example.ru", "equipment": "Сканер Epson-02", "serial_no": "EP-2002", "created_at": "2026-09-03T16:45:00", "status": "cancelled", "priority": "low"},
    ]
    out = HERE / "UIFIS_practice-15_import.json"
    out.write_text(json.dumps(import_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", out)

    rows = [
        ("ER", "6 сущностей, ключи и кардинальность", "", ""),
        ("1НФ", "нет списков в полях", "", ""),
        ("2НФ", "нет зависимости от части ключа", "", ""),
        ("3НФ", "нет транзитивных зависимостей", "", ""),
        ("Схема", "все таблицы созданы", "", ""),
        ("FK", "PRAGMA foreign_keys = ON", "", ""),
        ("JSON", "6 строк импортировано", "", ""),
        ("Повтор", "0 новых строк", "", ""),
        ("COUNT", "совпало с файлом", "", ""),
        ("JOIN", "запрос вернул ожидаемые строки", "", ""),
    ]
    out = HERE / "UIFIS_practice-15_er-checklist.csv"
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Проверка", "Ожидание", "Факт", "Вывод"])
        for row in rows:
            w.writerow(row)
        w.writerow(["Итог", "10 проверок", "", ""])
    print("wrote", out)


def make_practice16():
    doc = base_doc(16, "SQL-запрос с JOIN и агрегацией")
    goal(doc, [
        "Создать учебную базу заказов и материалов, написать запросы с JOIN, GROUP BY, "
        "HAVING и подзапросом, рассчитать стоимость заказа и расход материалов, "
        "проверить планы выполнения и оформить результат.",
    ])
    table(doc, "Схема данных", ["Таблица", "Назначение", "Ключи и ограничения"], [
        ("products", "Готовая продукция", "PK product_id, UNIQUE code, CHECK price"),
        ("materials", "Материалы", "PK material_id, UNIQUE code, CHECK price"),
        ("norms", "Нормы расхода", "PK pair product_id, material_id, CHECK qty"),
        ("orders", "Заказы", "PK order_id, CHECK status"),
        ("order_items", "Позиции заказа", "PK pair order_id, product_id, CHECK qty"),
    ])
    table(doc, "Запросы", ["Номер", "Что считает", "Конструкции", "Ожидание"], [
        ("1", "Стоимость каждого заказа", "JOIN, GROUP BY", "5 строк"),
        ("2", "Потребность в материалах", "JOIN, SUM", "не меньше 4 строк"),
        ("3", "Топ-3 продукта по выручке", "JOIN, ORDER BY, LIMIT", "3 строки"),
        ("4", "Заказы дороже среднего", "подзапрос, HAVING", "3 строки"),
        ("5", "Продукты без норм", "LEFT JOIN, IS NULL", "1 строка"),
        ("6", "Доля материала в стоимости", "окно или подзапрос", "сумма долей 100 процентов"),
    ])
    table(doc, "Проверка запросов", ["Проверка", "Как проверить", "Факт"], [
        ("Сумма строк", "сверить с ручным расчётом", ""),
        ("NULL", "LEFT JOIN не теряет продукты", ""),
        ("Дубликаты", "COUNT DISTINCT", ""),
        ("План", "EXPLAIN QUERY PLAN", ""),
        ("Индекс", "запрос использует индекс", ""),
    ])
    shots(doc, [
        "схема и тестовые данные",
        "результат запроса 1",
        "результат запроса 2",
        "результат запроса 3",
        "EXPLAIN QUERY PLAN",
    ])
    conclusion(doc, [
        "Почему сумма по JOIN может завыситься, если соединить больше таблиц, чем нужно? "
        "Как вы проверили, что агрегат не считает дубликаты? Где в запросе появился NULL "
        "и что он означает?",
    ], [
        "Чем INNER JOIN отличается от LEFT JOIN?",
        "Зачем нужен GROUP BY?",
        "Чем WHERE отличается от HAVING?",
        "Когда подзапрос лучше JOIN?",
        "Почему COUNT(*) и COUNT(column) дают разное?",
        "Что показывает EXPLAIN QUERY PLAN?",
    ])
    out = HERE / "UIFIS_practice-16_report-template.docx"
    doc.save(out)
    print("wrote", out)

    data = """-- UIFIS practice 16: small order and material dataset for SQLite
PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS norms;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS products;

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0)
);
CREATE TABLE materials (
  material_id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0)
);
CREATE TABLE norms (
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  material_id INTEGER NOT NULL REFERENCES materials(material_id),
  qty REAL NOT NULL CHECK (qty > 0),
  PRIMARY KEY (product_id, material_id)
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'paid', 'done'))
);
CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO products VALUES
  (1, 'P-01', 'Стеллаж', 12000),
  (2, 'P-02', 'Стол', 8000),
  (3, 'P-03', 'Шкаф', 15000),
  (4, 'P-04', 'Полка', 3500);
INSERT INTO materials VALUES
  (1, 'M-01', 'Металл', 450),
  (2, 'M-02', 'Дерево', 700),
  (3, 'M-03', 'Краска', 300),
  (4, 'M-04', 'Крепёж', 120);
INSERT INTO norms VALUES
  (1, 1, 8), (1, 2, 2), (1, 4, 20),
  (2, 2, 4), (2, 4, 12),
  (3, 2, 6), (3, 1, 2), (3, 4, 30),
  (4, 2, 1), (4, 4, 4);
INSERT INTO orders VALUES
  (1, 'ООО Альфа', '2026-09-01', 'paid'),
  (2, 'ООО Бета', '2026-09-02', 'new'),
  (3, 'Колледж', '2026-09-02', 'done'),
  (4, 'ИП Волков', '2026-09-03', 'paid'),
  (5, 'ООО Альфа', '2026-09-04', 'new');
INSERT INTO order_items VALUES
  (1, 1, 2), (1, 2, 4),
  (2, 3, 1), (2, 4, 6),
  (3, 1, 1), (3, 2, 2),
  (4, 2, 8),
  (5, 3, 2), (5, 4, 10);
"""
    out = HERE / "UIFIS_practice-16_data.sql"
    out.write_text(data, encoding="utf-8")
    print("wrote", out)

    queries = """-- UIFIS practice 16: query templates
-- 1. Стоимость каждого заказа
SELECT o.order_id, o.customer, SUM(p.price * oi.qty) AS total
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p ON p.product_id = oi.product_id
GROUP BY o.order_id, o.customer
ORDER BY total DESC;

-- 2. Потребность в материалах
SELECT m.code, m.name, SUM(n.qty * oi.qty) AS required
FROM order_items oi
JOIN norms n ON n.product_id = oi.product_id
JOIN materials m ON m.material_id = n.material_id
GROUP BY m.material_id, m.code, m.name
ORDER BY required DESC;

-- 3. Топ-3 продукта по выручке
SELECT p.code, p.name, SUM(p.price * oi.qty) AS revenue
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
GROUP BY p.product_id, p.code, p.name
ORDER BY revenue DESC
LIMIT 3;

-- 4. Заказы дороже среднего
SELECT order_id, total
FROM (
  SELECT o.order_id, SUM(p.price * oi.qty) AS total
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.order_id
  JOIN products p ON p.product_id = oi.product_id
  GROUP BY o.order_id
)
WHERE total > (SELECT AVG(total) FROM (
  SELECT SUM(p.price * oi.qty) AS total
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.order_id
  JOIN products p ON p.product_id = oi.product_id
  GROUP BY o.order_id
));

-- 5. Продукты без норм
SELECT p.code, p.name
FROM products p
LEFT JOIN norms n ON n.product_id = p.product_id
WHERE n.product_id IS NULL;
"""
    out = HERE / "UIFIS_practice-16_queries-template.sql"
    out.write_text(queries, encoding="utf-8")
    print("wrote", out)


def make_practice17():
    doc = base_doc(17, "Модули ИС и безопасность; API и Postman")
    goal(doc, [
        "Собрать учебный модуль пользователей с ролями и проверкой прав, поднять его "
        "как API, проверить запросы в Postman и доказать, что чужой пользователь не "
        "получает доступ к запрещённой операции.",
    ])
    table(doc, "Модули и права", ["Модуль", "Роль", "Разрешённые операции", "Запрещено"], [
        ("Пользователи", "admin", "создать, изменить, заблокировать", "видеть пароль"),
        ("Пользователи", "manager", "читать список, менять статус", "менять роль"),
        ("Заказы", "manager", "создать, читать свои", "удалять чужие"),
        ("Заказы", "user", "читать свои", "менять статус"),
        ("Аудит", "admin", "читать журнал", "удалять записи"),
    ])
    table(doc, "Проверки API", ["Запрос", "Ожидание", "Факт"], [
        ("GET /health.json", "200, status ok", ""),
        ("GET /api/users", "200, список без password", ""),
        ("POST /api/users", "201, Location", ""),
        ("POST /api/users с дублем email", "400, field email", ""),
        ("GET /api/users/999", "404, error", ""),
        ("GET /api/users без токена", "401, error", ""),
        ("GET /api/users с ролью user", "403, error", ""),
        ("GET /api/error", "500, error", ""),
    ])
    table(doc, "Тесты Postman", ["Тест", "Код", "Проверка тела", "Статус"], [
        ("Health", "200", "status = ok", ""),
        ("List", "200", "items, count, нет password", ""),
        ("Create", "201", "id, Location", ""),
        ("Duplicate", "400", "field = email", ""),
        ("Missing", "404", "error", ""),
        ("No token", "401", "error", ""),
        ("Forbidden", "403", "error", ""),
        ("Server error", "500", "error", ""),
    ])
    shots(doc, [
        "структура модулей и ролей",
        "Postman collection и environment",
        "успешные тесты 200 и 201",
        "401 без токена",
        "403 для роли user",
        "журнал аудита",
    ])
    conclusion(doc, [
        "Почему проверка роли только на экране не защищает API? Как вы доказали, что "
        "пароль не попадает в ответ и журнал? Что изменится, если добавить роль auditor "
        "с правом только читать журнал?",
    ], [
        "Чем аутентификация отличается от авторизации?",
        "Что такое минимальные права?",
        "Почему 401 и 403 разные коды?",
        "Зачем нужен журнал аудита?",
        "Почему API должен валидировать вход?",
        "Что проверяет Postman, а что нет?",
    ])
    out = HERE / "UIFIS_practice-17_report-template.docx"
    doc.save(out)
    print("wrote", out)

    collection = {
        "info": {
            "name": "UIFIS Practice 17 - Users API",
            "description": "Модуль пользователей и проверки безопасности.",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "variable": [
            {"key": "baseUrl", "value": "http://127.0.0.1:8091"},
            {"key": "token", "value": "student-token"},
        ],
        "item": [
            {
                "name": "01 Health",
                "request": {"method": "GET", "url": "{{baseUrl}}/health.json"},
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "pm.test('healthy', () => pm.expect(pm.response.json().status).to.eql('ok'));",
                ]}}],
            },
            {
                "name": "02 List users without token",
                "request": {"method": "GET", "url": "{{baseUrl}}/api/users"},
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('401 Unauthorized', () => pm.response.to.have.status(401));",
                ]}}],
            },
            {
                "name": "03 List users as admin",
                "request": {
                    "method": "GET",
                    "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
                    "url": "{{baseUrl}}/api/users",
                },
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "const body = pm.response.json();",
                    "pm.test('items', () => pm.expect(body.items).to.be.an('array'));",
                    "pm.test('no password', () => pm.expect(JSON.stringify(body)).to.not.include('password'));",
                ]}}],
            },
            {
                "name": "04 Create user",
                "request": {
                    "method": "POST",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"},
                        {"key": "Content-Type", "value": "application/json"},
                    ],
                    "body": {"mode": "raw", "raw": "{\n  \"login\": \"new.user\",\n  \"email\": \"new.user@example.ru\",\n  \"role\": \"user\"\n}"},
                    "url": "{{baseUrl}}/api/users",
                },
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('201 Created', () => pm.response.to.have.status(201));",
                    "pm.test('Location', () => pm.response.to.have.header('Location'));",
                ]}}],
            },
            {
                "name": "05 Duplicate email",
                "request": {
                    "method": "POST",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{token}}"},
                        {"key": "Content-Type", "value": "application/json"},
                    ],
                    "body": {"mode": "raw", "raw": "{\n  \"login\": \"dup.user\",\n  \"email\": \"new.user@example.ru\",\n  \"role\": \"user\"\n}"},
                    "url": "{{baseUrl}}/api/users",
                },
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('400 Bad Request', () => pm.response.to.have.status(400));",
                    "pm.test('field email', () => pm.expect(pm.response.json().field).to.eql('email'));",
                ]}}],
            },
            {
                "name": "06 Forbidden for user",
                "request": {
                    "method": "GET",
                    "header": [{"key": "Authorization", "value": "Bearer user-token"}],
                    "url": "{{baseUrl}}/api/users",
                },
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('403 Forbidden', () => pm.response.to.have.status(403));",
                ]}}],
            },
            {
                "name": "07 Server error",
                "request": {"method": "GET", "url": "{{baseUrl}}/api/error"},
                "event": [{"listen": "test", "script": {"exec": [
                    "pm.test('500 Server Error', () => pm.response.to.have.status(500));",
                    "pm.test('error field', () => pm.expect(pm.response.json()).to.have.property('error'));",
                ]}}],
            },
        ],
    }
    out = HERE / "UIFIS_practice-17_postman-collection.json"
    out.write_text(json.dumps(collection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", out)

    rows = [
        ("Аутентификация", "без токена 401", "", ""),
        ("Авторизация", "role user 403", "", ""),
        ("Пароль", "нет password в ответе", "", ""),
        ("Валидация", "дубль email 400", "", ""),
        ("Ошибка", "500 не раскрывает стек", "", ""),
        ("Аудит", "вход и отказ записаны", "", ""),
        ("Права", "роль admin только свои операции", "", ""),
        ("Секреты", "токен не в журнале", "", ""),
    ]
    out = HERE / "UIFIS_practice-17_security-checklist.csv"
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Проверка", "Ожидание", "Факт", "Вывод"])
        for row in rows:
            w.writerow(row)
        w.writerow(["Итог", "8 проверок", "", ""])
    print("wrote", out)


def make_practice18():
    doc = base_doc(18, "Документация API; Комплексный практикум")
    goal(doc, [
        "Описать учебный API в OpenAPI, подготовить коллекцию Postman с тестами, "
        "оформить примеры запросов и ошибок, провести комплексную проверку модулей "
        "ИС и защитить документацию перед группой.",
    ])
    table(doc, "Состав документации", ["Раздел", "Что включить", "Проверка"], [
        ("Общие сведения", "назначение, base URL, версия, авторизация", "ссылка на стенд"),
        ("Ресурсы", "users, roles, health", "каждый путь описан"),
        ("Схемы", "User, UserInput, Error", "обязательные поля"),
        ("Коды", "200, 201, 400, 401, 403, 404, 500", "примеры тел"),
        ("Примеры", "curl и Postman", "запрос выполняется"),
        ("Ошибки", "код, поле, сообщение", "не раскрывает стек"),
        ("Версионирование", "v1 и правило изменений", "описано"),
    ])
    table(doc, "Комплексная проверка", ["Модуль", "Что проверить", "Результат"], [
        ("Авторизация", "вход, токен, выход", ""),
        ("Пользователи", "CRUD, уникальность email", ""),
        ("Роли", "admin, manager, user", ""),
        ("API", "GET, POST, ошибки", ""),
        ("Postman", "тесты 200, 400, 401, 403, 500", ""),
        ("Документация", "OpenAPI и примеры", ""),
        ("Аудит", "записи о входе и изменениях", ""),
        ("Копия", "данные восстанавливаются", ""),
    ])
    shots(doc, [
        "OpenAPI в редакторе",
        "Postman collection с тестами",
        "успешный запрос и ответ",
        "ошибка 400 с полем",
        "ошибка 401 и 403",
        "итоговая защита документации",
    ])
    conclusion(doc, [
        "Почему документация без примеров и кодов ошибок не считается полной? Как "
        "проверить, что документация совпадает с реализацией? Какое место в API "
        "оказалось самым рискованным и почему?",
    ], [
        "Зачем нужен OpenAPI?",
        "Чем 401 отличается от 403?",
        "Почему пример ошибки не должен содержать стек?",
        "Как проверить, что документация не устарела?",
        "Что должно быть в коллекции Postman?",
        "Почему версия API указывается явно?",
    ])
    out = HERE / "UIFIS_practice-18_report-template.docx"
    doc.save(out)
    print("wrote", out)

    yaml_text = """openapi: 3.0.3
info:
  title: UIFIS Users API
  version: 1.0.0
  description: Учебный API пользователей и ролей.
servers:
  - url: http://127.0.0.1:8091
paths:
  /health.json:
    get:
      summary: Состояние сервиса
      responses:
        '200':
          description: Сервис работает
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: ok
  /api/users:
    get:
      summary: Список пользователей
      security:
        - bearerAuth: []
      parameters:
        - name: role
          in: query
          schema:
            type: string
            enum: [admin, manager, user]
      responses:
        '200':
          description: Список пользователей
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  count:
                    type: integer
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
    post:
      summary: Создать пользователя
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserInput'
      responses:
        '201':
          description: Пользователь создан
          headers:
            Location:
              schema:
                type: string
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
  /api/users/{id}:
    get:
      summary: Карточка пользователя
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Пользователь
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFound'
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  schemas:
    User:
      type: object
      required: [id, login, email, role, status]
      properties:
        id:
          type: integer
        login:
          type: string
        email:
          type: string
          format: email
        role:
          type: string
          enum: [admin, manager, user]
        status:
          type: string
          enum: [active, blocked]
    UserInput:
      type: object
      required: [login, email, role]
      properties:
        login:
          type: string
          minLength: 3
        email:
          type: string
          format: email
        role:
          type: string
          enum: [admin, manager, user]
    Error:
      type: object
      required: [error, message]
      properties:
        error:
          type: string
        message:
          type: string
        field:
          type: string
  responses:
    BadRequest:
      description: Ошибка валидации
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Unauthorized:
      description: Нет или неверный токен
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Forbidden:
      description: Недостаточно прав
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    NotFound:
      description: Объект не найден
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
"""
    out = HERE / "UIFIS_practice-18_openapi-template.yaml"
    out.write_text(yaml_text, encoding="utf-8")
    print("wrote", out)

    rows = [
        ("OpenAPI", "файл проходит валидацию", "", ""),
        ("Пути", "все endpoint описаны", "", ""),
        ("Схемы", "обязательные поля и типы", "", ""),
        ("Ошибки", "400, 401, 403, 404, 500", "", ""),
        ("Примеры", "curl и Postman совпадают", "", ""),
        ("Postman", "тесты зелёные", "", ""),
        ("Секреты", "нет токена в примерах", "", ""),
        ("Версия", "v1 и правило изменений", "", ""),
    ]
    out = HERE / "UIFIS_practice-18_api-checklist.csv"
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Проверка", "Ожидание", "Факт", "Вывод"])
        for row in rows:
            w.writerow(row)
        w.writerow(["Итог", "8 проверок", "", ""])
    print("wrote", out)


if __name__ == "__main__":
    make_practice10()
    make_practice11()
    make_practice12()
    make_practice13()
    make_practice14()
    make_practice15()
    make_practice16()
    make_practice17()
    make_practice18()
