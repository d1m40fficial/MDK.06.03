export const ID = "fig-12-integration";
export const TITLE = "Адаптер и ловушка дубля";
export const HINT = "Проведите запись через адаптер: словарь, преобразование, повтор, сверка.";
export const CAPTION = "Адаптер переписывает поля по словарю соответствий; повторная запись не попадает в приёмник второй раз, а счётчики сверяют, отправила и приняла ли система одинаковое число записей.";
export const KEYS = [
  { mark: "lit", label: "Запись и пружинные стержни переводника" },
  { mark: "raised", label: "Карта в лотке приёмника: поля уже на местах ERP" },
  { mark: "dim", label: "Ловушка дубля: копия уходит в клапан и счётчик" },
];

export const STEPS = [
  { key: "dictionary", label: "словарь", short: "словарь", readout: "CRM · JSON" },
  { key: "fio", label: "преобразование fio", short: "fio", readout: "переводник · fio" },
  { key: "sum", label: "преобразование sum", short: "sum", readout: "переводник · sum" },
  { key: "duplicate", label: "повторная доставка", short: "повтор", readout: "кассета · повтор отклонён" },
  { key: "check", label: "сверка", short: "сверка", readout: "сверка · 100 из 100" },
];

// Истинные числа главы: карта записи с тремя полями и счётчики журнала.
export const SOURCE = '{"client_id":101,"fio":"Иванов Иван","sum":1500.0}';
export const MATCH = [
  { from: "client_id", to: "customer_code", note: "число" },
  { from: "fio", to: "name", note: "строка" },
  { from: "sum", to: "total", note: "число" },
];
export const COUNTERS = {
  sent: { label: "отправлено", base: 100, step: "every", note: "запись уходит из CRM" },
  taken: { label: "принято", base: 100, step: "second", note: "каждый второй шаг обмена" },
  rejected: { label: "отклонено", base: 0, step: "reject", note: "копия в клапане на повторе" },
};
