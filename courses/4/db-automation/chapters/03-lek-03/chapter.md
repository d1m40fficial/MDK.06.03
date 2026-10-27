---
title: XAMPP, MySQL и подключение из .NET
dek: XAMPP даёт готовый MySQL и phpMyAdmin, а .NET подключается к базе через строку подключения и MySqlConnector.
chapter: "Лекция 3"
minutes: 90
level: СПО
glyph: Л3
outcomes:
  - Запускать MySQL в XAMPP и создавать базу в phpMyAdmin
  - Настраивать utf8mb4 и пользователя базы
  - Подключаться к MySQL из консольного приложения .NET
---

## Одна идея

База `dean` доступна из трёх мест: из браузера через phpMyAdmin, из консоли через `mysql.exe` и из приложения на C#. Во всех трёх случаях клиент идёт к одному процессу `mysqld` на порту 3306, хотя учётные записи у клиентов могут быть разными.

**Подключение это адрес сервера, имя базы, пользователь, пароль и кодировка, собранные в одну строку.** Пока строка верна, клиент не важен. Поэтому сначала настраивают сервер и базу, потом проверяют доступ из phpMyAdmin, и только затем пишут код на C#. Если пропустить средний шаг, ошибка в приложении будет выглядеть загадочно.

## Запуск XAMPP

XAMPP Control Panel показывает список модулей и кнопки `Start`, `Config` и `Logs` у каждого. Для работы с базой нужны два модуля. **MySQL** поднимает сам сервер, **Apache** отдаёт phpMyAdmin, потому что это веб-приложение на PHP.

Порядок запуска простой: сначала MySQL, потом Apache. Если MySQL не стартует, Control Panel показывает причину в журнале, а не молчит. Типичная причина это занятый порт 3306: на компьютере уже стоит другой MySQL или служба MariaDB. Вторая причина это повреждённый файл данных после аварийного завершения.

<figure class="diagram">
<svg viewBox="0 0 680 260" role="img" aria-label="Три клиента подключаются к MySQL из XAMPP на порту 3306">
  <defs><marker id="l3ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="var(--accent)"/></marker></defs>
  <g font-family="Inter, sans-serif">
    <rect x="20" y="30" width="180" height="52" rx="9" fill="var(--card)" stroke="var(--rule)" stroke-width="1.4"/>
    <text x="110" y="52" text-anchor="middle" font-size="12.5" fill="var(--ink)">phpMyAdmin</text>
    <text x="110" y="70" text-anchor="middle" font-size="11" fill="var(--ink-3)">браузер, Apache</text>
    <rect x="20" y="104" width="180" height="52" rx="9" fill="var(--card)" stroke="var(--rule)" stroke-width="1.4"/>
    <text x="110" y="126" text-anchor="middle" font-size="12.5" fill="var(--ink)">mysql.exe</text>
    <text x="110" y="144" text-anchor="middle" font-size="11" fill="var(--ink-3)">консоль XAMPP</text>
    <rect x="20" y="178" width="180" height="52" rx="9" fill="var(--card)" stroke="var(--rule)" stroke-width="1.4"/>
    <text x="110" y="200" text-anchor="middle" font-size="12.5" fill="var(--ink)">DeanAdmin</text>
    <text x="110" y="218" text-anchor="middle" font-size="11" fill="var(--ink-3)">C# и MySqlConnector</text>
    <rect x="380" y="70" width="270" height="120" rx="12" fill="var(--card)" stroke="var(--accent)" stroke-width="1.8"/>
    <text x="515" y="104" text-anchor="middle" font-size="14" fill="var(--ink)">mysqld</text>
    <text x="515" y="128" text-anchor="middle" font-size="11.5" fill="var(--ink-3)">порт 3306</text>
    <text x="515" y="150" text-anchor="middle" font-size="11.5" fill="var(--ink-3)">база dean, utf8mb4</text>
    <text x="515" y="172" text-anchor="middle" font-size="11.5" fill="var(--ink-3)">пользователь dean_app</text>
    <line x1="202" y1="56" x2="376" y2="104" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#l3ar)"/>
    <line x1="202" y1="130" x2="376" y2="130" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#l3ar)"/>
    <line x1="202" y1="204" x2="376" y2="156" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#l3ar)"/>
    <text x="340" y="246" text-anchor="middle" font-size="11.5" fill="var(--ink-3)">разные клиенты, один сервер и одна учётная запись</text>
  </g>
</svg>
<figcaption>phpMyAdmin, консоль и приложение .NET обращаются к одному серверу MySQL на порту 3306.</figcaption>
</figure>

В Control Panel есть кнопка `Config` у модуля MySQL. Она открывает `my.ini`, файл настроек сервера. Рядом кнопка `Logs` с журналом ошибок, а `Shell` открывает командную строку с уже прописанными путями XAMPP.

Кнопка `Start` запускает модуль как обычный процесс, и после перезагрузки компьютера его нужно запускать снова. Флажок `Service` устанавливает MySQL как службу Windows: тогда сервер стартует вместе с системой. Для занятий удобнее обычный запуск: видно, что именно работает, и легко остановить сервер перед правкой `my.ini`.

## phpMyAdmin и база dean

phpMyAdmin открывается по адресу `http://localhost/phpmyadmin`. В учебной сборке пользователь `root` входит с пустым паролем. Это удобно для первого запуска и опасно для работы: пустой пароль `root` означает полный доступ для любого клиента на этом компьютере.

Базу создают на вкладке `Databases`. Имя `dean`, кодировка `utf8mb4`, сравнение `utf8mb4_unicode_ci`. Ту же команду можно выполнить на вкладке `SQL`:

```sql
CREATE DATABASE dean CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dean_app'@'localhost' IDENTIFIED BY 'uchebnyi-parol';
GRANT SELECT, INSERT, UPDATE, DELETE ON dean.* TO 'dean_app'@'localhost';
```

`utf8mb4` хранит до четырёх байт на символ. Старая кодировка `utf8` в MySQL фактически трёхбайтовая и не вмещает эмодзи и часть редких символов. Если база создана в `latin1`, русский текст превращается в набор вопросительных знаков или странных букв. Кодировку задают один раз при создании базы, а не исправляют после загрузки данных.

Пользователь `dean_app` создаётся для конкретного узла: `'dean_app'@'localhost'` и `'dean_app'@'%'` это две разные учётные записи. Первая работает только с локального компьютера, вторая с любого адреса. Для учебного стенда достаточно первой. Проверить учётные записи можно в phpMyAdmin на вкладке `User accounts` или запросом `SELECT user, host FROM mysql.user;`.

Таблицы создают на вкладке `SQL` той же базы. Если таблиц много, удобнее держать скрипт в файле и импортировать его через вкладку `Import`. phpMyAdmin показывает число выполненных запросов и текст ошибки, поэтому первый запуск схемы лучше делать здесь, а не в приложении.

Проверить результат можно запросами:

```sql
SHOW CREATE DATABASE dean;
SELECT @@character_set_server, @@collation_server;
```

::gate Почему приложение не находит MySQL, если порт занят другой службой?

## Порт 3306 и файл my.ini

Порт это номер, по которому клиент находит сервер на компьютере. MySQL по умолчанию слушает 3306. Если порт занят, XAMPP не запустит второй сервер, а приложение будет подключаться не туда.

Проверить, кто слушает порт, можно в PowerShell:

```powershell
netstat -ano | findstr :3306
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "SHOW VARIABLES LIKE 'port';"
```

Настройки сервера лежат в `C:\xampp\mysql\bin\my.ini`. Файл читают при старте, поэтому правки делают только при остановленном MySQL, а затем запускают сервер заново. Минимальный набор для учебной базы выглядит так:

```ini
[mysqld]
port=3306
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
innodb_buffer_pool_size=256M
log-bin=mysql-bin
server-id=1

[client]
default-character-set=utf8mb4
```

`character-set-server` задаёт кодировку по умолчанию для новых баз. `log-bin` включает двоичный журнал, без которого невозможно восстановление на момент сбоя. `server-id` обязателен для журнала и репликации, даже если реплики пока нет. После изменения `my.ini` сервер перезапускают через Control Panel.

`innodb_buffer_pool_size=256M` задаёт размер кеша страниц. Для учебной базы этого достаточно, для рабочей значение считают от объёма горячих данных. Слишком маленький пул заставляет сервер постоянно читать с диска, слишком большой на учебном компьютере отнимает память у остальных программ. Значение вступает в силу только после перезапуска, поэтому его меняют вместе с остальными правками файла.

## Проект .NET

Для приложения нужен .NET SDK 10 и пакет MySqlConnector. Проверка и создание проекта занимают несколько команд:

```powershell
dotnet --list-sdks
dotnet new console -n DeanAdmin
cd DeanAdmin
dotnet add package MySqlConnector
```

`dotnet new console` создаёт папку `DeanAdmin` с файлом `Program.cs` и проектом, нацеленным на `net10.0`. `dotnet add package` добавляет ссылку на библиотеку, которая умеет говорить по протоколу MySQL. Ту же операцию в Visual Studio 2022 выполняют через управление пакетами NuGet.

В проекте всего два важных файла. `DeanAdmin.csproj` хранит целевую платформу и ссылку на пакет, а `Program.cs` содержит код. В Visual Studio 2022 создают проект `Console App` с тем же именем, выбирают `.NET 10` и добавляют MySqlConnector через NuGet. Структура остаётся одинаковой, поэтому код из консольной команды переносится в Visual Studio без изменений.

::/gate

::gate Как собрать строку подключения, чтобы пароль не попал в код?

## Строка подключения

Строка подключения собирает пять обязательных сведений: сервер, порт, база, пользователь, пароль. Шестое, кодировка, задаёт, как клиент читает и отправляет текст.

```csharp
using MySqlConnector;

var cs = new MySqlConnectionStringBuilder
{
    Server = "localhost",
    Port = 3306,
    Database = "dean",
    UserID = "dean_app",
    Password = Environment.GetEnvironmentVariable("DEAN_DB_PASSWORD"),
    CharacterSet = "utf8mb4"
}.ConnectionString;

await using var conn = new MySqlConnection(cs);
await conn.OpenAsync();

await using var cmd = new MySqlCommand(
    "SELECT VERSION(), @@character_set_database, CURRENT_USER();", conn);
await using var reader = await cmd.ExecuteReaderAsync();
if (await reader.ReadAsync())
{
    Console.WriteLine($"{reader.GetString(0)} | {reader.GetString(1)} | {reader.GetString(2)}");
}
```

Пароль берут из переменной окружения, а не из литерала в коде. Строка с паролем, попавшая в Git, остаётся в истории даже после удаления. Для учебного компьютера переменную задают один раз:

```powershell
$env:DEAN_DB_PASSWORD = "uchebnyi-parol"
dotnet run
```

Собирать строку конкатенацией опасно: пароль с точкой с запятой разорвёт её на части. Построитель экранирует значения и проверяет имена параметров, поэтому его используют и в учебном коде, и в рабочем. Готовую строку можно один раз вывести в журнал без пароля, чтобы убедиться, что сервер, порт и база прочитаны верно.

Ожидаемый вывод показывает три факта сразу: версию сервера, кодировку базы и учётную запись, под которой прошло соединение.

```text
10.4.32-MariaDB | utf8mb4 | dean_app@localhost
```

Версия с суффиксом `MariaDB` нормальна для XAMPP. Если в выводе `latin1`, приложение подключилось не к той базе или не передало кодировку. Если имя пользователя отличается от `dean_app`, значит строка подключения взяла другую учётную запись.

::/gate

::gate Как отличить отказ в доступе от неверного порта?

## Проверка соединения и типичные ошибки

Проверять нужно не только открытие соединения, но и то, что приложение видит нужную базу. Запрос `SELECT DATABASE(), @@character_set_database;` показывает текущую базу и её кодировку. Запрос `SHOW TABLES;` подтверждает, что таблицы на месте. Если приложение подключается, но таблиц не видит, скорее всего оно открыло другую базу.

Полезно сразу проверить чтение данных: `SELECT COUNT(*) FROM students;` возвращает число строк, а не только подтверждение соединения. Если запрос падает с ошибкой прав, значит пользователь создан, но `GRANT` на эту таблицу не выдан. Если запрос возвращает ноль при заполненной базе, приложение смотрит в другую базу или в другую копию сервера.

| Сообщение | Причина | Что делать |
|---|---|---|
| `Access denied for user` | неверный пароль или пользователь создан для другого узла | проверить `CREATE USER` и пароль |
| `Unable to connect to any of the specified MySQL hosts` | MySQL не запущен или неверный порт | запустить модуль, проверить 3306 |
| `Unknown database 'dean'` | база не создана или опечатка в имени | создать базу и проверить имя |
| текст в виде `?????` | клиент или база в `latin1` | задать `utf8mb4` в базе и строке |
| `Table 'dean.students' doesn't exist` | база выбрана неверно или таблица не создана | проверить `Database` и схему |

Отдельно стоит ошибка с портом Apache. Если порт 80 занят другой программой, phpMyAdmin не откроется, хотя MySQL работает. В этом случае меняют порт Apache в Control Panel на 8080 и открывают `http://localhost:8080/phpmyadmin`. Порт MySQL при этом не трогают.

Ещё одна тонкость это имя узла. Для MySQL `localhost` и `127.0.0.1` могут означать разные учётные записи. Если пользователь создан для `'dean_app'@'localhost'`, а приложение подключается к `127.0.0.1`, сервер может ответить отказом. Проще выбрать одно имя и использовать его везде: в `CREATE USER`, в phpMyAdmin и в строке подключения.

Иногда MySQL уже запущен как служба Windows, и тогда порт занят, хотя панель показывает модуль остановленным. `netstat` покажет занятый порт, а повторный запуск из панели завершится ошибкой. В учебной работе выбирают один способ запуска, чтобы не держать два сервера на одном порту.

Ещё одна частая ошибка это `root` в строке подключения приложения. Такой код работает, но приложение получает право удалить базу. Для учебной работы создают отдельного пользователя и выдают ему только нужные команды. Подробно права разбираются дальше.

## Проверьте себя

> [!CHECK] Почему phpMyAdmin не открывается, хотя MySQL запущен?
> phpMyAdmin это веб-приложение на PHP, его отдаёт Apache. Без запущенного Apache страница недоступна, даже если сервер базы работает.

> [!CHECK] Приложение подключается, но русские буквы приходят как `?????`. Что проверить?
> Кодировку базы и кодировку соединения. В базе должен быть `utf8mb4`, в строке подключения `CharSet=utf8mb4`, а таблицы должны быть созданы в этой кодировке.

> [!CHECK] Чем опасен пароль, записанный прямо в `Program.cs`?
> Он попадает в репозиторий и остаётся в истории Git. Переменная окружения или файл вне репозитория позволяют менять пароль без правки кода.

## Итоги

- XAMPP запускает MySQL и Apache, phpMyAdmin работает через Apache на `http://localhost/phpmyadmin`.
- Базу создают в `utf8mb4`, а приложению выдают отдельного пользователя с ограниченными правами.
- Порт 3306 и файл `my.ini` задают, куда подключается клиент и с какой кодировкой работает сервер.
- .NET подключается через MySqlConnector, строку подключения и переменную окружения для пароля.

::quiz
Q: Какие модули XAMPP нужно запустить, чтобы открыть phpMyAdmin?
+ Apache
+ MySQL
- FileZilla
- Mercury
! phpMyAdmin это PHP-приложение, ему нужен Apache, а данные берутся из MySQL.

Q: По какому адресу открывается phpMyAdmin в XAMPP?
+ http://localhost/phpmyadmin
- http://localhost:3306
- http://localhost/mysql
- http://localhost:8080/mysqladmin
! По умолчанию phpMyAdmin доступен на локальном Apache.

Q: Какая команда создаёт базу dean в кодировке utf8mb4?
+ CREATE DATABASE dean CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
- CREATE DATABASE dean CHARSET latin1;
- CREATE TABLE dean CHARACTER SET utf8;
- ALTER DATABASE dean SET utf8;
! Кодировку и сравнение задают при создании базы.

Q: Почему для русских текстов и эмодзи выбирают utf8mb4, а не utf8?
+ utf8mb4 хранит до четырёх байт на символ
- utf8mb4 быстрее на любых данных
- utf8 в MySQL не поддерживает кириллицу
- utf8mb4 не требует индексов
! Старый utf8 в MySQL трёхбайтовый и не вмещает все символы Unicode.

Q: Какая команда добавляет MySqlConnector в проект?
+ dotnet add package MySqlConnector
- dotnet new package MySqlConnector
- dotnet run MySqlConnector
- dotnet build MySqlConnector
! Пакет добавляют командой dotnet add package.

Q: Какой класс открывает соединение с MySQL в MySqlConnector?
+ MySqlConnection
- SqlConnection
- NpgsqlConnection
- OleDbConnection
! MySqlConnection работает по протоколу MySQL.

Q: Какой параметр строки подключения задаёт кодировку?
+ CharSet
- Collation
- Encoding
- Locale
! В MySqlConnector кодировку задаёт CharSet, он же CharacterSet.

Q: Где хранить пароль приложения, чтобы он не попал в Git?
+ В переменной окружения
- В комментарии к Program.cs
- В имени проекта
- В строке подключения по умолчанию
! Секрет хранят вне репозитория и читают при запуске.

Q: Что проверяет команда SHOW VARIABLES LIKE 'port';?
+ Порт, который слушает сервер MySQL
- Свободное место на диске
- Версию .NET SDK
- Кодировку таблицы students
! Переменная port показывает, на каком порту работает mysqld.

Q: Какие сведения обязательны в строке подключения?
+ Сервер
+ Имя базы
+ Пользователь и пароль
- Цвет интерфейса
- Версия Visual Studio
! Без адреса, базы и учётных данных соединение не установится.

Q: Что проверить, если приложение пишет Unable to connect to any of the specified MySQL hosts?
+ Запущен ли MySQL в XAMPP
+ Совпадает ли порт 3306
+ Не занят ли порт другой службой
- Правильно ли свёрстан интерфейс
- Установлен ли Apache
! Ошибка означает, что клиент не нашёл сервер по адресу и порту.

Q: Какие признаки указывают на проблему с кодировкой?
+ Вместо русского текста приходят вопросительные знаки
+ База создана в latin1
+ В строке подключения не задан CharSet
- Сервер не запущен
- Пользователь не имеет прав на SELECT
! Кодировка проявляется в испорченных символах, а не в отказе доступа.

Q: Какой порт MySQL используется в XAMPP по умолчанию?
= 3306
= 3306/tcp
! Стандартный порт MySQL равен 3306.

Q: Как называется файл настроек сервера MySQL в XAMPP?
= my.ini
! Настройки сервера лежат в C:\xampp\mysql\bin\my.ini.

Q: Что делает команда dotnet run в папке проекта?
+ Собирает проект и запускает приложение
- Только создаёт новый проект
- Добавляет пакет MySqlConnector
- Открывает phpMyAdmin
! dotnet run выполняет сборку и запуск текущего проекта.
::/gate
