---
title: Практика 1. XAMPP, база utf8mb4 и подключение из .NET
dek: "Запускаем MySQL в XAMPP, создаём базу dean в utf8mb4 и доказываем подключение из консольного приложения .NET."
chapter: "Практика 1"
minutes: 90
level: СПО
glyph: П1
outcomes:
  - Запускать Apache и MySQL в XAMPP Control Panel
  - Создавать базу utf8mb4 и учебную схему в phpMyAdmin
  - Заводить пользователя приложения с паролем и узкими правами
  - Подключаться к MySQL из консольного приложения .NET
---

## Цель работы

MySQL настроен не тогда, когда закончилась установка, а когда нужный пользователь подключается к нужной базе и получает данные в правильной кодировке. Цель работы: пройти этот путь на стенде XAMPP и собрать три доказательства: службы запущены, база создана в `utf8mb4`, приложение .NET читает из неё версию сервера и кодировку.

Вы запускаете Apache и MySQL в Control Panel, создаёте базу `dean` в phpMyAdmin, выполняете скрипт схемы с учебными данными и заводите пользователя `dean_app` с паролем. Итог: рабочая база «Деканат», отдельная учётная запись приложения и протокол, по которому стенд повторит другой человек.

## Оборудование и программное обеспечение

- Компьютер с Windows 10 или 11 и XAMPP 8.5.12: Apache, MySQL, phpMyAdmin.
- Браузер для адреса `http://localhost/phpmyadmin`.
- .NET SDK 10 и Visual Studio 2022 Community с рабочей нагрузкой «Разработка классических приложений .NET».
- Свободные порты 80 и 3306.
- Текстовый редактор для скрипта и табличный редактор для протокола.
- Права администратора Windows не нужны: настройки и данные лежат внутри каталога XAMPP.

## Краткие теоретические сведения

**XAMPP** это набор Apache, MySQL, PHP и phpMyAdmin в каталоге `C:\xampp`. Службы запускает Control Panel. Apache нужен phpMyAdmin, потому что тот работает через веб-сервер. MySQL слушает порт 3306 и от Apache не зависит: к базе можно подключиться, даже когда веб-сервер остановлен.

**Кодировка** задаётся на трёх уровнях: сервер, база и соединение. `utf8mb4` это полный UTF-8 до четырёх байт на символ, а старое имя `utf8` в MySQL означает три байта и не вмещает эмодзи. Сравнение `utf8mb4_unicode_ci` не различает регистр. Кодировка базы задаёт значение по умолчанию для новых таблиц, но не отменяет кодировку соединения: если клиент объявил однобайтовую кодировку, сервер перекодирует текст и вернёт вопросительные знаки.

**Учётная запись** в MySQL это пара «имя и хост»: `'dean_app'@'localhost'`. Одно имя на разных хостах даёт разные записи с разными паролями и правами. В XAMPP пользователь `root` создан без пароля: для стенда удобно, для приложения недопустимо. Приложение получает свою запись с паролем и только нужные права.

**Строка подключения** перечисляет сервер, базу, пользователя, пароль и кодировку. Пароль не хранят в коде: его читают из переменной окружения. `MySqlConnector` это управляемый драйвер MySQL для .NET.

**Проверка** состоит из двух запросов: `SELECT VERSION()` показывает версию сервера, `SELECT @@character_set_database` кодировку текущей базы. Если второй вернул `utf8mb4`, база создана правильно.

## Ход работы

### Шаг 1. Запустите службы

Откройте `C:\xampp\xampp-control.exe` и нажмите `Start` у Apache и у MySQL. В строке службы появится зелёная надпись `Running` и занятый порт: 80 у Apache, 3306 у MySQL.

Если служба не поднимается, кнопка `Netstat` в Control Panel покажет процесс, занявший порт. Второй MySQL на машине запускать не нужно: два сервера на одном порту не уживаются.

Сделайте первый скриншот: окно Control Panel, где обе службы запущены.

### Шаг 2. Создайте базу dean

Откройте `http://localhost/phpmyadmin`, войдите под `root` без пароля, перейдите на вкладку `Базы данных`, введите имя `dean`, выберите сравнение `utf8mb4_unicode_ci` и нажмите `Создать`. Запрос даёт тот же результат.

```sql
CREATE DATABASE dean CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Начинайте каждый вывод строкой с фамилией и группой: так скриншот подтверждает, кто его сделал.

```sql
SELECT 'Иванов ИС-41' AS student;
SHOW CREATE DATABASE dean;
```

Ответ должен содержать `utf8mb4_unicode_ci`. Второй скриншот: дерево с базой `dean` и результат `SHOW CREATE DATABASE`.

### Шаг 3. Выполните скрипт схемы

Выберите базу `dean`, откройте вкладку `SQL` и выполните скрипт целиком.

```sql
USE dean;

CREATE TABLE groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) NOT NULL UNIQUE,
  specialty VARCHAR(128) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(128) NOT NULL,
  group_id INT,
  email VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_group FOREIGN KEY (group_id) REFERENCES groups(id)
) ENGINE=InnoDB;

CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  hours INT NOT NULL CHECK (hours > 0)
) ENGINE=InnoDB;

CREATE TABLE enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  grade TINYINT CHECK (grade BETWEEN 2 AND 5),
  enrolled_at DATE DEFAULT (CURRENT_DATE),
  UNIQUE KEY uq_enrollment (student_id, course_id),
  CONSTRAINT fk_enroll_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_enroll_course FOREIGN KEY (course_id) REFERENCES courses(id)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_student FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB;

CREATE TABLE audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  db_user VARCHAR(64),
  action VARCHAR(32),
  table_name VARCHAR(64),
  row_id VARCHAR(64),
  details JSON
) ENGINE=InnoDB;

CREATE TABLE schema_version (
  version INT PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
```

Движок `InnoDB` указан явно: он даёт транзакции, внешние ключи и построчные блокировки.

```sql
SELECT table_name, engine, table_collation
FROM information_schema.tables
WHERE table_schema = 'dean'
ORDER BY table_name;
```

Все семь таблиц должны быть в `InnoDB` и `utf8mb4_unicode_ci`.

### Шаг 4. Загрузите учебные данные

Тем же способом выполните вставки, имена вымышленные.

```sql
INSERT INTO groups (name, specialty) VALUES
  ('ИС-41', '09.02.07'), ('ИС-42', '09.02.07'), ('ИС-43', '09.02.07');

INSERT INTO students (full_name, group_id, email) VALUES
  ('Иванов Пётр', 1, 'ivanov@example.edu'),
  ('Смирнова Анна', 1, 'smirnova@example.edu'),
  ('Кузнецов Илья', 2, 'kuznetsov@example.edu'),
  ('Орлова Мария', 2, 'orlova@example.edu'),
  ('Белов Артём', 3, 'belov@example.edu'),
  ('Гусева Ольга', 1, 'guseva@example.edu'),
  ('Морозов Денис', 2, 'morozov@example.edu'),
  ('Павлова Кира', 3, 'pavlova@example.edu'),
  ('Соколов Ян', 1, 'sokolov@example.edu'),
  ('Титова Вера', 2, 'titova@example.edu');

INSERT INTO courses (title, hours) VALUES
  ('Базы данных', 72), ('Операционные системы', 54),
  ('Веб-технологии', 64), ('Сети и телекоммуникации', 48),
  ('Инженерная графика', 36);

INSERT INTO enrollments (student_id, course_id, grade) VALUES
  (1,1,5),(1,2,4),(2,1,4),(2,3,5),(3,2,5),(3,3,4),(4,1,3),(4,2,4),
  (5,3,4),(5,1,5),(6,2,4),(6,3,3),(7,1,5),(7,2,5),(8,3,4),(8,1,4),
  (9,2,3),(9,3,5),(10,1,4),(10,2,5);

INSERT INTO payments (student_id, amount) VALUES
  (1,12000.00),(2,12000.00),(3,9000.00),(4,9000.00),(5,12000.00),
  (6,9000.00),(7,12000.00),(8,9000.00),(9,12000.00),(10,9000.00);
```

Проверьте объёмы и кодировку кириллицы.

```sql
SELECT 'groups' AS tbl, COUNT(*) AS rows_cnt FROM groups
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'enrollments', COUNT(*) FROM enrollments
UNION ALL SELECT 'payments', COUNT(*) FROM payments
ORDER BY tbl;

SELECT full_name, CHAR_LENGTH(full_name) AS chars_cnt, LENGTH(full_name) AS bytes_cnt
FROM students WHERE id = 1;
```

`CHAR_LENGTH` считает символы, `LENGTH` байты. У кириллицы байтов больше, чем символов. Если вместо букв стоят знаки вопроса, соединение объявлено не в `utf8mb4`, и данные испорчены уже при вставке.

### Шаг 5. Создайте пользователя приложения

```sql
CREATE USER 'dean_app'@'localhost' IDENTIFIED BY 'DeanApp_2026';
GRANT SELECT, INSERT, UPDATE, DELETE ON dean.* TO 'dean_app'@'localhost';
SHOW GRANTS FOR 'dean_app'@'localhost';
```

Права выданы на базу `dean`, а не на весь сервер: приложение не должно видеть чужие базы. `DROP` и `ALTER` не выданы, поэтому структуру меняет только администратор. `FLUSH PRIVILEGES` не нужна: она требуется после прямой правки таблиц привилегий.

### Шаг 6. Проверьте вход в phpMyAdmin и MySQL CLI

Выйдите из phpMyAdmin и войдите как `dean_app`. В дереве останется только `dean`: остальные базы скрыты, потому что прав на них нет.

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u dean_app -p dean
```

```sql
SELECT 'Иванов ИС-41' AS student;
SELECT CURRENT_USER(), DATABASE(), @@character_set_database, VERSION();
```

`CURRENT_USER()` вернёт `dean_app@localhost`, `DATABASE()` вернёт `dean`. Ключ `-p` без пароля в команде заставляет клиент спросить пароль: так он не остаётся в истории.

### Шаг 7. Создайте консольное приложение

```powershell
dotnet new console -n DeanAdmin
cd DeanAdmin
dotnet add package MySqlConnector
```

Замените содержимое `Program.cs`.

```csharp
using MySqlConnector;

string password = Environment.GetEnvironmentVariable("DEAN_DB_PASSWORD")
    ?? throw new InvalidOperationException("Не задана переменная DEAN_DB_PASSWORD");

var builder = new MySqlConnectionStringBuilder
{
    Server = "localhost",
    Database = "dean",
    UserID = "dean_app",
    Password = password,
    CharacterSet = "utf8mb4"
};

await using var connection = new MySqlConnection(builder.ConnectionString);
await connection.OpenAsync();

Console.WriteLine("Иванов ИС-41");

const string sql = "SELECT VERSION(), @@character_set_database, (SELECT COUNT(*) FROM students)";

await using (var command = new MySqlCommand(sql, connection))
await using (var reader = await command.ExecuteReaderAsync())
{
    await reader.ReadAsync();
    Console.WriteLine($"Сервер: {reader.GetString(0)}");
    Console.WriteLine($"Кодировка базы: {reader.GetString(1)}");
    Console.WriteLine($"Студентов в базе: {reader.GetInt64(2)}");
}
```

Запустите приложение, передав пароль через окружение.

```powershell
$env:DEAN_DB_PASSWORD = "DeanApp_2026"
dotnet run
```

Ожидаемый вывод: фамилия с группой, версия сервера, строка `utf8mb4` и число `10`. Третий скриншот: окно с выводом приложения, где первая строка содержит фамилию и группу.

### Шаг 8. Разберите возможные отказы

| Сообщение | Причина | Что сделать |
|---|---|---|
| `Access denied for user 'dean_app'@'localhost'` | Неверный пароль или запись создана для другого хоста | Проверить `SELECT user, host FROM mysql.user` |
| `Unknown database 'dean'` | База не создана или опечатка в имени | Проверить `SHOW DATABASES` |
| Кириллица выводится как `????` | В соединении не указан `utf8mb4` | Добавить `CharacterSet = "utf8mb4"` |

### Шаг 9. Соберите протокол

| № | Действие | Команда или запрос | Ожидаемый результат | Факт | Скриншот |
|---|---|---|---|---|---|
| 1 | Запуск служб | Control Panel | Apache и MySQL в состоянии Running | | 1 |
| 2 | Создание базы | `SHOW CREATE DATABASE dean` | `utf8mb4_unicode_ci` | | 2 |
| 3 | Схема | `information_schema.tables` | Семь таблиц InnoDB | | |
| 4 | Данные | `SELECT COUNT(*)` | 10 студентов, 20 зачислений | | |
| 5 | Пользователь | `SHOW GRANTS` | Четыре права на `dean.*` | | |
| 6 | Приложение | `dotnet run` | Версия, `utf8mb4`, 10 | | 3 |

### Требования к отчёту

Отчёт содержит цель, версии XAMPP и .NET, протокол, три скриншота и SQL-скрипт схемы. В выводе объясните, зачем кодировка задаётся и на базе, и в соединении, почему приложение работает не под `root` и что изменится, если убрать `CharacterSet`. Скриншоты шапки отчёта и текста теории не нужны: доказательствами служат окно Control Panel, phpMyAdmin и вывод приложения.

## Что сдать

- SQL-скрипт создания базы, таблиц и учебных данных.
- Протокол с командами, ожидаемым и фактическим результатом.
- Скриншоты XAMPP Control Panel с запущенными службами, phpMyAdmin с базой `dean`, вывода приложения .NET.
- Исходный код `Program.cs` и строку подключения без пароля.
- Вывод о трёх уровнях кодировки и о правах учётной записи приложения.

## Критерии оценки

| Критерий | Баллы | Что проверяется |
|---|---|---|
| Службы и база | 20 | Apache и MySQL запущены, база `dean` в `utf8mb4_unicode_ci` |
| Схема и данные | 25 | Семь таблиц InnoDB, внешние ключи, верные объёмы данных |
| Учётная запись | 20 | `dean_app` с паролем и четырьмя правами только на `dean` |
| Подключение из .NET | 25 | Приложение печатает версию, кодировку и число студентов |
| Протокол | 10 | Шаги можно повторить на другом стенде |

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Почему `utf8mb4` отличается от `utf8` и где это заметно на учебных данных?
2. Зачем кодировку указывают и при создании базы, и в строке подключения?
3. Чем опасен вход приложения под `root` без пароля?
4. Почему права выданы на `dean.*`, а не на `*.*`?

</div>
