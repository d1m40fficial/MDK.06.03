// Truth model for fig-01-is-machine (УФИС, Лекция 1, Fig 1).
//
// The machine draws an information system as one closed cycle along a single
// bench line: приём -> регистрация -> обработка -> хранение -> выдача ->
// обратная связь, and the feedback turns the mode handwheel by one step.
//
// Five records enter the intake hopper one at a time. Each record is registered
// as it boards the rail, is processed under the press, then a turnout sends it
// either into a card-index drawer (накопление) or straight to the output tray
// (справка). After delivery the feedback tie rod turns the mode handwheel.
//
// Every number the figure and the chapter show is computed here.

export const RECORDS = [
  { id: "R1", kind: "накопление", stops: ["магазин", "рейка", "обработка", "развилка", "подъём", "ящик1"] },
  { id: "R2", kind: "накопление", stops: ["магазин", "рейка", "обработка", "развилка", "подъём", "ящик2"] },
  { id: "R3", kind: "накопление", stops: ["магазин", "рейка", "обработка", "развилка", "подъём", "ящик3"] },
  { id: "R4", kind: "справка",     stops: ["магазин", "рейка", "обработка", "развилка", "спуск", "выдача1"] },
  { id: "R5", kind: "справка",     stops: ["магазин", "рейка", "обработка", "развилка", "спуск", "выдача2"] },
];

// The processing mode is shown on the handwheel as one of these steps.
export const MODE_STEPS = [1, 2, 3, 4];

// The six stages the pointer, the arrow keys and the idle tour step through.
// `at` is, for each record, the stop index it has reached in that stage.
// `mode` is the handwheel step the state should show.
export const CYCLE = [
  { key: "приём",          phase: "приём",          mode: 1, at: [0, 0, 0, 0, 0] },
  { key: "регистрация",    phase: "регистрация",    mode: 1, at: [1, 0, 0, 0, 0] },
  { key: "обработка",      phase: "обработка",      mode: 1, at: [2, 1, 0, 0, 0] },
  { key: "хранение",       phase: "хранение",       mode: 1, at: [5, 5, 5, 3, 0] },
  { key: "выдача",         phase: "выдача",         mode: 1, at: [5, 5, 5, 5, 4] },
  { key: "обратная связь", phase: "обратная связь", mode: 2, at: [5, 5, 5, 5, 5] },
];

export const LAST = CYCLE.length - 1;

// The last stop of a record is its destination, one per record.
export function destination(record) {
  return record.stops[record.stops.length - 1];
}

export function counts(at) {
  const arrived = at.filter((p) => p >= 0.5).length;
  const processed = at.filter((p) => p >= 2).length;
  let stored = 0;
  let output = 0;
  for (let i = 0; i < at.length; i++) {
    if (at[i] < 5) continue;
    if (RECORDS[i].kind === "накопление") stored += 1;
    else output += 1;
  }
  return { arrived, processed, stored, output };
}

// The phase word comes from where the machine is working right now: if a record
// sits at the processing station, the step is "обработка"; otherwise it is the
// phase of the cycle stage the machine is heading to.
export function phase(at, target) {
  for (let i = 0; i < at.length; i++) {
    const p = at[i];
    if (p > 0.08 && p < 4.9 && Math.round(p) === 2) return "обработка";
  }
  return target;
}

export function readout(at, targetPhase, mode) {
  const c = counts(at);
  return `шаг: ${phase(at, targetPhase)} · обработано ${c.processed} · в хранилище ${c.stored} · выдано ${c.output} · режим ${mode}`;
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

export function modeOf(s) {
  return CYCLE[Math.max(0, Math.min(LAST, Math.round(s)))].mode;
}

export const initial = (() => {
  const at = CYCLE[0].at.slice();
  return { at, text: readout(at, CYCLE[0].phase, CYCLE[0].mode), mode: CYCLE[0].mode };
})();

export const summary = {
  inputs: 5,
  processed: 5,
  stored: 3,
  output: 2,
  modeFrom: 1,
  modeTo: 2,
};
