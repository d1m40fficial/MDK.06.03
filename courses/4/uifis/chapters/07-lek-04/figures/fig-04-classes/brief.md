# Figure brief: fig-04-classes

Одна карточка системы раскладывается сразу по четырём признакам классификации.

- **Course / chapter / position:** УФИС · Ch 7 (Лекция 4) · Fig 1 of the chapter
- **Size:** Figure (one mechanism, 40–80 parts)
- **Reader:** knows what an IS is, its subsystems and data flows; has seen a flat list of classification traits and now needs to see that one system belongs to several classes at once.

## The idea it must make obvious

A system is not placed into one box: the same card is read by four independent lanes, and its class is the set of four chosen cells, not a single label.

## Truth (the model)

Four traits (lanes), each with its own row of cells (bins):

1. **Сфера применения:** финансы, образование, промышленность, торговля.
2. **Степень автоматизации:** ручная, автоматизированная, автоматическая.
3. **Характер обработки данных:** информационно-поисковая, обработка данных, управляющая, экспертная.
4. **Масштаб:** локальная, корпоративная, распределённая.

Concrete cards to show (cycle with the arrows). Each card has exactly one cell per lane:

| Card | Сфера | Автоматизация | Обработка | Масштаб |
|---|---|---|---|---|
| Банковская АБС | финансы | автоматическая | обработка данных | корпоративная |
| Электронный журнал | образование | автоматизированная | информационно-поисковая | корпоративная |
| Диспетчеризация завода | промышленность | автоматическая | управляющая | распределённая |
| Интернет-магазин | торговля | автоматизированная | обработка данных | распределённая |

Rule: the number of lit cells always equals 4, one per lane, whatever card is loaded. A lane never receives two tokens from one card. If a lane is switched off in the UI, the readout says `3 из 4` and lists the missing trait.

Put this model in `model.mjs`: `TRAITS` (id, label, bins), `CARDS` (id, label, picks as indices), and a pure `classify(cardIndex, activeTraits)` returning the four picked bin labels and the count. `build.mjs` imports it; the readout text is generated from it.

Readout examples:
- `АБС · финансы · автоматическая · обработка данных · корпоративная · 4 из 4`
- `журнал · образование · автоматизированная · информационно-поисковая · корпоративная · 4 из 4`

## The object

A four-lane card sorter. A single card sits in a cradle on a horizontal rail. Above the rail, four reading lanes run parallel, one per trait. Each lane has a row of open bins. At every lane, a read head moves over the card, reads one attribute and drops a small metal token into the matching bin. The card stays one; the tokens accumulate in four different rows.

- **What moves, and what that motion means:** the cradle indexes the card under each read head in turn, and each head drops one token into its chosen bin; the four tokens are the four classes of the same system.
- **Mapping:** card = one information system; cradle = the classification act; four lanes = four independent traits; bins = class values; token = the system's class on that trait; token colour = trait (four calm accents of the same family); light over a bin = the selected cell.
- **The one lit part:** the token falling from the active read head into its bin, and the bin's rim lighting up as it lands.

Build the machine as a real bench object: a heavy base plate, four parallel lane beams with shallow bins (open-top trays with thin lips), a saddle that carries the card, four read heads on short arms, a small hopper of tokens, and a hand crank that indexes the cradle. The card should be a real thin plate with a printed label (the system name) and four small index notches along its top edge, one per trait. Tokens are small cylinders (lathe or tube) that drop with a calm ease and settle.

Parts must read as physical: lane beams bolted to the base, bins with visible depth, heads with a lens or stylus, the cradle with a spring clamp. Keep the course's visual family: warm paper card, dark graphite frame, four muted accent colours, no glow except one small lamp over the active bin.

## Interaction

- **Pointer:** hover a lane highlights the trait and its chosen bin; drag the cradle left or right to index the card manually.
- **Keyboard:** `←` `→` previous or next card; `1`–`4` toggle a lane on or off (to show that a partial classification is not a full class); `Home` resets to the first card.
- **Idle tour:** (1) load the АБС card; (2) index lane 1, token falls into «финансы»; (3) lane 2, token falls into «автоматическая»; (4) lane 3, «обработка данных»; (5) lane 4, «корпоративная»; (6) pause with all four tokens lit and the readout `4 из 4`, then load the next card.
- **Readout:** live line as above, plus `токенов 4 из 4` and `карточка 1 из 4`.

## Card text

- **Fig:** Fig 1
- **Title:** Сортировщик классов
- **Hint:** `карточки ← → · признак 1–4`
- **Legend keys:** `token` = класс по признаку; `lit` = выбранная ячейка; `dim` = признак выключен.
- **Caption:** Одна карточка проходит четыре независимых ряда. Банковская АБС получает четыре класса: финансы, автоматическая, обработка данных, корпоративная.

## How the chapter uses it

The paragraph before: «Посмотрите на сортировщик. Карточка одна, но над ней работают четыре независимых ряда ячеек: сфера, автоматизация, характер обработки, масштаб. Каждый ряд кладёт свой жетон в свою ячейку». The paragraph after: «Четыре жетона и есть класс системы. Уберите один ряд, и класс станет неполным: останется три координаты из четырёх». The test asks what happens when one trait is removed, so the `1`–`4` toggle must really produce `3 из 4`.

## Done when

- `node build.mjs` writes `fig-04-classes.html` and `fig-04-classes-light.html`; `--audit` passes (it has round tokens and a crank).
- Anatomy's verify steps pass (desktop, 390 px phone, both themes, 4× close-ups). Read every PNG.
- A learner who only plays with the figure can say: one card, four independent lanes, four classes at once.
