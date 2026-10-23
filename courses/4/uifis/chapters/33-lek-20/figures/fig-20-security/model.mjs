export const ID = "fig-20-security";
export const TITLE = "Ключевая стойка и журнальный барабан";
export const HINT = "Выберите роль: ключ откроет свои дверцы, а журнал запишет попытку.";
export const CAPTION =
  "Ключ student открывает только свой ряд, teacher два разрешённых, administrator управляющий. Неверный ключ не поворачивает замок, но попытка попадает в журнал.";
export const KEYS = [
  { mark: "lit", label: "Ключ роли: барабан выдаёт teacher, ключ входит в замок" },
  { mark: "raised", label: "Три ряда дверцей: student, teacher, admin, у каждой свой замок" },
  { mark: "red", label: "Лампа отказа и журнальный барабан: строка на каждую попытку" },
];

export const STEPS = [
  { key: "identity", label: "личность", short: "личность", readout: "security · личность" },
  { key: "key", label: "ключ из барабана", short: "ключ", readout: "security · ключ teacher" },
  { key: "role", label: "роль teacher", short: "роль", readout: "security · роль teacher" },
  { key: "own", label: "свой ряд: teacher и student", short: "свой ряд", readout: "доступ · teacher и student" },
  { key: "foreign", label: "чужой ряд: admin", short: "чужой ряд", readout: "доступ · admin закрыт" },
  { key: "denied", label: "лампа отказа", short: "отказ", readout: "отказ · замок не повёрнут" },
  { key: "journal", label: "журнальный барабан", short: "журнал", readout: "журнал · 3 записи" },
  { key: "review", label: "разбор журнала", short: "разбор", readout: "журнал · 3 / 2 / 1" },
];

// Модель правды: роль, число зубцов ключа и число разрешённых рядов.
export const ROLES = [
  { key: "student", teeth: 1, rows: ["student"], note: "читает свои оценки, чужие не меняет" },
  { key: "teacher", teeth: 2, rows: ["student", "teacher"], note: "выставляет оценки в своей группе" },
  { key: "admin", teeth: 3, rows: ["admin"], note: "управляет пользователями и правами" },
];

// Журнал аудита: кто, что открывал, результат. Пароли и токены не пишутся.
export const JOURNAL = [
  { who: "teacher", what: "student row", result: "ok" },
  { who: "teacher", what: "teacher row", result: "ok" },
  { who: "teacher", what: "admin row", result: "deny" },
];

export const COUNTERS = [
  { key: "records", label: "записи" },
  { key: "allowed", label: "разрешено" },
  { key: "denied", label: "отказ" },
];
