---
title: Практика 7. Экспорт
dek: "Выгрузка в CSV и JSON проверяется обратной загрузкой, сверкой числа строк и контрольными суммами."
chapter: "Практика 7"
minutes: 90
level: СПО
glyph: П7
outcomes:
  - Выгружать таблицу и выборку в CSV и JSON
  - Снимать схему базы через pg_dump
  - Проверять кодировку и отсутствие BOM в файлах обмена
  - Сверять выгрузку по числу строк и контрольным суммам
---

## Цель работы

Файл выгрузки считается готовым не тогда, когда команда завершилась без ошибки, а тогда, когда данные из него загружаются обратно и совпадают с источником. Ошибка в кавычках, разделителе или кодировке обнаруживается только на приёмной стороне, часто через несколько дней.

Цель работы: выгрузить учебную базу `dean` в файлы обмена и проверить каждый файл обратной загрузкой. Вы сделаете CSV с заголовком, JSON Lines через `row_to_json`, схему через `pg_dump --schema-only`, затем загрузите файлы во временные таблицы и сравните число строк и контрольные суммы. Итог работы это скрипт экспорта, файлы обмена и заполненная таблица сверки.

## Оборудование и программное обеспечение

- Персональный компьютер с VirtualBox и учебной Ubuntu Server.
- PostgreSQL 16 в виртуальной машине, база `dean` с учебными данными.
- Роль `dean_owner` с правом чтения всех таблиц базы.
- Клиент `psql` версии 16 и утилиты `pg_dump`, `createdb`.
- Утилиты `file`, `iconv`, `od`, `diff` из базового набора Ubuntu.
- Текстовый редактор и табличный редактор для отчёта.
- Каталог `~/export` для файлов и скриптов.

## Краткие теоретические сведения

**Формат обмена** выбирают по приёмной стороне. CSV понимают табличные редакторы, бухгалтерские программы и почти любая система импорта. JSON удобен, когда данные вложенные: студент вместе со списком курсов не раскладывается в плоскую таблицу без потерь. Схема базы в виде SQL-файла нужна, чтобы развернуть структуру на новом месте.

**CSV** это текст с разделителем, кавычками и заголовком. Заголовок включается опцией `HEADER`, разделитель задаётся `DELIMITER`, кавычки и переводы строк экранируются по правилам RFC 4180. Значение с запятой или кавычкой обязано быть в кавычках, иначе приёмная сторона сдвинет столбцы.

**`COPY` и `\copy`.** Серверная команда `COPY ... TO ...` пишет файл на стороне сервера и требует прав на каталог. Мета-команда `\copy` пишет файл на машине клиента, поэтому в учебной базе используется она. Синтаксис опций одинаков: `WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')`.

**`row_to_json`** превращает строку запроса в JSON-объект. Если вызвать его для каждой строки и писать по объекту на строку, получается JSON Lines: тот же формат, который разбирался при импорте. Вложенный массив курсов собирается через `json_agg` и `json_build_object` в подзапросе.

**`pg_dump --schema-only`** выгружает только определения объектов: таблицы, ограничения, индексы, последовательности, представления. Данные в файл не попадают. Опции `--no-owner` и `--no-privileges` убирают привязку к конкретным ролям, чтобы файл разворачивался на другой машине.

**Контрольная сумма** это короткий отпечаток содержимого. `md5` от строки, собранной из всех значимых столбцов в стабильном порядке, меняется при любом расхождении. Сумма не заменяет построчное сравнение, но быстро показывает, что файл дошёл без потерь и искажений.

**Временная таблица для сверки**: загрузка обратно в рабочую таблицу рискует испортить данные или упереться в уникальность. Временная таблица повторяет структуру источника, живёт до конца сессии и удаляется сама. Конструкция `LIKE groups INCLUDING DEFAULTS` копирует столбцы и значения по умолчанию, но не ограничения и не индексы: для проверки содержимого этого достаточно.

**Кодировка.** PostgreSQL хранит текст в UTF-8, если база создана с `ENCODING 'UTF8'`. Файл без BOM открывается в Excel с испорченной кириллицей, поэтому для обмена с табличным редактором либо добавляют BOM, либо импортируют через мастер «Данные из текста». Для обмена с другой СУБД BOM только мешает.

## Ход работы

### Шаг 1. Подготовьте каталог и проверьте кодировку

```bash
mkdir -p ~/export && cd ~/export
psql -h 127.0.0.1 -p 5432 -U dean_owner -d dean -c "SHOW server_encoding;"
```

Внутри `psql` проверьте кодировку клиента.

```sql
\echo 'Иванов И.И., ИС-41'
\encoding
```

Оба значения должны быть `UTF8`. Если клиент показывает другую кодировку, задайте её через `\encoding UTF8` или переменную окружения `PGCLIENTENCODING=UTF8`. Расхождение кодировок сервера и клиента даёт ошибку преобразования уже на первой кириллической фамилии.

### Шаг 2. Выгрузите группы в CSV

Запрос в скобках задаёт столбцы и порядок строк. Без скобок `COPY` берёт таблицу целиком и не даёт отсортировать результат.

```sql
\echo 'Иванов И.И., ИС-41'
\copy (SELECT id, name, specialty FROM groups ORDER BY id)
  TO 'groups.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
```

`psql` ответит `COPY 3`. Серверный вариант той же операции выглядит так и выполняется от имени `postgres`, потому что файл пишет сервер.

```sql
COPY (SELECT id, name, specialty FROM groups ORDER BY id)
  TO '/tmp/groups.csv' WITH (FORMAT csv, HEADER true);
```

### Шаг 3. Выгрузите студентов с названием группы

Плоская таблица не хранит связь, поэтому название группы добавляется соединением. Приёмной стороне не нужен идентификатор, ей нужно читаемое значение. `LEFT JOIN` оставляет студента без группы: пропуск строки исказил бы число записей сильнее, чем пустое поле.

```sql
\copy (
  SELECT s.id, s.full_name, g.name AS group_name, s.email, s.created_at
  FROM students s
  LEFT JOIN groups g ON g.id = s.group_id
  ORDER BY s.id
) TO 'students.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
```

### Шаг 4. Выгрузите JSON через row_to_json

Один объект на строку это JSON Lines. Вложенный массив курсов сохраняет связь, которую CSV теряет.

```sql
\copy (
  SELECT row_to_json(t)
  FROM (
    SELECT s.id,
           s.full_name,
           g.name AS group_name,
           s.email,
           (
             SELECT json_agg(json_build_object('course', c.title, 'grade', e.grade)
                             ORDER BY c.title)
             FROM enrollments e
             JOIN courses c ON c.id = e.course_id
             WHERE e.student_id = s.id
           ) AS courses
    FROM students s
    LEFT JOIN groups g ON g.id = s.group_id
    ORDER BY s.id
  ) t
) TO 'students.jsonl';
```

### Шаг 5. Снимите схему через pg_dump

```bash
pg_dump -h 127.0.0.1 -p 5432 -U dean_owner -d dean \
  --schema-only --no-owner --no-privileges -f schema.sql
```

Проверьте, что в файле есть таблицы и ограничения, но нет `INSERT`.

```bash
grep -c 'CREATE TABLE' schema.sql
grep -c 'INSERT INTO' schema.sql || true
```

Первая команда покажет число таблиц, вторая должна показать 0. Если `INSERT` нашлись, значит опция `--schema-only` не применилась.

### Шаг 6. Проверьте файлы и кодировку

```bash
printf 'Иванов И.И., ИС-41\n'
head -n 3 groups.csv
file -i groups.csv students.csv students.jsonl schema.sql
iconv -f UTF-8 -t UTF-8 groups.csv > /dev/null && echo 'UTF-8 ok'
od -An -tx1 -N3 groups.csv
```

`file -i` должен показать `charset=utf-8`. Команда `iconv` завершается без ошибки, если файл действительно в UTF-8. `od` показывает первые три байта: `ef bb bf` означают BOM, которого в файле для СУБД быть не должно.

Приложите скриншот `head` и `file -i`: на нём видно заголовок CSV, разделитель и кодировку. Скриншот пустого каталога доказательством не является.

### Шаг 7. Загрузите CSV обратно во временные таблицы

Временная таблица живёт до конца сессии и не мешает рабочим данным.

```sql
CREATE TEMP TABLE tmp_groups (LIKE groups INCLUDING DEFAULTS);
\copy tmp_groups (id, name, specialty) FROM 'groups.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
SELECT count(*) AS loaded_groups FROM tmp_groups;
```

```sql
CREATE TEMP TABLE tmp_students (
  id int, full_name text, group_name text, email text, created_at timestamptz
);
\copy tmp_students FROM 'students.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
SELECT count(*) AS loaded_students FROM tmp_students;
```

### Шаг 8. Сверьте число строк и контрольные суммы

Сначала сравните количество.

```sql
SELECT (SELECT count(*) FROM groups) AS source_groups,
       (SELECT count(*) FROM tmp_groups) AS loaded_groups,
       (SELECT count(*) FROM students) AS source_students,
       (SELECT count(*) FROM tmp_students) AS loaded_students;
```

Затем сравните содержимое. Строка собирается из значимых столбцов в одном порядке, поэтому любое расхождение меняет `md5`.

```sql
SELECT md5(string_agg(id::text || '|' || name || '|' || specialty, E'\n' ORDER BY id)) AS source_md5
FROM groups;

SELECT md5(string_agg(id::text || '|' || name || '|' || specialty, E'\n' ORDER BY id)) AS loaded_md5
FROM tmp_groups;
```

```sql
SELECT md5(string_agg(s.id::text || '|' || s.full_name || '|' || coalesce(g.name, '') || '|' || s.email,
                      E'\n' ORDER BY s.id)) AS source_md5
FROM students s LEFT JOIN groups g ON g.id = s.group_id;

SELECT md5(string_agg(id::text || '|' || full_name || '|' || coalesce(group_name, '') || '|' || email,
                      E'\n' ORDER BY id)) AS loaded_md5
FROM tmp_students;
```

Суммы должны совпасть. Если число строк совпало, а сумма нет, ищите разницу в кавычках, пробелах или кодировке.

| Объект | Строк в источнике | Строк после загрузки | md5 источника | md5 загрузки | Вывод |
|---|---|---|---|---|---|
| groups | | | | | |
| students | | | | | |
| students.jsonl | | | | | |

### Шаг 9. Загрузите JSON обратно

```sql
CREATE TEMP TABLE tmp_students_json (data jsonb);
\copy tmp_students_json (data) FROM 'students.jsonl'
SELECT count(*) AS json_lines FROM tmp_students_json;
```

Проверьте, что каждый адрес из файла находится в основной таблице, а массивы курсов не потерялись.

```sql
SELECT count(*) AS missing_students
FROM tmp_students_json j
LEFT JOIN students s ON s.email = j.data->>'email'
WHERE s.id IS NULL;

SELECT count(*) AS students_with_courses
FROM tmp_students_json
WHERE jsonb_array_length(data->'courses') > 0;
```

Первое число должно быть нулевым. Второе показывает, у скольких студентов есть хотя бы один курс, и служит проверкой вложенного массива.

### Шаг 10. Разверните схему в отдельной базе

Пустая база исключает влияние старых объектов.

```bash
dropdb -h 127.0.0.1 -p 5432 -U dean_owner --if-exists dean_check
createdb -h 127.0.0.1 -p 5432 -U dean_owner dean_check
psql -h 127.0.0.1 -p 5432 -U dean_owner -d dean_check -v ON_ERROR_STOP=1 -f schema.sql
```

Сравните список таблиц с исходной базой.

```bash
psql -h 127.0.0.1 -U dean_owner -d dean -Atc \
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1" > tables_src.txt
psql -h 127.0.0.1 -U dean_owner -d dean_check -Atc \
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1" > tables_new.txt
diff tables_src.txt tables_new.txt && echo 'схема совпадает'
```

`ON_ERROR_STOP=1` останавливает выполнение на первой ошибке. Без него `psql` продолжит работу и создаст половину схемы, а отчёт покажет успешный код возврата.

Если `diff` показал расхождение, сравните не только имена таблиц, но и ограничения: `pg_dump --schema-only` выгружает их отдельными командами `ALTER TABLE`. Пустой список таблиц в новой базе чаще всего означает, что файл схемы не создался из-за ошибки прав или прерванного выполнения.

### Требования к отчёту

Приложите скриншоты вывода `\copy` с числом строк, `head` и `file -i` для файла, обратной загрузки во временную таблицу и итогового запроса счётчиков и сумм. В первой строке каждого вывода должна стоять подпись с фамилией и группой: в `psql` её печатает `\echo`, в оболочке `printf`. Скриншоты шапки отчёта и текста теории не нужны.

## Что сдать

- Скрипт экспорта с командами `\copy`, `row_to_json` и `pg_dump`.
- Файлы `groups.csv`, `students.csv`, `students.jsonl`, `schema.sql`.
- Таблицу сверки с числом строк и контрольными суммами.
- Результат развёртывания схемы в отдельной базе и сравнение списка таблиц.
- Скриншоты `\copy`, файла, обратной загрузки и счётчиков.

## Критерии оценки

| Критерий | Баллы | Что проверяется |
|---|---|---|
| Выгрузка | 25 | CSV и JSON содержат нужные столбцы, заголовок и порядок строк |
| Кодировка | 15 | UTF-8 подтверждена, BOM отсутствует |
| Обратная загрузка | 25 | Файлы читаются без ошибок и дают те же строки |
| Сверка | 20 | Число строк и контрольные суммы совпадают |
| Схема и отчёт | 15 | `pg_dump` разворачивается, таблица сверки заполнена |

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Чем серверный `COPY` отличается от `\copy` и когда нужен каждый?
2. Зачем в `\copy` запрос заключается в скобки?
3. Почему для вложенного списка курсов выбран JSON, а не CSV?
4. Что произойдёт с файлом CSV, если значение содержит запятую и не заключено в кавычки?
5. Почему совпадения числа строк недостаточно для вывода о корректной выгрузке?
6. Зачем нужны опции `--no-owner` и `--no-privileges` в `pg_dump`?
7. Чем мешает BOM при загрузке CSV в PostgreSQL и когда он полезен?

</div>
