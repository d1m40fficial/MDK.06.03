export const ID = "fig-15-func";
export const TITLE = "Разборный блок-процесс";
export const HINT = "Раскройте контекст: четыре подпроцесса, потоки, управление и механизмы.";
export const CAPTION =
  "Контекстный процесс раскрывается на проверку, согласование, запись и уведомление. Входы и выходы остаются на границе, управление и механизмы подходят к каждому подпроцессу.";
export const KEYS = [
  { mark: "raised", label: "Большой блок-процесс: вход, выход, управление, механизм" },
  { mark: "lit", label: "Четыре подпроцесса: проверка, согласование, запись, уведомление" },
  { mark: "dim", label: "Потоки в трубках и управляющие линии сверху" },
];

export const STEPS = [
  { key: "context", label: "контекст", short: "контекст", readout: "уровень 0 · контекст" },
  { key: "io", label: "входы и выходы", short: "входы", readout: "входы 3 · выходы 3" },
  { key: "control", label: "управление и механизмы", short: "управление", readout: "управление 3 · механизмы 3" },
  { key: "open", label: "раскрытие", short: "раскрытие", readout: "уровень 1 · крышка и панели" },
  { key: "check", label: "проверка", short: "проверка", readout: "проверка · лупа" },
  { key: "approve", label: "согласование", short: "согласование", readout: "согласование · печать" },
  { key: "write", label: "запись", short: "запись", readout: "запись · барабан" },
  { key: "notice", label: "уведомление", short: "уведомление", readout: "уведомление · колокол" },
  { key: "links", label: "связи", short: "связи", readout: "связи · 4 подпроцесса" },
];

// Модель правды: контекстный процесс, его границы и декомпозиция первого уровня.

export const CONTEXT = {
  level: 0,
  name: "Обработать заявку студента",
  ports: { input: 1, output: 1, control: 1, mechanism: 1 },
};

export const INPUTS = [
  { key: "request", label: "заявка", pipe: 0 },
  { key: "docs", label: "документы", pipe: 1 },
  { key: "pay", label: "оплата", pipe: 2 },
];

export const OUTPUTS = [
  { key: "decision", label: "решение", pipe: 0 },
  { key: "notice", label: "уведомление", pipe: 1 },
  { key: "log", label: "запись в журнале", pipe: 2 },
];

export const CONTROLS = [
  { key: "regulation", label: "регламент" },
  { key: "deadline", label: "сроки" },
  { key: "access", label: "права доступа" },
];

export const MECHANISMS = [
  { key: "staff", label: "сотрудник" },
  { key: "is", label: "ИС" },
  { key: "db", label: "база данных" },
];

export const SUBPROCESSES = [
  { key: "check", level: 1, label: "Проверить заявку", tool: "лупа", takes: "заявка, документы, оплата", gives: "решение" },
  { key: "approve", level: 1, label: "Согласовать решение", tool: "печать", takes: "решение", gives: "согласованное решение" },
  { key: "write", level: 1, label: "Записать результат", tool: "журнальный барабан", takes: "решение", gives: "запись" },
  { key: "notice", level: 1, label: "Уведомить студента", tool: "колокол", takes: "запись", gives: "уведомление" },
];

// Потоки: три внутренние трубки, входной и выходной патрубки, журнальный след.
export const LINKS = [
  { key: "check-approve", from: "check", to: "approve", label: "решение" },
  { key: "approve-write", from: "approve", to: "write", label: "согласованное решение" },
  { key: "write-notice", from: "write", to: "notice", label: "запись" },
];

export const JOURNAL = {
  label: "журнал",
  feeds: ["check", "approve", "write", "notice"],
  note: "след от каждого подпроцесса идёт в барабан записи",
};

// Что показывает каждый шаг: какие линии бегут и какой подпроцесс подсвечен.
export const SHOWN = {
  context: { flow: [], lit: [] },
  io: { flow: ["in", "out"], lit: [] },
  control: { flow: ["control", "mechanism"], lit: [] },
  open: { flow: [], lit: [] },
  check: { flow: ["in", "check-approve"], lit: ["check"] },
  approve: { flow: ["check-approve", "approve-write"], lit: ["approve"] },
  write: { flow: ["approve-write", "write-notice"], lit: ["write"] },
  notice: { flow: ["write-notice", "out"], lit: ["notice"] },
  links: { flow: ["in", "check-approve", "approve-write", "write-notice", "out", "control-in", "mechanism"], lit: ["check", "approve", "write", "notice"] },
};
