// Truth model for fig-cert-line (ИС, Лекция 1, Fig 1).
//
// The certification stand carries one application through four stations:
// Заявка -> Анализ -> Испытания -> Решение. After the decision the document
// leaves the carriage: a certificate goes into the certificate tray, a refusal
// goes into the reject chute. The wheel and the pointer show the station, the
// counter shows how many applications have passed the tests, and the readout
// also counts the issued certificates.
//
// Three applications make one batch, so the example state on the card is
// reachable: at the tests of the third application two applications have
// already passed the tests and only one of them got a certificate.
//
// Every number the figure and the chapter show is computed here.

export const STAGES = ["Заявка", "Анализ", "Испытания", "Решение"];

// One beat per action. The first two beats are the application on the
// carriage at the first station: loading and registration. The last beat is
// the delivery to a tray.
export const BEATS_PER_APPLICATION = 6;
export const BEAT_NAMES = ["загрузка", "заявка", "анализ", "испытания", "решение", "выдача"];

// A batch of three: certificate, refusal, certificate.
export const APPLICATIONS = [
  { id: "З-1", decision: "сертификат", slot: 0 },
  { id: "З-2", decision: "отказ", slot: 0 },
  { id: "З-3", decision: "сертификат", slot: 1 },
];

export const LAST = APPLICATIONS.length * BEATS_PER_APPLICATION - 1;

export function appAt(beat) {
  return Math.max(0, Math.min(APPLICATIONS.length - 1, Math.floor(beat / BEATS_PER_APPLICATION)));
}

export function beatInApp(beat) {
  return beat - appAt(beat) * BEATS_PER_APPLICATION;
}

// The document's progress along its five stops: 0 is the first station,
// 3 is the decision station, 4 is the tray or the chute.
export function docProgress(app, beat) {
  return Math.max(0, Math.min(4, beat - app * BEATS_PER_APPLICATION - 1));
}

export function stageAt(beat) {
  const b = beatInApp(beat);
  if (b <= 1) return "Заявка";
  if (b === 2) return "Анализ";
  if (b === 3) return "Испытания";
  if (b === 4) return "Решение";
  return APPLICATIONS[appAt(beat)].decision === "сертификат" ? "Сертификат" : "Отказ";
}

// An application counts as tested once its document has reached the decision
// station: the tests are behind it.
export function testedAt(beat) {
  let count = 0;
  for (let i = 0; i < APPLICATIONS.length; i++) {
    if (beat - i * BEATS_PER_APPLICATION - 1 >= 3) count += 1;
  }
  return count;
}

// A certificate is issued only when a positive decision has been delivered.
export function certificatesAt(beat) {
  let count = 0;
  for (let i = 0; i < APPLICATIONS.length; i++) {
    if (APPLICATIONS[i].decision !== "сертификат") continue;
    if (beat - i * BEATS_PER_APPLICATION - 1 >= 4) count += 1;
  }
  return count;
}

export function readout(beat) {
  return `Этап: ${stageAt(beat)} · проверено ${testedAt(beat)} · сертификатов ${certificatesAt(beat)}`;
}

export const initial = {
  beat: 0,
  text: readout(0),
};

export const summary = {
  applications: APPLICATIONS.length,
  certificates: APPLICATIONS.filter((a) => a.decision === "сертификат").length,
  refusals: APPLICATIONS.filter((a) => a.decision === "отказ").length,
};
