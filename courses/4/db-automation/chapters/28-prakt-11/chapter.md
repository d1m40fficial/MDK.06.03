---
title: Практика 11. Миграция
dek: "Добавляем отчество вы в MySQL: прямой и обратный скрипт, версия схемы, проверка на копии и сверка данных."
chapter: "Практика 11"
minutes: 90
level: СПО
glyph: П11
outcomes:
  - Писать прямой и обратный скрипт миграции MySQL
  - Заполнять новый столбец и закрывать его ограничением
  - Проверять миграцию и откат на копии базы
  - Сверять данные до и после изменения схемы
---

## Цель работы

Миграция меняет схему на работающей базе, поэтому ошибка стоит дороже, чем в учебном задании. Цель работы: добавить в таблицу `students` отчество, заполнить его, закрыть обязательностью и ограничением, провести изменение через версию схемы и доказать, что данные не потеряны.

Работа идёт на копии базы, затем на рабочей базе. Обратный скрипт продумывают до запуска прямого: в MySQL изменение структуры нельзя откатить командой `ROLLBACK`, и если откат придумывают после сбоя, данных для него уже может не быть.

## Оборудование и программное обеспечение

- Персональный компьютер с Windows 10 и XAMPP 8.5.12.
- Панель XAMPP Control Panel с запущенными Apache и MySQL, phpMyAdmin по адресу `http://localhost/phpmyadmin`.
- Клиент `mysql` и утилита `mysqldump`.
- PowerShell и текстовый редактор для SQL-файлов.
- Учебная база `dean` с таблицами `students`, `groups`, `enrollments`, `payments` и `schema_version`.
- Свободное место для дампа и копии базы.

## Краткие теоретические сведения

### Версия схемы

Версия схемы это число, которое говорит, какие изменения уже применены. Таблица `schema_version` хранит применённые версии, а скрипт миграции добавляет новую строку после изменения структуры. Номер растёт только вперёд, а перед запуском скрипт сверяет текущий максимум: если версия 2 уже стоит, повторный запуск не нужен.

### DDL в MySQL фиксирует транзакцию неявно

`ALTER TABLE` в MySQL вызывает неявную фиксацию. Открытая транзакция завершается, а `ROLLBACK` после изменения структуры ничего не вернёт. Из этого следуют три правила.

Первое: до миграции снимают дамп и проверяют сценарий на копии. Второе: обратный скрипт пишут заранее и тоже проверяют. Третье: запись версии делают последней, после успешных изменений, чтобы номер не опережал реальную структуру.

### Прямой и обратный скрипт

Прямой скрипт переводит схему из версии 1 в версию 2. Обратный возвращает из версии 2 в версию 1 и удаляет всё, что добавил прямой. Имена файлов начинают с номера миграции, чтобы порядок читался без журнала: `001_add_middle_name_up.sql` и `001_add_middle_name_down.sql` относятся к одному переходу.

Прямой скрипт состоит из четырёх частей: добавить столбец, заполнить его, сделать обязательным, поставить ограничение. Порядок обязателен: `NOT NULL` на пустом столбце упадёт, а ограничение на незаполненных данных не создастся.

### Заполнение и ограничение

Отчество берут из третьего слова полного имени. Функция `SUBSTRING_INDEX(full_name, ' ', 3)` отрезает первые три слова, а внешняя `SUBSTRING_INDEX(..., ' ', -1)` оставляет последнее из них. Если слов меньше трёх, ставится значение `не указано`: пустая строка не пройдёт ограничение.

`VARCHAR(60) NOT NULL` и проверка `CHAR_LENGTH(middle_name) BETWEEN 1 AND 60` закрывают два разных случая. Обязательность не даёт пропустить поле, проверка не даёт записать пустую строку или слишком длинный текст.

### Сверка данных

Сверка сравнивает не только число строк, но и контрольную сумму содержимого: одинаковое количество строк при разных значениях ничего не доказывает. Сумма `CRC32` по строкам не зависит от порядка и не упирается в ограничение `group_concat_max_len`. Такая сумма ловит случайные расхождения, но не заменяет проверку на подлог.

## Ход работы

Первой строкой каждого вывода печатайте фамилию и группу: `SELECT 'Иванов И.И., ИС-41' AS student;`.

### Шаг 1. Зафиксируйте состояние до миграции

Проверьте версию схемы, структуру таблицы и число строк. Если таблица `schema_version` пуста, запишите текущее состояние как версию 1.

```sql
USE dean;

INSERT IGNORE INTO schema_version(version) VALUES (1);

SELECT version, applied_at FROM schema_version ORDER BY version;
DESCRIBE students;
```

```sql
SELECT COUNT(*) AS students FROM students;
SELECT COUNT(*) AS groups FROM groups;
SELECT COUNT(*) AS enrollments FROM enrollments;
SELECT COUNT(*) AS payments FROM payments;

SELECT COUNT(*) AS rows_count,
       SUM(CRC32(CONCAT_WS('|', id, full_name, email))) AS fingerprint
FROM students;
```

Приложите скриншот `DESCRIBE students` и результата сверки. Эти значения станут точкой сравнения, запишите их в отчёт.

### Шаг 2. Сделайте копию базы

Снимите дамп и восстановите его в отдельную базу. Копия нужна, чтобы прогнать миграцию и откат без риска для рабочей базы.

```powershell
New-Item -ItemType Directory -Force .../dean/backup, .../dean/migrations | Out-Null

& mysqldump -u root --single-transaction --routines --triggers `
  --default-character-set=utf8mb4 --result-file=.../dean/backup/dean_before.sql dean

& mysql -u root -e "DROP DATABASE IF EXISTS dean_migration; CREATE DATABASE dean_migration CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
& mysql -u root --default-character-set=utf8mb4 dean_migration -e "source .../dean/backup/dean_before.sql"
```

```sql
SELECT COUNT(*) AS students_in_copy FROM dean_migration.students;
SELECT version FROM dean_migration.schema_version ORDER BY version;
```

Число строк в копии должно совпасть с исходным. Если дамп не восстановился, разберите ошибку до миграции, а не после.

### Шаг 3. Напишите прямой скрипт

Сохраните файл `.../dean/migrations/001_add_middle_name_up.sql`. Скрипт не содержит `USE`: база выбирается при запуске, поэтому один и тот же файл применяется к копии и к рабочей базе.

```sql
ALTER TABLE students
  ADD COLUMN middle_name VARCHAR(60) NULL AFTER full_name;

UPDATE students
SET middle_name = CASE
    WHEN full_name LIKE '% % %'
      THEN SUBSTRING_INDEX(SUBSTRING_INDEX(full_name, ' ', 3), ' ', -1)
    ELSE 'не указано'
  END
WHERE middle_name IS NULL;

ALTER TABLE students
  MODIFY COLUMN middle_name VARCHAR(60) NOT NULL;

ALTER TABLE students
  ADD CONSTRAINT chk_students_middle_name
  CHECK (CHAR_LENGTH(middle_name) BETWEEN 1 AND 60);

INSERT IGNORE INTO schema_version(version) VALUES (2);
```

Перед запуском выполните проверку версии. Если запрос вернул `2`, миграция уже применена и скрипт запускать не нужно.

```sql
SELECT MAX(version) AS current_version FROM schema_version;
```

### Шаг 4. Напишите обратный скрипт

Файл `001_add_middle_name_down.sql` удаляет ограничение, столбец и строку версии. Порядок обратный прямому: сначала снимается ограничение, потом исчезает столбец.

```sql
ALTER TABLE students
  DROP CONSTRAINT chk_students_middle_name;

ALTER TABLE students
  DROP COLUMN middle_name;

DELETE FROM schema_version WHERE version = 2;
```

Если сервер не понимает `DROP CONSTRAINT`, используйте форму `ALTER TABLE students DROP CHECK chk_students_middle_name;`. Обе формы снимают проверку, различие только в версии сервера.

### Шаг 5. Прогоните миграцию на копии

Запустите прямой скрипт на `dean_migration`. Клиентская команда `source` читает файл без перенаправления PowerShell, поэтому кодировка не портится.

```powershell
& mysql -u root --default-character-set=utf8mb4 dean_migration -e "source .../dean/migrations/001_add_middle_name_up.sql"
```

```sql
USE dean_migration;

DESCRIBE students;
SELECT version FROM schema_version ORDER BY version;

SELECT COUNT(*) AS total,
       SUM(middle_name IS NULL) AS nulls,
       SUM(middle_name = 'не указано') AS unknown
FROM students;
```

Приложите скриншот `DESCRIBE students` с новым столбцом и скриншот `schema_version` с версией `2`. Нулевое число значений `NULL` показывает, что заполнение прошло по всем строкам. Ограничение проверьте в каталоге, а не по типу столбца.

```sql
SELECT CONSTRAINT_NAME, CHECK_CLAUSE
FROM information_schema.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'dean_migration';
```

### Шаг 6. Сверьте данные после миграции

Повторите запросы из шага 1 на копии. Контрольная сумма считается по тем же столбцам, поэтому новое поле на неё не влияет: так проверяется сохранность прежних данных.

```sql
SELECT COUNT(*) AS students FROM dean_migration.students;
SELECT COUNT(*) AS groups FROM dean_migration.groups;
SELECT COUNT(*) AS enrollments FROM dean_migration.enrollments;
SELECT COUNT(*) AS payments FROM dean_migration.payments;

SELECT COUNT(*) AS rows_count,
       SUM(CRC32(CONCAT_WS('|', id, full_name, email))) AS fingerprint
FROM dean_migration.students;
```

Заполните таблицу сверки.

| Проверка | До миграции | После миграции | Совпадает |
|---|---|---|---|
| Число строк `students` |  |  |  |
| Число строк `groups` |  |  |  |
| Число строк `enrollments` |  |  |  |
| Число строк `payments` |  |  |  |
| Контрольная сумма `students` |  |  |  |
| Версия схемы | 1 | 2 | Изменилась по плану |

### Шаг 7. Проверьте откат на копии

Запустите обратный скрипт и убедитесь, что столбец исчез, версия вернулась к единице, а данные остались на месте. Откат проверяют на той же копии, где прошла миграция: так видно, что скрипт работает поверх изменённой схемы, а не на пустой базе.

```powershell
& mysql -u root --default-character-set=utf8mb4 dean_migration -e "source .../dean/migrations/001_add_middle_name_down.sql"
```

```sql
USE dean_migration;

DESCRIBE students;
SELECT version FROM schema_version ORDER BY version;

SELECT COUNT(*) AS rows_count,
       SUM(CRC32(CONCAT_WS('|', id, full_name, email))) AS fingerprint
FROM students;
```

Приложите скриншот `DESCRIBE students` без столбца `middle_name`, скриншот версии `1` и контрольную сумму. Сумма должна совпасть с исходной.

### Шаг 8. Примените миграцию к рабочей базе

Повторите прямой скрипт на `dean` и проверьте итог теми же запросами. Перед запуском убедитесь, что копия и откат прошли без ошибок: рабочая база не место для первой попытки.

```powershell
& mysql -u root --default-character-set=utf8mb4 dean -e "source .../dean/migrations/001_add_middle_name_up.sql"
```

```sql
USE dean;

DESCRIBE students;
SELECT version FROM schema_version ORDER BY version;
SELECT COUNT(*) AS total, SUM(middle_name IS NULL) AS nulls FROM students;
```

Приложите скриншот структуры рабочей базы. Если скрипт упал посередине, не правьте схему вручную: восстановите базу из дампа и начните заново с исправленным файлом.

### Шаг 9. Оцените совместимость

Проверьте, что произойдёт со старым приложением, которое вставляет студента без отчества. Новый столбец обязательный и не имеет значения по умолчанию, поэтому запрос должен упасть.

```sql
INSERT INTO students(full_name, group_id, email)
VALUES ('Проверка Совместимости', 1, 'compat@example.ru');
```

Ожидаемая ошибка: `Field 'middle_name' doesn't have a default value`. Ошибка это результат проверки, а не сбой практики. Предложите меру: значение по умолчанию `не указано`, выпуск новой версии приложения вместе с миграцией или заполнение поля в форме. Выберите вариант и объясните выбор в отчёте.

### Шаг 10. Оформите отчёт

Соберите отчёт из состояния до миграции, текстов прямого и обратного скриптов, результатов на копии, таблицы сверки, проверки отката и вывода о совместимости. Укажите версию схемы до и после, число изменённых строк и найденные ограничения. Скриншоты шапки отчёта и теории не нужны: доказательствами служат структура таблицы, версия схемы, сверка и откат.

## Что сдать

1. Файлы `001_add_middle_name_up.sql` и `001_add_middle_name_down.sql`.
2. Скриншоты `DESCRIBE students` до и после миграции.
3. Скриншот `schema_version` с версиями 1 и 2.
4. Таблицу сверки данных до и после.
5. Скриншот отката: столбец удалён, версия вернулась к 1, сумма совпала.
6. Вывод о совместимости со старым приложением и выбранную меру.

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
- **Прямой скрипт.** Столбец, заполнение, обязательность, ограничение и версия
- **Обратный скрипт.** Возвращает структуру и версию, запускается без ошибок
- **Проверка на копии.** Миграция и откат пройдены до рабочей базы
- **Сверка данных.** Число строк и контрольная сумма совпадают
- **Совместимость.** Названо влияние на старые запросы и предложена мера
- **Оформление.** Скриншоты подписаны, версии и значения указаны
## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Почему `ROLLBACK` не отменяет `ALTER TABLE` в MySQL и что из этого следует для плана миграции?
2. Зачем писать обратный скрипт до прямого?
3. Почему `NOT NULL` ставят после заполнения столбца, а не вместе с добавлением?
4. Почему одинакового числа строк недостаточно для сверки данных?
5. Что произойдёт со старым приложением после добавления обязательного столбца без значения по умолчанию?

</div>
