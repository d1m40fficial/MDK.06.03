---
title: Развёртывание базовой сетевой службы
dek: "Соберите учебную HTTP-службу в Ubuntu Server: код, отдельный пользователь, systemd, firewall, проброс порта и проверка отказов."
chapter: "Практика 9"
minutes: 90
level: СПО
glyph: П9
outcomes:
  - Развернуть HTTP-службу с несколькими endpoint
  - Оформить запуск через systemd
  - Настроить пользователя, права и firewall
  - Проверить службу с хоста через проброс порта
  - Найти и устранить отказ службы
---

## Цель работы

Развернуть свою службу, которая отдаёт данные по HTTP. В лекции 10 мы разобрали сетевые службы: DNS, DHCP, HTTP, файловые, почтовые, каталог и NTP. Это не одностраничная заглушка, а небольшой каталог сетевых служб с проверкой состояния и JSON API.

Результат работы: служба `uifis-web` запускается через systemd, слушает порт `8080`, отдаёт главную страницу, `/health.json` и `/api/services`, переживает перезапуск, проверяется с рабочего компьютера через проброс порта в VirtualBox и восстанавливается после трёх разных отказов.

> [!NOTE] Что считается готовым результатом
> Служба `uifis-web` активна, включена в автозапуск, отвечает на `http://127.0.0.1:8080/` и `/health.json`, отдаёт JSON на `/api/services`, пишет журнал, а в отчёте есть схема стенда, проверки, разбор отказов и вывод.

<div class="files"><b class="label">Материалы к работе</b>
<a href="reports/UIFIS_practice-9_report-template.docx" download>Шаблон отчёта в DOCX</a>
<a href="reports/UIFIS_practice-9_service-checklist.csv" download>Чек-лист службы в CSV</a>
<p>Заполняйте шаблон по ходу работы. В чек-лист вносите фактические результаты проверок.</p>
</div>

## Оборудование и программное обеспечение

- Виртуальная машина `uifis-srv01` из практики 6 с Ubuntu Server, пользователем `student`, SSH на порту `2222` и пробросом порта в VirtualBox.
- Рабочий компьютер с PowerShell и командой `ssh`.
- Шаблон отчёта и чек-лист службы, скачанные в начале занятия.
- VirtualBox с доступом к настройкам проброса портов.

## Краткие теоретические сведения

**Сетевая служба** принимает запросы на определённом порту и отвечает по правилам протокола. HTTP-служба получает метод и путь, выполняет обработку и возвращает код состояния, заголовки и тело ответа. Код `200` означает успех, `404` неизвестный путь, `500` внутреннюю ошибку.

**Контракт службы** это список методов, путей, кодов и форматов ответа. По контракту пишут проверки и принимают работу: видно, что служба вернула нужные поля, а не пустую страницу.

**systemd** запускает службу как процесс с заданным пользователем, рабочим каталогом и переменными окружения. `systemctl enable` включает автозапуск, `restart` перезапускает процесс, `status` показывает состояние, а `journalctl` хранит журнал. Состояние `active` означает, что процесс запущен, но не доказывает, что приложение отвечает правильно.

**Адрес прослушивания.** `0.0.0.0:8080` принимает соединения на всех адресах машины, `127.0.0.1:8080` только на loopback. Для доступа с хоста через проброс нужен первый вариант.

**Firewall** проверяет входящие пакеты по правилам. Сначала разрешают SSH, затем порт службы, и только после этого включают firewall. Порт открывают для конкретной сети, а не для всего интернета.

**Проброс порта в VirtualBox** связывает порт хоста с портом гостя. Хост обращается к `127.0.0.1:8080`, гипервизор передаёт соединение в гостя. Поэтому проверка с хоста проверяет сразу службу, адрес прослушивания, firewall и правило проброса.

## Ход работы

Работа идёт в виртуальной машине `uifis-srv01`. Сначала подготовьте стенд и код, затем оформите службу через systemd, настройте firewall и проброс, после чего разберите отказы.

### Шаг 1. Подготовьте стенд

Проверьте подключение с рабочего компьютера в PowerShell:

```powershell
ssh -p 2222 student@127.0.0.1
```

Внутри машины проверьте Python, systemd и состояние firewall:

```bash
python3 --version
systemctl --version
sudo ufw status
```

Если пользователь `uifis` не создан в практике 6, создайте его:

```bash
sudo adduser --system --group --home /srv/uifis --shell /usr/sbin/nologin uifis
```

Создайте каталог службы и выдайте минимальные права:

```bash
sudo install -d -o uifis -g uifis -m 0750 /srv/uifis-web
ls -ld /srv/uifis-web
```

Права `0750` означают: владелец читает, пишет и заходит; группа читает и заходит; остальные не имеют доступа. Служба будет работать от `uifis`, поэтому ей не нужны права `root`.

> [!PITFALL] Не закройте себе SSH
> Если вы включите UFW, не разрешив SSH, текущая сессия может закрыться, а новая не откроется. Сначала разрешите `22/tcp`, затем остальные правила, и только после этого включайте firewall. Проверяйте вход во втором окне, не закрывая первое.

### Шаг 2. Зафиксируйте контракт службы

До написания кода зафиксируйте, что служба должна отдавать. Контракт это не формальность: по нему проверяют работу и пишут тесты.

| Метод | Путь | Код | Тип ответа | Назначение |
|---|---|---|---|---|
| `GET` | `/` | `200` | `text/html` | Страница с описанием службы |
| `GET` | `/health.json` | `200` | `application/json` | Состояние, узел, время работы |
| `GET` | `/api/services` | `200` | `application/json` | Каталог сетевых служб |
| `GET` | `/missing` | `404` | `application/json` | Ошибка для неизвестного пути |
| `HEAD` | `/health.json` | `200` | без тела | Проверка заголовков |

JSON здоровья должен содержать поля `service`, `status`, `host`, `uptime_s` и `time_utc`. JSON каталога должен содержать `service`, `count` и `items`. Эти поля нужны, чтобы проверка была однозначной: глазом видно, что служба не просто вернула пустую страницу.

### Шаг 3. Напишите код службы

Создайте файл `/srv/uifis-web/app.py`:

```bash
sudo tee /srv/uifis-web/app.py >/dev/null <<'PY'
#!/usr/bin/env python3
"""UIFIS training service catalog."""

import html
import json
import os
import socket
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

SERVICE = "uifis-web"
HOST = os.environ.get("UIFIS_HOST", "0.0.0.0")
PORT = int(os.environ.get("UIFIS_PORT", "8080"))
STARTED = time.monotonic()

SERVICES = [
    {
        "name": "dns",
        "port": 53,
        "protocol": "udp/tcp",
        "state": "ok",
        "detail": "portal.uifis.test -> 10.0.0.15",
    },
    {
        "name": "dhcp",
        "port": "67/68",
        "protocol": "udp",
        "state": "ok",
        "detail": "10.0.0.104 / 24 h",
    },
    {
        "name": "http",
        "port": "80/443",
        "protocol": "tcp",
        "state": "ok",
        "detail": "GET /health.json -> 200",
    },
    {
        "name": "ntp",
        "port": 123,
        "protocol": "udp",
        "state": "ok",
        "detail": "+0.004 s",
    },
]


class Handler(BaseHTTPRequestHandler):
    server_version = "UIFIS/1.0"

    def _send(self, status, body, content_type="application/json; charset=utf-8", head_only=False):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if not head_only:
            self.wfile.write(data)

    def _health(self):
        return {
            "service": SERVICE,
            "status": "ok",
            "host": socket.gethostname(),
            "uptime_s": round(time.monotonic() - STARTED, 1),
            "time_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }

    def _index(self):
        rows = "".join(
            f"<tr><td>{html.escape(str(item['name']))}</td>"
            f"<td>{html.escape(str(item['port']))}</td>"
            f"<td>{html.escape(str(item['detail']))}</td></tr>"
            for item in SERVICES
        )
        return f"""<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>UIFIS service catalog</title></head>
<body>
  <h1>Учебный каталог сетевых служб</h1>
  <p>Служба {html.escape(SERVICE)} на узле {html.escape(socket.gethostname())}.</p>
  <table border="1" cellpadding="6">
    <tr><th>Служба</th><th>Порт</th><th>Ответ</th></tr>
    {rows}
  </table>
  <p>Проверка: <a href="/health.json">/health.json</a> и
     <a href="/api/services">/api/services</a>.</p>
</body>
</html>"""

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/":
            self._send(200, self._index(), "text/html; charset=utf-8")
        elif path == "/health.json":
            self._send(200, json.dumps(self._health(), ensure_ascii=False))
        elif path == "/api/services":
            payload = {"service": SERVICE, "count": len(SERVICES), "items": SERVICES}
            self._send(200, json.dumps(payload, ensure_ascii=False))
        else:
            payload = {"error": "not_found", "path": path}
            self._send(404, json.dumps(payload, ensure_ascii=False))

    def do_HEAD(self):
        path = urlparse(self.path).path
        if path in ("/", "/health.json", "/api/services"):
            self._send(200, b"", "text/plain; charset=utf-8", head_only=True)
        else:
            self._send(404, b"", "text/plain; charset=utf-8", head_only=True)

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} {fmt % args}", flush=True)


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.daemon_threads = True
    print(f"{SERVICE} listening on {HOST}:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
PY
```

Выдайте владельцу каталог и файл:

```bash
sudo chown -R uifis:uifis /srv/uifis-web
sudo chmod 0640 /srv/uifis-web/app.py
ls -l /srv/uifis-web
```

Проверьте синтаксис до запуска:

```bash
sudo -u uifis python3 -m py_compile /srv/uifis-web/app.py
```

Команда не должна выводить ошибок. Если появился traceback, исправьте строку, на которую он указывает, и повторите проверку.

### Шаг 4. Проверьте службу вручную

Сначала запустите службу вручную на loopback, чтобы увидеть её до оформления unit:

```bash
sudo -u uifis env UIFIS_HOST=127.0.0.1 UIFIS_PORT=8080 python3 /srv/uifis-web/app.py
```

В другом окне SSH проверьте ответы:

```bash
curl -i http://127.0.0.1:8080/
curl -i http://127.0.0.1:8080/health.json
curl -i http://127.0.0.1:8080/api/services
curl -i http://127.0.0.1:8080/missing
```

Ожидаемые результаты: `200 OK` и HTML для главной, `200 OK` и JSON для здоровья и каталога, `404 Not Found` и JSON ошибки для неизвестного пути. Остановите ручной сервер сочетанием `Ctrl+C`.

Проверьте, кто слушает порт, пока служба запущена:

```bash
sudo ss -tulpn | grep 8080
```

В ручном режиме вы увидите `127.0.0.1:8080`. Это нормально для локальной проверки, но с хоста такой сокет недоступен. Для проброса нужен адрес `0.0.0.0:8080` или адрес гостевого интерфейса.

> [!PITFALL] Локальная проверка не равна внешней
> `curl` на `127.0.0.1` проверяет только сам гость. Если служба слушает loopback, запрос с хоста не дойдёт даже при правильном пробросе. Адрес прослушивания и проброс проверяют отдельно.

### Шаг 5. Оформите systemd-юнит

Создайте файл службы:

```bash
sudo nano /etc/systemd/system/uifis-web.service
```

Содержимое:

```ini
[Unit]
Description=UIFIS training service catalog
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=uifis
Group=uifis
WorkingDirectory=/srv/uifis-web
Environment=UIFIS_HOST=0.0.0.0
Environment=UIFIS_PORT=8080
ExecStart=/usr/bin/python3 /srv/uifis-web/app.py
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Проверьте и запустите:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now uifis-web
systemctl status uifis-web --no-pager
```

Ожидаемый результат: `active (running)` и `enabled`. Проверьте ответы снова:

```bash
curl -i http://127.0.0.1:8080/health.json
curl -i http://127.0.0.1:8080/api/services
sudo ss -tulpn | grep 8080
```

Теперь в `ss` должен быть `0.0.0.0:8080`. Посмотрите журнал:

```bash
journalctl -u uifis-web -n 30 --no-pager
```

В журнале видно строку запуска и записи о запросах. Перезапустите службу и убедитесь, что она поднимается сама:

```bash
sudo systemctl restart uifis-web
systemctl is-active uifis-web
curl -s http://127.0.0.1:8080/health.json
```

Поле `uptime_s` после перезапуска начинается заново. Это простой признак того, что вы смотрите на новый процесс, а не на старый ответ из кэша.

Перед проверкой выведите фамилию и группу командой `echo "Фамилия И.О., группа"` в том же окне. Приложите скриншот, на котором видны эта строка, вывод `systemctl status uifis-web` и `ss -tulpn` с адресом `0.0.0.0:8080`.

### Шаг 6. Настройте firewall

Сначала посмотрите текущее состояние:

```bash
sudo ufw status verbose
```

Если firewall неактивен, разрешите SSH, затем порт службы только для сети NAT:

```bash
sudo ufw allow 22/tcp
sudo ufw allow from 10.0.2.0/24 to any port 8080 proto tcp
sudo ufw enable
sudo ufw status verbose
```

Если firewall уже активен, добавьте только правило для `8080`. Не открывайте порт всему миру: в учебном стенде достаточно сети `10.0.2.0/24`, из которой приходит проброс VirtualBox.

Проверьте, что SSH не потерян. Не закрывая текущую сессию, откройте второе окно и подключитесь снова:

```powershell
ssh -p 2222 student@127.0.0.1
```

Только после успешного входа продолжайте. Если SSH не открывается, вернитесь в текущую сессию и проверьте `sudo ufw status verbose`.

### Шаг 7. Настройте проброс порта в VirtualBox

Выключите виртуальную машину. В VirtualBox откройте **Настройки → Сеть → Адаптер 1 → Дополнительно → Проброс портов** и добавьте правило:

| Имя | Протокол | Адрес хоста | Порт хоста | Адрес гостя | Порт гостя |
|---|---|---|---|---|---|
| web | TCP | 127.0.0.1 | 8080 | (оставьте пустым) | 8080 |

Правило SSH на порт `2222` должно остаться. Запустите машину и проверьте службу с рабочего компьютера в PowerShell:

```powershell
curl.exe -i http://127.0.0.1:8080/health.json
curl.exe -i http://127.0.0.1:8080/api/services
Invoke-RestMethod http://127.0.0.1:8080/health.json
```

Ожидаемый результат: JSON с `"status": "ok"` и каталог из четырёх служб. Если подключение не открывается, проверьте по порядку:

1. Служба запущена и активна.
2. `ss` показывает `0.0.0.0:8080`, а не `127.0.0.1:8080`.
3. UFW разрешает `8080/tcp` из `10.0.2.0/24`.
4. Проброс ведёт с порта хоста `8080` на порт гостя `8080`.
5. Порт `8080` на хосте не занят другим приложением.

Проверить занятость порта на хосте можно так:

```powershell
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
```

Приложите скриншот ответа `curl.exe` с рабочего компьютера и правила проброса портов в VirtualBox.

### Шаг 8. Разберите отказы и восстановление

Проверьте не только успешный запуск, но и то, как служба выглядит при поломке. Для каждого отказа фиксируйте симптом, проверку, причину и восстановление.

#### Отказ 1. Служба остановлена

```bash
sudo systemctl stop uifis-web
```

С хоста запросите `/health.json`. Зафиксируйте результат: отказ соединения или тайм-аут. Затем запустите службу:

```bash
sudo systemctl start uifis-web
curl -i http://127.0.0.1:8080/health.json
journalctl -u uifis-web -n 20 --no-pager
```

#### Отказ 2. Служба слушает только loopback

Измените адрес в unit:

```bash
sudo nano /etc/systemd/system/uifis-web.service
```

Замените строку:

```ini
Environment=UIFIS_HOST=0.0.0.0
```

на:

```ini
Environment=UIFIS_HOST=127.0.0.1
```

Примените изменения:

```bash
sudo systemctl daemon-reload
sudo systemctl restart uifis-web
sudo ss -tulpn | grep 8080
curl -i http://127.0.0.1:8080/health.json
```

Локально служба отвечает, а с хоста соединение не открывается. Верните `0.0.0.0`, перезапустите службу и проверьте с хоста снова.

#### Отказ 3. Порт закрыт firewall

Посмотрите правила:

```bash
sudo ufw status numbered
```

Удалите правило для `8080` по его номеру. В примере удаляется правило 3, подставьте номер из своего вывода:

```bash
sudo ufw delete 3
```

Локальная проверка продолжает работать, а с хоста соединение зависает или отклоняется. Верните правило:

```bash
sudo ufw allow from 10.0.2.0/24 to any port 8080 proto tcp
sudo ufw status verbose
```

#### Отказ 4. Проброс ведёт на другой порт

Выключите машину и измените порт гостя в правиле проброса с `8080` на `8081`. Запустите машину и проверьте `http://127.0.0.1:8080/health.json`. Хост получает отказ, хотя внутри гостя служба работает. Верните порт `8080` и проверьте снова.

#### Отказ 5. Файл службы недоступен

Временно переименуйте файл:

```bash
sudo mv /srv/uifis-web/app.py /srv/uifis-web/app.py.bak
sudo systemctl restart uifis-web
systemctl status uifis-web --no-pager
journalctl -u uifis-web -n 30 --no-pager
```

Служба завершится с ошибкой, в журнале будет traceback о том, что файл не найден. Верните файл:

```bash
sudo mv /srv/uifis-web/app.py.bak /srv/uifis-web/app.py
sudo systemctl restart uifis-web
```

> [!NOTE] Состояние `active` не всегда значит «работает»
> Если процесс запущен, но приложение не может открыть файл, подключиться к базе или ответить на нужный endpoint, systemd может показывать `active`. Поэтому проверяют не только статус unit, но и прикладной ответ.

### Шаг 9. Заполните чек-лист

| Проверка | Команда | Ожидаемый результат | Факт |
|---|---|---|---|
| Каталог | `ls -ld /srv/uifis-web` | владелец `uifis`, права `0750` |  |
| Файл | `ls -l /srv/uifis-web/app.py` | владелец `uifis`, права `0640` |  |
| Синтаксис | `sudo -u uifis python3 -m py_compile /srv/uifis-web/app.py` | без ошибок |  |
| Служба | `systemctl status uifis-web` | `active (running)` |  |
| Автозапуск | `systemctl is-enabled uifis-web` | `enabled` |  |
| Порт | `ss -tulpn \| grep 8080` | слушает `0.0.0.0:8080` |  |
| Главная | `curl -i http://127.0.0.1:8080/` | `200 OK`, HTML |  |
| Здоровье | `curl -i http://127.0.0.1:8080/health.json` | `200 OK`, `"status":"ok"` |  |
| Каталог API | `curl -i http://127.0.0.1:8080/api/services` | `count` равно 4 |  |
| Ошибка | `curl -i http://127.0.0.1:8080/missing` | `404 Not Found` |  |
| Журнал | `journalctl -u uifis-web -n 30 --no-pager` | строки запуска и запросов |  |
| Firewall | `sudo ufw status verbose` | разрешён `8080/tcp` из `10.0.2.0/24` |  |
| Проброс порта | VirtualBox → Проброс портов | TCP `8080` на `8080` |  |
| С хоста | `curl.exe -i http://127.0.0.1:8080/health.json` | JSON получен |  |
| Отказ | `systemctl stop uifis-web` | служба не отвечает |  |
| Восстановление | `systemctl start uifis-web` | снова `200 OK` |  |

### Шаг 10. Оформите отчёт

В отчёт включите:

1. Схему стенда: виртуальная машина, NAT, проброс порта, служба.
2. Контракт службы из шага 2.
3. Файл `uifis-web.service` или его содержимое.
4. Скриншоты: статус службы, вывод `ss`, ответы `curl`, ответ с хоста.
5. Таблицу отказов: симптом, проверка, причина, восстановление.
6. Вывод: какая зависимость оказалась критичной для доступа к службе.

Приложите скриншот ответов `/`, `/health.json` и `/api/services` из гостя и с хоста. Скриншот контракта или текста unit не нужен: они переносятся в отчёт текстом. Скриншот самого документа тоже не нужен: отчёт сдаётся файлом DOCX.

### Шаг 11. Сохраните и сдайте работу

Проверьте, что служба активна и включена в автозапуск, а после перезапуска отвечает на все endpoint. Сохраните отчёт в DOCX.

## Что сдать

- файл отчёта в DOCX со схемой стенда, контрактом, чек-листом и таблицей отказов;
- заполненный чек-лист службы в CSV или в таблице отчёта;
- скриншоты статуса службы, порта, ответов `curl` и ответа с хоста;
- краткий устный ответ на один контрольный вопрос по выбору преподавателя.

## Критерии оценки

- **5**: служба работает через systemd, включена в автозапуск, все endpoint отвечают, проверены локальный доступ и доступ с хоста, разобраны минимум три отказа, отчёт и чек-лист заполнены.
- **4**: служба работает, но есть неточности в правах, firewall, пробросе или объяснении одного отказа.
- **3**: служба запущена вручную, systemd или проверка с хоста выполнены частично, отказы описаны поверхностно.

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Почему ручной запуск `python3 app.py` не считается полноценным развёртыванием?
2. Зачем службе отдельный пользователь `uifis` и права `0640` на файл?
3. Что проверять, если служба активна, но с хоста не открывается?
4. Чем `0.0.0.0:8080` отличается от `127.0.0.1:8080`?
5. Почему `systemctl status` не заменяет проверку `/health.json`?

</div>
