---
title: Задание 2. База данных и импорт
dek: Запускаем XAMPP, создаём базу, выполняем схему, загружаем заказчиков и документы через CSV, проверяем ключи и восстанавливаем выгрузку.
chapter: "Задание 2"
level: СПО
glyph: "03"
outcomes:
  - Создавать базу и таблицы MySQL с ограничениями
  - Импортировать заказчиков и документы через CSV без потери значений
  - Проверять внешние ключи, делать выгрузку и восстанавливать её
---

## Что требуется

Создать работающую базу данных предприятия по своей ER-диаграмме и загрузить в неё данные из документов варианта. База называется `dkip2027_course` и создаётся в кодировке `utf8mb4`. В ней должны быть таблицы, первичные и внешние ключи, обязательные поля и проверки значений.

В базу загружаются:

- шесть заказчиков из готового файла `customers.csv`, который уже лежит в папке варианта;
- заказ покупателя, спецификация, состав спецификации и цены из файлов Excel, переведённых в CSV;
- при необходимости производственный заказ, пользователи и заметки, если они есть в вашей модели.

После загрузки нужно проверить, что коды заказчиков сохранили ведущие нули, что внешние ключи не пропускают несуществующие ссылки и что количество строк совпадает с документами. Затем база выгружается в SQL-файл и восстанавливается в пустую базу.

Сдаются SQL-скрипт схемы, файл выгрузки `dkip2027-mysql.sql` и протокол проверок со скриншотами: действие, команда, ожидаемый и фактический результат.

База должна открываться на другом компьютере после восстановления.

## Что понадобится

| Что открыть | Где найти | Зачем |
|---|---|---|
| XAMPP Control Panel | `Пуск`, затем `XAMPP Control Panel` | запуск Apache и MySQL |
| Браузер | ярлык на рабочем столе | phpMyAdmin |
| phpMyAdmin | `http://localhost/phpmyadmin` | создание базы, SQL, импорт и экспорт |
| `customers.csv` | `reports/variants/V01/customers.csv` | шесть заказчиков для импорта |
| `json_to_csv.py` | `reports/scripts/json_to_csv.py` | преобразовать `Заказчики.json` в CSV |
| `resources.csv` | там же | подсказка по ресурсам, нормам и ценам |
| Заказ покупателя.xlsx | папка `variant` | номер, дата, заказчик, изделие и количество |
| Спецификация.xlsx | там же | материалы, операции и нормы |
| Цены.xlsx | там же | цены и дата начала действия |
| Заказ на производство.xlsx | там же | производственный заказ, если он есть в модели |
| Excel или LibreOffice Calc | `Пуск` | просмотр документов и сохранение CSV |
| Блокнот или VS Code | `Пуск` | проверка CSV и SQL-файла |
| ER-диаграмма из задания 1 | папка `task1` | имена таблиц и полей |
| Папка `task2` | ваша рабочая папка | схема, выгрузка, протокол |

Права администратора Windows не нужны.

Файл `customers.csv` в варианте уже подготовлен. В нём шесть строк и столбцы `id`, `name`, `inn`, `address`, `phone`, `party_type`. Код записан текстом, поэтому ведущие нули не теряются. В базовом наборе КИМ вместо CSV лежит `Заказчики.json` с ключом `addres`, но в вариантах для нарешивания используется готовый CSV с правильным именем `address`. Если вы работаете с JSON, переведите его в CSV или загрузите отдельной программой.

## Как устроено задание

MySQL это отдельная служба. Она слушает порт 3306 и хранит данные в своих файлах. phpMyAdmin это веб-приложение, которое открывается в браузере и передаёт команды серверу. Ему нужен Apache, потому что PHP выполняется веб-сервером. Поэтому в XAMPP запускают обе службы: Apache для phpMyAdmin, MySQL для данных.

Если Apache остановлен, phpMyAdmin не откроется, хотя база продолжит работать. Если MySQL остановлен, phpMyAdmin покажет ошибку подключения.

Кодировка задаётся у базы, таблиц и соединения. `utf8mb4` хранит до четырёх байт на символ и вмещает кириллицу, редкие знаки и эмодзи. Старое имя `utf8` в MySQL ограничено тремя байтами. Сравнение `utf8mb4_unicode_ci` не различает регистр и правильно сортирует кириллицу. Главное, чтобы кодировка была одинаковой у базы, таблиц и клиента.

Схема задания повторяет ER-диаграмму. В базовом наборе двенадцать таблиц, для задания 2 достаточно семи основных.

| Таблица | Первичный ключ | Внешние ключи | Что хранит |
|---|---|---|---|
| `counterparty` | `id` | нет | заказчиков, изготовителей, поставщиков |
| `item` | `id` | нет | продукцию, материалы и операции |
| `price` | `item_id`, `valid_from` | `item_id` | историю цен ресурса |
| `specification` | `id` | `product_id`, `manufacturer_id` | шапку спецификации |
| `specification_component` | `specification_id`, `item_id` | `specification_id`, `item_id` | нормы расхода и времени |
| `customer_order` | `id` | `customer_id`, `executor_id` | шапку заказа покупателя |
| `customer_order_line` | `id` | `order_id`, `product_id` | строки заказа |
| `production_order` | `id` | нет | шапку производственного заказа |
| `production_product` | `production_id`, `product_id` | `production_id`, `product_id` | продукцию к выпуску |
| `production_resource` | `production_id`, `item_id` | `production_id`, `item_id` | плановый расход ресурсов |
| `users` | `id` | нет | учётные записи приложения |
| `notes` | `id` | `id_user` | заметки сотрудников |

Ограничение это правило, которое сервер проверяет до записи. Основные виды перечислены в таблице.

| Ограничение | Что запрещает | Пример |
|---|---|---|
| `PRIMARY KEY` | повтор ключа и пустое значение | `id` различает строки |
| `FOREIGN KEY` | ссылку на отсутствующую строку | строка заказа ссылается на заказ |
| `NOT NULL` | пустое значение | имя заказчика обязательно |
| `UNIQUE` | повтор значения | код ресурса не повторяется |
| `CHECK` | значение вне диапазона | количество больше нуля |
| `DEFAULT` | отсутствие значения | дата создания по умолчанию |

Тип выбирают по смыслу. Деньги хранят в `DECIMAL(14,2)`, количество и нормы времени в `DECIMAL(14,3)`. `FLOAT` и `DOUBLE` хранят двоичную дробь, поэтому 0,1 в них не равно 0,1, и сумма из сотни строк может разойтись с ручным расчётом.

Коды заказчиков, ИНН и телефоны хранят текстом. В CSV код выглядит как `001000001`. Если объявить столбец целым, ведущие нули исчезнут: `001000001` станет `1000001`. Если объявить `VARCHAR(32)`, код сохранится символ в символ. Текстовыми также делают ИНН и телефон: ИНН может начинаться с нуля, телефон содержит плюс, а арифметика над ними не нужна.

CSV это текстовый файл: строки разделены переводами строк, поля запятыми, первая строка содержит имена столбцов, поля с запятыми заключены в кавычки. phpMyAdmin вставляет такую строку в выбранную таблицу, поэтому перед импортом выбирайте таблицу, а не базу.

Excel сохраняет книгу в CSV не целиком, а только активный лист. Заголовок, объединённые ячейки и пустые строки в этот лист лучше не переносить. Надёжнее создать новый лист, в первую строку вписать имена столбцов, а данные скопировать значениями. Тогда первая строка CSV совпадёт с полями таблицы.

Порядок импорта зависит от внешних ключей: контрагенты, ресурсы, цены, спецификация, состав, заказ, строки заказа. Если сначала загрузить заказ, сервер откажет: заказчика с таким кодом ещё нет.

Выгрузка это SQL-файл с командами создания объектов и вставки данных. Успех выгрузки проверяют восстановлением в пустую базу, а не открытием файла.

## Пошаговая инструкция

### Шаг 1. Запустите Apache и MySQL

Откройте `Пуск`, найдите `XAMPP Control Panel` и запустите его. В окне список служб, нам нужны `Apache` и `MySQL`. Нажмите кнопку `Start` в строке `Apache`. Через несколько секунд строка станет зелёной, в колонке `Status` появится `Running`. Затем нажмите `Start` в строке `MySQL`. Она тоже должна стать зелёной.

<figure class="diagram">
<img src="reports/screens/mysql/db-start.png" alt="XAMPP Control Panel с запущенными Apache и MySQL">
<figcaption>XAMPP Control Panel: Apache и MySQL в состоянии Running, MySQL слушает порт 3306.</figcaption>
</figure>

Если MySQL не поднимается, нажмите `Netstat` и посмотрите, какая программа держит 3306. Если не поднимается Apache, проверьте порт 80.

### Шаг 2. Откройте phpMyAdmin и войдите

Откройте браузер и перейдите по адресу `http://localhost/phpmyadmin`. Появится страница входа. В поле `Пользователь` введите `root`, поле `Пароль` оставьте пустым, нажмите `Войти`.

<figure class="diagram">
<img src="reports/screens/mysql/connection.png" alt="Вход в phpMyAdmin и параметры подключения">
<figcaption>Вход в phpMyAdmin: сервер localhost, пользователь root, пароль пустой; внизу видна версия сервера и кодировка.</figcaption>
</figure>

После входа откроется главная страница: слева список баз, сверху вкладки `Обзор`, `Структура`, `SQL`, `Импорт`, `Экспорт`, справа основная область.

Если пароль не пустой, попросите учебный пароль у преподавателя. Не меняйте пароль root в середине работы: это заблокирует доступ к базе.

### Шаг 3. Создайте базу dkip2027_course

В левой панели нажмите `Создать БД` (в английской версии `New`). Откроется форма. В поле `Имя базы данных` введите `dkip2027_course`. В списке `Сравнение` выберите `utf8mb4_unicode_ci`. Нажмите `Создать`.

<figure class="diagram">
<img src="reports/screens/mysql/db-create.png" alt="Создание базы dkip2027_course в phpMyAdmin">
<figcaption>Создание базы: имя dkip2027_course и сравнение utf8mb4_unicode_ci.</figcaption>
</figure>

Слева появится новая база, она сразу откроется. В основной области будет написано, что таблиц пока нет.

```sql
CREATE DATABASE dkip2027_course
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

SHOW CREATE DATABASE dkip2027_course;
```

В ответе должно быть `utf8mb4_unicode_ci`. Если сравнение другое, удалите базу и создайте заново: менять кодировку после импорта придётся вместе с данными.

### Шаг 4. Выполните схему во вкладке SQL

Выберите базу `dkip2027_course` в левой панели. Откройте вкладку `SQL`. В большое текстовое поле вставьте скрипт ниже. Кнопка `Выполнить` находится справа внизу под полем.

Скрипт создаёт семь основных таблиц в порядке от родителей к зависимым. Пять остальных таблиц модели (производственный заказ, пользователи и заметки) добавьте позже или создайте сразу по тому же образцу. Порядок важен: справочники раньше зависимых таблиц.

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

После нажатия `Выполнить` phpMyAdmin покажет зелёные сообщения о каждом запросе. Если появилось красное сообщение, прочитайте номер ошибки. `1007` означает, что таблица уже существует. `1064` означает синтаксическую ошибку, чаще всего лишнюю запятую перед закрывающей скобкой. `1215` означает, что внешний ключ не может быть создан: проверьте типы полей и порядок таблиц.

Скрипт не удаляет существующие таблицы. Если он остановился на середине, исправьте ошибку и выполните остаток. Повторный запуск с начала даст `table already exists`, и это нормально.

### Шаг 5. Проверьте таблицы

Обновите левую панель. Внутри базы появится список таблиц. Их должно быть семь. Проверьте это запросом.

```sql
SHOW TABLES;

SELECT table_name, engine, table_collation
FROM information_schema.tables
WHERE table_schema = 'dkip2027_course'
ORDER BY table_name;
```

В ответе семь строк, у всех движок `InnoDB` и сравнение `utf8mb4_unicode_ci`. Движок важен: только `InnoDB` даёт транзакции и внешние ключи.

<figure class="diagram">
<img src="reports/screens/mysql/db-tables.png" alt="Список таблиц базы dkip2027_course">
<figcaption>Список таблиц учебной базы: все объекты InnoDB, кодировка utf8mb4_unicode_ci. На снимке полная база, в этой работе созданы семь таблиц.</figcaption>
</figure>

Если таблиц меньше, найдите в журнале первый красный запрос: скорее всего, он остановился на внешнем ключе.

### Шаг 6. Проверьте первичные и внешние ключи

Щёлкните `price` в левой панели и откройте вкладку `Структура`. У цен первичный ключ состоит из двух полей: `item_id` и `valid_from`. Ниже видно, что `item_id` ещё и внешний ключ на `item.id`.

```sql
SHOW CREATE TABLE price;
SHOW CREATE TABLE customer_order;
SHOW CREATE TABLE specification_component;
```

В ответе должны быть строки `PRIMARY KEY`, `CONSTRAINT ... FOREIGN KEY ... REFERENCES`. Проверьте все связи сразу запросом к служебной базе `information_schema`.

```sql
SELECT table_name, constraint_name, referenced_table_name
FROM information_schema.KEY_COLUMN_USAGE
WHERE table_schema = 'dkip2027_course'
  AND referenced_table_name IS NOT NULL
ORDER BY table_name, constraint_name;
```

В семи основных таблицах получается девять внешних ключей, в полной модели четырнадцать. У `customer_order` два ключа на `counterparty`, у `customer_order_line` два ключа на заказ и изделие, у `specification_component` два ключа на спецификацию и ресурс. Если список пуст, внешние ключи не созданы: проверьте, что таблицы объявлены в `InnoDB` и что скрипт дошёл до конца.

### Шаг 7. Импортируйте заказчиков из customers.csv

Откройте `customers.csv` в блокноте. Первая строка содержит имена столбцов, ниже шесть строк. Коды начинаются с нулей, адреса заключены в кавычки, потому что внутри есть запятые. Ничего в файле не исправляйте.

В phpMyAdmin щёлкните таблицу `counterparty` в левой панели. Откроется её содержимое, пока пустое. Перейдите на вкладку `Импорт`. Нажмите `Выберите файл` и укажите `customers.csv`. В списке форматов выберите `CSV`. Проверьте настройки:

- `Разделитель` содержит запятую;
- `Поля заключены в кавычки` содержит двойную кавычку;
- `Первая строка содержит имена столбцов` отмечена;
- `Кодировка файла` равна `utf-8`.

Нажмите `Выполнить` справа внизу. Появится зелёное сообщение об успешном импорте и число выполненных запросов.

<figure class="diagram">
<img src="reports/screens/mysql/db-import.png" alt="Импорт customers.csv в таблицу counterparty">
<figcaption>Импорт customers.csv: формат CSV, первая строка с именами столбцов, кодировка utf-8.</figcaption>
</figure>

Проверьте результат двумя запросами. Первый считает строки, второй показывает коды и их длину.

```sql
SELECT COUNT(*) AS customers FROM counterparty;

SELECT id, CHAR_LENGTH(id) AS id_len, name, phone
FROM counterparty
ORDER BY id;
```

Должно быть шесть строк. В варианте V01 длина каждого кода равна девяти, в базовом наборе десяти. Главное, что длина одинакова у всех строк и ведущие нули на месте. Если длина равна одному, значит столбец объявлен целым или Excel превратил код в число.

<figure class="diagram">
<img src="reports/screens/mysql/customers.png" alt="Таблица counterparty после импорта customers.csv">
<figcaption>Таблица counterparty после импорта: шесть кодов с ведущими нулями, адреса с запятыми не разорваны.</figcaption>
</figure>

Если phpMyAdmin сообщает о повторяющемся ключе, таблица уже содержит данные. Очистите её командой `TRUNCATE TABLE counterparty;` и повторите импорт. Если весь CSV попал в один столбец, неверно выбран разделитель: вернитесь на вкладку `Импорт` и поставьте тот знак, который стоит в файле.

Если в варианте лежит только `Заказчики.json`, как в КИМ, сначала преобразуйте его в CSV. В папке материалов есть готовый скрипт [json_to_csv.py](reports/scripts/json_to_csv.py). Он использует только стандартную библиотеку Python, сохраняет код текстом и переименовывает ключ `addres` в `address`.

Скачайте скрипт в папку варианта, откройте PowerShell в этой папке и выполните команду.

```powershell
python json_to_csv.py "Заказчики.json" customers.csv
```

В ответе появится `Готово: customers.csv, строк: 6`. Откройте файл в блокноте: первая строка должна быть `id,name,inn,address,phone,party_type`, коды должны начинаться с нулей. Дальше импортируйте `customers.csv` в таблицу `counterparty` тем же способом, что описан выше.

Если Python не установлен, используйте готовый `customers.csv` из папки варианта или преобразуйте JSON в Excel через `Данные`, `Получить данные`, `Из файла`, `Из JSON`. Второй путь медленнее, но не требует программирования.

### Шаг 8. Подготовьте CSV из Excel: ресурсы и цены

Откройте `Спецификация.xlsx` и `Цены.xlsx` в Excel. В спецификации перечислены ресурсы, вид, единица, норма и часы, в ценах те же ресурсы, цена и дата. В варианте V01 материалы это Бязь, Тесьма и Нить, операции это Раскрой и Пошив.

Создайте новый лист Excel и назовите его `items`. В первую строку впишите заголовки `id`, `code`, `name`, `kind`, `unit`. Ниже перенесите значения. Получится такой файл.

```text
id,code,name,kind,unit
1,P-01,Фартук поварской,product,ед.
2,M-01,Бязь,material,м
3,M-02,Тесьма,material,м
4,M-03,Нить,material,м
5,O-01,Раскрой,operation,ч
6,O-02,Пошив,operation,ч
```

Код можно взять из документа, а если его там нет, присвойте свой. Главное, чтобы коды не повторялись. Изделие получает вид `product`, материалы `material`, операции `operation`.

Сохраните лист: `Файл`, затем `Сохранить как`, тип `CSV UTF-8 (разделитель запятая)`, имя `items.csv`. Не сохраняйте исходную книгу целиком: в ней есть заголовок и объединённые ячейки, и первая строка CSV не совпадёт с полями таблицы.

Теперь создайте лист `prices` с заголовками `item_id`, `valid_from`, `amount`.

```text
item_id,valid_from,amount
2,2027-03-01,280.00
3,2027-03-01,25.00
4,2027-03-01,0.40
5,2027-03-01,600.00
6,2027-03-01,800.00
```

Дата берётся из столбца `Действует с` файла цен, в V01 это 01.03.2027. Цена материала идёт за единицу, цена операции за час.

Импортируйте `items.csv` в таблицу `item`, затем `prices.csv` в таблицу `price`. Порядок важен: цена ссылается на ресурс, поэтому ресурс должен существовать раньше. После каждого импорта проверяйте результат.

```sql
SELECT * FROM item ORDER BY id;
SELECT * FROM price ORDER BY item_id, valid_from;
```

Если импорт в `item` не проходит из-за `id`, проверьте, что в CSV есть столбец `id` и что значения не повторяются. Явные значения в автоинкрементном столбце допустимы, сервер подстроит счётчик.

### Шаг 9. Импортируйте заказ, спецификацию и состав

В `customers.csv` есть только заказчики, а в заказе указан исполнитель. В варианте V01 это предприятие, ателье «Стежок». Добавьте его отдельной записью с техническим кодом.

```sql
INSERT INTO counterparty (id, name, inn, address, phone, party_type)
VALUES ('DOC-MAKER', 'Ателье «Стежок»', '', '', '', 'Производитель');
```

Теперь создайте лист `order` с заголовками `id`, `doc_no`, `doc_date`, `customer_id`, `executor_id`.

```text
id,doc_no,doc_date,customer_id,executor_id
1,V01-01,2027-03-15,001000001,DOC-MAKER
```

В поле `doc_date` идёт дата документа, а не срок поставки. В заказе V01 дата 15.03.2027, срок 22.03.2027. Срок в базовую схему не входит, потому что для расчёта стоимости он не нужен. Если хотите его сохранить, добавьте в `customer_order` поле `due_date DATE` и перенесите туда срок.

Создайте лист `spec` с заголовками `id`, `product_id`, `name`, `output_qty`, `manufacturer_id`.

```text
id,product_id,name,output_qty,manufacturer_id
1,1,Фартук поварской,1.000,DOC-MAKER
```

Создайте лист `components` с заголовками `specification_id`, `item_id`, `qty`, `time_norm`.

```text
specification_id,item_id,qty,time_norm
1,2,0.800,1.000
1,3,2.000,1.000
1,4,35.000,1.000
1,5,1.000,0.120
1,6,1.000,0.350
```

Для материалов норма времени не задана, поэтому в `time_norm` стоит `1.000`. Это учебное соглашение: столбец обязательный и должен быть больше нуля. Для операций в `time_norm` переносятся часы из спецификации.

Создайте лист `lines` с заголовками `id`, `order_id`, `product_id`, `source_code`, `qty`, `sale_price`, `discount`.

```text
id,order_id,product_id,source_code,qty,sale_price,discount
1,1,1,P-01,12,0.00,0.00
```

В варианте V01 в заказе указано только количество, без цены продажи и скидки. Столбцы обязательные, поэтому поставьте `0.00`. Если в вашем заказе есть цена и скидка, перенесите их из документа.

Импортируйте файлы по порядку: `spec.csv` в `specification`, `components.csv` в `specification_component`, `order.csv` в `customer_order`, `lines.csv` в `customer_order_line`. Строки заказа требуют и заказ, и изделие, поэтому `lines.csv` идёт последним.

### Шаг 10. Проверьте данные и ограничения

Сначала посмотрите, что получилось. Запрос соединяет заказ, заказчика и строки.

```sql
SELECT o.doc_no, o.doc_date, c.name AS customer, l.qty, l.sale_price
FROM customer_order o
JOIN counterparty c ON c.id = o.customer_id
JOIN customer_order_line l ON l.order_id = o.id;
```

В ответе одна строка: заказ `V01-01`, заказчик Магазин «Стежок-1», количество 12. Если строк больше или меньше, проверьте CSV и код заказчика.

Проверьте количество строк в каждой таблице.

```sql
SELECT COUNT(*) AS customers FROM counterparty WHERE id NOT LIKE 'DOC-%';
SELECT COUNT(*) AS items FROM item;
SELECT COUNT(*) AS prices FROM price;
SELECT COUNT(*) AS components FROM specification_component;
SELECT COUNT(*) AS orders FROM customer_order;
SELECT COUNT(*) AS lines FROM customer_order_line;
```

В примере V01 получается шесть заказчиков, шесть ресурсов, пять цен, пять строк состава, один заказ и одна строка заказа. У вас число ресурсов может быть другим, если в варианте больше материалов или операций.

Теперь проверьте внешний ключ реальной попыткой его нарушить. Заказ на несуществующего заказчика должен быть отвергнут.

```sql
START TRANSACTION;

INSERT INTO customer_order (doc_no, doc_date, customer_id, executor_id)
VALUES ('TEST-FK', '2027-03-15', '99999999', 'DOC-MAKER');

ROLLBACK;
```

Сервер вернёт ошибку 1452 с текстом `Cannot add or update a child row: a foreign key constraint fails`. Строка не появится. Если вставка прошла, внешний ключ не создан или создан на другой столбец.

Проверьте `CHECK` на нулевое количество и `UNIQUE` на повтор кода.

```sql
START TRANSACTION;

INSERT INTO customer_order_line
(order_id, product_id, source_code, qty, sale_price, discount)
VALUES (1, 1, 'TEST-QTY', 0, 0, 0);

ROLLBACK;

START TRANSACTION;

INSERT INTO item (code, name, kind, unit)
VALUES ('P-01', 'Дубль', 'product', 'ед.');

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

### Шаг 11. Сделайте выгрузку SQL

Выберите базу `dkip2027_course` в левой панели, но не отдельную таблицу. Откройте вкладку `Экспорт`. Выберите метод `Быстрый`, формат `SQL`. Убедитесь, что включены структура и данные: в быстром методе они включены по умолчанию. Нажмите `Выполнить`.

<figure class="diagram">
<img src="reports/screens/mysql/db-export.png" alt="Экспорт базы dkip2027_course в SQL">
<figcaption>Экспорт базы: быстрый метод, формат SQL, структура и данные всех таблиц.</figcaption>
</figure>

Браузер скачает файл с именем вида `dkip2027_course.sql`. Переименуйте его в `dkip2027-mysql.sql` и положите в папку `task2`. Откройте файл в блокноте и проверьте две вещи: в нём есть команды `CREATE TABLE` и команды `INSERT INTO`. Если есть только структура, данные не выгрузились. Если есть только вставки, не выгрузилась структура.

Не выгружайте служебную базу `mysql`: для задания нужна только своя база.

### Шаг 12. Восстановите базу в пустую копию

Создайте новую базу `dkip2027_restore` тем же способом, что и первую: `Создать БД`, имя, сравнение `utf8mb4_unicode_ci`, `Создать`. База должна быть пустой, без таблиц.

Выберите `dkip2027_restore` в левой панели. Откройте вкладку `Импорт`. Нажмите `Выберите файл`, укажите `dkip2027-mysql.sql`, формат `SQL`, нажмите `Выполнить`. phpMyAdmin прочитает файл и выполнит команды по порядку.

<figure class="diagram">
<img src="reports/screens/mysql/db-restore.png" alt="Восстановленная база dkip2027_restore">
<figcaption>Восстановленная копия dkip2027_restore: таблицы и шесть заказчиков на месте.</figcaption>
</figure>

Проверьте не только список таблиц, но и данные.

```sql
SHOW TABLES;

SELECT COUNT(*) AS all_customers FROM counterparty;
SELECT COUNT(*) AS json_customers FROM counterparty WHERE id NOT LIKE 'DOC-%';
SELECT id, name FROM counterparty ORDER BY id;
```

В восстановленной базе семь контрагентов: шесть исходных и один технический `DOC-MAKER`. Если таблицы есть, а данные пусты, при экспорте не включили данные. Если внешние ключи пропали, не включили структуру. Если появилась ошибка 1050 `Table already exists`, база не была пустой: удалите таблицы или создайте новую копию с другим именем.

## Команды и приёмы, которые нужны чаще всего

| Действие | Команда или место в интерфейсе | Что получится |
|---|---|---|
| Создать базу | `CREATE DATABASE dkip2027_course CHARACTER SET utf8mb4;` | пустая база |
| Выбрать базу | `USE dkip2027_course;` | команды выполняются в ней |
| Показать таблицы | `SHOW TABLES;` | список таблиц |
| Показать структуру | `SHOW CREATE TABLE price;` | полное определение таблицы |
| Показать поля | `DESCRIBE customer_order;` | типы и ключи по столбцам |
| Показать внешние ключи | запрос к `information_schema.KEY_COLUMN_USAGE` | список связей |
| Посчитать строки | `SELECT COUNT(*) FROM counterparty;` | число строк |
| Проверить длину кода | `SELECT id, CHAR_LENGTH(id) FROM counterparty;` | длина каждого кода |
| Вставить строку | `INSERT INTO ... VALUES (...);` | новая запись |
| Импорт CSV | таблица, вкладка `Импорт`, формат `CSV` | строки в таблице |
| Экспорт базы | база, вкладка `Экспорт`, `Быстрый`, `SQL` | файл выгрузки |
| Восстановление | пустая база, вкладка `Импорт`, файл `SQL` | копия базы |
| Сохранить Excel в CSV | `Файл`, `Сохранить как`, `CSV UTF-8` | текстовый файл |

Два запроса ниже показывают таблицы с кодировкой и все внешние ключи. Они отвечают на большинство вопросов проверяющего.

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

## Частые ошибки

- **Apache не запущен.** phpMyAdmin не открывается, хотя MySQL работает. Запустите Apache и повторите вход.
- **Порт 3306 занят.** MySQL не поднимается, в журнале ошибка о порте. Нажмите `Netstat`, найдите программу и остановите её. Второй сервер запускать не нужно.
- **Код заказчика объявлен числом.** Ведущие нули исчезают, `001000001` становится `1000001`. Объявите столбец `VARCHAR(32)` и повторите импорт.
- **CSV попал в один столбец.** Неверно выбран разделитель. Посмотрите файл в блокноте и поставьте тот же знак в настройках импорта.
- **Импорт выполнен в базу, а не в таблицу.** phpMyAdmin пытается читать CSV как SQL и выдаёт синтаксическую ошибку. Выберите таблицу в левой панели, затем вкладку `Импорт`.
- **Нарушен порядок импорта.** Строка заказа ссылается на заказ, которого ещё нет. Загружайте справочники и шапки раньше строк.
- **Заказчик не найден.** В заказе указан код `001000001`, а в таблице код `1000001` или другой. Сверьте коды запросом.
- **Выгрузка без данных.** В файле только `CREATE TABLE`. Повторите экспорт и включите данные.
- **Восстановление в непустую базу.** Появляется ошибка 1050. Создайте новую пустую базу или удалите старые таблицы.

## Чек-лист перед сдачей

- XAMPP запускает Apache и MySQL, оба статуса `Running`.
- База `dkip2027_course` создана в `utf8mb4_unicode_ci`.
- Семь основных таблиц созданы, движок `InnoDB`.
- У каждой таблицы есть первичный ключ, у связей есть внешние ключи.
- Внешние ключи проверены запросом к `information_schema`.
- Шесть заказчиков импортированы из `customers.csv`.
- Коды заказчиков сохранили ведущие нули, длина кода одинакова у всех строк.
- Заказ, спецификация, состав и цены загружены из CSV.
- Количество строк совпадает с документами варианта.
- Вставка заказа с несуществующим заказчиком отклонена с ошибкой 1452.
- Нулевое количество и повтор кода отклонены ограничениями.
- Выгрузка `dkip2027-mysql.sql` содержит и структуру, и данные.
- Восстановленная база `dkip2027_restore` открывается и содержит те же таблицы и шесть заказчиков.
- В протоколе есть команда, ожидаемый и фактический результат для каждого шага.

Потренируйтесь на вариантах: [Варианты для нарешивания](08-variants.html).
