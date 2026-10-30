---
title: Модули ИС и безопасность, API и Postman
dek: "Соберите модуль пользователей с ролями, поднимите его как API, проверьте отказы в Postman и докажите журналом, что доступ закрыт, а секреты не утекли."
chapter: "Практика 17"
minutes: 180
level: СПО
glyph: П17
outcomes:
  - Разделить модуль на роли и операции и назначить минимальные права
  - Спроектировать таблицы пользователей, ролей и журнала с ограничениями целостности
  - Поднять API с проверкой Bearer-токена и разделить ответы 401 и 403
  - Проверить в Postman успешные ответы и отказы 400, 401, 403, 404 и 500
  - Настроить журнал аудита так, чтобы в нём не было паролей и токенов
  - Заполнить отчёт фактами и защитить принятые решения
---

## Цель работы

Собрать модуль пользователей с ролями, поднять его как API, проверить отказы в Postman и доказать журналом, что доступ закрыт, а секреты не утекли.

В результате работы вы:

- разделяете модуль на роли и операции и назначаете минимальные права;
- проектируете таблицы пользователей, ролей и журнала с ограничениями целостности;
- поднимаете API с проверкой Bearer-токена и разделяете ответы `401` и `403`;
- проверяете в Postman успешные ответы и отказы `400`, `401`, `403`, `404` и `500`;
- настраиваете журнал аудита так, чтобы в нём не было паролей и токенов.

## Оборудование и программное обеспечение

- Windows 10 или 11 и PowerShell.
- Python 3.9 или новее с модулем `sqlite3`, VS Code.
- Postman, установленный как обычное приложение.
- Word для отчёта, Excel для чек-листа.

Права администратора, Docker, интернет и сервер базы данных не требуются: база это файл `users.db`.

<div class="files"><b class="label">Материалы к работе</b>
<a href="reports/UIFIS_practice-17_report-template.docx" download>Шаблон отчёта в DOCX</a>
<a href="reports/UIFIS_practice-17_postman-collection.json" download>Коллекция Postman</a>
<a href="reports/UIFIS_practice-17_security-checklist.csv" download>Чек-лист безопасности в CSV</a>
<p>В шаблоне уже есть таблица модулей, таблица проверок и таблица тестов. В коллекции семь запросов и две переменные. В чек-листе восемь строк, добавьте девятую про блокировку и десятую про повторный прогон. Коллекцию дополняете шестью запросами: без них не проверить `404`, блокировку, смену роли и журнал.</p>
</div>

## Краткие теоретические сведения

Кнопку «Удалить» на экране видел только администратор, поэтому удалять мог любой. Обработчик получал запрос и выполнял его, а роль проверял интерфейс, который кнопку просто не показывал. Запрос собирается в Postman за минуту, и скрытая кнопка не останавливает никого.

Интерфейс это удобство, а не защита. Защита стоит на сервере: он проверяет каждый запрос сам, независимо от того, пришёл тот из браузера, из Postman или из чужого скрипта.

Сервер задаёт себе три вопроса по порядку. Кто вы? Ответ даёт аутентификация: заголовок `Authorization: Bearer <token>` и строка в таблице пользователей. Что вам можно? Это авторизация: роль и её права на конкретную операцию. Что вы сделали? Это аудит: запись о входе, отказе и изменении, которую потом читает администратор.

Работа идёт в три слоя. Сначала модуль: какие объекты есть, кто и что с ними делает, какие права минимальны. Потом схема и API: таблицы `users`, `roles`, `audit` и обработчики, которые спрашивают права у базы, а не у интерфейса. Затем проверка: Postman присылает и правильные, и неправильные запросы, а журнал показывает, что сервер заметил каждый отказ и записал его.

Результат работы: файл `users.db` с тремя таблицами и тремя учётными записями, сервис `users_api.py` на порту `8091`, коллекция Postman из тринадцати запросов с зелёными тестами, журнал аудита не короче десяти записей, заполненный чек-лист безопасности и отчёт.

> [!NOTE] Что считается готовым результатом
> Без токена API отвечает `401`, с токеном роли `user` на список пользователей `403`. Менеджер меняет статус, но не роль. Пароль и токен не встречаются ни в одном ответе и ни в одной строке журнала. Коллекция проходит целиком на свежей базе, а таблица проверок заполнена фактическими кодами, а не ожидаемыми.

## Ход работы

### Шаг 1. Подготовка рабочего места

Проверьте Python в PowerShell:

```powershell
python --version
```

Если команда открывает Microsoft Store или отвечает ошибкой, используйте загрузчик `py`:

```powershell
py -3 --version
```

Дальше вместо `python` пишите `py -3`. Создайте папку практики и перейдите в неё:

```powershell
New-Item -ItemType Directory -Force .../UIFIS/practice-17 | Out-Null
Set-Location .../UIFIS/practice-17
```

Убедитесь, что SQLite доступен и поддерживает индекс по выражению `lower(email)`:

```powershell
python -c "import sqlite3; print(sqlite3.sqlite_version)"
```

Команда печатает версию, например `3.50.4`. Python 3.9 и новее поставляется с SQLite, который такой индекс поддерживает.

Проверьте, что порт `8091` свободен:

```powershell
Get-NetTCPConnection -LocalPort 8091 -State Listen -ErrorAction SilentlyContinue
```

Пустой вывод означает, что порт никто не слушает. Скачайте коллекцию, шаблон и чек-лист в папку практики. Включите в Проводнике показ расширений: браузер иногда сохраняет файл как `.json.txt`, и Postman такой файл не импортирует.

Postman установите как обычное приложение. Если при первом запуске предлагают вход, можно работать локально: коллекция и окружение хранятся на компьютере и не требуют облачной синхронизации.

> [!PITFALL] Порт уже занят
> Ошибка `OSError: [WinError 10048]` означает, что `8091` слушает другая копия сервиса. Найдите владельца командой `Get-NetTCPConnection -LocalPort 8091 -State Listen | Select-Object OwningProcess` и закройте свою прошлую копию. Если порт занят чужим приложением, запустите сервис с ключом `--port 8092` и поменяйте `baseUrl` в окружении Postman, иначе коллекция будет стучаться не туда.

### Шаг 2. Модули и роли

Модуль это часть системы с одной зоной ответственности и своим набором прав. Пользователи, роли и журнал здесь три модуля: первый хранит учётные записи, второй задаёт права, третий фиксирует, кто что сделал. Собрать их можно в одном сервисе, но права всё равно описываются отдельно. Иначе добавление роли `auditor` превращается в правку условий по всему коду, и одно забытое место открывает доступ.

| Модуль | Что хранит | Кто работает | Чего модуль не делает |
|---|---|---|---|
| Пользователи | учётные записи: логин, почта, роль, статус | `admin`, `manager` | не решает, какие права у роли |
| Роли | флаги прав для `admin`, `manager`, `user` | `admin` при настройке, сервер при чтении | не хранит людей |
| Аудит | записи о входе, отказах и изменениях | `admin` читает, сервер пишет | не исправляет и не удаляет записи |

Роль это набор прав, а не название человека. Один сотрудник может иметь две учётные записи с разными ролями, и это нормально: каждая операция выполняется под той ролью, которая ей соответствует.

Матрица прав для этого модуля:

| Операция | `admin` | `manager` | `user` |
|---|---|---|---|
| `GET /health.json` | да | да | да |
| `GET /api/users` | да | да | нет |
| `GET /api/users/{id}` | да | да | нет |
| `POST /api/users` | да | нет | нет |
| `PATCH /api/users/{id}`, поле `status` | да | да | нет |
| `PATCH /api/users/{id}`, поле `role` | да | нет | нет |
| `GET /api/audit` | да | нет | нет |
| `GET /api/error` | да | да | да |

Минимальные права означают, что роль получает только те операции, без которых не работает её сценарий. Менеджеру нужен список, чтобы отвечать пользователям, поэтому чтение разрешено. Создавать учётки он не должен: это решение администратора, а лишняя учётная запись это лишняя точка входа. Пользователю не нужен список всех: в его сценарии нет такой страницы.

Два исключения из матрицы объясняются отдельно. `GET /health.json` не проверяет токен, потому что мониторинг спрашивает здоровье сервиса до входа в систему. `GET /api/error` это учебный отказ: он существует, чтобы проверить поведение клиента на `500`, и данных не отдаёт.

> [!PITFALL] Проверка на экране не защищает API
> Скрытая кнопка не запрещает запрос. Пока сервер сам не спросит роль, запрет живёт только в браузере, а браузер не единственный клиент. Правило простое: каждая операция, меняющая данные или читающая чужие, проверяет право на сервере, даже если кнопка уже спрятана.

Различать два отказа обязательно. `401` значит «я не знаю, кто вы»: заголовка нет, токен неизвестен или учётная запись заблокирована. `403` значит «я знаю, кто вы, но вам нельзя». Клиент по этим кодам принимает разные решения: при `401` идёт за новым токеном, при `403` не повторяет запрос, потому что повтор не изменит прав. У ответа `401` есть заголовок `WWW-Authenticate: Bearer`: он сообщает клиенту, какой способ входа поддерживает сервер.

В шаблоне отчёта таблица модулей содержит строки про заказы. Если второго модуля в вашей работе нет, замените эти строки своим модулем: таблица должна описывать то, что вы собрали.

> [!NOTE] Скриншот для этого шага не нужен
> Таблица модулей и матрица прав заполняются в Word.

### Шаг 3. Схема и API

Схема повторяет матрицу прав, но в виде данных. Права лежат в таблице `roles` пятью флагами, и код спрашивает флаг, а не сравнивает название роли.

| Таблица | Поля | Зачем |
|---|---|---|
| `roles` | `code`, `title`, пять флагов `can_*` | права одной строкой на роль |
| `users` | `id`, `login`, `email`, `role`, `status`, `password_hash`, `token`, `created_at` | учётные записи |
| `audit` | `id`, `at`, `actor`, `action`, `target`, `result`, `detail` | след действий и отказов |

Три ограничения делают половину работы за код. Уникальный индекс по `lower(email)` и `lower(login)` не даёт создать дубль, даже если регистр букв другой. Уникальный индекс по `token` гарантирует, что поиск вернёт ровно одну учётную запись. Внешний ключ `role` на `roles.code` не даёт вписать роль, которой нет в справочнике.

Проверка в коде всё равно нужна, но для другого: она возвращает понятное сообщение и поле `field`, по которому видно, что исправлять. Ограничение в базе нужно для гарантии. Между проверкой и вставкой проходит время, и два одновременных запроса могут пройти проверку оба; уникальный индекс остановит второй.

Создайте в папке практики файл `users_api.py`:

```python
#!/usr/bin/env python3
"""UIFIS practice 17: users, roles and audit on the Python standard library.

Run:
    python users_api.py

The service listens on http://127.0.0.1:8091 and keeps data in users.db
(SQLite file created on the first run).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import secrets
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

SERVICE = "uifis-users"
DEFAULT_PORT = 8091
DB_PATH = Path(__file__).with_name("users.db")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
LOGIN_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{2,31}$")
STATUSES = {"active", "blocked"}
FIELDS = "id, login, email, role, status, created_at"

SCHEMA = """
CREATE TABLE IF NOT EXISTS roles (
    code              TEXT PRIMARY KEY,
    title             TEXT NOT NULL,
    can_read_users    INTEGER NOT NULL,
    can_create_users  INTEGER NOT NULL,
    can_change_status INTEGER NOT NULL,
    can_change_role   INTEGER NOT NULL,
    can_read_audit    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    login         TEXT NOT NULL,
    email         TEXT NOT NULL,
    role          TEXT NOT NULL REFERENCES roles(code),
    status        TEXT NOT NULL DEFAULT 'active',
    password_hash TEXT NOT NULL,
    token         TEXT NOT NULL,
    created_at    TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_login_uq ON users(lower(login));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON users(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_token_uq ON users(token);

CREATE TABLE IF NOT EXISTS audit (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    at     TEXT NOT NULL,
    actor  TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    result TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT ''
);
"""

# Права лежат в данных, а не в условиях вида if role == "admin".
SEED_ROLES = [
    ("admin", "Администратор", 1, 1, 1, 1, 1),
    ("manager", "Менеджер", 1, 0, 1, 0, 0),
    ("user", "Пользователь", 0, 0, 0, 0, 0),
]

# login, email, role, password, token
# student-token выдан администратору: значение пришло из коллекции Postman.
# Роль берётся из строки таблицы users, а не из текста токена.
SEED_USERS = [
    ("admin", "admin@example.ru", "admin", "Admin#2026", "student-token"),
    ("manager", "manager@example.ru", "manager", "Manager#2026", "manager-token"),
    ("student", "student@example.ru", "user", "Student#2026", "user-token"),
]


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(8)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("ascii"), 120_000)
    return f"pbkdf2${salt}${digest.hex()}"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with closing(connect()) as conn:
        conn.executescript(SCHEMA)
        if conn.execute("SELECT COUNT(*) FROM roles").fetchone()[0] == 0:
            conn.executemany("INSERT INTO roles VALUES (?, ?, ?, ?, ?, ?, ?)", SEED_ROLES)
            for login, email, role, password, token in SEED_USERS:
                conn.execute(
                    "INSERT INTO users (login, email, role, status, password_hash, token, created_at)"
                    " VALUES (?, ?, ?, 'active', ?, ?, ?)",
                    (login, email, role, hash_password(password), token, now()),
                )
        conn.commit()


def write_audit(actor: str, action: str, target: str, result: str, detail: str = "") -> None:
    with closing(connect()) as conn:
        conn.execute(
            "INSERT INTO audit (at, actor, action, target, result, detail) VALUES (?, ?, ?, ?, ?, ?)",
            (now(), actor, action, target, result, detail),
        )
        conn.commit()


class Handler(BaseHTTPRequestHandler):
    server_version = "UIFISUsers/1.0"

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
        headers = {"WWW-Authenticate": "Bearer"} if status == 401 else None
        self._send(status, body, headers)

    def _body(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8")
            parsed = json.loads(raw) if raw.strip() else None
        except (ValueError, UnicodeDecodeError):
            return None, (400, "invalid_json", "Тело запроса не является корректным JSON")
        if not isinstance(parsed, dict):
            return None, (400, "invalid_json", "Ожидается JSON-объект")
        return parsed, None

    def _authenticate(self):
        header = self.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            write_audit("anonymous", "auth", self.path, "unauthorized", "нет заголовка Authorization")
            return None, (401, "unauthorized", "Нужен заголовок Authorization: Bearer <token>")
        token = header[len("Bearer "):].strip()
        with closing(connect()) as conn:
            row = conn.execute(
                """SELECT u.id, u.login, u.status, u.role AS role_code,
                          r.can_read_users, r.can_create_users, r.can_change_status,
                          r.can_change_role, r.can_read_audit
                   FROM users u JOIN roles r ON r.code = u.role
                   WHERE u.token = ?""",
                (token,),
            ).fetchone()
        if row is None:
            write_audit("unknown", "auth", self.path, "unauthorized", "неизвестный токен")
            return None, (401, "unauthorized", "Токен неизвестен или отозван")
        if row["status"] != "active":
            write_audit(row["login"], "auth", self.path, "unauthorized", "учётная запись заблокирована")
            return None, (401, "unauthorized", "Учётная запись заблокирована")
        return dict(row), None

    def _forbid(self, user: dict, permission: str):
        write_audit(user["login"], "access", self.path, "denied", f"нет права {permission}")
        return (403, "forbidden", "Роли не хватает права на эту операцию")

    def _authorize(self, permission: str):
        user, error = self._authenticate()
        if error:
            return None, error
        if not user[permission]:
            return None, self._forbid(user, permission)
        return user, None

    def do_GET(self) -> None:
        try:
            self._get()
        except Exception as exc:  # ответ без стека и без подробностей
            print(f"internal error: {exc!r}", flush=True)
            self._error(500, "server_error", "Внутренняя ошибка сервера")

    def _get(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health.json":
            with closing(connect()) as conn:
                count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            self._send(200, {"service": SERVICE, "status": "ok", "users": count})
            return
        if parsed.path == "/api/error":
            self._error(500, "server_error", "Учебная ошибка сервера")
            return
        if parsed.path == "/api/users":
            user, error = self._authorize("can_read_users")
            if error:
                self._error(*error)
                return
            with closing(connect()) as conn:
                rows = conn.execute(f"SELECT {FIELDS} FROM users ORDER BY id").fetchall()
            items = [dict(row) for row in rows]
            write_audit(user["login"], "read_users", "/api/users", "ok", f"записей {len(items)}")
            self._send(200, {"items": items, "count": len(items)})
            return
        if parsed.path.startswith("/api/users/"):
            user, error = self._authorize("can_read_users")
            if error:
                self._error(*error)
                return
            raw = parsed.path.rsplit("/", 1)[-1]
            if not raw.isdigit():
                self._error(404, "not_found", "Пользователь не найден")
                return
            with closing(connect()) as conn:
                row = conn.execute(f"SELECT {FIELDS} FROM users WHERE id = ?", (int(raw),)).fetchone()
            if row is None:
                write_audit(user["login"], "read_user", f"/api/users/{raw}", "not_found", "нет записи")
                self._error(404, "not_found", "Пользователь не найден")
                return
            self._send(200, dict(row))
            return
        if parsed.path == "/api/audit":
            user, error = self._authorize("can_read_audit")
            if error:
                self._error(*error)
                return
            raw = parse_qs(parsed.query).get("limit", ["20"])[0]
            try:
                limit = int(raw)
            except ValueError:
                self._error(400, "bad_request", "limit должен быть числом", "limit")
                return
            limit = max(1, min(limit, 100))
            with closing(connect()) as conn:
                rows = conn.execute(
                    "SELECT id, at, actor, action, target, result, detail FROM audit ORDER BY id DESC LIMIT ?",
                    (limit,),
                ).fetchall()
            self._send(200, {"items": [dict(row) for row in rows], "count": len(rows)})
            return
        self._error(404, "not_found", "Маршрут не найден")

    def do_POST(self) -> None:
        try:
            self._post()
        except Exception as exc:
            print(f"internal error: {exc!r}", flush=True)
            self._error(500, "server_error", "Внутренняя ошибка сервера")

    def _post(self) -> None:
        if urlparse(self.path).path != "/api/users":
            self._error(404, "not_found", "Маршрут не найден")
            return
        user, error = self._authorize("can_create_users")
        if error:
            self._error(*error)
            return
        body, error = self._body()
        if error:
            self._error(*error)
            return
        for field in ("login", "email", "role"):
            value = body.get(field)
            if not isinstance(value, str) or not value.strip():
                self._error(400, "validation_error", f"Поле {field} обязательно", field)
                return
        login = body["login"].strip().lower()
        email = body["email"].strip().lower()
        role = body["role"].strip()
        if not LOGIN_RE.match(login):
            self._error(400, "validation_error", "Логин: 3-32 символа, латиница, цифры, точка, дефис", "login")
            return
        if not EMAIL_RE.match(email):
            self._error(400, "validation_error", "Некорректный email", "email")
            return
        password = body.get("password")
        if password is None:
            # Коллекция создаёт учётку без пароля: временный пароль никто не узнает.
            password = secrets.token_urlsafe(24)
        elif not isinstance(password, str) or len(password) < 8:
            self._error(400, "validation_error", "Пароль не короче 8 символов", "password")
            return
        with closing(connect()) as conn:
            if conn.execute("SELECT 1 FROM roles WHERE code = ?", (role,)).fetchone() is None:
                self._error(400, "validation_error", "Неизвестная роль", "role")
                return
            if conn.execute("SELECT 1 FROM users WHERE lower(email) = ?", (email,)).fetchone():
                self._error(400, "validation_error", "Пользователь с таким email уже есть", "email")
                return
            if conn.execute("SELECT 1 FROM users WHERE lower(login) = ?", (login,)).fetchone():
                self._error(400, "validation_error", "Такой логин уже занят", "login")
                return
            try:
                cursor = conn.execute(
                    "INSERT INTO users (login, email, role, status, password_hash, token, created_at)"
                    " VALUES (?, ?, ?, 'active', ?, ?, ?)",
                    (login, email, role, hash_password(password), secrets.token_urlsafe(24), now()),
                )
                conn.commit()
            except sqlite3.IntegrityError:
                self._error(400, "validation_error", "Логин или email уже заняты", "email")
                return
            new_id = cursor.lastrowid
            row = conn.execute(f"SELECT {FIELDS} FROM users WHERE id = ?", (new_id,)).fetchone()
        write_audit(user["login"], "create_user", f"/api/users/{new_id}", "ok", f"роль {role}")
        self._send(201, dict(row), {"Location": f"/api/users/{new_id}"})

    def do_PATCH(self) -> None:
        try:
            self._patch()
        except Exception as exc:
            print(f"internal error: {exc!r}", flush=True)
            self._error(500, "server_error", "Внутренняя ошибка сервера")

    def _patch(self) -> None:
        path = urlparse(self.path).path
        if not path.startswith("/api/users/"):
            self._error(404, "not_found", "Маршрут не найден")
            return
        raw = path.rsplit("/", 1)[-1]
        if not raw.isdigit():
            self._error(404, "not_found", "Пользователь не найден")
            return
        target_id = int(raw)
        user, error = self._authenticate()
        if error:
            self._error(*error)
            return
        body, error = self._body()
        if error:
            self._error(*error)
            return
        changes: dict[str, str] = {}
        if "status" in body:
            if not user["can_change_status"]:
                self._error(*self._forbid(user, "can_change_status"))
                return
            if body["status"] not in STATUSES:
                self._error(400, "validation_error", "status: active или blocked", "status")
                return
            changes["status"] = body["status"]
        if "role" in body:
            if not user["can_change_role"]:
                self._error(*self._forbid(user, "can_change_role"))
                return
            if not isinstance(body["role"], str):
                self._error(400, "validation_error", "role должен быть строкой", "role")
                return
            with closing(connect()) as conn:
                if conn.execute("SELECT 1 FROM roles WHERE code = ?", (body["role"],)).fetchone() is None:
                    self._error(400, "validation_error", "Неизвестная роль", "role")
                    return
            changes["role"] = body["role"]
        if not changes:
            self._error(400, "validation_error", "Нужно поле status или role", "status")
            return
        if changes.get("status") == "blocked" and target_id == user["id"]:
            self._error(400, "validation_error", "Нельзя заблокировать свою учётную запись", "status")
            return
        with closing(connect()) as conn:
            row = conn.execute(f"SELECT {FIELDS} FROM users WHERE id = ?", (target_id,)).fetchone()
            if row is None:
                self._error(404, "not_found", "Пользователь не найден")
                return
            before = dict(row)
            # Имя колонки приходит из закрытого списка выше, а не из тела запроса.
            for field, value in changes.items():
                conn.execute(f"UPDATE users SET {field} = ? WHERE id = ?", (value, target_id))
            conn.commit()
            row = conn.execute(f"SELECT {FIELDS} FROM users WHERE id = ?", (target_id,)).fetchone()
        detail = ", ".join(f"{field}: {before[field]} -> {value}" for field, value in changes.items())
        write_audit(user["login"], "update_user", f"/api/users/{target_id}", "ok", detail)
        self._send(200, dict(row))

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"{self.address_string()} {fmt % args}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="UIFIS users API")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()
    init_db()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.daemon_threads = True
    print(f"{SERVICE} on http://{args.host}:{args.port}, база {DB_PATH}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
```

Разберите три места, где чаще всего ошибаются.

Первое: `_authenticate` ищет токен в таблице и берёт роль из строки. Токен `student-token` принадлежит администратору, хотя имя намекает на студента. Так вышло из коллекции, и это хороший урок: имя токена ничего не значит, это случайная строка, а права приходят только из базы. Если выводить роль из текста токена, любой напишет себе `admin-token`.

Второе: ответ собирается запросом с явным списком полей `FIELDS`. `password_hash` и `token` в выборку не входят, поэтому их нельзя вернуть случайно. Запрет действует на уровне запроса, а не на уровне надежды.

Третье: `_forbid` пишет запись в журнал до отправки ответа. Отказ, который нигде не записан, невозможно отличить от сбоя прав.

Запустите сервис в первом окне PowerShell:

```powershell
python users_api.py
```

В строке запуска появятся адрес и путь к базе. Окно не закрывайте: это и есть сервер. Во втором окне проверьте здоровье, отказ без токена, список и чужую роль:

```powershell
curl.exe -s http://127.0.0.1:8091/health.json
curl.exe -s -i http://127.0.0.1:8091/api/users
curl.exe -s -H "Authorization: Bearer student-token" http://127.0.0.1:8091/api/users
curl.exe -s -o NUL -w "%{http_code}" -H "Authorization: Bearer user-token" http://127.0.0.1:8091/api/users
```

Первая команда возвращает `{"service": "uifis-users", "status": "ok", "users": 3}`. Вторая печатает `HTTP/1.0 401 Unauthorized` и тело `{"error": "unauthorized", "message": "Нужен заголовок Authorization: Bearer <token>"}`. Третья отдаёт три записи с полями `id`, `login`, `email`, `role`, `status`, `created_at` и без `password_hash`. Четвёртая печатает `403`.

Создание проверяется телом из файла. Создайте `new_user.json`:

```powershell
'{"login": "practic.user", "email": "practic@example.ru", "role": "user"}' | Out-File -Encoding ascii new_user.json
curl.exe -s -i -X POST http://127.0.0.1:8091/api/users -H "Authorization: Bearer student-token" -H "Content-Type: application/json" --data-binary "@new_user.json"
```

Ответ начинается с `HTTP/1.0 201 Created`, содержит `Location: /api/users/4` (номер зависит от базы) и запись с `"status": "active"`. Повторите ту же команду: теперь `400`, `"error": "validation_error"` и `"field": "email"`, потому что адрес занят.

Теперь изменение статуса и запрет на роль. Менеджеру статус разрешён, роль нет:

```powershell
'{"status": "blocked"}' | Out-File -Encoding ascii patch_status.json
curl.exe -s -X PATCH http://127.0.0.1:8091/api/users/4 -H "Authorization: Bearer manager-token" -H "Content-Type: application/json" --data-binary "@patch_status.json"
'{"role": "admin"}' | Out-File -Encoding ascii patch_role.json
curl.exe -s -X PATCH http://127.0.0.1:8091/api/users/4 -H "Authorization: Bearer manager-token" -H "Content-Type: application/json" --data-binary "@patch_role.json"
```

Первая команда возвращает запись с `"status": "blocked"` и код `200`. Вторая возвращает `403` и `{"error": "forbidden", "message": "Роли не хватает права на эту операцию"}`. Проверьте в журнале, что обе попытки записаны с разным результатом.

> [!NOTE] База это файл, а не память
> `users.db` остаётся после остановки сервиса: созданные учётные записи и журнал на месте. Чтобы вернуться к трём исходным записям, остановите сервис сочетанием `Ctrl+C`, удалите `users.db` и запустите снова. Без сброса второй прогон коллекции упадёт на создании: почта `new.user@example.ru` уже занята.

> [!NOTE] HTTPS и учебный стенд
> Токен в заголовке `Authorization` идёт открытым текстом. Сервис слушает `127.0.0.1`, поэтому трафик не выходит за пределы машины. В рабочей системе передавать такой токен без HTTPS нельзя: его прочитает любой, кто видит сеть.

> [!SHOT] Скриншот 1
> Окно сервиса и ответы `curl.exe`: здоровье, `401` без токена, список с токеном администратора, `403` для роли `user`, `201` на создание и `403` на смену роли менеджером.

### Шаг 4. Проверка в Postman

Импортируйте коллекцию: **File → Import → Files**, выберите `UIFIS_practice-17_postman-collection.json`. Затем создайте окружение: **Environments → +**, имя `UIFIS practice 17`, переменные `baseUrl` со значением `http://127.0.0.1:8091` и `token` со значением `student-token`. Сохраните окружение и выберите его в правом верхнем углу.

В коллекции те же две переменные со значениями по умолчанию, поэтому запросы работают и без окружения: они уйдут на `127.0.0.1:8091` с токеном администратора. Окружение перекрывает эти значения и позволяет менять порт в одном месте, не правя коллекцию. Если имя переменной написано с ошибкой, Postman подсветит `{{...}}` красным и отправит строку как есть.

Запросы `06`, `09`, `10`, `11` и `12` подставляют токены других ролей прямо в заголовок. Иначе отказ не проверить: у коллекции один общий `{{token}}`, и он принадлежит администратору.

| № | Запрос | Что отправляем | Ожидание |
|---|---|---|---|
| 1 | Health | `GET {{baseUrl}}/health.json` | `200`, `"status": "ok"` |
| 2 | List users without token | `GET {{baseUrl}}/api/users` | `401`, `error` |
| 3 | List users as admin | `GET {{baseUrl}}/api/users`, Bearer `{{token}}` | `200`, `items`, нет `password` |
| 4 | Create user | `POST {{baseUrl}}/api/users`, Bearer `{{token}}` | `201`, `Location` |
| 5 | Duplicate email | `POST {{baseUrl}}/api/users`, та же почта | `400`, `field` равен `email` |
| 6 | Forbidden for user | `GET {{baseUrl}}/api/users`, Bearer `user-token` | `403` |
| 7 | Server error | `GET {{baseUrl}}/api/error` | `500`, `error` |
| 8 | Missing user | `GET {{baseUrl}}/api/users/999`, Bearer `{{token}}` | `404`, `error` |
| 9 | Block user | `PATCH {{baseUrl}}/api/users/3`, Bearer `manager-token`, `{"status": "blocked"}` | `200`, `status` равен `blocked` |
| 10 | Blocked token | `GET {{baseUrl}}/api/users`, Bearer `user-token` | `401` |
| 11 | Unblock user | `PATCH {{baseUrl}}/api/users/3`, Bearer `manager-token`, `{"status": "active"}` | `200`, `status` равен `active` |
| 12 | Manager changes role | `PATCH {{baseUrl}}/api/users/3`, Bearer `manager-token`, `{"role": "admin"}` | `403`, `error` равен `forbidden` |
| 13 | Audit | `GET {{baseUrl}}/api/audit`, Bearer `{{token}}` | `200`, `items`, нет секретов |

Порядок обязателен. Запрос `04` создаёт учётную запись, `05` проверяет дубль на ней же. Запрос `09` блокирует студента, `10` проверяет, что его токен теперь получает `401`, `11` возвращает статус. Если поменять `10` и `11` местами, тест получит `403` вместо `401`: пользователь уже разблокирован.

У добавленных запросов `08`…`13` выберите метод в списке слева и заполните заголовки. Чтению хватит `Authorization`, изменению нужны ещё `Content-Type: application/json` и тело в режиме **raw → JSON**. Без `Content-Type` сервер разберёт тело как мусор и ответит `400`.

Тело запроса `04`:

```json
{
  "login": "new.user",
  "email": "new.user@example.ru",
  "role": "user"
}
```

Тело запроса `05` отличается только логином, почта остаётся той же:

```json
{
  "login": "dup.user",
  "email": "new.user@example.ru",
  "role": "user"
}
```

Тесты пишутся на JavaScript в панели **Tests**. Для первых семи запросов они уже есть в коллекции. Добавьте общий тест на уровень коллекции: выберите коллекцию в левой панели, откройте **Tests** и вставьте проверку времени и секретов:

```js
pm.test("Ответ быстрее 1000 мс", () => {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});

pm.test("В ответе нет password и токенов", () => {
  const text = pm.response.text().toLowerCase();
  pm.expect(text).to.not.include("password");
  pm.expect(text).to.not.include("student-token");
  pm.expect(text).to.not.include("manager-token");
  pm.expect(text).to.not.include("user-token");
});
```

Этот тест работает и на запросе `13`: если журнал начнёт хранить токен или пароль, проверка покраснеет.

Тесты для шести добавленных запросов:

```js
// 08 Missing user
pm.test('404 Not Found', () => pm.response.to.have.status(404));
pm.test('error field', () => pm.expect(pm.response.json()).to.have.property('error'));

// 09 Block user
pm.test('200 OK', () => pm.response.to.have.status(200));
pm.test('status blocked', () => pm.expect(pm.response.json().status).to.eql('blocked'));

// 10 Blocked token
pm.test('401 Unauthorized', () => pm.response.to.have.status(401));

// 11 Unblock user
pm.test('200 OK', () => pm.response.to.have.status(200));
pm.test('status active', () => pm.expect(pm.response.json().status).to.eql('active'));

// 12 Manager changes role
pm.test('403 Forbidden', () => pm.response.to.have.status(403));
pm.test('error forbidden', () => pm.expect(pm.response.json().error).to.eql('forbidden'));

// 13 Audit
pm.test('200 OK', () => pm.response.to.have.status(200));
pm.test('items is array', () => pm.expect(pm.response.json().items).to.be.an('array'));
pm.test('has denial', () => pm.expect(pm.response.json().items.some(i => i.result === 'denied')).to.be.true);
```

Перед первым полным прогоном перезапустите сервис на свежей базе: запрос `04` создаёт `new.user`, а второй прогон без сброса получит `400` и красный тест. Кнопка **Run** запускает коллекцию по порядку и показывает сводку: сколько тестов прошло, сколько упало, среднее время ответа и список запросов с отметками.

> [!PITFALL] Тест проверяет последний ответ
> `pm.response` относится к тому запросу, который только что выполнен. Если поменять URL, тело или окружение и не нажать **Send**, тесты останутся от прошлого ответа. Перед разбором результата убедитесь, что открыта вкладка нужного запроса, а окружение выбрано в правом верхнем углу.

> [!PITFALL] Зелёный тест на неправильном адресе
> Если `baseUrl` указывает на чужой порт, а сервис не запущен, Postman покажет ошибку соединения, а не красный тест. Сначала проверьте `health`, потом запускайте `Run`: так ошибка адреса не смешивается с ошибкой прав.

> [!SHOT] Скриншот 2
> Коллекция с выбранным окружением и сводка **Run**: все тесты зелёные, красных нет. Отдельный скриншот с тестом `401` без токена и тестом `403` для роли `user`.

### Шаг 5. Аудит

Журнал отвечает на вопрос, который не решается чтением кода: кто именно получил отказ, когда и по какой причине. Без журнала администратор видит только текущее состояние: роль, статус и список пользователей. Он не видит, что вчера кто-то пытался сменить роль и получил `403`.

| Поле | Что пишем | Пример | Почему так |
|---|---|---|---|
| `at` | время в UTC | `2026-10-23T10:00:05+00:00` | события сравнимы между серверами |
| `actor` | логин из токена, `anonymous` или `unknown` | `manager` | видно, чья попытка |
| `action` | `auth`, `access`, `read_users`, `create_user`, `update_user` | `update_user` | записи группируются по операции |
| `target` | путь или id записи | `/api/users/3` | понятно, что затронуто |
| `result` | `ok`, `denied`, `unauthorized`, `not_found` | `denied` | успех отличается от отказа |
| `detail` | причина отказа или старое и новое значение | `status: active -> blocked` | объясняет событие без тела запроса |

В журнал не пишут:

- пароль, `password_hash` и соль, даже в виде фрагмента;
- значение токена и заголовок `Authorization` целиком: по нему можно войти;
- тело запроса: в нём бывают пароль, почта и другие персональные данные;
- почту и ФИО, если хватает `id` и логина;
- текст исключения и стек: это подсказка тому, кто ищет слабое место.

Правило короткое: журнал хранит факт, адрес и причину, но не содержимое секрета.

Прочитайте журнал:

```powershell
curl.exe -s -o NUL -w "%{http_code}" -H "Authorization: Bearer no-such-token" http://127.0.0.1:8091/api/users
curl.exe -s -H "Authorization: Bearer student-token" "http://127.0.0.1:8091/api/audit?limit=10"
```

Первая команда печатает `401`: токен выдуман, учётной записи за ним нет. В журнале эта попытка отличается от запроса без заголовка: там `actor` равен `anonymous`, здесь `unknown`.

Записи идут от новых к старым. Найдите три события: успешное чтение списка (`read_users`, `ok`), отказ роли (`access`, `denied`) и изменение статуса (`update_user`, `ok`, в `detail` видно `active -> blocked`). Отдельно найдите две неудачные попытки входа: `anonymous` без заголовка и `unknown` с неизвестным токеном.

| Событие | `action` | `actor` | `result` |
|---|---|---|---|
| Запрос без токена | `auth` | `anonymous` | `unauthorized` |
| Запрос с неизвестным токеном | `auth` | `unknown` | `unauthorized` |
| Менеджер меняет роль | `access` | `manager` | `denied` |
| Создание учётной записи | `create_user` | `admin` | `ok` |
| Блокировка пользователя | `update_user` | `manager` | `ok` |
| Чтение отсутствующей карточки | `read_user` | `admin` | `not_found` |

Если отказ не записан, вы не отличите сбой в правах от сбоя в журнале. Поэтому запись делается до ответа: сначала след, потом ответ клиенту.

> [!PITFALL] Журнал, который сливает данные
> Самая частая ошибка это записать в `detail` всё тело запроса «для полноты». В теле создания учётной записи лежит пароль, и он остаётся в базе навсегда, доступный каждому администратору. Пишите только те поля, которые нужны для разбора: имя действия, `id` записи и старое с новым значением.

> [!NOTE] Журнал не редактируют
> Строку журнала нельзя исправить или удалить из интерфейса: после этого нельзя доказать ничего. Рост ограничивают архивированием и сроком хранения, а не удалением неудобных записей. Чтение журнала тоже иногда пишут в журнал, но здесь этого нет, чтобы журнал не рос от собственного чтения.

> [!SHOT] Скриншот 3
> Ответ `/api/audit`: записи об успешном чтении, об отказе `403` и об изменении статуса. Видно, что в `detail` нет пароля и токена.

### Шаг 6. Проверки

Проверка отличается от демонстрации тем, что ожидание записано до запуска. Пока ожидание в голове, любой ответ кажется правильным: код `200` выглядит успехом, даже если в теле пустой список.

Заполните таблицу фактическими кодами и полями. Колонку «Факт» пишите после ответа, а не до него.

| Проверка | Ожидание | Факт |
|---|---|---|
| Здоровье сервиса | `200`, `status` равен `ok` |  |
| Список с токеном администратора | `200`, все записи с полями, нет `password_hash` и `token` |  |
| Создание учётной записи | `201`, заголовок `Location` |  |
| Дубль почты | `400`, `field` равен `email` |  |
| Отсутствующий `id` | `404`, `error` |  |
| Запрос без токена | `401`, `error` |  |
| Токен роли `user` на список | `403`, `error` |  |
| Учебная ошибка | `500`, `error`, нет слова `Traceback` |  |
| Блокировка пользователя | `200`, `status` равен `blocked` |  |
| Вход заблокированной учётной записи | `401` |  |
| Смена роли менеджером | `403`, `error` равен `forbidden` |  |
| Чтение журнала администратором | `200`, не меньше восьми записей, нет секретов |  |

Если факт не совпал с ожиданием, не подгоняйте ожидание. Сначала найдите причину: чаще всего это неверный `id`, старое состояние базы или забытый заголовок `Authorization`. После исправления повторите проверку с чистого запуска, иначе непонятно, что именно её изменило.

Чек-лист безопасности:

| № | Пункт | Ожидание | Отметка |
|---|---|---|---|
| 1 | Аутентификация | без токена `401` |  |
| 2 | Авторизация | роль `user` получает `403` на список |  |
| 3 | Пароль | в ответе нет `password`, `password_hash` и соли |  |
| 4 | Валидация | дубль почты даёт `400` с полем `email` |  |
| 5 | Ошибка | `500` не раскрывает стек и текст исключения |  |
| 6 | Аудит | вход и отказ записаны в журнал |  |
| 7 | Права | каждая роль получает только операции из матрицы |  |
| 8 | Секреты | токен и пароль не встречаются в журнале |  |
| 9 | Блокировка | заблокированная учётная запись получает `401` |  |
| 10 | Повторяемость | коллекция проходит целиком на свежей базе |  |

Две последние строки добавьте в CSV сами: в файле восемь строк и итог. Пункт 9 проверяется запросами `09` и `10`, пункт 10 полным прогоном **Run** после удаления `users.db`.

> [!NOTE] Скриншот для этого шага не нужен
> Таблица проверок и чек-лист сдаются файлами и переносятся в отчёт текстом.

### Шаг 7. Отчёт и защита

В отчёт приложите:

1. Таблицу модулей и матрицу прав с ролями `admin`, `manager`, `user`.
2. Схему трёх таблиц: SQL из файла или рисунок с полями, ключами и ограничениями.
3. Файл `users_api.py` или его распечатку.
4. Экспорт коллекции и окружения Postman в JSON. В окружении только `baseUrl` и учебный `token`; в рабочем проекте реальный токен в файл не выгружают.
5. Скриншоты: вывод `curl.exe` с кодами, коллекция с окружением, успешные `200` и `201`, `401` без токена, `403` для роли `user`, журнал аудита.
6. Заполненный чек-лист `UIFIS_practice-17_security-checklist.csv`.
7. Таблицу проверок с фактическими кодами и вывод.

В выводе опирайтесь на факты из таблиц. Например: «менеджер получил `403` на смену роли, потому что флаг `can_change_role` равен нулю в строке роли, а проверка стоит до обновления записи». Такой вывод проверяющий сверит с журналом и матрицей. Ответьте и на три вопроса шаблона: почему проверка роли только на экране не защищает API, как вы доказали, что пароль не попадает в ответ и журнал, что изменится при добавлении роли `auditor` с правом только читать журнал.

Скриншот страницы отчёта для этого шага не нужен.

## Что сдать

- Отчёт по шаблону `UIFIS_practice-17_report-template.docx`.
- Файл `users_api.py` и базу `users.db`.
- Экспорт коллекции и окружения Postman в JSON.
- Заполненный чек-лист `UIFIS_practice-17_security-checklist.csv`.
- Таблицу проверок с фактическими кодами.
- Скриншоты вывода `curl.exe`, прогона коллекции и журнала аудита.

## Критерии оценки

Оценка выставляется по шкале от 1 до 5.
- **5**: сервис работает, все тринадцать запросов коллекции проходят, коды `400`, `401`, `403`, `404` и `500` проверены и объяснены, пароль и токен не встречаются ни в ответах, ни в журнале, журнал показывает вход, отказ и изменение, чек-лист заполнен фактами, отчёт и защита полные.
- **4**: сервис и коллекция работают, но один-два теста слабые, один отказ объяснён поверхностно или в отчёте не хватает скриншота.
- **3**: запросы проверены вручную без тестов, права проверяются только на экране или в коде без запроса от чужой роли, журнал заполнен формально, таблица проверок без фактических кодов.
- **2**: работа не выполнена.
- **1**: работа выполнена с использованием ИИ или скопирована полностью или частично, 1 балл без возможности исправления.

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Чем аутентификация отличается от авторизации?
2. Что такое минимальные права и почему менеджеру не разрешено создавать учётные записи?
3. Почему `401` и `403` разные коды и как клиент использует разницу?
4. Зачем нужен журнал аудита, если в базе и так видно текущие роли и статусы?
5. Почему роль нельзя выводить из текста токена и что случится, если это сделать?

</div>
