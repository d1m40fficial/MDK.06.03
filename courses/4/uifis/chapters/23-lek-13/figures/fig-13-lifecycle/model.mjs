export const ID = "fig-13-lifecycle";
export const TITLE = "Кольцевой конвейер жизненного цикла";
export const HINT = "Проведите тележку по кольцу: этапы, возврат на модернизацию, архив.";
export const CAPTION =
  "Тележка проходит требования, проектирование, разработку, тестирование, внедрение и эксплуатацию. Изменение требований возвращает её на новый круг, а завершение поддержки уводит к воротам архива.";
export const KEYS = [
  { mark: "lit", label: "Тележка с ящиком изделия и табличкой ИС" },
  { mark: "raised", label: "Восемь станций с инструментом и лотком артефакта" },
  { mark: "dim", label: "Переводная стрелка: новый круг через модернизацию или ворота архива" },
];

// Истинные данные модели: стадии, артефакты, счётчики.
// Порядок обхода кольца по часовой стрелке, углы в плане.
export const STAGES = [
  {
    key: "requirements",
    label: "требования",
    tool: "папка и лупа",
    artifact: "согласованные требования",
    angle: 242.5,
    cycle: 1,
  },
  {
    key: "design",
    label: "проектирование",
    tool: "чертёжная доска и линейка",
    artifact: "модель",
    angle: 287.5,
    cycle: 1,
  },
  {
    key: "build",
    label: "разработка",
    tool: "верстак с клавиатурой",
    artifact: "сборка",
    angle: 332.5,
    cycle: 1,
  },
  {
    key: "test",
    label: "тестирование",
    tool: "стенд с манометром",
    artifact: "отчёт проверки",
    angle: 17.5,
    cycle: 1,
  },
  {
    key: "deploy",
    label: "внедрение",
    tool: "погрузочный лоток",
    artifact: "акт внедрения",
    angle: 62.5,
    cycle: 1,
  },
  {
    key: "operate",
    label: "эксплуатация",
    tool: "пульт и журнал",
    artifact: "журнал эксплуатации",
    angle: 107.5,
    cycle: 1,
  },
  {
    key: "modernize",
    label: "модернизация",
    tool: "разборный узел и ключ",
    artifact: "план модернизации",
    angle: 152.5,
    cycle: 2,
  },
  {
    key: "retire",
    label: "вывод из эксплуатации",
    tool: "ворота архива и запечатанный ящик",
    artifact: "акт архивации",
    angle: 175,
    cycle: 2,
  },
];

export const TURNOUT = {
  angle: 175,
  label: "переводная стрелка",
  ring: "новый круг через модернизацию",
  archive: "ворота архива",
};

export const COUNTERS = {
  cycles: { first: 1, afterModernization: 2, total: 2 },
  artifacts: { total: 8, perCycle: 6 },
};

// Восемь шагов обхода: до эксплуатации один круг, модернизация открывает второй.
export const STEPS = STAGES.map((stage, index) => {
  const artifact = index + 1;
  const cycle = stage.cycle;
  const place = stage.key === "retire" ? "архив" : stage.label;
  return {
    key: stage.key,
    label: stage.label,
    short: place,
    angle: stage.angle,
    cycle,
    artifact,
    readout: `круг ${cycle} · ${place} · ${artifact} из ${COUNTERS.artifacts.total}`,
  };
});

export const READOUTS = STEPS.map((step) => step.readout);
