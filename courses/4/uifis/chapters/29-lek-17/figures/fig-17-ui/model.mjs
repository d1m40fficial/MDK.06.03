export const ID = "fig-17-ui";
export const TITLE = "Пульт в зоне досягаемости";
export const HINT = "Проведите рукой по пульту: частые, редкие и опасные действия.";
export const CAPTION =
  "Частые действия стоят в центре дуги, редкие по краям, опасное действие закрыто крышкой. Лампа и строка сообщения показывают результат, а клавиатура повторяет путь без мыши.";
export const KEYS = [
  { mark: "dotted", label: "Дуга досягаемости: частые действия внутри" },
  { mark: "lit", label: "Крупные кнопки в центре, цель не меньше 44 px" },
  { mark: "red", label: "Опасная кнопка под защитной крышкой" },
  { mark: "green", label: "Лампа и строка сообщения: обратная связь" },
];

// Модель правды: зоны пульта, обратная связь и правила доступности.
export const ZONES = [
  { key: "often", label: "частые", note: "центр пульта, внутри дуги досягаемости" },
  { key: "rare", label: "редкие", note: "края и верхний ряд, ручки настройки" },
  { key: "danger", label: "опасные", note: "защищённая кнопка, два шага подтверждения" },
];

export const RULES = {
  targetPx: 44, // минимальный размер цели по доступности
  contrast: 7, // контраст текста к фону
  contrastMin: 4.5,
  focusWidth: 2, // рамка фокуса, px
  confirmSteps: 2, // крышка и подтверждение
};

export const STEPS = [
  {
    key: "task",
    label: "задача",
    short: "задача",
    readout: "UI · задача",
    msg: "осмотрите пульт",
    screen: "ГОТОВ",
    lamp: "ok",
    act: "rest",
  },
  {
    key: "zones",
    label: "зоны досягаемости",
    short: "зоны",
    readout: "UI · зоны · 3",
    msg: "частые, редкие, опасные",
    screen: "ЗОНЫ",
    lamp: "ok",
    act: "arc",
  },
  {
    key: "often",
    label: "частые действия",
    short: "частые",
    readout: "UI · цель 44 px",
    msg: "нажато: пуск",
    screen: "РАБОТА",
    lamp: "ok",
    act: "button",
    button: 1,
  },
  {
    key: "feedback",
    label: "обратная связь",
    short: "отклик",
    readout: "UI · лампа и строка",
    msg: "лампа подтверждает",
    screen: "ВЫПОЛНЕНО",
    lamp: "ok",
    act: "lamp",
  },
  {
    key: "error",
    label: "ошибка",
    short: "ошибка",
    readout: "UI · ошибка",
    msg: "ошибка: подтвердите",
    screen: "ОШИБКА",
    lamp: "bad",
    act: "message",
  },
  {
    key: "danger",
    label: "опасное действие",
    short: "опасное",
    readout: "UI · опасное · 2 шага",
    msg: "крышка открыта",
    screen: "СТОП",
    lamp: "bad",
    act: "danger",
  },
  {
    key: "keyboard",
    label: "клавиатура",
    short: "клавиши",
    readout: "UI · фокус Tab",
    msg: "фокус: Tab",
    screen: "ФОКУС",
    lamp: "ok",
    act: "keyboard",
  },
  {
    key: "contrast",
    label: "контраст",
    short: "контраст",
    readout: "UI · контраст 7:1",
    msg: "контраст 7:1",
    screen: "КОНТРАСТ",
    lamp: "ok",
    act: "contrast",
  },
];

// Подписи на крупных кнопках: частые действия.
export const BUTTONS = ["ПУСК", "ШАГ", "НАЗАД", "МЕНЮ"];
