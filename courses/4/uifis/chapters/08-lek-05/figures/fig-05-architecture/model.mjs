// The truth of fig-05-architecture: which cabin does which job, how many links are
// closed, and what travels over the link. Everything the figure shows comes from here.

export const JOBS = [
  { id: "presentation", label: "представление" },
  { id: "logic", label: "логика" },
  { id: "data", label: "данные" },
];

export const CABINS = [
  { id: "client", label: "Клиент", short: "клиент" },
  { id: "app", label: "Сервер приложений", short: "сервер приложений" },
  { id: "db", label: "Сервер БД", short: "сервер БД" },
];

const ROWS = [
  {
    id: "file",
    label: "файл-сервер",
    tiers: 2,
    payload: "file",
    payloadLabel: "файл",
    link: "целый файл",
    linkShort: "файл",
    roles: { presentation: "клиент", logic: "клиент", data: "файловый сервер" },
    placement: {
      presentation: { cabins: ["client"], text: "клиент" },
      logic: { cabins: ["client"], text: "клиент" },
      data: { cabins: ["db"], text: "файловый сервер" },
    },
    stops: ["client", "db"],
  },
  {
    id: "client-server",
    label: "клиент-сервер",
    tiers: 2,
    payload: "request",
    payloadLabel: "запрос",
    link: "запрос и результат",
    linkShort: "запрос",
    roles: { presentation: "клиент", logic: "клиент + сервер БД", data: "сервер БД" },
    placement: {
      presentation: { cabins: ["client"], text: "клиент" },
      logic: { cabins: ["client", "db"], text: "клиент + сервер БД" },
      data: { cabins: ["db"], text: "сервер БД" },
    },
    stops: ["client", "db"],
  },
  {
    id: "three-tier",
    label: "трёхзвенная",
    tiers: 3,
    payload: "request",
    payloadLabel: "запрос",
    link: "запрос и результат",
    linkShort: "запрос",
    roles: { presentation: "клиент", logic: "сервер приложений", data: "сервер БД" },
    placement: {
      presentation: { cabins: ["client"], text: "клиент" },
      logic: { cabins: ["app"], text: "сервер приложений" },
      data: { cabins: ["db"], text: "сервер БД" },
    },
    stops: ["client", "app", "db"],
  },
];

export const MODES = ROWS.map(({ placement, stops, ...mode }) => mode);

const rowOf = (index) => ROWS[((index % ROWS.length) + ROWS.length) % ROWS.length];

const reachableCabins = (mode, clutches) => {
  const out = ["client"];
  if (mode.tiers === 3) {
    if (clutches[0]) out.push("app");
    if (clutches[0] && clutches[1]) out.push("db");
  } else if (clutches[1]) {
    out.push("db");
  }
  return out;
};

export function route(modeIndex = 2, clutchOverride = null) {
  const index = ((modeIndex % ROWS.length) + ROWS.length) % ROWS.length;
  const row = rowOf(index);
  const mode = MODES[index];
  const baseClutches = [row.tiers === 3, true];
  const manual = Array.isArray(clutchOverride);
  const clutches = manual ? [Boolean(clutchOverride[0]), Boolean(clutchOverride[1])] : baseClutches.slice();
  const engaged = clutches.filter(Boolean).length;
  const reachable = reachableCabins(row, clutches);
  const valid = engaged === row.tiers - 1 && clutches.every((value, i) => value === baseClutches[i]);

  const jobs = {};
  const jobsByCabin = Object.fromEntries(CABINS.map((cabin) => [cabin.id, []]));
  for (const job of JOBS) {
    const place = row.placement[job.id];
    jobs[job.id] = { label: job.label, cabins: place.cabins.slice(), text: place.text };
    for (const cabin of place.cabins) jobsByCabin[cabin].push(job.label);
  }

  const activeCabins = CABINS.map((cabin) => cabin.id).filter(
    (id) => reachable.includes(id) && jobsByCabin[id].length > 0,
  );
  const cabinText = Object.fromEntries(
    CABINS.map((cabin) => {
      const list = jobsByCabin[cabin.id];
      if (!list.length) return [cabin.id, "не участвует"];
      if (!reachable.includes(cabin.id)) return [cabin.id, "недоступен: звено разомкнуто"];
      return [cabin.id, list.join(" и ")];
    }),
  );

  const stops = row.stops.filter((id) => reachable.includes(id));
  const allJobsReachable = JOBS.every((job) => jobs[job.id].cabins.every((id) => reachable.includes(id)));
  const lineOne = `${row.label} · звеньев ${row.tiers} · логика: ${row.roles.logic} · данные: ${row.roles.data}`;
  const lineTwo = `по каналу: ${row.linkShort} · валов ${engaged} из 2 · груз: ${row.payloadLabel}`;
  const readout = manual
    ? `${lineOne}\nпо каналу: ${row.linkShort} · валов ${engaged} из 2 · груз: ${row.payloadLabel} · конфигурация ${allJobsReachable ? "избыточная" : "неполная"}`
    : `${lineOne}\n${lineTwo}`;

  return {
    index,
    id: row.id,
    label: row.label,
    tiers: row.tiers,
    roles: row.roles,
    placement: row.placement,
    jobs,
    jobsByCabin,
    cabinText,
    payload: row.payload,
    payloadLabel: row.payloadLabel,
    link: row.link,
    linkShort: row.linkShort,
    stops,
    clutches,
    baseClutches,
    engaged,
    manual,
    valid,
    activeCabins,
    readout,
  };
}
