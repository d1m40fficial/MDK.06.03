---
title: Практика 2. Пользователи и роли
dek: "Строим доступ к «Деканату» на пяти ролях и доказываем матрицей, что каждая видит ровно то, что ей положено."
chapter: "Практика 2"
minutes: 90
level: СПО
glyph: П2
outcomes:
  - Разделять владельца объектов и рабочие роли
  - Выдавать права на схему, таблицы и последовательности
  - Настраивать права по умолчанию для новых таблиц
  - Проверять доступ от имени каждой роли и заполнять матрицу
---

## Цель работы

Права в базе выдают не человеку, а роли, и проверяют не по списку `GRANT`, а попыткой выполнить запрещённое действие. Цель работы: собрать для «Деканата» пять ролей с разными задачами, выдать им минимально достаточные права и доказать результат таблицей проверок.

Вы создаёте пять ролей, связываете их с учётной записью приложения `dean_app` и проходите по каждому оператору `SELECT`, `INSERT`, `UPDATE`, `DELETE` от имени каждой роли. Итог: матрица доступа, где каждая клетка подтверждена запросом или сообщением об ошибке.

## Оборудование и программное обеспечение

- Виртуальная машина Ubuntu Server с PostgreSQL 16 и базой `dean` из практики 1.
- Клиент `psql` внутри машины, доступ к роли `postgres` через `sudo -u postgres psql`.
- Текстовый редактор для SQL-скрипта и табличный редактор для матрицы доступа.
- Файл `roles.sql` для повторного запуска скрипта на чистой базе.

## Краткие теоретические сведения

**Привилегия** это разрешение на конкретное действие с конкретным объектом: `SELECT` на таблицу, `USAGE` на схему, `CONNECT` на базу. Привилегии не складываются в «уровень доступа»: роль может читать одну таблицу и не видеть соседнюю.

**Владелец объекта** имеет все права на объект и может передавать их дальше. Поэтому владельцем схемы и таблиц делают отдельную роль без права входа `dean_owner`, а не учётную запись приложения. Приложение получает только те права, которые ему нужны для работы, и не может незаметно переписать структуру.

**Наследование ролей** позволяет выдать одной роли другую: `GRANT dean_read TO dean_write` означает, что `dean_write` получает все права `dean_read`. Так строят лестницу прав, а учётки пользователей входят в групповые роли.

**Права по умолчанию** (`ALTER DEFAULT PRIVILEGES`) действуют на объекты, которые создадут после этой команды. Они не меняют уже существующие таблицы и привязаны к роли, которая создаёт объект. Если таблицу создаст другая роль, правило не сработает.

**Проверка доступа** идёт двумя способами. `SET ROLE` переключает текущий сеанс на другую роль, и вы видите ровно то, что увидит приложение. `information_schema.role_table_grants` и `\dp` показывают выданные права, но не заменяют проверку: право может быть выдано на схему, а не на таблицу.

## Ход работы

### Шаг 1. Зафиксируйте исходное состояние

```bash
psql "host=127.0.0.1 dbname=dean user=dean_app"
```

```sql
SELECT 'Иванов ИС-41' AS student;
\du
\dn+
\dp
```

Запишите, кто владеет схемой `public` и какие права есть у `PUBLIC`. В PostgreSQL 15 и новее `USAGE` у `PUBLIC` остаётся, и его нужно снять.

### Шаг 2. Создайте роли

Подключитесь как `postgres` к базе `dean` и выполните скрипт.

```bash
sudo -u postgres psql -d dean
```

```sql
CREATE ROLE dean_owner NOLOGIN;
CREATE ROLE dean_read NOLOGIN;
CREATE ROLE dean_write NOLOGIN;
CREATE ROLE student_read NOLOGIN;
CREATE ROLE auditor NOLOGIN;

GRANT dean_read TO dean_write;
GRANT dean_write TO dean_app;
```

```sql
SELECT 'Иванов ИС-41' AS student;
\du
```

У `dean_app` в столбце `Member of` появится `dean_write`, а через него и `dean_read`. Войти можно только под `dean_app`: остальные роли созданы с `NOLOGIN` и служат группами прав.

Сделайте скриншот `\du` с фамилией в первой строке вывода.

### Шаг 3. Передайте схему владельцу

```sql
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO dean_owner;
GRANT USAGE ON SCHEMA public TO dean_owner, dean_read, dean_write, student_read, auditor;
REVOKE ALL ON DATABASE dean FROM PUBLIC;
GRANT CONNECT ON DATABASE dean TO dean_owner, dean_read, dean_write, student_read, auditor;
```

`REVOKE ALL ON DATABASE dean FROM PUBLIC` закрывает подключение для всех. Проверьте, что `dean_app` сохранил вход: он владелец базы и участник `dean_write`.

### Шаг 4. Создайте таблицы от имени владельца

```sql
SET ROLE dean_owner;

CREATE TABLE groups (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  specialty text NOT NULL
);

CREATE TABLE students (
  id serial PRIMARY KEY,
  full_name text NOT NULL,
  group_id int REFERENCES groups(id),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE courses (
  id serial PRIMARY KEY,
  title text NOT NULL,
  hours int CHECK (hours > 0)
);

CREATE TABLE enrollments (
  id serial PRIMARY KEY,
  student_id int REFERENCES students(id) ON DELETE CASCADE,
  course_id int REFERENCES courses(id),
  grade int CHECK (grade BETWEEN 2 AND 5),
  enrolled_at date DEFAULT current_date,
  UNIQUE (student_id, course_id)
);

CREATE TABLE payments (
  id serial PRIMARY KEY,
  student_id int REFERENCES students(id),
  amount numeric(10,2) CHECK (amount > 0),
  paid_at timestamptz DEFAULT now()
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  at timestamptz DEFAULT now(),
  db_user text,
  action text,
  table_name text,
  row_id text,
  details jsonb
);
```

Заполните таблицы набором данных курса: десять студентов, пять курсов, двадцать записей о зачислении, десять платежей и две строки журнала.

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

INSERT INTO audit_log (db_user, action, table_name, row_id) VALUES
  ('dean_app', 'INSERT', 'students', '1'),
  ('dean_app', 'UPDATE', 'enrollments', '3');
```

### Шаг 5. Выдайте права и настройте значения по умолчанию

Продолжайте в том же сеансе или выполните `SET ROLE dean_owner;` в начале шага: права по умолчанию привязаны к роли, которая их настраивает.

```sql
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dean_read;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dean_write;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dean_write;

GRANT SELECT ON courses, groups TO student_read;
GRANT SELECT ON audit_log TO auditor;

REVOKE DELETE ON payments FROM dean_write;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO dean_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE ON TABLES TO dean_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dean_write;

RESET ROLE;
```

`REVOKE DELETE ON payments` стоит после общего `GRANT`, иначе общее правило вернёт право обратно. Платежи нельзя удалять даже роли записи: исправление проводят обратной операцией, а не удалением строки.

`GRANT USAGE ON SEQUENCES` нужен для `INSERT`: без него `nextval` не сработает, и вставка упадёт, хотя право на таблицу есть.

### Шаг 6. Проверьте права по умолчанию

Создайте новую таблицу от владельца и убедитесь, что права появились без отдельного `GRANT`.

```sql
SET ROLE dean_owner;
CREATE TABLE rooms (id serial PRIMARY KEY, name text NOT NULL);
INSERT INTO rooms (name) VALUES ('204'), ('311');
RESET ROLE;

SET ROLE dean_read;
SELECT count(*) AS rooms_visible FROM rooms;
RESET ROLE;
```

Если запрос вернул `2`, правило `ALTER DEFAULT PRIVILEGES` работает. Если получено `permission denied`, проверьте, что таблицу создавал именно `dean_owner`: для объектов другой роли правило не действует.

### Шаг 7. Пройдите проверки от имени каждой роли

Выполняйте пары запросов: разрешённый и запрещённый. Ошибка и есть доказательство.

```sql
SET ROLE dean_read;
SELECT count(*) FROM students;
INSERT INTO groups (name, specialty) VALUES ('ИС-44', '09.02.07');
RESET ROLE;

SET ROLE dean_write;
INSERT INTO groups (name, specialty) VALUES ('ИС-44', '09.02.07');
UPDATE enrollments SET grade = 5 WHERE id = 4;
DELETE FROM payments WHERE id = 1;
RESET ROLE;

SET ROLE student_read;
SELECT title, hours FROM courses;
SELECT full_name FROM students;
RESET ROLE;

SET ROLE auditor;
SELECT db_user, action, table_name FROM audit_log;
INSERT INTO audit_log (db_user, action) VALUES ('auditor', 'DELETE');
RESET ROLE;
```

Ожидаемые результаты: `dean_read` читает и не пишет, `dean_write` пишет везде, кроме удаления платежей, `student_read` видит только справочники, `auditor` читает журнал и не может в него писать. Затем проверьте приложение от его собственной учётной записи.

```bash
psql "host=127.0.0.1 dbname=dean user=dean_app" -c "INSERT INTO payments (student_id, amount) VALUES (4, 9000.00);"
psql "host=127.0.0.1 dbname=dean user=dean_app" -c "DELETE FROM payments WHERE id = 1;"
```

Первый запрос проходит, второй возвращает `permission denied for table payments`: приложение унаследовало права `dean_write`, но не получило право удаления.

Сделайте скриншоты успешного запроса и запрещённого запроса с текстом ошибки.

### Шаг 8. Соберите матрицу доступа

Заполните матрицу по фактическим результатам, а не по тексту скрипта.

| Роль | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `dean_read` | Все таблицы `public` | Нет | Нет | Нет |
| `dean_write` | Все таблицы `public` | Все таблицы | Все таблицы | Все, кроме `payments` |
| `student_read` | `groups`, `courses` | Нет | Нет | Нет |
| `auditor` | `audit_log` | Нет | Нет | Нет |
| `dean_app` | Как `dean_write` | Как `dean_write` | Как `dean_write` | Как `dean_write` |

### Шаг 9. Сверьте матрицу с каталогом

```sql
SET ROLE dean_owner;
SELECT 'Иванов ИС-41' AS student;

SELECT grantee, table_name,
       string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('dean_read', 'dean_write', 'student_read', 'auditor')
GROUP BY grantee, table_name
ORDER BY grantee, table_name;

\dp public.*
```

Запрос выполняется от `dean_owner`, потому что `role_table_grants` показывает права, где текущая роль выступает выдавшим или получателем. От имени `postgres` вы увидите пустой список и решите, что прав нет.

Сделайте скриншот `\dp` и результата запроса к `role_table_grants`.

### Требования к отчёту

Отчёт содержит скрипт `roles.sql`, матрицу доступа, таблицу проверок с ожидаемым и фактическим результатом, скриншоты `\du`, `\dp`, успешного и запрещённого запроса. В выводе объясните, почему `dean_app` не суперпользователь, зачем нужна отдельная роль владельца и какое право вы бы выдали осторожнее.

## Что сдать

- SQL-скрипт создания ролей, схемы, таблиц и выдачи прав.
- Матрицу доступа по пяти ролям и четырём операциям.
- Таблицу проверок с ожидаемым и фактическим результатом.
- Скриншоты `\du`, `\dp`, успешного и запрещённого запроса.
- Вывод о минимальных привилегиях и о роли владельца объектов.

## Критерии оценки

| Критерий | Баллы | Что проверяется |
|---|---|---|
| Роли и владелец | 20 | Пять ролей, у `dean_owner` нет входа, объекты принадлежат ему |
| Права на объекты | 25 | Схема, таблицы и последовательности закрыты, права выданы по задачам |
| Права по умолчанию | 15 | Новая таблица доступна роли чтения без отдельного `GRANT` |
| Проверки доступа | 25 | Каждая роль проверена разрешённым и запрещённым запросом |
| Матрица и отчёт | 15 | Матрица совпадает с каталогом и фактическими результатами |

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Почему владельцем таблиц сделали роль без права входа, а не `dean_app`?
2. Что произойдёт с доступом `dean_app`, если отозвать у неё `dean_write`, хотя `dean_read` выдана только роли `dean_write`?
3. Почему `GRANT USAGE ON SEQUENCES` обязателен для вставки строк?
4. Чем `ALTER DEFAULT PRIVILEGES` отличается от `GRANT ON ALL TABLES`?
5. Почему `role_table_grants` под `postgres` показал пустой список и как это исправить?

</div>
