---
title: Практика 9. Планировщик и мониторинг
dek: "Ставим обслуживание «Деканата» в Планировщик Windows и выводим метрики MySQL в окно WinForms с порогами."
chapter: "Практика 9"
minutes: 180
level: СПО
glyph: П9
outcomes:
  - Ставить консольное приложение обслуживания в Планировщик Windows
  - Доказывать срабатывание задания по журналу и коду возврата
  - Снимать метрики MySQL через SHOW GLOBAL STATUS и SHOW PROCESSLIST
  - Выводить показатели с порогами в приложении WinForms
---

## Цель работы

Обслуживание, которое держится на памяти администратора, рано или поздно пропускается. Задание, которое никто не проверял, может месяцами завершаться ошибкой, и узнают об этом только при сбое. Цель работы: поставить приложение обслуживания учебной базы «Деканат» в Планировщик Windows, доказать его срабатывание и собрать наблюдения за состоянием MySQL.

На выходе получаются четыре артефакта: приложение `DeanMaintenance` с журналом и кодом возврата, задание планировщика с доказательством запуска, снятые метрики сервера и приложение `DeanDashboard`, которое показывает показатели и сравнивает их с порогами.

## Оборудование и программное обеспечение

- Персональный компьютер с Windows 10 и XAMPP 8.5.12.
- Панель XAMPP Control Panel с запущенными Apache и MySQL, phpMyAdmin по адресу `http://localhost/phpmyadmin`.
- Клиент `mysql` и конфигурация `.../xampp/mysql/bin/my.ini`.
- .NET SDK 10 и Visual Studio 2022 Community с рабочей нагрузкой «Разработка классических приложений .NET».
- Пакет `MySqlConnector` для подключения к MySQL из C#.
- Планировщик Windows (`taskschd.msc`) и оснастка служб для проверки запуска.
- Учебная база `dean` с таблицами `students`, `enrollments`, `payments` и пользователем `dean_app`.
- Текстовый редактор и табличный редактор для отчёта.

## Краткие теоретические сведения

### Из чего состоит задание планировщика

Задание в Планировщике Windows собирается из четырёх частей. **Триггер** задаёт момент запуска: раз в сутки, при входе в систему, по повторению каждые несколько минут. **Действие** описывает, что именно запустить: программу, аргументы и рабочую папку. **Учётная запись** определяет права процесса. **Условия** запрещают, например, запуск от батареи.

Планировщик не знает, хорошо ли отработала программа. Он запоминает только код возврата и время последнего запуска. Поэтому приложение само пишет журнал и строку в таблицу `maintenance_runs`: без этого успешный код возврата скрывает, что скрипт ничего не сделал.

Хорошее задание можно запустить вручную, и результат совпадёт с запуском по расписанию. Если ручной запуск и расписание расходятся, различие обычно в рабочей папке, переменных окружения или правах учётной записи.

### Метрики состояния MySQL

Метрика это число, снятое в момент времени. Разовый замер ничего не говорит: смысл появляется при сравнении двух снимков и с порогом.

| Метрика | Источник | Тип | Что показывает |
|---|---|---|---|
| `Threads_connected` | `SHOW GLOBAL STATUS` | мгновенное значение | Сколько клиентов подключено прямо сейчас |
| `Questions` | `SHOW GLOBAL STATUS` | счётчик | Сколько операторов выполнили клиенты с момента старта |
| `Uptime` | `SHOW GLOBAL STATUS` | счётчик секунд | Сколько работает сервер, после перезапуска обнуляется |
| `Innodb_buffer_pool_read_requests` | `SHOW GLOBAL STATUS` | счётчик | Сколько логических чтений запросили запросы |
| `Innodb_buffer_pool_reads` | `SHOW GLOBAL STATUS` | счётчик | Сколько чтений ушло на диск мимо буферного пула |

Счётчик сравнивают дельтой: два снимка с интервалом дают скорость. Число операторов в секунду считают как разность `Questions`, делённую на разность `Uptime` или на время между снимками. Доля попаданий в буферный пул равна единице минус отношение прироста физических чтений к приросту логических.

`SHOW PROCESSLIST` показывает, кто работает сейчас: идентификатор соединения, пользователь, хост, база, команда, время в секундах и состояние. Строка с командой `Sleep` это открытое соединение без запроса, строка с большим `Time` и командой `Query` это долгий запрос.

`SHOW ENGINE INNODB STATUS` отдаёт текстовый отчёт движка. В нём важны раздел `TRANSACTIONS` со списком активных транзакций, длина истории отмены `History list length` и счётчик обнаруженных взаимных блокировок.

### Порог и реакция

Порог без реакции бесполезен. У каждого порога есть владелец и действие: проверить блокировки, разобрать план запроса, увеличить буферный пул, завершить соединение. Наблюдение отличается от разового замера тем, что хранит серию снимков и заканчивается выводом, а не набором чисел.

## Ход работы

Перед каждым снимком вывода печатайте фамилию и группу, чтобы кадр нельзя было перепутать с чужим. В PowerShell это `Write-Host "Иванов И.И., ИС-41"`, в MySQL строка `SELECT 'Иванов И.И., ИС-41' AS student;`.

### Шаг 1. Подготовьте базу и журнал

Создайте таблицу запусков и каталог для файла журнала. Таблица нужна, чтобы факт запуска сохранился даже после очистки или смены файла.

```sql
USE dean;

CREATE TABLE IF NOT EXISTS maintenance_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  script VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  note VARCHAR(255)
) ENGINE=InnoDB;

SELECT COUNT(*) AS students FROM students;
SELECT VERSION() AS server_version;
```

```powershell
New-Item -ItemType Directory -Force .../dean/log, .../dean/src, .../dean/secret | Out-Null
[System.IO.File]::WriteAllText(".../dean/secret/db_password.txt", "пароль_пользователя_dean_app")
icacls .../dean/secret/db_password.txt /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

Пароль приложение читает из файла, а не из кода. Доступ к файлу оставьте только своей учётной записи: тогда задание в планировщике работает без переменных окружения и без пароля в командной строке.

### Шаг 2. Соберите приложение DeanMaintenance

Создайте консольное приложение и добавьте драйвер. Пароль не храните в коде: приложение читает его из файла `.../dean/secret/db_password.txt`.

```powershell
cd .../dean/src
dotnet new console -n DeanMaintenance
cd DeanMaintenance
dotnet add package MySqlConnector
```

Замените содержимое `Program.cs`. Приложение выполняет `ANALYZE TABLE` по трём таблицам, пишет журнал и возвращает ноль при успехе или единицу при ошибке.

```csharp
using MySqlConnector;

var secret = @".../dean/secret/db_password.txt";
var password = File.Exists(secret) ? File.ReadAllText(secret).Trim() : "";

var cs = new MySqlConnectionStringBuilder
{
    Server = "localhost",
    Port = 3306,
    Database = "dean",
    UserID = "dean_app",
    Password = password,
    CharacterSet = "utf8mb4"
}.ConnectionString;

var log = @".../dean/log/maintenance.log";

void Write(string line) =>
    File.AppendAllText(log, $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} {line}{Environment.NewLine}");

Write("start DeanMaintenance");

try
{
    await using var conn = new MySqlConnection(cs);
    await conn.OpenAsync();

    foreach (var table in new[] { "students", "enrollments", "payments" })
    {
        await using var analyze = new MySqlCommand($"ANALYZE TABLE {table}", conn);
        await analyze.ExecuteNonQueryAsync();
    }

    await using var mark = new MySqlCommand(
        "INSERT INTO maintenance_runs(script, status) VALUES ('DeanMaintenance', 'ok')", conn);
    await mark.ExecuteNonQueryAsync();

    Write("finish ok");
    return 0;
}
catch (Exception ex)
{
    Write($"finish failed: {ex.Message}");
    return 1;
}
```

Соберите проект и проверьте, что компиляция прошла без ошибок.

```powershell
dotnet build -c Release
```

### Шаг 3. Проверьте ручной запуск

Запустите приложение, посмотрите код возврата, журнал и строку в таблице. Нулевой код и запись `ok` означают, что задание готово к расписанию.

```powershell
dotnet run -c Release
Write-Host "exit code: $LASTEXITCODE"
Get-Content .../dean/log/maintenance.log -Tail 4
```

```sql
SELECT id, started_at, script, status FROM maintenance_runs ORDER BY id DESC LIMIT 3;
```

### Шаг 4. Поставьте задание в Планировщик Windows

Опубликуйте приложение в отдельный каталог и создайте задание. Для проверки поставьте повторение каждую минуту, потом вернёте суточное расписание.

```powershell
dotnet publish .../dean/src/DeanMaintenance -c Release -o .../dean/bin
schtasks /Create /TN "DeanMaintenance" /SC MINUTE /MO 1 /TR ".../dean/bin/DeanMaintenance.exe" /F
schtasks /Query /TN "DeanMaintenance" /V /FO LIST
```

В окне `taskschd.msc` откройте свойства задания и проверьте вкладки. На вкладке «Триггеры» видно расписание и повторение, на вкладке «Действия» указана программа `.../dean/bin/DeanMaintenance.exe`. Рабочую папку задайте как `.../dean/bin` без кавычек, иначе планировщик воспримет кавычки как часть пути.

Приложите скриншот окна свойств задания с вкладкой «Триггеры». В кадре должны быть имя задания, дата начала и повторение. Скриншот пустого списка заданий ничего не доказывает.

### Шаг 5. Докажите срабатывание по расписанию

Ручной запуск не доказывает, что работает триггер. Дождитесь двух запусков по повторению и сверьте время в журнале с временем последнего запуска задания.

```powershell
Start-Sleep -Seconds 130
Get-Content .../dean/log/maintenance.log -Tail 8
schtasks /Query /TN "DeanMaintenance" /V /FO LIST
```

Код `0` в поле результата означает успех, `1` означает ошибку приложения. Найдите в выводе время последнего запуска и результат. Приложите скриншот журнала: две строки `start` с разными минутами доказывают, что задание сработало само. После проверки верните суточное расписание.

```powershell
schtasks /Change /TN "DeanMaintenance" /SC DAILY /ST 03:30
schtasks /Query /TN "DeanMaintenance" /V /FO LIST
```

### Шаг 6. Снимите метрики MySQL

Сделайте два снимка с интервалом, чтобы получить не только значения, но и прирост. Снимки сохраните в таблицу: по ним считается скорость.

```sql
CREATE TABLE IF NOT EXISTS monitor_snapshots (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metric VARCHAR(64) NOT NULL,
  value BIGINT NOT NULL
) ENGINE=InnoDB;

INSERT INTO monitor_snapshots(metric, value)
SELECT LOWER(VARIABLE_NAME), CAST(VARIABLE_VALUE AS UNSIGNED)
FROM information_schema.GLOBAL_STATUS
WHERE VARIABLE_NAME IN ('THREADS_CONNECTED', 'QUESTIONS', 'UPTIME',
                        'INNODB_BUFFER_POOL_READ_REQUESTS', 'INNODB_BUFFER_POOL_READS');
```

Выполните несколько запросов к базе, подождите минуту и повторите вставку. Затем посмотрите текущее состояние сервера.

```sql
SHOW GLOBAL STATUS
WHERE Variable_name IN ('Threads_connected', 'Questions', 'Uptime',
                        'Innodb_buffer_pool_read_requests', 'Innodb_buffer_pool_reads');

SHOW PROCESSLIST;

SHOW ENGINE INNODB STATUS;
```

Приложите скриншот `SHOW GLOBAL STATUS` с четырьмя значениями и скриншот `SHOW PROCESSLIST`. В кадре `SHOW ENGINE INNODB STATUS` достаточно раздела `TRANSACTIONS` и строки `History list length`: весь текст отчёта не читается на снимке.

Посчитайте прирост между снимками.

```sql
SELECT metric,
       MAX(value) - MIN(value) AS delta,
       TIMESTAMPDIFF(SECOND, MIN(at), MAX(at)) AS seconds,
       ROUND((MAX(value) - MIN(value)) / NULLIF(TIMESTAMPDIFF(SECOND, MIN(at), MAX(at)), 0), 2) AS per_second
FROM monitor_snapshots
GROUP BY metric
ORDER BY metric;
```

### Шаг 7. Соберите приложение DeanDashboard

Создайте проект Windows Forms и добавьте тот же драйвер. Приложение раз в пять секунд читает `SHOW GLOBAL STATUS` и заполняет таблицу.

```powershell
cd .../dean/src
dotnet new winforms -n DeanDashboard
cd DeanDashboard
dotnet add package MySqlConnector
```

Замените `Form1.cs` целиком.

```csharp
using MySqlConnector;

namespace DeanDashboard;

public partial class Form1 : Form
{
    private readonly DataGridView grid = new()
    {
        Dock = DockStyle.Fill,
        ReadOnly = true,
        AllowUserToAddRows = false
    };
    private readonly System.Windows.Forms.Timer timer = new() { Interval = 5000 };
    private readonly string cs;

    public Form1()
    {
        cs = new MySqlConnectionStringBuilder
        {
            Server = "localhost",
            Port = 3306,
            Database = "dean",
            UserID = "dean_app",
            Password = ReadPassword(),
            CharacterSet = "utf8mb4"
        }.ConnectionString;

        Text = "DeanDashboard";
        Width = 760;
        Height = 260;
        grid.Columns.Add("metric", "Показатель");
        grid.Columns.Add("value", "Значение");
        grid.Columns.Add("limit", "Порог");
        grid.Columns.Add("state", "Статус");
        Controls.Add(grid);

        Load += async (_, _) => { timer.Start(); await RefreshAsync(); };
        timer.Tick += async (_, _) => await RefreshAsync();
    }

    private async Task RefreshAsync()
    {
        try
        {
            await using var conn = new MySqlConnection(cs);
            await conn.OpenAsync();

            var values = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
            await using var cmd = new MySqlCommand("SHOW GLOBAL STATUS", conn);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                values[reader.GetString(0)] = long.TryParse(reader.GetString(1), out var v) ? v : 0;
            }

            grid.Rows.Clear();
            Add("Threads_connected", values.GetValueOrDefault("Threads_connected"), 20);
            Add("Questions", values.GetValueOrDefault("Questions"), 0);
            Add("Uptime, ч", values.GetValueOrDefault("Uptime") / 3600, 0);
            Add("Buffer read requests",
                values.GetValueOrDefault("Innodb_buffer_pool_read_requests"), 0);
        }
        catch (Exception ex)
        {
            grid.Rows.Clear();
            grid.Rows.Add("Ошибка", ex.Message, "", "");
        }
    }

    private void Add(string name, long value, long limit)
    {
        var state = limit > 0 && value > limit ? "порог нарушен" : "в норме";
        grid.Rows.Add(name, value.ToString("N0"), limit > 0 ? limit.ToString("N0") : "нет", state);
    }

    private static string ReadPassword()
    {
        var file = @".../dean/secret/db_password.txt";
        return File.Exists(file) ? File.ReadAllText(file).Trim() : "";
    }
}
```

Запустите приложение и откройте вторую сессию MySQL, чтобы число соединений изменилось. Приложите скриншот окна `DeanDashboard`: в кадре видны четыре строки, значения и столбец «Статус».

### Шаг 8. Задайте пороги и реакции

Заполните таблицу под свою базу. Порог без действия не считается настроенным.

| Метрика | Порог | Как проверить | Действие при выходе |
|---|---|---|---|
| `Threads_connected` | Больше 20 | `SHOW GLOBAL STATUS` | Найти источник соединений, проверить пул в приложении |
| Долгий запрос | Дольше 60 секунд | `SHOW PROCESSLIST`, столбец `Time` | Разобрать план, проверить блокировки, при необходимости `KILL` |
| `Questions` | Больше 50 в секунду | Два снимка и дельта | Найти частые запросы, добавить кэш или индекс |
| Буферный пул | Доля попаданий ниже 95 процентов | Прирост `read_requests` и `reads` | Увеличить `innodb_buffer_pool_size` в `my.ini` |
| `Uptime` | Меньше часа без планового перезапуска | `SHOW GLOBAL STATUS` | Проверить журнал ошибок MySQL в `.../xampp/mysql/data` |

### Шаг 9. Смоделируйте инцидент

Откройте вторую сессию и запустите долгий запрос. В первой сессии найдите его по `SHOW PROCESSLIST` и зафиксируйте, что порог нарушен.

```sql
SELECT SLEEP(120);
```

```sql
SHOW PROCESSLIST;
```

Найдите строку с командой `Query` и временем около 120 секунд. Завершите только запрос, а не соединение: `KILL QUERY <id>;` останавливает оператор, `KILL <id>;` закрывает сессию. В отчёте объясните, почему выбрали первый вариант. Приложите скриншот `SHOW PROCESSLIST` до завершения: в нём видно, что запрос активен дольше порога.

### Шаг 10. Оформите отчёт наблюдений

Сведите наблюдения в таблицу. В столбце «Статус» пишите «в норме» или «порог нарушен», в столбце «Действие» описывайте следующий шаг.

| Метрика | Значение | Порог | Статус | Действие | Источник |
|---|---|---|---|---|---|
| Соединения |  | 20 |  |  | `SHOW GLOBAL STATUS` |
| Долгий запрос |  | 60 с |  |  | `SHOW PROCESSLIST` |
| Операторов в секунду |  | 50 |  |  | Дельта снимков |
| Попадание в буферный пул |  | 95 процентов |  |  | Дельта снимков |
| Время работы сервера |  | 1 ч |  |  | `SHOW GLOBAL STATUS` |

В выводе назовите, какое задание вы поставили в планировщик, почему выбрали повторение и как убедились, что оно срабатывает само. Перечислите, что осталось вне наблюдения: место на диске, репликация, ошибки в журнале MySQL.

### Требования к отчёту

Соберите отчёт из цели, кода приложения, команды создания задания, доказательств запуска, метрик, таблицы порогов и наблюдений. Каждый скриншот подпишите: что проверялось, дата, имя базы. Скриншоты шапки отчёта и текста теории не нужны: доказательствами служат только кадры с заданием, журналом, метриками и окном приложения.

## Что сдать

1. Проект `DeanMaintenance` с журналом, кодом возврата и записью в `maintenance_runs`.
2. Команду создания задания и скриншот свойств задания в Планировщике Windows.
3. Скриншот журнала с двумя запусками по расписанию и результатом `0`.
4. Скриншоты `SHOW GLOBAL STATUS`, `SHOW PROCESSLIST`, `SHOW ENGINE INNODB STATUS` и таблицу `monitor_snapshots` с двумя сериями.
5. Проект `DeanDashboard` и скриншот его окна с четырьмя показателями.
6. Таблицу порогов, отчёт наблюдений и вывод.

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
- **Задание планировщика.** Триггер, действие, учётная запись и рабочая папка заданы верно
- **Журнал и код возврата.** Запуск подтверждён журналом и таблицей, сбой виден
- **Метрики.** Сняты четыре показателя, `PROCESSLIST` и отчёт InnoDB
- **Приложение WinForms.** Таймер, таблица, пороги и статус работают
- **Пороги и реакции.** У каждого порога есть проверка и действие
- **Отчёт наблюдений.** Таблица заполнена, вывод опирается на значения
- ****Итого**.** Зачёт от 60 баллов

## Контрольные вопросы

<div class="selfcheck no-copy" markdown="1">

1. Почему код возврата задания не доказывает, что обслуживание выполнено?
2. Чем счётчик отличается от мгновенного значения и какие из метрик относятся к каждому типу?
3. Что покажет `Questions`, делённое на `Uptime`, и почему для текущей нагрузки нужна дельта?
4. Чем `KILL QUERY` отличается от `KILL` и когда нужен второй вариант?
5. Почему порог без описанного действия не считается настроенным?

</div>
