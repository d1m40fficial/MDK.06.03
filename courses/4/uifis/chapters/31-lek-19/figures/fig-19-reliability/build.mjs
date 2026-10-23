import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, STEPS, STATES, JOURNAL } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 640;
const HEIGHT = 452;
const DEG = Math.PI / 180;

// Дублированный насосный агрегат на раме: два вертикальных насоса A и B,
// общий коллектор, перекидной клапан с рычагом и пружиной, бак, расходомер,
// манометр, пульт с журналом, счётчиком часов и лампами, ящик копии на полу.

const PLATE = { x: -150, y: -76, w: 268, d: 152, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;

const PUMP_A = { x: -86, y: -38 };
const PUMP_B = { x: -12, y: -38 };
const PED = 40;

const TANK = { cx: -131, cy: -40, r: 18, h: 28 };

const SUCT_Y = -70;
const DIS_Y = 16;
const VALVE = { x0: -61, x1: -37, y: DIS_Y, z: 12, r: 10 };
const VALVE_C = { x: -49, y: DIS_Y };
const LEVER_Z = 34.2;
const OUT_Y = 38;
const OUT_END = 118;

const GAUGE_FLOW = { x: 8, z: 35, r: 9, key: "flow", max: 160, len: 6.9 };
const GAUGE_PRESS = { x: 54, z: 36, r: 10, key: "pressure", max: 10, len: 7.7 };
const DIAL_FROM = -130;
const DIAL_TO = 130;

const CONSOLE = { x: 56, y: -52, w: 48, d: 20 };
const CONSOLE_H = 44;
const PAPER = { x: CONSOLE.x + 2, y: CONSOLE.y + CONSOLE.d, w: 40, z0: 12, z1: 38 };
const PAPER_FACE = PAPER.y + 1.5;
const LOG_BOT = 16.5;
const LOG_SP = 4.8;
const LOG_SLOTS = 3;

const BOX = { x: 138, y: 28, w: 60, d: 56, r: 3 };
const BOX_Z = -20;
const BOX_H = 14;

const KIT = { x: -134, y: -2, w: 22, d: 14 };
const RULE = { x: -140, y: 56, w: 92, d: 5.5, r: 1 };
const LABEL = { x: -140, y: 40, w: 38, d: 10, r: 1.4 };

const pts = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  ...k.boxCorners(BOX, BOX_Z, BOX_Z + BOX_H + 8),
  [PUMP_A.x, PUMP_A.y, 59],
  [PUMP_B.x, PUMP_B.y, 59],
  [CONSOLE.x + CONSOLE.w, CONSOLE.y + CONSOLE.d, CONSOLE_H + 9],
  [GAUGE_PRESS.x, OUT_Y, GAUGE_PRESS.z + GAUGE_PRESS.r + 2],
  [TANK.cx, TANK.cy, TANK.h + 9],
];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 14, azimuth: 38, elevation: 29 });

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (dots, style) => k.dotsSvg(dots, style);
const byDepth = (list) => [...list].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

const Fv = (cx, cy) => G.frameAlong([cx, cy, 0], [0, 0, 1]);
const Fx = (y, z) => G.frameAlong([0, y, z], [1, 0, 0]);
const Fy = (x, z) => G.frameAlong([x, 0, z], [0, 1, 0]);

const tubeX = (x0, x1, y, z, r, style, options) => S(G.disc(x0, x1, r, Fx(y, z), P, { steps: 28, ...options }), style);
const tubeY = (y0, y1, x, z, r, style, options) => S(G.disc(y0, y1, r, Fy(x, z), P, { steps: 28, ...options }), style);
const tubeZ = (z0, z1, cx, cy, r, style, options) => S(G.disc(z0, z1, r, Fv(cx, cy), P, { steps: 32, ...options }), style);
const turnZ = (profile, cx, cy, style, options) =>
  S(G.solidOf(profile, Fv(cx, cy), P, { smooth: true, steps: 44, ...options }), style);

// Гравированная литера A или B линиями: читается на верхней грани.
function engravedLetter(letter, x, y, z, size = 2.2) {
  const s = size;
  const lines = [];
  if (letter === "A") {
    lines.push([[x - s * 0.78, y + s], [x, y - s]]);
    lines.push([[x, y - s], [x + s * 0.78, y + s]]);
    lines.push([[x - s * 0.42, y + s * 0.2], [x + s * 0.42, y + s * 0.2]]);
  } else {
    lines.push([[x - s * 0.5, y + s], [x - s * 0.5, y - s]]);
    lines.push([[x - s * 0.5, y - s], [x + s * 0.1, y - s], [x + s * 0.55, y - s * 0.55], [x + s * 0.15, y - s * 0.05], [x - s * 0.5, y - s * 0.05]]);
    lines.push([[x - s * 0.5, y - s * 0.05], [x + s * 0.15, y - s * 0.05], [x + s * 0.65, y + s * 0.5], [x + s * 0.15, y + s], [x - s * 0.5, y + s]]);
  }
  return L(lines.map((points) => k.onTop(points, z, P)).join(""), { tone: "mid" });
}

// ===== Плита =====
function plateSkid() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 19))) {
    out.push(S(k.cylinder(x, y, 7.6, -PLATE_H - FOOT_H, 2, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.6, -PLATE_H - FOOT_H + 2, FOOT_H - 2, P, 28), { tone: "mid" }));
    out.push(L(k.ring(x, y, 5.6, -PLATE_H + 2, P, 26), { tone: "lo" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 9, 1.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P, 9), { tone: "faint" }));
  out.push(L(k.sideSeam(k.insetPlan(PLATE, 3), -3.4, P, 9), { tone: "faint" }));
  const screws = k.corners(PLATE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.3, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.52 }));

  out.push(S(k.slabOf(RULE, 0, 0.7, P, 3), { tone: "mid", crease: "none" }));
  const ticks = k.topTicks(RULE.x + 4, RULE.x + RULE.w - 4, 4, 5, RULE.y + 0.6, 0.7, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(S(k.slabOf(LABEL, 0, 0.9, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.9, P, 3), { tone: "lo" }));
  out.push(
    L(
      [22, 15, 8]
        .map((len, i) => k.lineOnTop([LABEL.x + 3.2, LABEL.y + 2.8 + i * 2.6], [LABEL.x + 3.2 + len, LABEL.y + 2.8 + i * 2.6], 0.9, P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(D([at([LABEL.x + LABEL.w - 3, LABEL.y + LABEL.d / 2, 0.9])], { size: 0.48 }));
  for (const y of [-50, 50]) {
    out.push(S(k.slabOf({ x: PLATE.x + 4, y: y - 4, w: 9, d: 8, r: 1.6 }, 0, 2.2, P, 3), { tone: "mid" }));
    out.push(L(k.ring(PLATE.x + 8.5, y, 3.4, 2.2, P, 18), { tone: "lo" }));
    out.push(D([at([PLATE.x + 8.5, y, 2.2])], { size: 0.4 }));
  }
  return out.join("");
}

// ===== Бак =====
function tankUnit() {
  const out = [];
  const { cx, cy, r, h } = TANK;
  out.push(tubeZ(0, 2.2, cx, cy, r + 1.6, { tone: "lo" }));
  out.push(S(G.ringBand(2.2, 3.2, r, r + 1.6, Fv(cx, cy), P, { steps: 40 }), { tone: "mid" }));
  out.push(turnZ([[3, r, 1], [4, r, 1], [h - 1.8, r, 1], [h, r - 1.6, 1]], cx, cy, { tone: "mid" }, { bevel: 0.4 }));
  out.push(L(k.ring(cx, cy, r, 13, P, 40), { tone: "faint" }));
  out.push(S(G.ringBand(h - 3, h - 1.2, r, r + 1.3, Fv(cx, cy), P, { steps: 40 }), { tone: "mid" }));
  out.push(L(k.ring(cx, cy, r + 1.3, h - 3, P, 40), { tone: "lo" }));
  out.push(turnZ([[h, r - 1.4, 1], [h + 1.4, r - 3.4, 1], [h + 2.6, r - 7, 1], [h + 3.2, 0, 1]], cx, cy, { tone: "mid" }, { steps: 40 }));
  // Заливная горловина.
  out.push(tubeZ(h + 2.4, h + 4, cx + 6, cy - 4, 3.4, { tone: "mid" }));
  out.push(tubeZ(h + 4, h + 5.2, cx + 6, cy - 4, 2.6, { tone: "hi" }));
  out.push(L(k.knurl(cx + 6, cy - 4, 2.6, h + 4, h + 5.2, 14, P, 0.3), { tone: "lo" }));
  out.push(D([at([cx + 6, cy - 4, h + 5.4])], { size: 0.42, tone: "hi" }));
  // Смотровое стекло на передней стенке и метки уровня.
  const fy = cy + r;
  out.push(S(k.slabOf({ x: cx - 5, y: fy - 0.6, w: 10, d: 1.8, r: 0.8 }, 5, h - 7, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: cx - 3.6, y: fy + 1, w: 7.2, d: 0.5, r: 0.4 }, 6, h - 9, P, 3), { tone: "hi", crease: "none" }));
  out.push(
    L(
      [8, 11, 14, 17, 20].map((z) => k.segment([cx + 6.4, fy, z], [cx + 8.2, fy, z], P)).join(""),
      { tone: "lo", free: true },
    ),
  );
  // Патрубок к всасывающему коллектору и сливной кран.
  out.push(tubeY(SUCT_Y, cy - r + 1, cx, 12, 3.2, { tone: "mid" }));
  out.push(tubeY(cy - r - 1.2, cy - r + 1, cx, 12, 4.4, { tone: "mid" }));
  out.push(S(G.sphereOf([cx, SUCT_Y, 12], 4.4, P), { tone: "mid" }));
  out.push(tubeX(cx + 6, cx + 15, fy - 3, 3.4, 2.2, { tone: "mid" }));
  out.push(tubeZ(2.6, 5.6, cx + 15, fy - 3, 3, { tone: "mid" }));
  out.push(L(k.ring(cx + 15, fy - 3, 3, 5.6, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf({ x: cx + 14, y: fy - 6, w: 4.4, d: 2, r: 0.8 }, 3, 3.4, P, 3), { tone: "mid" }));
  // Болты опорного кольца и табличка.
  out.push(
    D(
      [20, 110, 200, 290].map((a) => at([cx + Math.cos(a * DEG) * (r + 0.6), cy + Math.sin(a * DEG) * (r + 0.6), 2.4])),
      { size: 0.4, tone: "lo" },
    ),
  );
  out.push(S(k.slabOf({ x: cx - 9, y: fy + 1, w: 15, d: 0.6, r: 0.4 }, 20, 6, P, 3), { tone: "lo", crease: "none" }));
  out.push(
    L(
      [10, 6].map((len, i) => k.segment([cx - 7, fy + 1.7, 23.4 - i * 2.2], [cx - 7 + len, fy + 1.7, 23.4 - i * 2.2], P)).join(""),
      { tone: "lo", free: true },
    ),
  );
  return out.join("");
}

// ===== Насос =====
function pumpUnit(cx, cy, letter) {
  const out = [];
  const volute = [
    [7.2, 9.4, 1],
    [8.2, 13.4, 1],
    [10.6, 15.6, 1],
    [13.2, 15.2, 1],
    [15.0, 12.4, 1],
    [15.8, 8.6, 1],
  ];
  const base = { x: cx - PED / 2, y: cy - PED / 2, w: PED, d: PED, r: 3.4 };
  out.push(S(k.slabOf(k.insetPlan(base, -2), 0, 2, P, 4, 0.7), { tone: "lo" }));
  out.push(S(k.slabOf(base, 2, 1.4, P, 4, 0.8), { tone: "mid" }));
  for (const [x, y] of k.corners(base, 6)) {
    out.push(tubeZ(3.4, 5.4, x, y, 1.5, { tone: "mid" }));
    out.push(L(k.ring(x, y, 1.5, 5.4, P, 14), { tone: "lo" }));
  }
  out.push(tubeZ(4, 7.4, cx, cy, 11.6, { tone: "mid" }));
  out.push(L(k.ring(cx, cy, 11.6, 7.4, P, 36), { tone: "lo" }));
  out.push(turnZ(volute, cx, cy, { tone: "hi" }, { bevel: 0.5 }));
  out.push(tubeZ(15.4, 18, cx, cy, 7.6, { tone: "mid" }));
  out.push(L(k.ring(cx, cy, 7.6, 18, P, 30), { tone: "lo" }));
  out.push(tubeZ(18, 32, cx, cy, 6.4, { tone: "hi" }));
  for (const z of [22.4, 27.6]) {
    out.push(tubeZ(z, z + 2.2, cx, cy, 7.3, { tone: "mid" }));
    out.push(L(k.ring(cx, cy, 7.3, z, P, 28) + k.ring(cx, cy, 7.3, z + 2.2, P, 28), { tone: "lo" }));
    out.push(D([at([cx + 5.4, cy + 3.4, z + 1.1])], { size: 0.36, tone: "lo" }));
  }
  out.push(tubeZ(32, 35.4, cx, cy, 8.4, { tone: "mid" }));
  out.push(L(k.ring(cx, cy, 8.4, 35.4, P, 32), { tone: "lo" }));
  out.push(S(k.slabOf({ x: cx + 6.4, y: cy + 4.4, w: 5, d: 3.6, r: 1 }, 33, 2.2, P, 3), { tone: "mid" }));
  out.push(tubeZ(35.4, 37.4, cx, cy, 7.2, { tone: "hi" }));
  out.push(tubeZ(37.4, 39.2, cx, cy, 10.4, { tone: "mid" }));
  out.push(L(k.ring(cx, cy, 10.4, 39.2, P, 36), { tone: "lo" }));
  out.push(
    D(
      [0, 60, 120, 180, 240, 300].map((a) => at([cx + Math.cos(a * DEG) * 8.2, cy + Math.sin(a * DEG) * 8.2, 39.2])),
      { size: 0.42 },
    ),
  );
  out.push(
    turnZ(
      [
        [39.2, 9.6, 1],
        [40, 10.2, 1],
        [54, 10.2, 1],
        [55, 9.4, 1],
        [56.4, 7.4, 1],
        [57.6, 4.6, 1],
        [58, 0, 1],
      ],
      cx,
      cy,
      { tone: "hi" },
      { bevel: 0.4 },
    ),
  );
  out.push(L(k.knurl(cx, cy, 10.4, 40.4, 53.8, 30, P, 0.5), { tone: "lo" }));
  out.push(L(k.ring(cx, cy, 10.4, 40, P, 32) + k.ring(cx, cy, 10.2, 54, P, 32), { tone: "mid" }));
  out.push(tubeZ(58, 59.2, cx, cy, 3.6, { tone: "mid" }));
  out.push(L(k.knurl(cx, cy, 3.6, 58.2, 59, 14, P, 0.3), { tone: "lo" }));
  out.push(D([at([cx, cy, 59.3])], { size: 0.5, tone: "hi" }));
  const tbox = { x: cx + 8, y: cy - 5, w: 10, d: 13, r: 1.6 };
  out.push(S(k.slabOf(tbox, 43.6, 7.4, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(tbox, 1.4), 51, P, 3), { tone: "lo" }));
  out.push(L(k.sideSeam(tbox, 46.4, P, 3), { tone: "faint" }));
  out.push(tubeZ(51, 53, cx + 13, cy + 3.4, 1.8, { tone: "mid" }));
  out.push(D([at([cx + 11, cy - 2.6, 51]), at([cx + 15, cy + 1, 51])], { size: 0.36, tone: "lo" }));
  out.push(S(k.slabOf({ x: cx - 5.6, y: cy + 9.4, w: 11, d: 1.4, r: 0.8 }, 44.6, 4.6, P, 3), { tone: "lo" }));
  out.push(
    L(
      [7, 5].map((len, i) => k.segment([cx - 4, cy + 10.9, 48.2 - i * 1.8], [cx - 4 + len, cy + 10.9, 48.2 - i * 1.8], P)).join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(tubeY(cy - 21, cy - 14, cx, 11, 3.8, { tone: "mid" }));
  out.push(tubeY(cy - 22.4, cy - 21, cx, 11, 5.2, { tone: "mid" }));
  out.push(tubeY(cy + 14, cy + 22, cx, 12, 3.6, { tone: "mid" }));
  out.push(tubeY(cy + 21.2, cy + 22.6, cx, 12, 5.2, { tone: "mid" }));
  out.push(D([at([cx, cy - 22.2, 11]), at([cx + 4.2, cy - 15, 11])], { size: 0.38 }));
  const mark = { x: cx - 14, y: cy + 13.5, w: 10, d: 5, r: 1 };
  out.push(S(k.slabOf(mark, 3.4, 0.7, P, 3), { tone: "lo", crease: "none" }));
  out.push(engravedLetter(letter, cx - 9, mark.y + 2.5, 4.2, 1.8));
  return `<g data-pump="${letter.toLowerCase()}">${out.join("")}</g>`;
}

function pumpCable(cx, cy) {
  return k.wireSvg(at([cx + 13, cy + 3.4, 52.4]), at([cx + 19, cy + 18, 3.8]), {
    via: [at([cx + 17.4, cy + 9, 38]), at([cx + 19, cy + 13.4, 16])],
    tone: "lo",
    size: 1.1,
  });
}

// ===== Всасывающая линия =====
function suctionLine() {
  const out = [];
  out.push(tubeX(-136, 14, SUCT_Y, 12, 3.6, { tone: "mid" }));
  for (const x of [-136, -52, 14]) {
    out.push(tubeX(x - 1.2, x + 1.2, SUCT_Y, 12, 4.8, { tone: "mid" }));
  }
  for (const p of [PUMP_A, PUMP_B]) {
    out.push(tubeY(SUCT_Y, p.y - 21, p.x, 11, 3.4, { tone: "mid" }));
    out.push(S(G.sphereOf([p.x, SUCT_Y, 12], 4.4, P), { tone: "mid" }));
    out.push(tubeY(p.y - 24, p.y - 21.6, p.x, 11, 4.8, { tone: "mid" }));
    out.push(tubeZ(14.6, 18.4, p.x, p.y - 26, 1.1, { tone: "mid" }));
    out.push(S(G.ringBand(17.4, 18.6, 1.1, 4, Fv(p.x, p.y - 26), P, { steps: 24 }), { tone: "mid" }));
    out.push(L(k.ring(p.x, p.y - 26, 4, 18.6, P, 24), { tone: "lo" }));
    out.push(S(k.slabOf({ x: p.x - 2.2, y: p.y - 28.2, w: 4.4, d: 4.4, r: 1 }, 13, 2, P, 3), { tone: "mid" }));
  }
  for (const x of [-98, -24]) {
    out.push(S(k.slabOf({ x: x - 3, y: SUCT_Y - 3.4, w: 6, d: 6.8, r: 1 }, 0, 8.4, P, 3), { tone: "lo" }));
    out.push(S(G.ringBand(8, 9.4, 3.6, 4.9, Fx(SUCT_Y, 12), P, { steps: 22 }), { tone: "mid" }));
    out.push(D([at([x - 2, SUCT_Y - 2.4, 0]), at([x + 2, SUCT_Y + 2.4, 0])], { size: 0.36, tone: "lo" }));
  }
  return out.join("");
}

function flowLine(x0, y0, x1, y1, z, key) {
  const d = k.lineOnTop([x0, y0], [x1, y1], z, P);
  return `<path class="flow-dash" data-flow-line="${key}" d="${d}"/>`;
}

// ===== Нагнетание =====
function dischargeLine() {
  const out = [];
  for (const p of [PUMP_A, PUMP_B]) {
    out.push(tubeY(p.y + 22, DIS_Y, p.x, 12, 4, { tone: "mid" }));
    out.push(S(G.sphereOf([p.x, DIS_Y, 12], 5, P), { tone: "mid" }));
    out.push(tubeY(p.y + 22.6, p.y + 25, p.x, 12, 5, { tone: "mid" }));
    out.push(S(k.slabOf({ x: p.x - 2.6, y: DIS_Y - 9, w: 5.2, d: 5, r: 1 }, 0, 9, P, 3), { tone: "lo" }));
    out.push(L(k.sideSeam({ x: p.x - 2.6, y: DIS_Y - 9, w: 5.2, d: 5, r: 1 }, 4, P, 3), { tone: "faint" }));
    out.push(D([at([p.x, DIS_Y - 7.4, 0]), at([p.x, DIS_Y + 7.4, 0])], { size: 0.36, tone: "lo" }));
    out.push(flowLine(p.x, -14, p.x, 13, 16.2, p === PUMP_A ? "a" : "b"));
  }
  out.push(tubeX(PUMP_A.x, VALVE.x0, DIS_Y, 12, 4.6, { tone: "mid" }));
  out.push(tubeX(VALVE.x1, PUMP_B.x, DIS_Y, 12, 4.6, { tone: "mid" }));
  out.push(tubeX(VALVE.x0 - 1.4, VALVE.x0 + 0.4, DIS_Y, 12, 5.8, { tone: "mid" }));
  out.push(tubeX(VALVE.x1 - 0.4, VALVE.x1 + 1.4, DIS_Y, 12, 5.8, { tone: "mid" }));
  return out.join("");
}

// ===== Перекидной клапан =====
function leverSvg(v) {
  const a = (160 - 140 * v) * DEG;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const px = -dy;
  const py = dx;
  const x = VALVE_C.x;
  const y = DIS_Y;
  const len = 14;
  const ring = [
    [x + px * 2.2 + dx * 2.4, y + py * 2.2 + dy * 2.4],
    [x + px * 1.2 + dx * len, y + py * 1.2 + dy * len],
    [x - px * 1.2 + dx * len, y - py * 1.2 + dy * len],
    [x - px * 2.2 + dx * 2.4, y - py * 2.2 + dy * 2.4],
  ];
  const tipX = x + dx * (len + 0.6);
  const tipY = y + dy * (len + 0.6);
  return (
    S(k.extrude(ring, LEVER_Z, 3, P, { convex: true, bevel: 0.5 }), { tone: "hi", lit: true }) +
    S(k.cylinder(tipX, tipY, 2.6, LEVER_Z - 0.4, 3.8, P, 22, 0.5), { tone: "hi", lit: true }) +
    L(k.ring(tipX, tipY, 2.6, LEVER_Z + 3.4, P, 22), { tone: "lo" })
  );
}

function changeoverValve() {
  const out = [];
  const { y, z, r } = VALVE;
  const cx = VALVE_C.x;
  out.push(tubeX(VALVE.x0, VALVE.x1, y, z, r, { tone: "hi", lit: true }, { bevel: 0.7 }));
  out.push(tubeX(VALVE.x0 - 2, VALVE.x0, y, z, r + 2.2, { tone: "mid" }));
  out.push(tubeX(VALVE.x1, VALVE.x1 + 2, y, z, r + 2.2, { tone: "mid" }));
  out.push(L(k.segment([VALVE.x0 + 1, y, z + r], [VALVE.x1 - 1, y, z + r], P), { tone: "faint" }));
  out.push(L(k.ring(cx, y, r, z + r, P, 40), { tone: "faint" }));
  for (const fx of [VALVE.x0 - 1.4, VALVE.x1 + 1.4]) {
    out.push(
      D(
        [0, 45, 90, 135, 180, 225, 270, 315].map((a) =>
          at([fx, y + Math.cos(a * DEG) * (r + 1.4), z + Math.sin(a * DEG) * (r + 1.4)]),
        ),
        { size: 0.38 },
      ),
    );
  }
  // Горловина, шпиндель, пружина и рычаг.
  out.push(tubeZ(z + r - 1.4, z + r + 4.6, cx, y, 6.4, { tone: "mid" }));
  out.push(tubeZ(z + r + 4.6, z + r + 5.8, cx, y, 7.4, { tone: "mid" }));
  out.push(L(k.ring(cx, y, 7.4, z + r + 5.8, P, 30), { tone: "lo" }));
  const strain = k.radialTicks(cx, y, 6.8, 5, 2, z + r + 5.8, [1.0, 2.0], P, 20 * DEG, 140 * DEG);
  out.push(L(strain.minor, { tone: "lo" }), L(strain.major, { tone: "mid" }));
  out.push(tubeZ(z + r + 5.8, z + r + 6.6, cx, y, 4.6, { tone: "mid" }));
  out.push(tubeZ(z + r + 6.6, LEVER_Z, cx, y, 1.7, { tone: "hi" }));
  for (let i = 0; i < 5; i++) {
    out.push(L(k.ring(cx, y, 3.6, z + r + 7 + i * 0.94, P, 20), { tone: "lo" }));
  }
  out.push(`<g data-lever>${leverSvg(0)}</g>`);
  out.push(tubeZ(LEVER_Z + 3, LEVER_Z + 4.1, cx, y, 1.6, { tone: "hi" }));
  out.push(D([at([cx, y, LEVER_Z + 4.3])], { size: 0.4, tone: "hi" }));
  return out.join("");
}

// ===== Выходная линия =====
function outletLine() {
  const out = [];
  out.push(tubeY(22, OUT_Y + 1, VALVE_C.x, 12, 4.2, { tone: "mid" }));
  out.push(tubeY(23, 25, VALVE_C.x, 12, 5.4, { tone: "mid" }));
  out.push(S(G.sphereOf([VALVE_C.x, OUT_Y, 12], 5.2, P), { tone: "mid" }));
  out.push(tubeX(VALVE_C.x, OUT_END, OUT_Y, 12, 4.2, { tone: "mid" }));
  out.push(tubeX(OUT_END - 1.6, OUT_END, OUT_Y, 12, 5.4, { tone: "mid" }));
  out.push(tubeY(OUT_Y - 4, OUT_Y + 1, VALVE_C.x, 12, 5, { tone: "mid" }));
  for (const x of [4, 60]) {
    out.push(tubeX(x - 1.2, x + 1.2, OUT_Y, 12, 5.4, { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: 102, y: OUT_Y - 3.4, w: 10, d: 6.8, r: 1 }, 0, 6.8, P, 3), { tone: "lo" }));
  out.push(S(G.ringBand(7.4, 8.8, 4.2, 5.7, Fx(OUT_Y, 12), P, { steps: 24 }), { tone: "mid" }));
  out.push(flowLine(VALVE_C.x, 24, VALVE_C.x, 37, 16.1, "out"));
  out.push(flowLine(VALVE_C.x + 2, OUT_Y, OUT_END - 4, OUT_Y, 16.1, "out"));
  return out.join("");
}

// ===== Приборы =====
function dialTicks(cx, yFace, cz, r) {
  const out = [];
  for (let i = 0; i <= 20; i++) {
    const a = (DIAL_FROM + ((DIAL_TO - DIAL_FROM) * i) / 20) * DEG;
    const major = i % 5 === 0;
    const r0 = r - (major ? 2.2 : 1.3);
    const r1 = r - 0.7;
    out.push(
      L(
        k.segment(
          [cx + Math.sin(a) * r0, yFace, cz + Math.cos(a) * r0],
          [cx + Math.sin(a) * r1, yFace, cz + Math.cos(a) * r1],
          P,
        ),
        { tone: major ? "mid" : "lo", free: true },
      ),
    );
  }
  return out.join("");
}

function gaugeUnit(spec) {
  const out = [];
  const { x, z, r, key, max, len } = spec;
  const y0 = OUT_Y - 3;
  const yF = OUT_Y + 3;
  // Стойка на трубе: седло, хомут, два болта, стойка и кронштейн.
  out.push(S(G.ringBand(9.4, 11.6, 4.2, 6.2, Fx(OUT_Y, 12), P, { steps: 24 }), { tone: "mid" }));
  out.push(L(k.ring(x, OUT_Y, 6.2, 9.4, P, 26) + k.ring(x, OUT_Y, 6.2, 11.6, P, 26), { tone: "lo" }));
  out.push(D([at([x, OUT_Y - 5.4, 10.5]), at([x, OUT_Y + 5.4, 10.5])], { size: 0.36, tone: "lo" }));
  out.push(tubeZ(11.4, z - r - 1.6, x, OUT_Y, 2, { tone: "mid" }));
  out.push(tubeZ(11.4, 12.6, x, OUT_Y, 3, { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 3.2, y: OUT_Y - 4.4, w: 6.4, d: 8.8, r: 1.2 }, z - r - 2.2, 2.8, P, 3), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: x - 3.2, y: OUT_Y - 4.4, w: 6.4, d: 8.8, r: 1.2 }, z - r - 0.4, P, 3), { tone: "faint" }));
  out.push(D([at([x - 2, OUT_Y - 3, z - r]), at([x + 2, OUT_Y + 3, z - r])], { size: 0.34, tone: "lo" }));
  // Корпус прибора, обечайка, циферблат.
  out.push(S(G.disc(y0, yF, r, Fy(x, z), P, { steps: 40, bevel: 0.7 }), { tone: "mid" }));
  out.push(S(G.ringBand(yF - 1.2, yF + 0.9, r - 1.5, r, Fy(x, z), P, { steps: 40 }), { tone: "hi" }));
  out.push(S(G.disc(yF, yF + 0.5, r - 1.5, Fy(x, z), P, { steps: 40 }), { tone: "hi", crease: "lo" }));
  out.push(dialTicks(x, yF + 0.6, z, r - 1.5));
  const centre = [x, yF + 0.9, z];
  out.push(`<g data-gauge="${key}">${L(needlePath(centre, len, 0, max), { tone: "hi", free: true })}</g>`);
  out.push(S(G.disc(yF + 0.5, yF + 1.4, 1.5, Fy(x, z), P, { steps: 20 }), { tone: "hi" }));
  // Импульсная трубка к коллектору.
  out.push(tubeX(x - 0.9, x + 0.9, OUT_Y - 6, 12, 1.1, { tone: "mid" }));
  out.push(S(G.sphereOf([x, OUT_Y - 6, 12], 1.7, P), { tone: "mid" }));
  return out.join("");
}

function needlePath(centre, len, value, max) {
  const t = Math.min(1, Math.max(0, value / max));
  const a = (DIAL_FROM + (DIAL_TO - DIAL_FROM) * t) * DEG;
  return k.segment(centre, [centre[0] + Math.sin(a) * len, centre[1], centre[2] + Math.cos(a) * len], P);
}

// ===== Пульт =====
function consoleUnit() {
  const out = [];
  const { x, y, w, d } = CONSOLE;
  const top = CONSOLE_H;
  out.push(S(k.slabOf({ x: x + 1.2, y: y + 1.2, w: w - 2.4, d: d - 2.4, r: 2 }, 0, 3, P, 4, 0.6), { tone: "lo" }));
  out.push(S(k.slabOf({ x, y, w, d, r: 2.4 }, 3, top - 3, P, 5, 1.2), { tone: "mid" }));
  out.push(L(k.sideSeam({ x, y, w, d, r: 2.4 }, 20, P, 5), { tone: "faint" }));
  out.push(S(k.slabOf({ x: x - 1.6, y: y - 1.6, w: w + 3.2, d: d + 3.2, r: 3 }, top - 3, 3, P, 5, 0.9), { tone: "mid" }));
  out.push(
    L(k.planOutline(k.insetPlan({ x: x - 1.6, y: y - 1.6, w: w + 3.2, d: d + 3.2, r: 3 }, 2.4), top, P, 5), {
      tone: "faint",
    }),
  );
  out.push(L(k.segment([x + 2.4, y + d + 0.1, 2], [x + 2.4, y + d + 0.1, 4.6], P), { tone: "faint" }));
  out.push(L(k.segment([x + w + 0.1, y + 3, 4], [x + w + 0.1, y + 3, top - 4], P), { tone: "faint" }));
  // Решётка на боковой грани.
  out.push(
    L(
      [9, 12.4, 15.8, 19.2]
        .map((z) => k.segment([x + w + 0.2, y + 8, z], [x + w + 0.2, y + 15, z], P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(S(k.slabOf({ x: x + w - 1.2, y: y + d - 10, w: 2, d: 5, r: 0.8 }, 26, 3, P, 3), { tone: "hi" }));
  out.push(L(k.ring(x + w + 0.2, y + d - 7.4, 1.1, 27.6, P, 12), { tone: "lo" }));

  // Окно журнала: рамка, бумага, прижимная планка, отрывная кромка.
  out.push(
    S(k.slabOf({ x: PAPER.x - 1.6, y: PAPER.y, w: PAPER.w + 3.2, d: 1, r: 0.8 }, PAPER.z0 - 1.4, PAPER.z1 - PAPER.z0 + 2.8, P, 3), {
      tone: "lo",
    }),
  );
  out.push(
    S(k.slabOf({ x: PAPER.x, y: PAPER.y + 1, w: PAPER.w, d: 0.5, r: 0.5 }, PAPER.z0, PAPER.z1 - PAPER.z0, P, 3), {
      tone: "hi",
      crease: "none",
    }),
  );
  out.push(
    `<g data-tape>${JOURNAL.map(
      (row, i) =>
        `<g data-log="${i}" style="opacity:${i === 0 ? 1 : 0}">` +
        k.faceTextSvg(k.sideMatrix([PAPER.x + 2.2, PAPER_FACE + 0.1], LOG_BOT + i * LOG_SP, P, "left"), row.t, {
          size: 4.6,
          tone: "mid",
        }) +
        k.faceTextSvg(k.sideMatrix([PAPER.x + 17, PAPER_FACE + 0.1], LOG_BOT + i * LOG_SP, P, "left"), row.e, {
          size: 5.2,
          tone: "hi",
        }) +
        `</g>`,
    ).join("")}</g>`,
  );
  out.push(
    S(k.slabOf({ x: PAPER.x - 1.2, y: PAPER.y + 0.4, w: PAPER.w + 2.4, d: 2.6, r: 0.8 }, PAPER.z1, 2.6, P, 3, 0.5), {
      tone: "mid",
    }),
  );
  out.push(
    L(
      k.planOutline(k.insetPlan({ x: PAPER.x - 1.2, y: PAPER.y + 0.4, w: PAPER.w + 2.4, d: 2.6, r: 0.8 }, 0.8), PAPER.z1 + 2.6, P, 3),
      { tone: "lo" },
    ),
  );
  for (const px of [PAPER.x + 4, PAPER.x + PAPER.w - 4]) {
    out.push(D([at([px, PAPER.y + 1.7, PAPER.z1 + 2.6])], { size: 0.4 }));
  }
  out.push(
    L(k.segment([PAPER.x, PAPER_FACE + 0.2, PAPER.z0 - 1.2], [PAPER.x + PAPER.w, PAPER_FACE + 0.2, PAPER.z0 - 1.2], P), {
      tone: "mid",
    }),
  );

  // Счётчики на передней грани под журналом.
  out.push(S(k.slabOf({ x: 58, y: PAPER.y, w: 40, d: 0.9, r: 0.6 }, 3, 6.5, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: 59.5, y: PAPER.y - 0.6, w: 22, d: 0.7, r: 0.6 }, 3.6, 5.4, P, 3), { tone: "hi", crease: "none" }));
  out.push(S(k.slabOf({ x: 83.5, y: PAPER.y - 0.6, w: 13, d: 0.7, r: 0.6 }, 3.6, 5.4, P, 3), { tone: "hi", crease: "none" }));
  out.push(
    `<g data-hours>${k.faceTextSvg(k.sideMatrix([70.5, PAPER.y + 0.2], 4.4, P, "left"), "1204", {
      size: 4.6,
      tone: "hi",
      anchor: "middle",
    })}</g>`,
  );
  out.push(
    `<g data-count>${k.faceTextSvg(k.sideMatrix([90, PAPER.y + 0.2], 4.4, P, "left"), "07", {
      size: 4.6,
      tone: "hi",
      anchor: "middle",
    })}</g>`,
  );

  // Лампы A и B на крышке.
  const lamps = [
    { lx: x + 9, ly: y + 6, letter: "A", color: "var(--anatomy-green)" },
    { lx: x + 23, ly: y + 6, letter: "B", color: "var(--lamp-amber)" },
  ];
  for (const lamp of lamps) {
    out.push(tubeZ(top, top + 1.4, lamp.lx, lamp.ly, 3.8, { tone: "mid" }));
    out.push(L(k.ring(lamp.lx, lamp.ly, 3.8, top + 1.4, P, 24), { tone: "lo" }));
    const glow = at([lamp.lx, lamp.ly, top + 4.6]);
    out.push(
      `<g data-lamp="${lamp.letter.toLowerCase()}" class="lamp" style="--lamp:${lamp.color}">` +
        `<circle class="lamp-glow" cx="${glow[0].toFixed(1)}" cy="${glow[1].toFixed(1)}" r="${(5.2 * P.scale).toFixed(1)}"/>` +
        turnZ(
          [
            [top + 1.4, 3.4, 1],
            [top + 2.2, 3.5, 1],
            [top + 4.2, 3.1, 1],
            [top + 5.2, 2.0, 1],
            [top + 5.6, 0, 1],
          ],
          lamp.lx,
          lamp.ly,
          { tone: "hi" },
          { steps: 30 },
        ) +
        L(k.ring(lamp.lx, lamp.ly, 3.4, top + 1.6, P, 26), { tone: "lo" }) +
        `</g>`,
    );
    out.push(engravedLetter(lamp.letter, lamp.lx + 6.2, lamp.ly + 1.2, top + 0.1, 1.9));
  }
  return out.join("");
}

// ===== Ящик резервной копии =====
function backupBox() {
  const out = [];
  const { x, y, w, d } = BOX;
  out.push(`<path class="iso-halo" d="${k.haloOf(BOX, BOX_Z, BOX_H, P)}"/>`);
  out.push(S(k.slabOf({ x, y, w, d, r: 3 }, BOX_Z, 2.4, P, 4, 0.6), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x + 2, y: y + 2, w: w - 4, d: d - 4, r: 2 }, BOX_Z + 2.4, BOX_H - 6, P, 4), { tone: "lo" }));
  const walls = [
    { x, y, w, d: 3, r: 0.6 },
    { x, y: y + d - 3, w, d: 3, r: 0.6 },
    { x, y: y + 3, w: 3, d: d - 6, r: 0.6 },
    { x: x + w - 3, y: y + 3, w: 3, d: d - 6, r: 0.6 },
  ];
  for (const wall of walls) {
    out.push(S(k.slabOf(wall, BOX_Z + 2.4, BOX_H - 6, P, 3, 0.5), { tone: "mid" }));
  }
  out.push(L(k.planOutline(k.insetPlan({ x, y, w, d, r: 3 }, 3), BOX_Z + BOX_H - 3.6, P, 4), { tone: "faint" }));
  const cart = { x: x + 10, y: y + 10, w: 24, d: 13, r: 1.4 };
  out.push(
    `<g data-cart>${S(k.slabOf(cart, BOX_Z + 2.4, BOX_H - 6, P, 3, 0.4), { tone: "hi" })}${S(
      k.slabOf({ x: cart.x + 3, y: cart.y - 0.6, w: 18, d: 0.8, r: 0.4 }, BOX_Z + 7, 5, P, 3),
      { tone: "lo", crease: "none" },
    )}${L(
      [12, 9].map((len, i) => k.segment([cart.x + 5, cart.y - 1, BOX_Z + 5.4 + i * 2], [cart.x + 5 + len, cart.y - 1, BOX_Z + 5.4 + i * 2], P)).join(""),
      { tone: "lo", free: true },
    )}</g>`,
  );

  const lidZ = BOX_Z + BOX_H;
  const lid = [
    S(k.slabOf({ x: x - 1, y: y - 1, w: w + 2, d: d + 2, r: 3 }, lidZ, 3, P, 4, 0.7), { tone: "mid" }),
    L(k.planOutline(k.insetPlan({ x: x - 1, y: y - 1, w: w + 2, d: d + 2, r: 3 }, 2.2), lidZ + 3, P, 4), {
      tone: "faint",
    }),
    L(k.sideSeam({ x: x - 1, y: y - 1, w: w + 2, d: d + 2, r: 3 }, lidZ + 1, P, 4), { tone: "faint" }),
  ];
  for (const [px, py] of k.corners({ x, y, w, d }, 1.5)) {
    lid.push(S(k.slabOf({ x: px - 3.4, y: py - 3.4, w: 6.8, d: 6.8, r: 1.2 }, lidZ + 3, 0.8, P, 3), { tone: "lo", crease: "none" }));
  }
  lid.push(S(k.slabOf({ x: x + w / 2 - 4, y: y + d - 2, w: 8, d: 2.4, r: 0.8 }, lidZ + 1, 2.4, P, 3), { tone: "hi" }));
  lid.push(L(k.ring(x + w / 2, y + d - 0.8, 1.2, lidZ + 3.4, P, 14), { tone: "lo" }));

  // Запечатанный носитель лежит на крышке, с пломбой на проволоке.
  const spare = { x: x + 34, y: y + 10, w: 18, d: 12, r: 1.2 };
  lid.push(S(k.slabOf(spare, lidZ + 3, 3.4, P, 3, 0.5), { tone: "mid" }));
  lid.push(S(k.slabOf({ x: spare.x + 2, y: spare.y + spare.d, w: 14, d: 0.4, r: 0.4 }, lidZ + 3.6, 2.2, P, 3), {
    tone: "lo",
    crease: "none",
  }));
  lid.push(
    L(
      [11, 8].map((len, i) => k.segment([spare.x + 3, spare.y + spare.d + 0.5, lidZ + 5.4 - i * 1.7], [spare.x + 3 + len, spare.y + spare.d + 0.5, lidZ + 5.4 - i * 1.7], P)).join(""),
      { tone: "lo", free: true },
    ),
  );
  lid.push(k.wireSvg(at([spare.x + 4, spare.y + spare.d + 0.5, lidZ + 6.6]), at([spare.x - 3, spare.y + 4, lidZ + 4]), { tone: "lo", size: 0.8 }));
  lid.push(S(k.slabOf({ x: spare.x - 6, y: spare.y + 2, w: 4.4, d: 5, r: 0.6 }, lidZ + 2.2, 3.4, P, 3), { tone: "mid" }));
  lid.push(D([at([spare.x - 3.8, spare.y + 4.5, lidZ + 5.6])], { size: 0.4 }));

  const bx = x + 9;
  const by = y + d - 9;
  const boxGlow = at([bx, by, lidZ + 6]);
  lid.push(tubeZ(lidZ + 3, lidZ + 4.4, bx, by, 3, { tone: "mid" }));
  lid.push(
    `<g data-boxlamp class="lamp" style="--lamp:var(--anatomy-lo)">` +
      `<circle class="lamp-glow" cx="${boxGlow[0].toFixed(1)}" cy="${boxGlow[1].toFixed(1)}" r="${(4 * P.scale).toFixed(1)}"/>` +
      turnZ(
        [
          [lidZ + 4.4, 2.6, 1],
          [lidZ + 5.2, 2.8, 1],
          [lidZ + 6.6, 2.2, 1],
          [lidZ + 7.2, 0, 1],
        ],
        bx,
        by,
        { tone: "hi" },
        { steps: 24 },
      ) +
      L(k.ring(bx, by, 2.6, lidZ + 4.5, P, 20), { tone: "lo" }) +
      `</g>`,
  );
  lid.push(D([at([x + 4, y + 4, lidZ + 3]), at([x + w - 4, y + 4, lidZ + 3])], { size: 0.45 }));
  out.push(`<g data-lid>${lid.join("")}</g>`);

  out.push(S(k.slabOf({ x: x + 8, y: y + d, w: 22, d: 0.8, r: 0.6 }, BOX_Z + 5, 8, P, 3), { tone: "lo", crease: "none" }));
  out.push(
    L(
      [15, 10].map((len, i) => k.segment([x + 10, y + d + 0.9, BOX_Z + 10.4 - i * 2.4], [x + 10 + len, y + d + 0.9, BOX_Z + 10.4 - i * 2.4], P)).join(""),
      { tone: "lo", free: true },
    ),
  );
  return out.join("");
}

// ===== Ремонтный лоток =====
function repairKit() {
  const out = [];
  const { x, y, w, d } = KIT;
  out.push(S(k.slabOf({ x, y, w, d, r: 1.6 }, 0, 1.4, P, 3, 0.4), { tone: "mid" }));
  for (const wall of [
    { x, y, w, d: 1.6, r: 0.5 },
    { x, y: y + d - 1.6, w, d: 1.6, r: 0.5 },
    { x, y: y + 1.6, w: 1.6, d: d - 3.2, r: 0.5 },
    { x: x + w - 1.6, y: y + 1.6, w: 1.6, d: d - 3.2, r: 0.5 },
  ]) {
    out.push(S(k.slabOf(wall, 1.4, 2.4, P, 3), { tone: "mid" }));
  }
  out.push(S(G.ringBand(1.4, 2.8, 3.6, 6.4, Fv(x + 7, y + 7), P, { steps: 30 }), { tone: "hi" }));
  out.push(L(k.ring(x + 7, y + 7, 6.4, 2.8, P, 30) + k.ring(x + 7, y + 7, 3.6, 1.5, P, 24), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x + 12, y: y + 3.6, w: 8, d: 2.2, r: 0.6 }, 1.4, 1.2, P, 3), { tone: "hi" }));
  out.push(L(k.ring(x + 19, y + 4.7, 2, 2.6, P, 20), { tone: "lo" }));
  out.push(tubeZ(1.4, 3.2, x + 17, y + 10.4, 1.4, { tone: "mid" }));
  out.push(tubeZ(1.4, 3.2, x + 13, y + 11, 1.4, { tone: "mid" }));
  return `<g data-kit style="opacity:0">${out.join("")}</g>`;
}

// ===== Бирка на отказавшем насосе =====
function failTag() {
  const out = [];
  const tx = -80;
  const ty = 6;
  out.push(k.wireSvg(at([-86, ty, 16.4]), at([tx, ty, 13.8]), { tone: "lo", size: 0.8 }));
  const plan = { x: tx - 3.4, y: ty - 0.5, w: 6.8, d: 1, r: 0.6 };
  out.push(S(k.slabOf(plan, 5, 8.6, P, 3, 0.3), { tone: "mid" }));
  out.push(L(k.planOutline(plan, 13.6, P, 3), { tone: "lo" }));
  out.push(L(k.ring(tx, ty, 0.8, 13.6, P, 12), { tone: "lo" }));
  out.push(
    L(
      [4.2, 3].map((len, i) => k.segment([tx - 2.4, ty + 0.6, 11.4 - i * 2], [tx - 2.4 + len, ty + 0.6, 11.4 - i * 2], P)).join(""),
      { tone: "lo", free: true },
    ),
  );
  return `<g data-tag style="opacity:0">${out.join("")}</g>`;
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Дублированный насосный агрегат на раме. Два вертикальных насоса A и B стоят на общей плите и соединены общим коллектором. Между ними перекидной клапан с рычагом и пружиной, слева бак, справа расходомер и манометр. На переднем пульте журнал переключений, счётчик часов и две лампы. Справа на полу ящик резервной копии с запечатанным носителем.",
  body: [
    plateSkid(),
    tankUnit(),
    suctionLine(),
    pumpUnit(PUMP_A.x, PUMP_A.y, "A"),
    pumpUnit(PUMP_B.x, PUMP_B.y, "B"),
    pumpCable(PUMP_A.x, PUMP_A.y),
    pumpCable(PUMP_B.x, PUMP_B.y),
    dischargeLine(),
    failTag(),
    changeoverValve(),
    outletLine(),
    gaugeUnit(GAUGE_FLOW),
    gaugeUnit(GAUGE_PRESS),
    consoleUnit(),
    repairKit(),
    backupBox(),
  ],
});

const live = `
const root = document.querySelector(".iso-stage");
const art = root.querySelector("svg");
const readoutEl = document.querySelector("[data-readout]");
const calmQuery = matchMedia("(prefers-reduced-motion: reduce)");
const PRJ = ${JSON.stringify(P)};
const STATE = ${JSON.stringify(STATES)};
const LABELS = ${JSON.stringify(STEPS.map((step) => step.label))};
const READOUTS = ${JSON.stringify(STEPS.map((step) => step.readout))};
const TOTAL = STATE.length;
const LOG_SP = ${LOG_SP};
const LOG_SLOTS = ${LOG_SLOTS};
const LED = {
  run: "var(--anatomy-green)",
  standby: "var(--lamp-amber)",
  fail: "var(--anatomy-red)",
  off: "var(--anatomy-lo)",
};
const GAUGES = {
  flow: { el: art.querySelector('[data-gauge="flow"]'), c: [${GAUGE_FLOW.x}, ${OUT_Y + 0.9}, ${GAUGE_FLOW.z}], from: ${DIAL_FROM}, to: ${DIAL_TO}, max: ${GAUGE_FLOW.max}, len: ${GAUGE_FLOW.len} },
  pressure: { el: art.querySelector('[data-gauge="pressure"]'), c: [${GAUGE_PRESS.x}, ${OUT_Y + 0.9}, ${GAUGE_PRESS.z}], from: ${DIAL_FROM}, to: ${DIAL_TO}, max: ${GAUGE_PRESS.max}, len: ${GAUGE_PRESS.len} },
};
const lampA = art.querySelector('[data-lamp="a"]');
const lampB = art.querySelector('[data-lamp="b"]');
const boxLamp = art.querySelector("[data-boxlamp]");
const leverEl = art.querySelector("[data-lever]");
const tapeEl = art.querySelector("[data-tape]");
const logs = Array.from(art.querySelectorAll("[data-log]"));
const hoursEl = art.querySelector("[data-hours] text");
const countEl = art.querySelector("[data-count] text");
const lidEl = art.querySelector("[data-lid]");
const cartEl = art.querySelector("[data-cart]");
const tagEl = art.querySelector("[data-tag]");
const kitEl = art.querySelector("[data-kit]");
const dashes = Array.from(art.querySelectorAll("[data-flow-line]"));
const clampNum = (value, low, high) => Math.min(high, Math.max(low, value));
const near = (a, b) => Math.abs(a - b) < 0.02;
const ease = (from, to, tau, dt) => {
  if (calmQuery.matches) return to;
  const next = from + (to - from) * (1 - Math.exp(-dt / tau));
  return Math.abs(to - next) < 0.006 ? to : next;
};
const LEVER_X = ${VALVE_C.x};
const LEVER_Y = ${DIS_Y};
const LEVER_Z = ${LEVER_Z};

function leverMarkup(v) {
  const a = (160 - 140 * v) * Math.PI / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const px = -dy;
  const py = dx;
  const len = 14;
  const ring = [
    [LEVER_X + px * 2.2 + dx * 2.4, LEVER_Y + py * 2.2 + dy * 2.4],
    [LEVER_X + px * 1.2 + dx * len, LEVER_Y + py * 1.2 + dy * len],
    [LEVER_X - px * 1.2 + dx * len, LEVER_Y - py * 1.2 + dy * len],
    [LEVER_X - px * 2.2 + dx * 2.4, LEVER_Y - py * 2.2 + dy * 2.4],
  ];
  const tipX = LEVER_X + dx * (len + 0.6);
  const tipY = LEVER_Y + dy * (len + 0.6);
  const rim = pathOf(
    circleRing(tipX, tipY, 2.6, 22).map((p) => iso([p[0], p[1], LEVER_Z + 3.4], PRJ)),
    true,
  );
  return (
    solidSvg(extrude(ring, LEVER_Z, 3, PRJ, { convex: true, bevel: 0.5 }), { tone: "hi", lit: true }) +
    solidSvg(cylinder(tipX, tipY, 2.6, LEVER_Z - 0.4, 3.8, PRJ, 22, 0.5), { tone: "hi", lit: true }) +
    lineSvg(rim, { tone: "lo" })
  );
}

function needle(kind, value) {
  const g = GAUGES[kind];
  const share = clampNum(value / g.max, 0, 1);
  const a = (g.from + (g.to - g.from) * share) * Math.PI / 180;
  const tip = [g.c[0] + Math.sin(a) * g.len, g.c[1], g.c[2] + Math.cos(a) * g.len];
  const d = segment(g.c, tip, PRJ);
  if (g.drawn !== d) {
    g.el.firstElementChild.setAttribute("d", d);
    g.drawn = d;
  }
}

let step = 0;
let applied = -1;
let shownValve = -1;
let shownHours = STATE[0].hours;
let shownCount = STATE[0].switches;
let cur = { valve: STATE[0].valve, pressure: STATE[0].pressure, flow: STATE[0].flow, tape: 0, lid: 0, cart: 0, dip: 0 };
let offset = { a: 0, b: 0, out: 0 };
let frame = 0;
let last = 0;
let clock = 0;
let idle = 0;
let touring = !calmQuery.matches;
let visible = false;
const TOUR = 4.8;

function apply() {
  const st = STATE[step];
  if (applied === step) return;
  applied = step;
  lampA.style.setProperty("--lamp", LED[st.a]);
  lampB.style.setProperty("--lamp", LED[st.b]);
  boxLamp.style.setProperty("--lamp", st.check ? LED.run : LED.off);
  tagEl.style.opacity = st.tag ? "1" : "0";
  kitEl.style.opacity = st.kit ? "1" : "0";
  for (let i = 0; i < logs.length; i++) {
    logs[i].style.opacity = i <= st.log && i > st.log - LOG_SLOTS - 1 ? "1" : "0";
  }
  readoutEl.textContent = READOUTS[step];
  root.setAttribute("aria-valuenow", String(step));
  root.setAttribute("aria-valuetext", "шаг " + (step + 1) + " из " + TOTAL + ": " + LABELS[step]);
}

function draw(dt) {
  const st = STATE[step];
  if (cur.dip > 0.004) cur.dip *= Math.exp(-dt / 0.5);
  else cur.dip = 0;
  const targetP = Math.max(0.2, st.pressure - cur.dip);
  cur.valve = ease(cur.valve, st.valve, 0.34, dt);
  cur.pressure = ease(cur.pressure, targetP, 0.24, dt);
  cur.flow = ease(cur.flow, st.flow, 0.28, dt);
  cur.tape = ease(cur.tape, -Math.max(0, st.log - LOG_SLOTS) * LOG_SP, 0.3, dt);
  cur.lid = ease(cur.lid, st.check ? 1 : 0, 0.3, dt);
  cur.cart = ease(cur.cart, st.check ? 1 : 0, 0.34, dt);
  shownHours = ease(shownHours, st.hours, 0.5, dt);
  shownCount = ease(shownCount, st.switches, 0.4, dt);
  if (hoursEl && hoursEl.textContent !== String(Math.round(shownHours))) hoursEl.textContent = String(Math.round(shownHours));
  if (countEl && countEl.textContent !== String(Math.round(shownCount))) countEl.textContent = String(Math.round(shownCount));
  if (shownValve < 0 || Math.abs(cur.valve - shownValve) > 0.002) {
    shownValve = cur.valve;
    leverEl.innerHTML = leverMarkup(cur.valve);
  }
  needle("pressure", cur.pressure);
  needle("flow", cur.flow);
  tapeEl.setAttribute("transform", translateAlong(PRJ, [0, 0, cur.tape]));
  lidEl.setAttribute("transform", translateAlong(PRJ, [0, 0, cur.lid * 12]));
  cartEl.setAttribute("transform", translateAlong(PRJ, [0, 0, cur.cart * 6]));
  const flowA = st.a === "run" ? Math.max(0, 1 - cur.valve) : 0;
  const flowB = st.b === "run" ? cur.valve : 0;
  for (const el of dashes) {
    const key = el.dataset.flowLine;
    const power = key === "a" ? flowA : key === "b" ? flowB : Math.min(1, flowA + flowB);
    if (power > 0.02) offset[key] -= dt * (12 + 46 * power);
    el.style.strokeDashoffset = offset[key].toFixed(1);
    el.style.opacity = (0.14 + 0.46 * power).toFixed(2);
  }
  apply();
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) {
    clock += dt;
    const want = Math.floor(clock / TOUR) % TOTAL;
    if (want !== step) go(want);
  }
  draw(dt);
  const st = STATE[step];
  const settled =
    near(cur.valve, st.valve) &&
    near(cur.pressure, st.pressure) &&
    near(cur.flow, st.flow) &&
    near(cur.tape, -Math.max(0, st.log - LOG_SLOTS) * LOG_SP) &&
    near(cur.lid, st.check ? 1 : 0) &&
    near(cur.cart, st.check ? 1 : 0) &&
    cur.dip === 0 &&
    near(shownHours, st.hours) &&
    near(shownCount, st.switches);
  frame = visible && (touring || !settled) ? requestAnimationFrame(tick) : 0;
}

function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}

function go(next) {
  step = clampNum(next, 0, TOTAL - 1);
  const st = STATE[step];
  if (st.dip && !calmQuery.matches) cur.dip = Math.max(cur.dip, st.dip);
  apply();
  run();
}

function steer(to) {
  touring = false;
  go(to);
  clearTimeout(idle);
  idle = setTimeout(() => {
    touring = !calmQuery.matches;
    clock = 0;
    run();
  }, 4200);
}

new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(root);

let downX = null;
root.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") return;
  const box = art.getBoundingClientRect();
  const share = clampNum(((event.clientX - box.left) / box.width - 0.12) / 0.76, 0, 1);
  steer(Math.min(TOTAL - 1, Math.floor(share * TOTAL)));
});
root.addEventListener("pointerleave", () => steer(step));
root.addEventListener("pointerdown", (event) => {
  downX = event.clientX;
});
root.addEventListener("pointerup", (event) => {
  if (downX === null) return;
  const delta = event.clientX - downX;
  downX = null;
  if (Math.abs(delta) > 26) steer(step + (delta < 0 ? 1 : -1));
});
root.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(TOTAL - 1, step + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, step - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = TOTAL - 1;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
if (calmQuery.matches) touring = false;
draw(1 / 60);
`;

const css = `<style>
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.iso{--lamp-amber:#e0b04a}
.iso[data-theme="light"]{--lamp-amber:#a9711a}
.lamp .iso-fill{fill:var(--lamp);fill-opacity:.32}
.lamp .iso-shade[data-shade="0"]{fill:var(--lamp);fill-opacity:.4}
.lamp .iso-shade[data-shade="1"]{fill:var(--lamp);fill-opacity:.54}
.lamp .iso-shade[data-shade="2"]{fill:var(--lamp);fill-opacity:.68}
.lamp .iso-shade[data-shade="3"]{fill:var(--lamp);fill-opacity:.82}
.lamp .iso-top{fill:var(--lamp);fill-opacity:.95}
.lamp .iso-fill,.lamp .iso-shade,.lamp .iso-top{transition:fill .35s ease}
.lamp .iso-edge,.lamp .iso-crease{stroke:var(--anatomy-mid)}
.lamp-glow{fill:var(--lamp);opacity:.24;filter:blur(4px);transition:fill .35s ease,opacity .35s ease}
.flow-dash{fill:none;stroke:var(--anatomy-lit);stroke-width:1.1;stroke-linecap:round;stroke-dasharray:2.6 6.6;opacity:.4}
[data-log]{transition:opacity .28s ease}
[data-tag],[data-kit]{transition:opacity .3s ease}
@media (max-width:560px){
  .iso-plate{padding-bottom:96px}
  .iso-plate-corner[data-corner="readout"]{font-size:9px;bottom:52px;left:0;right:auto}
  .iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px;left:0;right:0;white-space:normal;line-height:1.35}
}
@media (prefers-reduced-motion: reduce){
  .lamp .iso-fill,.lamp .iso-shade,.lamp .iso-top,.lamp-glow,[data-log],[data-tag],[data-kit]{transition:none}
}
</style>`;

const page = css + k.plateHtml({
  fig: "Fig 1",
  title: TITLE,
  hint: HINT,
  readout: STEPS[0].readout,
  keys: KEYS,
  caption: CAPTION,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: насос A, насос B и перекидной клапан" aria-valuemin="0" aria-valuemax="${
    STEPS.length - 1
  }" aria-valuenow="0">${svg}</div>`,
});

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, body: page, script: kitScript() + live }));
  console.log("wrote", name);
}
console.log("scale", P.scale.toFixed(3));
