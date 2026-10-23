export const ID = "fig-11-http";
export const TITLE = "Один запрос, пять причин";
export const HINT = "Выберите сценарий: штампы покажут, на какой проверке запрос остановился.";
export const CAPTION =
  "Один и тот же запрос останавливается на первой непройденной проверке; код состояния говорит, какая это проверка. При успехе все штампы сработали и ответ уходит клиенту.";

export const KEYS = [
  { mark: "lit", label: "Штамп пройденной проверки" },
  { mark: "raised", label: "Каретка с бланком запроса" },
  { mark: "dim", label: "Стрелка кода ответа" },
];

export const REQUEST = {
  method: "GET",
  path: "/api/schedule",
  query: "group=ИС-21&date=2026-10-22",
  headers: [
    "Host: uifis.local",
    "Authorization: Bearer <token>",
    "Accept: application/json",
  ],
  port: "8080",
};

export const RESPONSE_OK = {
  status: "HTTP/1.1 200 OK",
  contentType: "application/json; charset=utf-8",
  body: '{"group":"ИС-21","lessons":[{"time":"09:00","subject":"Базы данных"}]}',
};

// Порядок проверок на сервере: первая проваленная останавливает запрос.
export const CHECKS = [
  { name: "Сам токен", code: 401 },
  { name: "Права", code: 403 },
  { name: "Путь", code: 404 },
  { name: "Параметры", code: 400 },
  { name: "База", code: 500 },
];

// Позиции на диске-кодировщике: шесть насечек, шесть кодов.
export const CODES = [200, 400, 401, 403, 404, 500];

// Индекс 0 это успех; индекс s это отказ на проверке s (s от 1 до 5).
export const SCENARIOS = [
  { code: 200, verdict: "все проверки пройдены", failed: 0 },
  { code: 401, verdict: "нет токена", failed: 1 },
  { code: 403, verdict: "прав недостаточно", failed: 2 },
  { code: 404, verdict: "нет пути", failed: 3 },
  { code: 400, verdict: "неверные параметры", failed: 4 },
  { code: 500, verdict: "ошибка базы", failed: 5 },
];

export const FIG_LABEL =
  "Печная рамка с пятью штампами над рельсом. Каретка несёт бланк запроса вдоль рельса под штампами: токен, права, путь, параметры, база. Пройденная проверка опускает свой штамп на бланк; первая проваленная останавливает каретку, стрелка диска кодировщика показывает код ответа, а лента журнала печатает строку.";
