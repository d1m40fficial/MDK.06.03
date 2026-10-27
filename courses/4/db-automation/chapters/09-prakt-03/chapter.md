---
title: Практика 3. Резервное копирование; Восстановление
dek: "Проверяем копию единственным честным способом: восстанавливаем «Деканат» на чистом месте и сверяем строки и контрольные суммы."
chapter: "Практика 3"
minutes: 180
level: СПО
glyph: П3
outcomes:
  - Делать логическую копию базы в пользовательском формате
  - Восстанавливать копию в отдельную базу и сверять данные
  - Делать физическую копию кластера с архивом WAL
  - Настраивать восстановление на момент времени и читать журнал
---

## Цель работы

Копия существует не тогда, когда появился файл, а тогда, когда из него получена работающая база с теми же данными. Цель работы: пройти оба пути копирования, логический и физический, восстановить «Деканат» на чистом месте и доказать совпадение данными, а не размером файла.

Вы делаете дамп `pg_dump -Fc`, восстанавливаете его в `dean_restore`, сверяете число строк и контрольные суммы, отдельно проверяете копию только схемы. Затем снимаете физическую копию `pg_basebackup`, включаете архив WAL и восстанавливаете кластер на отдельном порту до выбранного момента.

## Оборудование и программное обеспечение

- Виртуальная машина Ubuntu Server с PostgreSQL 16 и базой `dean` после практик 1 и 2.
- Не менее 3 ГБ свободного места под копии и распакованный кластер.
- Утилиты `pg_dump`, `pg_restore`, `pg_basebackup`, `pg_ctl`, `psql`.
- Права `sudo` и доступ к роли `postgres`.
- Табличный редактор для протокола восстановления.

## Краткие теоретические сведения

**Логическая копия** это набор команд SQL и данных, описывающих базу. `pg_dump` читает базу через обычное подключение и складывает результат в файл. Формат `custom` (`-Fc`) сжимает данные, хранит оглавление объектов и позволяет при восстановлении выбрать часть таблиц. Логическая копия переносима между версиями PostgreSQL и между разными операционными системами, но восстанавливается медленнее физической и не позволяет вернуться к моменту между копиями.

**Физическая копия** это файлы кластера вместе с журналом WAL. `pg_basebackup` копирует каталог данных и требует той же мажорной версии PostgreSQL и той же архитектуры. Такая копия быстро возвращает сервер к жизни, но не переносит базу на другую версию.

**Архив WAL** важен для восстановления на момент времени. При `archive_mode = on` сервер после заполнения сегмента вызывает `archive_command` и складывает сегмент в отдельный каталог. Без архива физическая копия возвращает только состояние на момент её снятия: изменения после копии потеряны.

**Восстановление на момент времени** (PITR) собирает кластер из физической копии и проигрывает архивные сегменты WAL до `recovery_target_time`. Файл `recovery.signal` сообщает серверу, что нужен режим восстановления, а `recovery_target_action = 'promote'` переводит его в обычную работу после достижения цели. Восстановление всегда идёт в отдельный каталог и на отдельный порт: рабочий кластер не трогают, пока копия не проверена.

**Проверка копии** опирается на две величины. Число строк отвечает, все ли записи на месте. Контрольная сумма `md5(string_agg(t::text, '' ORDER BY id))` отвечает, совпадает ли содержимое построчно. Сумму считают в одинаковых условиях: одна и та же временная зона сеанса, иначе `timestamptz` отобразится по-разному и сумма разойдётся без потери данных.

**RPO** это допустимый объём потерянных изменений, **RTO** допустимое время восстановления. Копия, которая восстанавливается дольше RTO, не годится.

## Ход работы

### Шаг 1. Зафиксируйте состояние базы

Создайте каталог для копий и выдайте права служебной роли.

```bash
echo "Иванов ИС-41"
sudo mkdir -p /var/backups/dean/wal
sudo chown -R postgres:postgres /var/backups/dean
df -h /var/backups
```

Дальше работайте в сеансе `psql` базы `dean` и начинайте каждый вывод строкой с фамилией и группой.

```bash
psql "host=127.0.0.1 dbname=dean user=dean_app"
```

Снимите число строк и контрольные суммы. Эти значения станут эталоном для сверки.

```sql
SELECT 'groups' AS tbl, count(*) FROM groups
UNION ALL SELECT 'students', count(*) FROM students
UNION ALL SELECT 'courses', count(*) FROM courses
UNION ALL SELECT 'enrollments', count(*) FROM enrollments
UNION ALL SELECT 'payments', count(*) FROM payments
UNION ALL SELECT 'audit_log', count(*) FROM audit_log
ORDER BY tbl;

SET TIME ZONE 'Europe/Moscow';

SELECT 'students' AS tbl, md5(string_agg(t::text, '' ORDER BY id)) AS checksum
FROM students t
UNION ALL
SELECT 'enrollments', md5(string_agg(t::text, '' ORDER BY id)) FROM enrollments t
UNION ALL
SELECT 'payments', md5(string_agg(t::text, '' ORDER BY id)) FROM payments t;
```

Запишите результаты в протокол.

### Шаг 2. Сделайте логическую копию

```bash
echo "Иванов ИС-41"
sudo -u postgres pg_dump -Fc -d dean -f /var/backups/dean/dean.dump
sudo -u postgres pg_dump --schema-only -d dean -f /var/backups/dean/dean_schema.sql
ls -lh /var/backups/dean
sudo -u postgres pg_restore -l /var/backups/dean/dean.dump | head -n 20
```

`-Fc` даёт сжатый файл с оглавлением. `pg_restore -l` показывает, что внутри: таблицы, последовательности, ограничения, владельцы. Если в списке нет нужной таблицы, копия неполная, и дальше идти нет смысла.

Сделайте скриншот вывода `pg_dump` и списка оглавления.

### Шаг 3. Восстановите копию в отдельную базу

```bash
echo "Иванов ИС-41"
sudo -u postgres createdb -O dean_owner dean_restore
sudo -u postgres pg_restore -d dean_restore --exit-on-error /var/backups/dean/dean.dump
```

Флаг `--exit-on-error` останавливает восстановление на первой ошибке: для проверки копии нужна уверенность, что прошло всё.

Сверьте данные в `dean_restore` теми же запросами, что на шаге 1.

```sql
\c dean_restore
SET TIME ZONE 'Europe/Moscow';

SELECT 'groups' AS tbl, count(*) FROM groups
UNION ALL SELECT 'students', count(*) FROM students
UNION ALL SELECT 'courses', count(*) FROM courses
UNION ALL SELECT 'enrollments', count(*) FROM enrollments
UNION ALL SELECT 'payments', count(*) FROM payments
UNION ALL SELECT 'audit_log', count(*) FROM audit_log
ORDER BY tbl;
```

Сделайте скриншот `pg_restore` и результата `SELECT count(*)`: числа должны совпасть с эталоном.

### Шаг 4. Проверьте копию только схемы

```bash
sudo -u postgres createdb -O dean_owner dean_schema
sudo -u postgres psql -d dean_schema -f /var/backups/dean/dean_schema.sql
sudo -u postgres psql -d dean_schema -c "\dt"
sudo -u postgres psql -d dean_schema -c "SELECT count(*) FROM students;"
```

Таблицы созданы, строк нет: `--schema-only` не выгружает данные. Такая копия нужна для развёртывания пустой структуры.

### Шаг 5. Включите архив WAL и снимите физическую копию

```bash
sudo -u postgres psql -c "ALTER SYSTEM SET archive_mode = on;"
sudo -u postgres psql -c "ALTER SYSTEM SET archive_command = 'test ! -f /var/backups/dean/wal/%f && cp %p /var/backups/dean/wal/%f';"
sudo systemctl restart postgresql
sudo -u postgres psql -c "SHOW archive_mode;"
sudo -u postgres psql -c "SELECT pg_switch_wal();"
```

`archive_mode` требует перезапуска, `archive_command` применяется без него. Команда архивации сначала проверяет, нет ли уже такого файла: повторная запись того же сегмента не должна затирать предыдущий.

```bash
echo "Иванов ИС-41"
sudo -u postgres pg_basebackup -D /var/backups/dean/base -Ft -z -P -X stream
ls -lh /var/backups/dean/base
```

`-Ft` упаковывает копию в tar, `-z` сжимает, `-X stream` передаёт WAL вместе с копией, `-P` показывает ход. Каталог назначения должен быть пустым.

Сделайте скриншот `pg_basebackup` с итоговой строкой о завершении.

### Шаг 6. Создайте точку восстановления и «аварию»

Запомните время до изменения, добавьте платёж, затем удалите записи и запомните время ошибки.

```sql
SELECT now() AS t_before;
INSERT INTO payments (student_id, amount) VALUES (5, 9000.00);
SELECT pg_sleep(5);
SELECT now() AS t_target;
SELECT pg_sleep(2);
SELECT now() AS t_error;
DELETE FROM enrollments WHERE course_id = 3;
```

`t_target` это момент между полезным изменением и ошибкой. Именно его вы подставите в настройку восстановления.

```bash
sudo -u postgres psql -c "SELECT pg_switch_wal();"
ls /var/backups/dean/wal | tail -n 5
```

### Шаг 7. Восстановите кластер на отдельном порту

```bash
sudo mkdir -p /var/lib/postgresql/16/pitr
sudo chown postgres:postgres /var/lib/postgresql/16/pitr
sudo -u postgres tar -xzf /var/backups/dean/base/base.tar.gz -C /var/lib/postgresql/16/pitr
sudo -u postgres mkdir -p /var/lib/postgresql/16/pitr/pg_wal
sudo -u postgres tar -xzf /var/backups/dean/base/pg_wal.tar.gz -C /var/lib/postgresql/16/pitr/pg_wal
```

Добавьте параметры восстановления в конец `postgresql.auto.conf`. Время подставьте своё, из `t_target`.

```bash
sudo -u postgres tee -a /var/lib/postgresql/16/pitr/postgresql.auto.conf <<'EOF'
restore_command = 'cp /var/backups/dean/wal/%f %p'
recovery_target_time = '2026-10-27 10:15:00+03'
recovery_target_action = 'promote'
EOF
sudo -u postgres touch /var/lib/postgresql/16/pitr/recovery.signal
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/16/pitr -l /tmp/pitr.log -o "-p 5433" start
```

Проверьте журнал и данные. В журнале должны быть строки о восстановлении и достижении согласованного состояния.

```bash
sudo grep -i -E "recovery|consistent" /tmp/pitr.log | tail -n 20
sudo -u postgres psql -p 5433 -d dean -c "SELECT count(*) FROM payments;"
sudo -u postgres psql -p 5433 -d dean -c "SELECT count(*) FROM enrollments WHERE course_id = 3;"
sudo -u postgres psql -p 5433 -d dean -c "SELECT pg_is_in_recovery();"
```

Ожидаемый результат: платёж на месте, удалённые записи о зачислении тоже на месте, `pg_is_in_recovery()` возвращает `false`. Остановите учебный кластер после проверки.

```bash
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/16/pitr stop
```

Сделайте скриншот журнала восстановления и результатов запросов.

### Шаг 8. Если PITR не поднялся, выполните учебную симуляцию

Если кластер на порту 5433 не стартует, разберите журнал, а затем выполните упрощённый вариант: восстановите дамп в `dean_pitr` и постройте срез данных на момент времени запросом.

```bash
sudo -u postgres createdb -O dean_owner dean_pitr
sudo -u postgres pg_restore -d dean_pitr /var/backups/dean/dean.dump
```

```sql
\c dean_pitr
SELECT count(*) FROM payments WHERE paid_at <= '2026-10-27 10:15:00+03';
```

Это срез таблицы, а не PITR. Логическое восстановление возвращает только состояние на момент дампа: оно не умеет отменять `DELETE`, не восстанавливает изменения схемы после копии и не возвращает значения последовательностей. PITR проигрывает журнал и потому возвращает базу целиком на выбранный момент. Разницу опишите в выводе.

### Шаг 9. Заполните протокол восстановления

| Проверка | Логическая копия | Физическая копия |
|---|---|---|
| Что копируется | Объекты и данные в виде команд | Файлы кластера и WAL |
| Формат и размер | `-Fc`, размер файла | tar.gz, размер каталога |
| Куда восстановлено | `dean_restore` | `/var/lib/postgresql/16/pitr`, порт 5433 |
| Время восстановления | Замер времени | Замер времени |
| Число строк совпало | Да или нет, по каждой таблице | Да или нет |
| Контрольная сумма совпала | Да или нет | Да или нет |
| Точка во времени | Не поддерживается | `recovery_target_time` |

Ниже добавьте таблицу сверки по каждой таблице: имя, строк в источнике, строк в копии, контрольная сумма источника, контрольная сумма копии, вывод.

### Требования к отчёту

Отчёт содержит скрипт копирования, протокол восстановления, таблицу сверки, скриншоты `pg_dump`, `pg_restore`, `SELECT count(*)`, `pg_basebackup` и журнала восстановления. В выводе укажите, какую копию вы выбрали бы для ежедневного расписания и почему, какие значения RPO и RTO получились в вашем стенде и что произойдёт с базой, если каталог WAL потеряется.

## Что сдать

- Скрипт создания логической и физической копии.
- Протокол восстановления логической копии с таблицей сверки строк и сумм.
- Результат восстановления на момент времени либо учебную симуляцию с объяснением разницы.
- Скриншоты `pg_dump`, `pg_restore`, `SELECT count(*)`, `pg_basebackup`, журнала восстановления.
- Вывод о выборе вида копии, RPO и RTO.

## Критерии оценки

| Критерий | Баллы | Что проверяется |
|---|---|---|
| Логическая копия | 20 | Дамп в формате `-Fc`, оглавление проверено, схема выгружена отдельно |
| Восстановление | 25 | Копия развёрнута в отдельную базу без ошибок |
| Сверка данных | 25 | Число строк и контрольные суммы совпали по каждой таблице |
| Физическая копия и PITR | 20 | `pg_basebackup` выполнен, архив WAL включён, восстановление на момент проверено |
| Протокол | 10 | Таблицы заполнены, разница видов копий объяснена |

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Почему факт создания файла копии не доказывает её пригодность?
2. Что произойдёт при восстановлении копии `-Fc` в базу PostgreSQL другой мажорной версии?
3. Зачем нужен `archive_command`, если физическая копия уже снята?
4. Почему контрольные суммы считают в одной временной зоне сеанса?
5. Чем учебный срез таблицы по времени отличается от восстановления на момент времени?

</div>
