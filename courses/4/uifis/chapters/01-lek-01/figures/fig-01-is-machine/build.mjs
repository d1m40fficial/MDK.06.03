// Figure fig-01-is-machine, built with the Anatomy skill.
//
// Contract with course-studio (kept):
//   1. Kit imported from the vendored copy: ../../../../../../_anatomy/kit/iso-kit.mjs
//   2. `node build.mjs` writes BOTH themes next to this file:
//        fig-01-is-machine.html        (dark)
//        fig-01-is-machine-light.html  (light)
//   3. `node build.mjs --audit` runs Anatomy's audit.
//   4. The card `fig` is "Fig 1".
//
// The object: one bench data-processing machine on a shared base, every part
// squared to the same rail line. Left to right: an intake hopper of record
// tiles, a registration gate over the feed rail, a carriage, a portal press
// with a gear headstock and a stamp, a turnout (развилка), then a card-index
// cabinet of three drawers at the back and an output tray at the front. A mode
// handwheel on a post at the front carries a pointer, and a feedback tie rod
// runs from the output tray to the handwheel. A counter dial on the bed shows
// how many records are processed.
//
// The static machine is drawn through one recorder so the audit can prove that
// every recorded part rests on the one below and that overlapping parts are
// painted in true depth order. The moving parts (records, carriage, stamp,
// drawers, handwheel, rod, turnout, needle) are groups rebuilt each frame by
// the inlined kit.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import * as A from "../../../../../../_anatomy/kit/audit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-01-is-machine";
const WIDTH = 640;
const HEIGHT = 432;

// ---- bench ----
const PLATE = { x: -272, y: -98, w: 544, d: 196, r: 12 };
const PLATE_H = 12;
const FOOT_Z = -21;
const FOOT_H = 9;

// ---- intake hopper (приём) ----
const HOP = { x: -252, y: -36, w: 58, d: 72, r: 3 };
const HOP_T = 5;
const HOP_FLOOR = 6;
const HOP_BACK = 34;
const HOP_FRONT = 11;
const HOP_SIDE = 30;
const HOP_EXIT = 8;
const HOP_CX = HOP.x + HOP.w / 2;
const HOP_CY = HOP.y + HOP.d / 2;

// ---- feed rail (подача) ----
const RAIL_Y = -2;
const RAIL_HALF = 9;
const RAIL_X0 = -196;
const RAIL_X1 = 104;
const RAIL_D = 5;
const RAIL_Z = 26;
const RAIL_BAR_H = 6;
const RAIL_TOP = RAIL_Z + RAIL_BAR_H;
const LEG_XS = [-176, -108, -40, 28, 96];

// ---- record tile ----
const REC_W = 24;
const REC_D = 28;
const REC_H = 3;
const RIDE_Z = RAIL_TOP + 8;
const RIDE_C = RIDE_Z + REC_H / 2;

// ---- registration gate (регистрация) ----
const REG_X = -168;

// ---- carriage ----
const CAR_REST_X = -138;
const CAR_W = 32;
const CAR_D = 28;

// ---- press (обработка) ----
const PRESS_X = -60;
const PRESS_COL = 8;
const PRESS_COL_DX = 30;
const PRESS_COL_Y = -32;
const PRESS_COL_D = 20;
const PRESS_COL_TOP = 76;
const BEAM_Z = 76;
const BEAM_H = 9;
const HEAD_Z0 = 85;
const HEAD_H = 26;
const STAMP_Z0 = 46;
const STAMP_H = 12;
const RAM_R = 4.8;
const GEAR_Z = 100;

// ---- turnout (развилка) ----
const DIV_X = 48;
const DIV_Y = -30;
const DIV_PIN_R = 3.4;
const DIV_VANE_L = 24;
const DIV_VANE_Z = 52;
const DIV_VANE_H = 14;

// ---- card-index cabinet (хранение) ----
const CAB = { x: 108, y: -86, w: 136, d: 78, r: 4 };
const CAB_T = 5;
const CAB_H = 74;
const DW = { x: CAB.x + CAB_T, y: CAB.y + CAB_T, w: CAB.w - 2 * CAB_T, d: CAB.d - 2 * CAB_T, r: 2 };
const DRAWER_Z0 = [10, 30, 50];
const DRAWER_H = 16;
const DRAWER_OUT = 16;

// ---- output tray (выдача) ----
const TRAY = { x: 112, y: 22, w: 128, d: 60, r: 4 };
const TRAY_T = 5;
const TRAY_FLOOR = 4;
const TRAY_WALL = 14;
const TRAY_LIP = 8;

// ---- counter dial ----
const DIAL = [-150, 66];
const DIAL_R = 15;
const DIAL_H = 9;

// ---- mode handwheel + feedback rod (обратная связь) ----
const POST = [10, 58];
const POST_R = 5;
const POST_TOP = 62;
const WHEEL_R = 15;
const WHEEL_Z0 = 62;
const WHEEL_Z1 = 68;
const WHEEL_PIN_R = 13;
const MODE_STEP_DEG = 30;
const SPOKES = 5;
const ROD_LOW = [148, 30, 20];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, FOOT_Z, 0),
    [HOP.x, HOP.y, HOP_BACK],
    [HOP.x + HOP.w, HOP.y + HOP.d, HOP_BACK],
    [PRESS_X - PRESS_COL_DX - PRESS_COL, -26, HEAD_Z0 + HEAD_H],
    [PRESS_X + PRESS_COL_DX + PRESS_COL, 18, HEAD_Z0 + HEAD_H],
    [CAB.x + CAB.w, CAB.y + CAB.d, CAB_H],
    [TRAY.x + TRAY.w, TRAY.y + TRAY.d, TRAY_T + TRAY_WALL],
    [POST[0], POST[1], WHEEL_Z1 + 6],
    [DIAL[0], DIAL[1], DIAL_H],
    [RAIL_X0, RAIL_Y, RAIL_TOP],
    [RAIL_X1, RAIL_Y, RAIL_TOP],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 48 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const VF = (cx, cy) => ({ o: [cx, cy, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] });

// ---- painter's layer, with recorded shapes for the audit ----
const R = A.recorder(P, {});
const put = (name, at3, svg, shapes, bias = 0) => {
  for (const shape of shapes) R.solid(shape);
  return R.put({ name, at: at3, bias, svg, shapes });
};

// ==== shared movable geometry =========================================================

function spokeRing(cx, cy, a, rIn, rOut, hw) {
  const u = [Math.cos(a), Math.sin(a)];
  const v = [-Math.sin(a), Math.cos(a)];
  const c = (s, t) => [cx + u[0] * s + v[0] * t, cy + u[1] * s + v[1] * t];
  return [c(rIn, -hw), c(rOut, -hw), c(rOut, hw), c(rIn, hw)];
}
function wheelBase(angleDeg) {
  return ((angleDeg - 90) * Math.PI) / 180;
}
function wheelRimSvg() {
  const cx = POST[0];
  const cy = POST[1];
  let out = S(G.ringBand(WHEEL_Z0, WHEEL_Z1, WHEEL_R - 3.4, WHEEL_R, VF(cx, cy), P), { tone: "mid" });
  out += S(k.cylinder(cx, cy, 6, WHEEL_Z0, 8, P, 32), { tone: "mid" });
  for (let s = 0; s < 4; s++) {
    const a = ((s * MODE_STEP_DEG - 90) * Math.PI) / 180;
    out += L(k.segment([cx + Math.cos(a) * (WHEEL_R - 3.2), cy + Math.sin(a) * (WHEEL_R - 3.2), WHEEL_Z1], [cx + Math.cos(a) * (WHEEL_R - 0.5), cy + Math.sin(a) * (WHEEL_R - 0.5), WHEEL_Z1], P), { tone: "lo" });
  }
  return out;
}
function wheelMarkup(angleDeg) {
  const cx = POST[0];
  const cy = POST[1];
  const base = wheelBase(angleDeg);
  let out = "";
  for (let i = 0; i < SPOKES; i++) {
    const a = base + Math.PI / 2 + (i * 2 * Math.PI) / SPOKES;
    out += S(k.extrude(spokeRing(cx, cy, a, 6, WHEEL_R - 3.4, 2), WHEEL_Z0 + 1, 4, P, { convex: true }), { tone: "mid" });
  }
  out += S(k.cylinder(cx + Math.cos(base) * WHEEL_PIN_R, cy + Math.sin(base) * WHEEL_PIN_R, 2.6, WHEEL_Z1, 4, P, 20), { tone: "hi" });
  out += L(k.segment([cx + Math.cos(base) * 6.4, cy + Math.sin(base) * 6.4, WHEEL_Z1 + 0.2], [cx + Math.cos(base) * (WHEEL_R - 0.6), cy + Math.sin(base) * (WHEEL_R - 0.6), WHEEL_Z1 + 0.2], P), { tone: "lit", free: "start" });
  return out;
}
function pinAt(angleDeg) {
  const a = wheelBase(angleDeg);
  return [POST[0] + Math.cos(a) * WHEEL_PIN_R, POST[1] + Math.sin(a) * WHEEL_PIN_R, WHEEL_Z1 + 2];
}
function rodMarkup(pin) {
  return (
    L(k.segment(ROD_LOW, pin, P), { tone: "mid", className: "rod-shaft" }) +
    L(k.ring(ROD_LOW[0], ROD_LOW[1], 2.6, ROD_LOW[2], P, 16), { tone: "lo" }) +
    L(k.ring(pin[0], pin[1], 2.6, pin[2], P, 16), { tone: "lo" })
  );
}
function bladeRing(deg) {
  const a = (deg * Math.PI) / 180;
  const u = [Math.cos(a), Math.sin(a)];
  const v = [-Math.sin(a), Math.cos(a)];
  const hw = 2;
  const c = (s, t) => [DIV_X + u[0] * s + v[0] * t, DIV_Y + u[1] * s + v[1] * t];
  return [c(DIV_PIN_R - 0.3, -hw), c(DIV_VANE_L, -hw), c(DIV_VANE_L, hw), c(DIV_PIN_R - 0.3, hw)];
}
function turnoutMarkup(deg) {
  return S(k.extrude(bladeRing(deg), DIV_VANE_Z, DIV_VANE_H, P, { convex: true }), { tone: "mid" });
}
function needleMarkup(turn) {
  const x = DIAL[0];
  const y = DIAL[1];
  const a = -Math.PI * 0.78 + turn * Math.PI * 1.56;
  return L(k.lineOnTop([x - Math.sin(a) * 2.4, y + Math.cos(a) * 2.4], [x + Math.sin(a) * (DIAL_R - 4), y - Math.cos(a) * (DIAL_R - 4)], DIAL_H + 0.3, P), { tone: "lit", free: "start" });
}

// ==== static machine ==================================================================

function buildBase() {
  let svg = `<path class="iso-halo" d="${k.haloOf(PLATE, FOOT_Z, FOOT_H + PLATE_H, P)}"/>`;
  const shapes = [];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    svg += S(k.cylinder(x, y, 8, FOOT_Z, 1.8, P, 28), { tone: "lo" });
    svg += S(k.cylinder(x, y, 6, FOOT_Z + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" });
    shapes.push(A.cylinder(x, y, 8, FOOT_Z, 1.8, { name: "stand.foot.plate" }));
    shapes.push(A.cylinder(x, y, 6, FOOT_Z + 1.8, FOOT_H - 1.8, { name: "stand.foot" }));
  }
  svg += S(k.slabOf(PLATE, FOOT_Z + FOOT_H, PLATE_H, P, 8, 1.6), { tone: "mid" });
  shapes.push(A.slab(PLATE, FOOT_Z + FOOT_H, PLATE_H, { name: "stand.base", ground: true }));
  svg += L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" });
  const screws = k.corners(PLATE, 14);
  svg += L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" });
  svg += D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
  // a ruler strip along the front edge of the bed
  const strip = { x: PLATE.x + 26, y: PLATE.y + PLATE.d - 15, w: PLATE.w - 52, d: 7, r: 1 };
  svg += S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" });
  const ticks = k.topTicks(strip.x + 6, strip.x + strip.w - 6, 5, 5, strip.y, 0.6, [2, 3.6], P);
  svg += L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
  shapes.push(A.slab(strip, 0, 0.6, { name: "stand.rule" }));
  // an engraved nameplate on the bed, left of the dial
  const plate2 = { x: -42, y: PLATE.y + PLATE.d - 22, w: 60, d: 12, r: 1.5 };
  svg += S(k.slabOf(plate2, 0, 0.9, P, 4), { tone: "lo", crease: "none" });
  svg += L(k.planOutline(k.insetPlan(plate2, 1.6), 0.9, P), { tone: "faint" });
  svg += L([34, 24, 28].map((w, i) => k.lineOnTop([plate2.x + 5, plate2.y + 3.4 + i * 2.8], [plate2.x + 5 + w, plate2.y + 3.4 + i * 2.8], 0.9, P)).join(""), { tone: "lo", free: true });
  svg += D([at([plate2.x + plate2.w - 3, plate2.y + 3, 0.9]), at([plate2.x + plate2.w - 3, plate2.y + plate2.d - 3, 0.9])], { size: 0.45 });
  shapes.push(A.slab(plate2, 0, 0.9, { name: "stand.nameplate" }));
  put("stand.base", [0, 0, 0], svg, shapes, 0.1);
}

function wallSlabs(prefix, parts, z0, shapes, inner = "") {
  let svg = "";
  for (const [name, plan, z1] of parts) {
    if (z1 <= z0) continue;
    svg += S(k.slabOf(plan, z0, z1 - z0, P, 3, 0.5), { tone: "mid", inner });
    shapes.push(A.slab(plan, z0, z1 - z0, { name: `${prefix}.${name}` }));
  }
  return svg;
}

function buildHopper() {
  const shapes = [];
  let svg = "";
  const inner = k.insetPlan(HOP, HOP_T);
  svg += S(k.slabOf(inner, 0, HOP_FLOOR, P, 4, 0.5), { tone: "lo" });
  shapes.push(A.slab(inner, 0, HOP_FLOOR, { name: "hopper.floor" }));
  const { x, y, w, d } = HOP;
  const seam = k.sideSeam(HOP, HOP_FLOOR + 1, P, 5);
  svg += wallSlabs("hopper", [
    ["left", { x, y, w: HOP_T, d, r: 1 }, HOP_SIDE],
    ["right", { x: x + w - HOP_T, y, w: HOP_T, d, r: 1 }, HOP_EXIT],
    ["back", { x: x + HOP_T, y, w: w - 2 * HOP_T, d: HOP_T, r: 1 }, HOP_BACK],
    ["front", { x: x + HOP_T, y: y + d - HOP_T, w: w - 2 * HOP_T, d: HOP_T, r: 1 }, HOP_FRONT],
  ], 0, shapes, seam);
  const lp = { x: HOP.x + 8, y: HOP.y - 0.4, w: 30, d: 0.8, r: 0.4 };
  svg += S(k.slabOf(lp, HOP_BACK, 0.7, P, 3), { tone: "lo", crease: "none" });
  svg += L([20, 14].map((w2, i) => k.lineOnTop([lp.x + 4, lp.y + 0.25 + i * 0.4], [lp.x + 4 + w2, lp.y + 0.25 + i * 0.4], HOP_BACK + 0.7, P)).join(""), { tone: "lo", free: true });
  shapes.push(A.slab(lp, HOP_BACK, 0.7, { name: "hopper.label" }));
  const lip = { x: HOP.x + HOP.w - HOP_T - 7, y: HOP.y + HOP_T, w: 6, d: HOP.d - 2 * HOP_T, r: 1 };
  svg += S(k.slabOf(lip, HOP_FLOOR, 3, P, 3), { tone: "mid" });
  shapes.push(A.slab(lip, HOP_FLOOR, 3, { name: "hopper.lip" }));
  put("hopper", [HOP_CX, HOP_CY, HOP_BACK / 2], svg, shapes);
}

function buildRail() {
  const shapes = [];
  let svg = "";
  for (const y of [RAIL_Y - RAIL_HALF, RAIL_Y + RAIL_HALF]) {
    const plan = { x: RAIL_X0, y: y - RAIL_D / 2, w: RAIL_X1 - RAIL_X0, d: RAIL_D, r: 1 };
    svg += S(k.slabOf(plan, RAIL_Z, RAIL_BAR_H, P, 3, 0.5), { tone: "mid" });
    shapes.push(A.slab(plan, RAIL_Z, RAIL_BAR_H, { name: "rail.bar" }));
    svg += D(LEG_XS.map((x) => at([x, y, RAIL_TOP])), { size: 0.42 });
  }
  put("rail", [(RAIL_X0 + RAIL_X1) / 2, RAIL_Y, RAIL_Z + RAIL_BAR_H / 2], svg, shapes);
  for (const x of LEG_XS) {
    const plan = { x: x - 4, y: RAIL_Y - RAIL_HALF - 6, w: 8, d: 2 * RAIL_HALF + 12, r: 2 };
    const cap = k.insetPlan(plan, -2);
    let svg2 = S(k.slabOf(plan, 0, RAIL_Z - 2, P, 3, 0.5), { tone: "mid" });
    svg2 += L(k.sideSeam(plan, 8, P, 3), { tone: "faint" });
    svg2 += S(k.slabOf(cap, RAIL_Z - 2, 2, P, 3, 0.4), { tone: "mid" });
    svg2 += D([at([x - 2, RAIL_Y - RAIL_HALF - 2, 0]), at([x + 2, RAIL_Y + RAIL_HALF + 2, 0])], { size: 0.42 });
    put(`leg@${x}`, [x, RAIL_Y, 12], svg2, [
      A.slab(plan, 0, RAIL_Z - 2, { name: "rail.leg" }),
      A.slab(cap, RAIL_Z - 2, 2, { name: "rail.leg.cap" }),
    ]);
  }
  for (const x of [RAIL_X0, RAIL_X1]) {
    const plan = { x: x - 4, y: RAIL_Y - RAIL_HALF - 3, w: 8, d: 2 * RAIL_HALF + 6, r: 1.5 };
    put(`stop@${x}`, [x, RAIL_Y, RAIL_TOP + 4], S(k.slabOf(plan, RAIL_TOP, 8, P, 3, 0.6), { tone: "mid" }) + D([at([x, RAIL_Y, RAIL_TOP + 8])], { size: 0.45 }), [
      A.slab(plan, RAIL_TOP, 8, { name: "rail.stop" }),
    ]);
  }
}

function buildRegister() {
  const shapes = [];
  let svg = "";
  for (const y of [RAIL_Y - RAIL_HALF, RAIL_Y + RAIL_HALF]) {
    const plan = { x: REG_X - 4, y: y - 3, w: 8, d: 6, r: 1 };
    svg += S(k.slabOf(plan, RAIL_TOP, 18, P, 3, 0.5), { tone: "mid" });
    shapes.push(A.slab(plan, RAIL_TOP, 18, { name: "register.post" }));
  }
  const bar = { x: REG_X - 6, y: RAIL_Y - RAIL_HALF - 5, w: 12, d: 2 * RAIL_HALF + 10, r: 2 };
  svg += S(k.slabOf(bar, RAIL_TOP + 18, 5, P, 3, 0.6), { tone: "mid" });
  shapes.push(A.slab(bar, RAIL_TOP + 18, 5, { name: "register.beam" }));
  const head = { x: REG_X - 7, y: RAIL_Y - 5, w: 14, d: 10, r: 2 };
  svg += S(k.slabOf(head, RAIL_TOP + 13, 5, P, 3, 0.6), { tone: "mid" });
  svg += L(k.ring(REG_X, RAIL_Y, 3, RAIL_TOP + 13, P, 20), { tone: "faint" });
  shapes.push(A.slab(head, RAIL_TOP + 13, 5, { name: "register.head" }));
  svg += D([at([REG_X, RAIL_Y, RAIL_TOP + 13])], { size: 0.5 });
  put("register", [REG_X, RAIL_Y, RAIL_TOP + 14], svg, shapes);
}

function gearSvg(cx, cy, cz, r, teeth) {
  const F = G.frameAlong([cx, cy, cz], [0, 1, 0]);
  const s0 = 0;
  const s1 = 6;
  let svg = S(G.disc(s0, s1, r, F, P), { tone: "mid", crease: "faint" });
  svg += L(G.ribsOf(F, s0, s1, r, teeth, P, { seams: true }), { tone: "faint" });
  svg += S(G.disc(s0 + 1, s1 - 1, r * 0.32, F, P), { tone: "hi" });
  return svg;
}

function buildPress() {
  const shapes = [];
  let svg = "";
  const colY0 = PRESS_COL_Y - PRESS_COL_D / 2;
  for (const sx of [-1, 1]) {
    const cx = PRESS_X + sx * PRESS_COL_DX;
    const pad = { x: cx - PRESS_COL - 3, y: colY0 - 3, w: 2 * (PRESS_COL + 3), d: PRESS_COL_D + 6, r: 2 };
    svg += S(k.slabOf(pad, 0, 4, P, 4, 0.6), { tone: "mid" });
    shapes.push(A.slab(pad, 0, 4, { name: "press.pad" }));
    const col = { x: cx - PRESS_COL, y: colY0, w: 2 * PRESS_COL, d: PRESS_COL_D, r: 2 };
    svg += S(k.slabOf(col, 4, PRESS_COL_TOP - 4, P, 3, 0.6), { tone: "mid" });
    svg += L(k.sideSeam(col, 44, P, 3), { tone: "faint" });
    shapes.push(A.slab(col, 4, PRESS_COL_TOP - 4, { name: "press.column" }));
    svg += D([at([cx, colY0, PRESS_COL_TOP]), at([cx, colY0 + PRESS_COL_D, PRESS_COL_TOP])], { size: 0.45 });
  }
  const beam = { x: PRESS_X - PRESS_COL_DX - PRESS_COL - 4, y: colY0 - 4, w: 2 * (PRESS_COL_DX + PRESS_COL + 4), d: RAIL_Y - colY0 + 4, r: 3 };
  svg += S(k.slabOf(beam, BEAM_Z, BEAM_H, P, 5, 1), { tone: "mid" });
  svg += L(k.sideSeam(beam, BEAM_Z + 3, P, 5), { tone: "faint" });
  shapes.push(A.slab(beam, BEAM_Z, BEAM_H, { name: "press.beam" }));
  svg += D([[beam.x + 8, beam.y + 8], [beam.x + beam.w - 8, beam.y + 8], [beam.x + 8, beam.y + beam.d - 8], [beam.x + beam.w - 8, beam.y + beam.d - 8]].map(([x, y]) => at([x, y, BEAM_Z + BEAM_H])), { size: 0.5 });
  const head = { x: PRESS_X - 30, y: colY0 - 2, w: 60, d: 36, r: 2 };
  svg += S(k.slabOf(head, HEAD_Z0, HEAD_H, P, 4, 0.7), { tone: "mid" });
  shapes.push(A.slab(head, HEAD_Z0, HEAD_H, { name: "press.head" }));
  svg += L(k.sideSeam(head, HEAD_Z0 + 6, P, 4), { tone: "faint" });
  for (const [cx, r, teeth] of [[PRESS_X - 13, 15, 20], [PRESS_X + 13, 11, 16]]) {
    const shaftF = G.frameAlong([cx, head.y + head.d, GEAR_Z], [0, 1, 0]);
    svg += S(G.disc(0, 8, 3, shaftF, P), { tone: "mid" });
    shapes.push(A.disc(shaftF, 0, 8, 3, { name: "press.shaft" }));
    svg += gearSvg(cx, head.y + head.d + 8, GEAR_Z, r, teeth);
    shapes.push(A.disc(G.frameAlong([cx, head.y + head.d + 8, GEAR_Z], [0, 1, 0]), 0, 6, r, { name: "press.gear" }));
  }
  const knobF = G.frameAlong([PRESS_X + 13, head.y + head.d + 14, GEAR_Z], [0, 1, 0]);
  svg += S(G.disc(0, 6, 3.2, knobF, P), { tone: "hi" });
  shapes.push(A.disc(knobF, 0, 6, 3.2, { name: "press.crank" }));
  svg += S(G.ringBand(BEAM_Z - 8, BEAM_Z, 4.9, 8, VF(PRESS_X, RAIL_Y), P), { tone: "mid" });
  shapes.push(A.ring(VF(PRESS_X, RAIL_Y), BEAM_Z - 8, BEAM_Z, 4.9, 8, { name: "press.collar" }));
  put("press", [PRESS_X, -6, 60], svg, shapes);
}

function buildTurnout() {
  const shapes = [];
  let svg = "";
  const post = { x: DIV_X - 5, y: DIV_Y - 34, w: 10, d: 10, r: 2 };
  svg += S(k.slabOf(post, 0, 40, P, 3, 0.6), { tone: "mid" });
  shapes.push(A.slab(post, 0, 40, { name: "turnout.post" }));
  const arm = { x: DIV_X - 5, y: DIV_Y - 34, w: 10, d: 34 - DIV_PIN_R, r: 2 };
  svg += S(k.slabOf(arm, 40, 6, P, 3, 0.5), { tone: "mid" });
  shapes.push(A.slab(arm, 40, 6, { name: "turnout.arm" }));
  svg += S(k.cylinder(DIV_X, DIV_Y, DIV_PIN_R, 34, 18, P, 22), { tone: "mid" });
  svg += L(k.knurl(DIV_X, DIV_Y, DIV_PIN_R, 34, 38, 22, P), { tone: "lo" });
  shapes.push(A.cylinder(DIV_X, DIV_Y, DIV_PIN_R, 34, 18, { name: "turnout.pin" }));
  put("turnout", [DIV_X, DIV_Y, 42], svg, shapes);
}

function drawerSvg(n) {
  const z0 = DRAWER_Z0[n];
  const { x, y, w, d } = DW;
  const t = 3;
  let svg = "";
  const shapes = [];
  svg += S(k.slabOf({ x, y, w, d, r: 2 }, z0, 2, P, 3, 0.4), { tone: "hi" });
  shapes.push(A.slab({ x, y, w, d, r: 2 }, z0, 2, { name: `drawer${n + 1}.base` }));
  const sides = [
    { x, y, w: t, d, r: 1 },
    { x: x + w - t, y, w: t, d, r: 1 },
    { x: x + t, y, w: w - 2 * t, d: t, r: 1 },
  ];
  for (const p of sides) {
    svg += S(k.slabOf(p, z0 + 2, DRAWER_H - 2, P, 3), { tone: "hi" });
    shapes.push(A.slab(p, z0 + 2, DRAWER_H - 2, { name: `drawer${n + 1}.wall` }));
  }
  const front = { x, y: y + d, w, d: t, r: 1.5 };
  svg += S(k.slabOf(front, z0, DRAWER_H, P, 3, 0.6), { tone: "hi" });
  shapes.push(A.slab(front, z0, DRAWER_H, { name: `drawer${n + 1}.front` }));
  const hx = x + w / 2;
  const hy = y + d + t + 2;
  svg += S(k.cylinder(hx, hy, 2.4, z0 + DRAWER_H - 7, 7, P, 20), { tone: "mid" });
  svg += L(k.knurl(hx, hy, 2.4, z0 + DRAWER_H - 7, z0 + DRAWER_H, 20, P), { tone: "lo" });
  shapes.push(A.cylinder(hx, hy, 2.4, z0 + DRAWER_H - 7, 7, { name: `drawer${n + 1}.pull` }));
  return { svg, shapes };
}

function buildCabinet() {
  const shapes = [];
  let svg = "";
  svg += S(k.slabOf(CAB, 0, 4, P, 5, 0.7), { tone: "mid" });
  shapes.push(A.slab(CAB, 0, 4, { name: "cabinet.base" }));
  const { x, y, w, d } = CAB;
  const seam = k.sideSeam(CAB, CAB_H - 5, P, 5);
  svg += wallSlabs("cabinet", [
    ["left", { x, y, w: CAB_T, d, r: 1 }, CAB_H],
    ["right", { x: x + w - CAB_T, y, w: CAB_T, d, r: 1 }, CAB_H],
    ["back", { x: x + CAB_T, y, w: w - 2 * CAB_T, d: CAB_T, r: 1 }, CAB_H],
  ], 4, shapes, seam);
  svg += S(k.slabOf(CAB, CAB_H, 3, P, 5, 0.7), { tone: "mid" });
  shapes.push(A.slab(CAB, CAB_H, 3, { name: "cabinet.top" }));
  for (const z of [6, 26, 46, 66]) {
    const shelf = { x: CAB.x + CAB_T, y: CAB.y + CAB_T, w: CAB.w - 2 * CAB_T, d: CAB.d - 2 * CAB_T, r: 2 };
    svg += S(k.slabOf(shelf, z, 4, P, 3, 0.4), { tone: "mid" });
    shapes.push(A.slab(shelf, z, 4, { name: "cabinet.shelf" }));
  }
  const tag = { x: CAB.x + 8, y: CAB.y + 8, w: 30, d: 8, r: 1 };
  svg += S(k.slabOf(tag, CAB_H + 3, 0.9, P, 3), { tone: "lo", crease: "none" });
  svg += L([20, 14, 17].map((w2, i) => k.lineOnTop([tag.x + 4, tag.y + 2.6 + i * 2.3], [tag.x + 4 + w2, tag.y + 2.6 + i * 2.3], CAB_H + 3.9, P)).join(""), { tone: "lo", free: true });
  shapes.push(A.slab(tag, CAB_H + 3, 0.9, { name: "cabinet.tag" }));
  put("cabinet", [CAB.x + CAB.w / 2, CAB.y + CAB.d / 2, CAB_H / 2], svg, shapes);
}

function buildTray() {
  const shapes = [];
  let svg = "";
  const inner = k.insetPlan(TRAY, TRAY_T);
  svg += S(k.slabOf(inner, 0, TRAY_FLOOR, P, 4, 0.5), { tone: "lo" });
  shapes.push(A.slab(inner, 0, TRAY_FLOOR, { name: "tray.floor" }));
  const { x, y, w, d } = TRAY;
  const seam = k.sideSeam(TRAY, TRAY_FLOOR + 2, P, 5);
  svg += wallSlabs("tray", [
    ["left", { x, y, w: TRAY_T, d, r: 1 }, TRAY_FLOOR + TRAY_WALL],
    ["right", { x: x + w - TRAY_T, y, w: TRAY_T, d, r: 1 }, TRAY_FLOOR + TRAY_WALL],
    ["back", { x: x + TRAY_T, y, w: w - 2 * TRAY_T, d: TRAY_T, r: 1 }, TRAY_FLOOR + TRAY_WALL],
    ["front", { x: x + TRAY_T, y: y + d - TRAY_T, w: w - 2 * TRAY_T, d: TRAY_T, r: 1 }, TRAY_LIP],
  ], 0, shapes, seam);
  const br = { x: ROD_LOW[0] - 5, y: TRAY.y + 2, w: 10, d: 8, r: 1.5 };
  svg += S(k.slabOf(br, TRAY_FLOOR + TRAY_WALL, 4, P, 3, 0.5), { tone: "mid" });
  shapes.push(A.slab(br, TRAY_FLOOR + TRAY_WALL, 4, { name: "tray.bracket" }));
  put("tray", [TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, TRAY_FLOOR + TRAY_WALL / 2], svg, shapes);
}

function buildDial() {
  const [x, y] = DIAL;
  const shapes = [];
  let svg = "";
  svg += S(k.cylinder(x, y, DIAL_R + 2, 0, 3, P, 44), { tone: "mid" });
  shapes.push(A.cylinder(x, y, DIAL_R + 2, 0, 3, { name: "dial.ring" }));
  svg += S(k.cylinder(x, y, DIAL_R, 3, DIAL_H - 3, P, 52, 0.8), { tone: "hi" });
  svg += L(k.knurl(x, y, DIAL_R, DIAL_H - 3, DIAL_H, 84, P, 0.3), { tone: "lo" });
  svg += L(k.sideArc(x, y, DIAL_R, DIAL_H - 3, P, 44), { tone: "faint" });
  svg += L(k.ring(x, y, DIAL_R - 2.2, DIAL_H, P, 60), { tone: "lo" });
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 25, 5, DIAL_H, [1.2, 2.6], P);
  svg += L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
  shapes.push(A.cylinder(x, y, DIAL_R, 3, DIAL_H - 3, { name: "dial.body" }));
  put("dial", [x, y, DIAL_H / 2], svg, shapes);
}

function buildFeedback() {
  const shapes = [];
  let svg = "";
  svg += S(k.cylinder(POST[0], POST[1], POST_R + 2, 0, 4, P, 28), { tone: "mid" });
  shapes.push(A.cylinder(POST[0], POST[1], POST_R + 2, 0, 4, { name: "post.base" }));
  svg += S(k.cylinder(POST[0], POST[1], POST_R, 4, POST_TOP - 4, P, 28), { tone: "mid" });
  svg += L(k.sideArc(POST[0], POST[1], POST_R, 24, P, 20), { tone: "faint" });
  shapes.push(A.cylinder(POST[0], POST[1], POST_R, 4, POST_TOP - 4, { name: "stand.post" }));
  // the wheel rim and hub are symmetric, so they are drawn once here; only the
  // spokes and the pointer turn, in the live wheel group below
  svg += wheelRimSvg();
  shapes.push(A.ring(VF(POST[0], POST[1]), WHEEL_Z0, WHEEL_Z1, WHEEL_R - 3.4, WHEEL_R, { name: "wheel.rim" }));
  shapes.push(A.cylinder(POST[0], POST[1], 6, WHEEL_Z0, 8, { name: "wheel.hub" }));
  const base = wheelBase(0);
  for (let i = 0; i < SPOKES; i++) {
    const a = base + Math.PI / 2 + (i * 2 * Math.PI) / SPOKES;
    R.solid(A.extruded(spokeRing(POST[0], POST[1], a, 6, WHEEL_R - 3.4, 2), WHEEL_Z0 + 1, 4, { name: "wheel.spoke" }));
  }
  const pin = pinAt(0);
  R.solid(A.cylinder(pin[0], pin[1], 2.6, WHEEL_Z1, 4, { name: "wheel.pin" }));
  put("feedback", [POST[0], POST[1], (POST_TOP + WHEEL_Z1) / 2], svg, shapes);
}

buildBase();
buildHopper();
buildRail();
buildRegister();
buildPress();
buildTurnout();
buildCabinet();
buildTray();
buildDial();
buildFeedback();

// ==== moving parts (groups rebuilt each frame, solids recorded at rest) ===============

function restPlan(i) {
  return { x: HOP_CX - REC_W / 2, y: HOP_CY - REC_D / 2, w: REC_W, d: REC_D, r: 2 };
}
function tileMarkup(i, lit) {
  const plan = restPlan(i);
  const z = HOP_FLOOR + REC_H * i;
  let svg = S(k.slabOf(plan, z, REC_H, P, 5, 0.4), { tone: "hi", crease: "faint", lit });
  svg += L(k.planOutline(k.insetPlan(plan, 2.4), z + REC_H, P), { tone: "faint" });
  svg += L([0, 1, 2].map((r) => k.lineOnTop([plan.x + 4, plan.y + 7 + r * 5], [plan.x + plan.w - 4, plan.y + 7 + r * 5], z + REC_H, P)).join(""), { tone: "faint", free: true });
  return svg;
}
const recordGroups = M.RECORDS.map((record, i) => {
  const plan = restPlan(i);
  const z = HOP_FLOOR + REC_H * i;
  R.solid(A.slab(plan, z, REC_H, { name: `record.${record.id}` }));
  return `<g data-part="rec${i}">${tileMarkup(i, false)}</g>`;
});

function carriageSVG() {
  const plan = { x: CAR_REST_X - CAR_W / 2, y: RAIL_Y - CAR_D / 2, w: CAR_W, d: CAR_D, r: 2 };
  let svg = S(k.slabOf(plan, RAIL_TOP, 6, P, 4, 0.6), { tone: "mid" });
  svg += L(k.sideSeam(plan, RAIL_TOP + 3, P, 4), { tone: "faint" });
  svg += D([[CAR_REST_X - 11, RAIL_Y - 9], [CAR_REST_X + 11, RAIL_Y - 9], [CAR_REST_X - 11, RAIL_Y + 9], [CAR_REST_X + 11, RAIL_Y + 9]].map(([x, y]) => at([x, y, RAIL_TOP + 6])), { size: 0.42 });
  R.solid(A.slab(plan, RAIL_TOP, 6, { name: "carriage.body" }));
  return svg;
}
const CARRIAGE_GROUP = `<g data-part="carriage">${carriageSVG()}</g>`;

function stampSVG() {
  const plan = { x: PRESS_X - 17, y: RAIL_Y - 13, w: 34, d: 26, r: 2 };
  let svg = S(k.slabOf(plan, STAMP_Z0, STAMP_H, P, 5, 0.6), { tone: "hi", crease: "lo" });
  svg += L(k.planOutline(k.insetPlan(plan, 2.6), STAMP_Z0 + STAMP_H, P), { tone: "faint" });
  for (let i = -1; i <= 1; i++) svg += L(k.lineOnTop([plan.x + 5, RAIL_Y + i * 6], [plan.x + plan.w - 5, RAIL_Y + i * 6], STAMP_Z0 + STAMP_H, P), { tone: "faint", free: true });
  const ramTop = BEAM_Z;
  svg += S(k.cylinder(PRESS_X, RAIL_Y, RAM_R, STAMP_Z0 + STAMP_H, ramTop - (STAMP_Z0 + STAMP_H), P, 28), { tone: "mid" });
  R.solid(A.slab(plan, STAMP_Z0, STAMP_H, { name: "stamp.head" }));
  R.solid(A.cylinder(PRESS_X, RAIL_Y, RAM_R, STAMP_Z0 + STAMP_H, ramTop - (STAMP_Z0 + STAMP_H), { name: "stamp.ram" }));
  return svg;
}
const STAMP_GROUP = `<g data-part="stamp">${stampSVG()}</g>`;

const DRAWER_GROUPS = DRAWER_Z0.map((_, n) => `<g data-part="drawer${n + 1}">${drawerSvg(n).svg}</g>`);

const WHEEL_GROUP = `<g data-part="wheelrot">${wheelMarkup(0)}</g>`;
const ROD_GROUP = `<g data-part="rod">${rodMarkup(pinAt(0))}</g>`;
R.solid(A.tube([ROD_LOW, pinAt(0)], 1.6, { name: "rod.shaft" }));
const TURNOUT_GROUP = `<g data-part="turnout-vane">${turnoutMarkup(-35)}</g>`;
R.solid(A.extruded(bladeRing(-35), DIV_VANE_Z, DIV_VANE_H, { name: "turnout.vane" }));

// ==== assemble ========================================================================

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

const art =
  R.items.map((it) => it.svg).join("") +
  [...DRAWER_GROUPS, ...recordGroups, CARRIAGE_GROUP, STAMP_GROUP, WHEEL_GROUP, ROD_GROUP, TURNOUT_GROUP].join("") +
  `<g data-needle>${needleMarkup(0)}</g>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Настольная машина обработки данных: слева приёмный магазин с плитками записей, над рельсом подачи воротца регистрации и каретка, в середине портальный пресс с парой шестерён в головке и штампом, за ним развилка, справа картотека с тремя выдвижными ящиками и лоток выдачи; на стойке спереди маховик режима со стрелкой, от лотка выдачи к маховику идёт тонкая тяга обратной связи, на станине циферблат счётчика обработанного.",
  body: art,
});

// ==== geometry data for the live page =================================================

const STATIONS = {
  рейка: [REG_X, RAIL_Y, RIDE_C],
  обработка: [PRESS_X, RAIL_Y, RIDE_C],
  развилка: [DIV_X, RAIL_Y, RIDE_C],
  подъём: [110, -36, 42],
  спуск: [104, 36, 22],
  ящик1: [DW.x + DW.w / 2, DW.y + DW.d / 2, DRAWER_Z0[0] + 2 + REC_H / 2],
  ящик2: [DW.x + DW.w / 2, DW.y + DW.d / 2, DRAWER_Z0[1] + 2 + REC_H / 2],
  ящик3: [DW.x + DW.w / 2, DW.y + DW.d / 2, DRAWER_Z0[2] + 2 + REC_H / 2],
  выдача1: [150, 50, TRAY_FLOOR + REC_H / 2],
  выдача2: [196, 50, TRAY_FLOOR + REC_H / 2],
};

const restCenter = M.RECORDS.map((_, i) => [HOP_CX, HOP_CY, HOP_FLOOR + REC_H * i + REC_H / 2]);
const DEST = M.RECORDS.map((record) => {
  const m = /^ящик(\d)$/.exec(M.destination(record));
  return m ? Number(m[1]) - 1 : -1;
});
const recordStops = M.RECORDS.map((record, i) =>
  record.stops.map((name) => (name === "магазин" ? restCenter[i] : STATIONS[name])),
);

// ==== live code =======================================================================

const live = `
const P = ${JSON.stringify(P)};
const RECORDS = ${JSON.stringify(M.RECORDS)};
const STOPS = ${JSON.stringify(recordStops)};
const DEST = ${JSON.stringify(DEST)};
const REST = ${JSON.stringify(restCenter)};
const CYCLE = ${JSON.stringify(M.CYCLE)};
const LAST = ${M.LAST};
const REC_W = ${REC_W};
const REC_D = ${REC_D};
const REC_H = ${REC_H};
const HOP_FLOOR = ${HOP_FLOOR};
const HOP_CX = ${HOP_CX};
const HOP_CY = ${HOP_CY};
const RAIL_Y = ${RAIL_Y};
const RAIL_TOP = ${RAIL_TOP};
const CAR_REST = ${CAR_REST_X};
const DIV_X = ${DIV_X};
const DIV_Y = ${DIV_Y};
const DIV_PIN_R = ${DIV_PIN_R};
const DIV_VANE_L = ${DIV_VANE_L};
const DIV_VANE_Z = ${DIV_VANE_Z};
const DIV_VANE_H = ${DIV_VANE_H};
const POST = ${JSON.stringify(POST)};
const WHEEL_R = ${WHEEL_R};
const WHEEL_Z0 = ${WHEEL_Z0};
const WHEEL_Z1 = ${WHEEL_Z1};
const WHEEL_PIN_R = ${WHEEL_PIN_R};
const SPOKES = ${SPOKES};
const MODE_STEP = ${MODE_STEP_DEG};
const ROD_LOW = ${JSON.stringify(ROD_LOW)};
const DIAL = ${JSON.stringify(DIAL)};
const DIAL_R = ${DIAL_R};
const DIAL_H = ${DIAL_H};
const DRAWERS = ${JSON.stringify(DRAWER_Z0)};
const DRAWER_OUT = ${DRAWER_OUT};
const VF = (cx, cy) => ({ o: [cx, cy, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] });
const spokeRing = ${spokeRing.toString().replace(/\bk\./g, "")};
const wheelBase = ${wheelBase.toString()};
const wheelMarkup = ${wheelMarkup.toString().replace(/\bk\./g, "").replace(/\bS\(/g, "solidSvg(").replace(/\bL\(/g, "lineSvg(")};
const pinAt = ${pinAt.toString()};
const rodMarkup = ${rodMarkup.toString().replace(/\bk\./g, "").replace(/\bL\(/g, "lineSvg(")};
const bladeRing = ${bladeRing.toString()};
const turnoutMarkup = ${turnoutMarkup.toString().replace(/\bk\./g, "").replace(/\bS\(/g, "solidSvg(")};
const needleMarkup = ${needleMarkup.toString().replace(/\bk\./g, "").replace(/\bL\(/g, "lineSvg(")};

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const recEls = RECORDS.map((_, i) => svg.querySelector('[data-part="rec' + i + '"]'));
const carEl = svg.querySelector('[data-part="carriage"]');
const stampEl = svg.querySelector('[data-part="stamp"]');
const drawerEls = [0, 1, 2].map((n) => svg.querySelector('[data-part="drawer' + (n + 1) + '"]'));
const wheelEl = svg.querySelector('[data-part="wheelrot"]');
const rodEl = svg.querySelector('[data-part="rod"]');
const vaneEl = svg.querySelector('[data-part="turnout-vane"]');
const needleEl = svg.querySelector('[data-needle]');

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function posOf(i, p) {
  const stops = STOPS[i];
  if (p <= 0) return stops[0].slice();
  if (p >= stops.length - 1) return stops[stops.length - 1].slice();
  const j = Math.floor(p);
  const t = p - j;
  return lerp(stops[j], stops[j + 1], t);
}
function atOf(s) {
  const c = clamp(s, 0, LAST);
  const kk = Math.min(LAST - 1, Math.floor(c));
  const t = c - kk;
  return CYCLE[0].at.map((_, i) => CYCLE[kk].at[i] + (CYCLE[kk + 1].at[i] - CYCLE[kk].at[i]) * t);
}
function countsAt(p) {
  const processed = p.filter((v) => v >= 2).length;
  let stored = 0;
  let output = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] < 5) continue;
    if (RECORDS[i].kind === "накопление") stored += 1;
    else output += 1;
  }
  return { processed, stored, output };
}
function phaseAt(p, target) {
  for (let i = 0; i < p.length; i++) {
    const v = p[i];
    if (v > 0.08 && v < 4.9 && Math.round(v) === 2) return "обработка";
  }
  return target;
}
function phaseOf(s) {
  return CYCLE[Math.round(clamp(s, 0, LAST))].phase;
}
function modeOf(s) {
  return CYCLE[Math.round(clamp(s, 0, LAST))].mode;
}
function readoutText(p, target, mode) {
  const c = countsAt(p);
  return "шаг: " + phaseAt(p, target) + " · обработано " + c.processed + " · в хранилище " + c.stored + " · выдано " + c.output + " · режим " + mode;
}
function tile(i, lit) {
  const plan = { x: HOP_CX - REC_W / 2, y: HOP_CY - REC_D / 2, w: REC_W, d: REC_D, r: 2 };
  const z = HOP_FLOOR + REC_H * i;
  const body = solidSvg(slabOf(plan, z, REC_H, P, 5, 0.4), { tone: "hi", crease: "faint", lit });
  const edge = lineSvg(planOutline(insetPlan(plan, 2.4), z + REC_H, P), { tone: "faint" });
  const rules = lineSvg([0, 1, 2].map((r) => lineOnTop([plan.x + 4, plan.y + 7 + r * 5], [plan.x + plan.w - 4, plan.y + 7 + r * 5], z + REC_H, P)).join(""), { tone: "faint", free: true });
  return body + edge + rules;
}

let target = 0;
let s = 0;
let p = CYCLE[0].at.slice();
let touring = !still.matches;
let clock = 0;
let tourClock = 1.4;
let tourStep = 0;
let frame = 0;
let last = 0;
let visible = false;
let idleTimer = 0;
let wheelAngle = 0;
let dtm = 1 / 60;

function wantAt(i) {
  if (s >= LAST - 0.02) return CYCLE[LAST].at[i];
  return atOf(clamp(s - i * 0.09, 0, LAST))[i];
}
function place() {
  const fills = [0, 0, 0];
  for (let n = 0; n < 3; n++) {
    for (let i = 0; i < p.length; i++) {
      if (DEST[i] === n) fills[n] = Math.max(fills[n], clamp((p[i] - 3.8) / 1.0, 0, 1));
    }
  }
  for (let i = 0; i < p.length; i++) {
    const want = wantAt(i);
    p[i] = still.matches ? want : p[i] + (want - p[i]) * (1 - Math.exp(-dtm / 0.16));
    if (Math.abs(want - p[i]) < 0.004) p[i] = want;
    const pos = posOf(i, p[i]);
    const base = REST[i];
    const carry = DEST[i] >= 0 ? DRAWER_OUT * fills[DEST[i]] : 0;
    recEls[i].setAttribute("transform", translateAlong(P, [pos[0] - base[0], pos[1] - base[1] + carry, pos[2] - base[2]]));
    const lit = Math.round(p[i]) === 2 && p[i] > 1.5 && p[i] < 2.5;
    recEls[i].innerHTML = tile(i, lit);
  }
  let carX = CAR_REST;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0.4 && p[i] < 3.6) carX = posOf(i, p[i])[0];
  }
  carEl.setAttribute("transform", translateAlong(P, [carX - CAR_REST, 0, 0]));
  let press = 0;
  for (let i = 0; i < p.length; i++) {
    const d = Math.abs(p[i] - 2);
    if (d < 1) press = Math.max(press, 1 - d);
  }
  stampEl.setAttribute("transform", translateAlong(P, [0, 0, -4.2 * (0.35 + 0.65 * Math.max(0, Math.sin(clock * 3.0))) * press]));
  for (let n = 0; n < 3; n++) {
    drawerEls[n].setAttribute("transform", translateAlong(P, [0, DRAWER_OUT * fills[n], 0]));
  }
  const c = countsAt(p);
  const mode = modeOf(s);
  const targetAngle = (mode - 1) * MODE_STEP;
  wheelAngle = still.matches ? targetAngle : wheelAngle + (targetAngle - wheelAngle) * (1 - Math.exp(-dtm / 0.10));
  wheelEl.innerHTML = wheelMarkup(wheelAngle);
  rodEl.innerHTML = rodMarkup(pinAt(wheelAngle));
  const vaneDeg = p.some((v, i) => RECORDS[i].kind === "накопление" && v > 3.4) ? -35 : 35;
  vaneEl.innerHTML = turnoutMarkup(vaneDeg);
  needleEl.innerHTML = needleMarkup(clamp(c.processed / 5, 0, 1));
  const text = readoutText(p, phaseOf(s), mode);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(s)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  dtm = dt;
  const calm = still.matches;
  if (touring) {
    tourClock -= dt;
    if (tourClock <= 0) {
      tourStep = (tourStep + 1) % (LAST + 1);
      target = tourStep;
      tourClock = tourStep === 0 ? 1.7 : 1.5;
    }
  }
  s = calm ? target : s + (target - s) * (1 - Math.exp(-dt / 0.42));
  if (Math.abs(target - s) < 0.002) s = target;
  clock += dt;
  place();
  const settled = !touring && Math.abs(target - s) < 0.003 && p.every((v, i) => Math.abs(wantAt(i) - v) < 0.01);
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
function takeOver(next) {
  touring = false;
  target = clamp(next, 0, LAST);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (still.matches) return;
    touring = true;
    tourClock = 1.2;
    run();
  }, 4200);
  run();
}
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const f = clamp((event.clientX - box.left) / box.width, 0, 1);
  takeOver(Math.round(f * LAST));
});
stage.addEventListener("pointerleave", () => {
  if (!touring) takeOver(target);
});
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.round(target) + 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.round(target) - 1;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = LAST;
  if (next === null) return;
  event.preventDefault();
  takeOver(next);
});
place();
`;

// ==== card ============================================================================

const css = `<style>
.rod-shaft{stroke-width:1.1px}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.iso-plate-corner[data-corner="readout"]{white-space:normal;text-align:right;max-width:64%;line-height:1.42;bottom:42px}
@media (max-width:600px){
.iso-plate{padding-bottom:96px}
.iso-plate-corner[data-corner="readout"]{font-size:9px;letter-spacing:0;max-width:80%;bottom:38px}
.iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px}
}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 1",
    title: "Машина ИС",
    hint: "Наведите или ← →, чтобы пройти цикл",
    readout: M.initial.text,
    keys: [
      { mark: "lit", label: "запись в обработке" },
      { mark: "raised", label: "данные в хранилище" },
    ],
    caption:
      "Одна и та же запись проходит приём, регистрацию и обработку, затем развилка маршрутизирует её: три записи остаются в хранилище, две выдаются как готовая информация. После выдачи тяга обратной связи доворачивает маховик на шаг 2.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Машина ИС: наведите или нажмите стрелки, чтобы пройти цикл обработки" aria-valuemin="0" aria-valuemax="${M.LAST}" aria-valuenow="0">${svg}</div>`,
  });

function build(theme) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: ID, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}

build("dark");
build("light");

A.auditOrExit(R, P, {});
