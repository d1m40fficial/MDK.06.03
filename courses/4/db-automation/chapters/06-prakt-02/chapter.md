---
title: Практика 2. Роли и доступ в MySQL
dek: "Строим доступ к «Деканату» на четырёх ролях и доказываем матрицей, что каждая учётная запись видит ровно положенное."
chapter: "Практика 2"
minutes: 90
level: СПО
glyph: П2
outcomes:
  - Создавать роли MySQL и связывать их с учётными записями
  - Выдавать и отзывать привилегии на базу и таблицы
  - Проверять доступ из phpMyAdmin, командной строки и .NET
  - Собирать матрицу прав по фактическим результатам
---

## Цель работы

Права в базе выдают не человеку, а роли, и проверяют не по списку `GRANT`, а попыткой выполнить запрещённое действие. Цель работы: собрать для «Деканата» четыре роли с разными задачами, выдать им минимально достаточные привилегии и доказать результат таблицей проверок.

Вы создаёте роли `dean_read`, `dean_write`, `student_read` и `auditor`, заводите под каждую отдельную учётную запись и проходите по операциям `SELECT`, `INSERT`, `UPDATE`, `DELETE`. Итог: матрица доступа, где каждая клетка подтверждена запросом или сообщением об ошибке.

## Оборудование и программное обеспечение

- Компьютер с XAMPP 8.5.12 и базой `dean` из практики 1.
- phpMyAdmin и клиент `C:\xampp\mysql\bin\mysql.exe`.
- .NET SDK 10 и проект `DeanAdmin` из практики 1.
- Текстовый редактор для скрипта `roles.sql` и табличный редактор для матрицы.

## Краткие теоретические сведения

**Привилегия** это разрешение на действие с объектом. Уровней четыре: глобальный `*.*`, база `dean.*`, таблица `dean.payments`, столбец. Чем уже уровень, тем меньше ущерб от ошибки, поэтому приложению выдают права на базу, а не на весь сервер.

**Роль** в MySQL это учётная запись без пароля: ей выдают привилегии, а затем выдают саму роль пользователю. Роль действует не всегда: в MySQL её назначают ролью по умолчанию при входе или включают командой `SET ROLE`, в MariaDB выданная роль обычно активна сразу. Что активно сейчас, показывает `CURRENT_ROLE()`.

**Привилегии не складываются в уровень доступа.** Учётная запись может читать одну таблицу и не видеть соседнюю. `GRANT` добавляет право, `REVOKE` забирает. Общий `GRANT` на `dean.*` перекрывает точечный `REVOKE`, если выполнить их в обратном порядке, поэтому сначала выдают широкое право, потом отзывают лишнее.

**Новые объекты** попадают под право уровня базы автоматически, а под право на конкретную таблицу нет. Схему фиксируют до выдачи прав: после новой таблицы или `ALTER TABLE` доступ иногда приходится выдавать заново.

**Проверка** идёт от имени проверяемой учётной записи. `root` обходит проверки привилегий, поэтому его результат ничего не говорит о правах приложения. `SHOW GRANTS FOR 'user'@'host'` показывает выданное, `SHOW GRANTS` в сеансе показывает действующее. Право передавать права дальше (`WITH GRANT OPTION`) не выдают никому: иначе учётная запись расширит доступ сама, и матрица перестанет что-либо доказывать.

## Ход работы

### Шаг 1. Зафиксируйте исходное состояние

```sql
SELECT 'Иванов ИС-41' AS student;
SELECT CURRENT_USER();
SELECT user, host FROM mysql.user ORDER BY user, host;
SHOW GRANTS FOR 'dean_app'@'localhost';
```

Запишите, какие права есть у приложения после практики 1: четыре операции на `dean.*` и ничего на другие базы.

### Шаг 2. Создайте роли

```sql
CREATE ROLE 'dean_read', 'dean_write', 'student_read', 'auditor';
SHOW GRANTS FOR 'dean_read';
```

Роль создаётся заблокированной: пароля у неё нет, войти под ней нельзя. Роль это тот же объект `mysql.user`, поэтому её видно в списке учётных записей, а её права читаются командой `SHOW GRANTS`.

### Шаг 3. Выдайте привилегии ролям

```sql
GRANT SELECT ON dean.* TO 'dean_read';
GRANT SELECT, INSERT, UPDATE, DELETE ON dean.* TO 'dean_write';
GRANT SELECT ON dean.groups TO 'student_read';
GRANT SELECT ON dean.courses TO 'student_read';
GRANT SELECT ON dean.audit_log TO 'auditor';
REVOKE DELETE ON dean.* FROM 'dean_write';
SHOW GRANTS FOR 'dean_write';
```

`REVOKE` стоит после общего `GRANT`: платежи нельзя удалять даже роли записи, исправление проводят обратной операцией, а не удалением строки. В выводе `SHOW GRANTS` у `dean_write` останутся `SELECT`, `INSERT` и `UPDATE`.

Роль чтения студентов получает две таблицы поимённо. Можно было выдать `SELECT` на всю базу и отозвать лишнее, но точечная выдача точнее показывает замысел и не открывает новую таблицу сама по себе.

### Шаг 4. Создайте учётные записи и выдайте роли

```sql
CREATE USER 'dean_reader'@'localhost' IDENTIFIED BY 'Reader_2026';
CREATE USER 'student_user'@'localhost' IDENTIFIED BY 'Student_2026';
CREATE USER 'audit_user'@'localhost' IDENTIFIED BY 'Audit_2026';

REVOKE ALL PRIVILEGES ON dean.* FROM 'dean_app'@'localhost';

GRANT 'dean_read' TO 'dean_reader'@'localhost';
GRANT 'student_read' TO 'student_user'@'localhost';
GRANT 'auditor' TO 'audit_user'@'localhost';
GRANT 'dean_write' TO 'dean_app'@'localhost';

SET DEFAULT ROLE ALL TO 'dean_reader'@'localhost', 'student_user'@'localhost',
  'audit_user'@'localhost', 'dean_app'@'localhost';
```

Прямые права, выданные приложению в практике 1, нужно снять. Иначе они останутся в силе вместе с ролью, и отзыв `DELETE` у роли ничего не изменит: сервер проверит прямое право и разрешит удаление. После этой команды права `dean_app` берутся только из роли.

Пароли учебные и лежат в скрипте. На рабочем стенде их генерируют и хранят вне репозитория: скрипт с паролем в системе контроля версий это утечка.

### Шаг 5. Проверьте роли и выданные права

```sql
SELECT 'Иванов ИС-41' AS student;
SHOW GRANTS FOR 'dean_reader'@'localhost';
SHOW GRANTS FOR 'dean_read';
```

Первая команда показывает выданную роль, вторая права самой роли. Затем войдите как `dean_reader`.

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u dean_reader -p dean
```

```sql
SELECT CURRENT_USER(), CURRENT_ROLE();
SHOW GRANTS;
```

Если `CURRENT_ROLE()` вернул `NONE`, роль не активна: выполните `SET ROLE 'dean_read';` и повторите запрос. Причина в том, что роль по умолчанию не назначена или сервер не включил её при входе.

### Шаг 6. Пройдите разрешённые и запрещённые запросы

Выполняйте пары: сначала разрешённый запрос, потом запрещённый. Ошибка и есть доказательство.

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u dean_reader -p dean -e "SELECT 'Иванов ИС-41'; SELECT COUNT(*) FROM students;"
& "C:\xampp\mysql\bin\mysql.exe" -u dean_reader -p dean -e "INSERT INTO groups (name, specialty) VALUES ('ИС-44','09.02.07');"
```

Второй запрос вернёт `ERROR 1142 (42000): INSERT command denied to user 'dean_reader'@'localhost' for table 'groups'`.

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u dean_app -p dean -e "INSERT INTO payments (student_id, amount) VALUES (4, 9000.00);"
& "C:\xampp\mysql\bin\mysql.exe" -u dean_app -p dean -e "DELETE FROM payments WHERE id = 1;"
```

Первый запрос проходит, второй возвращает `ERROR 1142` на таблицу `payments`: приложение получило права `dean_write`, но не право удаления.

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u student_user -p dean -e "SELECT title FROM courses;"
& "C:\xampp\mysql\bin\mysql.exe" -u student_user -p dean -e "SELECT full_name FROM students;"
& "C:\xampp\mysql\bin\mysql.exe" -u audit_user -p dean -e "SELECT COUNT(*) FROM audit_log;"
& "C:\xampp\mysql\bin\mysql.exe" -u audit_user -p dean -e "INSERT INTO audit_log (db_user, action) VALUES ('audit_user','DELETE');"
```

`student_user` видит только справочники, `audit_user` читает журнал и не может в него писать. Сделайте скриншоты успешного и запрещённого запроса: в кадре должны быть команда, имя учётной записи и текст ошибки.

### Шаг 7. Проверьте доступ из phpMyAdmin

Войдите в phpMyAdmin по очереди каждой учётной записью. В дереве видно, какие таблицы доступны: у `student_user` только `courses` и `groups`, у `audit_user` только `audit_log`. Выполните запрещённый запрос на вкладке `SQL` и приложите красное сообщение об ошибке. Список баз в phpMyAdmin тоже полезен: у приложения видна только `dean`.

### Шаг 8. Проверьте доступ из .NET

Добавьте в `DeanAdmin` выбор учётной записи и обработку ошибки.

```csharp
using MySqlConnector;

string user = args.Length > 0 ? args[0] : "dean_app";
string password = Environment.GetEnvironmentVariable("DEAN_DB_PASSWORD") ?? "";

var builder = new MySqlConnectionStringBuilder
{
    Server = "localhost",
    Database = "dean",
    UserID = user,
    Password = password,
    CharacterSet = "utf8mb4"
};

await using var connection = new MySqlConnection(builder.ConnectionString);
await connection.OpenAsync();
Console.WriteLine($"Иванов ИС-41, вход: {user}");

try
{
    await using var command = new MySqlCommand(
        "INSERT INTO payments (student_id, amount) VALUES (4, 9000.00)", connection);
    await command.ExecuteNonQueryAsync();
    Console.WriteLine("Запись добавлена");
}
catch (MySqlException ex)
{
    Console.WriteLine($"Отказано: {ex.Number}, {ex.Message}");
}
```

Запустите приложение под двумя учётными записями.

```powershell
$env:DEAN_DB_PASSWORD = "DeanApp_2026"; dotnet run -- dean_app
$env:DEAN_DB_PASSWORD = "Reader_2026"; dotnet run -- dean_reader
```

От `dean_app` приложение печатает «Запись добавлена», от `dean_reader` печатает код 1142. Код ошибки в отчёте важнее текста: по нему видно, что отказ пришёл от сервера, а не от проверки внутри приложения.

### Шаг 9. Соберите матрицу прав

Заполняйте матрицу по фактическим результатам, а не по тексту скрипта.

| Роль | SELECT | INSERT | UPDATE | DELETE | Объекты |
|---|---|---|---|---|---|
| `dean_read` | Да | Нет | Нет | Нет | Все таблицы `dean` |
| `dean_write` | Да | Да | Да | Нет | Все таблицы, кроме удаления в `payments` |
| `student_read` | Да | Нет | Нет | Нет | `groups`, `courses` |
| `auditor` | Да | Нет | Нет | Нет | `audit_log` |
| `dean_app` | Да | Да | Да | Нет | Как `dean_write` |

### Шаг 10. Сверьте матрицу с проверками

| Учётная запись | Запрос | Ожидаемо | Фактически | Код | Скриншот |
|---|---|---|---|---|---|
| `dean_reader` | `SELECT` из `students` | Успех | | | 1 |
| `dean_reader` | `INSERT` в `groups` | Отказ | | 1142 | 2 |
| `dean_app` | `INSERT` в `payments` | Успех | | | |
| `dean_app` | `DELETE` из `payments` | Отказ | | 1142 | |
| `student_user` | `SELECT` из `students` | Отказ | | 1142 | |
| `audit_user` | `INSERT` в `audit_log` | Отказ | | 1142 | |

### Требования к отчёту

Отчёт содержит скрипт `roles.sql`, матрицу прав, таблицу проверок и скриншоты успешного и запрещённого запроса. В выводе объясните, почему приложение работает не под `root`, зачем нужна отдельная роль чтения и какое право выдавать опаснее всего. Скриншоты шапки отчёта и текста теории не нужны: доказательствами служат только результаты запросов.

## Что сдать

- SQL-скрипт создания ролей, учётных записей и выдачи прав.
- Матрицу доступа по четырём ролям и четырём операциям.
- Таблицу проверок с ожидаемым и фактическим результатом.
- Скриншоты успешного и запрещённого запроса с текстом ошибки.
- Вывод о минимальных привилегиях и об опасных правах.

## Критерии оценки

| Критерий | Баллы | Что проверяется |
|---|---|---|
| Роли | 20 | Четыре роли созданы, права выданы на нужные объекты |
| Учётные записи | 20 | У каждой роли своя запись, роли назначены и активны |
| Отзыв прав | 20 | `DELETE` на `payments` отозван и подтверждён ошибкой |
| Проверки | 30 | Каждая роль проверена разрешённым и запрещённым запросом |
| Матрица и отчёт | 10 | Матрица совпадает с фактическими результатами |

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Почему права выдают роли, а не каждой учётной записи отдельно?
2. Что произойдёт, если выполнить `REVOKE DELETE` до общего `GRANT` на `dean.*`?
3. Почему проверка под `root` не доказывает права приложения?
4. Чем право на `dean.*` отличается от права на `dean.payments` для новой таблицы?
5. Что означает `CURRENT_ROLE() = NONE` и как включить роль в сеансе?
6. Почему код ошибки 1142 убедительнее текста сообщения?

</div>
