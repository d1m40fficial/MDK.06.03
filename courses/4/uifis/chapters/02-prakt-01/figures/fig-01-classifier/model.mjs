// Truth model for fig-01-classifier: an information system is classified by three
// independent признака in order: сфера применения, масштаб, способ обработки.
//
// build.mjs reads the current card and its three признака from here. Every number
// the figure and the chapter show comes from this module.

export const TRAITS = [
  {
    key: "сфера",
    title: "сфера применения",
    label: "СФЕРА",
    values: ["финансы", "экономика", "промышленность", "торговля", "медицина"],
    adjectives: ["финансовая", "экономическая", "промышленная", "торговая", "медицинская"],
  },
  {
    key: "масштаб",
    title: "масштаб",
    label: "МАСШТАБ",
    values: ["малая", "средняя", "корпоративная"],
  },
  {
    key: "способ",
    title: "способ обработки",
    label: "СПОСОБ",
    values: ["пакетная", "оперативная"],
  },
];

export const CARDS = [
  { name: "Банковская АБС", values: ["финансы", "корпоративная", "оперативная"] },
  { name: "1С:Бухгалтерия малого предприятия", values: ["экономика", "малая", "пакетная"] },
  { name: "Система диспетчеризации завода", values: ["промышленность", "корпоративная", "оперативная"] },
  { name: "Интернет-магазин", values: ["торговля", "средняя", "оперативная"] },
  { name: "Медицинская картотека поликлиники", values: ["медицина", "малая", "пакетная"] },
];

// The class value of each признак: the index into that признак's value list.
export function indices(card) {
  return card.values.map((value, i) => TRAITS[i].values.indexOf(value));
}

// The full class of a card, one признак after another, e.g. "финансовая корпоративная оперативная ИС".
export function fullClass(card) {
  const sphere = TRAITS[0].adjectives[TRAITS[0].values.indexOf(card.values[0])];
  return `${sphere} ${card.values[1]} ${card.values[2]} ИС`;
}

// The live readout line.
export function readout(card) {
  return `карточка: ${card.name} · сфера: ${card.values[0]} · масштаб: ${card.values[1]} · способ: ${card.values[2]}`;
}

export const initial = 0;

export function next(index, delta) {
  return (index + delta + CARDS.length) % CARDS.length;
}
