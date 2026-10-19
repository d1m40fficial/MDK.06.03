// Truth model for fig-01-is-machine (УФИС, Лекция 1, Fig 1).
//
// The machine draws an information system as one closed cycle:
//   приём (intake) -> обработка (processing) -> хранение (storage) -> выдача (output)
//   -> обратная связь (feedback) -> режим обработки (mode).
// Five records enter one at a time. Each record passes приём and обработка.
// An accumulating record (R1, R2, R3) is filed in a card-index drawer;
// a reference record (R4, R5) goes straight to the output tray. After the
// delivery the feedback tie rod turns the mode handwheel by one step.
//
// Every number the figure and the chapter show is computed here.

export const RECORDS = [
  { id: "R1", kind: "накопление", stops: ["магазин", "рейка", "обработка", "рейка2", "подъём", "ящик1"] },
  { id: "R2", kind: "накопление", stops: ["магазин", "рейка", "обработка", "рейка2", "подъём", "ящик2"] },
  { id: "R3", kind: "накопление", stops: ["магазин", "рейка", "обработка", "рейка2", "подъём", "ящик3"] },
  { id: "R4", kind: "справка",     stops: ["магазин", "рейка", "обработка", "рейка2", "спуск", "выдача1"] },
  { id: "R5", kind: "справка",     stops: ["магазин", "рейка", "обработка", "рейка2", "спуск", "выдача2"] },
];

// The processing mode is shown on the handwheel as one of these steps.
export const MODE_STEPS = [1, 2, 3, 4];

// The six resting states the pointer, the arrow keys and the idle tour step through.
// `at` is, for each record, the stop index it has reached in that state.
export const CYCLE = [
  { key: "пусто",      phase: "приём",      at: [0, 0, 0, 0, 0] },
  { key: "обработка",  phase: "обработка",  at: [2, 0, 0, 0, 0] },
  { key: "ящик1",      phase: "хранение",   at: [5, 0, 0, 0, 0] },
  { key: "ящик123",    phase: "хранение",   at: [5, 5, 5, 0, 0] },
  { key: "выдача",     phase: "выдача",     at: [5, 5, 5, 5, 5] },
  { key: "управление", phase: "управление", at: [5, 5, 5, 5, 5] },
];

export const LAST = CYCLE.length - 1;

// The last stop of a record is its destination, one per record.
export function destination(record) {
  return record.stops[record.stops.length - 1];
}

export function counts(at) {
  const arrived = at.filter((p) => p >= 0.5).length;
  const processed = at.filter((p) => p >= 1.5).length;
  let stored = 0;
  let output = 0;
  for (let i = 0; i < at.length; i++) {
    if (at[i] < 4.5) continue;
    if (RECORDS[i].kind === "накопление") stored += 1;
    else output += 1;
  }
  const mode = output > 0 ? 2 : 1;
  return { arrived, processed, stored, output, mode };
}

// The phase word comes from where the machine is working right now: if a record
// sits at the processing station, the step is "обработка"; otherwise it is the
// phase of the cycle state the machine is heading to.
export function phase(at, target) {
  for (let i = 0; i < at.length; i++) {
    const p = at[i];
    if (p > 0.08 && p < 4.9 && Math.round(p) === 2) return "обработка";
  }
  return target;
}

export function readout(at, targetPhase) {
  const c = counts(at);
  return `шаг: ${phase(at, targetPhase)} · поступило ${c.arrived} · в хранилище ${c.stored} · выдано ${c.output}`;
}

// Interpolate the per-record stop indices at a continuous cycle position s in [0, LAST].
export function atOf(s) {
  const clamped = Math.max(0, Math.min(LAST, s));
  const k = Math.min(LAST - 1, Math.floor(clamped));
  const t = clamped - k;
  return CYCLE[0].at.map((_, i) => CYCLE[k].at[i] + (CYCLE[k + 1].at[i] - CYCLE[k].at[i]) * t);
}

export function phaseOf(s) {
  return CYCLE[Math.max(0, Math.min(LAST, Math.round(s)))].phase;
}

export const initial = (() => {
  const at = CYCLE[0].at.slice();
  return { at, text: readout(at, CYCLE[0].phase), mode: counts(at).mode };
})();

export const summary = {
  inputs: 5,
  processed: 5,
  stored: 3,
  output: 2,
  modeFrom: 1,
  modeTo: 2,
};
