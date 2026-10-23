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
