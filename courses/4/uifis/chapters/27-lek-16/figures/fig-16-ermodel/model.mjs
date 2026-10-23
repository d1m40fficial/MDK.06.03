export const ID = "fig-16-ermodel";
export const TITLE = "Сборочный стол сущностей и ключей";
export const HINT = "Соберите связи по ключам и уберите дубликаты рычагом нормализации.";
export const CAPTION =
  "Ящики описывают студента, курс, запись и оценку. Тяги соединяют внешний ключ с первичным, а рычаг нормализации убирает дубликаты до физической схемы.";
export const KEYS = [
  { mark: "lit", label: "Четыре ящика-сущности с табличками имён" },
  { mark: "raised", label: "Штыри первичных ключей в центре ящиков" },
  { mark: "dotted", label: "Гибкие тяги внешних ключей и их гнёзда" },
  { mark: "red", label: "Карточки дубликатов уезжают в лоток на выброс" },
  { mark: "green", label: "Лоток физической схемы с табличками ограничений" },
];

export const STEPS = [
  { key: "entities", label: "сущности", short: "сущности", readout: "ER · сущности" },
  { key: "keys", label: "первичные ключи", short: "ключи", readout: "ключи · 4 штыря" },
  { key: "links", label: "внешние ключи", short: "связи", readout: "связи · 3 тяги" },
  { key: "duplicate", label: "дубликат", short: "дубликат", readout: "дубликат · 2 версии факта" },
  { key: "nf1", label: "первая нормальная форма", short: "1НФ", readout: "1НФ · группы убраны" },
  { key: "nf2", label: "вторая нормальная форма", short: "2НФ", readout: "2НФ · часть ключа убрана" },
  { key: "nf3", label: "третья нормальная форма", short: "3НФ", readout: "3НФ · транзит убран" },
  { key: "physical", label: "физическая схема", short: "схема", readout: "схема · ключи и типы" },
];

// Истинная модель главы: четыре сущности, их ключи и неключевые атрибуты.
// Порядок ящиков слева направо: Студент, Курс, Запись, Оценка.
export const ENTITIES = [
  {
    key: "student",
    label: "Студент",
    primary: "student_id",
    attributes: [
      { name: "student_id", key: true },
      { name: "full_name" },
      { name: "birth_date" },
      { name: "group_no" },
    ],
  },
  {
    key: "course",
    label: "Курс",
    primary: "course_id",
    attributes: [
      { name: "course_id", key: true },
      { name: "course_name" },
      { name: "credits" },
      { name: "hours" },
    ],
  },
  {
    key: "enroll",
    label: "Запись",
    primary: "enrollment_id",
    attributes: [
      { name: "enrollment_id", key: true },
      { name: "student_id", fk: "student" },
      { name: "course_id", fk: "course" },
      { name: "enrolled_at" },
    ],
  },
  {
    key: "grade",
    label: "Оценка",
    primary: "grade_id",
    attributes: [
      { name: "grade_id", key: true },
      { name: "enrollment_id", fk: "enroll" },
      { name: "value" },
      { name: "graded_at" },
    ],
  },
];

// Внешние ключи: от гнезда в дочернем ящике к штырю первичного ключа.
export const LINKS = [
  {
    key: "enroll-student",
    from: "enroll",
    field: "student_id",
    pad: 1,
    to: "student",
    cardinality: "многие ко многим через запись",
    label: "Запись.student_id к Студент.student_id",
  },
  {
    key: "enroll-course",
    from: "enroll",
    field: "course_id",
    pad: 2,
    to: "course",
    cardinality: "многие ко многим через запись",
    label: "Запись.course_id к Курс.course_id",
  },
  {
    key: "grade-enroll",
    from: "grade",
    field: "enrollment_id",
    pad: 1,
    to: "enroll",
    cardinality: "один к одному",
    label: "Оценка.enrollment_id к Запись.enrollment_id",
  },
];

// Дубликаты: карточка стоит в кармане передней стенки ящика и уезжает в лоток
// на шаге своей нормальной формы.
export const DUPLICATES = [
  {
    key: "repeating",
    form: "1НФ",
    step: 4,
    drawer: "student",
    label: "повторяющиеся группы",
    removes: "несколько значений телефона в одной ячейке",
  },
  {
    key: "partial",
    form: "2НФ",
    step: 5,
    drawer: "enroll",
    label: "зависимость от части ключа",
    removes: "course_name при составном ключе записи",
  },
  {
    key: "transitive",
    form: "3НФ",
    step: 6,
    drawer: "course",
    label: "зависимость неключевого поля",
    removes: "credits зависят от course_name, а не от course_id",
  },
];

// Три положения рычага нормализации, угол в градусах от вертикали.
export const FORMS = [
  { key: "nf1", mark: "1НФ", angle: -30, removes: "повторяющиеся группы" },
  { key: "nf2", mark: "2НФ", angle: 0, removes: "зависимость от части составного ключа" },
  { key: "nf3", mark: "3НФ", angle: 30, removes: "зависимость неключевого поля от неключевого" },
];

// Физическая модель: таблички в лотке справа, сверху вниз по шагам.
export const PHYSICAL = {
  label: "физическая схема",
  plates: [
    { key: "table", label: "CREATE TABLE", note: "четыре таблицы" },
    { key: "pk", label: "PRIMARY KEY", note: "student_id, course_id, enrollment_id, grade_id" },
    { key: "fk", label: "FOREIGN KEY", note: "три ссылки на первичные ключи" },
    { key: "rules", label: "UNIQUE, CHECK, индекс", note: "уникальность и индексы по внешним ключам" },
  ],
  note: "физическая модель задаёт типы, первичные и внешние ключи, уникальность, проверки и индексы",
};
