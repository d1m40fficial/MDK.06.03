---
title: Практика 7. Экспорт
dek: "Выгрузка в CSV и JSON проверяется обратной загрузкой, сверкой числа строк и контрольными суммами."
chapter: "Практика 7"
minutes: 90
level: СПО
glyph: П7
outcomes:
  - Выгружать таблицу и выборку в CSV и JSON
  - Снимать схему базы через mysqldump
  - Проверять кодировку и отсутствие BOM в файлах обмена
  - Сверять выгрузку по числу строк и контрольным суммам
---

## Цель работы

Файл выгрузки готов не тогда, когда команда завершилась без ошибки, а тогда, когда данные из него загружаются обратно и совпадают с источником. Ошибка в кавычках, разделителе или кодировке обнаруживается только на приёмной стороне.

Цель работы: выгрузить базу `dean` в файлы обмена и проверить каждый файл обратной загрузкой. Вы сделаете CSV через phpMyAdmin и `INTO OUTFILE`, JSON через `JSON_OBJECT`, схему через `mysqldump`, затем загрузите файлы в таблицы проверки и сравните число строк и контрольные суммы.

## Оборудование и программное обеспечение

- Персональный компьютер с Windows 10, XAMPP 8.5.12 и запущенными Apache и MySQL.
- База `dean` в кодировке `utf8mb4` с учебными данными.
- phpMyAdmin по адресу `http://localhost/phpmyadmin`.
- Клиенты `mysql` и `mysqldump`.
- Пользователь `root` или `dean_app` с правом `SELECT` и привилегией `FILE`.
- PowerShell для проверки байтов файла.
- Каталог `.../dean/export` для файлов и скриптов.

## Краткие теоретические сведения

**Формат обмена** выбирают по приёмной стороне. CSV понимают табличные редакторы, бухгалтерские программы и почти любая система импорта. JSON удобен, когда данные вложенные: студент вместе со списком курсов не раскладывается в плоскую таблицу без потерь. Схема в виде SQL-файла нужна, чтобы развернуть структуру на новом месте.

**CSV** это текст с разделителем, кавычками и заголовком. Значение с запятой или кавычкой обязано быть в кавычках, иначе приёмная сторона сдвинет столбцы. Перевод строки внутри значения тоже требует кавычек, поэтому разбор CSV не сводится к делению строки по запятым.

**`INTO OUTFILE`** пишет файл на стороне сервера, то есть на том же компьютере, где работает MySQL из XAMPP. Команда требует привилегии `FILE` и каталога, разрешённого переменной `secure_file_priv`. Если файл уже существует, сервер вернёт ошибку 1086: старую выгрузку удаляют до запуска.

**phpMyAdmin Export** выполняет ту же работу через браузер: формат CSV, разделитель, кавычки, кодировка `utf-8` и строка с именами столбцов. Этот путь удобен для небольшой таблицы и не требует привилегии `FILE`, но повторять его вручную на каждой выгрузке неудобно.

**`mysqldump --no-data`** выгружает только определения объектов: таблицы, ограничения, индексы, представления и триггеры. Данные в файл не попадают. Опции `--routines` и `--triggers` добавляют процедуры и триггеры, `--default-character-set=utf8mb4` сохраняет кириллицу.

**Контрольная сумма** это короткий отпечаток содержимого. `MD5` от строки, собранной из всех значимых столбцов в стабильном порядке, меняется при любом расхождении. В MySQL строку собирает `GROUP_CONCAT`, но её длина ограничена параметром `group_concat_max_len`: без увеличения сумма считается по обрезанным данным и молча врёт.

**Кодировка.** Файл без BOM открывается в Excel с испорченной кириллицей, поэтому для обмена с табличным редактором BOM добавляют, а для загрузки в СУБД его быть не должно. Проверяют байты до загрузки: `EF BB BF` в начале файла ломает первый столбец.

## Ход работы

### Шаг 1. Проверьте каталог, кодировку и разрешённый путь

```bat
mkdir .../dean/export
mysql -u root dean
```

```sql
SELECT 'Иванов И.И., ИС-41' AS student;
SHOW VARIABLES LIKE 'character_set_server';
SHOW VARIABLES LIKE 'secure_file_priv';
SELECT @@local_infile;
```

`character_set_server` должен быть `utf8mb4`. Значение `secure_file_priv` задаёт единственный каталог, куда сервер пишет файлы; пустое значение разрешает любой путь. Запишите его, он понадобится на шаге 3.

### Шаг 2. Выгрузите группы в CSV через phpMyAdmin

Откройте базу `dean`, таблицу `groups`, вкладку «Экспорт». Выберите формат CSV, разделитель `,`, кавычки `"`, кодировку `utf-8` и включите строку с именами столбцов. Сохраните файл как `groups_phpmyadmin.csv` в `.../dean/export`.

Приложите скриншот открытого файла: в нём видно заголовок `id,name,specialty` и кириллицу в названиях групп. Скриншот настроек экспорта без файла доказательством не является.

### Шаг 3. Выгрузите студентов через INTO OUTFILE

Запрос в скобках задаёт столбцы и порядок строк. Название группы добавляется соединением: приёмной стороне нужно читаемое значение, а не номер.

```sql
SELECT 'Иванов И.И., ИС-41' AS student;

SELECT s.id, s.full_name, g.name AS group_name, s.email, s.created_at
FROM students s
LEFT JOIN groups g ON g.id = s.group_id
ORDER BY s.id
INTO OUTFILE '.../dean/export/students.csv'
FIELDS TERMINATED BY ',' ENCLOSED BY '"'
LINES TERMINATED BY '\r\n';
```

Путь подставьте из `secure_file_priv`, если переменная не пуста. Ошибка 1086 означает, что файл уже есть: удалите его и повторите. Ошибка 1227 означает, что у пользователя нет привилегии `FILE`.

Заголовок `INTO OUTFILE` не пишет. Добавьте его отдельной командой.

```bat
cd /d .../dean/export
echo id,full_name,group_name,email,created_at> students_with_header.csv
type students.csv>> students_with_header.csv
```

`echo` пишет только ASCII-заголовок, а `type` добавляет байты файла без перекодирования. `Set-Content -Encoding utf8` в Windows PowerShell добавляет BOM, и первый столбец при загрузке получит лишний символ.

### Шаг 4. Выгрузите JSON

`JSON_OBJECT` собирает объект из столбцов, `JSON_ARRAYAGG` превращает список курсов в массив. В MariaDB вместо него используйте `CONCAT('[', GROUP_CONCAT(JSON_OBJECT('course', c.title, 'grade', e.grade)), ']')`.

```sql
SELECT JSON_OBJECT(
         'id', s.id,
         'full_name', s.full_name,
         'group_name', g.name,
         'courses', (
           SELECT JSON_ARRAYAGG(JSON_OBJECT('course', c.title, 'grade', e.grade))
           FROM enrollments e JOIN courses c ON c.id = e.course_id
           WHERE e.student_id = s.id
         )
       ) AS student_json
FROM students s
LEFT JOIN groups g ON g.id = s.group_id
ORDER BY s.id
INTO OUTFILE '.../dean/export/students.json';
```

Каждая строка файла это самостоятельный объект, то есть JSON Lines. Такой формат читается потоком и совпадает с тем, что разбирался при импорте.

### Шаг 5. Снимите схему через mysqldump

```bat
mysqldump -u root --no-data --routines --triggers ^
  --default-character-set=utf8mb4 --result-file=.../dean/export/schema.sql dean
```

Опция `--result-file` важна: перенаправление `>` в PowerShell пишет файл в UTF-16, и такой дамп не загрузится. Проверьте содержимое.

```bat
powershell -Command "Select-String -Path .../dean/export/schema.sql -Pattern 'CREATE TABLE' | Measure-Object"
powershell -Command "Select-String -Path .../dean/export/schema.sql -Pattern 'INSERT INTO' | Measure-Object"
```

Первая команда покажет число таблиц, вторая должна показать ноль. Если `INSERT` нашлись, опция `--no-data` не применилась.

### Шаг 6. Проверьте файлы и кодировку

```bat
powershell -Command "Get-Content .../dean/export/students.csv -TotalCount 3"
powershell -Command "[System.IO.File]::ReadAllBytes('.../dean/export/students.csv')[0..2]"
powershell -Command "Get-ChildItem .../dean/export | Select-Object Name, Length"
```

Байты `239 187 191` означают BOM: для загрузки в MySQL его нужно убрать. Размер файла не должен быть нулевым. Приложите скриншот первых строк файла и списка файлов с размерами.

### Шаг 7. Загрузите CSV обратно в таблицу проверки

Таблицы проверки создаются обычными, а не временными: временная живёт только в своей сессии, и phpMyAdmin её не увидит. Структура повторяет файл, а не источник: в выгрузке есть текстовая колонка `group_name`, которой в `students` нет.

```sql
USE dean;
DROP TABLE IF EXISTS chk_students_flat, chk_groups;

CREATE TABLE chk_students_flat (
  id INT, full_name VARCHAR(128), group_name VARCHAR(32),
  email VARCHAR(128), created_at TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOAD DATA LOCAL INFILE '.../dean/export/students_with_header.csv'
INTO TABLE chk_students_flat
FIELDS TERMINATED BY ',' ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES;

SELECT COUNT(*) AS loaded_students FROM chk_students_flat;
```

Для `LOAD DATA LOCAL INFILE` клиент запускают с ключом `--local-infile=1`, а сервер должен разрешать `local_infile`. Если политика XAMPP это запрещает, загрузите тот же файл через phpMyAdmin: вкладка «Импорт», формат CSV, разделитель `,`, первая строка содержит имена столбцов, таблица `chk_students_flat`. Так же загрузите `groups_phpmyadmin.csv` в `chk_groups`, созданную командой `CREATE TABLE chk_groups LIKE groups`. Результат должен совпасть.

### Шаг 8. Сверьте число строк и контрольные суммы

Сначала количество.

```sql
SELECT (SELECT COUNT(*) FROM students) AS source_students,
       (SELECT COUNT(*) FROM chk_students_flat) AS loaded_students,
       (SELECT COUNT(*) FROM groups) AS source_groups,
       (SELECT COUNT(*) FROM chk_groups) AS loaded_groups;
```

Затем содержимое. Строка собирается из значимых столбцов в одном порядке, поэтому любое расхождение меняет `MD5`.

```sql
SET SESSION group_concat_max_len = 1000000;

SELECT MD5(GROUP_CONCAT(CONCAT_WS('|', s.id, s.full_name, COALESCE(g.name, ''), s.email)
                        ORDER BY s.id SEPARATOR '\n')) AS source_md5
FROM students s LEFT JOIN groups g ON g.id = s.group_id;

SELECT MD5(GROUP_CONCAT(CONCAT_WS('|', id, full_name, COALESCE(group_name, ''), email)
                        ORDER BY id SEPARATOR '\n')) AS loaded_md5
FROM chk_students_flat;
```

Суммы должны совпасть. Если число строк совпало, а сумма нет, ищите разницу в кавычках, пробелах или кодировке.

| Объект | Строк в источнике | Строк после загрузки | md5 источника | md5 загрузки | Вывод |
|---|---|---|---|---|---|
| students | | | | | |
| groups | | | | | |
| students.json | | | | | |

### Шаг 9. Загрузите JSON обратно

```sql
DROP TABLE IF EXISTS chk_students_json;
CREATE TABLE chk_students_json (data JSON) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOAD DATA LOCAL INFILE '.../dean/export/students.json'
INTO TABLE chk_students_json
LINES TERMINATED BY '\n';

SELECT COUNT(*) AS json_lines FROM chk_students_json;
SELECT COUNT(*) AS without_courses
FROM chk_students_json
WHERE COALESCE(JSON_LENGTH(JSON_EXTRACT(data, '$.courses')), 0) = 0;
```

Первое число равно числу студентов. Второе показывает, у скольких нет ни одного курса, и проверяет вложенный массив: если у всех ноль, массив потерялся при выгрузке. Удалите таблицы проверки командой `DROP TABLE chk_students_flat, chk_groups, chk_students_json`.

### Шаг 10. Разверните схему в отдельной базе

```bat
mysql -u root -e "DROP DATABASE IF EXISTS dean_check; CREATE DATABASE dean_check CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root dean_check -e "source .../dean/export/schema.sql"
mysql -u root -e "SELECT table_name FROM information_schema.tables WHERE table_schema = 'dean_check' ORDER BY table_name;"
```

Команда `source` читает файл внутри клиента и не зависит от перенаправления оболочки. Сравните список таблиц с базой `dean`: он должен совпасть. Пустой список чаще всего означает, что дамп не создался из-за ошибки прав или прерванного выполнения.

Скриншоты делайте только как доказательства: файл CSV с заголовком, обратная загрузка с числом строк, итоговые счётчики и суммы. Шапка отчёта и текст теории в кадр не нужны.

## Что сдать

- Скрипт экспорта с `INTO OUTFILE`, `JSON_OBJECT` и `mysqldump`.
- Файлы `students.csv`, `students.json`, `schema.sql` и выгрузку из phpMyAdmin.
- Таблицу сверки с числом строк и контрольными суммами.
- Список таблиц базы `dean_check` после развёртывания схемы.
- Скриншоты файла, обратной загрузки и счётчиков.

## Критерии оценки

Оценка выставляется по шкале от 1 до 5.

| Оценка | Условие |
|---|---|
| 5 | Работа выполнена полностью и самостоятельно, все пункты ниже выполнены |
| 4 | Работа выполнена, есть 1 или 2 незначительных замечания |
| 3 | Работа выполнена частично, есть существенные замечания |
| 2 | Работа не выполнена |
| 1 | Работа выполнена с использованием ИИ или скопирована полностью или частично, 1 балл без возможности исправления |

Что проверяется:
- **Выгрузка.** CSV и JSON содержат нужные столбцы, заголовок и порядок строк
- **Кодировка.** UTF-8 подтверждена, BOM проверен, дамп читается
- **Обратная загрузка.** Файлы загружаются без ошибок и дают те же строки
- **Сверка.** Число строк и контрольные суммы совпадают
- **Схема и отчёт.** `mysqldump` разворачивается, таблица сверки заполнена

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Чем `INTO OUTFILE` отличается от экспорта через phpMyAdmin и когда нужен каждый?
2. Почему `INTO OUTFILE` возвращает ошибку 1086 и что делать перед повторной выгрузкой?
3. Почему для вложенного списка курсов выбран JSON, а не CSV?
4. Что произойдёт с файлом CSV, если значение содержит запятую и не заключено в кавычки?
5. Почему совпадения числа строк недостаточно для вывода о корректной выгрузке?
6. Зачем перед расчётом `MD5` увеличивают `group_concat_max_len`?
7. Чем мешает BOM при загрузке CSV в MySQL и когда он полезен?

</div>
