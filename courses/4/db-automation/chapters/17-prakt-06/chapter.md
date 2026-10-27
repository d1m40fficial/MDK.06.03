---
title: Практика 6. Импорт JSON
dek: "Чужой JSON проходит через промежуточную таблицу, проверку типов и загрузку в связанные таблицы без ручного ввода."
chapter: "Практика 6"
minutes: 90
level: СПО
glyph: П6
outcomes:
  - Разбирать JSON на таблицы и связи
  - Загружать данные скриптом через промежуточную таблицу
  - Проверять типы, обязательные поля и оценки до записи в основные таблицы
  - Сверять число строк источника, загрузки и отказов
---

## Цель работы

Данные приходят из чужой системы, и доверять им нельзя. В одном файле встречаются пропущенный адрес почты, несуществующая группа и оценка, записанная словом. Если грузить такой файл прямо в `students`, одна плохая строка остановит весь импорт или создаст строку без связи.

Цель работы: провести JSON от файла до связанных таблиц `groups`, `students` и `enrollments` через промежуточную таблицу `staging.raw_students`. Вы загрузите JSON Lines через `\copy`, проверите типы и обязательные поля запросом, отправите ошибочные строки в отдельную таблицу и сверите число строк на каждом шаге. Итог работы это скрипт импорта, таблица отказов и отчёт о сверке.

## Оборудование и программное обеспечение

- Персональный компьютер с VirtualBox и учебной Ubuntu Server.
- PostgreSQL 16 в виртуальной машине, база `dean` со схемой `public`.
- Роль `dean_owner` с правом создания схемы и таблиц.
- Клиент `psql` версии 16.
- Файл `students.jsonl` в кодировке UTF-8, подготовленный по заданию преподавателя.
- Текстовый редактор и табличный редактор для отчёта.
- Каталог `~/import` для файла и SQL-скриптов.

## Краткие теоретические сведения

**JSON** это текстовый формат с объектами, массивами, строками, числами, логическими значениями и `null`. В PostgreSQL есть два типа: `json` хранит текст как есть, а `jsonb` разбирает его при записи и хранит в двоичном виде. Для импорта нужен `jsonb`: по нему работают индексы, операторы `->` и `->>` и функции разбора.

**JSON Lines** это файл, где каждая строка является самостоятельным JSON-документом. Такой формат удобен для пакетной загрузки: одна строка соответствует одной записи, а файл можно читать потоком. Обычный многострочный JSON пришлось бы сначала разобрать целиком.

**`\copy` и `COPY`.** Серверная команда `COPY` читает файл на стороне сервера и требует прав суперпользователя или роли `pg_read_server_files`. Мета-команда `\copy` выполняется клиентом `psql`: файл читается на машине студента, а строки отправляются на сервер. Для учебной базы используется `\copy`, потому что она не требует особых прав и работает с домашним каталогом.

**Кодировка.** Файл обмена должен быть в UTF-8 без BOM. BOM в начале файла превращается в невидимый символ и ломает первый JSON-объект, а файл в Windows-1251 даёт ошибку разбора или испорченные фамилии. Кодировку проверяют командой `file -i` до загрузки, а не после появления странных символов в отчёте.

**Промежуточная таблица** принимает данные без ограничений и служит буфером между файлом и схемой. В неё грузят всё, что прочиталось, затем проверяют, а в основные таблицы переносят только корректные строки. Так ошибка источника не ломает связи и не оставляет базу в полусобранном состоянии.

**Разбор JSON.** Оператор `->` возвращает `jsonb`, оператор `->>` возвращает текст. Функция `jsonb_typeof` сообщает тип значения, `jsonb_array_elements` разворачивает массив, а `jsonb_to_recordset` превращает массив объектов в строки с заданными столбцами и типами. Проверка обязательного поля это сравнение `jsonb_typeof(data->'email')` с `'string'`, а не проверка на `null`.

**Идемпотентность загрузки.** Повторный запуск не должен создавать дубли. Для групп работает `ON CONFLICT (name) DO NOTHING`, для студентов `ON CONFLICT (email) DO NOTHING`, для записей на курсы `ON CONFLICT (student_id, course_id) DO NOTHING`.

## Ход работы

### Шаг 1. Подготовьте файл и рабочую папку

Создайте каталог и файл с девятью строками. Три строки намеренно испорчены: неизвестная группа, отсутствующий адрес почты и оценка словом. Девятая строка повторяет адрес почты первой.

```bash
mkdir -p ~/import && cd ~/import
cat > students.jsonl <<'EOF'
{"group":"ИС-41","specialty":"09.02.07","full_name":"Абрамов Пётр Ильич","email":"abramov@example.edu","courses":[{"title":"Базы данных","grade":5},{"title":"Операционные системы","grade":4}]}
{"group":"ИС-41","specialty":"09.02.07","full_name":"Белова Анна Сергеевна","email":"belova@example.edu","courses":[{"title":"Базы данных","grade":4}]}
{"group":"ИС-42","specialty":"09.02.07","full_name":"Власов Игорь Олегович","email":"vlasov@example.edu","courses":[{"title":"Базы данных","grade":3},{"title":"Веб-технологии","grade":5}]}
{"group":"ИС-42","specialty":"09.02.07","full_name":"Гусева Мария Павловна","email":"guseva@example.edu","courses":[{"title":"Операционные системы","grade":5}]}
{"group":"ИС-41","specialty":"09.02.07","full_name":"Дёмин Олег Викторович","email":"demin@example.edu","courses":[]}
{"group":"ИС-43","specialty":"09.02.07","full_name":"Ежова Ольга Ильинична","email":"ezhova@example.edu","courses":[{"title":"Базы данных","grade":4}]}
{"group":"ИС-42","specialty":"09.02.07","full_name":"Жуков Артём Львович","courses":[{"title":"Базы данных","grade":4}]}
{"group":"ИС-41","specialty":"09.02.07","full_name":"Зайцева Вера Андреевна","email":"zaytseva@example.edu","courses":[{"title":"Базы данных","grade":"отлично"}]}
{"group":"ИС-41","specialty":"09.02.07","full_name":"Иванов Илья Петрович","email":"abramov@example.edu","courses":[]}
EOF
file -i students.jsonl
wc -l students.jsonl
```

Проверьте, что `file` показывает `charset=utf-8`, а `wc -l` показывает 9. Названия курсов сверьте с таблицей `courses` и при необходимости замените в файле.

```sql
SELECT title FROM courses ORDER BY title;
```

### Шаг 2. Создайте промежуточную таблицу

Схема `staging` отделяет буфер от рабочих таблиц. Идентификатор строки нужен, чтобы ссылаться на номер строки файла.

```sql
\echo 'Иванов И.И., ИС-41'
CREATE SCHEMA IF NOT EXISTS staging;
DROP TABLE IF EXISTS staging.raw_students;
CREATE TABLE staging.raw_students (
  id bigserial PRIMARY KEY,
  data jsonb NOT NULL,
  loaded_at timestamptz NOT NULL DEFAULT now()
);
```

### Шаг 3. Загрузите JSON Lines через \copy

```sql
\echo 'Иванов И.И., ИС-41'
\copy staging.raw_students (data) FROM 'students.jsonl'
SELECT count(*) AS loaded FROM staging.raw_students;
SELECT id, data->>'full_name' AS full_name FROM staging.raw_students ORDER BY id;
```

`psql` ответит `COPY 9`. Если строка не является корректным JSON, `\copy` отменит всю загрузку: команда атомарна. Синтаксис проверяют до импорта, а смысловые ошибки разбирают запросами после него.

### Шаг 4. Сверьте число строк с файлом

Сравните число строк файла и число строк буфера. Расхождение означает, что загрузка оборвалась или файл изменился между командами.

| Источник | Значение | Как получено |
|---|---|---|
| Строк в файле | 9 | `wc -l students.jsonl` |
| Строк в буфере | 9 | `SELECT count(*) FROM staging.raw_students` |
| Расхождение | 0 | Сравнение двух чисел |

### Шаг 5. Загрузите группы из тех же строк

Группы берутся из поля `group`, специальность из поля `specialty`. Повторяющиеся названия схлопываются, существующие не перезаписываются.

```sql
INSERT INTO groups (name, specialty)
SELECT DISTINCT ON (group_name) group_name, specialty
FROM (
  SELECT data->>'group' AS group_name,
         data->>'specialty' AS specialty
  FROM staging.raw_students
  WHERE jsonb_typeof(data->'group') = 'string'
    AND jsonb_typeof(data->'specialty') = 'string'
) s
ORDER BY group_name, specialty
ON CONFLICT (name) DO NOTHING;
```

Проверьте, что у одной группы нет двух разных специальностей.

```sql
SELECT group_name, count(DISTINCT specialty) AS variants
FROM (
  SELECT data->>'group' AS group_name, data->>'specialty' AS specialty
  FROM staging.raw_students
  WHERE jsonb_typeof(data->'group') = 'string'
) s
GROUP BY group_name
HAVING count(DISTINCT specialty) > 1;
```

Пустой результат означает согласованность источника. Если строки нашлись, специальность в файле противоречива, и выбирать одну из них молча нельзя.

### Шаг 6. Проверьте типы и обязательные поля

Проверка оформляется представлением, чтобы один и тот же набор правил использовали и просмотр, и загрузка.

```sql
CREATE OR REPLACE VIEW staging.v_students_checked AS
SELECT r.id,
       r.data,
       r.data->>'group'     AS group_name,
       r.data->>'full_name' AS full_name,
       r.data->>'email'     AS email,
       CASE
         WHEN jsonb_typeof(r.data->'courses') = 'array' THEN r.data->'courses'
         ELSE '[]'::jsonb
       END AS courses,
       CASE
         WHEN jsonb_typeof(r.data) <> 'object' THEN 'строка не объект'
         WHEN jsonb_typeof(r.data->'full_name') IS DISTINCT FROM 'string' THEN 'нет full_name'
         WHEN btrim(r.data->>'full_name') = '' THEN 'пустое full_name'
         WHEN jsonb_typeof(r.data->'email') IS DISTINCT FROM 'string' THEN 'нет email'
         WHEN r.data->>'email' !~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' THEN 'неверный email'
         WHEN jsonb_typeof(r.data->'group') IS DISTINCT FROM 'string' THEN 'нет group'
         WHEN g.id IS NULL THEN 'неизвестная группа'
         WHEN jsonb_typeof(r.data->'courses') IS DISTINCT FROM 'array' THEN 'courses не массив'
         WHEN EXISTS (
           SELECT 1
           FROM jsonb_array_elements(r.data->'courses') AS c
           WHERE jsonb_typeof(c->'title') IS DISTINCT FROM 'string'
              OR jsonb_typeof(c->'grade') IS DISTINCT FROM 'number'
              OR c->'grade' NOT BETWEEN '2'::jsonb AND '5'::jsonb
         ) THEN 'курс или оценка в неверном формате'
         ELSE NULL
       END AS reject_reason
FROM staging.raw_students r
LEFT JOIN groups g ON g.name = r.data->>'group';
```

Посмотрите, какие строки не пройдут проверку.

```sql
SELECT id, full_name, email, reject_reason
FROM staging.v_students_checked
WHERE reject_reason IS NOT NULL
ORDER BY id;
```

Ожидаются три строки: `Ежова` с неизвестной группой, `Жуков` без адреса почты и `Зайцева` с оценкой словом. Приложите скриншот этого запроса: он доказывает, что проверка работает, а не пропускает всё подряд.

### Шаг 7. Загрузите студентов

В основные таблицы попадают только строки без причины отказа. Повтор адреса почты отсекает ограничение уникальности.

```sql
INSERT INTO students (full_name, group_id, email)
SELECT v.full_name, g.id, v.email
FROM staging.v_students_checked v
JOIN groups g ON g.name = v.group_name
WHERE v.reject_reason IS NULL
ON CONFLICT (email) DO NOTHING;
```

`psql` покажет `INSERT 0 5`: из шести корректных строк одна повторяет существующий адрес. Перечислите пропущенные строки отдельно, чтобы разница не осталась необъяснённой.

```sql
SELECT v.id, v.email, 'адрес уже есть в students' AS reason
FROM staging.v_students_checked v
JOIN students s ON s.email = v.email
WHERE v.reject_reason IS NULL
ORDER BY v.id;
```

### Шаг 8. Загрузите оценки через jsonb_to_recordset

Массив `courses` разворачивается в строки с типизированными столбцами. `MATERIALIZED` заставляет сначала отобрать корректные строки, иначе функция разбора может получить оценку строкой.

```sql
WITH valid AS MATERIALIZED (
  SELECT * FROM staging.v_students_checked WHERE reject_reason IS NULL
)
INSERT INTO enrollments (student_id, course_id, grade)
SELECT s.id, c.id, e.grade
FROM valid v
JOIN students s ON s.email = v.email
CROSS JOIN LATERAL jsonb_to_recordset(v.courses) AS e(title text, grade int)
JOIN courses c ON c.title = e.title
ON CONFLICT (student_id, course_id) DO NOTHING;
```

Отдельно проверьте курсы, которых нет в справочнике: такие записи молча пропускаются соединением.

```sql
WITH valid AS MATERIALIZED (
  SELECT * FROM staging.v_students_checked WHERE reject_reason IS NULL
)
SELECT DISTINCT e.title
FROM valid v
CROSS JOIN LATERAL jsonb_to_recordset(v.courses) AS e(title text, grade int)
LEFT JOIN courses c ON c.title = e.title
WHERE c.id IS NULL
ORDER BY e.title;
```

### Шаг 9. Разберите ошибочные строки

Отказы сохраняются в отдельной таблице с номером строки источника и причиной. Это не журнал ошибок ради отчёта: по нему исправляют файл и повторяют загрузку.

```sql
DROP TABLE IF EXISTS staging.rejected_students;
CREATE TABLE staging.rejected_students AS
SELECT id AS source_line, data, reject_reason, now() AS checked_at
FROM staging.v_students_checked
WHERE reject_reason IS NOT NULL;

SELECT source_line, data->>'full_name' AS full_name, reject_reason
FROM staging.rejected_students
ORDER BY source_line;
```

Исправьте три строки в файле, очистите буфер и загрузите его заново.

```sql
TRUNCATE staging.raw_students RESTART IDENTITY;
\copy staging.raw_students (data) FROM 'students.jsonl'
```

Повторите шаги с 5 по 9. Повторный запуск не создаёт дублей: группы и студенты защищены `ON CONFLICT`. Сравните число отказов до и после исправления: оно должно стать нулевым.

Загрузку в основные таблицы выполняйте одной транзакцией: `BEGIN` перед шагом 5 и `COMMIT` после шага 8. Если проверка обнаружит расхождение, `ROLLBACK` вернёт базу к исходному состоянию, и повторять импорт придётся с чистого места, а не разбирать половину записанных строк.

### Шаг 10. Сверьте итоги

Один запрос собирает все числа, которые попадут в отчёт.

```sql
SELECT
  (SELECT count(*) FROM staging.raw_students) AS source_lines,
  (SELECT count(*) FROM staging.v_students_checked WHERE reject_reason IS NULL) AS valid_rows,
  (SELECT count(*) FROM staging.rejected_students) AS rejected_rows,
  (SELECT count(*) FROM groups) AS groups_total,
  (SELECT count(*) FROM students) AS students_total,
  (SELECT count(DISTINCT s.id) FROM students s
     JOIN staging.v_students_checked v ON v.email = s.email
    WHERE v.reject_reason IS NULL) AS students_loaded,
  (SELECT count(*) FROM enrollments) AS enrollments_total;
```

Заполните таблицу сверки. В последнем столбце объясните расхождение, если оно есть.

| Что сверяется | Источник | В базе | Расхождение | Вывод |
|---|---|---|---|---|
| Строки файла и буфера | 9 | | | |
| Корректные строки и загруженные студенты | | | | |
| Отклонённые строки и таблица отказов | 3 | | | |
| Группы из файла и таблица groups | 2 | | | |
| Оценки из массивов и таблица enrollments | | | | |

### Требования к отчёту

Приложите скриншоты вывода `\copy` с числом строк, запроса к буферу, запроса с ошибочными строками и итогового запроса счётчиков. В первой строке каждого вывода должна стоять подпись `\echo` с фамилией и группой. Скриншоты шапки отчёта, текста теории и пустых окон не нужны. Скрипт импорта оформите одним файлом с комментариями по шагам.

## Что сдать

- Файл `students.jsonl` с исправленными строками.
- SQL-скрипт импорта: схема `staging`, буфер, проверка, загрузка групп, студентов и оценок.
- Таблицу отказов с номером строки и причиной.
- Таблицу сверки числа строк по каждому шагу.
- Скриншоты `\copy`, проверки, ошибочной строки и итоговых счётчиков.

## Критерии оценки

| Критерий | Баллы | Что проверяется |
|---|---|---|
| Разбор структуры | 20 | Связи групп, студентов и оценок восстановлены верно |
| Проверка данных | 25 | Типы, обязательные поля и оценки проверены до загрузки |
| Обработка ошибок | 20 | Ошибочные строки сохранены с причиной, импорт не прерван |
| Повторный запуск | 15 | Второй запуск не создаёт дублей |
| Сверка и отчёт | 20 | Числа сходятся, расхождения объяснены |

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Чем `jsonb` отличается от `json` и почему для импорта выбран `jsonb`?
2. Почему `\copy` удобнее серверного `COPY` в учебной виртуальной машине?
3. Зачем нужна промежуточная таблица, если можно загрузить файл сразу в `students`?
4. Почему проверка `jsonb_typeof(data->'email') = 'string'` надёжнее проверки на `null`?
5. Что произойдёт с `\copy`, если одна строка файла содержит синтаксическую ошибку JSON?
6. Как `jsonb_to_recordset` превращает массив курсов в строки таблицы `enrollments`?
7. Почему повторный запуск импорта не создаёт дублей и какие ограничения это обеспечивают?

</div>
