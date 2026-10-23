---
title: Работа с веб-API информационной системы
dek: "Прочитайте контракт, поднимите учебный сервис, проверьте его в Postman и клиентом на Python, затем сверьте ответы и разберите отказы."
chapter: "Практика 10"
minutes: 90
level: СПО
glyph: П10
outcomes:
  - Читать контракт API и отличать успешный статус от корректных данных
  - Поднять учебный сервис на стандартной библиотеке Python
  - Собрать Postman-коллекцию с тестами статуса, схемы и времени ответа
  - Написать клиент на urllib с пагинацией, повтором и понятными ошибками
  - Сверить ответы двух клиентов и объяснить причину отказа
---

## Что делаем

Деканату нужен список студентов группы для рассылки. Портал отдаёт JSON, код ответа `200`, тело не пустое. Через неделю выясняется, что половина списка потерялась, один студент попал в файл дважды, а письмо ушло на адрес, которого нет в базе. База здесь ни при чём: ответ читали глазами, а не проверяли.

Работа идёт на трёх уровнях. Сначала фиксируется контракт: какие пути, коды, поля и ограничения у сервиса. Потом запросы проверяются в Postman, где видно статус, заголовки, тело и время. Затем те же операции выполняет клиент на Python: он читает страницы по ссылке `next`, повторяет временно неудачный запрос, разбирает JSON и сохраняет результат в файл. Совпадение двух результатов и есть доказательство, что данные прочитаны правильно.

Результат работы: учебный сервис на `http://127.0.0.1:8090`, Postman-коллекция с девятью запросами и тестами, клиент `api_client.py`, файл `students.json`, таблица сверки, разбор отказов и отчёт.

> [!NOTE] Что считается готовым результатом
> Сервис отвечает на все endpoint контракта, коллекция проходит в Postman без красных тестов, клиент сохраняет 12 студентов и переживает один отказ, таблица сверки совпадает по числу записей и ключам, в отчёте есть скриншоты и объяснение причин отказов.

<div class="files"><b class="label">Материалы к работе</b>
<a href="reports/UIFIS_practice-10_report-template.docx" download>Шаблон отчёта в DOCX</a>
<a href="reports/UIFIS_practice-10_mock_api.py" download>Учебный сервис mock_api.py</a>
<a href="reports/UIFIS_practice-10_postman-collection.json" download>Postman-коллекция</a>
<a href="reports/UIFIS_practice-10_checklist.csv" download>Чек-лист в CSV</a>
<p>Скачайте файлы в папку практики. Код сервиса ниже совпадает с файлом, поэтому файл можно запускать сразу, а код читать как объяснение каждой строки.</p>
</div>

## Подготовка

Нужны Windows 10 или 11, Python 3.9 или новее и Postman. Права администратора, интернет, Docker и сервер базы данных не требуются: сервис хранит данные в памяти процесса.

Проверьте Python в PowerShell:

```powershell
python --version
```

Если команда открывает Microsoft Store или отвечает ошибкой, используйте загрузчик `py`:

```powershell
py -3 --version
```

Дальше в командах вместо `python` пишите `py -3`. Создайте рабочую папку и перейдите в неё:

```powershell
New-Item -ItemType Directory -Force C:\UIFIS\practice-10 | Out-Null
Set-Location C:\UIFIS\practice-10
```

Проверьте, что порт `8090` свободен:

```powershell
Get-NetTCPConnection -LocalPort 8090 -State Listen -ErrorAction SilentlyContinue
```

Пустой вывод означает, что порт никто не слушает. Сохраните `UIFIS_practice-10_mock_api.py` из материалов в эту папку и переименуйте в `mock_api.py`. Включите в Проводнике показ расширений: браузер иногда сохраняет файл как `mock_api.py.txt`, и Python такой файл не запустит.

Postman установите как обычное приложение. Если при первом запуске предлагают вход, можно работать локально: коллекция и окружение хранятся на компьютере и не требуют облачной синхронизации.

> [!PITFALL] Ошибка 10048: порт уже занят
> Если при запуске появилось `OSError: [WinError 10048]`, порт `8090` держит другая копия сервиса или посторонняя программа. Найдите владельца порта командой `Get-NetTCPConnection -LocalPort 8090 -State Listen | Select-Object OwningProcess`, затем закройте свою прошлую копию. Если порт занят чужим приложением, запустите сервис с ключом `--port 8091` и поменяйте `baseUrl` во всех запросах, иначе проверки будут обращаться не туда.

## Задание 1. Контракт API

Контракт это таблица, по которой одновременно пишут сервер, тесты и клиент. Пока таблицы нет, каждый понимает поля по-своему, и первый же разбор инцидента превращается в спор о том, что считалось правильным ответом.

| Метод | Путь | Код | Назначение |
|---|---|---|---|
| `GET` | `/api/students?group=&limit=&offset=` | `200` | Список студентов с пагинацией |
| `GET` | `/api/students/{id}` | `200`, `404` | Карточка студента или ошибка |
| `POST` | `/api/students` | `201`, `400` | Создать студента с валидацией |
| `GET` | `/api/error` | `500` | Учебная ошибка сервера |
| `GET` | `/health.json` | `200` | Состояние сервиса |

Запись студента состоит из пяти полей:

| Поле | Тип | Правило |
|---|---|---|
| `id` | целое число | выдаёт сервер, клиент его не присылает |
| `full_name` | строка | обязательное, непустое, пробелы по краям обрезаются |
| `email` | строка | обязательное, формат `name@domain.tld`, уникальное без учёта регистра |
| `group` | строка | обязательное, `ИС-41` или `ИС-42` |
| `status` | строка | выдаёт сервер, при создании всегда `active` |

Список отдаётся страницами. Параметр `limit` задаёт размер страницы, по умолчанию 5, максимум 20. Параметр `offset` задаёт, сколько записей пропустить, по умолчанию 0. Ответ содержит `items`, `count` и `next`. Здесь `next` это не число, а относительная ссылка на следующую страницу, например `/api/students?limit=5&offset=5`, или `null`, если страница последняя. Ссылка удобна тем, что клиенту не нужно самому собирать offset и помнить фильтр: сервер уже вложил `group` и `limit` в адрес.

Для 12 студентов при `limit=5` получаются страницы 5, 5 и 2, а `next` принимает значения `/api/students?limit=5&offset=5`, `/api/students?limit=5&offset=10` и `null`. Число `count` не равно длине `items`, и это нормально: `count` считает все записи под фильтр, а `items` только текущую страницу.

> [!PITFALL] Пустая страница не всегда ошибка
> Если запросить `group=ИС-99`, сервис вернёт `200`, `"items": []`, `"count": 0` и `"next": null`. Это законный ответ на фильтр, который ничего не нашёл. Ошибкой он становится только тогда, когда вы ждали шесть записей: тогда проверяют написание группы, `offset` и фактическое число записей, а не код ответа.

Ошибки тоже часть контракта. Тело ошибки всегда JSON с полями `error` и `message`, у ошибки валидации добавляется `field`:

| Код | `error` | Когда возникает |
|---|---|---|
| `400` | `invalid_json` | тело не разбирается как JSON или в нём не объект |
| `400` | `bad_request` | `limit` или `offset` не число либо вышли из диапазона |
| `400` | `validation_error` | нет обязательного поля, неверный email, неизвестная группа или повтор email; причина в `field` |
| `404` | `not_found` | студента с таким `id` нет или маршрут не существует |
| `500` | `server_error` | ошибка обработчика |

> [!PITFALL] Статус не равен корректным данным
> `200 OK` подтверждает, что запрос обработан. Он не подтверждает, что `items` не пуст, что `count` равен шести, что в каждой записи есть `email` и что в теле нет секрета. Проверка ответа состоит из четырёх вопросов: тот ли код, тот ли `Content-Type`, те ли поля, те ли значения. Для списка добавляется пятый: сходится ли `count` с длиной страницы и со ссылкой `next`.

## Задание 2. Учебный сервис

Сервис ниже это тренажёр, а не промышленная система: данные лежат в списке, базы и авторизации нет. Зато поведение настоящее. Он проверяет вход до записи, возвращает разные коды, отдаёт `Location` при создании и не хранит паролей, которые можно случайно выдать наружу.

Создайте в папке практики файл `mock_api.py`:

```python
#!/usr/bin/env python3
"""UIFIS practice 10: a small students API with no external dependencies.

Run:
    python UIFIS_practice-10_mock_api.py

The service listens on http://127.0.0.1:8090 by default. It stores data in
memory, so every restart returns the same twelve students.
"""

from __future__ import annotations

import argparse
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

SERVICE = "uifis-students"
DEFAULT_PORT = 8090
GROUPS = {"ИС-41", "ИС-42"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

STUDENTS = [
    {"id": 1, "full_name": "Иванова Мария Сергеевна", "email": "ivanova@example.ru", "group": "ИС-41", "status": "active"},
    {"id": 2, "full_name": "Крылов Артём Игоревич", "email": "krylov@example.ru", "group": "ИС-42", "status": "active"},
    {"id": 3, "full_name": "Мельникова Ольга Павловна", "email": "melnikova@example.ru", "group": "ИС-41", "status": "active"},
    {"id": 4, "full_name": "Сидоров Никита Олегович", "email": "sidorov@example.ru", "group": "ИС-42", "status": "active"},
    {"id": 5, "full_name": "Петрова Анна Викторовна", "email": "petrova@example.ru", "group": "ИС-41", "status": "active"},
    {"id": 6, "full_name": "Волков Дмитрий Андреевич", "email": "volkov@example.ru", "group": "ИС-42", "status": "active"},
    {"id": 7, "full_name": "Смирнова Елена Игоревна", "email": "smirnova@example.ru", "group": "ИС-41", "status": "active"},
    {"id": 8, "full_name": "Морозов Павел Сергеевич", "email": "morozov@example.ru", "group": "ИС-42", "status": "active"},
    {"id": 9, "full_name": "Фёдорова Дарья Максимовна", "email": "fedorova@example.ru", "group": "ИС-41", "status": "active"},
    {"id": 10, "full_name": "Егоров Илья Романович", "email": "egorov@example.ru", "group": "ИС-42", "status": "active"},
    {"id": 11, "full_name": "Никитина Софья Андреевна", "email": "nikitina@example.ru", "group": "ИС-41", "status": "active"},
    {"id": 12, "full_name": "Орлов Максим Денисович", "email": "orlov@example.ru", "group": "ИС-42", "status": "active"},
]


def student_page(group: str | None, limit: int, offset: int) -> dict:
    selected = [s for s in STUDENTS if group is None or s["group"] == group]
    page = selected[offset:offset + limit]
    next_offset = offset + limit
    next_url = None
    if next_offset < len(selected):
        parts = [f"limit={limit}", f"offset={next_offset}"]
        if group:
            parts.insert(0, f"group={group}")
        next_url = "/api/students?" + "&".join(parts)
    return {"items": page, "count": len(selected), "next": next_url}


class Handler(BaseHTTPRequestHandler):
    server_version = "UIFISStudents/1.0"

    def _send(self, status: int, payload: dict, headers: dict | None = None) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def _error(self, status: int, code: str, message: str, field: str | None = None) -> None:
        body = {"error": code, "message": message}
        if field:
            body["field"] = field
        self._send(status, body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        if parsed.path == "/health.json":
            self._send(200, {"service": SERVICE, "status": "ok", "students": len(STUDENTS)})
            return
        if parsed.path == "/api/error":
            self._error(500, "server_error", "Учебная ошибка сервера")
            return
        if parsed.path == "/api/students":
            try:
                limit = int(query.get("limit", ["5"])[0])
                offset = int(query.get("offset", ["0"])[0])
            except ValueError:
                self._error(400, "bad_request", "limit и offset должны быть числами", "limit")
                return
            if limit < 1 or limit > 20 or offset < 0:
                self._error(400, "bad_request", "limit от 1 до 20, offset не меньше 0", "limit")
                return
            group = query.get("group", [None])[0]
            self._send(200, student_page(group, limit, offset))
            return
        if parsed.path.startswith("/api/students/"):
            raw = parsed.path.rsplit("/", 1)[-1]
            if not raw.isdigit():
                self._error(404, "not_found", "Студент не найден")
                return
            found = next((s for s in STUDENTS if s["id"] == int(raw)), None)
            if found is None:
                self._error(404, "not_found", "Студент не найден")
            else:
                self._send(200, found)
            return
        self._error(404, "not_found", "Маршрут не найден")

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/students":
            self._error(404, "not_found", "Маршрут не найден")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8")
            body = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            self._error(400, "invalid_json", "Тело запроса не является корректным JSON")
            return
        if not isinstance(body, dict):
            self._error(400, "invalid_json", "Ожидается JSON-объект")
            return
        for field in ("full_name", "email", "group"):
            value = body.get(field)
            if not isinstance(value, str) or not value.strip():
                self._error(400, "validation_error", f"Поле {field} обязательно", field)
                return
        email = body["email"].strip()
        if not EMAIL_RE.match(email):
            self._error(400, "validation_error", "Некорректный email", "email")
            return
        group = body["group"].strip()
        if group not in GROUPS:
            self._error(400, "validation_error", "Неизвестная группа", "group")
            return
        if any(s["email"].lower() == email.lower() for s in STUDENTS):
            self._error(400, "validation_error", "Студент с таким email уже есть", "email")
            return
        new_id = max((s["id"] for s in STUDENTS), default=0) + 1
        student = {
            "id": new_id,
            "full_name": body["full_name"].strip(),
            "email": email,
            "group": group,
            "status": "active",
        }
        STUDENTS.append(student)
        self._send(201, student, {"Location": f"/api/students/{new_id}"})

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"{self.address_string()} {fmt % args}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="UIFIS students API")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.daemon_threads = True
    print(f"{SERVICE} on http://{args.host}:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
```

Запустите сервис в первом окне PowerShell:

```powershell
python mock_api.py
```

В строке запуска появятся адрес и порт. Окно не закрывайте: это и есть сервер. Во втором окне проверьте здоровье, фильтр и отсутствующего студента:

```powershell
curl.exe -s http://127.0.0.1:8090/health.json
curl.exe -s -G --data-urlencode "group=ИС-42" --data-urlencode "limit=2" http://127.0.0.1:8090/api/students
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8090/api/students/999
```

Первая команда возвращает `{"service": "uifis-students", "status": "ok", "students": 12}`. Вторая возвращает студентов с id 2 и 4, `"count": 6` и `"next": "/api/students?group=ИС-42&limit=2&offset=2"`. Третья печатает `404`.

Создание проверяется телом из файла. Создайте в VS Code файл `new_student.json`:

```json
{
  "full_name": "Соколов Пётр Ильич",
  "email": "sokolov@example.ru",
  "group": "ИС-42"
}
```

Отправьте его:

```powershell
curl.exe -s -i -X POST http://127.0.0.1:8090/api/students -H "Content-Type: application/json" --data-binary "@new_student.json"
```

Ответ начинается с `HTTP/1.1 201 Created`, содержит `Location: /api/students/13` и запись с `"status": "active"`. Повторите ту же команду: теперь сервер отвечает `400`, `"error": "validation_error"` и `"field": "email"`, потому что адрес уже занят.

> [!PITFALL] `invalid_json` при правильном теле
> Если сервер отвечает `invalid_json`, а JSON в файле выглядит корректно, проверьте кодировку. Windows PowerShell 5.1 в команде `Out-File -Encoding utf8` добавляет в начало байты BOM, и строгий разбор JSON их не принимает. В VS Code выберите кодировку UTF-8 без BOM и сохраните файл заново. Вторая причина той же ошибки: лишняя запятая перед закрывающей скобкой.

> [!NOTE] Почему здесь нет CORS
> Postman и `urllib` не являются браузером, поэтому им не нужен заголовок `Access-Control-Allow-Origin`. CORS включается, когда JavaScript на странице с другим источником пытается прочитать ответ: тогда сервер добавляет заголовок и отвечает на предварительный запрос `OPTIONS`. Для этой работы такой сценарий не нужен, но при встраивании API в веб-страницу без него браузер скроет тело ответа.

> [!NOTE] Память вместо базы
> После перезапуска сервис снова видит ровно 12 студентов, а созданные записи исчезают. Это удобно для повторных прогонов, но объясняет, почему `validation_error` на повторный email после перезапуска пропадает: дубликата больше нет. Для проверки уникальности запускайте создание дважды подряд на одном работающем сервисе.

> [!SHOT] Скриншот 1
> Консоль сервиса со строкой запуска и ответы `curl.exe` на `/health.json`, фильтр по группе и карточку с кодом `404`.

## Задание 3. Postman

Сначала перезапустите сервис: в задании 2 вы создали `sokolov@example.ru`, а коллекция создаёт того же студента. После перезапуска снова 12 записей, и запрос создания вернёт `201`, а не `400`.

Импортируйте коллекцию: **File → Import → Files**, выберите `UIFIS_practice-10_postman-collection.json`. Затем создайте окружение: **Environments → +**, имя `UIFIS practice 10`, переменная `baseUrl` со значением `http://127.0.0.1:8090`. Сохраните окружение и выберите его в правом верхнем углу. В коллекции уже есть переменная `baseUrl` со значением по умолчанию, но окружение перекрывает её и позволяет менять порт в одном месте. Если окружение не выбрано, строка `{{baseUrl}}/api/students` уйдёт как есть и Postman покажет ошибку отправки.

В коллекции девять запросов. Порядок важен: список проверяется до создания, иначе `count` изменится.

| № | Запрос | Что отправляем | Ожидание |
|---|---|---|---|
| 1 | Health | `GET {{baseUrl}}/health.json` | `200`, `"status": "ok"`, `"students": 12` |
| 2 | Students list | `GET {{baseUrl}}/api/students` | `200`, 5 записей, `count` 12, `next` строка |
| 3 | Filter by group | `GET {{baseUrl}}/api/students?group=ИС-41` | `200`, 5 записей на странице, `count` 6, все `ИС-41` |
| 4 | Page | `GET {{baseUrl}}/api/students?limit=3&offset=3` | `200`, 3 записи, `next` не пуст |
| 5 | Student card | `GET {{baseUrl}}/api/students/1` | `200`, `id` 1 |
| 6 | Missing student | `GET {{baseUrl}}/api/students/999` | `404`, поле `error` |
| 7 | Create student | `POST {{baseUrl}}/api/students` | `201`, `id`, заголовок `Location` |
| 8 | Invalid email | `POST {{baseUrl}}/api/students` | `400`, `field` равен `email` |
| 9 | Server error | `GET {{baseUrl}}/api/error` | `500`, поле `error` |

Тело запроса 7:

```json
{
  "full_name": "Соколов Пётр Ильич",
  "email": "sokolov@example.ru",
  "group": "ИС-42"
}
```

Тело запроса 8:

```json
{
  "full_name": "Ошибка",
  "email": "not-an-email",
  "group": "ИС-42"
}
```

Тесты пишутся на JavaScript в панели **Tests** и выполняются после ответа. В коллекции проверки распределены по запросам. Для здоровья проверяются статус, формат и время:

```js
pm.test('200 OK', () => pm.response.to.have.status(200));
pm.test('JSON content type', () => pm.response.to.have.header('Content-Type', /application\/json/));
const body = pm.response.json();
pm.test('service is healthy', () => pm.expect(body.status).to.eql('ok'));
pm.test('fast enough', () => pm.expect(pm.response.responseTime).to.be.below(1000));
```

Для списка проверяются массив, число, обязательные поля и отсутствие пароля:

```js
pm.test('200 OK', () => pm.response.to.have.status(200));
const body = pm.response.json();
pm.test('items is array', () => pm.expect(body.items).to.be.an('array'));
pm.test('count is number', () => pm.expect(body.count).to.be.a('number'));
pm.test('required fields', () => body.items.forEach(s => {
  pm.expect(s).to.have.property('id');
  pm.expect(s).to.have.property('full_name');
  pm.expect(s).to.have.property('email');
  pm.expect(s).to.have.property('group');
}));
pm.test('no password', () => pm.expect(JSON.stringify(body)).to.not.include('password'));
```

Для фильтра, страницы и карточки:

```js
// 03 Filter by group
pm.test('200 OK', () => pm.response.to.have.status(200));
const filtered = pm.response.json();
pm.test('only IS-41', () => filtered.items.forEach(s => pm.expect(s.group).to.eql('ИС-41')));

// 04 Page
pm.test('200 OK', () => pm.response.to.have.status(200));
const page = pm.response.json();
pm.test('three items', () => pm.expect(page.items.length).to.eql(3));
pm.test('next present', () => pm.expect(page.next).to.be.a('string'));

// 05 Student card
pm.test('200 OK', () => pm.response.to.have.status(200));
const card = pm.response.json();
pm.test('id 1', () => pm.expect(card.id).to.eql(1));
```

Для отсутствующего студента, создания и ошибок:

```js
// 06 Missing student
pm.test('404 Not Found', () => pm.response.to.have.status(404));
pm.test('error field', () => pm.expect(pm.response.json()).to.have.property('error'));

// 07 Create student
pm.test('201 Created', () => pm.response.to.have.status(201));
const created = pm.response.json();
pm.test('id returned', () => pm.expect(created.id).to.be.a('number'));
pm.test('Location header', () => pm.response.to.have.header('Location'));

// 08 Invalid email
pm.test('400 Bad Request', () => pm.response.to.have.status(400));
pm.test('field email', () => pm.expect(pm.response.json().field).to.eql('email'));

// 09 Server error
pm.test('500 Server Error', () => pm.response.to.have.status(500));
pm.test('error field', () => pm.expect(pm.response.json()).to.have.property('error'));
```

Чтобы время и отсутствие секретов проверялись на каждом запросе, добавьте общий тест на уровень коллекции: выберите коллекцию в левой панели, откройте **Tests** и вставьте:

```js
pm.test("Ответ быстрее 1000 мс", () => {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});

pm.test("В ответе нет password и token", () => {
  const text = pm.response.text().toLowerCase();
  pm.expect(text).to.not.include("password");
  pm.expect(text).to.not.include("token");
});
```

Результат виден под ответом на вкладке **Test Results**. Зелёная строка `All tests passed` означает, что все утверждения выполнены. Красная строка показывает, какое утверждение упало и что ожидалось: например, `expected 200 to equal 400`. Для отладки откройте **Console** сочетанием `Ctrl+Alt+C`: там видны `console.log`, время и текст ошибок. Кнопка **Run** запускает всю коллекцию и показывает сводку: число пройденных и упавших тестов, среднее время ответа и список запросов с красными отметками.

> [!PITFALL] Тест проверяет последний ответ
> `pm.response` относится к тому запросу, который только что выполнен. Если поменять URL, тело или окружение и не нажать **Send**, тесты останутся от прошлого ответа. Перед разбором результата убедитесь, что вкладка запроса совпадает с проверяемым запросом, а окружение выбрано в правом верхнем углу.

> [!SHOT] Скриншот 2
> Вкладка Test Results для списка с зелёными тестами и для создания с кодом `201`. Отдельный скриншот с красным тестом после повторной отправки того же email.

## Задание 4. Python-клиент

Postman доказывает, что endpoint работает при ручной проверке. Клиент доказывает, что те же правила можно повторить кодом и получить тот же результат. Ниже клиент на `urllib.request` без сторонних пакетов: он читает страницы по ссылке `next`, собирает все записи, создаёт студента и сохраняет список в файл.

Создайте `api_client.py`:

```python
#!/usr/bin/env python3
"""Клиент учебного API студентов. Только стандартная библиотека."""

import argparse
import json
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urljoin
from urllib.request import Request, urlopen

BASE_URL = "http://127.0.0.1:8090"
TIMEOUT = 5.0
ATTEMPTS = 3
RETRY_DELAY = 0.5
RETRY_STATUSES = {500, 503}
RETRY_METHODS = {"GET", "HEAD"}  # повторяем только безопасные методы


class ApiError(RuntimeError):
    """Ошибка обмена с API: понятный текст, код и тело ответа."""

    def __init__(self, message, status=None, payload=None):
        super().__init__(message)
        self.status = status
        self.payload = payload


def decode_json(raw):
    text = raw.decode("utf-8", errors="replace")
    if not text.strip():
        raise ApiError("Пустой ответ вместо JSON")
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        snippet = text[:120].replace("\n", " ")
        raise ApiError(f"Ответ не является JSON: {exc.msg}; начало: {snippet}") from exc


def request_json(method, url, payload=None, timeout=TIMEOUT, attempts=ATTEMPTS):
    headers = {"Accept": "application/json"}
    data = None
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    retryable = method.upper() in RETRY_METHODS
    for attempt in range(1, attempts + 1):
        request = Request(url, data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=timeout) as response:
                return response.status, decode_json(response.read())
        except HTTPError as exc:
            body = exc.read()
            try:
                parsed = decode_json(body)
                message = parsed.get("message", "без пояснения") if isinstance(parsed, dict) else "тело не объект"
            except ApiError:
                parsed = None
                message = "тело ответа не JSON"
            if retryable and exc.code in RETRY_STATUSES and attempt < attempts:
                print(f"  код {exc.code}, попытка {attempt} из {attempts}, повтор", file=sys.stderr)
                time.sleep(RETRY_DELAY * attempt)
                continue
            raise ApiError(f"{method} {url}: код {exc.code}, {message}", exc.code, parsed) from exc
        except (URLError, TimeoutError, OSError) as exc:
            reason = getattr(exc, "reason", exc)
            if retryable and attempt < attempts:
                print(f"  сеть: {reason}, попытка {attempt} из {attempts}, повтор", file=sys.stderr)
                time.sleep(RETRY_DELAY * attempt)
                continue
            raise ApiError(f"{method} {url}: сеть недоступна, попыток {attempt}: {reason}") from exc
    raise ApiError(f"{method} {url}: обмен не удался")


def safe_get(url, timeout=TIMEOUT):
    """GET без исключений: (данные, None) или (None, текст ошибки)."""
    try:
        _, data = request_json("GET", url, timeout=timeout)
    except ApiError as exc:
        return None, str(exc)
    return data, None


def build_page_url(base_url, group=None, limit=5, offset=0):
    query = {"limit": limit, "offset": offset}
    if group:
        query["group"] = group
    return f"{base_url.rstrip('/')}/api/students?{urlencode(query)}"


def check_page(data):
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        raise ApiError(f"В ответе нет списка items: {data}")
    return data


def fetch_page(base_url, group=None, limit=5, offset=0):
    url = build_page_url(base_url, group=group, limit=limit, offset=offset)
    data, error = safe_get(url)
    if error is not None:
        raise ApiError(error)
    return check_page(data)


def fetch_all(base_url, group=None, limit=5, max_pages=50):
    page = fetch_page(base_url, group=group, limit=limit, offset=0)
    students = list(page["items"])
    seen = set()
    next_url = page.get("next")
    for _ in range(max_pages - 1):
        if not next_url:
            return students
        if not isinstance(next_url, str):
            raise ApiError(f"Поле next должно быть строкой или null: {next_url}")
        url = urljoin(base_url.rstrip("/") + "/", quote(next_url, safe="/?&=%:"))
        if url in seen:
            raise ApiError(f"Пагинация зациклилась на {url}")
        seen.add(url)
        data, error = safe_get(url)
        if error is not None:
            raise ApiError(error)
        page = check_page(data)
        students.extend(page["items"])
        next_url = page.get("next")
    raise ApiError(f"Пагинация не завершилась за {max_pages} страниц")


def create_student(base_url, full_name, email, group):
    url = f"{base_url.rstrip('/')}/api/students"
    payload = {"full_name": full_name, "email": email, "group": group}
    return request_json("POST", url, payload=payload)


def save_students(students, path):
    target = Path(path)
    target.write_text(json.dumps(students, ensure_ascii=False, indent=2), encoding="utf-8")
    return target


def build_parser():
    parser = argparse.ArgumentParser(description="Клиент учебного API студентов")
    parser.add_argument("--base-url", default=BASE_URL)
    sub = parser.add_subparsers(dest="command", required=True)

    list_cmd = sub.add_parser("list", help="одна страница студентов")
    list_cmd.add_argument("--group")
    list_cmd.add_argument("--limit", type=int, default=5)
    list_cmd.add_argument("--offset", type=int, default=0)

    all_cmd = sub.add_parser("all", help="все страницы и сохранение в файл")
    all_cmd.add_argument("--group")
    all_cmd.add_argument("--limit", type=int, default=5)
    all_cmd.add_argument("--out", default="students.json")

    add_cmd = sub.add_parser("add", help="создать студента")
    add_cmd.add_argument("--name", required=True)
    add_cmd.add_argument("--email", required=True)
    add_cmd.add_argument("--group", required=True)

    sub.add_parser("health", help="проверить службу")
    sub.add_parser("error", help="проверить повтор при коде 500")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    base = args.base_url
    try:
        if args.command == "health":
            status, data = request_json("GET", f"{base}/health.json")
            print(f"{status} {json.dumps(data, ensure_ascii=False)}")
        elif args.command == "list":
            page = fetch_page(base, group=args.group, limit=args.limit, offset=args.offset)
            for student in page["items"]:
                print(f'{student["id"]:>3}  {student["group"]}  {student["full_name"]}  {student["email"]}')
            print(f'Всего: {page["count"]}, next: {page["next"]}')
        elif args.command == "all":
            students = fetch_all(base, group=args.group, limit=args.limit)
            target = save_students(students, args.out)
            print(f"Получено {len(students)} записей, файл {target.resolve()}")
        elif args.command == "add":
            status, data = create_student(base, args.name, args.email, args.group)
            print(f'{status} Создан студент {data["id"]}: {data["full_name"]}, {data["group"]}')
        elif args.command == "error":
            request_json("GET", f"{base}/api/error")
    except ApiError as exc:
        print(f"Ошибка: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Перед проверкой перезапустите сервис, чтобы вернуть 12 студентов после создания в Postman. Затем проверьте службу и страницу:

```powershell
python api_client.py health
python api_client.py list --group ИС-41 --limit 2
```

Ожидаемый вывод: строка `200 {"service": "uifis-students", "status": "ok", "students": 12}`, затем две записи с id 1 и 3 и строка `Всего: 6, next: /api/students?group=ИС-41&limit=2&offset=2`.

Соберите все страницы группы и сохраните файл:

```powershell
python api_client.py all --group ИС-41 --limit 2 --out students.json
```

Клиент делает три запроса и получает шесть записей, затем печатает `Получено 6 записей, файл ...\students.json`. Откройте файл: это массив из шести объектов с теми же полями, что в контракте.

Создайте студента и проверьте отказ:

```powershell
python api_client.py add --name "Соколов Пётр Ильич" --email "sokolov@example.ru" --group ИС-42
python api_client.py add --name "Соколов Пётр Ильич" --email "sokolov@example.ru" --group ИС-42
python api_client.py error
```

Первая команда печатает `201 Создан студент 13`. Вторая завершается кодом `1` и сообщением `Ошибка: POST ...: код 400, Студент с таким email уже есть`. Третья делает три попытки, печатает две строки о повторе и сдаётся с текстом `код 500, Учебная ошибка сервера`.

Четыре решения в коде стоит проговорить. Ссылка `next` приходит с кириллицей в параметре группы, а `urlopen` передаёт строку запроса в ASCII, поэтому клиент вызывает `quote` перед сборкой абсолютного адреса: без этого Python падает с `UnicodeEncodeError` на второй странице. Повтор разрешён только для `GET` и `HEAD`, потому что `POST` не является безопасным: если сервер уже создал запись, а ответ потерялся, повтор создаст вторую. Повторяются только коды `500` и `503` и сетевые ошибки, потому что `400` и `404` от повтора не изменятся. Таймаут `5` секунд не даёт клиенту зависнуть навсегда, а ограничение `max_pages` и набор уже посещённых ссылок защищают от бесконечной пагинации.

> [!PITFALL] Повтор POST без ключа создаёт дубликат
> Учебный сервис спасает проверка уникальности email. В реальной системе без такого ограничения повторная отправка создаст второго студента с тем же адресом и другим `id`. Если повтор нужен, сервер и клиент договариваются о ключе идемпотентности, и повтор с тем же ключом возвращает первый результат, а не создаёт новую запись.

> [!SHOT] Скриншот 3
> Вывод `python api_client.py list --group ИС-41 --limit 2`, вывод `all` с числом записей и первые строки файла `students.json`.

## Задание 5. Сверка и отказы

Сверка сравнивает два независимых чтения одних данных. Перезапустите сервис, чтобы после созданий в Postman и Python снова было 12 студентов, затем выполните фильтр в Postman и тот же фильтр клиентом.

| Показатель | Postman | Python | Расхождение |
|---|---|---|---|
| Код ответа | `200` | `200` | нет |
| Число записей (`count`) | 6 | 6 | нет |
| Первый id | 1 | 1 | нет |
| Время, мс | из Test Results | из вывода | зависит от машины |
| Текст ошибки | `not_found` на id 999 | `код 404, Студент не найден` | нет |

Сравнивайте `count`, а не длину одной страницы. В запросе 03 коллекция не задаёт `limit`, поэтому сервер отдаёт 5 записей при `count` 6. Клиент с `--limit 2` отдаёт 2 записи при том же `count` 6. Оба ответа верны, потому что число страниц и число записей под фильтр это разные величины.

Проверить сохранённый файл можно отдельной командой:

```powershell
python -c "import json; data=json.load(open('students.json',encoding='utf-8')); print(len(data), [item['id'] for item in data])"
```

Ожидается `6 [1, 3, 5, 7, 9, 11]`. Если чисел меньше, смотрите `next` и `count` на каждой странице: клиент остановился раньше времени или сервер вернул не ту ссылку.

Теперь разберите отказы. Для каждого заполните строку в чек-листе: симптом, где смотрели, причина, исправление.

| Симптом | Где смотреть | Причина | Исправление |
|---|---|---|---|
| `404` на известном пути | URL и path | опечатка в пути или студента с таким `id` нет | сверить путь с контрактом, взять `id` из списка |
| `400` при создании | тело JSON и поля | нет поля, неверный email или повтор адреса | посмотреть `field` и исправить это поле |
| `500` на `/api/error` | консоль сервиса | обработчик падает намеренно | это учебный отказ, клиент должен его пережить |
| таймаут | окно сервиса и порт | сервис не запущен, неверный порт, запрос режет firewall | проверить процесс, порт и `baseUrl` |
| пустая страница | `limit` и `offset` | `offset` больше `count` или группа написана иначе | проверить `count`, `next` и написание группы |
| повтор создал дубль | ключ и уникальность | `POST` выполнили дважды | не повторять `POST` без ключа идемпотентности |

Выполните четыре отказа руками. Первый: запросите карточку `/api/students/999` и объясните, почему это не ошибка клиента. Второй: отправьте того же студента второй раз и найдите в теле поле `field`. Третий: запустите клиент с `--base-url http://127.0.0.1:8091`, когда сервис слушает `8090`, и посмотрите, сколько попыток он сделает и что напечатает. Четвёртый: вызовите `error` и сравните поведение Postman и Python. Postman покажет один ответ `500`, Python сделает три попытки.

> [!NOTE] Повтор не лечит ошибку клиента
> Если сервер отвечает `400` или `404`, повтор вернёт тот же код и тот же текст. Повторяют только временные отказы: `500`, `503`, обрыв соединения, таймаут. Различать эти случаи обязательно, иначе клиент будет тратить время на запросы, которые не могут стать успешными.

## Задание 6. Отчёт

В отчёт приложите:

1. Таблицу контракта из задания 1 с фактическими кодами и форматами.
2. Файл `mock_api.py` или его распечатку. Если меняли порт, укажите это в отчёте.
3. Экспорт коллекции и окружения Postman в JSON. В окружении должен быть только `baseUrl`, без паролей и токенов.
4. Скриншоты: запуск сервиса и `/health.json`, коллекция с окружением, успешные тесты, тесты `404` и `400`, вывод клиента и файл `students.json`, таблица сверки.
5. Заполненный чек-лист `UIFIS_practice-10_checklist.csv`.
6. Таблицу сверки Postman и Python с фактическими числами и временем.
7. Таблицу отказов с причинами и исправлениями.
8. Вывод, который отвечает на вопросы шаблона: почему код `200` не доказывает корректность данных, как проверялись поля и количество записей, что изменится при страницах по 5 записей и какая ошибка оказалась самой трудной.

В выводе опирайтесь на факты из таблиц, а не пересказывайте задания. Например: «расхождение поймала проверка `count` против длины массива, потому что фильтр по группе был потерян в URL». Такой вывод проверяющий может сверить с таблицей.

> [!SHOT] Скриншот 4
> Страница отчёта с таблицей сверки и таблицей отказов, заполненными фактическими числами.

### Контрольные вопросы

1. Чем API отличается от прямого доступа к базе данных?
2. Зачем нужны коды `400`, `404` и `500` и чем они различаются?
3. Что такое пагинация и почему клиент должен её поддерживать?
4. Почему повтор запроса на создание требует ключа идемпотентности?
5. Какие поля ответа нельзя писать в журнал?
6. Чем проверка в Postman отличается от проверки в коде клиента?

### Критерии оценки

- **5**: сервис работает, все девять запросов коллекции проходят, клиент читает страницы по `next`, повторяет `500` и сохраняет файл, сверка совпадает по числам и ключам, разобраны минимум три отказа, отчёт и чек-лист заполнены.
- **4**: сервис и клиент работают, но один-два теста слабые, один отказ объяснён поверхностно или в отчёте не хватает скриншота.
- **3**: запросы проверены вручную без тестов или клиент не умеет пагинацию и повтор, сверка выполнена формально, отказы перечислены без причин.
