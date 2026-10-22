export const TX = 42;

export const TABLES = [
  { id: "students", name: "Студенты", short: "students", rows: 3 },
  { id: "orders", name: "Заказы", short: "orders", rows: 2 },
  { id: "payments", name: "Платежи", short: "payments", rows: 2 },
  { id: "audit", name: "Журнал", short: "audit", rows: 0 },
];

export const OPS = [
  {
    n: 1,
    table: "orders",
    label: "INSERT orders 104",
    detail: "заказ 104 для студента 2, сумма 1200",
    locks: ["students#2", "orders#104"],
    rowsDelta: 1,
    counterDelta: 0,
  },
  {
    n: 2,
    table: "payments",
    label: "INSERT payments 501",
    detail: "платёж 501 по заказу 104, сумма 1200",
    locks: ["payments#501"],
    rowsDelta: 1,
    counterDelta: 0,
  },
  {
    n: 3,
    table: "students",
    label: "UPDATE students 2",
    detail: "счётчик заказов студента 2: 1 -> 2",
    locks: [],
    rowsDelta: 0,
    counterDelta: 1,
  },
  {
    n: 4,
    table: "audit",
    label: "INSERT audit",
    detail: "запись о фиксации транзакции 42",
    locks: [],
    rowsDelta: 1,
    counterDelta: 0,
  },
];

export const INITIAL_ROWS = {
  students: 3,
  orders: 2,
  payments: 2,
  audit: 0,
};

export const INITIAL_COUNTERS = {
  1: 1,
  2: 1,
  3: 0,
};

const ORDER_AMOUNT = 1200;

function copyRows(rows) {
  return { ...rows };
}

function copyCounters(counters) {
  return { ...counters };
}

function buildStates() {
  const states = [];
  const rows = copyRows(INITIAL_ROWS);
  const counters = copyCounters(INITIAL_COUNTERS);
  const locks = [];

  states.push({
    step: 0,
    phase: "idle",
    active: "students",
    rows: copyRows(rows),
    counters: copyCounters(counters),
    locks: [...locks],
    opsDone: 0,
    ok: true,
  });

  for (const op of OPS) {
    rows[op.table] += op.rowsDelta;
    if (op.n === 3) {
      counters[2] += 1;
    }
    for (const lock of op.locks) {
      if (!locks.includes(lock)) {
        locks.push(lock);
      }
    }
    states.push({
      step: op.n,
      phase: "work",
      active: op.table,
      rows: copyRows(rows),
      counters: copyCounters(counters),
      locks: [...locks],
      opsDone: op.n,
      ok: true,
    });
  }

  states.push({
    step: 5,
    phase: "committed",
    active: "audit",
    rows: copyRows(rows),
    counters: copyCounters(counters),
    locks: [],
    opsDone: 4,
    ok: true,
  });

  states.push({
    step: 6,
    phase: "rolledback",
    active: "students",
    rows: copyRows(INITIAL_ROWS),
    counters: copyCounters(INITIAL_COUNTERS),
    locks: [],
    opsDone: 0,
    ok: false,
  });

  return states;
}

export const STATES = buildStates();

export const PEAK_LOCKS = Math.max(...STATES.map((state) => state.locks.length));
export const ORDER_AMOUNT_VALUE = ORDER_AMOUNT;

export function orderCount(state) {
  return state.counters[1] + state.counters[2] + state.counters[3];
}

export function rowsLine(state) {
  return `строки ${state.rows.students}/${state.rows.orders}/${state.rows.payments}/${state.rows.audit}`;
}

export function locksLine(state) {
  return `блокировки ${state.locks.length}`;
}

export function summarize(state) {
  if (state.phase === "committed") {
    return `COMMIT · 4/4 · блокировки 0 · ${rowsLine(state)}`;
  }
  if (state.phase === "rolledback") {
    return `ROLLBACK · 0/4 · блокировки 0 · ${rowsLine(state)}`;
  }
  if (state.step === 0) {
    return `T${TX} · 0/4 · блокировки 0 · ${rowsLine(state)}`;
  }
  return `T${TX} · ${state.opsDone}/4 · ${locksLine(state)} · ${rowsLine(state)}`;
}

export function stepLabel(state) {
  if (state.phase === "committed") {
    return "Фиксация: журнал получает строку, блокировки сняты";
  }
  if (state.phase === "rolledback") {
    return "Откат: все четыре операции исчезли, строки вернулись";
  }
  if (state.step === 0) {
    return "Транзакция 42 открыта, ни одна строка ещё не изменена";
  }
  return `Операция ${state.step}: ${OPS[state.step - 1].detail}`;
}
