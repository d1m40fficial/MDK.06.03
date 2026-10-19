// Figure fig-01-classifier, built with the Anatomy skill.
//
// Contract with course-studio (keep these, replace everything else by following Anatomy's ANATOMY.md
// and its closest example: ../../../../../_anatomy/examples/dial-indicator/build.mjs is vendored; the others are
// listed in ../../../../../_anatomy/SOURCE.txt):
//   1. Import the kit from the vendored copy: ../../../../../_anatomy/kit/iso-kit.mjs
//   2. `node build.mjs` writes BOTH themes next to this file (Anatomy's examples use a `--light`
//      flag instead; here one run makes both, so point Anatomy's capture commands at each file):
//        fig-01-classifier.html        (dark)
//        fig-01-classifier-light.html  (light)
//      build_chapter.py embeds whichever matches the reader's theme.
//   3. `node build.mjs --audit` runs Anatomy's audit when the figure has pipes, cables or round parts.
//   4. The card's `fig` is "Fig n", n = this figure's position in the chapter (see brief.md).
//
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../_anatomy/kit/lathe.mjs";
import * as A from "../../../../../_anatomy/kit/audit.mjs";
import { kitScript } from "../../../../../_anatomy/scripts/inline-kit.mjs";
import { TRAITS, CARDS, indices, readout } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-01-classifier";
const WIDTH = 600;
const HEIGHT = 420;

// ---- bench ----
const PLATE = { x: -272, y: -98, w: 544, d: 218, r: 12 };
const PLATE_H = 12;
const FOOT_Z = -20;
const FOOT_H = 8;

// ---- frame, rollers, belt ----
const RAIL_Y = 66;
const RAIL_D = 8;
const RAIL_Z = 30;
const RAIL_H = 10;
const RAIL_TOP = RAIL_Z + RAIL_H;
const ROLL_R = 11;
const ROLL_Z = 42;
const ROLL_SPAN = 124;
const ROLL_XS = [-210, -152, -94, -36, 22, 80, 138, 196];
const DRUM_XS = [-222, 214];
const BELT_X0 = -222;
const BELT_X1 = 214;
const BELT_Z = 53;
const BELT_H = 3.5;
const BELT_TOP = BELT_Z + BELT_H;
const LEG_XS = [-224, -112, 0, 112, 224];

// ---- gate towers ----
const ARM_Z = 61.5;
const ARM_H = 4;
const BLADE_Z = 58.8;
const BLADE_H = 2.7;
const HOUSING_Z = 65.5;
const HOUSING_H = 8;
const BEAM_Z = 73.5;
const BEAM_H = 6;
const DIALBASE_Z = 79.5;
const DIAL_Z = 82.5;
const DIAL_H = 5;
const DIAL_TOP = DIAL_Z + DIAL_H;
const DIAL_R = 11;

// ---- class cells (a row in front of each gate) ----
const CELL_Y = 84;
const CELL_D = 22;
const CELL_H = 12;
const CELL_LIFT = 7;
const SPACING = [24, 30, 54];

// ---- feed chute, output bin, counter, motor ----
const CHUTE = { x: -270, y: -30, w: 34, d: 60, r: 3 };
const CHUTE_Z = 52;
const CHUTE_H = 8;
const BIN = { x: 214, y: -30, w: 48, d: 60, r: 4 };
const BIN_H = 30;
const BIN_WALL = 5;
const COUNTER = { x: 172, y: 74, w: 40, d: 20, r: 3 };
const COUNTER_H = 18;
const MOTOR = { x: -268, y: -90, w: 30, d: 18, r: 3 };
const MOTOR_H = 20;

const CARD_X0 = -210;
const CARD_H = 2;
const CARD_TOP = BELT_TOP + CARD_H;

const GATES = [
  { trait: 0, x: -110 },
  { trait: 1, x: 0 },
  { trait: 2, x: 110 },
];

for (const g of GATES) {
  const n = TRAITS[g.trait].values.length;
  const spacing = SPACING[g.trait];
  const cw = spacing - 4;
  g.cells = Array.from({ length: n }, (_, i) => {
    const cx = g.x + (i - (n - 1) / 2) * spacing;
    return { x: cx - cw / 2, y: CELL_Y - CELL_D / 2, w: cw, d: CELL_D, r: 3, cx, cy: CELL_Y };
  });
  g.angles = g.cells.map((c) => Math.atan2(c.cx - g.x, -c.cy));
}
const REST_ANGLES = GATES.map((g) => g.angles[indices(CARDS[0])[g.trait]]);
const CARD_ANGLES = CARDS.map((card) => GATES.map((g) => g.angles[TRAITS[g.trait].values.indexOf(card.values[g.trait])]));
const READOUTS = CARDS.map(readout);

// ---- camera ----
const POINTS = [
  ...k.boxCorners(PLATE, FOOT_Z, 0),
  ...GATES.flatMap((g) => [
    [g.x - 14, -14, DIAL_TOP + 1],
    [g.x + 14, 14, DIAL_TOP + 1],
  ]),
  [CHUTE.x, CHUTE.y, CHUTE_Z + CHUTE_H + 1],
  [BIN.x + BIN.w, BIN.y + BIN.d, BIN_H],
  [MOTOR.x, MOTOR.y, MOTOR_H],
];
const P = k.fitProjection(POINTS, WIDTH, HEIGHT, { pad: 30, azimuth: 48 });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ---- movable geometry, shared between the static build and the live page ----
function armRings(px, py, th) {
  const rot = (pts) => pts.map(([x, y]) => {
    const dx = x - px;
    const dy = y - py;
    const c = Math.cos(th);
    const s = Math.sin(th);
    return [px + dx * c - dy * s, py + dx * s + dy * c];
  });
  const bar = rot(k.ringOf({ x: px - 3, y: py - 24, w: 6, d: 17, r: 2 }, 2));
  const blade = rot(k.ringOf({ x: px - 8, y: py - 27, w: 16, d: 4, r: 1.5 }, 2));
  return { bar, blade };
}
function armSvg(px, py, th) {
  const { bar, blade } = armRings(px, py, th);
  return S(k.extrude(bar, ARM_Z, ARM_H, P), { tone: "mid", crease: "faint" }) + S(k.extrude(blade, BLADE_Z, BLADE_H, P), { tone: "hi", crease: "lo" });
}
function needleD(px, py, th) {
  const dx = Math.sin(th);
  const dy = -Math.cos(th);
  return k.lineOnTop([px - dx * 3.4, py - dy * 3.4], [px + dx * (DIAL_R - 2.6), py + dy * (DIAL_R - 2.6)], DIAL_TOP + 0.25, P);
}

// ---- painter's layer, with recorded shapes for the audit ----
const R = A.recorder(P, {});
const put = (name, at3, svg, shapes, bias = 0) => R.put({ name, at: at3, bias, svg, shapes });

function rollAt(x, name, extra = "") {
  const F = G.frameAlong([x, 0, ROLL_Z], [0, 1, 0]);
  const svg = S(G.disc(-ROLL_SPAN / 2, ROLL_SPAN / 2, ROLL_R, F, P), { tone: "mid", crease: "faint" }) + extra;
  put(name, [x, 0, ROLL_Z], svg, [A.disc(F, -ROLL_SPAN / 2, ROLL_SPAN / 2, ROLL_R, { name })]);
}

function buildBase() {
  let svg = `<path class="iso-halo" d="${k.haloOf(PLATE, FOOT_Z, PLATE_H, P)}"/>`;
  const shapes = [];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    svg += S(k.cylinder(x, y, 7, FOOT_Z, 1.6, P, 28), { tone: "lo" });
    svg += S(k.cylinder(x, y, 5.4, FOOT_Z + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" });
    shapes.push(A.cylinder(x, y, 7, FOOT_Z, 1.6, { name: "stand.foot.plate" }));
    shapes.push(A.cylinder(x, y, 5.4, FOOT_Z + 1.6, FOOT_H - 1.6, { name: "stand.foot" }));
  }
  svg += S(k.slabOf(PLATE, FOOT_Z + FOOT_H, PLATE_H, P, 8, 1.6), { tone: "mid" });
  shapes.push(A.slab(PLATE, FOOT_Z + FOOT_H, PLATE_H, { name: "stand.base", ground: true }));
  svg += L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" });
  const screws = k.corners(PLATE, 12);
  svg += L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" });
  svg += D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
  put("stand.base", [0, 0, 0], svg, shapes, 0.1);
}

function buildFrame() {
  for (const x of LEG_XS) {
    for (const y of [RAIL_Y, -RAIL_Y]) {
      const plan = { x: x - 5, y: y - 5, w: 10, d: 10, r: 2 };
      put(`stand.leg${y > 0 ? "N" : "F"}@${x}`, [x, y, 15], S(k.slabOf(plan, 0, RAIL_Z, P, 3, 0.5), { tone: "mid" }), [A.slab(plan, 0, RAIL_Z, { name: "stand.leg" })]);
    }
  }
  for (const x of [0]) {
    const plan = { x: x - 5, y: -RAIL_Y + 5, w: 10, d: 2 * RAIL_Y - 10, r: 2 };
    put(`stand.stretcher@${x}`, [x, 0, 11], S(k.slabOf(plan, 8, 6, P, 3, 0.4), { tone: "lo" }), [A.slab(plan, 8, 6, { name: "stand.stretcher" })]);
  }
  for (const y of [RAIL_Y, -RAIL_Y]) {
    const plan = { x: -244, y: y - RAIL_D / 2, w: 492, d: RAIL_D, r: 2 };
    let railSvg = S(k.slabOf(plan, RAIL_Z, RAIL_H, P, 3, 1), { tone: "mid" }) + L(k.sideSeam(plan, RAIL_TOP - 3, P, 3), { tone: "faint" });
    railSvg += D(LEG_XS.flatMap((x) => [at([x, y - 3, RAIL_TOP]), at([x, y + 3, RAIL_TOP])]), { size: 0.45 });
    put(`stand.rail${y > 0 ? "N" : "F"}`, [0, y, RAIL_TOP - RAIL_H / 2], railSvg, [A.slab(plan, RAIL_Z, RAIL_H, { name: "stand.rail" })]);
  }
  // a scale strip along the near rail's outer face
  const strip = { x: -230, y: RAIL_Y + RAIL_D / 2, w: 460, d: 0 };
  const ticks = k.sideTicks(-228, 228, 6, 5, RAIL_Y + RAIL_D / 2, RAIL_TOP - 1, [1.6, 3.2], P);
  put("stand.scale", [0, RAIL_Y + RAIL_D / 2, RAIL_TOP - 2], L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }), [A.slab({ x: strip.x, y: RAIL_Y + RAIL_D / 2 - 0.3, w: strip.w, d: 0.6, r: 0 }, RAIL_TOP - 4, 4, { name: "stand.scale" })], 0.2);
}

function buildConveyor() {
  for (const x of ROLL_XS) rollAt(x, `roll@${x}`);
  for (const x of DRUM_XS) {
    const dots = D([-6, 0, 6].flatMap((dy) => [at([x, dy, ROLL_Z + ROLL_R - 0.4])]), { size: 0.4 });
    rollAt(x, `drum@${x}`, dots);
  }
  const plan = { x: BELT_X0, y: -62, w: BELT_X1 - BELT_X0, d: 124, r: 6 };
  let inner = L(`${k.planOutline({ x: BELT_X0 + 2, y: -60, w: BELT_X1 - BELT_X0 - 4, d: 120, r: 5 }, BELT_TOP, P)}`, { tone: "faint" });
  inner += L(k.lineOnTop([BELT_X0 + 2, 0], [BELT_X1 - 2, 0], BELT_TOP + 0.02, P), { tone: "faint", flow: true });
  for (let x = BELT_X0 + 14; x < BELT_X1 - 14; x += 24) {
    inner += L(k.lineOnTop([x, 60], [x + 10, 8], BELT_TOP + 0.01, P) + k.lineOnTop([x + 10, 8], [x + 20, 60], BELT_TOP + 0.01, P), { tone: "faint" });
  }
  const svg = S(k.slabOf(plan, BELT_Z, BELT_H, P, 6, 0.6), { tone: "mid", crease: "lo", inner });
  put("belt", [8, 0, BELT_TOP - BELT_H / 2], svg, [A.slab(plan, BELT_Z, BELT_H, { name: "belt" })]);
}

function buildChute() {
  const plan = CHUTE;
  const shapes = [];
  let svg = "";
  const posts = [[CHUTE.x + 6, -22], [CHUTE.x + 6, 22], [CHUTE.x + CHUTE.w - 6, -22], [CHUTE.x + CHUTE.w - 6, 22]];
  for (const [x, y] of posts) {
    svg += S(k.cylinder(x, y, 3, 0, CHUTE_Z, P, 16), { tone: "mid" });
    shapes.push(A.cylinder(x, y, 3, 0, CHUTE_Z, { name: "chute.post" }));
  }
  svg += S(k.slabOf(plan, CHUTE_Z, CHUTE_H, P, 5, 0.8), { tone: "mid" });
  shapes.push(A.slab(plan, CHUTE_Z, CHUTE_H, { name: "chute.tray" }));
  svg += S(k.slabOf(k.insetPlan(plan, 5), CHUTE_Z + CHUTE_H - 2.4, 2.4, P, 4), { tone: "lo", crease: "none" });
  shapes.push(A.slab(k.insetPlan(plan, 5), CHUTE_Z + CHUTE_H - 2.4, 2.4, { name: "chute.well" }));
  svg += L(k.planOutline(k.insetPlan(plan, 5), CHUTE_Z + CHUTE_H, P, 4), { tone: "lo" });
  svg += L(k.sideSeam(plan, CHUTE_Z + CHUTE_H - 3.4, P, 5), { tone: "faint" });
  svg += D([[CHUTE.x + 8, CHUTE.y + 8], [CHUTE.x + CHUTE.w - 8, CHUTE.y + 8], [CHUTE.x + 8, CHUTE.y + CHUTE.d - 8], [CHUTE.x + CHUTE.w - 8, CHUTE.y + CHUTE.d - 8]].map(([x, y]) => at([x, y, CHUTE_Z + CHUTE_H])), { size: 0.45 });
  put("chute", [CHUTE.x + CHUTE.w / 2, 0, CHUTE_Z + CHUTE_H / 2], svg, shapes);
}

function buildGate(g, gi) {
  const x = g.x;
  const postN = { x: x - 5, y: RAIL_Y - 5, w: 10, d: 10, r: 2 };
  const postF = { x: x - 5, y: -RAIL_Y - 5, w: 10, d: 10, r: 2 };
  for (const [plan, side, y] of [[postN, "N", RAIL_Y], [postF, "F", -RAIL_Y]]) {
    put(`gate${gi}.post${side}`, [x, y, RAIL_TOP + 16.5], S(k.slabOf(plan, RAIL_TOP, BEAM_Z - RAIL_TOP, P, 3, 0.5), { tone: "mid" }), [A.slab(plan, RAIL_TOP, BEAM_Z - RAIL_TOP, { name: "gate.post" })]);
  }
  const beam = { x: x - 5, y: -72, w: 10, d: 144, r: 2 };
  put(`gate${gi}.beam`, [x, 0, BEAM_Z + BEAM_H / 2], S(k.slabOf(beam, BEAM_Z, BEAM_H, P, 3, 0.8), { tone: "mid" }), [A.slab(beam, BEAM_Z, BEAM_H, { name: "gate.beam" })]);
  put(`gate${gi}.housing`, [x, 0, HOUSING_Z - HOUSING_H], S(k.cylinder(x, 0, 7, HOUSING_Z - HOUSING_H, HOUSING_H, P, 28, 0.6), { tone: "mid" }), [A.cylinder(x, 0, 7, HOUSING_Z - HOUSING_H, HOUSING_H, { name: "gate.housing" })]);
  put(`gate${gi}.hub`, [x, 0, ARM_Z + ARM_H / 2], S(k.cylinder(x, 0, 7, ARM_Z, ARM_H, P, 24), { tone: "mid" }) + L(k.sideArc(x, 0, 7, ARM_Z + 1, P, 24), { tone: "faint" }), [A.cylinder(x, 0, 7, ARM_Z, ARM_H, { name: "gate.hub" })]);
  // rotating arm + blade at rest
  const restTh = REST_ANGLES[gi];
  const { bar, blade } = armRings(x, 0, restTh);
  const armShapes = [A.extruded(bar, ARM_Z, ARM_H, { name: "gate.arm" }), A.extruded(blade, BLADE_Z, BLADE_H, { name: "gate.blade" })];
  put(`gate${gi}.arm`, [x, -14, ARM_Z], `<g data-part="arm-${gi}">${armSvg(x, 0, restTh)}</g>`, armShapes);
  // dial base and dial
  const db = { x: x - 13, y: -13, w: 26, d: 26, r: 3 };
  put(`gate${gi}.dialbase`, [x, 0, DIALBASE_Z + 1.5], S(k.slabOf(db, DIALBASE_Z, 3, P, 4, 0.6), { tone: "mid" }), [A.slab(db, DIALBASE_Z, 3, { name: "gate.dialbase" })]);
  const ticks = k.radialTicks(x, 0, DIAL_R - 3, 11, 5, DIAL_TOP, [1.2, 2.6], P, -0.62, 1.24);
  let dialInner = L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
  dialInner += L(k.ring(x, 0, DIAL_R - 2, DIAL_TOP, P, 48), { tone: "lo" });
  dialInner += L(k.ring(x, 0, 1.5, DIAL_TOP, P, 16), { tone: "mid" });
  const dialSvg = S(k.cylinder(x, 0, DIAL_R, DIAL_Z, DIAL_H, P, 48, 0.8), { tone: "hi", crease: "lo" }) + L(k.knurl(x, 0, DIAL_R, DIAL_Z + 1.6, DIAL_Z + 3.2, 64, P, 0.3), { tone: "lo" }) + L(k.sideArc(x, 0, DIAL_R, DIAL_Z + 1.6, P, 48), { tone: "faint" }) + dialInner;
  put(`gate${gi}.dial`, [x, 0, DIAL_Z + DIAL_H / 2], dialSvg, [A.cylinder(x, 0, DIAL_R, DIAL_Z, DIAL_H, { name: "gate.dial" })]);
  // engraved признак label plate on the beam
  const lp = { x: x - 17, y: 16, w: 24, d: 9, r: 1.5 };
  let lpSvg = S(k.slabOf(lp, BEAM_Z + BEAM_H, 0.9, P, 3), { tone: "lo", crease: "none" });
  lpSvg += L([16, 11, 13].map((w, i) => k.lineOnTop([lp.x + 3, lp.y + 3 + i * 2.6], [lp.x + 3 + w, lp.y + 3 + i * 2.6], BEAM_Z + BEAM_H + 0.9, P)).join(""), { tone: "lo", free: true });
  lpSvg += D([at([lp.x + lp.w - 2, lp.y + lp.d / 2, BEAM_Z + BEAM_H + 0.9])], { size: 0.45 });
  put(`gate${gi}.label`, [x, 24, BEAM_Z + BEAM_H], lpSvg, [A.slab(lp, BEAM_Z + BEAM_H, 0.9, { name: "gate.label" })]);
}

function buildCells() {
  GATES.forEach((g, gi) => {
    g.cells.forEach((c, ci) => {
      const plan = { x: c.x, y: c.y, w: c.w, d: c.d, r: c.r };
      let svg = S(k.slabOf(plan, 0, CELL_H, P, 4, 0.7), { tone: "mid" });
      svg += S(k.slabOf(k.insetPlan(plan, 3), CELL_H - 2.4, 2.4, P, 3), { tone: "lo", crease: "none" });
      svg += L(k.planOutline(k.insetPlan(plan, 3), CELL_H, P, 3), { tone: "lo" });
      svg += L([12, 8].map((w, i) => k.lineOnTop([c.x + 4, CELL_Y - 6 + i * 3], [c.x + 4 + w, CELL_Y - 6 + i * 3], CELL_H, P)).join(""), { tone: "faint", free: true });
      svg += D([at([c.x + 2.5, c.y + 2.5, 0]), at([c.x + c.w - 2.5, c.y + c.d - 2.5, 0])], { size: 0.4 });
      put(`gate${gi}.cell${ci}`, [c.cx, c.cy, CELL_H / 2], `<g data-part="cell-${gi}-${ci}">${svg}</g>`, [A.slab(plan, 0, CELL_H, { name: "cell" })]);
    });
  });
}

function buildGateLabels() {
  GATES.forEach((g, gi) => {
    const plan = { x: g.x - 42, y: 100, w: 84, d: 14, r: 2 };
    let svg = S(k.slabOf(plan, 0, 1, P, 3), { tone: "lo", crease: "none" });
    svg += L(k.planOutline(plan, 1, P, 3), { tone: "lo" });
    svg += D([at([plan.x + 3, plan.y + 3, 1]), at([plan.x + plan.w - 3, plan.y + plan.d - 3, 1])], { size: 0.4 });
    svg += k.faceTextSvg(k.topMatrix([g.x, plan.y + plan.d / 2], 1, P, "x"), TRAITS[g.trait].label, { size: 7, tone: "hi", anchor: "middle" });
    put(`gate${gi}.nameplate`, [g.x, plan.y + plan.d / 2, 1], svg, [A.slab(plan, 0, 1, { name: "nameplate" })]);
  });
}

function buildBin() {
  const shapes = [];
  let svg = "";
  const floor = { x: BIN.x, y: BIN.y, w: BIN.w, d: BIN.d, r: BIN.r };
  svg += S(k.slabOf(floor, 0, 4, P, 5), { tone: "lo" });
  shapes.push(A.slab(floor, 0, 4, { name: "bin.floor" }));
  const walls = [
    { x: BIN.x, y: BIN.y, w: BIN.w, d: BIN_WALL, r: 2 },
    { x: BIN.x, y: BIN.y + BIN.d - BIN_WALL, w: BIN.w, d: BIN_WALL, r: 2 },
    { x: BIN.x, y: BIN.y + BIN_WALL, w: BIN_WALL, d: BIN.d - 2 * BIN_WALL, r: 2 },
    { x: BIN.x + BIN.w - BIN_WALL, y: BIN.y + BIN_WALL, w: BIN_WALL, d: BIN.d - 2 * BIN_WALL, r: 2 },
  ];
  for (const w of walls) {
    svg += S(k.slabOf(w, 0, BIN_H, P, 3, 0.6), { tone: "mid" });
    shapes.push(A.slab(w, 0, BIN_H, { name: "bin.wall" }));
  }
  svg += L(k.sideSeam(floor, 6, P, 5), { tone: "faint" });
  const lp = { x: BIN.x + 4, y: BIN.y + BIN.d - BIN_WALL - 9, w: 40, d: 7, r: 1 };
  svg += S(k.slabOf(lp, BIN_H - 9, 0.8, P, 3), { tone: "lo", crease: "none" });
  svg += L([30, 22, 26].map((w, i) => k.lineOnTop([lp.x + 3, lp.y + 2.4 + i * 2.2], [lp.x + 3 + w, lp.y + 2.4 + i * 2.2], BIN_H - 8.2, P)).join(""), { tone: "lo", free: true });
  shapes.push(A.slab(lp, BIN_H - 9, 0.8, { name: "bin.label" }));
  put("bin", [BIN.x + BIN.w / 2, 0, BIN_H / 2], svg, shapes);
}

function buildCounter() {
  const plan = COUNTER;
  const shapes = [];
  let svg = S(k.slabOf(plan, 0, COUNTER_H, P, 4, 0.7), { tone: "mid" });
  shapes.push(A.slab(plan, 0, COUNTER_H, { name: "counter.body" }));
  const win = { x: plan.x + 4, y: plan.y + 3, w: plan.w - 8, d: plan.d - 6, r: 1.5 };
  svg += S(k.slabOf(win, COUNTER_H - 3, 3, P, 3), { tone: "lo", crease: "none" });
  shapes.push(A.slab(win, COUNTER_H - 3, 3, { name: "counter.window" }));
  svg += L(k.planOutline(win, COUNTER_H, P, 3), { tone: "lo" });
  svg += D([at([plan.x + 2.5, plan.y + 2.5, 0]), at([plan.x + plan.w - 2.5, plan.y + plan.d - 2.5, 0]), at([plan.x + 2.5, plan.y + plan.d - 2.5, 0])], { size: 0.4 });
  svg += k.faceTextSvg(k.topMatrix([plan.x + plan.w / 2, plan.y + plan.d / 2 + 2], COUNTER_H, P, "x"), "00", { size: 9, tone: "hi", anchor: "middle" }).replace(/^<text/, '<text data-part="digits"');
  put("counter", [plan.x + plan.w / 2, plan.y + plan.d / 2, COUNTER_H / 2], svg, shapes);
}

function buildMotor() {
  const plan = MOTOR;
  let svg = S(k.slabOf(plan, 0, MOTOR_H, P, 4, 0.7), { tone: "mid" });
  svg += S(k.cylinder(plan.x + plan.w / 2, plan.y + plan.d / 2, 7, MOTOR_H, 3, P, 24, 0.6), { tone: "mid" });
  svg += L(k.knurl(plan.x + plan.w / 2, plan.y + plan.d / 2, 7, MOTOR_H + 0.6, MOTOR_H + 2.4, 28, P, 0.3), { tone: "lo" });
  svg += L(k.sideSeam(plan, MOTOR_H - 3, P, 4), { tone: "faint" });
  svg += D([at([plan.x + 4, plan.y + 4, 0]), at([plan.x + plan.w - 4, plan.y + plan.d - 4, 0])], { size: 0.4 });
  put("motor", [plan.x + plan.w / 2, plan.y + plan.d / 2, MOTOR_H / 2], svg, [A.slab(plan, 0, MOTOR_H, { name: "motor" }), A.cylinder(plan.x + plan.w / 2, plan.y + plan.d / 2, 7, MOTOR_H, 3, { name: "motor.cap" })]);
}

function buildCard() {
  const plan = { x: CARD_X0 - 13, y: -9, w: 26, d: 18, r: 1.5 };
  let svg = S(k.slabOf(plan, BELT_TOP, CARD_H, P, 3, 0.5), { tone: "hi", lit: true, crease: "lo" });
  svg += L([16, 10, 13].map((w, i) => k.lineOnTop([plan.x + 3, plan.y + 3.5 + i * 3.4], [plan.x + 3 + w, plan.y + 3.5 + i * 3.4], CARD_TOP, P)).join(""), { tone: "lo", free: true });
  svg += L(k.planOutline(k.insetPlan(plan, 2), CARD_TOP, P, 3), { tone: "faint" });
  put("card", [CARD_X0, 0, CARD_TOP], `<g data-part="card" transform="">${svg}</g>`, [A.slab(plan, BELT_TOP, CARD_H, { name: "card" })]);
}

buildBase();
buildFrame();
buildConveyor();
buildChute();
buildMotor();
GATES.forEach((g, gi) => buildGate(g, gi));
buildCells();
buildGateLabels();
buildBin();
buildCounter();
buildCard();

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

const needles = GATES.map((g, gi) => `<path data-part="needle-${gi}" class="iso-line" data-tone="hi" data-free="true" d="${needleD(g.x, 0, REST_ANGLES[gi])}" style="stroke-width:1.1"/>`).join("");
const art = R.items.map((it) => it.svg).join("") + needles;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A belt sorting conveyor on a bench. A card enters from a chute, rides the belt, passes three pivoting gate towers one after another (сфера, масштаб, способ обработки), and drops into a result cell. Each gate turns its arm and its dial needle to the card's value for its признак, and lifts that class cell in the row in front of it.",
  body: art,
});

// ---- live behaviour ----
const FEEDX = CARD_X0;
const ENDX = 200;
const BINX = BIN.x + BIN.w / 2;
const BINZ = 4;
const CARDZ = BELT_TOP;

const live = `
const P = ${JSON.stringify(P)};
const ARM_Z = ${ARM_Z}, ARM_H = ${ARM_H}, BLADE_Z = ${BLADE_Z}, BLADE_H = ${BLADE_H}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP};
const armRings = ${armRings.toString().replace(/\bk\./g, "")};
const armSvg = ${armSvg.toString().replace(/\bk\./g, "").replace(/\bS\(/g, "solidSvg(")};
const needleD = ${needleD.toString().replace(/\bk\./g, "")};
const GATES = ${JSON.stringify(GATES.map((g) => ({ x: g.x, angles: g.angles })))};
const CARD_ANGLES = ${JSON.stringify(CARD_ANGLES)};
const READOUTS = ${JSON.stringify(READOUTS)};
const RUN_VALUES = ${JSON.stringify(CARDS.map((c) => indices(c)))};
const EMPTY = 0.7, RUN = 3.8, DROP = 0.8, HOLD = 0.8;
const FEEDX = ${FEEDX}, ENDX = ${ENDX}, BINX = ${BINX}, BINZ = ${BINZ}, CARDZ = ${CARDZ};
const LIFT = ${CELL_LIFT};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const arms = GATES.map((_, i) => svg.querySelector('[data-part="arm-' + i + '"]'));
const needles = GATES.map((_, i) => svg.querySelector('[data-part="needle-' + i + '"]'));
const cellEls = GATES.map((g, i) => g.angles.map((_, c) => svg.querySelector('[data-part="cell-' + i + '-' + c + '"]')));
const card = svg.querySelector('[data-part="card"]');
const digits = svg.querySelector('[data-part="digits"]');
const readoutEl = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

let idx = 0, t = 0, clock = 0, counted = false, count = 0;
let frame = 0, last = 0, visible = false, touring = !still.matches, idleTimer = 0;
let cardX = FEEDX, cardZ = CARDZ, cardOp = 1;
const angleNow = GATES.map(() => 0), angleTarget = GATES.map(() => 0);
const liftNow = GATES.map((g) => g.angles.map(() => 0)), liftTarget = GATES.map((g) => g.angles.map(() => 0));

function targetsFor(i, lifted) {
  const vals = RUN_VALUES[i];
  GATES.forEach((g, gi) => {
    angleTarget[gi] = lifted ? CARD_ANGLES[i][gi] : 0;
    g.angles.forEach((_, ci) => { liftTarget[gi][ci] = lifted && ci === vals[gi] ? LIFT : 0; });
  });
}
function advance(dt) {
  t += dt;
  const total = EMPTY + RUN + DROP + HOLD;
  if (t >= total) { t -= total; idx = (idx + 1) % READOUTS.length; counted = false; }
  const vals = RUN_VALUES[idx];
  if (t < EMPTY) {
    cardOp = 0;
    GATES.forEach((g, gi) => { angleTarget[gi] = 0; g.angles.forEach((_, ci) => { liftTarget[gi][ci] = 0; }); });
    cardX = FEEDX; cardZ = CARDZ;
  } else {
    cardOp = 1;
    const u = (t - EMPTY) / RUN;
    if (u < 1) {
      cardX = FEEDX + u * (ENDX - FEEDX);
      cardZ = CARDZ;
      GATES.forEach((g, gi) => {
        const fire = clamp((g.x - FEEDX) / (ENDX - FEEDX), 0, 1);
        const on = u >= fire;
        angleTarget[gi] = on ? CARD_ANGLES[idx][gi] : 0;
        g.angles.forEach((_, ci) => { liftTarget[gi][ci] = on && ci === vals[gi] ? LIFT : 0; });
      });
    } else {
      const d = ease((t - EMPTY - RUN) / DROP);
      cardX = ENDX + d * (BINX - ENDX);
      cardZ = CARDZ + d * (BINZ - CARDZ);
      if (!counted) { counted = true; count += 1; }
    }
  }
  if (readoutEl.textContent !== READOUTS[idx]) readoutEl.textContent = READOUTS[idx];
}
function draw() {
  GATES.forEach((g, gi) => {
    arms[gi].innerHTML = armSvg(g.x, 0, angleNow[gi]);
    needles[gi].setAttribute("d", needleD(g.x, 0, angleNow[gi]));
    g.angles.forEach((_, ci) => { cellEls[gi][ci].setAttribute("transform", translateAlong(P, [0, 0, liftNow[gi][ci]])); });
  });
  card.setAttribute("transform", translateAlong(P, [cardX - FEEDX, 0, cardZ - CARDZ]));
  card.style.opacity = cardOp.toFixed(2);
  const text = String(count).padStart(2, "0");
  if (digits && digits.textContent !== text) digits.textContent = text;
  stage.setAttribute("aria-valuenow", String(idx));
  stage.setAttribute("aria-valuetext", READOUTS[idx]);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) advance(dt);
  GATES.forEach((_, gi) => {
    angleNow[gi] = calm ? angleTarget[gi] : angleNow[gi] + (angleTarget[gi] - angleNow[gi]) * (1 - Math.exp(-dt / 0.3));
    liftNow[gi] = liftNow[gi].map((v, ci) => (calm ? liftTarget[gi][ci] : v + (liftTarget[gi][ci] - v) * (1 - Math.exp(-dt / 0.28))));
  });
  if (!touring) cardX = calm ? ENDX : cardX + (ENDX - cardX) * (1 - Math.exp(-dt / 0.3));
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
function takeOver() {
  if (touring) { touring = false; }
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (still.matches) return; touring = true; t = 0; counted = false; run(); }, 4200);
  run();
}
function select(i) {
  idx = clamp(i, 0, READOUTS.length - 1);
  takeOver();
  targetsFor(idx, true);
  cardX = ENDX; cardZ = CARDZ; cardOp = 1;
  readoutEl.textContent = READOUTS[idx];
  run();
}
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { touring = false; targetsFor(0, true); cardX = ENDX; readoutEl.textContent = READOUTS[0]; }
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  select(Math.round(share * (READOUTS.length - 1)));
});
stage.addEventListener("keydown", (event) => {
  const here = idx;
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") to = Math.min(READOUTS.length - 1, here + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") to = Math.max(0, here - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = READOUTS.length - 1;
  if (to === null) return;
  event.preventDefault();
  select(to);
});
draw();
`;

const labelCss = `<style>
.iso-plate-corner[data-corner="readout"]{white-space:normal;text-align:right;max-width:100%;line-height:1.4}
.iso-plate-corner[data-corner="hint"]{bottom:20px}
@media (max-width:560px){.iso-plate{padding-bottom:98px}.iso-plate-corner[data-corner="hint"]{bottom:58px}}
</style>`;

const body = labelCss + k.plateHtml({
  fig: "Fig 1",
  title: "Классификатор ИС",
  hint: "Наведите или ← →, чтобы сменить карточку",
  readout: READOUTS[0],
  keys: [
    { mark: "lit", label: "карточка на ленте" },
    { mark: "raised", label: "ячейки классов" },
  ],
  caption:
    "Карточка «Банковская АБС» проходит три воротца и получает класс по каждому признаку: сфера финансы, масштаб корпоративная, способ обработки оперативная. Три признака независимы, поэтому классов у одной системы три.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Классификатор информационных систем: стрелками выберите карточку примера" aria-valuemin="0" aria-valuemax="${CARDS.length - 1}" aria-valuenow="0">${svg}</div>`,
});

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: "Классификатор ИС", theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}

A.auditOrExit(R, P, {});
