---
title: Практика 6. Импорт JSON
dek: "Чужой JSON проходит через промежуточную таблицу, проверку типов и загрузку в связанные таблицы без ручного ввода."
chapter: "Практика 6"
minutes: 90
level: СПО
glyph: П6
outcomes:
  - Разбирать JSON на таблицы и связи
  - Загружать документ в промежуточную таблицу MySQL
  - Проверять кодировку, типы и обязательные поля до записи в основные таблицы
  - Сверять число строк источника, загрузки и отказов
---

## Цель работы

Данные приходят из чужой системы, и доверять им нельзя. В одном файле встречаются пропущенный адрес почты, несуществующая группа и оценка, записанная словом. Если грузить такой файл прямо в `students`, одна плохая строка остановит весь импорт или создаст запись без связи.

Цель работы: провести JSON от файла до таблиц `groups`, `students` и `enrollments` через буфер. Вы загрузите документ, проверите типы и поля запросом, отправите ошибочные строки в отдельную таблицу и сверите число строк.

## Оборудование и программное обеспечение

- Персональный компьютер с Windows 10, XAMPP 8.5.12 и запущенными Apache и MySQL.
- База `dean` в кодировке `utf8mb4` с таблицами `groups`, `students`, `courses`, `enrollments`.
- phpMyAdmin по адресу `http://localhost/phpmyadmin`.
- .NET SDK 10, консольное приложение с пакетом `MySqlConnector`.
- Файл `students.json` в кодировке UTF-8 без BOM.
- Пользователь `dean_app` с правом записи в базу `dean` и каталог `C:\dean\import`.

## Краткие теоретические сведения

**JSON** это текстовый формат с объектами, массивами, строками, числами и `null`. MySQL хранит документ в столбце типа `JSON`, проверяет синтаксис при записи и даёт функции разбора. Один документ содержит и справочник групп, и список студентов: файл приходит целиком, а таблиц в базе несколько.

**Промежуточная таблица** принимает документ без ограничений и служит буфером между файлом и схемой. В неё грузят всё, что прочиталось, затем проверяют, а в основные таблицы переносят только корректные строки. Ошибка источника не ломает связи.

**Разбор.** `JSON_EXTRACT` возвращает значение по пути, `JSON_UNQUOTE` снимает кавычки, `JSON_TYPE` сообщает тип (`STRING`, `INTEGER`, `DOUBLE`, `ARRAY`), `JSON_LENGTH` считает элементы массива. Для отсутствующего пути `JSON_TYPE` возвращает `NULL`, поэтому его оборачивают в `IFNULL` и сравнивают с `'MISSING'`.

**Кодировка.** Файл обмена должен быть в UTF-8 без BOM. BOM превращается в невидимый символ и ломает разбор первого объекта, а файл в Windows-1251 даёт испорченные фамилии. Соединение тоже задаёт `utf8mb4`, иначе сервер заменит кириллицу знаками вопроса.

**Повторная загрузка.** В MySQL нет `ON CONFLICT`, его роль играет `ON DUPLICATE KEY UPDATE`. Для групп ключ это `name`, для студентов `email`, для записей на курсы пара `student_id` и `course_id`. Такой `INSERT` не создаёт дублей.

**Транзакция и DDL.** Загрузку выполняют одной транзакцией, но `CREATE TABLE` и `TRUNCATE` вызывают неявную фиксацию, поэтому очистку буфера делают до `START TRANSACTION`.

## Ход работы

### Шаг 1. Проверьте файл и кодировку соединения

```bat
cd /d C:\dean\import
powershell -Command "[System.IO.File]::ReadAllBytes('students.json')[0..2]"
powershell -Command "(Get-Content students.json -Raw | ConvertFrom-Json).students.Count"
```

Байты `239 187 191` означают BOM: пересохраните файл без него. Документ состоит из двух массивов: `groups` с полями `name` и `specialty` и `students` с полями `full_name`, `email`, `group_name` и `courses`. Кодировку базы проверьте в phpMyAdmin.

```sql
SELECT 'Иванов И.И., ИС-41' AS student;
SHOW VARIABLES LIKE 'character_set_database';
SELECT table_name, table_collation
FROM information_schema.tables
WHERE table_schema = 'dean' AND table_name IN ('groups', 'students', 'enrollments');
```

Везде должно быть `utf8mb4`: в `latin1` кириллица испортится при первой вставке.

### Шаг 2. Создайте промежуточные таблицы

```sql
DROP TABLE IF EXISTS stg_students, stg_groups, stg_checked, stg_courses, stg_rejected, seq;

CREATE TABLE stg_students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  raw JSON NOT NULL,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stg_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  raw JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stg_checked (
  source_id INT PRIMARY KEY,
  full_name VARCHAR(128),
  email VARCHAR(128),
  group_name VARCHAR(32),
  reject_reason VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stg_courses (
  source_id INT NOT NULL,
  pos INT NOT NULL,
  title VARCHAR(160),
  grade INT,
  PRIMARY KEY (source_id, pos)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stg_rejected (
  source_id INT PRIMARY KEY,
  raw JSON,
  reason VARCHAR(64),
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE seq (n INT PRIMARY KEY) ENGINE=InnoDB;
INSERT INTO seq VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9);
```

Таблица `seq` заменяет разворачивание массива: по её номерам строится путь `$.courses[0]`, `$.courses[1]`.

### Шаг 3. Загрузите документ в буфер

```bat
dotnet new console -n JsonLoad
cd JsonLoad
dotnet add package MySqlConnector
```

Замените содержимое `Program.cs`.

```csharp
using System.Text.Json;
using MySqlConnector;

string path = args.Length > 0 ? args[0] : "students.json";
string password = Environment.GetEnvironmentVariable("DEAN_DB_PASSWORD")
    ?? throw new InvalidOperationException("не задана DEAN_DB_PASSWORD");

var csb = new MySqlConnectionStringBuilder
{
    Server = "localhost", Port = 3306, Database = "dean",
    UserID = "dean_app", Password = password, CharacterSet = "utf8mb4"
};

using var doc = JsonDocument.Parse(File.ReadAllText(path));
await using var connection = new MySqlConnection(csb.ConnectionString);
await connection.OpenAsync();
await using var tx = await connection.BeginTransactionAsync();

foreach (JsonElement group in doc.RootElement.GetProperty("groups").EnumerateArray())
{
    await using var cmd = new MySqlCommand("INSERT INTO stg_groups (raw) VALUES (@raw)", connection, tx);
    cmd.Parameters.AddWithValue("@raw", group.GetRawText());
    await cmd.ExecuteNonQueryAsync();
}

foreach (JsonElement student in doc.RootElement.GetProperty("students").EnumerateArray())
{
    await using var cmd = new MySqlCommand("INSERT INTO stg_students (raw) VALUES (@raw)", connection, tx);
    cmd.Parameters.AddWithValue("@raw", student.GetRawText());
    await cmd.ExecuteNonQueryAsync();
}

await tx.CommitAsync();
Console.WriteLine($"Иванов И.И., ИС-41: загружено из {path}");
```

Пароль передайте через окружение и запустите загрузку.

```bat
set DEAN_DB_PASSWORD=DeanLab2026
dotnet run -- ..\students.json
```

Приложите скриншот вывода приложения: первая строка содержит фамилию и группу. Документ можно вставить и в phpMyAdmin на вкладке SQL.

### Шаг 4. Сверьте файл и буфер

```sql
SELECT 'Иванов И.И., ИС-41' AS student;
SELECT COUNT(*) AS students_loaded FROM stg_students;
SELECT id, JSON_UNQUOTE(JSON_EXTRACT(raw, '$.full_name')) AS full_name
FROM stg_students ORDER BY id;
```

Число строк буфера должно совпасть с числом студентов в файле, иначе документ изменился между командами.

### Шаг 5. Загрузите группы

Группы берутся из массива `groups` документа.

```sql
INSERT INTO groups (name, specialty)
SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(raw, '$.name')),
       JSON_UNQUOTE(JSON_EXTRACT(raw, '$.specialty'))
FROM stg_groups
WHERE JSON_TYPE(JSON_EXTRACT(raw, '$.name')) = 'STRING'
ON DUPLICATE KEY UPDATE groups.name = groups.name;

SELECT id, name, specialty FROM groups ORDER BY name;
```

Повтор названия не перезаписывает строку: ключ `name` и `ON DUPLICATE KEY UPDATE` оставляют существующую запись.

### Шаг 6. Проверьте типы и обязательные поля

Разбор с проверкой складывается в `stg_checked`, причина отказа пишется текстом.

```sql
INSERT INTO stg_checked (source_id, full_name, email, group_name, reject_reason)
SELECT s.id,
       JSON_UNQUOTE(JSON_EXTRACT(s.raw, '$.full_name')),
       JSON_UNQUOTE(JSON_EXTRACT(s.raw, '$.email')),
       JSON_UNQUOTE(JSON_EXTRACT(s.raw, '$.group_name')),
       CASE
         WHEN IFNULL(JSON_TYPE(JSON_EXTRACT(s.raw, '$.full_name')), 'MISSING') <> 'STRING'
           THEN 'нет full_name'
         WHEN TRIM(JSON_UNQUOTE(JSON_EXTRACT(s.raw, '$.full_name'))) = ''
           THEN 'пустое full_name'
         WHEN IFNULL(JSON_TYPE(JSON_EXTRACT(s.raw, '$.email')), 'MISSING') <> 'STRING'
           THEN 'нет email'
         WHEN JSON_UNQUOTE(JSON_EXTRACT(s.raw, '$.email')) NOT REGEXP '^[^@ ]+@[^@ ]+[.][a-z]{2,}$'
           THEN 'неверный email'
         WHEN g.id IS NULL
           THEN 'неизвестная группа'
         ELSE NULL
       END
FROM stg_students s
LEFT JOIN groups g ON g.name = JSON_UNQUOTE(JSON_EXTRACT(s.raw, '$.group_name'));

SELECT source_id, full_name, email, group_name, reject_reason
FROM stg_checked WHERE reject_reason IS NOT NULL ORDER BY source_id;
```

Ожидаются три строки: неизвестная группа `ИС-43`, отсутствующий адрес и испорченный адрес. Скриншот запроса доказывает, что проверка работает.

### Шаг 7. Загрузите студентов

В основные таблицы попадают строки без причины отказа. Повтор адреса отсекает уникальный ключ.

```sql
INSERT INTO students (full_name, group_id, email)
SELECT c.full_name, g.id, c.email
FROM stg_checked c
JOIN groups g ON g.name = c.group_name
WHERE c.reject_reason IS NULL
ON DUPLICATE KEY UPDATE students.email = students.email;

SELECT c.source_id, c.email, 'адрес уже есть' AS reason
FROM stg_checked c JOIN students s ON s.email = c.email
WHERE c.reject_reason IS NULL ORDER BY c.source_id;
```

Повтор адреса это защита от дубля.

### Шаг 8. Разверните курсы и загрузите оценки

Массив `courses` разворачивается по номерам из `seq` в отдельную таблицу.

```sql
INSERT INTO stg_courses (source_id, pos, title, grade)
SELECT v.id, n.n,
       JSON_UNQUOTE(JSON_EXTRACT(v.raw, CONCAT('$.courses[', n.n, '].title'))),
       CAST(JSON_UNQUOTE(JSON_EXTRACT(v.raw, CONCAT('$.courses[', n.n, '].grade'))) AS SIGNED)
FROM stg_students v
JOIN seq n ON n.n < JSON_LENGTH(JSON_EXTRACT(v.raw, '$.courses'));

SELECT x.source_id, x.title, x.grade,
       CASE WHEN c.id IS NULL THEN 'курс не найден' ELSE 'оценка вне 2..5' END AS reason
FROM stg_courses x
LEFT JOIN courses c ON c.title = x.title
WHERE c.id IS NULL OR x.grade NOT BETWEEN 2 AND 5;
```

Вторая строка отчёта важна: оценка «отлично» превратилась в ноль и попала в список отказов, а не в `enrollments`. Загрузите только корректные записи.

```sql
INSERT INTO enrollments (student_id, course_id, grade)
SELECT st.id, c.id, x.grade
FROM stg_courses x
JOIN stg_checked ch ON ch.source_id = x.source_id AND ch.reject_reason IS NULL
JOIN students st ON st.email = ch.email
JOIN courses c ON c.title = x.title
WHERE x.grade BETWEEN 2 AND 5
ON DUPLICATE KEY UPDATE enrollments.grade = enrollments.grade;
```

### Шаг 9. Разберите ошибочные строки и повторите загрузку

```sql
INSERT INTO stg_rejected (source_id, raw, reason)
SELECT c.source_id, s.raw, c.reject_reason
FROM stg_checked c JOIN stg_students s ON s.id = c.source_id
WHERE c.reject_reason IS NOT NULL
ON DUPLICATE KEY UPDATE stg_rejected.reason = VALUES(reason);

SELECT source_id, JSON_UNQUOTE(JSON_EXTRACT(raw, '$.full_name')) AS full_name, reason
FROM stg_rejected ORDER BY source_id;
```

Исправьте строки в файле, очистите буфер и загрузите снова.

```sql
TRUNCATE TABLE stg_students;
TRUNCATE TABLE stg_checked;
TRUNCATE TABLE stg_courses;
TRUNCATE TABLE stg_rejected;
```

```bat
dotnet run -- ..\students.json
```

Повторите шаги 4, 6 и 8. Число отказов должно стать нулевым, а число строк не должно вырасти.

### Шаг 10. Сверьте итоги

```sql
SELECT 'Иванов И.И., ИС-41' AS student;
SELECT (SELECT COUNT(*) FROM stg_students) AS source_lines,
       (SELECT COUNT(*) FROM stg_checked WHERE reject_reason IS NULL) AS valid_rows,
       (SELECT COUNT(*) FROM stg_rejected) AS rejected_rows,
       (SELECT COUNT(*) FROM students) AS students_total,
       (SELECT COUNT(*) FROM enrollments) AS enrollments_total;
```

| Что сверяется | Источник | В базе | Расхождение | Вывод |
|---|---|---|---|---|
| Студенты в файле и в буфере | | | | |
| Корректные строки и загруженные студенты | | | | |
| Отклонённые строки и таблица отказов | | | | |
| Группы из файла и таблица `groups` | | | | |
| Оценки из массивов и таблица `enrollments` | | | | |

Скриншоты делайте только как доказательства: вывод загрузки, `SELECT` из буфера, ошибочные строки и счётчики.

## Что сдать

- Файл `students.json` с исправленными строками.
- Проект `JsonLoad` и SQL-скрипт импорта: буфер, проверка, группы, студенты, оценки.
- Таблицу отказов с номером строки и причиной.
- Таблицу сверки числа строк по каждому шагу.
- Скриншоты загрузки, проверки, ошибочной строки и счётчиков.

## Критерии оценки

| Критерий | Баллы | Что проверяется |
|---|---|---|
| Разбор структуры | 20 | Связи групп, студентов и оценок восстановлены верно |
| Проверка данных | 25 | Кодировка, типы, обязательные поля и оценки проверены до загрузки |
| Обработка ошибок | 20 | Ошибочные строки сохранены с причиной, импорт не прерван |
| Повторный запуск | 15 | Второй запуск не создаёт дублей |
| Сверка и отчёт | 20 | Числа сходятся, расхождения объяснены |

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Зачем нужна промежуточная таблица, если можно загрузить файл сразу в `students`?
2. Почему `JSON_TYPE` для отсутствующего поля сравнивают с `'MISSING'`, а не с `NULL`?
3. Чем `ON DUPLICATE KEY UPDATE` отличается от `INSERT IGNORE` и почему выбран первый?
4. Как таблица `seq` превращает массив курсов в строки таблицы `enrollments`?

</div>
