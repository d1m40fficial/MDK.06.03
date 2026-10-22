export const ID = "fig-12-integration";
export const TITLE = "Интеграция ИС";
export const HINT = "Наведите или используйте стрелки: данные проходят через адаптер.";
export const CAPTION = "Данные из CRM проходят проверку и преобразование в адаптере, затем попадают в бухгалтерию. Журнал хранит результат сверки.";
export const KEYS = [
  { mark: "lit", label: "Каретка: текущий шаг обмена" },
  { mark: "raised", label: "Шесть станций интеграции" },
  { mark: "dim", label: "Направление данных" },
];
export const STATIONS = [
  { label: "CRM", short: "JSON", detail: "клиенты и сделки" },
  { label: "JSON", short: "формат", detail: "структура источника" },
  { label: "АДАПТЕР", short: "проверка", detail: "поля, типы и правила" },
  { label: "XML", short: "формат", detail: "структура приёмника" },
  { label: "ERP", short: "счета", detail: "бухгалтерия" },
  { label: "ЖУРНАЛ", short: "сверка", detail: "количество и суммы" },
];
