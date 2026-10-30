---
title: Практика 10. Аудит и безопасность
dek: "Включаем general log и триггерный аудит «Деканата», читаем события и проверяем права, пароли и доступ к дампам."
chapter: "Практика 10"
minutes: 180
level: СПО
glyph: П10
outcomes:
  - Включать general log MySQL и читать события из mysql.general_log
  - Создавать триггерную таблицу аудита и разбирать изменения строк
  - Проверять привилегии через SHOW GRANTS и находить избыточные права
  - Находить риски доступа, секретов и дампов и предлагать меры
---

## Цель работы

Аудит нужен не для отчёта, а для ответа на вопрос, кто и что сделал с данными. Без журнала инцидент разбирают по догадкам, а доступ приложения к журналу превращает защиту в формальность. Цель работы: включить аудит учебной базы «Деканат», собрать события по тестовым изменениям и проверить защиту доступа, секретов и самого журнала.

Результат работы это настройки аудита, выгрузка событий, ограничение прав и список рисков с мерами, включая проверку учебной настройки XAMPP с входом `root` без пароля.

## Оборудование и программное обеспечение

- Персональный компьютер с Windows 10 и XAMPP 8.5.12.
- Панель XAMPP Control Panel с запущенными Apache и MySQL, phpMyAdmin по адресу `http://localhost/phpmyadmin`.
- Клиент `mysql`, утилита `mysqldump.exe`, конфигурация `.../xampp/mysql/bin/my.ini`.
- PowerShell и текстовый редактор.
- Учебная база `dean` с таблицами `students`, `enrollments`, `payments` и `audit_log`.
- Пользователи `root` и `dean_app`, роли `dean_read`, `dean_write`, `student_read`, `auditor`.
- Табличный редактор для списка рисков.

SQL-команды выполняются в phpMyAdmin или в клиенте `mysql.exe` под `root`. Операции от имени приложения выполняются отдельной сессией `mysql.exe -u dean_app -p dean`.

## Краткие теоретические сведения

### Два источника событий

**General log** пишет то, что видит сервер: подключения, текст операторов, ошибки. При `log_output = 'TABLE'` записи попадают в таблицу `mysql.general_log` с полями `event_time`, `user_host`, `thread_id`, `command_type` и `argument`. Журнал удобен для разбора инцидента, но не знает смысла изменения: в нём есть оператор, а не строка таблицы до и после.

**Триггерный аудит** пишет события в обычную таблицу `audit_log`. Триггер видит старые и новые значения строки, поэтому отвечает на вопрос, что именно изменилось. Таблица живёт в базе, её можно выгрузить запросом и ограничить правами.

| Источник | Что фиксирует | Где хранится | Ограничение |
|---|---|---|---|
| General log | Подключения, операторы, ошибки | Таблица `mysql.general_log` | Нет старых и новых значений, растёт быстро |
| Триггерная таблица | Изменения строк с деталями | Таблица `audit_log` | Нужен триггер на каждую таблицу |
| Журнал ошибок MySQL | Сбои сервера и запуск | Файл в `.../xampp/mysql/data` | Не содержит операторов клиентов |

### Что делает событие пригодным для разбора

Событие отвечает на пять вопросов: кто, когда, что, над каким объектом, с каким результатом. Поэтому в `audit_log` есть пользователь, время, действие, имя таблицы, идентификатор строки и подробности в JSON.

В триггере `CURRENT_USER()` вернёт владельца, а не клиента: триггер выполняется с правами своего создателя. Клиента возвращает `USER()`: это учётная запись, под которой установлено соединение.

### Защита журнала

Журнал аудита защищают тремя мерами. Первая: отдельная роль `auditor` только на чтение. Вторая: запрет `UPDATE` и `DELETE` для приложения. Третья: отсутствие прямого `INSERT` у приложения, запись идёт через триггер с правами владельца. Если приложение может править журнал, аудит не доказывает ничего.

### Доступ, секреты и копии

В XAMPP пользователь `root` по умолчанию входит без пароля. Это удобно на учебной машине и опасно на любой другой: полный доступ получает любой процесс и любой человек за этим компьютером. Приложение должно ходить в базу под `dean_app`, а `root` нужен только администратору.

Строка подключения с паролем в коде, в `appsettings.json` или в истории PowerShell это утечка при первом копировании проекта. Дамп тоже секрет: файл в `.../xampp/htdocs` открывается по адресу `http://localhost/dean.sql` без пароля.

## Ход работы

Первой строкой каждого вывода печатайте фамилию и группу: в MySQL это `SELECT 'Иванов И.И., ИС-41' AS student;`, в PowerShell `Write-Host "Иванов И.И., ИС-41"`.

### Шаг 1. Включите general log

Переключите вывод журнала в таблицу и включите запись. Настройки через `SET GLOBAL` действуют до перезапуска сервера.

```sql
SET GLOBAL log_output = 'TABLE';
SET GLOBAL general_log = 'ON';

SHOW VARIABLES LIKE 'general_log%';
SHOW VARIABLES LIKE 'log_output';
```

Чтобы настройка пережила перезапуск, добавьте строки в секцию `[mysqld]` файла `.../xampp/mysql/bin/my.ini` и перезапустите MySQL из панели XAMPP.

```ini
[mysqld]
general_log = 1
log_output = TABLE
```

Приложите скриншот `SHOW VARIABLES`: в кадре видны `general_log` со значением `ON` и `log_output` со значением `TABLE`. Пока журнал включён, не меняйте пароли: оператор попадёт в журнал открытым текстом.

### Шаг 2. Прочитайте события general log

Выполните несколько запросов от `dean_app` и найдите их в таблице. Собственный `SELECT` по журналу тоже попадёт в журнал, это нормально.

```sql
SELECT event_time, user_host, thread_id, command_type, LEFT(argument, 120) AS argument
FROM mysql.general_log
ORDER BY event_time DESC
LIMIT 20;
```

```sql
SELECT user_host, command_type, COUNT(*) AS events
FROM mysql.general_log
GROUP BY user_host, command_type
ORDER BY events DESC;
```

Приложите скриншот общего журнала: в кадре видны время, пользователь с хостом и текст хотя бы одного оператора `Query`. Сравните запись `user_host` с той учётной записью, под которой вы работали, и запишите в отчёт, какие сведения даёт общий журнал и каких ему не хватает.

Очистить журнал можно только при выключенной записи.

```sql
SET GLOBAL general_log = 'OFF';
TRUNCATE TABLE mysql.general_log;
SET GLOBAL general_log = 'ON';
```

### Шаг 3. Создайте триггеры аудита

Таблица `audit_log` уже есть в базе. В MySQL один триггер обслуживает одно событие, поэтому нужны три. Тело из одного оператора не требует смены разделителя, поэтому скрипт работает и в phpMyAdmin, и в клиенте.

```sql
USE dean;

DROP TRIGGER IF EXISTS students_ai;
DROP TRIGGER IF EXISTS students_au;
DROP TRIGGER IF EXISTS students_ad;

CREATE TRIGGER students_ai AFTER INSERT ON students
FOR EACH ROW
INSERT INTO audit_log(db_user, action, table_name, row_id, details)
VALUES (USER(), 'INSERT', 'students', CAST(NEW.id AS CHAR),
        JSON_OBJECT('new', JSON_OBJECT('full_name', NEW.full_name,
                                       'email', NEW.email,
                                       'group_id', NEW.group_id)));

CREATE TRIGGER students_au AFTER UPDATE ON students
FOR EACH ROW
INSERT INTO audit_log(db_user, action, table_name, row_id, details)
VALUES (USER(), 'UPDATE', 'students', CAST(NEW.id AS CHAR),
        JSON_OBJECT('old', JSON_OBJECT('full_name', OLD.full_name, 'email', OLD.email),
                    'new', JSON_OBJECT('full_name', NEW.full_name, 'email', NEW.email)));

CREATE TRIGGER students_ad AFTER DELETE ON students
FOR EACH ROW
INSERT INTO audit_log(db_user, action, table_name, row_id, details)
VALUES (USER(), 'DELETE', 'students', CAST(OLD.id AS CHAR),
        JSON_OBJECT('old', JSON_OBJECT('full_name', OLD.full_name, 'email', OLD.email)));
```

Проверьте, что триггеры созданы и что владелец у них администратор.

```sql
SELECT trigger_name, event_manipulation, action_timing, definer
FROM information_schema.TRIGGERS
WHERE event_object_schema = 'dean' AND event_object_table = 'students';
```

### Шаг 4. Выполните тестовые изменения

Сделайте три операции от имени приложения. Для проверки нужен пользователь, у которого есть права на `students`, но нет права менять `audit_log`.

```powershell
& mysql -u dean_app -p --default-character-set=utf8mb4 dean
```

```sql
INSERT INTO students(full_name, group_id, email)
VALUES ('Тестов Тест Тестович', 1, 'test.audit@example.ru');

UPDATE students SET email = 'test.audit2@example.ru'
WHERE email = 'test.audit@example.ru';

DELETE FROM students WHERE email = 'test.audit2@example.ru';
```

Прочитайте журнал отдельной сессией `root`: приложению чтение журнала не нужно.

```sql
SELECT id, at, db_user, action, table_name, row_id,
       JSON_UNQUOTE(JSON_EXTRACT(details, '$.old.email')) AS old_email,
       JSON_UNQUOTE(JSON_EXTRACT(details, '$.new.email')) AS new_email
FROM audit_log
ORDER BY id DESC
LIMIT 10;
```

Приложите скриншот событий: в кадре видны три действия `INSERT`, `UPDATE`, `DELETE`, пользователь `dean_app` и значения `old` и `new` хотя бы для одного изменения.

### Шаг 5. Защитите журнал от изменения

Сначала посмотрите, как выданы права. Если у приложения есть права на всю базу `dean.*`, отзыв на отдельную таблицу ничего не изменит: привилегии складываются. Тогда отзовите широкое право и выдайте права по таблицам.

```sql
SHOW GRANTS FOR 'dean_app'@'localhost';
```

```sql
REVOKE ALL PRIVILEGES ON dean.* FROM 'dean_app'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE ON dean.students TO 'dean_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON dean.enrollments TO 'dean_app'@'localhost';
GRANT SELECT, INSERT ON dean.payments TO 'dean_app'@'localhost';
GRANT SELECT, INSERT ON dean.maintenance_runs TO 'dean_app'@'localhost';
GRANT SELECT ON dean.groups TO 'dean_app'@'localhost';
GRANT SELECT ON dean.courses TO 'dean_app'@'localhost';

GRANT SELECT ON dean.audit_log TO auditor;
```

Запись в журнал продолжит работать, потому что триггер выполняется с правами владельца и приложению прямой `INSERT` в `audit_log` не нужен. Проверьте запрет от имени приложения: ошибка прав и есть доказательство того, что мера работает.

```powershell
& mysql -u dean_app -p dean -e "UPDATE audit_log SET action = 'x' WHERE id = 1;"
```

Ожидаемый ответ: `ERROR 1142 (42000): UPDATE command denied to user 'dean_app'@'localhost' for table 'audit_log'`. Затем повторите `INSERT` в `students` от `dean_app` и убедитесь, что изменение прошло, а событие появилось.

### Шаг 6. Проверьте привилегии через SHOW GRANTS

Соберите права приложения, роли и список учётных записей. Суперпользователь, `GRANT OPTION` и права на все базы у прикладной роли это избыточные привилегии.

```sql
SHOW GRANTS FOR 'dean_app'@'localhost';
SHOW GRANTS FOR auditor;
SELECT user, host FROM mysql.user ORDER BY user, host;
```

Приложите скриншот `SHOW GRANTS` для `dean_app`: в кадре видно, что права выданы по таблицам базы `dean`, а на `audit_log` их нет. Заполните таблицу ожиданий и сравните с фактическим результатом.

| Роль | Назначение | Ожидаемые права | Фактические права | Расхождение |
|---|---|---|---|---|
| `dean_read` | Чтение данных | `SELECT` на таблицы `dean` |  |  |
| `dean_write` | Изменение данных | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |  |  |
| `student_read` | Свои данные | `SELECT` на представление или таблицу |  |  |
| `auditor` | Разбор инцидентов | `SELECT` на `audit_log` |  |  |
| `dean_app` | Приложение | Только необходимые операции в `dean` |  |  |

### Шаг 7. Проверьте вход root без пароля

Попробуйте подключиться без пароля. Успешный вход означает, что любая программа на машине получает полный доступ к серверу.

```powershell
& mysql -u root -e "SELECT CURRENT_USER() AS who, VERSION() AS version;"
```

Если соединение установилось, зафиксируйте риск и предложите меру: задать пароль командой `ALTER USER 'root'@'localhost' IDENTIFIED BY '...';` и прописать его в `.../xampp/phpMyAdmin/config.inc.php`, иначе phpMyAdmin перестанет подключаться. Пароль администратора не храните в отчёте.

Приложите скриншот одного подтверждённого риска: вход `root` без пароля или дамп, открытый по HTTP. Кадр должен показывать сам факт доступа, а не только текст команды.

### Шаг 8. Проверьте доступ к дампам

Снимите дамп базы в отдельный каталог и посмотрите, кто может его прочитать. Ключ записи в файл надёжнее перенаправления вывода: PowerShell записал бы файл в UTF-16 и сломал кодировку.

```powershell
New-Item -ItemType Directory -Force .../dean/backup | Out-Null
& mysqldump -u root --single-transaction --routines --triggers `
  --default-character-set=utf8mb4 --result-file=.../dean/backup/dean.sql dean

Get-ChildItem .../dean/backup/dean.sql | Select-Object Name, Length, LastWriteTime
icacls .../dean/backup/dean.sql
Select-String -Path .../dean/backup/dean.sql -Pattern 'INSERT INTO' | Select-Object -First 3
```

Проверьте, что дамп содержит данные: строки `INSERT INTO` с почтой студентов это подтверждают. Затем проверьте доступ через веб-сервер: скопируйте файл в `.../xampp/htdocs` и откройте `http://localhost/dean.sql`. Если браузер показывает текст дампа, это критический риск. После проверки удалите копию из `htdocs`.

```powershell
Copy-Item .../dean/backup/dean.sql .../xampp/htdocs/dean.sql
Start-Process "http://localhost/dean.sql"
Remove-Item .../xampp/htdocs\dean.sql
```

### Шаг 9. Составьте список рисков

Сведите находки в таблицу. У риска есть источник, влияние, вероятность, мера и остаточный риск после меры.

| Риск | Где обнаружен | Влияние | Вероятность | Мера | Остаточный риск |
|---|---|---|---|---|---|
| `root` без пароля | Проверка входа | Полный доступ к серверу | Высокая | Пароль `root` и запись в `config.inc.php` | Низкий |
| Избыточные права приложения | `SHOW GRANTS` | Изменение любых данных | Средняя | Отозвать лишние привилегии | Низкий |
| Журнал доступен приложению | Права на `audit_log` | Сокрытие следов | Средняя | Запрет `UPDATE` и `DELETE`, чтение через `auditor` | Низкий |
| Дамп в `htdocs` | Проверка по HTTP | Утечка всей базы | Высокая | Хранить вне корня сайта, закрыть правами | Низкий |
| Пароль в коде или истории | Поиск по проекту | Утечка при копировании | Средняя | Файл с паролем вне репозитория, `.gitignore` | Средний |
| Общий журнал включён постоянно | `SHOW VARIABLES` | Рост файла и утечка текста запросов | Средняя | Включать на время разбора | Низкий |
| Журнал без ротации | `audit_log` | Переполнение диска | Средняя | Срок хранения и архивирование | Средний |

Поиск секретов выполните по проекту.

```powershell
Select-String -Path .../dean/src/*/*.cs, .../dean/src/*/*.json -Pattern 'Password|Pwd|secret|token'
```

Каждую находку внесите в список рисков. Если пароль лежит в `appsettings.json` открытым текстом, мера это переменная окружения или файл вне репозитория, а не переименование поля.

### Шаг 10. Выключите общий журнал и оформите отчёт

После разбора выключите запись и сохраните выгрузку событий отдельным файлом.

```sql
SET GLOBAL general_log = 'OFF';

SELECT id, at, db_user, action, table_name, row_id, details
FROM audit_log
ORDER BY id DESC
LIMIT 50;
```

Соберите отчёт из настроек аудита, определений триггеров, выгрузки событий, проверки прав, проверки `root`, доступа к дампу и списка рисков. Для каждого риска укажите, подтверждён он проверкой или остался предположением. Скриншоты шапки отчёта и текста теории не нужны: доказательствами служат кадры с журналом, событиями, правами и подтверждённым риском.

## Что сдать

1. Настройки `general_log` и `log_output` с подтверждением и скриншотом.
2. Скрипт трёх триггеров и выгрузку событий `INSERT`, `UPDATE`, `DELETE`.
3. Скриншот отказа при попытке изменить `audit_log` от имени приложения.
4. Скриншот `SHOW GRANTS` для `dean_app` и заполненную таблицу ожиданий.
5. Результат проверки входа `root` без пароля и проверки дампа по HTTP.
6. Список рисков с мерами и остаточным риском, вывод.

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
- **Настройка общего журнала.** Запись в таблицу включена, события прочитаны и объяснены
- **Триггерный аудит.** Три события, пользователь, старые и новые значения
- **Защита журнала.** Права ограничены, запрет доказан ошибкой доступа
- **Проверка привилегий.** `SHOW GRANTS`, роли и расхождения описаны
- **Риски доступа и дампов.** Риски подтверждены проверкой, меры конкретны
- **Список рисков и отчёт.** Остаточный риск оценён, вывод опирается на находки
## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Чем общий журнал уступает триггерной таблице при разборе изменения строки?
2. Почему в триггере пишут `USER()`, а не `CURRENT_USER()`?
3. Почему приложению не нужно право `INSERT` в таблицу аудита?
4. Чем опасен вход `root` без пароля, если к компьютеру есть доступ у постороннего?
5. Почему дамп в каталоге веб-сервера считается утечкой, даже если ссылку никто не знает?

</div>
