export const QUANTUM = 4;
export const SWITCH = 0.1;

export const PROCESSES = [
  { id: "P1", name: "Заказ", burst: 10 },
  { id: "P2", name: "Накладная", burst: 6 },
  { id: "P3", name: "Отчёт", burst: 8 },
  { id: "P4", name: "Оплата", burst: 4 },
  { id: "P5", name: "Резервная копия", burst: 12 },
];

export const TOTAL_BURST = PROCESSES.reduce((sum, process) => sum + process.burst, 0);

function emptyRemaining() {
  return Object.fromEntries(PROCESSES.map((process) => [process.id, process.burst]));
}

export function simulate(quantum = QUANTUM) {
  const remaining = emptyRemaining();
  const queue = PROCESSES.map((process) => process.id);
  const done = [];
  const doneAt = {};
  const states = [];
  let current = queue.shift();
  let time = 0;
  let switches = 0;

  states.push({
    step: 0,
    time: 0,
    current,
    run: 0,
    remaining: { ...remaining },
    done: [],
    queue: [...queue],
    next: queue[0] ?? null,
    switches: 0,
  });

  while (current) {
    const run = Math.min(quantum, remaining[current]);
    time += run;
    remaining[current] -= run;
    const finished = remaining[current] === 0;

    if (finished) {
      done.push(current);
      doneAt[current] = time;
    } else {
      queue.push(current);
    }

    const next = queue[0] ?? null;
    if (next) {
      time += SWITCH;
      switches += 1;
    }

    states.push({
      step: states.length,
      time: time - (next ? SWITCH : 0),
      current,
      run,
      remaining: { ...remaining },
      done: [...done],
      queue: [...queue],
      next,
      switches,
    });

    current = queue.shift();
  }

  const makespan = states.at(-1).time;
  const averageCompletion =
    PROCESSES.reduce((sum, process) => sum + doneAt[process.id], 0) / PROCESSES.length;

  return {
    quantum,
    states,
    doneAt,
    makespan,
    switches,
    utilization: (TOTAL_BURST / makespan) * 100,
    averageCompletion,
  };
}

export const RESULT = simulate(QUANTUM);
export const STATES = RESULT.states;

const commas = (value, digits = 1) => value.toFixed(digits).replace(".", ",");

export function formatMs(value, digits = 1) {
  return commas(value, digits);
}

export function summarize(state) {
  if (state.done.length === PROCESSES.length) {
    return `Готово: 5 процессов за ${formatMs(state.time)} мс · ${formatMs(RESULT.utilization)}% CPU`;
  }
  const process = PROCESSES.find((item) => item.id === state.current);
  const next = state.next ? ` · след. ${state.next}` : "";
  if (state.done.includes(state.current)) {
    return `${process.id} ${process.name} · завершён · t = ${formatMs(state.time)}${next}`;
  }
  const left = state.remaining[state.current];
  return `${process.id} ${process.name} · квант 4 мс · осталось ${formatMs(left, 0)} мс · t = ${formatMs(state.time)}${next}`;
}

export function sensitivity() {
  return [1, 4, 20].map((quantum) => {
    const result = simulate(quantum);
    return {
      quantum,
      makespan: result.makespan,
      utilization: result.utilization,
      averageCompletion: result.averageCompletion,
      switches: result.switches,
    };
  });
}
