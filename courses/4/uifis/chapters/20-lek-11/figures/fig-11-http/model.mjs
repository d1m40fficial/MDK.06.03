export const ID = "fig-11-http";
export const TITLE = "HTTP запрос и ответ";
export const HINT = "Наведите или используйте стрелки: проведите запрос по цепочке.";
export const CAPTION = "Запрос идёт от клиента к серверу, сервер читает базу и возвращает ответ. Журнал фиксирует результат.";
export const KEYS = [
  { mark: "lit", label: "Каретка: текущий шаг" },
  { mark: "raised", label: "Пять станций обмена" },
  { mark: "dim", label: "Направление запроса" },
];
export const STATIONS = [
  { label: "КЛИЕНТ", short: "GET", detail: "GET /api/schedule · запрос" },
  { label: "СЕРВЕР", short: "проверка", detail: "проверка прав и логики" },
  { label: "БАЗА", short: "SELECT", detail: "SQL-запрос к данным" },
  { label: "ОТВЕТ", short: "200/500", detail: "JSON или ошибка" },
  { label: "ЖУРНАЛ", short: "log", detail: "запись результата" },
];
