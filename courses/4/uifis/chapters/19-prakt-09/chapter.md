---
title: Развёртывание базовой сетевой службы
dek: "Соберите учебную веб-службу в Ubuntu Server: каталог, HTTP-ответ, systemd-юнит, firewall и проброс порта в VirtualBox."
chapter: "Практика 9"
minutes: 90
level: СПО
glyph: П9
outcomes:
  - Развернуть сетевую службу в виртуальной машине
  - Оформить запуск через systemd
  - Открыть порт и проверить службу с хоста
  - Проверить отказ и восстановление службы
---

## Что делаем

В лекции 10 мы разобрали сетевые службы: DNS, DHCP, HTTP, файловые, почтовые и NTP. Теперь развернём свою небольшую службу, которая отдаёт данные по HTTP. Это учебный веб-сервер на Python: он показывает, из чего состоит развёртывание, но не заменяет production-сервер.

Результат работы: работающая служба `uifis-web`, которая запускается через systemd, открывает порт `8080`, отдаёт страницу и JSON, переживает перезапуск и проверяется с рабочего компьютера через проброс порта в VirtualBox.

> [!NOTE] Что считается готовым результатом
> Служба `uifis-web` активна, отвечает на `http://127.0.0.1:8080/` и `/health.json`, включена в автозапуск, журнал доступен, а в отчёте есть скриншоты и заполненный чек-лист.

<div class="files"><b class="label">Материалы к работе</b>
<a href="reports/UIFIS_practice-9_report-template.docx" download>Шаблон отчёта в DOCX</a>
<a href="reports/UIFIS_practice-9_service-checklist.csv" download>Чек-лист службы в CSV</a>
<p>Заполняйте шаблон по ходу работы. В чек-лист вносите фактические результаты проверок.</p>
</div>

## Подготовка

Используйте виртуальную машину `uifis-srv01` из практики 6. В ней уже есть Ubuntu Server, пользователь `student`, SSH на порту `2222` и проброс порта в VirtualBox.

Проверьте подключение с рабочего компьютера в PowerShell:

```powershell
ssh -p 2222 student@127.0.0.1
```

Внутри машины проверьте, что доступны Python и systemd:

```bash
python3 --version
systemctl --version
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

Права `0750` означают: владелец читает, пишет и заходит; группа читает и заходит; остальные не имеют доступа.

## Задание 1. Содержимое службы

Создайте страницу `index.html`:

```bash
sudo tee /srv/uifis-web/index.html >/dev/null <<'HTML'
<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>UIFIS service</title></head>
<body>
  <h1>Учебная служба UIFIS</h1>
  <p>Виртуальная машина uifis-srv01</p>
</body>
</html>
HTML
```

Создайте файл проверки `health.json`:

```bash
sudo tee /srv/uifis-web/health.json >/dev/null <<'JSON'
{"service":"uifis-web","status":"ok","host":"uifis-srv01"}
JSON
```

Выдайте владельцу каталог и файлы:

```bash
sudo chown -R uifis:uifis /srv/uifis-web
ls -l /srv/uifis-web
```

> [!PITFALL] Файлы от root
> Если файлы принадлежат `root`, служба под пользователем `uifis` может их прочитать, но не сможет обновить. Для учебного стенда владелец должен быть `uifis`.

## Задание 2. Ручная проверка

Запустите HTTP-сервер вручную, чтобы увидеть службу до оформления юнита:

```bash
python3 -m http.server 8080 --bind 0.0.0.0 --directory /srv/uifis-web
```

В другом окне SSH или в самой машине проверьте:

```bash
curl -i http://127.0.0.1:8080/
curl -i http://127.0.0.1:8080/health.json
```

Ожидаемый результат: код `200 OK`, HTML-страница и JSON с полем `"status":"ok"`. Остановите ручной сервер сочетанием `Ctrl+C`.

Если порт занят, проверьте, кто его слушает:

```bash
sudo ss -tulpn | grep 8080
```

## Задание 3. Systemd-юнит

Создайте файл службы:

```bash
sudo nano /etc/systemd/system/uifis-web.service
```

Содержимое:

```ini
[Unit]
Description=UIFIS training web service
After=network.target

[Service]
Type=simple
User=uifis
Group=uifis
WorkingDirectory=/srv/uifis-web
ExecStart=/usr/bin/python3 -m http.server 8080 --bind 0.0.0.0 --directory /srv/uifis-web
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Проверьте и запустите:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now uifis-web
systemctl status uifis-web --no-pager
```

Ожидаемый результат: `active (running)`, служба включена в автозапуск. Проверьте ответы снова:

```bash
curl -i http://127.0.0.1:8080/health.json
```

## Задание 4. Firewall

Разрешите только нужный порт:

```bash
sudo ufw allow 8080/tcp
sudo ufw status verbose
```

Не отключайте firewall и не открывайте весь диапазон портов. Для учебной службы достаточно одного правила TCP `8080`.

## Задание 5. Проброс порта в VirtualBox

Выключите виртуальную машину. В VirtualBox откройте **Настройки → Сеть → Адаптер 1 → Дополнительно → Проброс портов** и добавьте правило:

| Имя | Протокол | Адрес хоста | Порт хоста | Адрес гостя | Порт гостя |
|---|---|---|---|---|---|
| web | TCP | 127.0.0.1 | 8080 | (оставьте пустым) | 8080 |

Запустите машину и проверьте службу с рабочего компьютера в PowerShell:

```powershell
Invoke-WebRequest http://127.0.0.1:8080/health.json | Select-Object -ExpandProperty Content
curl.exe -i http://127.0.0.1:8080/
```

Ожидаемый результат: JSON с `"status":"ok"` и HTML-страница. Если подключение не открывается, проверьте, что служба запущена, порт слушается на `0.0.0.0`, правило проброса сохранено.

## Задание 6. Отказ и восстановление

Остановите службу:

```bash
sudo systemctl stop uifis-web
systemctl status uifis-web --no-pager
```

С рабочего компьютера запросите `/health.json`. Зафиксируйте фактический результат: отказ соединения или ошибка. Затем запустите службу:

```bash
sudo systemctl start uifis-web
curl -i http://127.0.0.1:8080/health.json
```

Посмотрите журнал:

```bash
journalctl -u uifis-web -n 30 --no-pager
```

В отчёте объясните, чем отличается остановленная служба от службы, которая слушает не тот порт.

## Задание 7. Проверка и отчёт

Заполните чек-лист:

| Проверка | Команда | Ожидаемый результат | Факт |
|---|---|---|---|
| Каталог | `ls -ld /srv/uifis-web` | владелец `uifis`, права `0750` |  |
| Служба | `systemctl status uifis-web` | `active (running)` |  |
| Автозапуск | `systemctl is-enabled uifis-web` | `enabled` |  |
| Порт | `ss -tulpn \| grep 8080` | слушает `0.0.0.0:8080` |  |
| Локальный JSON | `curl -i http://127.0.0.1:8080/health.json` | `200 OK`, `"status":"ok"` |  |
| Firewall | `sudo ufw status verbose` | разрешён только `8080/tcp` |  |
| Проброс порта | VirtualBox → Проброс портов | TCP `8080 → 8080` |  |
| С хоста | `Invoke-WebRequest http://127.0.0.1:8080/health.json` | JSON получен |  |
| Отказ | `systemctl stop uifis-web` | служба не отвечает |  |
| Восстановление | `systemctl start uifis-web` | снова `200 OK` |  |

В отчёт включите:

1. Схему стенда: виртуальная машина, NAT, проброс порта, служба.
2. Файл `uifis-web.service` или его содержимое.
3. Скриншоты: статус службы, вывод `ss`, ответ `curl`, ответ с хоста.
4. Результат отказа и восстановления.
5. Вывод: какая зависимость оказалась критичной для доступа к службе.

## Контрольные вопросы

1. Почему ручной запуск `python3 -m http.server` не считается полноценным развёртыванием?
2. Зачем службе отдельный пользователь `uifis`?
3. Что проверять, если служба активна, но с хоста не открывается?
4. Почему недостаточно открыть порт в приложении, не проверив firewall?
5. Чем проброс порта в VirtualBox удобнее изменения настроек хоста?

## Критерии оценки

- **5**: служба работает через systemd, включена в автозапуск, проверена локально и с хоста, отказ и восстановление описаны, отчёт заполнен.
- **4**: служба работает, но есть неточности в правах, firewall или объяснении проверок.
- **3**: служба запущена вручную, systemd или проверка с хоста выполнены частично.
