// Truth model for fig-04-classes (УФИС, Лекция 4, Fig 1).
//
// One information system is classified by four independent traits. Each trait
// owns one row of class values (bins). A card carries exactly one value per
// trait; the four values together are the class of the system. Switching a
// trait off leaves a partial class, so the readout reports 3 из 4 and names
// the missing trait. Every label the figure shows is produced here.

export const TRAITS = [
  {
    id: "sphere",
    label: "сфера",
    full: "сфера применения",
    bins: ["финансы", "образование", "промышленность", "торговля"],
  },
  {
    id: "automation",
    label: "автоматизация",
    full: "степень автоматизации",
    bins: ["ручная", "автоматизированная", "автоматическая"],
  },
  {
    id: "processing",
    label: "характер обработки",
    full: "характер обработки данных",
    bins: ["информационно-поисковая", "обработка данных", "управляющая", "экспертная"],
  },
  {
    id: "scale",
    label: "масштаб",
    full: "масштаб",
    bins: ["локальная", "корпоративная", "распределённая"],
  },
];

export const CARDS = [
  { id: "abs", label: "Банковская АБС", short: "АБС", picks: [0, 2, 1, 1] },
  { id: "journal", label: "Электронный журнал", short: "журнал", picks: [1, 1, 0, 1] },
  { id: "plant", label: "Диспетчеризация завода", short: "завод", picks: [2, 2, 2, 2] },
  { id: "shop", label: "Интернет-магазин", short: "магазин", picks: [3, 1, 1, 2] },
];

export const TOTAL = TRAITS.length;

export function normalizeActive(activeTraits) {
  return TRAITS.map((_, lane) => Boolean(activeTraits && activeTraits[lane]));
}

export function classify(cardIndex, activeTraits = [true, true, true, true]) {
  const index = ((Math.round(cardIndex) % CARDS.length) + CARDS.length) % CARDS.length;
  const card = CARDS[index];
  const active = normalizeActive(activeTraits);
  const picks = TRAITS.map((trait, lane) => {
    const binIndex = card.picks[lane];
    return {
      lane,
      trait,
      binIndex,
      bin: trait.bins[binIndex],
      active: active[lane],
    };
  });
  const present = picks.filter((pick) => pick.active);
  const missing = picks.filter((pick) => !pick.active);
  const count = present.length;
  const parts = [card.short, ...present.map((pick) => pick.bin), `${count} из ${TOTAL}`];
  if (missing.length) parts.push(`нет: ${missing.map((pick) => pick.trait.label).join(", ")}`);
  parts.push(`токенов ${count} из ${TOTAL}`, `карточка ${index + 1} из ${CARDS.length}`);
  return {
    card,
    cardIndex: index,
    active,
    picks,
    labels: picks.map((pick) => pick.bin),
    present,
    missing: missing.map((pick) => pick.trait),
    count,
    total: TOTAL,
    complete: count === TOTAL,
    readout: parts.join(" · "),
  };
}

// One serialisable state per card and per mask of active traits (bit 0 is lane 1).
// The page looks these up, so its card list, pick indices and readout text all
// come from this model rather than from a second copy in the live script.
export const STATES = CARDS.map((_, cardIndex) =>
  Array.from({ length: 1 << TOTAL }, (_, mask) => {
    const active = TRAITS.map((__, lane) => Boolean(mask & (1 << lane)));
    const result = classify(cardIndex, active);
    return {
      cardIndex,
      mask,
      active,
      count: result.count,
      complete: result.complete,
      readout: result.readout,
      picks: result.picks.map((pick) => ({
        binIndex: pick.binIndex,
        bin: pick.bin,
        active: pick.active,
      })),
    };
  }),
);

export const MASK_ALL = (1 << TOTAL) - 1;

export const initial = {
  cardIndex: 0,
  mask: MASK_ALL,
  ...classify(0, [true, true, true, true]),
};

export const summary = {
  traits: TRAITS,
  cards: CARDS,
  total: TOTAL,
  states: STATES,
  initial: {
    cardIndex: initial.cardIndex,
    mask: initial.mask,
    readout: initial.readout,
  },
};
