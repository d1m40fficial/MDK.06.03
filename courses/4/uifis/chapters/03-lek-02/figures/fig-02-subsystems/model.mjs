// Truth model for fig-02-subsystems (УФИС, Лекция 2, Fig 2).
//
// The object is a modular instrument case. It holds five functional bays, each
// doing one job of an information system, and it is fed by five removable
// support modules that plug into a socket bus along the back. A bay only works
// once every support module it needs is seated; inserting the modules lights
// the bays stage by stage.
//
// Support modules (the order they are inserted):
//   техническое, программное, информационное, организационное, правовое.
// Functional bays and what each one needs:
//   Учёт    <- техническое, программное, информационное
//   Расчёт  <- техническое, программное, информационное
//   Выдача  <- техническое, информационное, организационное
//   Решение <- техническое, программное, информационное, организационное
//   Управление <- техническое, организационное, правовое
//
// The insertion position s runs from 0 (empty case) to 5 (all modules seated):
// module i is pushed in while s passes from i to i + 1. Every number the figure
// and the chapter show is computed here.

export const SUPPORT = [
  { id: "тех", name: "Техническое обеспечение", short: "Тех" },
  { id: "прог", name: "Программное обеспечение", short: "Прог" },
  { id: "инф", name: "Информационное обеспечение", short: "Инф" },
  { id: "орг", name: "Организационное обеспечение", short: "Орг" },
  { id: "прав", name: "Правовое обеспечение", short: "Прав" },
];

export const FUNCTIONAL = [
  { id: "уч", name: "Учёт", needs: ["тех", "прог", "инф"] },
  { id: "ра", name: "Расчёт", needs: ["тех", "прог", "инф"] },
  { id: "вы", name: "Выдача", needs: ["тех", "инф", "орг"] },
  { id: "ре", name: "Решение", needs: ["тех", "прог", "инф", "орг"] },
  { id: "уп", name: "Управление", needs: ["тех", "орг", "прав"] },
];

export const MODULES = SUPPORT.length; // 5
export const BAYS = FUNCTIONAL.length; // 5

// The insertion position runs 0..5: after step k, k modules are seated.
export const LAST = MODULES;

// How far the i-th module is pushed in: 0 raised, 1 seated.
export function shareOf(s, i) {
  return Math.max(0, Math.min(1, s - i));
}

export function sharesOf(s) {
  return SUPPORT.map((_, i) => shareOf(s, i));
}

export function inserted(s) {
  return sharesOf(s).filter((v) => v >= 1 - 1e-4).length;
}

export function isMid(s) {
  return sharesOf(s).some((v) => v > 1e-4 && v < 1 - 1e-4);
}

export function moduleIn(s, id) {
  const i = SUPPORT.findIndex((m) => m.id === id);
  return shareOf(s, i) >= 1 - 1e-4;
}

export function bayOn(s, bay) {
  return bay.needs.every((id) => moduleIn(s, id));
}

export function enabledFlags(s) {
  return FUNCTIONAL.map((bay) => bayOn(s, bay));
}

export function enabledBays(s) {
  return enabledFlags(s).filter(Boolean).length;
}

// The word the readout leads with: an empty case, a module going in, a partial
// set, or everything the bays ask for.
export function word(s) {
  if (isMid(s)) return "идёт вставка";
  if (inserted(s) === 0) return "корпус пуст";
  if (inserted(s) === MODULES) return "обеспечения хватает";
  return "не хватает обеспечения";
}

export function readout(s) {
  return `${word(s)} · модулей ${inserted(s)} из ${MODULES} · отсеков ${enabledBays(s)} из ${BAYS}`;
}

export const initial = (() => {
  const s = 0;
  return { s, text: readout(s), flags: enabledFlags(s) };
})();

export const summary = {
  modules: MODULES,
  bays: BAYS,
  allOnStep: LAST,
  // enabled-bay counts after each module is seated
  afterStep: Array.from({ length: MODULES + 1 }, (_, k) => enabledBays(k)),
};
