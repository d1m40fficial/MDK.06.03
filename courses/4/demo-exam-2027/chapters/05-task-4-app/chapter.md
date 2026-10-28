---
title: Задание 4. Приложение и защита
dek: Приложение Windows Forms с входом по логину, паролю и пазлу, блокировкой после трёх ошибок и управлением пользователями для ролей admin и user.
chapter: "Задание 4"
level: СПО
glyph: "05"
outcomes:
  - Создавать проект Windows Forms на .NET 10 и собирать формы в конструкторе
  - Реализовывать вход с пазлом, блокировкой и хранением состояния в базе
  - Проверять роли, управление пользователями и сообщения об ошибках по сценариям
---

## Что требуется

Нужно сделать приложение для ателье «Стежок»: сотрудник вводит логин и пароль, собирает пазл из четырёх фрагментов и попадает в рабочее окно. После трёх подряд ошибок пароля или пазла учётная запись блокируется. Администратор видит список пользователей, добавляет и изменяет их, снимает блокировку. Обычный пользователь управление учётными записями не видит и не может вызвать.

Приложение работает с той же базой `dkip2027_course`, которую вы создали во втором задании. Данные входа хранятся в таблице `users`, а не в памяти формы. Это ключевое требование: после перезапуска приложения блокировка должна остаться, потому что она записана в базу.

Сдаётся проект целиком и протокол проверки. В проекте должны быть:

- форма входа с логином, паролем и пазлом;
- рабочее окно, которое открывается только после успешной проверки;
- таблица `users` с ролью, счётчиком ошибок и признаком блокировки;
- управление пользователями для администратора;
- обработка пустых полей, неверного пароля, несобранного пазла, дубля логина и недоступной базы.

Протокол это таблица сценариев с фактическим результатом. Запись «работает» ничего не доказывает. Нужно указать, что именно появилось на экране и что изменилось в базе: например, `failed_attempts = 3`, `is_locked = 1`.

Приложение можно делать на Windows Forms с MySQL или на WPF с PostgreSQL. В этой методичке разбирается первый маршрут: Visual Studio 2022, Windows Forms, .NET 10, MySQL из XAMPP и пакет `MySqlConnector`.

## Что понадобится

| Что открыть | Где найти | Зачем |
|---|---|---|
| Visual Studio 2022 | Пуск, затем Visual Studio 2022 | Создать проект и собрать формы |
| Рабочая нагрузка .NET desktop | Visual Studio Installer | Шаблоны Windows Forms и конструктор |
| .NET SDK 10 | Проверка командой `dotnet --version` | Целевая платформа проекта |
| XAMPP Control Panel | Пуск, затем XAMPP Control Panel | Запустить MySQL |
| phpMyAdmin | `http://localhost/phpmyadmin` | Создать таблицу `users` и проверять записи |
| База `dkip2027_course` | Левая панель phpMyAdmin | Общая база приложения и запроса стоимости |
| Изображение `1.png` | `reports/assets/1.png` | Четыре фрагмента пазла |
| Файл `reports/KIM_09.02.07-5-2027.pdf` | Папка `reports` дисциплины | Требования к приложению |
| PowerShell | Пуск, затем Windows PowerShell | Запуск проекта с переменными подключения |

Проверьте версию SDK в PowerShell:

```powershell
dotnet --version
```

Команда должна показать версию 10 или выше. Если показала другую, установите .NET SDK 10 и перезапустите Visual Studio. Без этого шаблон с платформой `.NET 10.0` может быть недоступен.

Убедитесь, что MySQL работает. В XAMPP Control Panel у строки MySQL должен быть статус `Running`. Если база не запущена, приложение при первом же входе покажет сообщение о подключении, и вы потратите время на поиск ошибки в пароле.

Изображение `1.png` положите в папку проекта `Assets`. В Обозревателе решений щёлкните файл правой кнопкой, откройте `Свойства` и в поле `Копировать в выходной каталог` выберите `Копировать более позднюю версию`. Тогда программа найдёт картинку рядом с исполняемым файлом.

## Как устроено задание

Приложение делится на части, и у каждой части своя ответственность. Такое деление помогает на защите объяснить, где что лежит.

```text
Dkip.WinForms/
  Dkip.WinForms.csproj
  Program.cs
  LoginForm.cs
  LoginForm.Designer.cs
  PuzzleControl.cs
  MainForm.cs
  MainForm.Designer.cs
  Accounts.cs
  Database.cs
  Assets/
    1.png
```

`Program.cs` запускает приложение и открывает форму входа. `LoginForm` показывает поля, пазл и кнопку, а обработчик кнопки вызывает проверку. `PuzzleControl` рисует четыре фрагмента и хранит их порядок. `Accounts` проверяет логин, пароль и пазл, считает неудачные попытки и сохраняет пользователей. `Database` открывает соединение и выполняет запросы. `MainForm` показывает рабочее окно и, если роль администратора, вкладку управления пользователями.

В форме нет SQL, а в слое данных нет кнопок. Это не формальность: если проверка входа размазана по обработчикам кнопок, её легко пропустить в другом окне. Одна функция `SignIn` вызывается из единственного места и выполняет все проверки по порядку.

Состояние защиты хранится в таблице `users`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARBINARY(32) NOT NULL,
  salt VARBINARY(16) NOT NULL,
  role ENUM('admin','user') NOT NULL DEFAULT 'user',
  failed_attempts INT NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`login` уникален, поэтому два одинаковых логина не появятся даже при одновременном сохранении. `password_hash` и `salt` хранят не пароль, а результат его необратимого преобразования. `role` принимает два значения, `admin` и `user`. `failed_attempts` считает подряд неудачные попытки, `is_locked` запрещает вход.

Пароль не хранится и не шифруется обратимо. При создании пользователя генерируется случайная соль, из пароля и соли вычисляется хеш PBKDF2. При входе из введённого пароля и сохранённой соли вычисляют такой же хеш и сравнивают побайтово. Восстановить пароль из хеша нельзя.

Проверка входа идёт по шагам:

1. пустые поля отсекаются до обращения к базе;
2. запись пользователя читается по логину с блокировкой строки;
3. если стоит `is_locked`, вход запрещён;
4. пароль и пазл проверяются вместе;
5. при успехе счётчик обнуляется, при ошибке увеличивается;
6. третья ошибка ставит `is_locked = true` в той же транзакции.

Почему в одной транзакции? Между чтением счётчика и записью нового значения не должно быть окна, в котором другая копия приложения прочитает старое число. `SELECT ... FOR UPDATE` блокирует строку до конца транзакции и не даёт двум проверкам потерять попытку.

Роль проверяется дважды. Интерфейс не показывает обычному пользователю вкладку «Пользователи», а метод сохранения вызывает `RequireAdmin`. Скрытая вкладка это удобство, а не защита: если проверка есть только в интерфейсе, достаточно вызвать метод напрямую.

Валидация тоже делится на два уровня. Приложение проверяет пустые поля, длину пароля и допустимую роль. База не пропускает дубль логина и неверную роль. Проверять уникальность отдельным `SELECT` перед вставкой недостаточно: между проверкой и вставкой строку может создать другой администратор.

Сообщение об ошибке должно помогать человеку и не раскрывать лишнего. «Введите логин и пароль», «Соберите изображение», «Неверный логин или пароль», «Учётная запись заблокирована. Обратитесь к администратору», «Не удалось подключиться к базе данных»: это разные сообщения для разных ситуаций. Текст исключения и строку подключения на экран не выводят.

## Пошаговая инструкция

### Шаг 1. Создайте проект Windows Forms на .NET 10

Откройте Visual Studio 2022. На стартовом окне нажмите `Создать проект`. Если стартовое окно закрыто, выберите в меню `Файл`, затем `Создать`, затем `Проект`.

В окне `Создание проекта` введите в поле поиска `Windows Forms`. В списке шаблонов выберите `Приложение Windows Forms` для языка C#. Не выбирайте `Windows Forms App (.NET Framework)`: там другая платформа и другие настройки. Нажмите `Далее`.

Задайте имя проекта `Dkip.WinForms` и папку, которую легко найти, например `C:\Work\Dkip.WinForms`. Нажмите `Далее`. На странице `Дополнительные сведения` выберите платформу `.NET 10.0`. Нажмите `Создать`.

Visual Studio создаст проект и откроет пустую форму `Form1` в конструкторе. Справа находится окно `Обозреватель решений`, слева можно открыть `Панель элементов`, справа внизу `Окно свойств`. Если панели скрыты, включите их через меню `Вид`.

Сразу проверьте, что проект собирается. Нажмите `Ctrl+Shift+B` или выберите `Сборка`, затем `Собрать решение`. В окне `Вывод` должно появиться сообщение об успешной сборке. Если появилась ошибка, прочитайте первую строку: часто причина в выбранной платформе или в отсутствующем SDK.

### Шаг 2. Разберитесь в окнах Visual Studio

`Обозреватель решений` показывает файлы проекта. Двойной щелчок по `Form1.cs` открывает конструктор, а не текст. Чтобы увидеть код, нажмите `F7` или выберите в контекстном меню `Просмотреть код`.

`Панель элементов` открывается через `Вид`, затем `Панель элементов`, или сочетанием `Ctrl+Alt+X`. Она работает только когда открыт конструктор формы. Внутри есть группы `Стандартные элементы управления`, `Контейнеры`, `Данные`. Из них перетаскивают `Label`, `TextBox`, `Button`, `PictureBox`, `DataGridView`, `CheckBox`, `ComboBox` и `TabControl`.

`Окно свойств` открывается через `Вид`, затем `Окно свойств`, или клавишей `F4`. Верхняя часть показывает выбранный элемент, ниже идут свойства, ещё ниже вкладка событий с изображением молнии. Свойство `Name` задаёт имя элемента в коде, `Text` задаёт подпись на экране.

Форму `Form1` переименуйте в `LoginForm`. В Обозревателе решений щёлкните `Form1.cs` правой кнопкой, выберите `Переименовать` и введите `LoginForm.cs`. Visual Studio предложит переименовать все ссылки, согласитесь. Если переименование не сработало, создайте новую форму: правой кнопкой по проекту, `Добавить`, `Форма (Windows Forms)`, имя `LoginForm.cs`, затем удалите `Form1.cs`.

В `Program.cs` форма запуска должна называться так же:

```csharp
static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new LoginForm());
    }
}
```

Добавьте остальные файлы через контекстное меню проекта: `Добавить`, затем `Класс`. Создайте `PuzzleControl.cs`, `Accounts.cs` и `Database.cs`. Форму `MainForm` добавьте через `Добавить`, затем `Форма (Windows Forms)`.

<figure class="diagram">
<img src="reports/screens/mysql/project.png" alt="Структура проекта приложения в Обозревателе решений">
<figcaption>Файлы проекта: формы, компонент пазла, работа с пользователями и подключение к базе.</figcaption>
</figure>

### Шаг 3. Добавьте пакет MySqlConnector

В меню `Средства` выберите `Диспетчер пакетов NuGet`, затем `Управление пакетами NuGet для решения`. Откроется окно с вкладками `Обзор`, `Установленные`, `Обновления`. На вкладке `Обзор` введите в поиск `MySqlConnector`, выберите пакет с таким именем и нажмите `Установить`. Согласитесь с лицензией.

Тот же результат даёт команда в PowerShell, если открыть её в папке проекта:

```powershell
dotnet add package MySqlConnector
```

После установки в `Dkip.WinForms.csproj` появится строка с `PackageReference`. Проверьте, что пакет стоит именно в проекте приложения, а не в постороннем решении. Если его нет, при попытке создать `MySqlConnection` компилятор скажет, что тип не найден.

### Шаг 4. Создайте таблицу users

Откройте phpMyAdmin, выберите базу `dkip2027_course`, перейдите на вкладку `SQL` и выполните скрипт из раздела «Как устроено задание». Затем проверьте структуру:

```sql
SHOW CREATE TABLE users;
SELECT id, login, role, failed_attempts, is_locked FROM users;
```

Первая команда покажет ограничения `UNIQUE` и значения по умолчанию. Вторая покажет записи. Если таблица уже была, `CREATE TABLE IF NOT EXISTS` её не изменит. В этом случае сверьте столбцы и при необходимости пересоздайте таблицу в учебной базе, предварительно сохранив нужные данные.

Первую учётную запись создайте при первом запуске приложения. Пароль не записывайте в исходники: возьмите его из переменной окружения. Например, метод начальной загрузки может выглядеть так:

```csharp
public static void EnsureAdmin()
{
    using var connection = Database.Open();
    var count = Convert.ToInt32(
        new MySqlCommand("SELECT COUNT(*) FROM users", connection).ExecuteScalar());
    string? password = Environment.GetEnvironmentVariable("DKIP_ADMIN_PASSWORD");
    if (count == 0 && !string.IsNullOrEmpty(password))
        Save(new Account(0, "system", "admin"), null, "admin", password, "admin", false);
}
```

Вызовите `Accounts.EnsureAdmin()` при старте приложения. Если таблица не пуста, метод ничего не делает. Пароль администратора задайте в PowerShell один раз:

```powershell
$env:DKIP_ADMIN_PASSWORD='Demo2027!'
```

Вызов оберните в `try` и `catch`: если MySQL ещё не запущен, приложение должно открыть форму входа и показать сообщение о подключении, а не закрыться при запуске.

### Шаг 5. Настройте подключение к базе

Создайте класс `Database`. Он читает строку подключения из окружения и открывает соединение. Пароль в коде не хранится, потому что исходники попадают в архив работы и в чужой компьютер.

```csharp
using System.Data;
using MySqlConnector;

public static class Database
{
    public static MySqlConnection Open()
    {
        string connectionString = Environment.GetEnvironmentVariable("DKIP_CONNECTION")
            ?? throw new InvalidOperationException("Не задана переменная DKIP_CONNECTION");
        var connection = new MySqlConnection(connectionString);
        connection.Open();
        return connection;
    }

    public static DataTable Query(string sql)
    {
        using var connection = Open();
        using var adapter = new MySqlDataAdapter(sql, connection);
        var table = new DataTable();
        adapter.Fill(table);
        return table;
    }
}
```

Запускайте приложение из PowerShell, чтобы переменные действовали в том же окне:

```powershell
$env:DKIP_CONNECTION='Server=127.0.0.1;Database=dkip2027_course;User ID=root;Password=;Character Set=utf8mb4'
dotnet run
```

Если запускать из Visual Studio кнопкой `F5`, переменные окружения нужно задать в свойствах проекта: `Отладка`, `Переменные среды`. Проще запускать из PowerShell и держать окно открытым. После изменения переменной перезапустите приложение: работающий процесс старое значение не увидит.

Проверьте подключение до сборки интерфейса. Временная кнопка может выполнить `SELECT COUNT(*) FROM users` и показать число. Если запрос прошёл, строка подключения верна и база доступна. Если появилась ошибка, проверьте имя базы, запуск MySQL и кодировку `utf8mb4`.

### Шаг 6. Соберите форму входа

Откройте `LoginForm.cs` двойным щелчком в Обозревателе решений. На форму перетащите из панели элементов:

- `Label` с текстом «Логин»;
- `TextBox` для логина;
- `Label` с текстом «Пароль»;
- `TextBox` для пароля;
- `PictureBox` или место под пазл;
- `Button` с текстом «Войти».

Выделите поле логина и в окне свойств задайте `Name` равным `LoginInput`, а `AccessibleName` равным `Логин`. Для поля пароля задайте `Name` равным `PasswordInput`, `AccessibleName` равным `Пароль` и `UseSystemPasswordChar` равным `True`. Символы пароля будут скрыты.

Кнопке задайте `Name` равным `SignIn`, `Text` равным `Войти`. Двойной щелчок по кнопке создаёт обработчик `Click`. Если обработчик не создался, откройте вкладку событий в окне свойств, найдите `Click` и дважды щёлкните по пустому полю.

Свойства формы тоже важны. Задайте `Text` равным «Ателье Стежок: вход», `StartPosition` равным `CenterScreen`, `ClientSize` примерно `550; 580`. Для аккуратного расположения используйте `FlowLayoutPanel` с `Dock = Fill` или расставляйте элементы вручную.

<figure class="diagram">
<img src="reports/screens/mysql/login.png" alt="Форма входа с логином, паролем и пазлом">
<figcaption>Форма входа: подписи, два поля, образец изображения, сетка фрагментов и кнопка «Войти».</figcaption>
</figure>

В конструкторе формы создайте поля и пазл, чтобы к ним было удобно обращаться из обработчика:

```csharp
readonly TextBox loginBox = new() { Name = "LoginInput", AccessibleName = "Логин", Width = 440 };
readonly TextBox passwordBox = new()
{
    Name = "PasswordInput",
    AccessibleName = "Пароль",
    UseSystemPasswordChar = true,
    Width = 440
};
readonly PuzzleControl puzzle = new();
readonly Button enter = new()
{
    Name = "SignIn",
    Text = "Войти",
    Width = 440,
    Height = 44
};
```

Если вы собираете форму мышью, обработчик создаётся двойным щелчком по кнопке, и в коде будет имя вашего элемента. Ниже показан вариант, где поля и кнопка созданы в конструкторе: так код обработчика совпадает с именами без дополнительных переименований.

Если элементы уже добавлены через конструктор, не создавайте их повторно в коде. Либо перетаскивайте мышью и берите имена из свойств, либо создавайте в конструкторе. Смешивать два способа без необходимости не стоит: появляются два поля с одним именем и путаница при запуске.

Созданные в коде элементы нужно добавить на форму: `Controls.Add(loginBox);`, `Controls.Add(passwordBox);`, `Controls.Add(puzzle);`, `Controls.Add(enter);`. Без этого они существуют в памяти, но не появляются на экране. Для аккуратного расположения положите их в `FlowLayoutPanel` с `Dock = Fill` или задайте каждому свойство `Location`.

### Шаг 7. Сделайте пазл 2 на 2

Пазл это отдельный компонент `PuzzleControl`. Он загружает `1.png`, масштабирует изображение до 200 на 200 и режет на четыре части по 100 на 100. Слева показывается образец, справа сетка 2 на 2. Первое нажатие выбирает фрагмент, второе меняет его местами с выбранным.

```csharp
public class PuzzleControl : UserControl
{
    readonly int[] order = { 1, 0, 3, 2 };
    readonly Button[] tiles = new Button[4];
    readonly Bitmap[] fragments = new Bitmap[4];
    int selected = -1;

    public PuzzleControl()
    {
        Size = new Size(455, 200);
        using var image = Image.FromFile(
            Path.Combine(AppContext.BaseDirectory, "Assets", "1.png"));
        using var scaled = new Bitmap(image, 200, 200);

        Controls.Add(new PictureBox
        {
            Image = new Bitmap(scaled),
            Size = new Size(200, 200),
            SizeMode = PictureBoxSizeMode.StretchImage
        });

        for (int i = 0; i < 4; i++)
        {
            int position = i;
            fragments[i] = scaled.Clone(
                new Rectangle(i % 2 * 100, i / 2 * 100, 100, 100), scaled.PixelFormat);
            tiles[i] = new Button
            {
                Name = "Tile" + i,
                AccessibleName = "Фрагмент " + (i + 1),
                Location = new Point(235 + i % 2 * 102, i / 2 * 100),
                Size = new Size(100, 100),
                FlatStyle = FlatStyle.Flat
            };
            tiles[i].Click += (_, _) =>
            {
                if (selected < 0)
                {
                    selected = position;
                }
                else
                {
                    (order[selected], order[position]) = (order[position], order[selected]);
                    selected = -1;
                }
                RefreshTiles();
            };
            Controls.Add(tiles[i]);
        }
        RefreshTiles();
    }
}
```

Собранность проверяется сравнением порядка с последовательностью `0, 1, 2, 3`:

```csharp
public bool IsSolved() => order.SequenceEqual(new[] { 0, 1, 2, 3 });

public void Shuffle()
{
    do { Random.Shared.Shuffle(order); } while (IsSolved());
    selected = -1;
    RefreshTiles();
}

void RefreshTiles()
{
    for (int i = 0; i < 4; i++)
    {
        tiles[i].Image = fragments[order[i]];
        tiles[i].FlatAppearance.BorderColor = selected == i ? Color.Red : Color.Gray;
        tiles[i].FlatAppearance.BorderSize = selected == i ? 3 : 1;
    }
}
```

Перемешивание повторяется, пока пазл случайно не окажется собранным. Иначе часть студентов получит готовую картинку и не поймёт задание. Обмен меняет только индексы в массиве `order`, а не сами изображения. Если переставлять битмапы, после нескольких обменов части начнут дублироваться.

<figure class="diagram">
<img src="reports/screens/mysql/puzzle.png" alt="Перемешанные фрагменты пазла">
<figcaption>Фрагменты перемешаны: образец слева помогает сравнить расположение частей.</figcaption>
</figure>

<figure class="diagram">
<img src="reports/screens/mysql/puzzle-solved.png" alt="Собранный пазл из четырёх фрагментов">
<figcaption>Порядок 0, 1, 2, 3: изображение собрано, проверка вернёт истину.</figcaption>
</figure>

### Шаг 8. Проверьте вход и сообщения

Обработчик кнопки вызывает `Accounts.SignIn` и открывает рабочее окно только при успехе. Любое исключение превращается в сообщение, приложение остаётся открытым.

```csharp
enter.Click += (_, _) =>
{
    try
    {
        var user = Accounts.SignIn(loginBox.Text, passwordBox.Text, puzzle.IsSolved());
        MessageBox.Show("Вы успешно авторизовались", "Информация");
        Hide();
        using var main = new MainForm(user);
        main.ShowDialog();
        passwordBox.Clear();
        puzzle.Shuffle();
        Show();
    }
    catch (InvalidOperationException ex)
    {
        MessageBox.Show(ex.Message, "Ошибка входа",
            MessageBoxButtons.OK, MessageBoxIcon.Warning);
        puzzle.Shuffle();
    }
    catch (Exception)
    {
        MessageBox.Show(
            "Не удалось подключиться к базе данных. Проверьте MySQL в XAMPP и DKIP_CONNECTION.",
            "Ошибка подключения", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
};
```

Порядок проверок внутри `SignIn` важен. Сначала пустые поля, потом запись пользователя, потом блокировка, потом пароль и пазл. Если сначала обратиться к базе, а потом проверить пустые поля, приложение потратит соединение на заведомо неудачный вход и покажет неверное сообщение при незапущенном MySQL.

Проверьте четыре случая: пустой логин, пустой пароль, несобранный пазл и неверный пароль. Каждый должен дать своё сообщение, а форма остаться на экране. После закрытия сообщения пазл перемешивается заново, чтобы следующая попытка снова требовала сборки.

<figure class="diagram">
<img src="reports/screens/mysql/login-error.png" alt="Сообщение о неверном логине или пароле">
<figcaption>Неверный пароль даёт понятное сообщение, окно входа не закрывается.</figcaption>
</figure>

### Шаг 9. Настройте три ошибки и блокировку

Проверка входа читает запись с блокировкой строки и меняет счётчик в одной транзакции.

```csharp
public static Account SignIn(string login, string password, bool solved)
{
    if (string.IsNullOrWhiteSpace(login) || string.IsNullOrWhiteSpace(password))
        throw new InvalidOperationException("Введите логин и пароль");

    using var connection = Database.Open();
    using var tx = connection.BeginTransaction();

    var select = new MySqlCommand(
        "SELECT id, login, password_hash, salt, role, failed_attempts, is_locked " +
        "FROM users WHERE login = @login FOR UPDATE", connection, tx);
    select.Parameters.AddWithValue("@login", login);

    int id;
    string role;
    int failed;
    bool locked;
    byte[] hash;
    byte[] salt;

    using (var reader = select.ExecuteReader())
    {
        if (!reader.Read())
            throw new InvalidOperationException("Неверный логин или пароль");

        id = reader.GetInt32("id");
        role = reader.GetString("role");
        failed = reader.GetInt32("failed_attempts");
        locked = reader.GetBoolean("is_locked");
        hash = (byte[])reader["password_hash"];
        salt = (byte[])reader["salt"];
    }

    if (locked)
        throw new InvalidOperationException(
            "Учётная запись заблокирована. Обратитесь к администратору");

    bool passwordOk = CryptographicOperations.FixedTimeEquals(Hash(password, salt), hash);

    if (!passwordOk || !solved)
    {
        failed++;
        var update = new MySqlCommand(
            "UPDATE users SET failed_attempts = @failed, is_locked = @locked WHERE id = @id",
            connection, tx);
        update.Parameters.AddWithValue("@failed", failed);
        update.Parameters.AddWithValue("@locked", failed >= 3);
        update.Parameters.AddWithValue("@id", id);
        update.ExecuteNonQuery();
        tx.Commit();

        throw new InvalidOperationException(failed >= 3
            ? "Учётная запись заблокирована. Обратитесь к администратору"
            : passwordOk ? "Соберите изображение" : "Неверный логин или пароль");
    }

    var reset = new MySqlCommand(
        "UPDATE users SET failed_attempts = 0 WHERE id = @id", connection, tx);
    reset.Parameters.AddWithValue("@id", id);
    reset.ExecuteNonQuery();
    tx.Commit();

    return new Account(id, login, role);
}

static byte[] Hash(string password, byte[] salt) =>
    Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
```

Разберём ветки. Если запись заблокирована, счётчик не меняется и вход запрещён. Если пароль и пазл верны, счётчик обнуляется. Если пароль неверен или пазл не собран, счётчик увеличивается, а при достижении трёх ставится `is_locked = true`.

В начале `Accounts.cs` подключите пространство имён `System.Security.Cryptography`, иначе компилятор не найдёт `Rfc2898DeriveBytes` и `CryptographicOperations`. В `MainForm.cs` добавьте `using System.Data;` для `DataRowView`.

Третья ошибка ставит признак блокировки в той же транзакции, что и счётчик. Если записать счётчик и упасть до записи признака, блокировка потеряется, и пользователь получит четвёртую попытку. `FOR UPDATE` не даёт двум копиям приложения одновременно прочитать один и тот же счётчик.

Проверка пазла входит в ту же ветку, что и пароль. Неверно собранный пазл при верном пароле это неудачная попытка. Это требование часто пропускают: проверяют пазл отдельным сообщением и не считают его ошибкой.

Проверьте сценарий: ошибитесь три раза подряд, закройте приложение, запустите снова и попробуйте войти с правильным паролем. Вход должен быть запрещён. Затем посмотрите запись в базе:

```sql
SELECT login, failed_attempts, is_locked FROM users WHERE login = 'student';
```

Значение `is_locked` должно быть `1`, `failed_attempts` равно `3`. Если после перезапуска вход прошёл, значит, счётчик хранился в памяти формы или транзакция не сохранилась.

<figure class="diagram">
<img src="reports/screens/mysql/locked.png" alt="Сообщение о блокировке учётной записи">
<figcaption>Третья подряд ошибка закрывает вход: признак блокировки записан в базу.</figcaption>
</figure>

### Шаг 10. Откройте рабочее окно и разграничьте роли

После успешного входа открывается `MainForm`. Она получает объект пользователя с идентификатором и ролью, но не получает пароль: после проверки он больше не нужен.

```csharp
public record Account(int Id, string Login, string Role);
```

Рабочее окно создаёт вкладки и добавляет управление пользователями только для администратора.

```csharp
public MainForm(Account user)
{
    actor = user;
    Text = "Ателье Стежок: " + user.Login;
    ClientSize = new Size(1000, 640);

    var tabs = new TabControl { Dock = DockStyle.Fill };
    Controls.Add(tabs);
    tabs.TabPages.Add(new TabPage("Заказ"));

    if (user.Role == "admin")
    {
        var page = new TabPage("Пользователи");
        tabs.TabPages.Add(page);
        page.Controls.Add(BuildUsersPage());
        LoadUsers();
    }
}
```

Вкладку «Пользователи» удобно собирать в конструкторе: перетащите `TabControl` на форму, задайте `Dock = Fill`, добавьте вкладку «Заказ», а вторую вкладку создайте в коде только для администратора. Внутри вкладки разместите `DataGridView` с `Dock = Fill` и панель редактирования с полями. Метод `BuildUsersPage` в примере просто собирает эти элементы в одну панель, его содержимое разобрано ниже.

`DataGridView` добавляется из панели элементов. В окне свойств задайте `ReadOnly = True`, `AllowUserToAddRows = False`, `SelectionMode = FullRowSelect`, `MultiSelect = False`, `AutoSizeColumnsMode = Fill`. Тогда таблица не даст случайно изменить данные и будет выделять строку целиком.

Список пользователей загружается только после проверки роли. Если загрузить его до проверки, обычный пользователь получит данные на мгновение, даже если вкладка потом скрыта.

```csharp
void LoadUsers()
{
    Accounts.RequireAdmin(actor);
    usersGrid.DataSource = Database.Query(
        "SELECT id, login, role, failed_attempts, is_locked FROM users ORDER BY id");
}
```

Метод `RequireAdmin` вызывается и при загрузке, и при сохранении:

```csharp
public static void RequireAdmin(Account actor)
{
    if (actor.Role != "admin")
        throw new InvalidOperationException(
            "Недостаточно прав для управления пользователями");
}
```

Войдите как `student` и убедитесь, что вкладки нет. Войдите как `admin` и проверьте, что вкладка появилась. Логин в заголовке окна помогает убедиться, что вошёл именно тот пользователь, который собирался.

<figure class="diagram">
<img src="reports/screens/mysql/main.png" alt="Рабочее окно администратора с вкладками">
<figcaption>После входа администратор видит данные заказа и вкладку управления пользователями.</figcaption>
</figure>

### Шаг 11. Добавьте управление пользователями

На вкладке «Пользователи» разместите таблицу и панель с полями:

- `TextBox` для логина;
- `TextBox` для нового пароля со скрытыми символами;
- `ComboBox` для роли со значениями `user` и `admin`;
- `CheckBox` с текстом «Снять блокировку»;
- кнопки «Новый» и «Сохранить».

Значения роли добавьте в `Items` при загрузке формы: `roleBox.Items.AddRange(new[] { "user", "admin" });`, затем выберите `roleBox.SelectedIndex = 0;`. Без этого список ролей будет пустым, и сохранить пользователя не получится.

Таблица показывает `id`, `login`, `role`, `failed_attempts`, `is_locked`. Хеш и соль в выборку не попадают: они не нужны для управления и раскрывают внутреннее устройство защиты.

При выборе строки заполните поля текущими значениями. Пустой новый пароль при изменении означает сохранение прежнего. Иначе администратор, меняя роль, случайно сбросит пароль и заблокирует человеку вход.

Поля и таблицу объявите в классе формы, чтобы к ним обращались и загрузка, и сохранение:

```csharp
readonly Account actor;
readonly DataGridView usersGrid = new() { Dock = DockStyle.Fill, ReadOnly = true };
readonly TextBox loginBox = new() { Width = 160 };
readonly TextBox passwordBox = new() { Width = 160, UseSystemPasswordChar = true };
readonly ComboBox roleBox = new() { Width = 120, DropDownStyle = ComboBoxStyle.DropDownList };
readonly CheckBox unlockBox = new() { Text = "Снять блокировку", AutoSize = true };
int? editingId;
```

```csharp
usersGrid.CellClick += (_, e) =>
{
    if (e.RowIndex < 0 || usersGrid.Rows[e.RowIndex].DataBoundItem is not DataRowView row)
        return;

    editingId = Convert.ToInt32(row.Row["id"]);
    loginBox.Text = (string)row.Row["login"];
    roleBox.SelectedItem = (string)row.Row["role"];
    passwordBox.Clear();
    unlockBox.Checked = false;
};
```

Сохранение проверяет роль администратора, обязательные поля, длину пароля и допустимую роль. Вставка и обновление выполняются параметризованными командами, а ошибка уникального ключа переводится в понятное сообщение.

```csharp
public static void Save(Account actor, int? id, string login,
                        string password, string role, bool unlock)
{
    RequireAdmin(actor);

    if (string.IsNullOrWhiteSpace(login))
        throw new InvalidOperationException("Введите логин");
    if (role != "admin" && role != "user")
        throw new InvalidOperationException("Выберите роль");
    if (id is null && password.Length < 6)
        throw new InvalidOperationException("Пароль должен быть не короче 6 символов");

    using var connection = Database.Open();
    try
    {
        if (id is null)
        {
            byte[] salt = RandomNumberGenerator.GetBytes(16);
            var insert = new MySqlCommand(
                "INSERT INTO users (login, password_hash, salt, role, failed_attempts, is_locked) " +
                "VALUES (@login, @hash, @salt, @role, 0, FALSE)", connection);
            insert.Parameters.AddWithValue("@login", login);
            insert.Parameters.AddWithValue("@hash", Hash(password, salt));
            insert.Parameters.AddWithValue("@salt", salt);
            insert.Parameters.AddWithValue("@role", role);
            insert.ExecuteNonQuery();
        }
        else if (string.IsNullOrEmpty(password))
        {
            var update = new MySqlCommand(
                "UPDATE users SET login = @login, role = @role, " +
                "failed_attempts = IF(@unlock, 0, failed_attempts), " +
                "is_locked = IF(@unlock, FALSE, is_locked) WHERE id = @id", connection);
            update.Parameters.AddWithValue("@login", login);
            update.Parameters.AddWithValue("@role", role);
            update.Parameters.AddWithValue("@unlock", unlock);
            update.Parameters.AddWithValue("@id", id);
            update.ExecuteNonQuery();
        }
        else
        {
            byte[] salt = RandomNumberGenerator.GetBytes(16);
            var update = new MySqlCommand(
                "UPDATE users SET login = @login, role = @role, password_hash = @hash, salt = @salt, " +
                "failed_attempts = IF(@unlock, 0, failed_attempts), " +
                "is_locked = IF(@unlock, FALSE, is_locked) WHERE id = @id", connection);
            update.Parameters.AddWithValue("@login", login);
            update.Parameters.AddWithValue("@role", role);
            update.Parameters.AddWithValue("@hash", Hash(password, salt));
            update.Parameters.AddWithValue("@salt", salt);
            update.Parameters.AddWithValue("@unlock", unlock);
            update.Parameters.AddWithValue("@id", id);
            update.ExecuteNonQuery();
        }
    }
    catch (MySqlException ex) when (ex.Number == 1062)
    {
        throw new InvalidOperationException("Логин уже занят");
    }
}
```

Обновление выполняется по `id`, а не по логину. Логин администратор может изменить в той же форме, и условие по нему перестанет находить запись. Код `1062` означает нарушение уникального ключа в MySQL. Ловить общее исключение и писать «Ошибка» нельзя: человек не поймёт, что исправить.

Создайте пользователя `operator` с ролью `user`, затем повторите тот же логин. Первое сохранение должно пройти, второе дать сообщение «Логин уже занят». Затем выберите заблокированную запись, отметьте снятие блокировки и сохраните. После этого войдите под ней с прежним паролем.

<figure class="diagram">
<img src="reports/screens/mysql/users.png" alt="Таблица пользователей у администратора">
<figcaption>Администратор видит логин, роль, счётчик ошибок и признак блокировки, но не видит хеш.</figcaption>
</figure>

<figure class="diagram">
<img src="reports/screens/mysql/unlock.png" alt="Снятие блокировки учётной записи">
<figcaption>Снятие блокировки обнуляет счётчик ошибок, вход снова разрешён.</figcaption>
</figure>

### Шаг 12. Проверьте сценарии и заполните протокол

Пройдите проверки по порядку и запишите результат каждой. В столбец «Факт» пишите то, что видно на экране, и то, что стало в базе.

| Сценарий | Ожидание | Факт |
|---|---|---|
| Пустой логин | сообщение, форма открыта | |
| Пустой пароль | сообщение, форма открыта | |
| Неверный пароль | сообщение, `failed_attempts` увеличился | |
| Несобранный пазл при верном пароле | сообщение, `failed_attempts` увеличился | |
| Третья ошибка | `is_locked = 1`, вход запрещён | |
| Перезапуск приложения | блокировка сохранилась | |
| Вход администратора | вкладка «Пользователи» есть | |
| Вход пользователя | вкладки «Пользователи» нет | |
| Новый пользователь | запись создана, вход работает | |
| Повтор логина | сообщение о дубле | |
| Снятие блокировки | вход с прежним паролем разрешён | |
| Недоступная база | сообщение, приложение не закрылось | |

Последний сценарий проверьте отдельно. Остановите MySQL в XAMPP и попробуйте войти. Приложение должно показать сообщение о подключении и остаться открытым. Затем запустите MySQL снова и повторите вход. Необработанное исключение в этот момент закрывает программу и не даёт прочитать сообщение.

Скриншоты делайте как доказательства шагов: форма входа, сообщение об ошибке, пазл, блокировка, рабочее окно, таблица пользователей, снятие блокировки. Снимок пустой формы без данных ничего не подтверждает.

## Команды и приёмы, которые нужны чаще всего

| Действие | Где выполнить | Зачем |
|---|---|---|
| `Ctrl+Alt+X` | Visual Studio | Открыть панель элементов |
| `F4` | Visual Studio | Открыть окно свойств |
| `F7` | Visual Studio | Перейти от формы к коду |
| `Ctrl+Shift+B` | Visual Studio | Собрать решение |
| `F5` | Visual Studio | Запустить с отладкой |
| `Ctrl+Alt+L` | Visual Studio | Открыть обозреватель решений |
| `dotnet add package MySqlConnector` | PowerShell в папке проекта | Добавить драйвер MySQL |
| `dotnet run` | PowerShell в папке проекта | Запустить приложение |
| `SHOW CREATE TABLE users;` | phpMyAdmin, вкладка SQL | Проверить ограничения таблицы |
| `SELECT ... FOR UPDATE` | Код или phpMyAdmin | Заблокировать строку на время транзакции |
| `UPDATE users SET failed_attempts = 0, is_locked = FALSE WHERE id = ...` | phpMyAdmin | Снять блокировку вручную для проверки |
| `SELECT id, login, role, failed_attempts, is_locked FROM users;` | phpMyAdmin | Сверить состояние после сценария |

Полезно держать под рукой проверку версии и сборки:

```powershell
dotnet --version
dotnet build
dotnet run
```

`dotnet build` показывает ошибки компиляции без запуска окна. Если приложение не открывается, сначала смотрите вывод сборки, а не сообщение Windows.

## Частые ошибки

**Счётчик ошибок в памяти формы.** После перезапуска блокировка исчезает, и вход снова проходит. Исправление: хранить `failed_attempts` и `is_locked` в таблице `users`, а не в полях класса формы.

**Пазл проверяется отдельно.** Неверный пазл не считается неудачной попыткой, и блокировка не наступает. Исправление: проверять пазл в той же ветке, что и пароль, и увеличивать общий счётчик.

**Блокировка не сохраняется.** Счётчик записан, признак блокировки нет, или транзакция не зафиксирована. Исправление: менять оба поля одной командой и вызывать `Commit`.

**Проверка роли только в интерфейсе.** Вкладка скрыта, но метод сохранения доступен. Исправление: вызывать `RequireAdmin` в каждом методе изменения данных.

**Пароль хранится строкой.** Любой, кто открыл базу, читает пароль. Исправление: хранить хеш PBKDF2 и соль, сравнивать хеши.

**Хеш и соль в таблице администратора.** Служебные поля раскрывают устройство защиты и мешают работе. Исправление: выбирать только `id`, `login`, `role`, `failed_attempts`, `is_locked`.

**Проверка уникальности запросом.** Между `SELECT` и `INSERT` другой администратор успевает создать такой же логин. Исправление: ограничение `UNIQUE` и обработка ошибки `1062`.

**Пустой пароль при изменении записывается как новый.** Пользователь теряет доступ. Исправление: пустой пароль означает сохранение прежнего хеша.

**Обновление по логину.** После смены логина запись не находится. Исправление: обновлять по `id`.

**Необработанное исключение.** При недоступной базе приложение закрывается без сообщения. Исправление: отдельные блоки `catch` для проверки входа и для ошибки соединения.

**Пароль в строке подключения на экране.** Сообщение об ошибке показывает реквизиты базы. Исправление: выводить общий текст, а подробности оставлять в журнале.

## Чек-лист перед сдачей

- Проект собирается без ошибок и запускается.
- Платформа проекта `.NET 10.0`, пакет `MySqlConnector` установлен.
- Таблица `users` содержит логин, хеш, соль, роль, счётчик и признак блокировки.
- Форма входа содержит подписи, два поля, пазл и кнопку.
- Поле пароля скрывает символы.
- Пазл состоит из четырёх фрагментов и собирается обменом.
- Пустые поля дают сообщение, форма не закрывается.
- Неверный пароль и несобранный пазл увеличивают счётчик.
- Третья ошибка ставит блокировку, которая переживает перезапуск.
- Успешный вход обнуляет счётчик.
- Роль `user` не видит вкладку управления пользователями.
- Методы сохранения вызывают `RequireAdmin`.
- Администратор создаёт, изменяет и разблокирует пользователя.
- Дубль логина даёт сообщение «Логин уже занят».
- Ошибка подключения не закрывает приложение.
- Протокол заполнен фактическими результатами, а не галочками.
- В проекте нет пароля базы в исходниках.
- Скриншоты показывают вход, ошибку, пазл, блокировку, пользователей и разблокировку.

Потренируйтесь на вариантах: [Варианты для нарешивания](08-variants.html).
