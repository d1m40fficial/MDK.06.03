---
title: Практика 3. База данных и импорт
dek: Создаём базу dkip2027_course, выполняем схему, импортируем шесть заказчиков и доказываем ограничения выгрузкой и восстановлением.
chapter: "Практика 3"
minutes: 180
level: СПО
glyph: П3
outcomes:
  - Создавать базу и таблицы по ER-модели
  - Импортировать JSON и сохранять значения
  - Проверять ограничения и восстанавливать базу
---

## Цель работы

Научиться превращать ER-модель в работающую базу MySQL и загружать в неё данные из JSON без потери значений. Вы создаёте базу `dkip2027_course` в `utf8mb4`, выполняете SQL-скрипт таблиц, импортируете шесть заказчиков из файла `Заказчики.json`, проверяете ведущие нули и ссылочную целостность. Затем делаете выгрузку и восстанавливаете её в отдельную базу.

Итог работы: SQL-скрипт схемы, файл выгрузки, протокол проверок и вывод о том, какие ограничения защищают данные.

## Оборудование и программное обеспечение

- Компьютер с Windows 10 или 11 и XAMPP 8.5.12: Apache, MySQL, phpMyAdmin.
- Браузер для адреса `http://localhost/phpmyadmin`.
- .NET SDK 10 и Visual Studio 2022 Community с рабочей нагрузкой «Разработка классических приложений .NET».
- Текстовый редактор для SQL и JSON, табличный редактор для протокола.
- Свободные порты 80 и 3306. Права администратора Windows не нужны.

## Краткие теоретические сведения

**Сервер и клиент.** MySQL работает как отдельная служба на порту 3306. phpMyAdmin это веб-приложение, которому нужен Apache. Поэтому в XAMPP запускают обе службы. Если Apache остановлен, phpMyAdmin не откроется, хотя база продолжит работать.

**Кодировка.** `utf8mb4` хранит до четырёх байт на символ и вмещает кириллицу, эмодзи и редкие знаки. Старое имя `utf8` в MySQL ограничено тремя байтами. Кодировку задают у базы, таблиц и соединения; иначе сервер перекодирует текст и вернёт знаки вопроса.

**Ограничения.** Первичный ключ различает строки, внешний ключ запрещает ссылку на отсутствующего родителя, `NOT NULL` требует значение, `UNIQUE` запрещает повтор, `CHECK` задаёт диапазон. В MySQL проверки `CHECK` работают с версии 8.0.16, в MariaDB с 10.2. Движок `InnoDB` обеспечивает транзакции и внешние ключи.

**Импорт JSON.** JSON это массив объектов. Каждый объект становится строкой таблицы. Ключ `addres` в источнике записан с опечаткой и сопоставляется со столбцом `address`. Коды заказчиков хранят текстом, иначе `00000008` превратится в `8`. Импорт выполняют программой с параметрами и транзакцией.

**Выгрузка.** Дамп SQL содержит команды создания объектов и вставки данных. Успех выгрузки проверяют восстановлением в пустую базу, а не открытием файла.

<figure class="diagram">
<img src="reports/screens/mysql/connection.png" alt="Параметры подключения к MySQL в phpMyAdmin">
<figcaption>Проверка подключения к MySQL: сервер, порт, база и пользователь видны до запуска SQL-скрипта.</figcaption>
</figure>

## Ход работы

### Шаг 1. Запустите службы и создайте базу

Откройте `C:\xampp\xampp-control.exe`, нажмите `Start` у Apache и MySQL. Обе строки должны стать зелёными. Откройте `http://localhost/phpmyadmin` и войдите под `root` без пароля.

На вкладке `Базы данных` введите имя `dkip2027_course`, выберите сравнение `utf8mb4_unicode_ci` и нажмите `Создать`. Тот же результат даёт команда.

```sql
CREATE DATABASE dkip2027_course
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

SHOW CREATE DATABASE dkip2027_course;
```

В ответе должно быть `utf8mb4_unicode_ci`. Сделайте скриншот создания базы и списка баз, где видно `dkip2027_course`.

<figure class="diagram">
<img src="reports/screens/mysql/db-create.png" alt="Создание базы dkip2027_course в phpMyAdmin">
<figcaption>Форма создания базы: поле имени и группа сравнений utf8mb4.</figcaption>
</figure>

### Шаг 2. Выполните SQL-схему

Выберите базу `dkip2027_course`, откройте вкладку `SQL` и выполните скрипт. Он создаёт семь основных таблиц в порядке от родителей к зависимым. Если ваша ER-модель содержит другие имена, сохраните свои, но проверьте те же ключи и ограничения.

```sql
USE dkip2027_course;

CREATE TABLE counterparty (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  inn VARCHAR(20) NOT NULL,
  address VARCHAR(500) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  party_type VARCHAR(24) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE item (
  id INT AUTO_INCREMENT NOT NULL,
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  unit VARCHAR(16) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT ck_item_kind CHECK (kind IN ('product','material','operation'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE price (
  item_id INT NOT NULL,
  valid_from DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (item_id, valid_from),
  CONSTRAINT fk_price_item FOREIGN KEY (item_id) REFERENCES item(id),
  CONSTRAINT ck_price_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE specification (
  id INT AUTO_INCREMENT NOT NULL,
  product_id INT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  output_qty DECIMAL(14,3) NOT NULL,
  manufacturer_id VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_spec_product FOREIGN KEY (product_id) REFERENCES item(id),
  CONSTRAINT fk_spec_maker FOREIGN KEY (manufacturer_id) REFERENCES counterparty(id),
  CONSTRAINT ck_spec_output CHECK (output_qty > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE specification_component (
  specification_id INT NOT NULL,
  item_id INT NOT NULL,
  qty DECIMAL(14,3) NOT NULL,
  time_norm DECIMAL(14,3) NOT NULL,
  PRIMARY KEY (specification_id, item_id),
  CONSTRAINT fk_comp_spec FOREIGN KEY (specification_id) REFERENCES specification(id),
  CONSTRAINT fk_comp_item FOREIGN KEY (item_id) REFERENCES item(id),
  CONSTRAINT ck_comp_qty CHECK (qty > 0),
  CONSTRAINT ck_comp_time CHECK (time_norm > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE customer_order (
  id INT AUTO_INCREMENT NOT NULL,
  doc_no VARCHAR(64) UNIQUE NOT NULL,
  doc_date DATE NOT NULL,
  customer_id VARCHAR(32) NOT NULL,
  executor_id VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES counterparty(id),
  CONSTRAINT fk_order_executor FOREIGN KEY (executor_id) REFERENCES counterparty(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE customer_order_line (
  id INT AUTO_INCREMENT NOT NULL,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  source_code VARCHAR(64) NOT NULL,
  qty DECIMAL(14,3) NOT NULL,
  sale_price DECIMAL(14,2) NOT NULL,
  discount DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_line_order FOREIGN KEY (order_id) REFERENCES customer_order(id),
  CONSTRAINT fk_line_product FOREIGN KEY (product_id) REFERENCES item(id),
  CONSTRAINT ck_line_qty CHECK (qty > 0),
  CONSTRAINT ck_line_price CHECK (sale_price >= 0),
  CONSTRAINT ck_line_discount CHECK (discount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Скрипт не удаляет существующие таблицы. Если он остановился на середине, прочитайте ошибку, исправьте команду и выполните остаток. Повторный запуск с начала создаст ошибку `table already exists`, и это нормально.

### Шаг 3. Проверьте таблицы и ключи

Список таблиц и внешних ключей проверяют запросами, а не только глазами.

```sql
SELECT table_name, engine, table_collation
FROM information_schema.tables
WHERE table_schema = 'dkip2027_course'
ORDER BY table_name;

SELECT table_name, constraint_name, referenced_table_name
FROM information_schema.KEY_COLUMN_USAGE
WHERE table_schema = 'dkip2027_course'
  AND referenced_table_name IS NOT NULL
ORDER BY table_name, constraint_name;
```

Все семь таблиц должны быть в `InnoDB` и `utf8mb4_unicode_ci`. В списке связей должны быть `customer_order` с двумя ссылками на `counterparty`, `customer_order_line` со ссылками на заказ и изделие, `specification_component` со ссылками на спецификацию и ресурс.

<figure class="diagram">
<img src="reports/screens/mysql/db-tables.png" alt="Таблицы учебной базы dkip2027_course">
<figcaption>Пример списка таблиц учебной базы: все объекты InnoDB, кодировка utf8mb4.</figcaption>
</figure>

На снимке показана полная учебная база; в этой работе созданы семь таблиц, остальные появятся в следующих работах.

### Шаг 4. Загрузите контрольный набор

Чтобы следующая работа считала стоимость, добавьте данные документов. Сначала два служебных контрагента: заказчик и исполнитель из заказа покупателя. Затем ресурсы, цены, спецификацию, состав и сам заказ.

```sql
INSERT INTO counterparty (id, name, inn, address, phone, party_type) VALUES
('DOC-CUSTOMER', 'ИП Томилин Александр Сергеевич', '', '', '', 'Покупатель'),
('DOC-MAKER', 'ООО ТД «Вершина»', '', '', '', 'Производитель');

INSERT INTO item (id, code, name, kind, unit) VALUES
(1, 'НФ-00000006', 'Стол кухонный «Самобранка»', 'product', 'шт'),
(2, 'МАТ-01', 'Столешница корпус', 'material', 'шт'),
(3, 'МАТ-02', 'Кромка ПВХ 0,4х20', 'material', 'м'),
(4, 'МАТ-03', 'Кромка ПВХ 2х20', 'material', 'м'),
(5, 'МАТ-04', 'Евровинт 7х50', 'material', 'тыс. шт'),
(6, 'МАТ-05', 'Опора', 'material', 'шт'),
(7, 'ОП-01', 'Сборка кухни', 'operation', 'ч'),
(8, 'ОП-02', 'Распиловка, кромление, присадка', 'operation', 'ч'),
(9, 'ОП-03', 'Упаковка', 'operation', 'ч');

INSERT INTO price (item_id, valid_from, amount) VALUES
(2, '2026-04-01', 3250.00),
(3, '2026-04-01', 95.00),
(4, '2026-04-01', 140.00),
(5, '2026-04-01', 595.00),
(6, '2026-04-01', 220.00),
(7, '2026-04-01', 1400.00),
(8, '2026-04-01', 450.00),
(9, '2026-04-01', 950.00);

INSERT INTO specification (id, product_id, name, output_qty, manufacturer_id)
VALUES (1, 1, 'Стол кухонный «Самобранка»', 1, 'DOC-MAKER');

INSERT INTO specification_component (specification_id, item_id, qty, time_norm) VALUES
(1, 2, 1.000, 1.000),
(1, 3, 2.000, 1.000),
(1, 4, 4.000, 1.000),
(1, 5, 0.012, 1.000),
(1, 6, 4.000, 1.000),
(1, 7, 1.000, 0.750),
(1, 8, 1.000, 1.500),
(1, 9, 1.000, 0.500);

INSERT INTO customer_order (id, doc_no, doc_date, customer_id, executor_id)
VALUES (1, '1', '2026-04-22', 'DOC-CUSTOMER', 'DOC-MAKER');

INSERT INTO customer_order_line
(id, order_id, product_id, source_code, qty, sale_price, discount)
VALUES (1, 1, 1, 'ФР-00000034', 2, 14120.00, 1412.00);
```

Проверьте, что заказ ссылается на существующих контрагентов и изделие.

```sql
SELECT o.id, o.doc_no, o.doc_date, o.customer_id, o.executor_id
FROM customer_order o;

SELECT l.id, l.qty, l.sale_price, l.discount
FROM customer_order_line l WHERE l.order_id = 1;
```

### Шаг 5. Импортируйте JSON

Создайте консольное приложение и добавьте драйвер.

Перед запуском откройте файл в текстовом редакторе и убедитесь, что корень это массив, а в каждом объекте есть шесть ключей. Если файл начинается с объекта, `EnumerateArray` завершится ошибкой. Если ключ `addres` переименован, `GetProperty` выбросит исключение, и транзакция не зафиксируется.

```powershell
dotnet new console -n JsonImport
cd JsonImport
dotnet add package MySqlConnector
```

Замените `Program.cs`. Программа читает путь из аргумента, разбирает массив и выполняет параметризованные вставки в одной транзакции.

```csharp
using System.Text.Json;
using MySqlConnector;

var path = args.Length > 0 ? args[0] : "Заказчики.json";
var cs = Environment.GetEnvironmentVariable("DKIP_CONNECTION")
    ?? "Server=127.0.0.1;Database=dkip2027_course;User ID=root;Password=;Character Set=utf8mb4";

await using var conn = new MySqlConnection(cs);
await conn.OpenAsync();
await using var tx = await conn.BeginTransactionAsync();

using var json = JsonDocument.Parse(await File.ReadAllTextAsync(path));
var imported = 0;

foreach (var x in json.RootElement.EnumerateArray())
{
    await using var cmd = new MySqlCommand("""
        INSERT INTO counterparty (id, name, inn, address, phone, party_type)
        VALUES (@id, @name, @inn, @address, @phone, @type)
        """, conn, tx);

    cmd.Parameters.AddWithValue("@id", x.GetProperty("id").GetString());
    cmd.Parameters.AddWithValue("@name", x.GetProperty("name").GetString());
    cmd.Parameters.AddWithValue("@inn", x.GetProperty("inn").GetString());
    cmd.Parameters.AddWithValue("@address", x.GetProperty("addres").GetString());
    cmd.Parameters.AddWithValue("@phone", x.GetProperty("phone").GetString());
    cmd.Parameters.AddWithValue("@type", x.GetProperty("type").GetString());

    await cmd.ExecuteNonQueryAsync();
    imported++;
}

await tx.CommitAsync();
Console.WriteLine($"Импортировано записей: {imported}");
```

Запустите программу, передав путь к исходному файлу.

```powershell
$env:DKIP_CONNECTION='Server=127.0.0.1;Database=dkip2027_course;User ID=root;Password=;Character Set=utf8mb4'
dotnet run -- "C:\путь\к\Заказчики.json"
```

Ожидаемый вывод: `Импортировано записей: 6`. Если программа остановилась на ошибке, транзакция не зафиксирована, и в таблице не осталось частичных записей. Прочитайте сообщение, исправьте причину и повторите запуск.

### Шаг 6. Проверьте шесть заказчиков и ведущие нули

Сравнивайте значения с JSON, а не только количество строк.

```sql
SELECT COUNT(*) AS json_rows
FROM counterparty
WHERE id NOT LIKE 'DOC-%';

SELECT id, name, inn, phone, party_type
FROM counterparty
WHERE id NOT LIKE 'DOC-%'
ORDER BY id;

SELECT id, CHAR_LENGTH(id) AS id_len
FROM counterparty
WHERE id NOT LIKE 'DOC-%'
ORDER BY id;
```

Ожидается шесть строк. Коды идут в порядке `00000001`, `00000002`, `00000003`, `00000008`, `00000009`, `00000010`, длина каждого равна восьми. Наименования, ИНН и телефоны совпадают с файлом. Если длина кода равна одному, значит код был прочитан как число.

<figure class="diagram">
<img src="reports/screens/mysql/db-import.png" alt="Таблица counterparty после импорта JSON">
<figcaption>Таблица counterparty: шесть исходных кодов и две служебные записи для документов.</figcaption>
</figure>

<figure class="diagram">
<img src="reports/screens/mysql/customers.png" alt="Вкладка Заказчики с импортированными записями">
<figcaption>Вкладка «Заказчики»: шесть записей JSON и две служебные записи, ведущие нули сохранены.</figcaption>
</figure>

### Шаг 7. Проверьте ограничения и ссылочную целостность

Каждое ограничение проверяют реальной попыткой его нарушить. Начните с внешнего ключа: заказ на несуществующего заказчика должен быть отвергнут.

```sql
START TRANSACTION;

INSERT INTO customer_order (doc_no, doc_date, customer_id, executor_id)
VALUES ('TEST-FK', '2026-04-22', '99999999', 'DOC-MAKER');

ROLLBACK;
```

Ожидается ошибка 1452 с текстом `Cannot add or update a child row`. Строка не появляется. Если вставка прошла, внешний ключ не создан.

Проверьте `CHECK` на нулевое количество и `UNIQUE` на повтор кода.

```sql
START TRANSACTION;

INSERT INTO customer_order_line
(order_id, product_id, source_code, qty, sale_price, discount)
VALUES (1, 1, 'TEST-QTY', 0, 14120.00, 0);

ROLLBACK;

START TRANSACTION;

INSERT INTO counterparty (id, name, inn, address, phone, party_type)
VALUES ('00000001', 'Дубль', '', 'Адрес', '+70000000000', 'Покупатель');

ROLLBACK;
```

Первая вставка нарушает `ck_line_qty`, вторая даёт ошибку 1062 `Duplicate entry`. Номера ошибок в MariaDB могут отличаться, но текст содержит имя ограничения или ключа.

Потерянные ссылки ищут запросом. Для исправной базы он возвращает ноль строк.

```sql
SELECT l.id
FROM customer_order_line l
LEFT JOIN customer_order o ON o.id = l.order_id
WHERE o.id IS NULL;

SELECT s.id
FROM specification s
LEFT JOIN item i ON i.id = s.product_id
WHERE i.id IS NULL;
```

### Шаг 8. Сделайте выгрузку и восстановление

Перед выгрузкой создайте представление стоимости. Оно понадобится для сверки, а собственный запрос вы напишете отдельно.

```sql
CREATE VIEW order_cost AS
SELECT o.id AS order_id,
       ROUND(SUM(l.qty / s.output_qty * c.qty * c.time_norm * p.amount), 2) AS total_cost
FROM customer_order o
JOIN customer_order_line l ON l.order_id = o.id
JOIN specification s ON s.product_id = l.product_id
JOIN specification_component c ON c.specification_id = s.id
JOIN price p ON p.item_id = c.item_id
  AND p.valid_from = (
    SELECT MAX(p2.valid_from)
    FROM price p2
    WHERE p2.item_id = c.item_id
      AND p2.valid_from <= o.doc_date
  )
GROUP BY o.id;

SELECT * FROM order_cost;
```

Для заказа 1 представление возвращает `14374.28`. Теперь в phpMyAdmin выберите базу, вкладку `Экспорт`, быстрый метод и формат `SQL`. Сохраните файл `dkip2027-mysql.sql` в папку проекта.

<figure class="diagram">
<img src="reports/screens/mysql/db-export.png" alt="Экспорт базы dkip2027_course в SQL">
<figcaption>Экспорт базы: быстрый метод, формат SQL, структура и данные.</figcaption>
</figure>

Создайте пустую базу `dkip2027_restore`, откройте `Импорт`, выберите файл и выполните его. Затем проверьте структуру, данные и представление.

```sql
SELECT COUNT(*) AS all_rows FROM counterparty;
SELECT COUNT(*) AS json_rows FROM counterparty WHERE id NOT LIKE 'DOC-%';
SELECT id, name FROM counterparty ORDER BY id;
SELECT * FROM order_cost;
```

В восстановленной базе восемь контрагентов, шесть из них исходные, а представление возвращает `14374.28`. Если таблицы есть, а данные пусты, при экспорте не включили данные. Если внешние ключи или представление пропали, не включили структуру.

<figure class="diagram">
<img src="reports/screens/mysql/db-restore.png" alt="Восстановленная база dkip2027_restore">
<figcaption>Восстановленная копия dkip2027_restore: order_cost возвращает 14374.28.</figcaption>
</figure>

### Шаг 9. Соберите протокол

| № | Действие | Команда или запрос | Ожидаемый результат | Факт | Скриншот |
|---|---|---|---|---|---|
| 1 | Запуск служб | XAMPP Control Panel | Apache и MySQL Running | | |
| 2 | Создание базы | `SHOW CREATE DATABASE` | `utf8mb4_unicode_ci` | | 1 |
| 3 | Схема | `information_schema.tables` | Семь таблиц InnoDB | | 2 |
| 4 | Импорт | `dotnet run` | Шесть записей | | |
| 5 | Коды | `CHAR_LENGTH(id)` | Длина 8 у всех | | 3, 4 |
| 6 | Внешний ключ | Вставка `99999999` | Ошибка 1452 | | |
| 7 | `CHECK` и `UNIQUE` | Нулевое количество, повтор кода | Ошибки ограничений | | |
| 8 | Выгрузка | `Экспорт` | Файл SQL | | 5 |
| 9 | Восстановление | `Импорт` | Восемь контрагентов, `14374.28` | | 6 |

### Требования к отчёту

Отчёт содержит цель, версии XAMPP, MySQL и .NET, SQL-скрипт, протокол, шесть скриншотов и вывод. В выводе объясните, почему код заказчика хранится текстом, как транзакция защищает импорт и что доказывает ошибка 1452. Скриншоты шапки отчёта и текста теории не нужны.

## Что сдать

- SQL-скрипт создания базы, семи таблиц, контрольного набора и представления.
- Исходный код программы импорта JSON.
- Файл выгрузки `dkip2027-mysql.sql`.
- Протокол с командами, ожидаемым и фактическим результатом.
- Скриншоты базы, таблиц, импорта, заказчиков, экспорта и восстановления.
- Вывод о ведущих нулях, транзакции и ссылочной целостности.

## Критерии оценки

| Критерий | Баллы | Что проверяется |
|---|---|---|
| База и кодировка | 15 | `dkip2027_course` в `utf8mb4_unicode_ci` |
| Схема и ключи | 25 | Семь таблиц InnoDB, PK, FK, `CHECK`, `NOT NULL` |
| Импорт JSON | 25 | Шесть записей, ведущие нули, значения совпадают |
| Проверка ограничений | 20 | Ошибки 1452, 1062 и `CHECK` воспроизведены |
| Выгрузка и протокол | 15 | Восстановление в пустую базу, итог `14374.28` |

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Почему код заказчика нельзя хранить в `INT`, хотя он состоит из цифр?
2. Что произойдёт с импортом, если убрать транзакцию и программа остановится на третьей записи?
3. Почему произвольный JSON не импортируется через phpMyAdmin напрямую и чем его заменяет программа?
4. Как доказать, что внешний ключ запрещает ссылку на несуществующего заказчика?
5. Зачем выгрузку проверяют восстановлением в отдельную базу, а не открытием файла?
6. Какие значения в JSON допустимо хранить пустой строкой и почему это не `NULL`?

</div>
