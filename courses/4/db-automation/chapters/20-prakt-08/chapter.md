---
title: Практика 8. Консольное приложение обслуживания
dek: "Приложение на .NET SDK 10 делает копию и обслуживание базы, пишет журнал и безопасно запускается повторно."
chapter: "Практика 8"
minutes: 90
level: СПО
glyph: П8
outcomes:
  - Писать консольное приложение с аргументами, журналом и кодами возврата
  - Запускать mysqldump из C# через Process.Start
  - Запускать приложение повторно без побочных эффектов
  - Проверять результат копирования и обслуживания по журналу
---

## Цель работы

Ручное обслуживание базы держится на памяти администратора. Пока задач две, их помнят. Когда задач десять и часть выполняется ночью, забытая команда обнаруживается по отсутствию копии. Приложение переносит порядок действий в код, который можно проверить, повторить и поставить в расписание.

Цель работы: написать консольное приложение `DeanMaintenance` на .NET SDK 10, которое проверяет соединение, делает копию базы, обновляет статистику и пишет журнал. Приложение принимает `--dry-run` и возвращает разные коды для успеха, ошибки и неверного аргумента. Вы запустите его дважды и докажете, что повторный запуск не портит данные.

## Оборудование и программное обеспечение

- Персональный компьютер с Windows 10, XAMPP 8.5.12 и запущенными Apache и MySQL.
- База `dean` с учебными данными и пользователь `dean_app` с паролем.
- .NET SDK 10 и Visual Studio 2022 Community, проверка командой `dotnet --version`.
- Пакет `MySqlConnector` из NuGet.
- `mysqldump` и клиент `mysql.exe`.
- Переменная окружения `DEAN_DB_PASSWORD` для пароля.
- Каталог `.../dean/maintenance` для проекта, копий и журнала.

## Краткие теоретические сведения

**Идемпотентность** это свойство операции давать один и тот же результат при повторном выполнении. Для обслуживания это значит: второй запуск не создаёт дубли строк, не ломает копию и не меняет данные. Копия с меткой времени и `ANALYZE TABLE` идемпотентны по своей природе, а `INSERT` без ограничения уникальности и `DROP` без проверки уже нет.

**Код возврата** это число от 0 до 255, которое получает планировщик или человек. Ноль означает успех, любое другое значение означает сбой. Разные коды позволяют отличить причину: 64 это неверный аргумент, 1 это ошибка команды. Соглашение взято из `sysexits.h`, придумывать произвольные числа не нужно.

**`--dry-run`** это режим проверки: приложение печатает действия, которые выполнило бы, но ничего не меняет. Он нужен, чтобы увидеть порядок шагов и пути до первого боевого запуска.

**Журнал** это файл с отметкой времени, шагом и результатом. Он отвечает на вопрос, что именно произошло ночью, когда рядом никого нет. Журнал дописывается, поэтому строки видны и на экране, и в файле.

**`Process.Start`** запускает внешнюю программу из C#. Свойства `ArgumentList` передают аргументы по одному и не требуют ручного экранирования, `RedirectStandardError` позволяет прочитать текст ошибки, `WaitForExitAsync` дожидается завершения. Код возврата чужой программы проверяют обязательно: нулевой код самого приложения при сбое `mysqldump` был бы ложным успехом.

**`mysqldump --single-transaction`** снимает согласованный снимок InnoDB без блокировки таблиц на всё время выгрузки. `--routines` и `--triggers` добавляют процедуры и триггеры, `--result-file` пишет файл без перенаправления оболочки, а значит без риска получить UTF-16.

**`ANALYZE TABLE`** пересобирает статистику распределения значений. Без свежей статистики планировщик оценивает число строк неверно и выбирает плохой план.

**Секрет в окружении.** Пароль не хранят в коде и не передают аргументом командной строки: аргументы видны в списке процессов и остаются в истории. `mysqldump` читает пароль из переменной `MYSQL_PWD`, которую приложение передаёт дочернему процессу через `ProcessStartInfo.Environment`.

## Ход работы

### Шаг 1. Создайте проект

```bat
cd /d .../dean/maintenance
dotnet new console -n DeanMaintenance
cd DeanMaintenance
dotnet add package MySqlConnector
dotnet --version
```

Версия должна начинаться с 10. Проект создаётся с файлом `Program.cs`, остальные файлы трогать не нужно.

### Шаг 2. Напишите приложение

Замените содержимое `Program.cs`.

```csharp
using System.Diagnostics;
using System.Text;
using MySqlConnector;

foreach (string arg in args)
{
    if (arg != "--dry-run")
    {
        Console.Error.WriteLine($"Неизвестный аргумент: {arg}");
        Console.Error.WriteLine("Использование: DeanMaintenance [--dry-run]");
        return 64;
    }
}

bool dryRun = args.Contains("--dry-run");
string root = AppContext.BaseDirectory;
string backupDir = Path.Combine(root, "backups");
string logFile = Path.Combine(root, "logs", "dean-maintenance.log");
Directory.CreateDirectory(backupDir);
Directory.CreateDirectory(Path.GetDirectoryName(logFile)!);

void Log(string message)
{
    string line = $"{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ssZ} {message}";
    Console.WriteLine(line);
    File.AppendAllText(logFile, line + Environment.NewLine, Encoding.UTF8);
}

string? password = Environment.GetEnvironmentVariable("DEAN_DB_PASSWORD");
if (string.IsNullOrEmpty(password))
{
    Log("ERROR не задана переменная DEAN_DB_PASSWORD");
    return 1;
}

var csb = new MySqlConnectionStringBuilder
{
    Server = "localhost", Port = 3306, Database = "dean",
    UserID = "dean_app", Password = password, CharacterSet = "utf8mb4"
};

Log($"START db={csb.Database} user={csb.UserID} dry_run={dryRun}");

try
{
    await using var connection = new MySqlConnection(csb.ConnectionString);
    await connection.OpenAsync();
    await using (var cmd = new MySqlCommand("SELECT 1", connection))
    {
        await cmd.ExecuteScalarAsync();
    }
    Log("CHECK подключение выполнено");

    string stamp = DateTime.UtcNow.ToString("yyyyMMddTHHmmssZ");
    string dumpFile = Path.Combine(backupDir, $"dean_{stamp}.sql");

    if (dryRun)
    {
        Log($"DRY-RUN mysqldump --result-file={dumpFile}");
        Log("DRY-RUN ANALYZE TABLE groups, students, enrollments");
        Log("DONE dry-run");
        return 0;
    }

    var psi = new ProcessStartInfo
    {
        FileName = @"mysqldump",
        RedirectStandardError = true,
        UseShellExecute = false,
        CreateNoWindow = true
    };
    psi.ArgumentList.Add($"--user={csb.UserID}");
    psi.ArgumentList.Add("--host=localhost");
    psi.ArgumentList.Add("--port=3306");
    psi.ArgumentList.Add("--single-transaction");
    psi.ArgumentList.Add("--routines");
    psi.ArgumentList.Add("--triggers");
    psi.ArgumentList.Add("--default-character-set=utf8mb4");
    psi.ArgumentList.Add($"--result-file={dumpFile}");
    psi.ArgumentList.Add(csb.Database!);
    psi.Environment["MYSQL_PWD"] = password;

    using var dump = Process.Start(psi)!;
    string errors = await dump.StandardError.ReadToEndAsync();
    await dump.WaitForExitAsync();
    if (dump.ExitCode != 0)
    {
        Log($"ERROR mysqldump код {dump.ExitCode}: {errors.Trim()}");
        return 1;
    }

    var info = new FileInfo(dumpFile);
    if (!info.Exists || info.Length < 1024)
    {
        Log("ERROR дамп пуст или слишком мал");
        return 1;
    }
    Log($"CHECK дамп {info.Length} байт");

    await using (var cmd = new MySqlCommand("ANALYZE TABLE groups, students, enrollments", connection))
    await using (var reader = await cmd.ExecuteReaderAsync())
    {
        while (await reader.ReadAsync())
            Log($"CHECK {reader.GetString(0)} {reader.GetString(2)}");
    }

    await using (var cmd = new MySqlCommand(
        "SELECT (SELECT COUNT(*) FROM students), (SELECT COUNT(*) FROM enrollments)", connection))
    await using (var reader = await cmd.ExecuteReaderAsync())
    {
        await reader.ReadAsync();
        Log($"CHECK students={reader.GetInt64(0)} enrollments={reader.GetInt64(1)}");
    }

    Log("DONE");
    return 0;
}
catch (MySqlException ex)
{
    Log($"ERROR {ex.Number}: {ex.Message}");
    return 1;
}
catch (Exception ex)
{
    Log($"ERROR {ex.GetType().Name}: {ex.Message}");
    return 1;
}
```

Соберите проект и убедитесь, что ошибок нет.

```bat
dotnet build
```

Приложите скриншот текста `Program.cs` и успешной сборки. Скриншот шапки отчёта не нужен: доказательство это код и результат.

### Шаг 3. Разберите ключевые строки

| Строка | Зачем нужна |
|---|---|
| `return 64` в разборе аргументов | Код неверного аргумента, отличный от общей ошибки |
| `DEAN_DB_PASSWORD` | Пароль не попадает в код и в аргументы |
| `ProcessStartInfo.ArgumentList` | Аргументы передаются по одному, без экранирования |
| `MYSQL_PWD` в `Environment` | `mysqldump` получает пароль, не показывая его в процессе |
| `WaitForExitAsync` и `ExitCode` | Сбой внешней программы не станет ложным успехом |
| `FileInfo.Length` | Пустой дамп не считается копией |
| `ANALYZE TABLE` | Статистика обновляется после изменений |
| `File.AppendAllText` | Журнал дописывается, история не теряется |

### Шаг 4. Проверьте dry-run

```bat
cd bin\Debug\net10.0
set DEAN_DB_PASSWORD=DeanLab2026
DeanMaintenance.exe --dry-run
echo %ERRORLEVEL%
```

Код возврата 0, в выводе строки `START`, `CHECK подключение`, две строки `DRY-RUN` и `DONE`. Каталог `backups` остаётся пустым: если файл появился, режим проверки не сработал. Приложите скриншот вывода с кодом возврата.

### Шаг 5. Выполните первый запуск

```bat
DeanMaintenance.exe
echo %ERRORLEVEL%
dir backups
type logs\dean-maintenance.log
```

Код возврата 0, в каталоге `backups` появится файл `dean_<метка>.sql`, в журнале строки `START`, `CHECK подключение`, `CHECK дамп`, три строки `CHECK groups status` и `CHECK students=`. Приложите скриншот запуска, `echo %ERRORLEVEL%` и хвоста журнала.

Если `mysqldump` вернул ошибку доступа, выдайте пользователю `dean_app` права на чтение и выгрузку.

```sql
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT ON dean.* TO 'dean_app'@'localhost';
FLUSH PRIVILEGES;
```

### Шаг 6. Запустите приложение второй раз

Сначала зафиксируйте число строк, затем повторите запуск и сравните.

```bat
mysql -u root dean -e "SELECT COUNT(*) FROM students; SELECT COUNT(*) FROM enrollments;"
DeanMaintenance.exe
echo %ERRORLEVEL%
dir backups
mysql -u root dean -e "SELECT COUNT(*) FROM students; SELECT COUNT(*) FROM enrollments;"
```

Числа не меняются, а копий становится две. Это и есть идемпотентность обслуживания: повторный запуск создаёт новый снимок, но не трогает данные. Имя копии содержит метку времени до секунды, поэтому два запуска подряд в одну секунду дадут одно имя и перезапишут файл. Между запусками подождите секунду.

Приложите скриншот второго запуска и списка копий: два файла с разными метками.

### Шаг 7. Проверьте коды возврата

```bat
DeanMaintenance.exe --unknown
echo %ERRORLEVEL%
set DEAN_DB_PASSWORD=
DeanMaintenance.exe
echo %ERRORLEVEL%
```

Первая команда возвращает 64: аргумент не распознан. Вторая возвращает 1: переменная пуста, приложение пишет `ERROR не задана переменная DEAN_DB_PASSWORD` и не начинает работу. Убедитесь, что после ошибки не появился новый файл копии и нет строки `DONE`.

```bat
set DEAN_DB_PASSWORD=DeanLab2026
```

### Шаг 8. Проверьте копию и статистику

```bat
findstr /C:"CREATE TABLE" backups\dean_*.sql
findstr /C:"CHECK students=" logs\dean-maintenance.log
```

Первая команда должна найти определения таблиц, вторая показывает число строк, записанное после обслуживания. Пустой дамп или дамп без `CREATE TABLE` означает, что копия непригодна, даже если код возврата был нулевым.

### Шаг 9. Заполните таблицу проверки

| Проверка | Команда | Ожидаемый код | Фактический код | Результат |
|---|---|---|---|---|
| Сборка | `dotnet build` | 0 | | |
| Проверочный режим | `DeanMaintenance.exe --dry-run` | 0 | | |
| Первый запуск | `DeanMaintenance.exe` | 0 | | |
| Второй запуск | `DeanMaintenance.exe` | 0 | | |
| Неверный аргумент | `DeanMaintenance.exe --unknown` | 64 | | |
| Нет пароля | пустая переменная и запуск | 1 | | |

Скриншоты делайте только как доказательства: код приложения, первый и второй запуск, журнал, `echo %ERRORLEVEL%`. Текст теории и шапка отчёта в кадр не нужны.

## Что сдать

- Проект `DeanMaintenance` с файлом `Program.cs` и понятными именами.
- Журнал с двумя успешными запусками, проверочным режимом и полным текстом ошибок.
- Две копии базы с разными метками времени.
- Таблицу проверки с ожидаемым и фактическим кодом возврата.
- Скриншоты кода, двух запусков, журнала и `echo %ERRORLEVEL%`.

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
- **Приложение.** Аргументы, журнал и коды возврата на месте
- **Копия и обслуживание.** `mysqldump` создаёт пригодную копию, `ANALYZE TABLE` выполняется
- **Повторный запуск.** Данные не меняются, копии не перезаписываются
- **Коды возврата.** 0, 1 и 64 возвращаются в своих случаях
- **Безопасность и отчёт.** Пароль в переменной окружения, журнал читается, таблица заполнена

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Почему пароль нельзя хранить в коде и передавать аргументом командной строки?
2. Зачем нужен отдельный код возврата 64 и чем он полезен планировщику?
3. Чем `--dry-run` отличается от обычного запуска и что он проверяет?
4. Почему нулевой код возврата `mysqldump` ещё не доказывает, что копия пригодна?
5. Что доказывает идемпотентность приложения при втором запуске?
6. Зачем проверять `FileInfo.Length` после выгрузки?
7. Почему `ANALYZE TABLE` ставят в обслуживание, а не выполняют вручную раз в месяц?

</div>
