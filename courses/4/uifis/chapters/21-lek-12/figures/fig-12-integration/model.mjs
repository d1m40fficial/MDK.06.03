export const ID = "fig-12-integration";
export const TITLE = "Переводник и ловушка дубля";
export const HINT = "Проведите запись через переводник: три поля, повтор, сверка.";
export const CAPTION =
  "Три штампа переводят client_id, fio и sum в customer_code, name и total. Повторная карта уходит в брак, а счётчики показывают отправлено 101, принято 100 и отклонено 1.";
export const KEYS = [
  { mark: "lit", label: "Карта записи: три поля едут по рельсу" },
  { mark: "raised", label: "Три штампа переводника: client_id, fio и sum" },
  { mark: "dim", label: "Ловушка повтора: копия уходит в брак, счётчики фиксируют три числа" },
];

export const STEPS = [
  { key: "dictionary", label: "словарь", short: "словарь", readout: "CRM · JSON" },
  { key: "client", label: "client_id → customer_code", short: "client_id", readout: "переводник · client_id" },
  { key: "fio", label: "fio → name", short: "fio", readout: "переводник · fio" },
  { key: "sum", label: "sum → total", short: "sum", readout: "переводник · sum" },
  { key: "duplicate", label: "повторная доставка", short: "повтор", readout: "ловушка · повтор отклонён" },
  { key: "check", label: "сверка", short: "сверка", readout: "сверка · 101 / 100 / 1" },
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
