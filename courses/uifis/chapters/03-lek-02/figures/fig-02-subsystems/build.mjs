// Figure fig-02-subsystems, built with the Anatomy skill.
//
// Contract with course-studio (kept):
//   1. Kit imported from the vendored copy: ../../../../../_anatomy/kit/iso-kit.mjs
//   2. `node build.mjs` writes BOTH themes next to this file:
//        fig-02-subsystems.html        (dark)
//        fig-02-subsystems-light.html  (light)
//   3. `node build.mjs --audit` runs Anatomy's audit.
//   4. The card `fig` is "Fig 2".
//
// The object: a modular instrument case on a base plate. Along the front sit
// five functional bays, each a board with a lamp and its own small mechanism
// (register drum, slide carriage, turnout vane, dial and handwheel). Along the
// back, on a socket bus above the back wall, stand five support modules as
// removable cartridges, each with a tab that plugs into its socket. As a module
// is pushed home the bus feeds it to the bays, and a bay lights up only once
// every module it needs is seated.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../_anatomy/kit/lathe.mjs";
import * as A from "../../../../../_anatomy/kit/audit.mjs";
import { kitScript } from "../../../../../_anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-02-subsystems";
const WIDTH = 640;
const HEIGHT = 452;

// ---- base ----
const PLATE = { x: -250, y: -122, w: 500, d: 240, r: 12 };
const PLATE_H = 12;
const FOOT_Z = -21;
const FOOT_H = 9;
const STRIP = { x: PLATE.x + 26, y: PLATE.y + PLATE.d - 15, w: PLATE.w - 52, d: 7, r: 1 };
const NAMEPLATE = { x: -42, y: PLATE.y + PLATE.d - 22, w: 66, d: 12, r: 1.5 };

// ---- case ----
const CASE = { x: -196, y: -92, w: 392, d: 170, r: 6 };
const WALL_T = 8;
const WALL_TOP = 42;
const FLOOR_H = 8;
const SILL_TOP = 10;
const FLOOR = { x: CASE.x + WALL_T, y: CASE.y + WALL_T, w: CASE.w - 2 * WALL_T, d: CASE.d - 2 * WALL_T, r: 2 };

// ---- socket bus and support modules (along the back) ----
const BUS = { x: -196, y: -96, w: 392, d: 20, r: 3 };
const BUS_Z = WALL_TOP; // 42
const BUS_H = 8; // -> 50
const RISER_W = 60;
const RISER_D = 16;
const RISER_H = 6; // 50 -> 56
const TAB_W = 20;
const TAB_D = 10;
const TAB_Z = 56;
const TAB_H = 26; // -> 82
const BODY_W = 52;
const BODY_D = 14;
const BODY_Z = 82;
const BODY_H = 34; // -> 116
const HANDLE_W = 36;
const HANDLE_D = 12;
const HANDLE_H = 4; // 116 -> 120
const MOD_Y = -86;
const SEAT_DROP = 24;

// ---- bays along the front ----
const BAY_PITCH = 76.8;
const STEP = (i) => (i - 2) * BAY_PITCH;
const PART_X = (i) => (i - 2.5) * BAY_PITCH; // i = 1..4
const BOARD_Y = -72;
const BOARD_W = 60;
const BOARD_D = 6;
const BOARD_Z = FLOOR_H; // 8
const BOARD_H = 26; // -> 34
const BOARD_LAMP_Z = 20;
const BOARD_LABEL_Z = 28;

// ---- bay mechanisms ----
const MY = 15; // mechanism centre y
const PAD_W = 52;
const PAD_D = 34;
const PAD_Z = FLOOR_H; // 8
const PAD_H = 5; // -> 13

const DRUM_R = 9;
const DRUM_Z = 13;
const DRUM_H = 16; // -> 29

const RAIL_D = 8;
const RAIL_H = 3; // 13 -> 16
const CARRIAGE_W = 18;
const CARRIAGE_D = 14;
const CARRIAGE_Z = 16;
const CARRIAGE_H = 8; // -> 24
const CAR_SLIDE = 12;

const VANE_PIN_R = 4;
const VANE_LEN = 18;
const VANE_HW = 2.5;
const VANE_POST_H = 20; // 13 -> 33
const VANE_Z = 33;
const VANE_H = 5; // -> 38
const VANE_REST = -32;
const VANE_ON = 30;

const DIAL_R = 10;
const DIAL_Z = 13;
const DIAL_H = 5; // -> 18
const NEEDLE_REST = -62;
const NEEDLE_ON = 58;

const WHEEL_POST_H = 22; // 13 -> 35
const WHEEL_HUB_R = 4.5;
const WHEEL_HUB_Z = 35;
const WHEEL_HUB_H = 4; // -> 39
const WHEEL_R = 10;
const WHEEL_Z = 39;
const WHEEL_H = 4; // -> 43

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, FOOT_Z, 0),
    [CASE.x, CASE.y, WALL_TOP],
    [CASE.x + CASE.w, CASE.y, WALL_TOP],
    [CASE.x, CASE.y + CASE.d, 0],
    [CASE.x + CASE.w, CASE.y + CASE.d, 0],
    [BUS.x, BUS.y, BUS_Z + BUS_H],
    [BUS.x + BUS.w, BUS.y, BUS_Z + BUS_H],
    [STEP(0), MOD_Y, BODY_Z + BODY_H + HANDLE_H],
    [STEP(4), MOD_Y, BODY_Z + BODY_H + HANDLE_H],
    [STEP(4), MY, WHEEL_Z + WHEEL_H],
    [STEP(0), MY, DRUM_Z + DRUM_H],
    [PLATE.x, PLATE.y + PLATE.d, 0],
  ],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 47, elevation: 31 },
);

// ---- plans ----
const riserPlan = (i) => ({ x: STEP(i) - RISER_W / 2, y: MOD_Y - RISER_D / 2, w: RISER_W, d: RISER_D, r: 2 });
const tabPlan = (i) => ({ x: STEP(i) - TAB_W / 2, y: MOD_Y - TAB_D / 2, w: TAB_W, d: TAB_D, r: 1.5 });
const bodyPlan = (i) => ({ x: STEP(i) - BODY_W / 2, y: MOD_Y - BODY_D / 2, w: BODY_W, d: BODY_D, r: 3 });
const handlePlan = (i) => ({ x: STEP(i) - HANDLE_W / 2, y: MOD_Y - HANDLE_D / 2, w: HANDLE_W, d: HANDLE_D, r: 2 });
const boardPlan = (i) => ({ x: STEP(i) - BOARD_W / 2, y: BOARD_Y, w: BOARD_W, d: BOARD_D, r: 1.5 });
const padPlan = (i) => ({ x: STEP(i) - PAD_W / 2, y: MY - PAD_D / 2, w: PAD_W, d: PAD_D, r: 3 });
const railPlan = (i) => ({ x: STEP(i) - 24, y: MY - RAIL_D / 2, w: 48, d: RAIL_D, r: 2 });
const carriagePlan = (i) => ({ x: STEP(i) - CARRIAGE_W / 2, y: MY - CARRIAGE_D / 2, w: CARRIAGE_W, d: CARRIAGE_D, r: 2 });

// ---- painter's layer, with recorded shapes for the audit ----
const R = A.recorder(P, {});
const put = (name, at3, svg, shapes, bias = 0) => {
  for (const shape of shapes) R.solid(shape);
  return R.put({ name, at: at3, bias, svg, shapes });
};

// ==== shared movable geometry ====
function bladeRing(i, deg) {
  const cx = STEP(i);
  const a = (deg * Math.PI) / 180;
  const u = [Math.cos(a), Math.sin(a)];
  const v = [-Math.sin(a), Math.cos(a)];
  const c = (s2, t) => [cx + u[0] * s2 + v[0] * t, MY + u[1] * s2 + v[1] * t];
  return [c(VANE_PIN_R - 0.3, -VANE_HW), c(VANE_LEN, -VANE_HW), c(VANE_LEN, VANE_HW), c(VANE_PIN_R - 0.3, VANE_HW)];
}
function radialMark(cx, cy, r0, r1, deg, z) {
  const a = (deg * Math.PI) / 180;
  return k.lineOnTop([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], z, P);
}
function drumMarks(i, deg) {
  const cx = STEP(i);
  let out = "";
  for (let m = 0; m < 3; m++) out += radialMark(cx, MY, 3, DRUM_R, deg + m * 120, DRUM_Z + DRUM_H);
  return out;
}
function wheelMarks(i, deg) {
  const cx = STEP(i);
  let out = "";
  for (let m = 0; m < 4; m++) out += radialMark(cx, MY, 3, WHEEL_R, deg + m * 90, WHEEL_Z + WHEEL_H);
  return out;
}
function needleMark(i, deg) {
  return radialMark(STEP(i), MY, 2, DIAL_R, deg, DIAL_Z + DIAL_H + 0.3);
}

// ==== base ====
function buildBase() {
  let svg = `<path class="iso-halo" d="${k.haloOf(PLATE, FOOT_Z, FOOT_H + PLATE_H, P)}"/>`;
  const shapes = [];
  for (const [x, y] of byDepth(k.corners(PLATE, 26))) {
    svg += S(k.cylinder(x, y, 8, FOOT_Z, 1.8, P, 28), { tone: "lo" });
    svg += S(k.cylinder(x, y, 6, FOOT_Z + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" });
    shapes.push(A.cylinder(x, y, 8, FOOT_Z, 1.8, { name: "stand.foot.flange" }));
    shapes.push(A.cylinder(x, y, 6, FOOT_Z + 1.8, FOOT_H - 1.8, { name: "stand.foot" }));
  }
  svg += S(k.slabOf(PLATE, FOOT_Z + FOOT_H, PLATE_H, P, 9, 1.6), { tone: "mid" });
  shapes.push(A.slab(PLATE, FOOT_Z + FOOT_H, PLATE_H, { name: "stand.base", ground: true }));
  svg += L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" });
  const screws = k.corners(PLATE, 15);
  svg += L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" });
  svg += D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
  // ruler strip along the front edge
  svg += S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" });
  const ticks = k.topTicks(STRIP.x + 6, STRIP.x + STRIP.w - 6, 5, 5, STRIP.y, 0.6, [2, 3.6], P);
  svg += L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
  shapes.push(A.slab(STRIP, 0, 0.6, { name: "stand.rule" }));
  // engraved nameplate
  svg += S(k.slabOf(NAMEPLATE, 0, 0.9, P, 4), { tone: "lo", crease: "none" });
  svg += L(k.planOutline(k.insetPlan(NAMEPLATE, 1.6), 0.9, P), { tone: "faint" });
  svg += L([34, 26, 30].map((w, i) => k.lineOnTop([NAMEPLATE.x + 5, NAMEPLATE.y + 3.4 + i * 2.8], [NAMEPLATE.x + 5 + w, NAMEPLATE.y + 3.4 + i * 2.8], 0.9, P)).join(""), { tone: "lo", free: true });
  svg += D([at([NAMEPLATE.x + NAMEPLATE.w - 3, NAMEPLATE.y + 3, 0.9]), at([NAMEPLATE.x + NAMEPLATE.w - 3, NAMEPLATE.y + NAMEPLATE.d - 3, 0.9])], { size: 0.45 });
  shapes.push(A.slab(NAMEPLATE, 0, 0.9, { name: "stand.nameplate" }));
  put("stand.base", [0, 0, 0], svg, shapes, 0.1);
}

// ==== case ====
function buildCase() {
  let svg = S(k.slabOf(FLOOR, 0, FLOOR_H, P, 4, 0.6), { tone: "lo" });
  svg += L(k.planOutline(k.insetPlan(FLOOR, 3), FLOOR_H, P), { tone: "faint" });
  put("case.floor", [0, CASE.y + CASE.d / 2, FLOOR_H / 2], svg, [A.slab(FLOOR, 0, FLOOR_H, { name: "case.floor" })]);

  const back = { x: CASE.x + WALL_T, y: CASE.y, w: CASE.w - 2 * WALL_T, d: WALL_T, r: 2 };
  const left = { x: CASE.x, y: CASE.y, w: WALL_T, d: CASE.d, r: 3 };
  const right = { x: CASE.x + CASE.w - WALL_T, y: CASE.y, w: WALL_T, d: CASE.d, r: 3 };
  const sill = { x: CASE.x + WALL_T, y: CASE.y + CASE.d - WALL_T, w: CASE.w - 2 * WALL_T, d: WALL_T, r: 2 };

  let bsvg = S(k.slabOf(back, 0, WALL_TOP, P, 6, 1.2), { tone: "mid", inner: L(k.sideSeam(back, 22, P, 6), { tone: "faint" }) });
  put("case.back", [0, back.y + back.d / 2, WALL_TOP / 2], bsvg, [A.slab(back, 0, WALL_TOP, { name: "case.back" })]);

  let lsvg = S(k.slabOf(left, 0, WALL_TOP, P, 6, 1.2), { tone: "mid", inner: L(k.sideSeam(left, 30, P, 6), { tone: "faint" }) });
  put("case.left", [left.x + WALL_T / 2, left.y + left.d / 2, WALL_TOP / 2], lsvg, [A.slab(left, 0, WALL_TOP, { name: "case.left" })]);

  let rsvg = S(k.slabOf(right, 0, WALL_TOP, P, 6, 1.2), { tone: "mid", inner: L(k.sideSeam(right, 30, P, 6), { tone: "faint" }) });
  put("case.right", [right.x + WALL_T / 2, right.y + right.d / 2, WALL_TOP / 2], rsvg, [A.slab(right, 0, WALL_TOP, { name: "case.right" })]);

  const boltShapes = [];
  let bolts = "";
  for (const [x, y] of [
    [CASE.x + WALL_T / 2, CASE.y + CASE.d - 20],
    [CASE.x + CASE.w - WALL_T / 2, CASE.y + CASE.d - 20],
    [CASE.x + WALL_T / 2, CASE.y + CASE.d / 2],
    [CASE.x + CASE.w - WALL_T / 2, CASE.y + CASE.d / 2],
  ]) {
    bolts += S(k.cylinder(x, y, 2.4, WALL_TOP, 1.6, P, 16), { tone: "mid" });
    bolts += D([at([x, y, WALL_TOP + 1.6])], { size: 0.4 });
    boltShapes.push(A.cylinder(x, y, 2.4, WALL_TOP, 1.6, { name: "case.bolt" }));
  }
  put("case.bolts", [0, CASE.y + CASE.d / 2, WALL_TOP + 0.8], bolts, boltShapes);

  let ssvg = S(k.slabOf(sill, 0, SILL_TOP, P, 4, 0.8), { tone: "mid" });
  put("case.sill", [0, sill.y + sill.d / 2, SILL_TOP / 2], ssvg, [A.slab(sill, 0, SILL_TOP, { name: "case.sill" })]);

  // partitions between the bays, each its own item so depth stays compact
  for (let i = 1; i <= 4; i++) {
    const px = PART_X(i);
    const plan = { x: px - 4, y: CASE.y + WALL_T, w: 8, d: CASE.d - 2 * WALL_T, r: 1.5 };
    let psvg = S(k.slabOf(plan, FLOOR_H, WALL_TOP - FLOOR_H, P, 4, 0.7), { tone: "mid", inner: L(k.sideSeam(plan, FLOOR_H + 22, P, 4), { tone: "faint" }) });
    psvg += D([at([px, plan.y + 10, WALL_TOP]), at([px, plan.y + plan.d - 10, WALL_TOP])], { size: 0.4 });
    put(`case.partition${i}`, [px, plan.y + plan.d / 2, FLOOR_H + 16], psvg, [A.slab(plan, FLOOR_H, WALL_TOP - FLOOR_H, { name: `case.partition${i}` })]);
  }
}

// ==== socket bus ====
function buildBus() {
  const shapes = [];
  let svg = "";
  svg += S(k.slabOf(BUS, BUS_Z, BUS_H, P, 6, 0.8), { tone: "mid", inner: L(k.sideSeam(BUS, BUS_Z + 4, P, 6), { tone: "faint" }) });
  shapes.push(A.slab(BUS, BUS_Z, BUS_H, { name: "bus.rail" }));
  for (let i = 0; i < M.MODULES; i++) svg += D([at([STEP(i), BUS.y + BUS.d - 3, BUS_Z + BUS_H])], { size: 0.55 });
  put("bus", [0, BUS.y + BUS.d / 2, BUS_Z + BUS_H / 2], svg, shapes);
  for (let i = 0; i < M.MODULES; i++) {
    const plan = riserPlan(i);
    let rsvg = S(k.slabOf(plan, BUS_Z + BUS_H, RISER_H, P, 3, 0.5), { tone: "mid" });
    rsvg += L(k.planOutline(k.insetPlan(plan, 3), BUS_Z + BUS_H + RISER_H, P, 3), { tone: "faint" });
    rsvg += D([at([plan.x + 6, plan.y + RISER_D - 6, BUS_Z + BUS_H + RISER_H]), at([plan.x + plan.w - 6, plan.y + 6, BUS_Z + BUS_H + RISER_H])], { size: 0.45 });
    put(`socket${i}`, [STEP(i), MOD_Y, BUS_Z + BUS_H + RISER_H / 2], rsvg, [
      A.slab(plan, BUS_Z + BUS_H, RISER_H, { name: `socket${i}.riser` }),
    ]);
  }
}

// ==== support modules (moving) ====
function moduleSvg(i) {
  const cx = STEP(i);
  const front = MOD_Y + BODY_D / 2;
  let svg = S(k.slabOf(tabPlan(i), TAB_Z, TAB_H, P, 3, 0.5), { tone: "mid" });
  svg += S(k.slabOf(bodyPlan(i), BODY_Z, BODY_H, P, 4, 0.8), { tone: "hi", crease: "lo", inner: L(k.sideSeam(bodyPlan(i), BODY_Z + 9, P, 4), { tone: "faint" }) });
  svg += S(k.slabOf(handlePlan(i), BODY_Z + BODY_H, HANDLE_H, P, 3, 0.6), { tone: "mid" });
  svg += L(k.planOutline(k.insetPlan(handlePlan(i), 2), BODY_Z + BODY_H + HANDLE_H, P, 3), { tone: "faint" });
  svg += k.faceTextSvg(k.sideMatrix([cx, front], BODY_Z + 20, P, "left"), M.SUPPORT[i].short, { size: 6, tone: "mid", anchor: "middle" });
  return svg;
}
for (let i = 0; i < M.MODULES; i++) {
  put(`module${i}`, [STEP(i), MOD_Y, (TAB_Z + BODY_Z + BODY_H) / 2], `<g data-part="mod${i}" transform="${k.translateAlong(P, [0, 0, SEAT_DROP])}">${moduleSvg(i)}</g>`, [
    A.slab(tabPlan(i), TAB_Z, TAB_H, { name: `module${i}.tab` }),
    A.slab(bodyPlan(i), BODY_Z, BODY_H, { name: `module${i}.body` }),
    A.slab(handlePlan(i), BODY_Z + BODY_H, HANDLE_H, { name: `module${i}.handle` }),
  ]);
}

// ==== bay boards ====
function boardSvg(i) {
  const cx = STEP(i);
  const plan = boardPlan(i);
  const front = BOARD_Y + BOARD_D;
  let svg = S(k.slabOf(plan, BOARD_Z, BOARD_H, P, 3, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideSeam(plan, BOARD_Z + 20, P, 3), { tone: "faint" }) });
  const lp = at([cx, front + 1, BOARD_LAMP_Z]);
  svg += `<g class="bay-lamp" data-bay="${i}"><circle class="lamp-ring" cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="4.6"/><circle class="lamp-dot" cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="2.8"/></g>`;
  svg += k.faceTextSvg(k.sideMatrix([cx, front], BOARD_LABEL_Z, P, "left"), M.FUNCTIONAL[i].name, { size: 6, tone: "mid", anchor: "middle" });
  return svg;
}
for (let i = 0; i < M.BAYS; i++) {
  put(`board${i}`, [STEP(i), BOARD_Y + BOARD_D / 2, BOARD_Z + BOARD_H / 2], boardSvg(i), [
    A.slab(boardPlan(i), BOARD_Z, BOARD_H, { name: `board${i}` }),
  ]);
}

// ==== bay mechanisms ====
function bayMechanism(i) {
  const cx = STEP(i);
  const shapes = [];
  let svg = S(k.slabOf(padPlan(i), PAD_Z, PAD_H, P, 4, 0.6), { tone: "mid" });
  shapes.push(A.slab(padPlan(i), PAD_Z, PAD_H, { name: `bay${i}.pad` }));
  let move = "";
  if (i === 0) {
    svg += S(k.cylinder(cx, MY, DRUM_R, DRUM_Z, DRUM_H, P, 44, 0.6), { tone: "hi" });
    svg += L(k.knurl(cx, MY, DRUM_R, DRUM_Z, DRUM_Z + DRUM_H, 40, P, 0.25), { tone: "faint" });
    svg += L(k.ring(cx, MY, 3, DRUM_Z + DRUM_H, P, 20), { tone: "lo" });
    shapes.push(A.cylinder(cx, MY, DRUM_R, DRUM_Z, DRUM_H, { name: `bay${i}.drum` }));
    move = `<g data-part="mech${i}">${drumMarks(i, 0)}</g>`;
  } else if (i === 1) {
    svg += S(k.slabOf(railPlan(i), PAD_Z + PAD_H, RAIL_H, P, 3, 0.5), { tone: "mid" });
    svg += D([at([railPlan(i).x + 5, railPlan(i).y + RAIL_D / 2, PAD_Z + PAD_H + RAIL_H]), at([railPlan(i).x + railPlan(i).w - 5, railPlan(i).y + RAIL_D / 2, PAD_Z + PAD_H + RAIL_H])], { size: 0.4 });
    shapes.push(A.slab(railPlan(i), PAD_Z + PAD_H, RAIL_H, { name: `bay${i}.rail` }));
    let c = S(k.slabOf(carriagePlan(i), CARRIAGE_Z, CARRIAGE_H, P, 3, 0.6), { tone: "hi" });
    c += L(k.planOutline(k.insetPlan(carriagePlan(i), 2.4), CARRIAGE_Z + CARRIAGE_H, P, 3), { tone: "faint" });
    move = `<g data-part="mech${i}">${c}</g>`;
    shapes.push(A.slab(carriagePlan(i), CARRIAGE_Z, CARRIAGE_H, { name: `bay${i}.carriage` }));
  } else if (i === 2) {
    svg += S(k.cylinder(cx, MY, VANE_PIN_R, PAD_Z + PAD_H, VANE_POST_H, P, 28, 0.5), { tone: "mid" });
    svg += L(k.sideArc(cx, MY, VANE_PIN_R, VANE_Z - 8, P, 20), { tone: "faint" });
    shapes.push(A.cylinder(cx, MY, VANE_PIN_R, PAD_Z + PAD_H, VANE_POST_H, { name: `bay${i}.post` }));
    move = `<g data-part="mech${i}">${S(k.extrude(bladeRing(i, VANE_REST), VANE_Z, VANE_H, P, { convex: true }), { tone: "hi" })}</g>`;
    shapes.push(A.extruded(bladeRing(i, VANE_REST), VANE_Z, VANE_H, { name: `bay${i}.vane` }));
  } else if (i === 3) {
    svg += S(k.cylinder(cx, MY, DIAL_R, DIAL_Z, DIAL_H, P, 52, 0.8), { tone: "hi", crease: "lo" });
    svg += L(k.sideArc(cx, MY, DIAL_R, DIAL_Z + DIAL_H - 1.4, P, 44), { tone: "faint" });
    const ticks = k.radialTicks(cx, MY, DIAL_R, 16, 4, DIAL_Z + DIAL_H, [1, 2], P);
    svg += L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
    svg += L(k.ring(cx, MY, 2, DIAL_Z + DIAL_H, P, 16), { tone: "mid" });
    shapes.push(A.cylinder(cx, MY, DIAL_R, DIAL_Z, DIAL_H, { name: `bay${i}.dial` }));
    move = `<g data-part="mech${i}">${needleMark(i, NEEDLE_REST)}</g>`;
  } else {
    svg += S(k.cylinder(cx, MY, VANE_PIN_R, PAD_Z + PAD_H, WHEEL_POST_H, P, 28, 0.5), { tone: "mid" });
    svg += L(k.sideArc(cx, MY, VANE_PIN_R, WHEEL_POST_H - 6, P, 20), { tone: "faint" });
    shapes.push(A.cylinder(cx, MY, VANE_PIN_R, PAD_Z + PAD_H, WHEEL_POST_H, { name: `bay${i}.post` }));
    svg += S(k.cylinder(cx, MY, WHEEL_HUB_R, WHEEL_HUB_Z, WHEEL_HUB_H, P, 28), { tone: "mid" });
    shapes.push(A.cylinder(cx, MY, WHEEL_HUB_R, WHEEL_HUB_Z, WHEEL_HUB_H, { name: `bay${i}.hub` }));
    svg += S(k.cylinder(cx, MY, WHEEL_R, WHEEL_Z, WHEEL_H, P, 56, 0.8), { tone: "hi", crease: "lo" });
    svg += L(k.knurl(cx, MY, WHEEL_R, WHEEL_Z, WHEEL_Z + WHEEL_H, 44, P, 0.25), { tone: "faint" });
    svg += L(k.ring(cx, MY, WHEEL_R - 1.6, WHEEL_Z + WHEEL_H, P, 56), { tone: "lo" });
    svg += L(k.ring(cx, MY, 2, WHEEL_Z + WHEEL_H, P, 16), { tone: "mid" });
    shapes.push(A.cylinder(cx, MY, WHEEL_R, WHEEL_Z, WHEEL_H, { name: `bay${i}.wheel` }));
    move = `<g data-part="mech${i}">${wheelMarks(i, 0)}</g>`;
  }
  svg += move;
  put(`bay${i}.unit`, [cx, MY, 24], svg, shapes);
}

buildBase();
buildCase();
buildBus();
for (let i = 0; i < M.BAYS; i++) bayMechanism(i);

// ==== assemble ====
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

const art = R.items.map((it) => it.svg).join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Модульный корпус информационной системы: вдоль переднего края пять функциональных отсеков (Учёт, Расчёт, Выдача, Решение, Управление), на задней шине пять сменных модулей обеспечения (техническое, программное, информационное, организационное, правовое). Отсек включается, когда вставлены все нужные ему модули обеспечения.",
  body: art,
});

// ==== live code ====
const live = `
const P = ${JSON.stringify(P)};
const SUPPORT = ${JSON.stringify(M.SUPPORT)};
const FUNCTIONAL = ${JSON.stringify(M.FUNCTIONAL)};
const MODULES = ${M.MODULES};
const LAST = ${M.LAST};
const SEAT_DROP = ${SEAT_DROP};
const CX = ${JSON.stringify(M.SUPPORT.map((_, i) => STEP(i)))};
const MY = ${MY};
const DRUM_R = ${DRUM_R};
const DRUM_Z = ${DRUM_Z}, DRUM_H = ${DRUM_H};
const CAR_SLIDE = ${CAR_SLIDE};
const VANE_Z = ${VANE_Z}, VANE_H = ${VANE_H}, VANE_PIN_R = ${VANE_PIN_R}, VANE_LEN = ${VANE_LEN}, VANE_HW = ${VANE_HW};
const VANE_REST = ${VANE_REST}, VANE_ON = ${VANE_ON};
const DIAL_R = ${DIAL_R}, DIAL_Z = ${DIAL_Z}, DIAL_H = ${DIAL_H};
const NEEDLE_REST = ${NEEDLE_REST}, NEEDLE_ON = ${NEEDLE_ON};
const WHEEL_R = ${WHEEL_R}, WHEEL_Z = ${WHEEL_Z}, WHEEL_H = ${WHEEL_H};

function radialMark(cx, cy, r0, r1, deg, z) {
  const a = (deg * Math.PI) / 180;
  return lineOnTop([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], z, P);
}
function drumMarks(i, deg) {
  const cx = CX[i];
  let out = "";
  for (let m = 0; m < 3; m++) out += radialMark(cx, MY, 3, DRUM_R, deg + m * 120, DRUM_Z + DRUM_H);
  return out;
}
function wheelMarks(i, deg) {
  const cx = CX[i];
  let out = "";
  for (let m = 0; m < 4; m++) out += radialMark(cx, MY, 3, WHEEL_R, deg + m * 90, WHEEL_Z + WHEEL_H);
  return out;
}
function needleMark(i, deg) {
  return radialMark(CX[i], MY, 2, DIAL_R, deg, DIAL_Z + DIAL_H + 0.3);
}
function bladeRingLive(i, deg) {
  const cx = CX[i];
  const a = (deg * Math.PI) / 180;
  const u = [Math.cos(a), Math.sin(a)];
  const v = [-Math.sin(a), Math.cos(a)];
  const c = (s2, t) => [cx + u[0] * s2 + v[0] * t, MY + u[1] * s2 + v[1] * t];
  return [c(VANE_PIN_R - 0.3, -VANE_HW), c(VANE_LEN, -VANE_HW), c(VANE_LEN, VANE_HW), c(VANE_PIN_R - 0.3, VANE_HW)];
}
function vaneMarkup(i, deg) {
  return solidSvg(extrude(bladeRingLive(i, deg), VANE_Z, VANE_H, P, { convex: true }), { tone: "hi" });
}

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const modEls = SUPPORT.map((_, i) => svg.querySelector('[data-part="mod' + i + '"]'));
const lampEls = FUNCTIONAL.map((_, i) => svg.querySelector('.bay-lamp[data-bay="' + i + '"]'));
const drumEl = svg.querySelector('[data-part="mech0"]');
const sliderEl = svg.querySelector('[data-part="mech1"]');
const vaneEl = svg.querySelector('[data-part="mech2"]');
const needleEl = svg.querySelector('[data-part="mech3"]');
const wheelEl = svg.querySelector('[data-part="mech4"]');

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function shareOf(s, i) { return clamp(s - i, 0, 1); }
function sharesOf(s) { return SUPPORT.map((_, i) => shareOf(s, i)); }
function inserted(s) { return sharesOf(s).filter((v) => v >= 1 - 1e-3).length; }
function isMid(s) { return sharesOf(s).some((v) => v > 1e-3 && v < 1 - 1e-3); }
function bayFlags(sh) {
  return FUNCTIONAL.map((b) => b.needs.every((id) => sh[SUPPORT.findIndex((m) => m.id === id)] >= 1 - 1e-3));
}
function wordOf(s) {
  if (isMid(s)) return "идёт вставка";
  if (inserted(s) === 0) return "корпус пуст";
  if (inserted(s) === MODULES) return "обеспечения хватает";
  return "не хватает обеспечения";
}
function readoutText(s) {
  const on = bayFlags(sharesOf(s)).filter(Boolean).length;
  return wordOf(s) + " · модулей " + inserted(s) + " из " + MODULES + " · отсеков " + on + " из " + FUNCTIONAL.length;
}

let target = 0;
let s = 0;
let touring = !still.matches;
let clock = 0;
let tourClock = 1.4;
let tourStep = 0;
let frame = 0;
let last = 0;
let visible = false;
let idleTimer = 0;
let dtm = 1 / 60;
let drumDeg = 0;
let wheelDeg = 0;
let carX = 0;
let vaneDeg = VANE_REST;
let needleDeg = NEEDLE_REST;
let litIdx = -1;

function setLit(el, on) {
  el.querySelectorAll(".iso-solid").forEach((node) => (on ? node.setAttribute("data-seat", "") : node.removeAttribute("data-seat")));
}

function place() {
  const sh = sharesOf(s);
  let best = 0.5;
  let lit = -1;
  for (let i = 0; i < MODULES; i++) {
    const drop = (1 - sh[i]) * SEAT_DROP;
    modEls[i].setAttribute("transform", translateAlong(P, [0, 0, drop]));
    if (sh[i] > 1e-3 && sh[i] < 1 - 1e-3) {
      const d = Math.abs(sh[i] - 0.5);
      if (d < best) { best = d; lit = i; }
    }
  }
  if (lit !== litIdx) {
    for (let i = 0; i < MODULES; i++) setLit(modEls[i], i === lit);
    litIdx = lit;
  }
  const flags = bayFlags(sh);
  for (let i = 0; i < FUNCTIONAL.length; i++) {
    const el = lampEls[i];
    if (!el) continue;
    if (flags[i]) el.setAttribute("data-on", "");
    else el.removeAttribute("data-on");
  }
  if (flags[0]) drumDeg = (drumDeg + dtm * 46) % 360;
  drumEl.innerHTML = drumMarks(0, drumDeg);
  const carTarget = flags[1] ? CAR_SLIDE * Math.sin(clock * 1.7) : 0;
  carX = still.matches ? carTarget : carX + (carTarget - carX) * (1 - Math.exp(-dtm / 0.14));
  sliderEl.setAttribute("transform", translateAlong(P, [carX, 0, 0]));
  const vaneTarget = flags[2] ? VANE_ON : VANE_REST;
  vaneDeg = still.matches ? vaneTarget : vaneDeg + (vaneTarget - vaneDeg) * (1 - Math.exp(-dtm / 0.16));
  vaneEl.innerHTML = vaneMarkup(2, vaneDeg);
  const needleTarget = flags[3] ? NEEDLE_ON : NEEDLE_REST;
  needleDeg = still.matches ? needleTarget : needleDeg + (needleTarget - needleDeg) * (1 - Math.exp(-dtm / 0.18));
  needleEl.innerHTML = needleMark(3, needleDeg);
  if (flags[4]) wheelDeg = (wheelDeg + dtm * 62) % 90;
  wheelEl.innerHTML = wheelMarks(4, wheelDeg);
  const text = readoutText(s);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(s * 10) / 10));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  dtm = dt;
  if (touring) {
    tourClock -= dt;
    if (tourClock <= 0) {
      tourStep = (tourStep + 1) % (LAST + 1);
      target = tourStep;
      tourClock = tourStep === 0 ? 1.8 : 1.4;
    }
  }
  s = still.matches ? target : s + (target - s) * (1 - Math.exp(-dt / 0.42));
  if (Math.abs(target - s) < 0.006) s = target;
  clock += dt;
  place();
  const settled = !touring && s === target;
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
  takeOver(f * LAST);
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

// ==== card ====
const css = `<style>
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.bay-lamp .lamp-dot{fill:var(--anatomy-lo)}
.bay-lamp .lamp-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.7}
.bay-lamp[data-on] .lamp-dot{fill:var(--anatomy-green)}
.bay-lamp[data-on] .lamp-ring{stroke:var(--anatomy-green);stroke-width:.9}
.iso-solid[data-seat]>.iso-fill{fill:var(--anatomy-face)}
.iso-solid[data-seat]>.iso-edge{stroke:var(--anatomy-green)}
.iso-plate-corner[data-corner="readout"]{white-space:normal;text-align:right;max-width:60%;line-height:1.42;bottom:42px}
@media (max-width:600px){
.iso-plate{padding-bottom:96px}
.iso-plate-corner[data-corner="readout"]{font-size:9px;letter-spacing:0;max-width:82%;bottom:38px}
.iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px}
}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 2",
    title: "Состав ИС",
    hint: "Наведите или ← →, чтобы вставить модули",
    readout: M.initial.text,
    keys: [
      { mark: "green", label: "отсек включён" },
      { mark: "raised", label: "модуль обеспечения" },
    ],
    caption:
      "Отсек начинает работать, когда вставлены все нужные ему модули обеспечения. После технического, программного и информационного включаются Учёт и Расчёт, после организационного добавляются Выдача и Решение, а после правового работает Управление.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Модульный корпус ИС: наведите или нажмите стрелки, чтобы вставлять модули обеспечения и включать отсеки" aria-valuemin="0" aria-valuemax="${M.LAST}" aria-valuenow="0">${svg}</div>`,
  });

function build(theme) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: ID, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}

build("dark");
build("light");

A.auditOrExit(R, P, {});
