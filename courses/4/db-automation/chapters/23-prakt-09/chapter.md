---
title: Практика 9. Планировщик; Мониторинг
dek: "Ставим обслуживание «Деканата» на расписание и превращаем метрики PostgreSQL в отчёт наблюдений с порогами."
chapter: "Практика 9"
minutes: 180
level: СПО
glyph: П9
outcomes:
  - Ставить скрипт обслуживания в systemd timer или cron
  - Проверять срабатывание задания по журналу и коду возврата
  - Собирать метрики соединений, размера, WAL и запросов
  - Задавать пороги и оформлять отчёт наблюдений
---

## Цель работы

Обслуживание, которое держится на памяти администратора, рано или поздно пропускается. Задание, которое никто не проверял, может месяцами завершаться ошибкой, и узнают об этом только при сбое. Цель работы: поставить скрипт обслуживания учебной базы «Деканат» в планировщик, доказать его срабатывание и собрать наблюдения за состоянием базы.

На выходе получаются три артефакта: скрипт с журналом и кодом возврата, задание планировщика с доказательством запуска и отчёт наблюдений с порогами.

## Оборудование и программное обеспечение

- Персональный компьютер с VirtualBox и учебной виртуальной машиной Ubuntu Server.
- PostgreSQL 16 в гостевой системе, доступ `sudo` внутри машины.
- Клиент `psql`, утилиты `systemctl`, `journalctl`, служба `cron`.
- Текстовый редактор для скриптов и табличный редактор для отчёта.
- Учебная база `dean` с таблицами `students`, `enrollments`, `payments`.

## Краткие теоретические сведения

### Планировщик и его признаки

Планировщик запускает команду в заданный момент, но не гарантирует, что команда завершилась успешно. Поэтому у задания есть расписание, учётная запись с минимальными правами, журнал и код возврата. Хорошее задание можно запустить вручную, и оно даст тот же результат, что и по расписанию.

В Ubuntu доступны два инструмента. systemd timer связан со службой, пишет вывод в journald, умеет догонять пропущенный запуск и разносить старт по времени. cron проще: строка в файле `/etc/cron.d` задаёт поля расписания, пользователя и команду, а вывод уходит в почту или в перенаправленный файл.

| Свойство | systemd timer | cron |
|---|---|---|
| Где задаётся | Пара файлов `.service` и `.timer` | Файл в `/etc/cron.d` или `crontab -e` |
| Журнал | `journalctl -u` | Почта, файл через перенаправление |
| Пропущенный запуск | `Persistent=true` | Не догоняет |
| Зависимости | `After=postgresql.service` | Нет |
| Проверка расписания | `systemctl list-timers` | Чтение файла расписания |

### Метрики состояния базы

Метрика это число, снятое в момент времени. Разовый замер ничего не говорит: смысл появляется при сравнении снимков и с порогом. В PostgreSQL основные источники метрик это системные представления и файлы WAL.

| Метрика | Источник | Что показывает | Пример порога |
|---|---|---|---|
| Число сессий | `pg_stat_activity` | Занятость соединений | Больше 80 процентов от `max_connections` |
| Долгий запрос | `pg_stat_activity` | Запрос, который держит ресурсы | Дольше 60 секунд |
| Попадание в кэш | `pg_stat_database` | Доля чтений из буферов | Ниже 95 процентов |
| Мёртвые строки | `pg_stat_user_tables` | Работа autovacuum | Больше 10 процентов живых строк |
| Размер базы | `pg_database_size` | Рост данных | Прирост больше 20 процентов за сутки |
| Объём WAL | `pg_stat_wal` | Интенсивность записи | Выход за среднее втрое |
| Время запросов | `pg_stat_statements` | Самые дорогие запросы | Среднее выше 200 мс |

### Порог, оповещение и наблюдение

Порог без реакции бесполезен. У каждого порога есть владелец и действие: проверить блокировки, увеличить память, запустить vacuum, разобрать запрос. Наблюдение отличается от разового замера тем, что хранит серию снимков и заканчивается выводом, а не набором чисел.

## Ход работы

### Шаг 1. Подготовьте скрипт обслуживания

Создайте каталоги и таблицу запусков. SQL выполняйте через `sudo -u postgres psql -d dean`, чтобы владелец совпадал с учётной записью службы. Скрипт будет писать строку в журнал и в таблицу, чтобы факт запуска сохранился даже при смене файла журнала.

```sql
CREATE TABLE IF NOT EXISTS maintenance_runs (
  id bigserial PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  script text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok', 'failed')),
  note text
);
```

Разместите скрипт `/opt/dean/bin/maintenance.sh`. Он выполняет `VACUUM (ANALYZE)` по трём таблицам, пишет итог в журнал и возвращает код возврата.

```bash
#!/usr/bin/env bash
set -uo pipefail

DB=dean
LOG=/var/log/dean/maintenance.log
STAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "$STAMP start $DB" >> "$LOG"

if psql -d "$DB" -v ON_ERROR_STOP=1 -q \
     -c "VACUUM (ANALYZE) students, enrollments, payments;" >> "$LOG" 2>&1; then
  STATUS=ok
else
  STATUS=failed
fi

if ! psql -d "$DB" -q -c \
  "INSERT INTO maintenance_runs(script, status) VALUES ('maintenance.sh', '$STATUS');" \
  >> "$LOG" 2>&1; then
  STATUS=failed
fi
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) finish $STATUS" >> "$LOG"
[ "$STATUS" = "ok" ]
```

Выдайте права: владелец `root`, каталог журнала принадлежит `postgres`. Скрипт запускается от имени `postgres`, поэтому пароль в нём не нужен: работает локальное доверие через сокет.

```bash
sudo mkdir -p /opt/dean/bin /var/log/dean
sudo chown postgres:postgres /var/log/dean
sudo chmod 750 /var/log/dean
sudo chown root:root /opt/dean/bin/maintenance.sh
sudo chmod 755 /opt/dean/bin/maintenance.sh
```

Каждый скриншот доказывает конкретную проверку. Первой строкой вывода печатайте фамилию и группу, чтобы кадр нельзя было перепутать с чужим. В оболочке это `echo "Иванов И.И., ИС-41"`, в `psql` строка `SELECT 'Иванов И.И., ИС-41' AS student;`.

### Шаг 2. Проверьте ручной запуск

Запустите скрипт и посмотрите код возврата, журнал и таблицу запусков.

```bash
sudo -u postgres /opt/dean/bin/maintenance.sh
echo "exit code: $?"
sudo tail -n 10 /var/log/dean/maintenance.log
sudo -u postgres psql -d dean -c "SELECT id, started_at, status FROM maintenance_runs ORDER BY id DESC LIMIT 5;"
```

Приложите скриншот журнала и строки таблицы. Нулевой код возврата и строка `ok` означают, что задание готово к расписанию.

### Шаг 3. Поставьте задание в планировщик

Создайте службу и таймер. Служба запускается один раз и завершается, поэтому тип `oneshot`.

```ini
# /etc/systemd/system/dean-maintenance.service
[Unit]
Description=Dean database maintenance
After=postgresql.service

[Service]
Type=oneshot
User=postgres
ExecStart=/opt/dean/bin/maintenance.sh
```

```ini
# /etc/systemd/system/dean-maintenance.timer
[Unit]
Description=Nightly dean maintenance

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true
RandomizedDelaySec=120

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable dean-maintenance.timer
sudo systemctl start dean-maintenance.timer
systemctl list-timers dean-maintenance.timer
```

Вместо таймера допустим cron. Строка в `/etc/cron.d/dean-maintenance` делает то же самое и тоже годится как артефакт.

```bash
30 3 * * * postgres /opt/dean/bin/maintenance.sh >> /var/log/dean/cron.log 2>&1
```

Приложите скриншот файлов unit или строки crontab.

### Шаг 4. Докажите срабатывание по расписанию

Однократный запуск службы не доказывает, что работает таймер. Временно поставьте расписание на короткий интервал, перезагрузите конфигурацию и дождитесь срабатывания.

```bash
sudo sed -i 's|OnCalendar=.*|OnCalendar=*:0/2|' /etc/systemd/system/dean-maintenance.timer
sudo systemctl daemon-reload
sudo systemctl restart dean-maintenance.timer
systemctl list-timers dean-maintenance.timer
sudo journalctl -u dean-maintenance.service -n 20 -o cat
```

Скриншот `list-timers` показывает время следующего запуска, скриншот журнала показывает запись о запуске. После проверки верните расписание и перезагрузите таймер.

```bash
sudo sed -i 's|OnCalendar=.*|OnCalendar=*-*-* 03:30:00|' /etc/systemd/system/dean-maintenance.timer
sudo systemctl daemon-reload
sudo systemctl restart dean-maintenance.timer
```

Для cron доказательством служит строка в `/var/log/dean/cron.log` с временем.

### Шаг 5. Включите сбор статистики запросов

Расширение `pg_stat_statements` требует загрузки библиотеки при старте сервера.

```sql
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
```

Перезапустите кластер и создайте расширение.

```bash
sudo systemctl restart postgresql
sudo -u postgres psql -d dean -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
```

```sql
SHOW shared_preload_libraries;
SELECT count(*) AS tracked_queries FROM pg_stat_statements;
```

### Шаг 6. Снимите метрики

Выполните запросы по соединениям, базе, таблицам, размеру и WAL. Каждый результат сохраняйте: это исходные данные отчёта.

```sql
SELECT state, count(*) AS sessions
FROM pg_stat_activity
WHERE datname = 'dean'
GROUP BY state
ORDER BY sessions DESC;

SELECT pid, usename, state, now() - query_start AS running, left(query, 60) AS query
FROM pg_stat_activity
WHERE datname = 'dean' AND state <> 'idle'
ORDER BY query_start
LIMIT 5;
```

```sql
SELECT datname, numbackends, xact_commit, xact_rollback, deadlocks,
       round(100.0 * blks_hit / nullif(blks_hit + blks_read, 0), 2) AS cache_hit_pct
FROM pg_stat_database
WHERE datname = 'dean';

SELECT relname, n_live_tup, n_dead_tup, seq_scan, idx_scan, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

```sql
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;
SELECT wal_records, pg_size_pretty(wal_bytes) AS wal_bytes, stats_reset FROM pg_stat_wal;

SELECT calls, round(total_exec_time::numeric, 2) AS total_ms,
       round(mean_exec_time::numeric, 2) AS mean_ms, rows, left(query, 70) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

Приложите скриншоты метрик. В кадре должны быть видны значения, а не только заголовки столбцов.

### Шаг 7. Сохраните серию снимков

Создайте таблицу снимков и скрипт `/opt/dean/bin/metrics.sh`, который складывает в неё ключевые числа. Один снимок это точка, два снимка уже показывают изменение.

```sql
CREATE TABLE IF NOT EXISTS monitor_snapshots (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  metric text NOT NULL,
  value numeric NOT NULL
);
```

```bash
#!/usr/bin/env bash
set -euo pipefail

psql -d dean -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO monitor_snapshots(metric, value)
SELECT 'db_size_bytes', pg_database_size(current_database());
INSERT INTO monitor_snapshots(metric, value)
SELECT 'sessions', count(*) FROM pg_stat_activity WHERE datname = 'dean';
INSERT INTO monitor_snapshots(metric, value)
SELECT 'wal_bytes', wal_bytes::numeric FROM pg_stat_wal;
INSERT INTO monitor_snapshots(metric, value)
SELECT 'dead_tup', coalesce(sum(n_dead_tup), 0) FROM pg_stat_user_tables;
SQL
```

Запустите скрипт от имени `postgres`, выполните несколько изменений в `enrollments`, запустите снова и сравните снимки.

```bash
sudo -u postgres bash /opt/dean/bin/metrics.sh
sudo -u postgres bash /opt/dean/bin/metrics.sh
```

```sql
SELECT metric, min(value) AS first_value, max(value) AS last_value,
       max(value) - min(value) AS delta
FROM monitor_snapshots
GROUP BY metric
ORDER BY metric;
```

### Шаг 8. Задайте пороги и реакции

Заполните таблицу порогов под свою базу. Порог без действия не считается настроенным.

| Метрика | Порог | Как проверить | Действие при выходе |
|---|---|---|---|
| Сессии | Больше 80 процентов от `max_connections` | `pg_stat_activity` | Найти источник соединений, проверить пул |
| Долгий запрос | Дольше 60 секунд | `pg_stat_activity` | Разобрать план, проверить блокировки |
| Кэш | Ниже 95 процентов | `pg_stat_database` | Проверить `shared_buffers` и рабочий набор |
| Мёртвые строки | Больше 10 процентов | `pg_stat_user_tables` | Проверить autovacuum, выполнить `VACUUM` |
| Размер базы | Прирост больше 20 процентов за сутки | `pg_database_size` | Найти таблицу роста, проверить архивирование |
| Время запроса | Среднее выше 200 мс | `pg_stat_statements` | Переписать запрос или добавить индекс |

### Шаг 9. Смоделируйте инцидент

Откройте вторую сессию и запустите долгий запрос. В первой сессии найдите его по `pg_stat_activity` и зафиксируйте, что порог нарушен.

```sql
SELECT pg_sleep(90);
```

```sql
SELECT pid, usename, state, now() - query_start AS running, left(query, 50) AS query
FROM pg_stat_activity
WHERE datname = 'dean' AND state = 'active'
ORDER BY query_start;
```

Приложите скриншот: в нём видно, что запрос активен дольше порога. Остановите его командой `SELECT pg_cancel_backend(<pid>);` и объясните в отчёте, почему выбрали отмену, а не завершение сессии.

### Шаг 10. Оформите отчёт наблюдений

Сведите наблюдения в таблицу. В столбце «Статус» пишите «в норме» или «порог нарушен», в столбце «Действие» описывайте следующий шаг.

| Метрика | Значение | Порог | Статус | Действие | Источник |
|---|---|---|---|---|---|
| Сессии |  |  |  |  | `pg_stat_activity` |
| Долгий запрос |  |  |  |  | `pg_stat_activity` |
| Кэш |  |  |  |  | `pg_stat_database` |
| Мёртвые строки |  |  |  |  | `pg_stat_user_tables` |
| Размер базы |  |  |  |  | `pg_database_size` |
| WAL |  |  |  |  | `pg_stat_wal` |
| Время запроса |  |  |  |  | `pg_stat_statements` |

### Требования к отчёту

Соберите отчёт из цели, схемы расписания, скрипта, доказательств запуска, таблицы порогов, отчёта наблюдений и вывода. Укажите, какое задание вы выбрали, systemd timer или cron, и почему. Перечислите, что осталось вне наблюдения: например, место на диске и репликация, если они не настроены.

Скриншоты шапки отчёта, текста теории и пустых окон не нужны. Доказательством служат только кадры с выводом команд и запросов.

## Что сдать

1. Скрипт `maintenance.sh` с журналом, кодом возврата и записью в `maintenance_runs`.
2. Файлы unit или строку crontab, поставленные в систему.
3. Скриншоты `systemctl list-timers`, журнала запуска и метрик.
4. Скрипт `metrics.sh` и таблицу `monitor_snapshots` с двумя сериями.
5. Таблицу порогов и отчёт наблюдений с выводом.

## Критерии оценки

| Критерий | Баллы | Что проверяется |
|---|---|---|
| Задание планировщика | 20 | Расписание, права, unit или cron, задание установлено |
| Журнал и код возврата | 20 | Запуск подтверждён журналом и таблицей, сбой виден |
| Метрики | 20 | Сняты соединения, размер, WAL, таблицы и запросы |
| Пороги и реакции | 20 | У каждого порога есть проверка и действие |
| Отчёт наблюдений | 15 | Таблица заполнена, вывод опирается на значения |
| Оформление | 5 | Скриншоты подписаны, команды воспроизводимы |
| **Итого** | **100** | Зачёт от 60 баллов |

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Чем systemd timer удобнее cron при обслуживании базы и в чём cron проще?
2. Почему код возврата скрипта важен для планировщика?
3. Какие метрики показывают нехватку памяти, а какие рост данных?
4. Почему порог без описанного действия не считается настроенным?
5. Чем разовый замер отличается от наблюдения и зачем хранить серию снимков?

</div>
