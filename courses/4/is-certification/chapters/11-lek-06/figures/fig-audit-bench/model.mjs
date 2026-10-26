// Truth model for fig-audit-bench (ИС-сертификация, Лекция 6, Fig 1).
//
// The stand checks a sample of five evidences against the criteria written on
// the reference card. Each evidence is a tile on the turntable; the lever takes
// one tile, holds it at the comparator, then drops it into one of two trays:
// «Соответствие» or «Несоответствие». The dial of findings counts what has been
// checked and how many nonconformities were found, and the report card is
// issued only after the last evidence.
//
// Three of the five evidences meet their criterion, two do not. One of the two
// is a minor nonconformity, one is a significant nonconformity, so the verdict
// of the sample is «не соответствует».
//
// Every number the figure and the chapter show is computed here.

export const POPULATION = 30; // records in the March sample of the chapter

export const EVIDENCE = [
  {
    id: "С1",
    kind: "запись",
    criterion: "Журнал действий ведётся по каждой заявке",
    compliant: true,
    finding: "соответствие",
  },
  {
    id: "С2",
    kind: "запись",
    criterion: "Смена статуса заявки попадает в журнал",
    compliant: false,
    finding: "незначительное несоответствие",
  },
  {
    id: "С3",
    kind: "интервью",
    criterion: "Роли разграничены, чужие заявки не видны",
    compliant: true,
    finding: "соответствие",
  },
  {
    id: "С4",
    kind: "наблюдение",
    criterion: "Открытие чужой заявки под ролью студента отклоняется",
    compliant: true,
    finding: "соответствие",
  },
  {
    id: "С5",
    kind: "запись",
    criterion: "Протокол восстановления из резервной копии",
    compliant: false,
    finding: "существенное несоответствие",
  },
];

export const SAMPLE = EVIDENCE.length;
export const COMPLIANT = EVIDENCE.filter((item) => item.compliant).length;
export const NONCOMPLIANT = SAMPLE - COMPLIANT;

// Number of rule lines cut into a tile, one per evidence kind.
export function linesOf(evidence) {
  if (evidence.kind === "запись") return 3;
  if (evidence.kind === "интервью") return 2;
  return 1;
}

// Cumulative counts after `checked` evidences, in the order the lever takes them.
export function counts(checked) {
  const done = Math.max(0, Math.min(SAMPLE, checked));
  const passed = EVIDENCE.slice(0, done).filter((item) => item.compliant).length;
  return { checked: done, compliant: passed, nonCompliant: done - passed };
}

export function readout(checked) {
  const c = counts(checked);
  return `Проверено ${c.checked} · соответствует ${c.compliant} · несоответствий ${c.nonCompliant}`;
}

// Which evidences are checked at a given time of the cycle, seconds.
export const CHECK_AT = 2.25; // within one evidence step

export function checkedAt(time, step) {
  if (step <= 0) return 0;
  let done = 0;
  for (let i = 0; i < SAMPLE; i++) if (time >= i * step + CHECK_AT) done = i + 1;
  return done;
}

export const initial = readout(0);
export const final = readout(SAMPLE);

export const verdict = "не соответствует";
export const limitation = `выборка ${SAMPLE} из ${POPULATION} записей`;

export const summary = {
  sample: SAMPLE,
  population: POPULATION,
  checked: SAMPLE,
  compliant: COMPLIANT,
  nonCompliant: NONCOMPLIANT,
  verdict,
  limitation,
  findings: EVIDENCE.map((item) => ({ id: item.id, kind: item.kind, finding: item.finding })),
};
