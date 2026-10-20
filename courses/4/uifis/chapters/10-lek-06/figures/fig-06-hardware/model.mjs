// The truth of fig-06-hardware: what each rack unit contributes, what the rack
// totals are, and what is lost when a unit is switched off. The chapter quotes
// these numbers, so change them here first.

export const UNITS = [
  {
    id: "monitor",
    label: "Мониторинг",
    short: "мониторинг",
    u: 2,
    z: 152,
    h: 20,
    watts: 20,
    cores: 0,
    ram: 0,
    disk: 0,
    net: 0,
    switchable: false,
    role: "панель ресурсов",
    detail: "4 шкалы, 20 Вт",
  },
  {
    id: "blank",
    label: "Резерв",
    short: "резерв",
    u: 1,
    z: 142,
    h: 10,
    watts: 0,
    cores: 0,
    ram: 0,
    disk: 0,
    net: 0,
    switchable: false,
    role: "пустой юнит",
    detail: "1U, место под расширение",
  },
  {
    id: "patch",
    label: "Патч-панель",
    short: "патч-панель",
    u: 1,
    z: 132,
    h: 10,
    watts: 0,
    cores: 0,
    ram: 0,
    disk: 0,
    net: 0,
    switchable: false,
    role: "коммутация портов",
    detail: "24 порта, пассивный юнит",
  },
  {
    id: "switch",
    label: "Коммутатор",
    short: "коммутатор",
    u: 1,
    z: 122,
    h: 10,
    watts: 120,
    cores: 0,
    ram: 0,
    disk: 0,
    net: 10,
    switchable: true,
    role: "сеть",
    detail: "24 порта 10 Гбит/с, 120 Вт",
  },
  {
    id: "srv-a",
    label: "Сервер A",
    short: "сервер A",
    u: 2,
    z: 102,
    h: 20,
    watts: 450,
    cores: 16,
    ram: 128,
    disk: 2,
    net: 0,
    switchable: true,
    role: "вычисления и память",
    detail: "16 ядер, 128 ГБ, 2 ТБ, 450 Вт",
  },
  {
    id: "srv-b",
    label: "Сервер B",
    short: "сервер B",
    u: 2,
    z: 82,
    h: 20,
    watts: 450,
    cores: 16,
    ram: 128,
    disk: 2,
    net: 0,
    switchable: true,
    role: "вычисления и память",
    detail: "16 ядер, 128 ГБ, 2 ТБ, 450 Вт",
  },
  {
    id: "storage",
    label: "СХД",
    short: "СХД",
    u: 4,
    z: 42,
    h: 40,
    watts: 550,
    cores: 0,
    ram: 0,
    disk: 20,
    net: 0,
    switchable: true,
    role: "хранение данных",
    detail: "12 дисков по 2 ТБ, RAID 6, 20 ТБ полезно, 550 Вт",
  },
  {
    id: "ups",
    label: "ИБП",
    short: "ИБП",
    u: 3,
    z: 12,
    h: 30,
    watts: 0,
    cores: 0,
    ram: 0,
    disk: 0,
    net: 0,
    switchable: false,
    role: "питание",
    detail: "6 кВА / 5,4 кВт, при 1,59 кВт около 30 мин",
  },
];

export const CAPACITY = {
  cores: 32,
  ram: 256,
  disk: 24,
  net: 10,
};

export const UPS = {
  kva: 6,
  kw: 5.4,
  minutesAtFull: 8.8,
};

const on = (state, id) => state[id] !== false;

export function totals(state = {}) {
  const sum = { cores: 0, ram: 0, disk: 0, net: 0, watts: 0 };
  for (const unit of UNITS) {
    if (!on(state, unit.id)) continue;
    sum.cores += unit.cores;
    sum.ram += unit.ram;
    sum.disk += unit.disk;
    sum.net += unit.net;
    sum.watts += unit.watts;
  }
  return sum;
}

const share = (value, capacity) => (capacity ? Math.round((value / capacity) * 100) : 0);

export function gauges(state = {}) {
  const sum = totals(state);
  return {
    cpu: share(sum.cores, CAPACITY.cores),
    ram: share(sum.ram, CAPACITY.ram),
    disk: share(sum.disk, CAPACITY.disk),
    net: share(sum.net, CAPACITY.net),
  };
}

export function upsLoad(state = {}) {
  const sum = totals(state);
  return {
    watts: sum.watts,
    percent: Math.round((sum.watts / 5400) * 100),
    minutes: Math.round(UPS.minutesAtFull * (UPS.kw / Math.max(sum.watts / 1000, 0.1))),
  };
}

const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const kwf = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatTotals(state = {}) {
  const sum = totals(state);
  const ups = upsLoad(state);
  const cores = sum.cores === 1 ? "ядро" : sum.cores >= 2 && sum.cores <= 4 ? "ядра" : "ядер";
  return `итого: ${sum.cores} ${cores} · ${sum.ram} ГБ · ${nf.format(sum.disk)} ТБ · ${nf.format(sum.net)} Гбит/с · ${kwf.format(sum.watts / 1000)} кВт · ИБП ${ups.percent}%`;
}

export function unitLine(unit, state = {}) {
  const enabled = on(state, unit.id);
  if (unit.id === "ups") return `${unit.label} · ${unit.u}U · ${unit.detail}`;
  if (unit.id === "patch") return `${unit.label} · ${unit.u}U · ${unit.detail}`;
  const status = unit.switchable ? (enabled ? "вкл" : "выкл") : "не коммутируется";
  return `${unit.label} · ${unit.u}U · ${status} · ${unit.detail}`;
}

export function shortLine(unit, state = {}) {
  const enabled = on(state, unit.id);
  if (unit.id === "srv-a" || unit.id === "srv-b") {
    return enabled ? `${unit.label} · 16 ядер · 128 ГБ` : `${unit.label} · выкл`;
  }
  if (unit.id === "storage") return enabled ? "СХД · 20 ТБ · RAID 6" : "СХД · выкл";
  if (unit.id === "switch") return enabled ? "Коммутатор · 10 Гбит/с" : "Коммутатор · выкл";
  if (unit.id === "monitor") return "Мониторинг · 4 шкалы";
  if (unit.id === "patch") return "Патч-панель · 24 порта";
  if (unit.id === "ups") return `ИБП · 6 кВА · ~${upsLoad(state).minutes} мин`;
  return "Резерв · 1U";
}

export function readout(unit, state = {}) {
  return shortLine(unit, state);
}

export function initial() {
  const state = Object.fromEntries(UNITS.map((unit) => [unit.id, true]));
  return {
    state,
    selected: "srv-a",
    readout: readout(UNITS.find((unit) => unit.id === "srv-a"), state),
  };
}
