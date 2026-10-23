export const ID = "fig-19-reliability";
export const TITLE = "Дублированный насосный агрегат";
export const HINT = "Откажите основной насос: клапан переведёт поток на резерв.";
export const CAPTION =
  "При отказе A клапан переводит поток на B, давление кратко проседает и восстанавливается. Журнал фиксирует переключение, а резервная копия проверяется отдельно от RAID.";
export const KEYS = [
  { mark: "lit", label: "Насос A: основной путь, держит давление" },
  { mark: "raised", label: "Насос B: горячий резерв, включён и ждёт нагрузки" },
  { mark: "dotted", label: "Перекидной клапан с рычагом и пружиной" },
  { mark: "dim", label: "Манометр и расходомер: давление и поток" },
  { mark: "dashed", label: "Журнал переключений и счётчик часов" },
];

export const STEPS = [
  { key: "norm", label: "норма", short: "норма", readout: "reliability · норма" },
  { key: "fail", label: "отказ A", short: "отказ", readout: "reliability · отказ A" },
  { key: "switch", label: "переключение", short: "клапан", readout: "reliability · переключение" },
  { key: "degraded", label: "деградация", short: "деградация", readout: "reliability · деградация" },
  { key: "repair", label: "ремонт A", short: "ремонт", readout: "reliability · ремонт A" },
  { key: "standby", label: "возврат в резерв", short: "в резерв", readout: "reliability · A в резерве" },
  { key: "restore", label: "проверка копии", short: "копия", readout: "reliability · копия проверена" },
];

// Модель правды: поток, давление и счётчики на каждом шаге.
// valve: 0 держит насос A, 1 держит насос B.
// a и b: run работает, standby горячий резерв, fail отказ, off ремонт.
export const STATES = [
  { valve: 0, a: "run", b: "standby", pressure: 6.2, flow: 118, hours: 1204, switches: 7, log: 0, tag: false, kit: false, check: false, dip: 0 },
  { valve: 0, a: "fail", b: "standby", pressure: 0.4, flow: 0, hours: 1204, switches: 7, log: 1, tag: true, kit: false, check: false, dip: 0 },
  { valve: 1, a: "fail", b: "run", pressure: 6.0, flow: 112, hours: 1205, switches: 8, log: 2, tag: true, kit: false, check: false, dip: 2.8 },
  { valve: 1, a: "fail", b: "run", pressure: 6.0, flow: 112, hours: 1206, switches: 8, log: 3, tag: true, kit: true, check: false, dip: 0 },
  { valve: 1, a: "off", b: "run", pressure: 6.1, flow: 116, hours: 1208, switches: 8, log: 4, tag: true, kit: true, check: false, dip: 0 },
  { valve: 1, a: "standby", b: "run", pressure: 6.2, flow: 118, hours: 1209, switches: 8, log: 5, tag: false, kit: false, check: false, dip: 0 },
  { valve: 1, a: "standby", b: "run", pressure: 6.2, flow: 118, hours: 1210, switches: 8, log: 6, tag: false, kit: false, check: true, dip: 0 },
];

// Журнал переключений: время и событие.
export const JOURNAL = [
  { t: "08:40", e: "норма" },
  { t: "08:42", e: "отказ" },
  { t: "08:43", e: "клапан" },
  { t: "08:44", e: "деград" },
  { t: "09:10", e: "ремонт" },
  { t: "09:36", e: "резерв" },
  { t: "10:05", e: "копия" },
];

// Шкалы приборов: диапазон и допустимые значения.
export const GAUGES = {
  pressure: { unit: "бар", min: 0, max: 10 },
  flow: { unit: "м3/ч", min: 0, max: 160 },
};
