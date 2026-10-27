---
title: Практика 9. Схема БД; Безопасность
dek: "Создаём схему «Библиотеки колледжа» скриптом, закрываем данные представлениями и раздаём права по ролям."
chapter: "Практика 9"
minutes: 180
level: СПО
glyph: П9
outcomes:
  - Создавать таблицы, ключи и ограничения SQL-скриптом
  - Настраивать роли и права доступа к объектам базы
  - Составлять матрицу прав для групп пользователей
---

## Цель работы

Схема базы данных это не только список таблиц. Она удерживает правила предметной области: экземпляр нельзя выдать дважды, дата возврата не раньше выдачи, штраф не бывает отрицательным. Эти правила работают, даже если приложение содержит ошибку.

Цель работы: создать схему «Библиотеки колледжа» SQL-скриптом, проверить ограничения целостности, настроить роли и права, собрать матрицу доступа и описать меры защиты. Результат это скрипт, матрица прав и протокол проверок.

## Оборудование и программное обеспечение

- Персональный компьютер с браузером.
- sqliteonline.com с режимом PostgreSQL или учебная копия PostgreSQL.
- ER-модель из практики по проектированию данных.
- Текстовый редактор для SQL-скрипта.
- Word или Excel для матрицы прав и протокола.

## Краткие теоретические сведения

**DDL** это команды определения данных: `CREATE TABLE`, `ALTER TABLE`, `CREATE VIEW`, `CREATE INDEX`. Скрипт DDL должен быть повторяемым: его применяют на чистой базе и получают одинаковую схему.

**Ограничение целостности** описывает правило, которое база проверяет сама. `PRIMARY KEY` задаёт уникальный идентификатор строки. `FOREIGN KEY` не даёт сослаться на несуществующую запись. `UNIQUE` запрещает дубли. `NOT NULL` требует значение. `CHECK` проверяет условие над полями. Внешний ключ с `ON DELETE RESTRICT` не даст удалить книгу, у которой есть экземпляры.

**Роль** это именованный набор прав. Пользователь входит под учётной записью и получает роли. **Права** выдаются на объект и операцию: `SELECT`, `INSERT`, `UPDATE`, `DELETE` для таблиц, `EXECUTE` для функций. **Принцип минимальных прав** требует выдавать только то, без чего работа невозможна.

**Представление** это сохранённый запрос, который выглядит как таблица. Оно скрывает лишние столбцы и строки. Читатель видит каталог без телефонов и адресов, библиотекарь видит должников, администратор видит журнал.

**Матрица доступа** сводит роли и объекты в таблицу. Пустая клетка означает запрет. Матрица нужна, чтобы права не выдавались случайно и чтобы проверка не зависела от памяти разработчика.

**Аудит** фиксирует действия над данными: кто, когда, что и над какой записью сделал. Журнал аудита не должен редактироваться обычной ролью приложения.

## Ход работы

### Шаг 1. Перенесите сущности в таблицы

Возьмите ER-модель и выпишите таблицы. Для каждой укажите ключ, обязательные поля и связи.

| Таблица | Назначение | Ключ | Связи |
|---|---|---|---|
| `reader` | Читатели библиотеки | `id` | Один ко многим с `loan`, `reservation` |
| `book` | Описание книги | `id` | Один ко многим с `copy` |
| `copy` | Физический экземпляр | `id` | Многие к одному с `book` |
| `loan` | Выдача экземпляра | `id` | Ссылки на `copy` и `reader` |
| `reservation` | Бронь книги | `id` | Ссылки на `book` и `reader` |
| `fine` | Штраф по выдаче | `id` | Один к одному с `loan` |
| `notification` | Очередь писем | `id` | Ссылка на `reader` |
| `audit_log` | Журнал действий | `id` | Ссылка на `reader` |

### Шаг 2. Напишите DDL для основных таблиц

Создайте файл `schema.sql`. Начните с независимых таблиц, затем добавьте зависимые. Порядок важен: внешний ключ требует, чтобы целевая таблица уже существовала.

```sql
CREATE TABLE reader (
    id            SERIAL PRIMARY KEY,
    full_name     VARCHAR(120) NOT NULL,
    email         VARCHAR(120) NOT NULL UNIQUE,
    phone         VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'blocked', 'archived')),
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE book (
    id        SERIAL PRIMARY KEY,
    title     VARCHAR(200) NOT NULL,
    author    VARCHAR(120) NOT NULL,
    isbn      VARCHAR(17) UNIQUE,
    pub_year  SMALLINT CHECK (pub_year BETWEEN 1500 AND 2100)
);

CREATE TABLE copy (
    id           SERIAL PRIMARY KEY,
    book_id      INTEGER NOT NULL REFERENCES book(id) ON DELETE RESTRICT,
    inventory_no VARCHAR(20) NOT NULL UNIQUE,
    status       VARCHAR(20) NOT NULL DEFAULT 'available'
                 CHECK (status IN ('available', 'loaned', 'reserved', 'repair'))
);

CREATE TABLE loan (
    id          SERIAL PRIMARY KEY,
    copy_id     INTEGER NOT NULL REFERENCES copy(id) ON DELETE RESTRICT,
    reader_id   INTEGER NOT NULL REFERENCES reader(id) ON DELETE RESTRICT,
    issued_at   DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date    DATE NOT NULL,
    returned_at DATE,
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'returned', 'overdue')),
    CHECK (due_date > issued_at),
    CHECK (returned_at IS NULL OR returned_at >= issued_at)
);

CREATE UNIQUE INDEX one_active_loan
    ON loan (copy_id)
    WHERE returned_at IS NULL;
```

Последний индекс важнее, чем кажется: он запрещает две активные выдачи одного экземпляра на уровне базы. Проверка в приложении может не успеть между двумя одновременными запросами.

Добавьте остальные таблицы: `reservation`, `fine`, `notification`, `audit_log`. Для `fine` задайте `amount NUMERIC(8,2) CHECK (amount >= 0)` и ссылку на `loan` с ограничением `UNIQUE`, чтобы по одной выдаче был один штраф. Для `reservation` проверьте, что `expires_at > created_at`.

### Шаг 3. Проверьте ограничения

Выполните по одному корректному и одному некорректному запросу на каждое правило. Некорректный запрос должен завершиться ошибкой, а не тихо записать данные.

| Проверка | Запрос | Ожидание |
|---|---|---|
| Дубль email | Вставить читателя с существующим email | Ошибка уникальности |
| Дата возврата раньше выдачи | `due_date` меньше `issued_at` | Ошибка `CHECK` |
| Несуществующая книга | `copy.book_id = 9999` | Ошибка внешнего ключа |
| Отрицательный штраф | `amount = -100` | Ошибка `CHECK` |
| Две активные выдачи | Два `loan` с одним `copy_id` без возврата | Ошибка уникального индекса |
| Удаление книги с экземплярами | `DELETE FROM book WHERE id = 1` | Ошибка `RESTRICT` |

Приложите скриншот результата одного удачного и одного неудачного запроса: в кадре нужны текст ошибки и имя ограничения. Если сдаёте файл протокола с выводом, скриншоты не обязательны.

### Шаг 4. Создайте представления

Представления закрывают лишние поля и упрощают отчёты.

```sql
CREATE VIEW v_book_catalog AS
SELECT b.id, b.title, b.author, b.isbn,
       count(c.id) FILTER (WHERE c.status = 'available') AS available_copies
FROM book b
LEFT JOIN copy c ON c.book_id = b.id
GROUP BY b.id, b.title, b.author, b.isbn;

CREATE VIEW v_reader_public AS
SELECT id, full_name, status
FROM reader;

CREATE VIEW v_debtors AS
SELECT r.full_name, l.id AS loan_id, l.due_date,
       current_date - l.due_date AS days_overdue
FROM loan l
JOIN reader r ON r.id = l.reader_id
WHERE l.returned_at IS NULL AND l.due_date < current_date;
```

`v_reader_public` не содержит email, телефона и хеша пароля. Именно её выдают роли, которой не нужны персональные данные.

### Шаг 5. Создайте роли

Три роли покрывают учебный проект. Не создавайте роль на каждого сотрудника: роли описывают работу, а не человека.

```sql
CREATE ROLE lib_reader NOLOGIN;
CREATE ROLE lib_librarian NOLOGIN;
CREATE ROLE lib_admin NOLOGIN;

GRANT SELECT ON v_book_catalog, v_reader_public TO lib_reader;

GRANT SELECT ON v_book_catalog, v_debtors, loan, reservation TO lib_librarian;
GRANT INSERT, UPDATE ON loan, reservation TO lib_librarian;
GRANT SELECT ON book, copy, reader TO lib_librarian;

GRANT ALL PRIVILEGES ON reader, book, copy, loan, reservation, fine, notification TO lib_admin;
GRANT SELECT ON audit_log TO lib_admin;

GRANT USAGE ON SCHEMA public TO lib_reader, lib_librarian, lib_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lib_librarian, lib_admin;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
```

Без `USAGE` на схему роль не увидит даже своё представление, а без прав на последовательности библиотекарь не сможет вставить новую выдачу.

Право `DELETE` не выдавайте библиотекарю: история выдач должна сохраняться. Если запись ошибочна, её помечают статусом, а не удаляют.

### Шаг 6. Составьте матрицу прав

Заполните таблицу по фактическим командам `GRANT`. Клетка содержит операцию или прочерк, если права нет.

| Объект | `lib_reader` | `lib_librarian` | `lib_admin` |
|---|---|---|---|
| `v_book_catalog` | SELECT | SELECT | SELECT |
| `v_reader_public` | SELECT | SELECT | SELECT |
| `v_debtors` | нет | SELECT | SELECT |
| `loan` | нет | SELECT, INSERT, UPDATE | ALL |
| `reservation` | нет | SELECT, INSERT, UPDATE | ALL |
| `reader` | нет | SELECT | ALL |
| `audit_log` | нет | нет | SELECT |
| `schema public` | USAGE | USAGE | USAGE |

Проверьте матрицу на избыточность: если роль читателя может менять `loan`, это ошибка, даже когда приложение такой кнопки не показывает.

### Шаг 7. Проверьте права на практике

Выполните `SET ROLE` и попробуйте запрещённую операцию. Ожидается отказ с кодом `42501`.

```sql
SET ROLE lib_reader;
SELECT * FROM v_book_catalog LIMIT 5;
SELECT * FROM loan LIMIT 1;
RESET ROLE;
```

Первая команда возвращает строки, вторая завершается ошибкой прав. Зафиксируйте обе в протоколе. Если в общей учебной среде нельзя создавать роли, сохраните команды в скрипте и опишите это как ограничение проверки.

### Шаг 8. Опишите меры безопасности

Соберите таблицу угроз и мер. Мера должна быть привязана к месту реализации, иначе она останется лозунгом.

| Угроза | Мера | Где реализована |
|---|---|---|
| Кража пароля из базы | Хранение только хеша с солью | Поле `password_hash`, расчёт в приложении |
| Чтение чужих данных | Представления без персональных полей | `v_reader_public` |
| Случайное удаление истории | Запрет `DELETE`, статусы вместо удаления | Права ролей, `ON DELETE RESTRICT` |
| Подмена суммы штрафа | Проверка `CHECK amount >= 0` | Ограничение таблицы `fine` |
| Незаметное изменение данных | Журнал аудита | Таблица `audit_log`, запись из приложения |
| Перехват трафика | Шифрование канала | HTTPS и SSL для подключения к базе |
| Потеря данных | Резервная копия и проверка восстановления | Регламент эксплуатации |

### Шаг 9. Соберите отчёт

В отчёт включите `schema.sql`, таблицу проверок ограничений, матрицу прав, протокол проверки ролей и таблицу мер безопасности. Поясните, почему библиотекарю не выдали `DELETE` и почему читатель работает через представление, а не через таблицу `reader`.

## Что сдать

- SQL-скрипт `schema.sql` с таблицами, ключами, ограничениями, индексами и представлениями.
- Скрипт ролей и прав.
- Матрицу прав по трём ролям.
- Протокол проверки ограничений и прав с результатами.
- Таблицу угроз и мер безопасности.
- Пояснение решений по доступу.

## Критерии оценки

| Критерий | Баллы | Что проверяется |
|---|---|---|
| Схема | 25 | Таблицы, ключи и связи соответствуют ER-модели |
| Ограничения | 25 | Правила предметной области проверяются базой |
| Роли и права | 25 | Матрица совпадает с `GRANT`, избыточных прав нет |
| Проверки | 15 | Ограничения и права проверены, результаты зафиксированы |
| Безопасность | 10 | Меры привязаны к объектам, угрозы не пересказаны |

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Зачем проверять правило выдачи уникальным индексом, если проверка уже есть в приложении?
2. Почему библиотекарю не выдают право `DELETE` на таблицу выдач?
3. Что скрывает представление `v_reader_public` и от кого?
4. Чем `ON DELETE RESTRICT` отличается от `ON DELETE CASCADE` для книг и экземпляров?
5. Как матрица прав помогает найти избыточные разрешения?

</div>
