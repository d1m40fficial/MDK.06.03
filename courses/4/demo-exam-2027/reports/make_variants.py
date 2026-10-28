import csv
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"
DATA = REPORTS / "variants.json"
CHAPTER = ROOT / "chapters" / "08-variants" / "chapter.md"

variants = json.loads(DATA.read_text(encoding="utf-8"))


def clean(text) -> str:
    text = str(text or "")
    text = text.replace("\u2014", ",").replace("\u2013", ",")
    text = text.replace(" -- ", ", ")
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r",\s*,", ",", text)
    return text.strip()


def esc(text) -> str:
    return html.escape(clean(text), quote=True)


def num(value) -> str:
    if value is None or value == "":
        return ","
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).replace(".", ",")


def write_csv(path: Path, header: list, rows: list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


for v in variants:
    folder = REPORTS / "variants" / v["id"]
    write_csv(
        folder / "customers.csv",
        ["id", "name", "inn", "address", "phone", "party_type"],
        [[c["id"], c["name"], c["inn"], c.get("addres", ""), c["phone"], c["type"]] for c in v["customers"]],
    )
    write_csv(
        folder / "notes.csv",
        ["title", "login", "content", "created_date"],
        [[n["title"], n["login"], n["content"], n["created_date"]] for n in v["notes"]],
    )
    write_csv(
        folder / "resources.csv",
        ["name", "kind", "unit", "norm", "time", "price"],
        [[r["name"], r["kind"], r["unit"], num(r["norm"]), num(r["time"]), num(r["price"])] for r in v["resources"]],
    )

index_rows = []
blocks = []
for v in variants:
    vid = v["id"]
    anchor = vid.lower()
    title = f'{v["domain"]} · {v["brand"]} · {v["product"]}'
    index_rows.append(
        f'<tr><td><a href="#{anchor}">{vid}</a></td><td>{esc(v["domain"])}</td>'
        f'<td>{esc(v["brand"])}</td><td>{esc(v["product"])}</td>'
        f'<td>{esc(v["qty"])}</td></tr>'
    )
    resources = "".join(
        f'<tr><td>{esc(r["name"])}</td><td>{esc(r["kind"])}</td><td>{esc(r["unit"])}</td>'
        f'<td>{num(r["norm"])}</td>'
        f'<td>{num(r["time"]) if r["kind"] == "operation" else "не задано"}</td>'
        f'<td>{num(r["price"])}</td></tr>'
        for r in v["resources"]
    )
    customers = "".join(
        f'<tr><td>{esc(c["id"])}</td><td>{esc(c["name"])}</td>'
        f'<td>{esc(c["inn"]) or "нет"}</td><td>{esc(c.get("addres", ""))}</td>'
        f'<td>{esc(c["phone"])}</td><td>{esc(c["type"])}</td></tr>'
        for c in v["customers"]
    )
    notes = "".join(
        f'<tr><td>{esc(n["title"])}</td><td>{esc(n["login"])}</td>'
        f'<td>{esc(n["content"])}</td><td>{esc(n["created_date"])}</td></tr>'
        for n in v["notes"]
    )
    tasks = "".join(f'<li>{esc(t["text"])}</li>' for t in v["tasks"])
    files = [
        "Заказ покупателя.xlsx",
        "Заказ на производство.xlsx",
        "Спецификация.xlsx",
        "Цены.xlsx",
        "Заказчики.json",
        "Заметки.json",
        "Задание.md",
        "customers.csv",
        "notes.csv",
        "resources.csv",
    ]
    links = "".join(
        f'<a href="reports/variants/{vid}/{name}">{name}</a>' for name in files
    )
    blocks.append(
        f'<details class="variant" id="{anchor}">\n'
        f'<summary><span class="variant-no">{vid}</span> {esc(title)}</summary>\n'
        f'<div class="variant-body">\n'
        f'<p>{esc(v["common"])}</p>\n'
        f'<p><b>Производственный процесс:</b> {esc(v["process"])}</p>\n'
        f'<p><b>Правила учёта:</b> {esc(v["rules"])}</p>\n'
        f'<h4>Ресурсы и цены</h4>\n'
        f'<table><thead><tr><th>Ресурс</th><th>Вид</th><th>Ед.</th><th>Норма</th>'
        f'<th>Часы на единицу</th><th>Цена</th></tr></thead><tbody>{resources}</tbody></table>\n'
        f'<h4>Заказчики</h4>\n'
        f'<table><thead><tr><th>Код</th><th>Наименование</th><th>ИНН</th><th>Адрес</th>'
        f'<th>Телефон</th><th>Тип</th></tr></thead><tbody>{customers}</tbody></table>\n'
        f'<h4>Заметки сотрудников</h4>\n'
        f'<table><thead><tr><th>Заголовок</th><th>Логин</th><th>Содержание</th>'
        f'<th>Дата</th></tr></thead><tbody>{notes}</tbody></table>\n'
        f'<h4>Шесть заданий</h4>\n<ol class="task-list">{tasks}</ol>\n'
        f'<h4>Файлы варианта</h4>\n<p class="files">{links}</p>\n'
        f'</div>\n</details>'
    )

page = f"""---
title: Варианты для нарешивания
dek: Тридцать независимых наборов документов и данных. Выберите вариант, пройдите шесть заданий и сверьте результат с чек-листом.
chapter: "Варианты"
level: СПО
glyph: "08"
outcomes:
  - Выбирать вариант и проходить все шесть заданий
  - Работать с документами, JSON и Excel
  - Проверять результат по чек-листу
---

## Как пользоваться вариантами

Каждый вариант это отдельное предприятие со своими документами, ресурсами, ценами и заказчиками. Варианты не связаны между собой: можно взять любой и выполнить на нём весь маршрут из шести заданий. Данные учебные, совпадения с реальными организациями случайны.

Работайте в таком порядке.

1. Выберите вариант из списка и откройте его карточку.
2. Скачайте файлы в папку `variant/`. Не редактируйте исходные документы.
3. Прочитайте задание варианта и выпишите сущности, реквизиты и правила.
4. Выполните задания 1 и 2: диаграмма, база, импорт.
5. Выполните задания 3 и 4: запрос стоимости и приложение.
6. Выполните задания 5 и 6: API, коллекция Postman и документация.
7. Сверьте комплект с чек-листом в конце страницы.

Для импорта заказчиков в каждом варианте уже подготовлен файл `customers.csv`. Он повторяет таблицу контрагентов: код, наименование, ИНН, адрес, телефон, тип. Код хранится строкой, поэтому ведущие нули не теряются. Файл `notes.csv` содержит заметки для задания 5, а `resources.csv` помогает заполнить ресурсы, цены и нормы.

> [!KEY]
> Не начинайте с приложения. Приложение читает базу, база строится по диаграмме. Если начать с форм, придётся переделывать модель после того, как код уже написан.

## Список вариантов

<table class="variants-index">
<thead><tr><th>Вариант</th><th>Отрасль</th><th>Предприятие</th><th>Продукция</th><th>Количество</th></tr></thead>
<tbody>
{''.join(index_rows)}
</tbody>
</table>

## Карточки вариантов

Откройте нужную карточку. Внутри есть документы, ресурсы, заказчики, заметки, шесть заданий и ссылки на файлы.

{''.join(blocks)}

## Что сдавать по каждому варианту

| Задание | Файлы и результаты |
|---|---|
| 1 | ER-диаграмма в PDF, исходник draw.io, обоснование ключей |
| 2 | SQL-скрипт, выгрузка базы, протокол проверки импорта |
| 3 | SQL-запрос стоимости, результат запроса, пояснение допущений |
| 4 | Проект приложения, протокол проверки сценариев, скриншоты |
| 5 | Проект API, коллекция Postman, результаты тестов |
| 6 | Заполненный DOCX, OpenAPI JSON, примеры ответов |

## Как проверить себя

- Диаграмма читается в PDF, у каждой таблицы есть первичный ключ, у каждой связи подписана кратность.
- В базе есть все таблицы, ограничения и внешние ключи, шесть заказчиков сохранили ведущие нули.
- SQL-запрос показывает материалы и операции отдельными строками и общую сумму, округлённую до копеек.
- Приложение входит под администратором и пользователем, блокирует запись после трёх ошибок, администратор снимает блокировку.
- API отвечает 200, пустым массивом, 400 и 500, поля называются `id`, `title_user`, `content`, `formatted_date`.
- Коллекция Postman импортируется на другом компьютере и проходит тесты.
- DOCX заполнен по шаблону, примеры в нём совпадают с фактическими ответами API.

Если пункт не выполняется, вернитесь в методичку соответствующего задания. В ней описаны интерфейс, команды и типичные ошибки.
"""

CHAPTER.write_text(page, encoding="utf-8")
print("wrote", CHAPTER, "variants", len(variants), "size", CHAPTER.stat().st_size)
