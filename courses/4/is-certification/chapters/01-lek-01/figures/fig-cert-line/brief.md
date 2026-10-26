# Figure brief: fig-cert-line

Стенд проводит заявку по четырём станциям, а после решения отдаёт сертификат в лоток или отказ в жёлоб.

- **Course / chapter / position:** ИС · Ch 1 · Fig 1 of the chapter
- **Size:** Figure (one mechanism, 40-80 parts)
- **Reader:** has just read that certification is an independent proof of conformity: a third party compares an object with fixed requirements and records the result. They know the words заявитель, орган по сертификации, лаборатория, but have not yet seen the procedure as a route.

## The idea it must make obvious

Сертификация это не одна подпись, а маршрут: заявка проходит анализ, испытания и решение, и только после решения появляется документ. На каждом этапе заявка может остановиться, поэтому сертификат всегда описывает конкретную проверенную область, а не систему вообще.

## Truth (the model)

- inputs: three applications in one batch: З-1, З-2, З-3.
- state: each application moves through five document stops: заявка (station 1), анализ (station 2), испытания (station 3), решение (station 4), выдача (tray or chute).
- rule: an application counts as `проверено` when it reaches the decision station, because the tests are behind it; it counts as a `сертификат` only when the decision is positive and the document has been delivered. A refusal is tested but never becomes a certificate.
- concrete values: З-1 is a certificate, З-2 is a refusal, З-3 is a certificate. The batch therefore ends with `проверено 3 · сертификатов 2`.
- the example state on the card: at the tests of З-3, З-1 and З-2 have passed the tests, but only З-1 has a certificate, so the readout is `Этап: Испытания · проверено 2 · сертификатов 1`.
- every number and word comes from `model.mjs`; `build.mjs` imports it and the live page receives the same computed readouts.

## The object

A certification stand: a heavy base on four feet, a raised deck, a pair of rails on legs, and a carriage with a document tile. Four gateways stand over the rail, each with a nameplate: Заявка, Анализ, Испытания, Решение. A roller registers the document at the first gate; a probe drops onto it at the analysis gate; a press with a dial tests it at the third; a stamp puts a mark on it at the fourth. After the decision the document rises over the gate and drops into the certificate tray or the reject chute. A handwheel with a pointer and a four-mark index disc shows the station, and a counter window shows how many applications have passed the tests.

- **What moves, and what that motion means:** the carriage carries the document from gate to gate, each tool works in turn, and the document leaves to one of two trays. The route is the procedure; the two trays are the two possible decisions.
- **Mapping:**
  - заявка → the document tile on the carriage
  - заявка, анализ, испытания, решение → the four gateways and their tools
  - проверка документов → the roller at the first gate
  - анализ → the probe that drops onto the document
  - испытания → the press with the dial and the pressure plate
  - решение → the stamp that puts a mark on the document
  - сертификат → the certificate tray at the front right
  - отказ → the reject chute at the back right
  - текущий этап → the handwheel pointer over the four-mark index disc
  - пройденные заявки → the counter window on the deck
- **The one lit part:** the document tile on the carriage.

## Interaction

- **Pointer:** hover across the card scrubs through the 18 beats of the batch.
- **Keyboard:** → next beat, ← previous beat, Home first beat, End last beat.
- **Idle tour:** loading and registration at the first gate; the probe drops at analysis; the press works and the dial needle swings; the stamp marks the decision; the document rises and drops into the certificate tray or the reject chute; the wheel turns one quarter per station and the counter steps when an application passes the tests. After the third application the carriage returns and a new batch starts.
- **Readout:** `Этап: Испытания · проверено 2 · сертификатов 1`; at the start `Этап: Заявка · проверено 0 · сертификатов 0`.

## Card text

- **Fig:** Fig 1
- **Title:** Стенд сертификации
- **Hint:** Ведите заявку по этапам
- **Legend keys:** `lit` заявка на каретке · `raised` документы в лотках
- **Caption:** Три заявки проходят станции Заявка, Анализ, Испытания и Решение: две получают сертификат, одна уходит в жёлоб отказа. Щуп опускается на анализ, пресс с циферблатом испытывает, штамп ставит отметку, а маховик и счётчик показывают этап и число проверенных заявок.

## How the chapter uses it

Before: "Сертификация это независимое доказательство соответствия." After: "Стенд показывает, что маршрут состоит из этапов и на каждом этапе заявка может остановиться. Поэтому в сертификате важны область действия, версия и требования, а не только подпись."

## Done when

- `node build.mjs` writes `fig-cert-line.html` and `fig-cert-line-light.html`; `--audit` passes (the figure has round parts: feet, posts, roller, dial, wheel).
- Anatomy's verify steps pass (desktop, 390 px phone, both themes, 4× close-ups).
- A learner who only plays with the figure can state "The idea it must make obvious".
