import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, STEPS, ENTITIES, LINKS, DUPLICATES, FORMS } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 640;
const HEIGHT = 452;

// Сборочный стол: плита на ножках, стол с четырьмя ящиками-сущностями,
// рычаг нормализации слева, лоток дубликатов спереди, лоток физической схемы справа.

const PLATE = { x: -150, y: -66, w: 298, d: 134, r: 14 };
const PLATE_H = 12;
const FOOT_H = 5;

const TOP = { x: -98, y: -38, w: 196, d: 66, r: 9 };
const TOP_Z = 30;
const TOP_H = 8;
const SURFACE = TOP_Z + TOP_H;

const DW = 44;
const DD = 48;
const DY = -24;
const DRAWER_X = [-72, -24, 24, 72];
const BOTTOM_Z = SURFACE + 1.4;
const BOTTOM_H = 2.6;
const WALL_Z = BOTTOM_Z + BOTTOM_H;
const WALL_TOP = 46.5;
const FRONT_TOP = 47;
const FRONT_Y = DY + DD - 4;
const PAD_Y = 0;
const PAD_W = 6;
const PAD_D = 8;
const PAD_GAP = 2.4;
const PIN_Y = -14;
const PIN_TOP = 58.5;
const CARD_W = 13;
const CARD_H = 9.2;
const CARD_T = 1.2;
const CARD_REST_Z = 40.6;

const RULE = { x: -58, y: 58, w: 56, d: 5, r: 1 };
const LABEL = { x: -6, y: 57, w: 34, d: 9 };
const DISH = { x: 26, y: 58, r: 9.2 };
const BIN = { x: 112, y: 52, w: 26, d: 14, r: 2 };

const LEVER = {
  x: -127,
  y: 0,
  z: 48,
  arm: 18,
  plate: { x: -148, y: -12, w: 42, d: 4, r: 2 },
  plateZ0: 33,
  plateZ1: 75,
  face: -8,
};

const TRAY_D = { x: -144, y: 30, w: 50, d: 30, r: 2.4 };
const SLOT_X = [-140.4, -126.4, -112.4];
const SLOT_Y = 38;

const TRAY_P = { x: 104, y: -18, w: 40, d: 68, r: 2.4 };
const RACK_TOP = 46;
const TAB_W = 7;
const TAB_H = 14;
const TAB_T = 1.2;
const TAB_X = [106.2, 115.7, 125.2, 134.7];
const TAB_Y = -12.4;
const TAB_REST_Z = 26.2;
const TAB_DROP = 20;

const entities = ENTITIES.map((entity, index) => ({ ...entity, cx: DRAWER_X[index], index }));
const byKey = (key) => entities.find((entity) => entity.key === key);
const slotsOf = (entity) => {
  const count = entity.attributes.length;
  const rowW = count * PAD_W + (count - 1) * PAD_GAP;
  const x0 = entity.cx - rowW / 2;
  return entity.attributes.map((attr, index) => ({
    ...attr,
    index,
    x: x0 + index * (PAD_W + PAD_GAP),
    cx: x0 + index * (PAD_W + PAD_GAP) + PAD_W / 2,
    cy: PAD_Y + PAD_D / 2,
  }));
};
const padOf = (entityKey, index) => slotsOf(byKey(entityKey))[index];

const pts = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  ...k.boxCorners(LEVER.plate, LEVER.plateZ0, LEVER.plateZ1),
  [TRAY_P.x + TRAY_P.w, TRAY_P.y, RACK_TOP],
  [TRAY_P.x, TRAY_P.y, RACK_TOP],
  [TRAY_D.x + TRAY_D.w, TRAY_D.y + TRAY_D.d, 12],
  [SLOT_X[0], SLOT_Y, 62],
  [DRAWER_X[0] - 22, DY, PIN_TOP + 12],
  [LABEL.x, LABEL.y + LABEL.d, 2],
];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 14, azimuth: 40, elevation: 34 });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (dots, style) => k.dotsSvg(dots, style);
const byDepth = (list) => [...list].sort((a, b) => k.depthOf([a[0], a[1], a[2] ?? 0], P) - k.depthOf([b[0], b[1], b[2] ?? 0], P));

function faceText(x, y, z, text, { size = 4, tone = "hi", anchor = "middle" } = {}) {
  return k.faceTextSvg(k.sideMatrix([x, y], z, P, "left"), text, { size, tone, anchor });
}

// --- плита
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H + FOOT_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 26))) {
    out.push(S(k.cylinder(x, y, 7.5, -PLATE_H - FOOT_H, 1.8, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.6, -PLATE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 10, 1.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P, 10), { tone: "faint" }));
  const screws = k.corners(PLATE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // линейка на переднем крае
  out.push(S(k.slabOf(RULE, 0, 0.8, P, 4), { tone: "mid", crease: "none" }));
  const ticks = k.topTicks(RULE.x + 3, RULE.x + RULE.w - 3, 3, 5, RULE.y + 0.8, 0.8, [1.6, 3.2], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(RULE, 1.2), 0.8, P, 4), { tone: "faint" }));
  // табличка с тремя строками
  out.push(S(k.slabOf(LABEL, 0, 1, P, 4), { tone: "mid", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 1, P, 4), { tone: "lo" }));
  out.push(
    L(
      [18, 12, 7]
        .map((len, i) => k.lineOnTop([LABEL.x + 3.4, LABEL.y + 2.4 + i * 2.4], [LABEL.x + 3.4 + len, LABEL.y + 2.4 + i * 2.4], 1, P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(D([at([LABEL.x + LABEL.w - 3, LABEL.y + LABEL.d / 2, 1])], { size: 0.5 }));
  // блюдце с крепежом
  out.push(S(k.cylinder(DISH.x, DISH.y, DISH.r, 0, 2.2, P, 32, 0.6), { tone: "lo" }));
  out.push(L(k.ring(DISH.x, DISH.y, DISH.r - 1.6, 2.2, P, 32), { tone: "faint" }));
  const bolts = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.4;
    const r = i % 3 === 0 ? 2.2 : 4.4;
    bolts.push([DISH.x + Math.cos(a) * r, DISH.y + Math.sin(a) * r]);
  }
  out.push(D(bolts.map(([x, y]) => at([x, y, 2.2])), { size: 0.6, tone: "mid" }));
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 0.95, 2.2, P, 10)).join(""), { tone: "lo" }));
  // лоток с крепежом у правого края
  out.push(S(k.slabOf(BIN, 0, 4, P, 4, 0.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(BIN, 1.4), 4, P, 4), { tone: "faint" }));
  out.push(S(k.slabOf({ x: BIN.x, y: BIN.y, w: BIN.w, d: 3, r: 1 }, 4, 3.6, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: BIN.x, y: BIN.y + 3, w: 3, d: BIN.d - 6, r: 1 }, 4, 3.6, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: BIN.x + BIN.w - 3, y: BIN.y + 3, w: 3, d: BIN.d - 6, r: 1 }, 4, 3.6, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: BIN.x, y: BIN.y + BIN.d - 3, w: BIN.w, d: 3, r: 1 }, 4, 2.6, P, 3, 0.3), { tone: "mid" }));
  const spare = [];
  for (let i = 0; i < 9; i++) {
    spare.push([BIN.x + 5 + (i % 5) * 4, BIN.y + 5.4 + Math.floor(i / 5) * 4.6]);
  }
  out.push(D(spare.map(([x, y]) => at([x, y, 4])), { size: 0.7, tone: "mid" }));
  out.push(L(spare.map(([x, y]) => k.ring(x, y, 1.05, 4, P, 10)).join(""), { tone: "lo" }));
  return out.join("");
}

// --- стол
function table() {
  const out = [];
  const legs = [
    [-90, -32],
    [90, -32],
    [-90, 22],
    [90, 22],
  ];
  for (const [x, y] of byDepth(legs)) {
    out.push(S(k.slabOf({ x: x - 9, y: y - 9, w: 18, d: 18, r: 2.4 }, 0, 2.4, P, 4), { tone: "lo" }));
    out.push(S(k.slabOf({ x: x - 5, y: y - 5, w: 10, d: 10, r: 2 }, 2.4, TOP_Z - 2.4, P, 4, 0.8), { tone: "mid" }));
    out.push(L(k.sideSeam({ x: x - 5, y: y - 5, w: 10, d: 10, r: 2 }, 7, P, 4), { tone: "faint" }));
    out.push(
      D([at([x - 2.6, y - 2.6, 2.4]), at([x + 2.6, y - 2.6, 2.4]), at([x - 2.6, y + 2.6, 2.4]), at([x + 2.6, y + 2.6, 2.4])], {
        size: 0.4,
      }),
    );
    out.push(S(k.cylinder(x, y, 6.4, TOP_Z - 5, 5, P, 20), { tone: "mid", crease: "lo" }));
    out.push(L(k.ring(x, y, 6.4, TOP_Z - 5, P, 20), { tone: "lo" }));
  }
  // продольные и поперечные связи под столешницей
  for (const y of [16, -34]) {
    out.push(S(k.slabOf({ x: -90, y, w: 180, d: 5, r: 1.2 }, 19, 8, P, 4, 0.6), { tone: "lo" }));
    out.push(L(k.sideSeam({ x: -90, y, w: 180, d: 5, r: 1.2 }, 23, P, 4), { tone: "faint" }));
    out.push(D([-82, -56, -30, -4, 22, 48, 74].map((x) => at([x, y + 2.5, 21])), { size: 0.38 }));
  }
  for (const x of [-94, 92]) {
    out.push(S(k.slabOf({ x, y: -32, w: 5, d: 54, r: 1.2 }, 19, 8, P, 4, 0.6), { tone: "lo" }));
  }
  // столешница
  out.push(S(k.slabOf(TOP, TOP_Z, TOP_H, P, 9, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(TOP, 4), SURFACE, P, 9), { tone: "faint" }));
  out.push(L(k.sideSeam(TOP, TOP_Z + 3, P, 9), { tone: "faint" }));
  const bolts = [
    [TOP.x + 6, TOP.y + 6],
    [TOP.x + TOP.w - 6, TOP.y + 6],
    [TOP.x + 6, TOP.y + TOP.d - 6],
    [TOP.x + TOP.w - 6, TOP.y + TOP.d - 6],
  ];
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 2.2, SURFACE, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, SURFACE])), { size: 0.48 }));
  out.push(
    L(
      [-56, -32, -8, 16, 40, 64]
        .map((x) => k.segment([x, TOP.y + TOP.d - 2.6, SURFACE - 1.4], [x, TOP.y + TOP.d - 2.6, SURFACE - 6.2], P))
        .join(""),
      { tone: "faint", free: true },
    ),
  );
  // задний борт с разметкой
  out.push(S(k.slabOf({ x: -94, y: -38, w: 188, d: 5, r: 1.2 }, SURFACE, 12, P, 4, 0.7), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: -94, y: -38, w: 188, d: 5, r: 1.2 }, 1.1), SURFACE + 12, P, 4), { tone: "faint" }));
  const railTicks = k.topTicks(-88, 88, 8, 4, -36.4, SURFACE + 12, [1.4, 3], P);
  out.push(L(railTicks.minor, { tone: "lo" }), L(railTicks.major, { tone: "mid" }));
  out.push(D([-88, -44, 0, 44, 88].map((x) => at([x, -35.4, SURFACE + 12])), { size: 0.4 }));
  return out.join("");
}

// --- направляющие ящиков
function tracks() {
  const out = [];
  for (const entity of entities) {
    for (const dx of [-16, 16]) {
      const x = entity.cx + dx - 2;
      out.push(S(k.slabOf({ x, y: DY - 6, w: 4, d: DD + 9, r: 1 }, SURFACE, 1.4, P, 3, 0.4), { tone: "lo" }));
      out.push(L(k.lineOnTop([x + 0.7, DY - 5], [x + 0.7, DY + DD + 2], SURFACE + 1.4, P), { tone: "faint", free: true }));
      out.push(D([at([x + 2, DY - 4.4, SURFACE + 1.4]), at([x + 2, DY + DD + 1.4, SURFACE + 1.4])], { size: 0.38 }));
    }
    out.push(S(k.slabOf({ x: entity.cx - 22, y: DY - 7, w: 44, d: 4, r: 1.2 }, SURFACE, 4.6, P, 4, 0.6), { tone: "mid" }));
    out.push(D([at([entity.cx - 15, DY - 5, SURFACE + 4.6]), at([entity.cx + 15, DY - 5, SURFACE + 4.6])], { size: 0.4 }));
  }
  return out.join("");
}

// --- штырь первичного ключа
function pin(cx) {
  const out = [];
  out.push(S(k.slabOf({ x: cx - 5, y: PIN_Y - 5, w: 10, d: 10, r: 2.2 }, WALL_Z, 1.4, P, 4, 0.5), { tone: "hi", className: "pin-base" }));
  out.push(S(k.cylinder(cx, PIN_Y, 3.4, WALL_Z + 1.4, 2, P, 24), { tone: "hi", className: "pin-base" }));
  out.push(S(k.cylinder(cx, PIN_Y, 2.4, WALL_Z + 3.4, 2.6, P, 20), { tone: "hi", className: "pin-shaft" }));
  out.push(S(k.cylinder(cx, PIN_Y, 3.1, 48, 7.6, P, 24), { tone: "hi", className: "pin-shaft" }));
  for (let z = 49.2; z < 55.4; z += 1.2) {
    out.push(L(k.ring(cx, PIN_Y, 3.1, z, P, 20), { tone: "mid" }));
  }
  out.push(L(k.ring(cx, PIN_Y, 2.4, 48, P, 20), { tone: "lo" }));
  out.push(S(k.cylinder(cx, PIN_Y, 3.2, 55.6, 1.8, P, 24), { tone: "hi", className: "pin-head" }));
  out.push(S(k.cylinder(cx, PIN_Y, 2.2, 57.4, 1.1, P, 20), { tone: "hi", className: "pin-head" }));
  out.push(L(k.ring(cx, PIN_Y, 3.2, 57.4, P, 24), { tone: "hi" }));
  out.push(D([at([cx, PIN_Y, PIN_TOP])], { size: 0.5 }));
  return out.join("");
}

// --- ящик-сущность
function drawer(entity) {
  const cx = entity.cx;
  const out = [];
  const plan = { x: cx - DW / 2, y: DY, w: DW, d: DD, r: 3 };
  out.push(S(k.slabOf(plan, BOTTOM_Z, BOTTOM_H, P, 6, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.4), BOTTOM_Z + BOTTOM_H, P, 6), { tone: "faint" }));
  out.push(D([at([cx - 17, DY + 3, BOTTOM_Z + BOTTOM_H]), at([cx + 17, DY + 3, BOTTOM_Z + BOTTOM_H])], { size: 0.38 }));
  // задняя стенка и угловые накладки
  const back = { x: cx - 22, y: DY, w: 44, d: 4, r: 1.2 };
  out.push(S(k.slabOf(back, WALL_Z, WALL_TOP - WALL_Z, P, 4, 0.7), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(back, 1.2), WALL_TOP, P, 4), { tone: "faint" }));
  for (const [bx, by] of [
    [cx - 20, DY + 5],
    [cx + 16, DY + 5],
    [cx - 20, DY + DD - 7],
    [cx + 16, DY + DD - 7],
  ]) {
    out.push(S(k.slabOf({ x: bx, y: by, w: 4, d: 3.4, r: 0.9 }, WALL_Z, 4.2, P, 3), { tone: "lo" }));
    out.push(D([at([bx + 2, by + 1.7, WALL_Z + 4.2])], { size: 0.36 }));
  }
  // штырь ключа
  out.push(pin(cx));
  // гнёзда атрибутов
  for (const slot of slotsOf(entity)) {
    const cls = slot.fk ? "pad is-fk" : slot.key ? "pad is-pk" : "pad";
    out.push(S(k.slabOf({ x: slot.x, y: PAD_Y, w: PAD_W, d: PAD_D, r: 1.6 }, WALL_Z, 1.4, P, 4, 0.5), { tone: "mid", className: cls }));
    out.push(L(k.ring(slot.cx, slot.cy, 2.0, WALL_Z + 1.4, P, 18), { tone: "mid", className: cls }));
    out.push(L(k.ring(slot.cx, slot.cy, 1.2, WALL_Z + 1.5, P, 16), { tone: "faint", className: cls }));
    out.push(D([at([slot.cx, slot.cy, WALL_Z + 1.5])], { size: 0.4 }));
  }
  // боковые стенки
  for (const x of [cx - 22, cx + 18]) {
    out.push(S(k.slabOf({ x, y: DY + 4, w: 4, d: DD - 8, r: 1.2 }, WALL_Z, WALL_TOP - WALL_Z, P, 4, 0.7), { tone: "mid" }));
    out.push(L(k.sideSeam({ x, y: DY + 4, w: 4, d: DD - 8, r: 1.2 }, WALL_Z + 2, P, 4), { tone: "faint" }));
  }
  // передняя стенка с табличкой
  out.push(S(k.slabOf({ x: cx - 22, y: FRONT_Y, w: 44, d: 4, r: 1.2 }, BOTTOM_Z, FRONT_TOP - BOTTOM_Z, P, 4, 0.9), { tone: "hi", crease: "mid" }));
  const front = FRONT_Y + 4;
  out.push(L(k.sideSeam({ x: cx - 22, y: FRONT_Y, w: 44, d: 4, r: 1.2 }, BOTTOM_Z + 1.4, P, 4), { tone: "faint" }));
  const platePlan = { x: cx - 19, y: front, w: 24, d: 1.4, r: 1 };
  out.push(S(k.slabOf(platePlan, 41.2, 5, P, 3, 0.4), { tone: "mid", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(platePlan, 0.7), 46.2, P, 3), { tone: "faint" }));
  out.push(faceText(cx - 7, front + 1.4, 42.4, entity.label, { size: 4.2, tone: "hi" }));
  out.push(D([at([cx - 21, front + 0.7, 42.4]), at([cx + 21, front + 0.7, 42.4])], { size: 0.36 }));
  // жёлоб для пальца
  out.push(S(k.slabOf({ x: cx - 17, y: front, w: 30, d: 0.8, r: 0.4 }, 39.9, 0.8, P, 3), { tone: "lo", crease: "none" }));
  // карман под карточку дубликата
  out.push(S(k.slabOf({ x: cx + 4.8, y: front - 0.15, w: 17.2, d: 1.1, r: 0.6 }, 40.4, 9.4, P, 3, 0.3), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf({ x: cx + 5.2, y: front, w: 1.4, d: 2.2, r: 0.4 }, 40, 7.4, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: cx + 20, y: front, w: 1.4, d: 2.2, r: 0.4 }, 40, 7.4, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: cx + 5.6, y: front, w: 15.4, d: 1.6, r: 0.4 }, 39.6, 0.9, P, 3, 0.3), { tone: "lo", crease: "none" }));
  // защёлка тяги у каждого гнезда
  for (const slot of slotsOf(entity)) {
    out.push(
      `<g class="latch" data-latch="${entity.index}-${slot.index}">` +
        S(k.slabOf({ x: slot.cx - 1.6, y: PAD_Y + PAD_D - 1.4, w: 3.2, d: 3.2, r: 0.8 }, WALL_Z + 1.4, 1.6, P, 3, 0.3), { tone: "mid" }) +
        L(k.lineOnTop([slot.cx - 1.2, PAD_Y + PAD_D], [slot.cx + 1.2, PAD_Y + PAD_D], WALL_Z + 3, P), { tone: "hi" }) +
        `</g>`,
    );
  }
  return out.join("");
}

// --- гибкие тяги внешних ключей
function tieSvg(link, index) {
  return (
    `<g class="tie" data-tie="${index}">` +
    `<path class="tie-out"/><path class="tie-in"/>` +
    `<g class="tie-end" data-tie-end="pad"><circle r="3" class="tie-collar"/><circle r="1.2" class="tie-bore"/></g>` +
    `<g class="tie-end" data-tie-end="pin"><circle r="3.2" class="tie-collar"/><circle r="1.3" class="tie-bore"/></g>` +
    `</g>`
  );
}

// --- рычаг нормализации
function lever() {
  const out = [];
  const P0 = LEVER;
  out.push(S(k.slabOf({ x: -146, y: -14, w: 38, d: 28, r: 3 }, 0, 9, P, 5, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: -146, y: -14, w: 38, d: 28, r: 3 }, 2.4), 9, P, 5), { tone: "faint" }));
  out.push(S(k.slabOf({ x: -143.6, y: -11.6, w: 33.2, d: 23.2, r: 2 }, 9, 3, P, 5, 0.7), { tone: "hi", crease: "mid" }));
  const bolts = k.corners({ x: -146, y: -14, w: 38, d: 28, r: 3 }, 4.4);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 1.6, 9, P, 14)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 9])), { size: 0.4 }));
  // стойка
  out.push(S(k.slabOf({ x: -134, y: -7, w: 14, d: 13, r: 2 }, 12, 36, P, 4, 0.9), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: -134, y: -7, w: 14, d: 13, r: 2 }, 16, P, 4), { tone: "faint" }));
  out.push(D([at([-131, -4, 13]), at([-123, -4, 13])], { size: 0.42 }));
  // сектор с тремя положениями
  out.push(S(k.slabOf(P0.plate, P0.plateZ0, P0.plateZ1 - P0.plateZ0, P, 4, 1), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(P0.plate, 2.6), P0.plateZ1, P, 4), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(P0.plate, 2.6), P0.plateZ0 + 2.6, P, 4), { tone: "faint" }));
  for (const [x, z] of [
    [P0.plate.x + 4, P0.plateZ1 - 4],
    [P0.plate.x + P0.plate.w - 4, P0.plateZ1 - 4],
    [P0.plate.x + 4, P0.plateZ0 + 4],
    [P0.plate.x + P0.plate.w - 4, P0.plateZ0 + 4],
  ]) {
    out.push(L(k.ring(x, P0.face + 0.2, 1.5, z, P, 14), { tone: "lo" }));
    out.push(D([at([x, P0.face + 0.2, z])], { size: 0.4 }));
  }
  // рамка сектора и три положения
  out.push(
    L(
      k.pathOf(
        [
          [P0.plate.x + 4, P0.face, P0.plateZ0 + 4],
          [P0.plate.x + P0.plate.w - 4, P0.face, P0.plateZ0 + 4],
          [P0.plate.x + P0.plate.w - 4, P0.face, P0.plateZ1 - 4],
          [P0.plate.x + 4, P0.face, P0.plateZ1 - 4],
        ].map((point) => at(point)),
        true,
      ),
      { tone: "faint" },
    ),
  );
  for (const form of FORMS) {
    const t = (form.angle * Math.PI) / 180;
    const tipX = P0.x + P0.arm * Math.sin(t);
    const tipZ = P0.z + P0.arm * Math.cos(t);
    out.push(S(k.slabOf({ x: tipX - 2.6, y: P0.face, w: 5.2, d: 4.6, r: 1 }, tipZ - 2.4, 2.4, P, 3, 0.4), { tone: "hi", crease: "mid" }));
    out.push(L(k.ring(tipX, P0.face + 2.3, 1.4, tipZ, P, 14), { tone: "lo" }));
    out.push(faceText(P0.x + 24 * Math.sin(t), P0.face, tipZ + 2.6, form.mark, { size: 4, tone: "hi" }));
  }
  // ось рычага
  out.push(S(k.cylinder(P0.x, P0.y, 5.6, 44.4, 6.6, P, 28), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(P0.x, P0.y, 5.6, 45.4, 50.2, 26, P, 0.5), { tone: "lo" }));
  out.push(L(k.ring(P0.x, P0.y, 5.6, 51, P, 28), { tone: "hi" }));
  out.push(L(k.ring(P0.x, P0.y, 2.4, 51, P, 20), { tone: "lo" }));
  out.push(D([at([P0.x, P0.y, 51])], { size: 0.55 }));
  // сам рычаг: пути пересобираются в браузере
  const knob = at([P0.x, P0.y, P0.z + P0.arm]);
  out.push(
    `<g class="arm" data-arm>` +
      `<path class="arm-light" data-arm-light/>` +
      `<path class="arm-dark" data-arm-dark/>` +
      `<path class="iso-line arm-edge" data-tone="hi" data-arm-edge/>` +
      `<g data-arm-knob>` +
      `<circle class="arm-knob" cx="${knob[0].toFixed(2)}" cy="${knob[1].toFixed(2)}" r="5.4"/>` +
      `<circle class="arm-knob-ring" cx="${knob[0].toFixed(2)}" cy="${knob[1].toFixed(2)}" r="3.5"/>` +
      `<circle class="arm-knob-dot" cx="${knob[0].toFixed(2)}" cy="${knob[1].toFixed(2)}" r="1.1"/>` +
      `</g>` +
      `</g>`,
  );
  return out.join("");
}

// --- лоток дубликатов
function trayDup() {
  const out = [];
  const plan = TRAY_D;
  out.push(S(k.slabOf(plan, 0, 6, P, 5, 0.9), { tone: "lo" }));
  const walls = [
    { x: plan.x, y: plan.y, w: plan.w, d: 4, r: 1.2, h: 6 },
    { x: plan.x, y: plan.y + 4, w: 3.6, d: plan.d - 8, r: 1.2, h: 4.6 },
    { x: plan.x + plan.w - 3.6, y: plan.y + 4, w: 3.6, d: plan.d - 8, r: 1.2, h: 4.6 },
  ];
  for (const wall of walls) {
    out.push(S(k.slabOf(wall, 6, wall.h, P, 4, 0.6), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(wall, 1), 6 + wall.h, P, 4), { tone: "faint" }));
  }
  for (const x of [-127.4, -113.4]) {
    out.push(S(k.slabOf({ x, y: plan.y + 5, w: 1.2, d: plan.d - 10, r: 0.4 }, 6, 4.2, P, 3, 0.3), { tone: "mid" }));
  }
  out.push(L(k.planOutline(k.insetPlan(plan, 3), 6, P, 5), { tone: "faint" }));
  const bolts = k.corners(plan, 5);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 1.5, 6, P, 14)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 6])), { size: 0.4 }));
  return out.join("");
}

function trayDupFront() {
  const out = [];
  out.push(S(k.slabOf({ x: TRAY_D.x, y: TRAY_D.y + TRAY_D.d - 4, w: TRAY_D.w, d: 4, r: 1.2 }, 6, 4, P, 4, 0.6), { tone: "mid" }));
  out.push(faceText(TRAY_D.x + 6, TRAY_D.y + TRAY_D.d, 6.6, "на выброс", { size: 2.8, tone: "lo", anchor: "start" }));
  out.push(L(k.lineOnTop([TRAY_D.x + TRAY_D.w - 20, TRAY_D.y + TRAY_D.d, 6.5], [TRAY_D.x + TRAY_D.w - 6, TRAY_D.y + TRAY_D.d, 6.5], 6.5, P), { tone: "red", className: "dup-stripe" }));
  return out.join("");
}

// --- лоток физической схемы
function trayPhysBody() {
  const out = [];
  const plan = TRAY_P;
  out.push(S(k.slabOf(plan, 0, 6, P, 5, 0.9), { tone: "lo" }));
  // задняя стойка-магазин
  out.push(S(k.slabOf({ x: plan.x, y: plan.y, w: plan.w, d: 4, r: 1 }, 6, RACK_TOP - 6, P, 4, 0.7), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: plan.x, y: plan.y, w: plan.w, d: 4, r: 1 }, 22, P, 4), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan({ x: plan.x, y: plan.y, w: plan.w, d: 4, r: 1 }, 1.2), RACK_TOP, P, 4), { tone: "faint" }));
  const rBolts = [[plan.x + 5, plan.y + 2], [plan.x + plan.w - 5, plan.y + 2], [plan.x + 5, plan.y + 2], [plan.x + plan.w - 5, plan.y + 2]];
  out.push(D([at([plan.x + 4, plan.y + 2, RACK_TOP - 5]), at([plan.x + plan.w - 4, plan.y + 2, RACK_TOP - 5])], { size: 0.42 }));
  for (const x of [plan.x, plan.x + plan.w - 3.6]) {
    out.push(S(k.slabOf({ x, y: plan.y + 4, w: 3.6, d: plan.d - 8, r: 1.2 }, 6, 7, P, 4, 0.6), { tone: "mid" }));
  }
  // рёбра-направляющие для табличек
  for (const x of [104, 113.5, 123, 132.5, 142]) {
    out.push(S(k.slabOf({ x, y: plan.y + 4, w: 2, d: 4, r: 0.6 }, 6, RACK_TOP - 6, P, 3, 0.3), { tone: "mid" }));
    out.push(L(k.sideSeam({ x, y: plan.y + 4, w: 2, d: 4, r: 0.6 }, 10, P, 3), { tone: "faint" }));
  }
  // перегородки в лотке
  out.push(L(k.planOutline(k.insetPlan(plan, 3), 6, P, 5), { tone: "faint" }));
  out.push(D([at([plan.x + 5, plan.y + 5, 6]), at([plan.x + plan.w - 5, plan.y + 5, 6])], { size: 0.4 }));
  return out.join("");
}

function trayPhysFront() {
  const out = [];
  out.push(S(k.slabOf({ x: TRAY_P.x, y: TRAY_P.y + TRAY_P.d - 4, w: TRAY_P.w, d: 4, r: 1.2 }, 6, 7, P, 4, 0.6), { tone: "mid" }));
  out.push(faceText(TRAY_P.x + 6, TRAY_P.y + TRAY_P.d, 6.6, "схема", { size: 2.8, tone: "lo", anchor: "start" }));
  out.push(
    L(
      k.lineOnTop([TRAY_P.x + TRAY_P.w - 18, TRAY_P.y + TRAY_P.d, 6.5], [TRAY_P.x + TRAY_P.w - 5, TRAY_P.y + TRAY_P.d, 6.5], 6.5, P),
      { tone: "green", className: "schema-stripe" },
    ),
  );
  return out.join("");
}

// --- вертикальная карточка или табличка, всегда лицом к зрителю
function panel({ x, y, z, w, h, t = CARD_T }, { className = "", tone = "hi", lines = 3 } = {}) {
  const p = (dx, dy, dz) => at([x + dx, y - dy, z + dz]);
  const front = [p(0, 0, 0), p(w, 0, 0), p(w, 0, h), p(0, 0, h)];
  const side = [p(w, t, 0), p(w, 0, 0), p(w, 0, h), p(w, t, h)];
  const top = [p(0, t, h), p(w, t, h), p(w, 0, h), p(0, 0, h)];
  const d = (points) => k.pathOf(points, true);
  const rules = [];
  for (let i = 1; i <= lines; i++) {
    const zz = z + (h * i) / (lines + 1);
    rules.push(k.segment([x + 1.4, y, zz], [x + w - 1.4, y, zz], P));
  }
  return (
    `<g class="panel ${className}">` +
    `<path class="panel-side" d="${d(side)}"/>` +
    `<path class="panel-top" d="${d(top)}"/>` +
    `<path class="panel-face" d="${d(front)}"/>` +
    L(rules.join(""), { tone: "faint", free: true }) +
    L(d(front), { tone, className: "panel-edge" }) +
    L(d(side), { tone: "faint", className: "panel-edge" }) +
    L(d(top), { tone: "faint", className: "panel-edge" }) +
    `<circle class="panel-pin" cx="${p(1.8, 0, 1.8)[0].toFixed(1)}" cy="${p(1.8, 0, 1.8)[1].toFixed(1)}" r="0.55"/>` +
    `</g>`
  );
}

function cardSvg(index) {
  const dup = DUPLICATES[index];
  const entity = byKey(dup.drawer);
  const x = entity.cx + 6.8;
  return (
    `<g class="dup-card" data-card="${index}">` +
    panel({ x, y: FRONT_Y + 4 + 1.4, z: CARD_REST_Z, w: CARD_W, h: CARD_H }, { className: "is-dup", tone: "hi" }) +
    `</g>`
  );
}

function tabletSvg(index) {
  return (
    `<g class="schema-tablet" data-tablet="${index}">` +
    panel({ x: TAB_X[index], y: TAB_Y, z: TAB_REST_Z, w: TAB_W, h: TAB_H }, { className: "is-schema", tone: "hi", lines: 4 }) +
    `</g>`
  );
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A workbench on a heavy plate. Four shallow wooden drawers sit on a rail-topped table, each with a name plate on its front and a brass primary-key post inside: student, course, enrollment and grade. Flexible tie rods run from foreign-key sockets in the enrollment and grade drawers to the key posts of student, course and enrollment. A normalization lever with three marked notches stands on the left, a reject tray with three duplicate cards sits at the front left, and a plate rack on the right holds four schema plates that drop into the physical-schema tray.",
  body: [
    plate(),
    table(),
    tracks(),
    lever(),
    trayPhysBody(),
    TAB_X.map((_, i) => tabletSvg(i)).join(""),
    `<g class="retainer" data-retainer>${S(
      k.slabOf({ x: TRAY_P.x + 4, y: TRAY_P.y + 8, w: TRAY_P.w - 8, d: 1.6, r: 0.6 }, 25, 1.8, P, 3, 0.3),
      { tone: "hi" },
    )}</g>`,
    trayPhysFront(),
    entities
      .map(
        (entity) =>
          `<g class="drawer" data-drawer="${entity.index}" transform="${k.translateAlong(P, [0, 0, 0])}">${drawer(entity)}</g>`,
      )
      .join(""),
    LINKS.map((link, index) => tieSvg(link, index)).join(""),
    trayDup(),
    DUPLICATES.map((_, index) => cardSvg(index)).join(""),
    trayDupFront(),
  ],
});

// --- данные для браузера
const EXT = [
  [2, 2, 2, 2],
  [6, 6, 6, 6],
  [2, 2, 14, 2],
  [9, 9, 12, 2],
  [11, 2, 2, 2],
  [2, 2, 11, 2],
  [2, 10, 2, 2],
  [2, 2, 2, 2],
];
const LEVER_ANGLE = FORMS.map((form) => form.angle);
const STEP_ANGLE = [0, 0, 0, 0, LEVER_ANGLE[0], LEVER_ANGLE[1], LEVER_ANGLE[2], LEVER_ANGLE[2]];
const TIE_DATA = LINKS.map((link) => {
  const fromPad = padOf(link.from, link.pad);
  const toPin = byKey(link.to);
  return {
    a: [fromPad.cx, fromPad.cy, WALL_Z + 1.6],
    b: [toPin.cx, PIN_Y, PIN_TOP],
    from: byKey(link.from).index,
    to: toPin.index,
    label: link.label,
  };
});
const CARD_DATA = DUPLICATES.map((dup, index) => {
  const entity = byKey(dup.drawer);
  return {
    x: entity.cx + 6.8,
    y: FRONT_Y + 5.4,
    z: CARD_REST_Z,
    drawer: entity.index,
    step: dup.step,
    slot: [SLOT_X[index], SLOT_Y, 6.2],
  };
});

const live = `
const P = ${JSON.stringify(P)};
const EXT = ${JSON.stringify(EXT)};
const STEP_ANGLE = ${JSON.stringify(STEP_ANGLE)};
const TIE_DATA = ${JSON.stringify(TIE_DATA)};
const CARD_DATA = ${JSON.stringify(CARD_DATA)};
const TAB_X = ${JSON.stringify(TAB_X)};
const TAB_REST_Z = ${JSON.stringify(TAB_REST_Z)};
const TAB_DROP = ${JSON.stringify(TAB_DROP)};
const LEVER_PIVOT = ${JSON.stringify([LEVER.x, LEVER.y, LEVER.z])};
const LEVER_ARM = ${JSON.stringify(LEVER.arm)};
const STEP_LABELS = ${JSON.stringify(STEPS.map((step) => step.label))};
const STEP_SHORTS = ${JSON.stringify(STEPS.map((step) => step.short))};
const STEP_READOUTS = ${JSON.stringify(STEPS.map((step) => step.readout))};
const N = STEP_LABELS.length;

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const drawers = Array.from(svg.querySelectorAll("[data-drawer]"));
const ties = Array.from(svg.querySelectorAll("[data-tie]"));
const cards = Array.from(svg.querySelectorAll("[data-card]"));
const tablets = Array.from(svg.querySelectorAll("[data-tablet]"));
const retainer = svg.querySelector("[data-retainer]");
const armLight = svg.querySelector("[data-arm-light]");
const armDark = svg.querySelector("[data-arm-dark]");
const armEdge = svg.querySelector("[data-arm-edge]");
const armKnob = svg.querySelector("[data-arm-knob]");
const latches = Array.from(svg.querySelectorAll("[data-latch]"));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const near = (a, b) => Math.abs(a - b) < 0.03;
const ease = (cur, target, tau, dt) => {
  const next = cur + (target - cur) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 0.006 ? target : next;
};
const toPath = (points) => points.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2)).join("");

const armRest = iso([LEVER_PIVOT[0], LEVER_PIVOT[1], LEVER_PIVOT[2] + LEVER_ARM], P);
let step = 0;
let ext = EXT[0].slice(), extT = EXT[0].slice();
let angle = STEP_ANGLE[0], angleT = STEP_ANGLE[0];
let plug = 0, plugT = 0;
let bar = 0, barT = 0;
let cardPos = CARD_DATA.map((c) => [c.x, c.y, c.z]);
let cardTargets = CARD_DATA.map((c) => [c.x, c.y, c.z]);
let tabV = TAB_X.map(() => 0), tabVT = TAB_X.map(() => 0);
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
const tourAt = (t) => Math.floor(t / 4.6) % N;

function plan(to) {
  step = to;
  extT = EXT[to].slice();
  angleT = STEP_ANGLE[to];
  plugT = to >= 2 ? 1 : 0;
  barT = to === 7 ? 1 : 0;
  for (let i = 0; i < CARD_DATA.length; i++) {
    const c = CARD_DATA[i];
    if (to < c.step) {
      cardTargets[i] = [c.x, c.y + extT[c.drawer], c.z];
    } else {
      cardTargets[i] = [c.slot[0], c.slot[1], c.slot[2]];
    }
  }
  for (let i = 0; i < tabVT.length; i++) tabVT[i] = to === 7 ? 1 : 0;
  for (let i = 0; i < cards.length; i++) cards[i].classList.toggle("is-marked", to === 3);
  svg.classList.toggle("is-links", to === 2);
}

function tieD(a, b, liftA, liftB) {
  const pa = iso(a, P), pb = iso(b, P);
  const c1 = iso([a[0], a[1], a[2] + liftA], P);
  const c2 = iso([b[0], b[1], b[2] + liftB], P);
  return {
    d:
      "M" + pa[0].toFixed(2) + " " + pa[1].toFixed(2) +
      "C" + c1[0].toFixed(2) + " " + c1[1].toFixed(2) + " " + c2[0].toFixed(2) + " " + c2[1].toFixed(2) +
      " " + pb[0].toFixed(2) + " " + pb[1].toFixed(2),
    a: pa,
    b: pb,
  };
}

function drawArm(deg) {
  const t = (deg * Math.PI) / 180;
  const a = iso(LEVER_PIVOT, P);
  const b = iso([LEVER_PIVOT[0] + LEVER_ARM * Math.sin(t), LEVER_PIVOT[1], LEVER_PIVOT[2] + LEVER_ARM * Math.cos(t)], P);
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const w0 = 5, w1 = 3.2;
  const A0 = [a[0] + nx * w0, a[1] + ny * w0], A1 = [b[0] + nx * w1, b[1] + ny * w1];
  const B0 = [a[0] - nx * w0, a[1] - ny * w0], B1 = [b[0] - nx * w1, b[1] - ny * w1];
  armLight.setAttribute("d", toPath([A0, A1, b, a]) + "Z");
  armDark.setAttribute("d", toPath([a, b, B1, B0]) + "Z");
  armEdge.setAttribute("d", toPath([A0, A1, B1, B0]) + "Z");
  armKnob.setAttribute("transform", "translate(" + (b[0] - armRest[0]).toFixed(2) + " " + (b[1] - armRest[1]).toFixed(2) + ")");
}

function settled() {
  return (
    ext.every((v, i) => near(v, extT[i])) &&
    near(angle, angleT) &&
    near(plug, plugT) &&
    near(bar, barT) &&
    cardPos.every((p, i) => near(p[0], cardTargets[i][0]) && near(p[1], cardTargets[i][1]) && near(p[2], cardTargets[i][2])) &&
    tabV.every((v, i) => near(v, tabVT[i]))
  );
}

function draw() {
  for (let i = 0; i < drawers.length; i++) {
    drawers[i].setAttribute("transform", translateAlong(P, [0, ext[i], 0]));
    drawers[i].classList.toggle("is-key", step === 1 || step === 2);
  }
  for (let i = 0; i < ties.length; i++) {
    const data = TIE_DATA[i];
    const a = [data.a[0], data.a[1] + ext[data.from], data.a[2] + (1 - plug) * 4.6];
    const b = [data.b[0], data.b[1] + ext[data.to], data.b[2]];
    const geo = tieD(a, b, 16, 10);
    const g = ties[i];
    g.querySelector(".tie-out").setAttribute("d", geo.d);
    g.querySelector(".tie-in").setAttribute("d", geo.d);
    const ends = g.querySelectorAll("[data-tie-end]");
    ends[0].setAttribute("transform", "translate(" + geo.a[0].toFixed(2) + " " + geo.a[1].toFixed(2) + ")");
    ends[1].setAttribute("transform", "translate(" + geo.b[0].toFixed(2) + " " + geo.b[1].toFixed(2) + ")");
    g.classList.toggle("is-latched", plug > 0.6);
    g.classList.toggle("is-lit", step === 2);
  }
  for (let i = 0; i < latches.length; i++) {
    latches[i].setAttribute("transform", translateAlong(P, [0, 0, -1.5 * (plug > 0.6 ? 1 : 0)]));
  }
  for (let i = 0; i < cards.length; i++) {
    const c = CARD_DATA[i];
    cards[i].setAttribute(
      "transform",
      translateAlong(P, [cardPos[i][0] - c.x, cardPos[i][1] - c.y, cardPos[i][2] - c.z]),
    );
  }
  for (let i = 0; i < tablets.length; i++) {
    tablets[i].setAttribute("transform", translateAlong(P, [0, 0, -TAB_DROP * tabV[i]]));
  }
  retainer.setAttribute("transform", translateAlong(P, [0, 3.4 * bar, 0]));
  drawArm(angle);
  const text = settled() ? STEP_READOUTS[step] : "сборка · " + STEP_SHORTS[step];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(step));
  stage.setAttribute("aria-valuetext", "шаг " + (step + 1) + " из " + N + ": " + STEP_LABELS[step] + ", " + STEP_READOUTS[step]);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const want = tourAt(clock);
    if (want !== step) plan(want);
  }
  for (let i = 0; i < ext.length; i++) ext[i] = calm ? extT[i] : ease(ext[i], extT[i], 0.26, dt);
  angle = calm ? angleT : ease(angle, angleT, 0.22, dt);
  plug = calm ? plugT : ease(plug, plugT, 0.16, dt);
  bar = calm ? barT : ease(bar, barT, 0.2, dt);
  for (let i = 0; i < cards.length; i++) {
    for (let axis = 0; axis < 3; axis++) {
      cardPos[i][axis] = calm ? cardTargets[i][axis] : ease(cardPos[i][axis], cardTargets[i][axis], 0.3, dt);
    }
  }
  for (let i = 0; i < tabV.length; i++) tabV[i] = calm ? tabVT[i] : ease(tabV[i], tabVT[i], 0.32 + i * 0.06, dt);
  draw();
  frame = visible && (touring || !settled()) ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
const steer = (to) => {
  touring = false;
  plan(clamp(to, 0, N - 1));
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    touring = !still.matches;
    clock = 0;
    run();
  }, 4400);
  run();
};
new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);
if (still.matches) touring = false;
let pointerStart = null;
stage.addEventListener("pointerdown", (event) => {
  pointerStart = [event.clientX, event.clientY];
});
stage.addEventListener("pointerup", (event) => {
  if (!pointerStart) return;
  const dx = event.clientX - pointerStart[0];
  const dy = event.clientY - pointerStart[1];
  pointerStart = null;
  if (Math.abs(dx) < 28 || Math.abs(dx) < Math.abs(dy)) return;
  steer(dx < 0 ? Math.min(N - 1, step + 1) : Math.max(0, step - 1));
});
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") return;
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.12) / 0.76, 0, 1);
  steer(Math.min(N - 1, Math.floor(share * N)));
});
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(N - 1, step + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, step - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = N - 1;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
plan(0);
draw();
`;

const css = `<style>
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
body.iso{
  --brass:#d9b06a;--brass-face:#3a3020;--brass-deep:#1a1409;
}
body[data-theme="light"].iso{
  --brass:#8a6212;--brass-face:#f6ead2;--brass-deep:#e6d4b4;
  --anatomy-mid:#6f6f75;--anatomy-lo:#a2a2a7;--anatomy-faint:#c6c6ca;
}
.is-key .pin-shaft .iso-edge,.is-key .pin-head .iso-edge,.is-key .pin-base .iso-edge{stroke:var(--anatomy-lit)}
.is-key .pin-shaft .iso-top,.is-key .pin-head .iso-top,.is-key .pin-base .iso-top{fill:var(--brass-face)}
.pin-base .iso-edge,.pin-head .iso-edge,.pin-shaft .iso-edge{stroke:var(--brass)}
.pin-base .iso-top,.pin-head .iso-top,.pin-shaft .iso-top{fill:var(--brass-face)}
.pin-base .iso-shade,.pin-head .iso-shade,.pin-shaft .iso-shade{fill:var(--brass-deep)}
.pad.is-fk .iso-edge,.pad.is-fk .iso-line{stroke:var(--anatomy-blue)}
.pad.is-pk .iso-edge,.pad.is-pk .iso-line{stroke:var(--brass)}
.tie-out{fill:none;stroke:var(--anatomy-lo);stroke-width:3;stroke-linecap:round}
.tie-in{fill:none;stroke:var(--anatomy-paper);stroke-width:.9;stroke-linecap:round;opacity:.7}
.tie.is-latched .tie-out{stroke:var(--anatomy-mid);stroke-width:2.8}
.tie.is-lit .tie-out{stroke:var(--anatomy-lit);stroke-width:3.2}
.tie-collar{fill:var(--anatomy-card);stroke:var(--brass);stroke-width:1}
.tie-bore{fill:var(--brass);opacity:.55}
.tie.is-latched .tie-collar{stroke:var(--anatomy-hi)}
.panel-face{fill:var(--anatomy-face);stroke:none}
.panel-side{fill:var(--anatomy-shade-1);stroke:none}
.panel-top{fill:var(--anatomy-shade-3);stroke:none}
.panel-edge{fill:none}
.panel-pin{fill:var(--anatomy-mid);stroke:none;opacity:.5}
.is-dup .panel-edge{stroke:var(--anatomy-red)}
.is-dup .panel-pin{fill:var(--anatomy-red)}
.is-marked .panel-edge{stroke-width:1.1}
.is-marked .panel-face{fill:var(--anatomy-shade-3)}
.is-schema .panel-edge{stroke:var(--anatomy-green)}
.is-schema .panel-pin{fill:var(--anatomy-green)}
.arm-light{fill:var(--anatomy-face);stroke:none}
.arm-dark{fill:var(--anatomy-shade-0);stroke:none}
.arm-edge{fill:none}
.arm-knob{fill:var(--anatomy-face);stroke:var(--anatomy-hi);stroke-width:.8}
.arm-knob-ring{fill:none;stroke:var(--anatomy-mid);stroke-width:.8}
.arm-knob-dot{fill:var(--anatomy-hi)}
.dup-stripe{stroke:var(--anatomy-red)}
.iso-plate-corner[data-corner="readout"]{bottom:16px}
@media (max-width:560px){
  .iso-plate{padding-bottom:92px}
  .iso-plate-corner[data-corner="readout"]{font-size:9px;bottom:50px}
  .iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px;right:0;white-space:normal;line-height:1.35}
  .iso-keys{gap:4px 12px;font-size:12px}
}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 1",
    title: TITLE,
    hint: HINT,
    readout: STEPS[0].readout,
    keys: KEYS,
    caption: CAPTION,
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: стрелки ведут сборку от сущностей к физической схеме" aria-valuemin="0" aria-valuemax="${STEPS.length - 1}" aria-valuenow="0">${svg}</div>`,
  });

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}
