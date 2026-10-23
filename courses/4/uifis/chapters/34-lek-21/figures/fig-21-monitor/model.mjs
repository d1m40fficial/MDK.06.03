export const ID = "fig-21-monitor";
export const TITLE = "Приборная панель мониторинга";
export const HINT = "Поверните ручку нагрузки: стрелки покажут порог и перегрузку.";
export const CAPTION =
  "При росте нагрузки запросы, процессор и память идут вверх, время ответа проходит порог, а пропускная способность проседает. Лампа и самописец фиксируют перегрузку, после снятия нагрузки стрелки возвращаются.";
export const KEYS = [
  { mark: "lit", label: "Шесть стрелочных индикаторов: время ответа, запросы, процессор, память, диск, ошибки" },
  { mark: "red", label: "Красная отметка порога на каждой шкале" },
  { mark: "dim", label: "Ручка нагрузки, лампа тревоги и лента самописца" },
];

export const STEPS = [
  { key: "rest", label: "покой", short: "покой", readout: "monitoring · покой" },
  { key: "rise", label: "рост нагрузки", short: "рост", readout: "monitoring · рост нагрузки" },
  { key: "normal", label: "норма", short: "норма", readout: "норма · 200 запросов/с · 120 мс" },
  { key: "threshold", label: "порог", short: "порог", readout: "порог · 850 запросов/с · 400 мс" },
  { key: "overload", label: "перегрузка", short: "перегрузка", readout: "перегрузка · 900 на входе · 1,2 с" },
  { key: "relief", label: "снятие нагрузки", short: "снятие", readout: "снятие · стрелки возвращаются" },
  { key: "trend", label: "тренд", short: "тренд", readout: "тренд · пик на ленте самописца" },
  { key: "summary", label: "вывод", short: "вывод", readout: "вывод · порог виден заранее" },
];

// Правда модели. У каждого индикатора своя шкала, свой предел и своя красная
// отметка порога. Зелёная зона идёт до семидесяти процентов отметки, жёлтая до
// самой отметки, красная за ней. Для загрузки процессора, памяти и диска отметка
// стоит на восьмидесяти пяти, восьмидесяти и девяноста процентах шкалы.
export const GAUGES = [
  { key: "response", label: "время ответа", unit: "мс", max: 1500, red: 400, digits: 0 },
  { key: "requests", label: "запросы", unit: "запросов в секунду", max: 1000, red: 850, digits: 0 },
  { key: "cpu", label: "процессор", unit: "процентов", max: 100, red: 85, digits: 0 },
  { key: "memory", label: "память", unit: "процентов", max: 100, red: 80, digits: 0 },
  { key: "disk", label: "диск", unit: "процентов", max: 100, red: 90, digits: 0 },
  { key: "errors", label: "ошибки", unit: "процентов", max: 10, red: 5, digits: 1 },
];

// Числа шагов повторяют текст лекции: норма 200 запросов при 120 мс, порог 850
// запросов при 400 мс, перегрузка 900 запросов на входе и 1,2 с ожидания.
export const SERIES = [
  { key: "rest", load: 0.05, values: [90, 45, 12, 34, 8, 0] },
  { key: "rise", load: 0.3, values: [105, 120, 38, 46, 22, 0.2] },
  { key: "normal", load: 0.45, values: [120, 200, 48, 52, 30, 0.4] },
  { key: "threshold", load: 0.78, values: [400, 850, 76, 71, 64, 1.2] },
  { key: "overload", load: 0.95, values: [1200, 620, 93, 88, 91, 5] },
  { key: "relief", load: 0.1, values: [140, 210, 26, 52, 18, 0.3] },
  { key: "trend", load: 0.1, values: [140, 210, 26, 52, 18, 0.3] },
  { key: "summary", load: 0.45, values: [120, 200, 48, 52, 30, 0.4] },
];

export const TREND = {
  key: "response",
  note: "самописец пишет время ответа, пик остаётся на ленте после снятия нагрузки",
};

export function shareOf(gauge, value) {
  return Math.min(1, Math.max(0, value / gauge.max));
}

export function zoneOf(gauge, value) {
  if (value >= gauge.red) return "hot";
  if (value >= gauge.red * 0.7) return "warn";
  return "ok";
}

export function alarmOn(step) {
  return SERIES[step].values.some((value, index) => zoneOf(GAUGES[index], value) === "hot");
}
