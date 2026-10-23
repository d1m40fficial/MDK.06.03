import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, FIG_LABEL, CODES, SCENARIOS } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 640;
const HEIGHT = 440;

// Печь: плита на ножках, рельс, каретка с бланком, рама с пятью штампами,
// диск кодов на пьедестале, лоток ответа, лента журнала.

const PLATE = { x: -150, y: -74, w: 330, d: 156, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;

const RAIL_FROM = -136;
const RAIL_TO = 136;
const RAIL_Y = [-19, 15];

const EDGE_STOPS = [-140, 134];

const STOP = (x) => ({ x, y: -22, w: 5, d: 46, r: 1.2 });

const CARRIAGE = { x: -90, y: -22, w: 180, d: 44, r: 3 };
const CARRIAGE_Z = 3;
const CARRIAGE_TOP = 9;
const FORM = { x: -85, y: -15, w: 170, d: 26, r: 1.5 };
const FORM_TOP = 10.4;

const COL_L = { x: -143, y: -24, w: 14, d: 36, r: 2 };
const COL_R = { x: 129, y: -24, w: 14, d: 36, r: 2 };
const PAD = (c) => ({ x: c.x - 2, y: c.y - 2, w: c.w + 4, d: c.d + 4, r: 3 });
const PAD_H = 8;
const COL_TOP = 106;
const BEAM = { x: -150, y: -24, w: 300, d: 36, r: 6 };
const BEAM_TOP = 116;

// Станции уплотнены до шага 18: тогда на каждой остановке все опущенные
// штампы стоят точно над строчкой бланка, а проваленная остаётся над чистой позицией.
const STATION_X = [-36, -18, 0, 18, 36];
const RETRACT_HEAD = 29;
const PRESSED_HEAD = FORM_TOP;
const TRAVEL = RETRACT_HEAD - PRESSED_HEAD;
const STAMP = { x: -4, y: -3, w: 8, d: 8, r: 1 };

const DIAL = [86, -52];
const DIAL_R = 17;
const POST = [116, -52];
const POST_TOP = 50;
const COLLAR_H = 2.6;
const ARM = { x: 84, y: -57, w: 34, d: 10, r: 2 };
const ARM_Z = POST_TOP + COLLAR_H;
const PUCK_Z = ARM_Z + 5;
const PUCK_H = 7;
const PUCK_TOP = PUCK_Z + PUCK_H;

const BOX = { x: -148, y: 34, w: 30, d: 26, r: 2 };
const BOX_TOP = 22;
const ROLLER = [-119, 48, 4.5];
const TAPE = { x: -147, y: 40, w: 135, d: 16, r: 1 };
const TAPE_TOP = 1.5;
const TAPE_PITCH = 4.5;
const TAPE_MARK0 = -114;

const TRAY = { x: 78, y: 34, w: 46, d: 30, r: 2 };
// Карточка ответа стоит в лотке узкой панелью и прячется в толщину пола, когда ответа нет.
const CARD = { x: 96, y: 47, w: 16, d: 2.6, r: 0.8 };
const CARD_Z = 2.2;
const CARD_H = 9.6;
// Полное утопление в прорезь: верх карточки уходит за экранную кромку пола лотка.
const CARD_DROP = 34;

const STRIP = { x: -140, y: 68, w: 280, d: 6, r: 1 };
const LABEL = { x: 40, y: -66, w: 30, d: 12, r: 2 };

// Остановка каретки по сценарию: успех стоит в центре ганга, отказ останавливает
// её прямо под соответствующей станцией; все опущенные штампы при этом над бланком.
const CAR_STOPS = [0, ...STATION_X];
const CODE_INDEX = SCENARIOS.map((s) => CODES.indexOf(s.code));

const points = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  ...k.boxCorners(BEAM, COL_TOP, BEAM_TOP),
  ...k.boxCorners(BOX, 0, BOX_TOP),
  [DIAL[0], DIAL[1], PUCK_TOP + 2],
  [17, 58, TAPE_TOP],
];
const P = k.fitProjection(points, WIDTH, HEIGHT, { pad: 27, azimuth: 42, elevation: 30 });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (dots, style) => k.dotsSvg(dots, style);
const byDepth = (list) => [...list].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Табличка с тремя линиями, как печать на верстаке.
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P), { tone: "faint" }));
  out.push(L([
    k.lineOnTop([LABEL.x + 4, LABEL.y + LABEL.d * 0.32], [LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d * 0.32], 0.8, P),
    k.lineOnTop([LABEL.x + 4, LABEL.y + LABEL.d * 0.52], [LABEL.x + LABEL.w - 9, LABEL.y + LABEL.d * 0.52], 0.8, P),
    k.lineOnTop([LABEL.x + 4, LABEL.y + LABEL.d * 0.72], [LABEL.x + LABEL.w - 6, LABEL.y + LABEL.d * 0.72], 0.8, P),
  ].join(""), { tone: "lo", free: true }));
  out.push(D([at([LABEL.x + 2.4, LABEL.y + 2.4, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + 2.4, 0.8])], { size: 0.4 }));
  return out.join("");
}

function journal() {
  const out = [];
  // Лента целиком внутри группы: она выезжает из коробки вправо.
  const marks = [0, 1, 2, 3, 4, 5].map((n) => {
    const x = TAPE_MARK0 - n * TAPE_PITCH;
    return k.lineOnTop([x, TAPE.y + 2.5], [x, TAPE.y + TAPE.d - 2.5], TAPE_TOP, P);
  });
  const creases = [-40, -76].map((x) =>
    k.lineOnTop([x, TAPE.y + 2.5], [x, TAPE.y + TAPE.d - 2.5], TAPE_TOP, P));
  out.push(`<g data-part="tape">`);
  out.push(S(k.slabOf(TAPE, 0.1, 1.4, P, 2, 0.3), { tone: "hi", crease: "none" }));
  out.push(L(creases.join(""), { tone: "faint" }));
  out.push(L(marks.join(""), { tone: "mid" }));
  out.push(`</g>`);
  // Протяжной ролик на оси y: три тела, ролик прижат к ленте.
  const rollerBody = G.frameAlong([ROLLER[0], ROLLER[1] - 7, ROLLER[2]], [0, 1, 0]);
  out.push(S(G.disc(0, 14, 3, rollerBody, P), { tone: "mid" }));
  const fL = G.frameAlong([ROLLER[0], ROLLER[1] - 7, ROLLER[2]], [0, 1, 0]);
  const fR = G.frameAlong([ROLLER[0], ROLLER[1] + 7, ROLLER[2]], [0, 1, 0]);
  out.push(S(G.disc(-0.4, 0.4, 3.6, fL, P), { tone: "mid" }));
  out.push(S(G.disc(-0.4, 0.4, 3.6, fR, P), { tone: "mid" }));
  // Коробка принтера, она закрывает хвост ленты.
  out.push(S(k.slabOf(BOX, 0, BOX_TOP, P, 6, 1.2), { tone: "mid", inner: L(k.sideSeam(BOX, 19, P, 6), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BOX, 3), BOX_TOP, P), { tone: "faint" }));
  out.push(D(k.pointsAt([[BOX.x + 4, BOX.y + 4, BOX_TOP], [BOX.x + BOX.w - 4, BOX.y + 4, BOX_TOP],
    [BOX.x + 4, BOX.y + BOX.d - 4, BOX_TOP], [BOX.x + BOX.w - 4, BOX.y + BOX.d - 4, BOX_TOP]], P), { size: 0.45 }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of RAIL_Y) {
    out.push(S(k.slabOf({ x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: 5, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL_FROM + 6, RAIL_TO - 6].map((x) => at([x, y + 2.5, 3])), { size: 0.4 }));
  }
  for (const x of EDGE_STOPS) {
    out.push(S(k.slabOf(STOP(x), 0, 7, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, -18, 7]), at([x + 2.5, 20, 7])], { size: 0.45 }));
  }
  return out.join("");
}

function frame() {
  const out = [];
  for (const col of [COL_L, COL_R]) {
    const pad = PAD(col);
    out.push(S(k.slabOf(pad, 0, PAD_H, P, 6, 0.6), { tone: "lo" }));
    out.push(S(k.slabOf(col, PAD_H, COL_TOP - PAD_H, P, 6, 0.8), { tone: "mid", inner: L(k.sideSeam(col, 52, P, 6), { tone: "faint" }) }));
    out.push(L(k.sideSeam(col, 52, P, 6), { tone: "faint" }));
    out.push(D([at([col.x + col.w / 2, col.y + col.d - 2, 30]), at([col.x + col.w / 2, col.y + col.d - 2, 96])], { size: 0.5 }));
  }
  out.push(S(k.slabOf(BEAM, COL_TOP, BEAM_TOP - COL_TOP, P, 8, 1.2), { tone: "mid", inner: L(k.sideSeam(BEAM, 111, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BEAM, 5), BEAM_TOP, P), { tone: "lo" }));
  out.push(D(k.pointsAt(k.corners(k.insetPlan(BEAM, 12), 0).map(([x, y]) => [x, y, BEAM_TOP]), P), { size: 0.45 }));
  return out.join("");
}

function dial() {
  const out = [];
  const [dx, dy] = DIAL;
  out.push(S(k.cylinder(POST[0], POST[1], 7, 0, 2.5, P, 28), { tone: "lo" }));
  out.push(S(k.cylinder(POST[0], POST[1], 4.5, 2.5, POST_TOP - 2.5, P, 28), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(POST[0], POST[1], 4.5, 18, P, 16), { tone: "faint" }));
  out.push(L(k.sideArc(POST[0], POST[1], 4.5, 36, P, 16), { tone: "faint" }));
  out.push(S(k.cylinder(POST[0], POST[1], 6.5, POST_TOP, COLLAR_H, P, 28), { tone: "mid" }));
  out.push(S(k.slabOf(ARM, ARM_Z, PUCK_Z - ARM_Z, P, 4, 0.5), { tone: "mid" }));
  out.push(D([at([ARM.x + 3, ARM.y + 5, ARM_Z + 3]), at([POST[0], POST[1], ARM_Z + 4])], { size: 0.45 }));
  out.push(S(k.slabOf({ x: dx - 8, y: dy - 6, w: 16, d: 12, r: 2 }, ARM_Z, 3.4, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(dx, dy, DIAL_R, PUCK_Z, PUCK_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(dx, dy, DIAL_R, PUCK_TOP - 3.4, PUCK_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(dx, dy, DIAL_R, PUCK_TOP - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(dx, dy, DIAL_R - 2.2, PUCK_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(dx, dy, DIAL_R - 3, 30, 5, PUCK_TOP, [1.2, 2.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const dir = (a) => [Math.sin(a), -Math.cos(a)];
  CODES.forEach((code, i) => {
    const a = (i * Math.PI) / 3;
    const [vx, vy] = dir(a);
    const t = k.topMatrix([dx + vx * 9.4, dy + vy * 9.4], PUCK_TOP, P, "x");
    out.push(k.faceTextSvg(t, String(code), { size: 2.6, tone: "mid", anchor: "middle" }));
    out.push(D([at([dx + vx * 12.6, dy + vy * 12.6, PUCK_TOP])], { size: 0.5 }));
  });
  out.push(S(k.cylinder(dx, dy, 2.2, PUCK_TOP, 1.6, P, 20), { tone: "mid" }));
  return out.join("");
}

function carriage() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CARRIAGE, 3), CARRIAGE_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  // Длинная платформа: она охватывает весь ганг штампов, чтобы бланк всегда был под ними.
  out.push(S(k.slabOf(CARRIAGE, CARRIAGE_Z, CARRIAGE_TOP - CARRIAGE_Z, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.sideSeam(CARRIAGE, 6, P, 5), { tone: "faint" }));
  // Концевые упоры платформы с обоих торцов.
  for (const ex of [CARRIAGE.x - 4, CARRIAGE.x + CARRIAGE.w]) {
    out.push(S(k.slabOf({ x: ex, y: CARRIAGE.y + 4, w: 4, d: CARRIAGE.d - 8, r: 1 }, CARRIAGE_Z, CARRIAGE_TOP + 1 - CARRIAGE_Z, P, 3, 0.4), { tone: "lo" }));
  }
  // Ручка на заднем торце правого конца: катал появления каретки по рельсу.
  out.push(S(k.slabOf({ x: 50, y: -22, w: 24, d: 8, r: 1.5 }, CARRIAGE_TOP, 2.2, P, 3, 0.4), { tone: "lo", crease: "none" }));
  out.push(S(k.cylinder(62, -18, 2.6, CARRIAGE_TOP + 2.2, 1.8, P, 16), { tone: "mid" }));
  out.push(L(k.knurl(62, -18, 2.6, CARRIAGE_TOP + 2.2, 4, 14, P), { tone: "faint" }));
  // Бланк запроса: длинный лист, шапка и строка данных.
  out.push(S(k.slabOf(FORM, CARRIAGE_TOP, FORM_TOP - CARRIAGE_TOP, P, 4, 0.4), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(FORM, 2), FORM_TOP, P), { tone: "faint" }));
  const gt = k.topMatrix([FORM.x + 9, FORM.y + 7], FORM_TOP, P, "x");
  out.push(k.faceTextSvg(gt, "GET", { size: 3.2, tone: "mid", anchor: "middle" }));
  out.push(L([
    k.lineOnTop([FORM.x + 16, FORM.y + 7], [FORM.x + FORM.w - 4, FORM.y + 7], FORM_TOP, P),
    k.lineOnTop([FORM.x + 4, FORM.y + 23], [FORM.x + FORM.w - 4, FORM.y + 23], FORM_TOP, P),
  ].join(""), { tone: "lo", free: true }));
  return out.join("");
}

// Оттиски идут отдельным слоем поверх штампов: печать работает как печатка
// с просветом, вдавленный след виден в центре опущенной головки.
function marks() {
  const out = [];
  STATION_X.forEach((sx, i) => {
    out.push(`<g data-print="${i}" style="opacity:0">`);
    out.push(L(k.ring(sx, FORM.y + 16, 1.7, FORM_TOP, P, 16), { tone: "mid" }));
    out.push(D([at([sx, FORM.y + 16, FORM_TOP])], { size: 0.55, tone: "mid" }));
    out.push(`</g>`);
  });
  return out.join("");
}

function stations() {
  const out = [];
  STATION_X.forEach((sx, i) => {
    const bracket = { x: sx - 6, y: -8, w: 12, d: 16, r: 2 };
    const ram = [];
    // Штанга строится в поднятом положении, крышка втулки прячет её верх.
    ram.push(S(k.slabOf({ x: sx - 3.5, y: -3, w: 7, d: 8, r: 1 }, RETRACT_HEAD, 8, P, 3, 0.4), { tone: "hi" }));
    ram.push(S(k.cylinder(sx, 1, 2.2, RETRACT_HEAD + 8, 2.4, P, 16), { tone: "mid" }));
    ram.push(S(k.cylinder(sx, 1, 1.2, RETRACT_HEAD + 10.4, 68 - RETRACT_HEAD - 10.4, P, 14), { tone: "hi", crease: "none" }));
    out.push(S(k.slabOf(bracket, 96, COL_TOP - 96, P, 4, 0.5), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(bracket, 2.5), COL_TOP, P, 4), { tone: "faint" }));
    out.push(D([at([sx - 3.5, 8, 101]), at([sx + 3.5, 8, 101])], { size: 0.45 }));
    out.push(`<g data-part="ram${i}" transform="${k.translateAlong(P, [0, 0, 0])}">${ram.join("")}</g>`);
    out.push(S(k.cylinder(sx, 1, 3.2, 64, 32, P, 20), { tone: "mid", crease: "none" }));
    out.push(L(k.sideArc(sx, 1, 3.2, 72, P, 14), { tone: "faint" }));
    out.push(L(k.sideArc(sx, 1, 3.2, 88, P, 14), { tone: "faint" }));
  });
  return out.join("");
}

function trayAndStrip() {
  const out = [];
  out.push(S(k.slabOf(TRAY, 0, 2.2, P, 6, 0.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(TRAY, 3.5), 2.2, P), { tone: "faint" }));
  out.push(S(k.slabOf({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: 5, r: 1 }, 2.2, 6.8, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: TRAY.x, y: TRAY.y, w: 5, d: TRAY.d, r: 1 }, 2.2, 6.8, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: TRAY.x + TRAY.w - 5, y: TRAY.y, w: 5, d: TRAY.d, r: 1 }, 2.2, 6.8, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: TRAY.x, y: TRAY.y + TRAY.d - 5, w: TRAY.w, d: 5, r: 1 }, 2.2, 3.8, P, 3, 0.4), { tone: "mid" }));
  // Прорезь для карточки ответа: всё ниже передней кромки пола лотка скрыто.
  const slotL = at([TRAY.x, TRAY.y + TRAY.d, 0]);
  const slotR = at([TRAY.x + TRAY.w, TRAY.y + TRAY.d, 0]);
  const tenth = (v) => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");
  const slotClip = `<clipPath id="tray-slot"><path d="M300 ${tenth(slotL[1])}L400 ${tenth(slotR[1] + (400 - slotR[0]) * (slotR[1] - slotL[1]) / (slotR[0] - slotL[0]))}L400 -40L300 -40Z"/></clipPath>`;
  out.push(slotClip);
  // Карточка ответа стоит в лотке панелью и прячется в прорезь, когда ответа нет.
  out.push(`<g data-part="response" transform="${k.translateAlong(P, [0, 0, 0])}" clip-path="url(#tray-slot)">`);
  out.push(S(k.slabOf(CARD, CARD_Z, CARD_H, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  const cardText = `${k.sideMatrix([0, CARD.y + CARD.d], CARD_Z, P, "left")} translate(${CARD.x + CARD.w / 2} -4.2)`;
  out.push(k.faceTextSvg(cardText, "200", { size: 4.2, tone: "mid", anchor: "middle" }));
  out.push(`</g>`);
  out.push(D([at([TRAY.x + 6, TRAY.y + TRAY.d / 2, 2.2]), at([TRAY.x + TRAY.w - 6, TRAY.y + TRAY.d / 2, 2.2])], { size: 0.45 }));
  // Линейка вдоль передней кромки плиты.
  out.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4, 5, STRIP.y + 0.8, 0.6, [1.4, 2.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([STRIP.x + 2, STRIP.y + 3, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3, 0.6])], { size: 0.45 }));
  return out.join("");
}

const NEEDLE_Z = PUCK_TOP + 1.8;
const needleAt = (a) => {
  const [dx, dy] = DIAL;
  return k.lineOnTop(
    [dx - Math.sin(a) * 2.6, dy + Math.cos(a) * 2.6],
    [dx + Math.sin(a) * 13.2, dy - Math.cos(a) * 13.2],
    NEEDLE_Z, P,
  );
};

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: FIG_LABEL,
  body: [
    plate(),
    journal(),
    rails(),
    frame(),
    dial(),
    `<g data-part="carriage" transform="${k.translateAlong(P, [CAR_STOPS[0], 0, 0])}">${carriage()}</g>`,
    stations(),
    `<g data-part="marks" transform="${k.translateAlong(P, [CAR_STOPS[0], 0, 0])}">${marks()}</g>`,
    trayAndStrip(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(0)}" style="stroke-width:1.1"/>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const CAR_STOPS = ${JSON.stringify(CAR_STOPS)};
const STATION_X = ${JSON.stringify(STATION_X)};
const TRAVEL = ${TRAVEL};
const TAPE_PITCH = ${TAPE_PITCH};
const CARD_DROP = ${CARD_DROP};
const SCEN = ${JSON.stringify(SCENARIOS.map((s) => ({ code: s.code, verdict: s.verdict, failed: s.failed })))};
const CODE_INDEX = ${JSON.stringify(CODE_INDEX)};
const DX = ${DIAL[0]}, DY = ${DIAL[1]}, NTOP = ${NEEDLE_Z};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const marksEl = svg.querySelector('[data-part="marks"]');
const rams = STATION_X.map((_, i) => svg.querySelector('[data-part="ram' + i + '"]'));
const prints = Array.from(svg.querySelectorAll("[data-print]"));
const tape = svg.querySelector('[data-part="tape"]');
const response = svg.querySelector('[data-part="response"]');
const needle = svg.querySelector('[data-part="needle"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const wrap = (d) => Math.atan2(Math.sin(d), Math.cos(d));
const NEEDLE = (a) => lineOnTop(
  [DX - Math.sin(a) * 2.6, DY + Math.cos(a) * 2.6],
  [DX + Math.sin(a) * 13.2, DY - Math.cos(a) * 13.2], NTOP, P);
const passCount = (i) => (SCEN[i].failed === 0 ? 5 : SCEN[i].failed - 1);
const nearestStop = (w) => CAR_STOPS.reduce(
  (best, stop, i) => (Math.abs(stop - w) < Math.abs(CAR_STOPS[best] - w) ? i : best), 0);
const targetCode = (i) => CODE_INDEX[i] * Math.PI / 3;

const realTranslate = (v) => translateAlong(P, [v, 0, 0]);
const zTranslate = (dz) => translateAlong(P, [0, 0, dz]);
const travelShare = (lift) => TRAVEL * (1 - lift);


const ramp = () => Array.from({ length: 5 }, () => ({ v: 1, r: 0 }));
let idx = 0, changeAt = 0, clock = 0;
let x = CAR_STOPS[0], tx = x;
let lifts = ramp();
let na = 0, naT = targetCode(0);
let ta = 0, taT = 0;
let card = 0, cardT = 0;
let alphas = [0, 0, 0, 0, 0];
let frame = 0, last = 0, touring = !still.matches, visible = false, idleTimer = 0;

function draw() {
  carriage.setAttribute("transform", realTranslate(x));
  marksEl.setAttribute("transform", realTranslate(x));
  for (let i = 0; i < 5; i++) {
    rams[i].setAttribute("transform", zTranslate(-travelShare(lifts[i].v)));
    prints[i].style.opacity = alphas[i].toFixed(3);
    // Оттиск живёт в мировых координатах станции, пока каретка смещается.
    prints[i].setAttribute("transform", realTranslate(-x));
  }
  tape.setAttribute("transform", realTranslate(ta));
  response.setAttribute("transform", zTranslate(-CARD_DROP * (1 - card)));
  needle.setAttribute("d", NEEDLE(na));
  const text = SCEN[idx].code + " · " + SCEN[idx].verdict;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(idx));
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  if (touring) idx = Math.floor(clock / 2.5) % SCEN.length;
  // Каретка едет к своей остановке.
  tx = CAR_STOPS[idx];
  x = calm ? tx : x + (tx - x) * (1 - Math.exp(-dt / 0.28));
  if (Math.abs(tx - x) < 0.01) x = tx;
  // Штампы опускаются последовательно после смены сценария.
  const pass = passCount(idx);
  for (let i = 0; i < 5; i++) {
    const st = lifts[i];
    const want = i < pass ? 0 : 1;
    if (clock >= changeAt + i * 0.15) {
      if (calm) { st.v = want; st.r = 0; }
      else {
        for (let s = 0; s < 4; s++) {
          st.r += ((want - st.v) * 360 - st.r * 22) * dt / 4;
          st.v += st.r * dt / 4;
        }
        if (Math.abs(want - st.v) < 0.004 && Math.abs(st.r) < 0.004) { st.v = want; st.r = 0; }
      }
    }
    // Оттиск появляется, когда штамп дошёл до бланка.
    const seen = st.v < 0.12 ? 1 : 0;
    alphas[i] = calm ? seen : alphas[i] + (seen - alphas[i]) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(seen - alphas[i]) < 0.01) alphas[i] = seen;
  }
  // Стрелка диска и лента журнала.
  naT = targetCode(idx);
  na = calm ? naT : na + wrap(naT - na) * (1 - Math.exp(-dt / 0.22));
  if (Math.abs(wrap(naT - na)) < 0.002) na = naT;
  taT = idx * TAPE_PITCH;
  ta = calm ? taT : ta + (taT - ta) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(taT - ta) < 0.01) ta = taT;
  // Карточка ответа появляется только при успехе.
  cardT = idx === 0 ? 1 : 0;
  card = calm ? cardT : card + (cardT - card) * (1 - Math.exp(-dt / 0.2));
  if (Math.abs(cardT - card) < 0.01) card = cardT;
  draw();
  const settled = !touring && x === tx && na === naT && ta === taT && card === cardT
    && lifts.every((st, i) => st.v === (i < pass ? 0 : 1));
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  if (next === idx) return;
  idx = next;
  changeAt = clock;
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; run(); }, 3600);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.18) / 0.64, 0, 1);
  const world = CAR_STOPS[0] + share * (CAR_STOPS[SCEN.length - 1] - CAR_STOPS[0]);
  steer(nearestStop(world));
});
stage.addEventListener("pointerleave", () => steer(idx));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(SCEN.length - 1, idx + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, idx - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = SCEN.length - 1;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: TITLE,
  hint: HINT,
  readout: `${SCENARIOS[0].code} · ${SCENARIOS[0].verdict}`,
  keys: KEYS,
  caption: CAPTION,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: стрелки и наведение выбирают сценарий" aria-valuemin="0" aria-valuemax="${SCENARIOS.length - 1}" aria-valuenow="0">${svg}</div>`,
});

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  const styles = `<style>.iso-plate-corner[data-corner="hint"]{white-space:normal;max-width:56%}</style>`;
  const html = k.pageHtml({ title: TITLE, theme, body: styles + body, script: kitScript() + live })
    .replace('<html lang="en">', '<html lang="ru">');
  writeFileSync(join(HERE, name), html);
  console.log("wrote", name);
}
