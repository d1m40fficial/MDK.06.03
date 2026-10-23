export const ID = "fig-18-support";

export const TITLE = "Тележка сопровождения";

export const HINT = "Проведите тележку по маршруту: внедрение, поддержка, изменение, архив.";

export const CAPTION =
  "Тележка везёт документацию, запасные узлы, инструменты и журнал обращений. " +
  "Она проходит внедрение, обучение, приёмку, линии поддержки и изменение, " +
  "а в конце закрывает доступы и сдаёт данные в архив.";

export const KEYS = [
  { mark: "lit", label: "Тележка и открытый ящик: что нужно на этом шаге" },
  { mark: "raised", label: "Планшет маршрута, часы SLA, счётчик обращений, стрелка приоритета" },
  { mark: "dim", label: "Стойки системы и ворота архива с запечатанным ящиком" },
];

// Четыре ящика тележки. Ящик открывается на том шаге, где он нужен.
export const DRAWERS = [
  { key: "docs", label: "документация", note: "руководства, регламент, план восстановления" },
  { key: "spares", label: "запасные узлы", note: "модули и кабели на замену" },
  { key: "tools", label: "инструменты", note: "набор для осмотра и правки" },
  { key: "journal", label: "журнал обращений", note: "запись инцидентов и изменений" },
];

// Пять стоек вдоль рельса. Эксплуатация держит две линии поддержки.
export const STANDS = [
  { key: "deploy", label: "внедрение", pips: 1 },
  { key: "training", label: "обучение", pips: 2 },
  { key: "accept", label: "приёмка", pips: 3 },
  { key: "run", label: "эксплуатация", pips: 4 },
  { key: "change", label: "изменение", pips: 5 },
];

// Истинная модель маршрута: стойка, ящик, приоритет, угол часов SLA и счётчик обращений.
export const STEPS = [
  {
    key: "deploy",
    label: "внедрение",
    short: "внедрение",
    readout: "support · внедрение",
    stand: 0,
    drawer: "docs",
    priority: 0.12,
    clock: 0,
    counter: 0,
  },
  {
    key: "training",
    label: "обучение",
    short: "обучение",
    readout: "support · обучение",
    stand: 1,
    drawer: "docs",
    priority: 0.2,
    clock: 34,
    counter: 0,
  },
  {
    key: "accept",
    label: "приёмка",
    short: "приёмка",
    readout: "support · приёмка",
    stand: 2,
    drawer: "tools",
    priority: 0.34,
    clock: 76,
    counter: 2,
  },
  {
    key: "line1",
    label: "первая линия",
    short: "первая линия",
    readout: "support · первая линия",
    stand: 3,
    drawer: "journal",
    priority: 0.88,
    clock: 124,
    counter: 11,
  },
  {
    key: "line2",
    label: "вторая линия",
    short: "вторая линия",
    readout: "support · вторая линия",
    stand: 3,
    drawer: "spares",
    priority: 0.62,
    clock: 172,
    counter: 26,
  },
  {
    key: "change",
    label: "изменение",
    short: "изменение",
    readout: "support · изменение",
    stand: 4,
    drawer: "tools",
    priority: 0.44,
    clock: 216,
    counter: 31,
  },
  {
    key: "archive",
    label: "архив",
    short: "архив",
    readout: "support · архив",
    stand: -1,
    drawer: "docs",
    priority: 0.1,
    clock: 286,
    counter: 31,
  },
];

// SLA: время реакции и восстановления зависит от приоритета, поэтому стрелка
// приоритета поднимается на первой линии и опускается к архиву.
export const SLA = {
  labels: ["реакция", "восстановление"],
  note: "часы идут, пока тележка в пути, и замирают на стоянке",
};

export const ARCHIVE = {
  label: "архив",
  note: "архив данных, закрытие доступов, возврат оборудования",
};
