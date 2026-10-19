// Truth model for fig-03-flows (УФИС, Лекция 3, Fig 3).
//
// The object is a laboratory bench with two data lanes. Lane A runs from
// source 1 through valves 1 and 2 to receiver 1; lane B runs from source 2
// through valve 3 to receiver 2. The three valves are driven by a three-bit
// control word: bit 0 = valve 1, bit 1 = valve 2, bit 2 = valve 3.
//
// Data moves only where the control has opened a valve. On lane A the data
// advances past valve 1 as soon as it opens, but reaches the receiver only
// when valve 2 is open too. Lane B has one valve, so opening it completes the
// line at once. Every number the figure shows is computed here.

export const VALVES = [
  { id: "v1", name: "Кран 1", lane: "A", bit: 0 },
  { id: "v2", name: "Кран 2", lane: "A", bit: 1 },
  { id: "v3", name: "Кран 3", lane: "B", bit: 2 },
];

export const COUNT = VALVES.length; // 3
export const LAST = (1 << COUNT) - 1; // 7
export const RATE = 6; // л/с through one complete line

// The idle tour walks through the states that show the cause clearly:
// closed, valve 1 only, both valves of lane A, both lanes, lane B, valve 1
// only again, closed.
export const TOUR = [0, 1, 3, 7, 5, 4, 0];

export function bits(word) {
  return VALVES.map((valve) => (word >> valve.bit) & 1);
}

export function valveOpen(word, index) {
  return Boolean(bits(word)[index]);
}

export function openCount(word) {
  return bits(word).reduce((sum, bit) => sum + bit, 0);
}

export function laneA(word) {
  const b = bits(word);
  return Boolean(b[0] && b[1]);
}

export function laneB(word) {
  return Boolean(bits(word)[2]);
}

export function activeLines(word) {
  return (laneA(word) ? 1 : 0) + (laneB(word) ? 1 : 0);
}

export function flow(word) {
  return (laneA(word) ? RATE : 0) + (laneB(word) ? RATE : 0);
}

export function code(word) {
  return bits(word).slice().reverse().join("");
}

// The short leading phrase of the readout.
export function pathWord(word) {
  const b = bits(word);
  const a = Boolean(b[0] && b[1]);
  const bb = Boolean(b[2]);
  if (a && bb) return "обе линии";
  if (a) return "линия A";
  if (bb) return "линия B";
  if (b[0]) return "линия A не замкнута";
  if (b[1]) return "вход закрыт";
  return "потока нет";
}

export function readout(word) {
  return `${pathWord(word)} · код ${code(word)} · краны ${openCount(word)} из ${COUNT} · расход ${flow(word)} л/с`;
}

export const initial = {
  word: 0,
  text: readout(0),
  bits: bits(0),
  open: openCount(0),
  flow: flow(0),
};

export const summary = {
  valves: COUNT,
  last: LAST,
  rate: RATE,
  tour: TOUR,
  // open-valve count and flow through every control word
  states: Array.from({ length: LAST + 1 }, (_, word) => ({
    word,
    code: code(word),
    open: openCount(word),
    lines: activeLines(word),
    flow: flow(word),
  })),
};


