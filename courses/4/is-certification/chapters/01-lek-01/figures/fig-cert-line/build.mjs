// Figure fig-cert-line, built with the Anatomy skill.
//
// Contract with course-studio (kept):
//   1. Kit imported from the vendored copy: ../../../../../../_anatomy/kit/iso-kit.mjs
//   2. `node build.mjs` writes BOTH themes next to this file:
//        fig-cert-line.html        (dark)
//        fig-cert-line-light.html  (light)
//   3. `node build.mjs --audit` runs Anatomy's audit.
//   4. The card `fig` is "Fig 1".
//
// The object: a certification stand. A heavy base on four feet carries a raised
// deck, a pair of rails on legs and a carriage with a document tile. Four
// gateways stand over the rail, each with a nameplate: Заявка, Анализ,
// Испытания, Решение. A roller registers the document at the first gate; a
// probe drops onto it at the second; a press with a dial and a pressure plate
// tests it at the third; a stamp puts a mark on it at the fourth. After the
// decision the document rises over the gate and drops into the certificate tray
// or the reject chute. A handwheel with a pointer and a four-mark index disc
// shows the station, and a counter window shows how many applications passed
// the tests. The model in ./model.mjs computes every number and word the page
// shows.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import * as A from "../../../../../../_anatomy/kit/audit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-cert-line";
const WIDTH = 640;
const HEIGHT = 440;

// ---- base ----
const PLATE = { x: -300, y: -110, w: 600, d: 220, r: 14 };
const PLATE_H = 14;
const FOOT_Z = -24;
const FOOT_PAD = 2.2;
const DECK = { x: -290, y: -100, w: 580, d: 200, r: 10 };
const DECK_TOP = 4;

// ---- rail ----
const RAIL_X0 = -250;
const RAIL_X1 = 240;
const RAIL_Y = 0;
const RAIL_HALF = 18;
const RAIL_D = 6;
const RAIL_Z = 30;
const RAIL_BAR_H = 7;
const RAIL_TOP = RAIL_Z + RAIL_BAR_H;
const LEG_XS = [-238, -140, -20, 100, 232];

// ---- carriage and document ----
const STATIONS = [-190, -55, 85, 195];
const [S1, S2, S3, S4] = STATIONS;
const CAR_REST_X = S1;
const CAR_W = 46;
const CAR_D = 46;
const CAR_Z = RAIL_TOP + 3;
const CAR_H = 7;
const CAR_TOP = CAR_Z + CAR_H;
const DOC_W = 30;
const DOC_D = 38;
const DOC_H = 3.5;
const DOC_Z = CAR_TOP;
const DOC_C = DOC_Z + DOC_H / 2;

// ---- gates and tools ----
const GATE_Y = 44;
const GATE_Z = 78;
const GATE_H = 8;
const GLAND_Z0 = 70;
const GLAND_Z1 = 78;
const TOOL_REST = 64;
const PRESS_Z = 102;
const PRESS_H = 10;
const PRESS_HEAD_Z = 92;
const PRESS_HEAD_H = 10;
const PRESS_PLATE_Z = 59;
const PRESS_PLATE_H = 5;
const PRESS_DIAL = { x: S3, y: 24.2, z: 91, r: 9.5 };
const DROPS = { roller: 3.5, probe: 4.5, press: 8.5, stamp: 3.5 };

// ---- trays ----
const TRAY = { x: 214, y: 44, w: 76, d: 52, r: 3 };
const TRAY_Y = 70;
const TRAY_DOC_Z = 8;
const TRAY_DOC_C = TRAY_DOC_Z + DOC_H / 2;
const CERT_SLOTS = [234, 270];
const CHUTE = { x: 214, y: -96, w: 76, d: 52, r: 3 };
const CHUTE_Y = -70;
const CHUTE_DOC_Z = 8.6;
const CHUTE_DOC_C = CHUTE_DOC_Z + DOC_H / 2;
const REJECT_X = 252;
const DELIVERY_LIFT = 62;

// ---- wheel and counter ----
const WHEEL = [-125, 76];
const WHEEL_R = 17;
const WHEEL_Z0 = 64;
const WHEEL_Z1 = 70;
const COUNTER = [-25, 73];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, FOOT_Z, 0),
    [S3, 0, 114],
    [S3 + 16, 0, 114],
    [S1, 0, 87.2],
    [S4, 0, 87.2],
    [WHEEL[0], WHEEL[1], 73],
    [TRAY.x + TRAY.w, TRAY.y + TRAY.d, 13],
    [CHUTE.x + CHUTE.w, CHUTE.y, 13],
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

function wheelMarkup(deg, wheel) {
  const [cx, cy] = wheel;
  const a0 = (deg * Math.PI) / 180;
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += k.solidSvg(k.extrude(spokeRing(cx, cy, a0 + (i * Math.PI) / 2, 6, 13, 1.5), 65, 4, P, { convex: true }), { tone: "hi" });
  }
  const px = cx + Math.cos(a0) * 16;
  const py = cy + Math.sin(a0) * 16;
  out += k.lineSvg(k.lineOnTop([cx + Math.cos(a0) * 6, cy + Math.sin(a0) * 6], [px, py], 70.2, P), { tone: "lit" });
  out += k.solidSvg(k.cylinder(px, py, 2, 70, 3, P, 20), { tone: "hi" });
  return out;
}

function docMarkup(cx, cy, z, mark) {
  const plan = { x: cx - DOC_W / 2, y: cy - DOC_D / 2, w: DOC_W, d: DOC_D, r: 1.5 };
  let svg = k.solidSvg(k.slabOf(plan, z, DOC_H, P, 4, 0.4), { tone: "hi", crease: "lo", lit: true });
  svg += k.lineSvg(k.planOutline(k.insetPlan(plan, 2), z + DOC_H, P), { tone: "faint" });
  svg += k.lineSvg(k.planOutline({ x: plan.x + 3, y: plan.y + 3, w: DOC_W - 6, d: 4.5, r: 0.6 }, z + DOC_H, P), { tone: "lo" });
  for (let i = 0; i < 4; i++) {
    svg += k.lineSvg(k.lineOnTop([plan.x + 3, plan.y + 11 + i * 4.6], [plan.x + DOC_W - 3, plan.y + 11 + i * 4.6], z + DOC_H, P), { tone: "faint", free: true });
  }
  svg += k.lineSvg(k.lineOnTop([plan.x + DOC_W - 7, plan.y + 1], [plan.x + DOC_W - 1, plan.y + 7], z + DOC_H, P), { tone: "lo", free: true });
  if (mark === "сертификат") {
    svg += k.lineSvg(k.ring(cx + 7.5, cy + 12.5, 4.1, z + DOC_H, P, 20), { tone: "hi" });
    svg += k.lineSvg(k.lineOnTop([cx + 5.6, cy + 12.4], [cx + 6.9, cy + 13.7], z + DOC_H, P), { tone: "hi", free: true });
    svg += k.lineSvg(k.lineOnTop([cx + 6.9, cy + 13.7], [cx + 9.6, cy + 10.9], z + DOC_H, P), { tone: "hi", free: true });
  } else if (mark === "отказ") {
    svg += k.lineSvg(k.ring(cx + 7.5, cy + 12.5, 4.1, z + DOC_H, P, 20), { tone: "hi" });
    svg += k.lineSvg(k.lineOnTop([cx + 5.6, cy + 10.6], [cx + 9.4, cy + 14.4], z + DOC_H, P), { tone: "hi", free: true });
    svg += k.lineSvg(k.lineOnTop([cx + 9.4, cy + 10.6], [cx + 5.6, cy + 14.4], z + DOC_H, P), { tone: "hi", free: true });
  }
  return svg;
}

function needleD(pressure, dial) {
  const a = ((-120 + 240 * pressure) * Math.PI) / 180;
  return k.segment(
    [dial.x + Math.cos(a) * 1.4, dial.y, dial.z + Math.sin(a) * 1.4],
    [dial.x + Math.cos(a) * dial.r, dial.y, dial.z + Math.sin(a) * dial.r],
    P,
  );
}

// ==== static machine ==================================================================

function buildBase() {
  const shapes = [];
  let svg = `<path class="iso-halo" d="${k.haloOf(PLATE, FOOT_Z, -FOOT_Z, P)}"/>`;
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    svg += S(k.cylinder(x, y, 9, FOOT_Z, -PLATE_H - FOOT_Z, P, 28, 0.6), { tone: "mid" });
    svg += L(k.sideArc(x, y, 9, FOOT_Z + FOOT_PAD, P, 20), { tone: "lo" });
    shapes.push(A.cylinder(x, y, 9, FOOT_Z, -PLATE_H - FOOT_Z, { name: "stand.foot", ground: true }));
  }
  svg += S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 10, 1.6), { tone: "mid" });
  shapes.push(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }));
  svg += L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" });
  const screws = k.corners(PLATE, 6);
  svg += L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" });
  svg += D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
  svg += S(k.slabOf(DECK, 0, DECK_TOP, P, 10, 1.2), { tone: "mid" });
  shapes.push(A.slab(DECK, 0, DECK_TOP, { name: "stand.deck" }));
  svg += L(k.planOutline(k.insetPlan(DECK, 8), DECK_TOP, P), { tone: "lo" });
  const deckScrews = k.corners(DECK, 10);
  svg += L(deckScrews.map(([x, y]) => k.ring(x, y, 2.2, DECK_TOP, P, 16)).join(""), { tone: "lo" });
  svg += D(deckScrews.map(([x, y]) => at([x, y, DECK_TOP])), { size: 0.45 });
  const strip = { x: -270, y: 86, w: 480, d: 6, r: 1 };
  svg += S(k.slabOf(strip, DECK_TOP, 0.6, P, 3), { tone: "lo", crease: "none" });
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 5, 5, strip.y + 0.8, DECK_TOP + 0.6, [2, 3.6], P);
  svg += L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
  shapes.push(A.slab(strip, DECK_TOP, 0.6, { name: "stand.rule" }, 3));
  const name = { x: -110, y: 101, w: 70, d: 8, r: 1.2 };
  svg += S(k.slabOf(name, 0, 0.9, P, 4), { tone: "lo", crease: "none" });
  svg += L(k.planOutline(k.insetPlan(name, 1.4), 0.9, P), { tone: "faint" });
  svg += L([48, 36, 42].map((w, i) => k.lineOnTop([name.x + 8, name.y + 2.4 + i * 2.4], [name.x + 8 + w, name.y + 2.4 + i * 2.4], 0.9, P)).join(""), { tone: "lo", free: true });
  shapes.push(A.slab(name, 0, 0.9, { name: "stand.nameplate" }, 4));
  put("stand.base", [0, 0, 0], svg, shapes, 0.1);
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
  put("rail", [0, 0, RAIL_Z + 3], svg, shapes);
  for (const x of LEG_XS) {
    const plan = { x: x - 4, y: -24, w: 8, d: 48, r: 1.5 };
    let svg2 = S(k.slabOf(plan, DECK_TOP, RAIL_Z - DECK_TOP, P, 3, 0.5), { tone: "mid" });
    svg2 += L(k.sideSeam(plan, 14, P, 3), { tone: "faint" });
    svg2 += D([at([x - 2, -20, RAIL_Z]), at([x + 2, 20, RAIL_Z])], { size: 0.42 });
    put(`leg@${x}`, [x, 0, 16], svg2, [
      A.slab(plan, DECK_TOP, RAIL_Z - DECK_TOP, { name: "rail.leg" }),
    ]);
  }
  for (const y of [RAIL_Y - RAIL_HALF, RAIL_Y + RAIL_HALF]) {
    const plan = { x: RAIL_X1 - 3, y: y - 5, w: 6, d: 10, r: 1 };
    put(`stop@${RAIL_X1}@${y}`, [RAIL_X1, y, RAIL_TOP + 4], S(k.slabOf(plan, RAIL_TOP, 8, P, 3, 0.5), { tone: "mid" }) + D([at([RAIL_X1, y, RAIL_TOP + 8])], { size: 0.4 }), [
      A.slab(plan, RAIL_TOP, 8, { name: "rail.stop" }),
    ]);
  }
}

function buildGate(x, label, beamZ = GATE_Z, beamH = GATE_H) {
  for (const sy of [-1, 1]) {
    const y = sy * GATE_Y;
    const shapes = [];
    let svg = "";
    const post = { x: x - 5, y: y - 5, w: 10, d: 10, r: 2 };
    svg += S(k.slabOf(post, DECK_TOP, beamZ - DECK_TOP, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(post, beamZ - 8, P, 3), { tone: "faint" }) });
    shapes.push(A.slab(post, DECK_TOP, beamZ - DECK_TOP, { name: "gate.post" }));
    put(`gate@${x}.${sy < 0 ? "back" : "front"}`, [x, y, 40], svg, shapes);
  }
  const shapes = [];
  let svg = "";
  const beam = { x: x - 13, y: -50, w: 26, d: 100, r: 3 };
  svg += S(k.slabOf(beam, beamZ, beamH, P, 5, 0.8), { tone: "mid", inner: L(k.sideSeam(beam, beamZ + 3, P, 5), { tone: "faint" }) });
  shapes.push(A.slab(beam, beamZ, beamH, { name: "gate.beam" }));
  const plate = { x: x - 18, y: -7, w: 36, d: 14, r: 1.5 };
  svg += S(k.slabOf(plate, beamZ + beamH, 1.2, P, 3, 0.4), { tone: "lo", crease: "none" });
  svg += L(k.planOutline(k.insetPlan(plate, 1.2), beamZ + beamH + 1.2, P), { tone: "faint" });
  svg += k.faceTextSvg(k.topMatrix([x, 0], beamZ + beamH + 1.2, P, "x"), label, { size: 4.2, tone: "lo", anchor: "middle" });
  svg += D([[plate.x + 2.5, plate.y + 2.5], [plate.x + plate.w - 2.5, plate.y + 2.5], [plate.x + 2.5, plate.y + plate.d - 2.5], [plate.x + plate.w - 2.5, plate.y + plate.d - 2.5]].map(([px, py]) => at([px, py, beamZ + beamH + 1.2])), { size: 0.42 });
  shapes.push(A.slab(plate, beamZ + beamH, 1.2, { name: "gate.plate" }, 3));
  const gland = G.ringBand(GLAND_Z0, GLAND_Z1, 2.6, 5.5, VF(x, 0), P);
  svg += S(gland, { tone: "mid" });
  shapes.push(A.ring(VF(x, 0), GLAND_Z0, GLAND_Z1, 2.6, 5.5, { name: "gate.gland" }));
  put(`gate@${x}.top`, [x, 0, beamZ], svg, shapes);
}

function buildPress() {
  for (const sy of [-1, 1]) {
    const y = sy * GATE_Y;
    const col = { x: S3 - 10, y: y - 10, w: 20, d: 20, r: 3 };
    put(`press.column.${sy < 0 ? "back" : "front"}`, [S3, y, 50], S(k.slabOf(col, DECK_TOP, PRESS_Z - DECK_TOP, P, 4, 0.7), { tone: "mid", inner: L(k.sideSeam(col, 54, P, 4), { tone: "faint" }) }), [
      A.slab(col, DECK_TOP, PRESS_Z - DECK_TOP, { name: "press.column" }),
    ]);
  }
  const beamShapes = [];
  let beamSvg = "";
  const beam = { x: S3 - 16, y: -50, w: 32, d: 100, r: 4 };
  beamSvg += S(k.slabOf(beam, PRESS_Z, PRESS_H, P, 5, 1), { tone: "mid", inner: L(k.sideSeam(beam, PRESS_Z + 3, P, 5), { tone: "faint" }) });
  beamShapes.push(A.slab(beam, PRESS_Z, PRESS_H, { name: "press.beam" }));
  const plate = { x: S3 - 18, y: -7, w: 36, d: 14, r: 1.5 };
  beamSvg += S(k.slabOf(plate, PRESS_Z + PRESS_H, 1.2, P, 3, 0.4), { tone: "lo", crease: "none" });
  beamSvg += L(k.planOutline(k.insetPlan(plate, 1.2), PRESS_Z + PRESS_H + 1.2, P), { tone: "faint" });
  beamSvg += k.faceTextSvg(k.topMatrix([S3, 0], PRESS_Z + PRESS_H + 1.2, P, "x"), "Испытания", { size: 4.2, tone: "lo", anchor: "middle" });
  beamSvg += D([[plate.x + 2.5, plate.y + 2.5], [plate.x + plate.w - 2.5, plate.y + 2.5], [plate.x + 2.5, plate.y + plate.d - 2.5], [plate.x + plate.w - 2.5, plate.y + plate.d - 2.5]].map(([px, py]) => at([px, py, PRESS_Z + PRESS_H + 1.2])), { size: 0.42 });
  beamShapes.push(A.slab(plate, PRESS_Z + PRESS_H, 1.2, { name: "press.nameplate" }, 3));
  put("press.beam", [S3, 0, PRESS_Z], beamSvg, beamShapes);
  const headShapes = [];
  let headSvg = "";
  const head = { x: S3 - 30, y: -20, w: 60, d: 40, r: 4 };
  headSvg += S(k.slabOf(head, PRESS_HEAD_Z, PRESS_HEAD_H, P, 5, 0.8), { tone: "hi", inner: L(k.sideSeam(head, PRESS_HEAD_Z + 3, P, 5), { tone: "faint" }) });
  headShapes.push(A.slab(head, PRESS_HEAD_Z, PRESS_HEAD_H, { name: "press.head" }));
  const dialF = G.frameAlong([S3, 20, PRESS_DIAL.z], [0, 1, 0]);
  headShapes.push(A.disc(dialF, 0, 4, 11, { name: "press.dial" }));
  put("press.head", [S3, 0, PRESS_HEAD_Z], headSvg, headShapes);
}

function pressDialSVG() {
  const dialF = G.frameAlong([S3, 20, PRESS_DIAL.z], [0, 1, 0]);
  let svg = S(G.disc(0, 4, 11, dialF, P), { tone: "hi", crease: "lo" });
  const ringPts = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    ringPts.push([S3 + Math.cos(a) * PRESS_DIAL.r, 24.05, PRESS_DIAL.z + Math.sin(a) * PRESS_DIAL.r]);
  }
  svg += L(k.pathOf(ringPts.map((point) => k.iso(point, P)), true), { tone: "lo" });
  for (let i = 0; i <= 10; i++) {
    const a = ((-120 + (i / 10) * 240) * Math.PI) / 180;
    const r0 = i % 5 === 0 ? 5.8 : 7.6;
    svg += L(k.segment([S3 + Math.cos(a) * r0, 24.05, PRESS_DIAL.z + Math.sin(a) * r0], [S3 + Math.cos(a) * PRESS_DIAL.r, 24.05, PRESS_DIAL.z + Math.sin(a) * PRESS_DIAL.r], P), { tone: i % 5 === 0 ? "mid" : "lo" });
  }
  svg += `<path data-part="press-needle" class="iso-line" data-tone="lit" data-free="start" d="${needleD(0, PRESS_DIAL)}" style="stroke-width:1.1"/>`;
  return svg;
}

function buildTray() {
  const shapes = [];
  let svg = "";
  const inner = k.insetPlan(TRAY, 3);
  svg += S(k.slabOf(inner, DECK_TOP, 4, P, 3, 0.5), { tone: "lo" });
  shapes.push(A.slab(inner, DECK_TOP, 4, { name: "tray.floor" }, 3));
  const { x, y, w, d } = TRAY;
  const walls = [
    { x, y, w, d: 3, r: 1 },
    { x, y: y + 3, w: 3, d: d - 6, r: 1 },
    { x: x + w - 3, y: y + 3, w: 3, d: d - 6, r: 1 },
  ];
  for (const wall of walls) {
    svg += S(k.slabOf(wall, DECK_TOP + 4, 5, P, 2, 0.4), { tone: "hi" });
    shapes.push(A.slab(wall, DECK_TOP + 4, 5, { name: "tray.wall" }, 2));
  }
  const divider = { x: 250, y: y + 3, w: 4, d: d - 6, r: 1 };
  svg += S(k.slabOf(divider, DECK_TOP + 4, 5, P, 2, 0.4), { tone: "hi" });
  shapes.push(A.slab(divider, DECK_TOP + 4, 5, { name: "tray.divider" }, 2));
  svg += `<g data-slot="cert0" style="opacity:0">${docMarkup(CERT_SLOTS[0], TRAY_Y, TRAY_DOC_Z, "сертификат")}</g>`;
  svg += `<g data-slot="cert1" style="opacity:0">${docMarkup(CERT_SLOTS[1], TRAY_Y, TRAY_DOC_Z, "сертификат")}</g>`;
  const lip = { x, y: y + d - 3, w, d: 3, r: 1 };
  svg += S(k.slabOf(lip, DECK_TOP + 4, 1.5, P, 2, 0.3), { tone: "hi" });
  shapes.push(A.slab(lip, DECK_TOP + 4, 1.5, { name: "tray.lip" }, 2));
  svg += k.faceTextSvg(k.topMatrix([x + w / 2, y + d - 1.5], DECK_TOP + 5.5, P, "x"), "Сертификат", { size: 2.8, tone: "lo", anchor: "middle" });
  put("tray", [x + w / 2, y + d / 2, 8], svg, shapes);
}

function buildChute() {
  const shapes = [];
  let svg = "";
  const inner = k.insetPlan(CHUTE, 3);
  svg += S(k.slabOf(inner, DECK_TOP, 4, P, 3, 0.5), { tone: "lo" });
  shapes.push(A.slab(inner, DECK_TOP, 4, { name: "chute.floor" }, 3));
  const { x, y, w, d } = CHUTE;
  const walls = [
    { x, y, w, d: 3, r: 1 },
    { x, y: y + 3, w: 3, d: d - 6, r: 1 },
    { x: x + w - 3, y: y + 3, w: 3, d: d - 6, r: 1 },
  ];
  for (const wall of walls) {
    svg += S(k.slabOf(wall, DECK_TOP + 4, 5, P, 2, 0.4), { tone: "hi" });
    shapes.push(A.slab(wall, DECK_TOP + 4, 5, { name: "chute.wall" }, 2));
  }
  for (const ry of [-82, -60]) {
    const rib = { x: x + 6, y: ry, w: w - 12, d: 2, r: 0.6 };
    svg += S(k.slabOf(rib, DECK_TOP + 4, 0.6, P, 2, 0), { tone: "mid" });
    shapes.push(A.slab(rib, DECK_TOP + 4, 0.6, { name: "chute.rib" }, 2));
  }
  svg += `<g data-slot="reject" style="opacity:0">${docMarkup(REJECT_X, CHUTE_Y, CHUTE_DOC_Z, "отказ")}</g>`;
  const lip = { x, y: y + d - 3, w, d: 3, r: 1 };
  svg += S(k.slabOf(lip, DECK_TOP + 4, 1.5, P, 2, 0.3), { tone: "hi" });
  shapes.push(A.slab(lip, DECK_TOP + 4, 1.5, { name: "chute.lip" }, 2));
  svg += k.faceTextSvg(k.topMatrix([x + w / 2, y + d - 1.5], DECK_TOP + 5.5, P, "x"), "Отказ", { size: 2.8, tone: "lo", anchor: "middle" });
  put("chute", [x + w / 2, y + d / 2, 8], svg, shapes);
}

function buildWheel() {
  const [x, y] = WHEEL;
  const shapes = [];
  let svg = "";
  svg += S(k.cylinder(x, y, 10, DECK_TOP, 3, P, 32), { tone: "mid" });
  shapes.push(A.cylinder(x, y, 10, DECK_TOP, 3, { name: "wheel.foot" }));
  svg += S(k.cylinder(x, y, 5, DECK_TOP + 3, 55, P, 24), { tone: "mid", crease: "none" });
  svg += L([20, 40].map((z) => k.sideArc(x, y, 5, z, P, 16)).join(""), { tone: "faint" });
  shapes.push(A.cylinder(x, y, 5, DECK_TOP + 3, 55, { name: "wheel.post" }));
  svg += S(k.cylinder(x, y, 20, 62, 2, P, 64, 0.6), { tone: "mid" });
  shapes.push(A.cylinder(x, y, 20, 62, 2, { name: "wheel.index" }));
  const ticks = k.radialTicks(x, y, 19, 12, 3, 64, [2, 4], P, Math.PI);
  svg += L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
  svg += S(G.ringBand(WHEEL_Z0, WHEEL_Z1, 13, WHEEL_R, VF(x, y), P), { tone: "hi" });
  shapes.push(A.ring(VF(x, y), WHEEL_Z0, WHEEL_Z1, 13, WHEEL_R, { name: "wheel.rim" }));
  svg += S(k.cylinder(x, y, 6, WHEEL_Z0, 8, P, 32), { tone: "hi" });
  shapes.push(A.cylinder(x, y, 6, WHEEL_Z0, 8, { name: "wheel.hub" }));
  svg += L(k.knurl(x, y, WHEEL_R, WHEEL_Z0 + 3, WHEEL_Z1, 64, P, 0.3), { tone: "lo" });
  svg += L(k.ring(x, y, 13, WHEEL_Z1, P, 48), { tone: "faint" });
  put("wheel", [x, y, 36], svg, shapes);
}

function buildCounter() {
  const [x, y] = COUNTER;
  const shapes = [];
  let svg = "";
  const box = { x: x - 22, y: y - 13, w: 44, d: 26, r: 2 };
  svg += S(k.slabOf(box, DECK_TOP, 10, P, 4, 0.6), { tone: "hi" });
  shapes.push(A.slab(box, DECK_TOP, 10, { name: "counter.box" }));
  const win = { x: x - 16, y: y - 8, w: 32, d: 16, r: 1 };
  svg += S(k.slabOf(win, DECK_TOP + 10, 0.6, P, 3, 0), { tone: "lo", crease: "none" });
  shapes.push(A.slab(win, DECK_TOP + 10, 0.6, { name: "counter.window" }, 3));
  svg += L(k.planOutline(k.insetPlan(win, 1.2), DECK_TOP + 10.6, P), { tone: "faint" });
  svg += `<text class="iso-face-text" data-tone="lit" data-counter transform="${k.topMatrix([x, y], DECK_TOP + 10.6, P, "x")}" font-size="9.5" text-anchor="middle">00</text>`;
  svg += D([at([box.x + 4, box.y + 4, DECK_TOP + 10]), at([box.x + box.w - 4, box.y + box.d - 4, DECK_TOP + 10])], { size: 0.42 });
  put("counter", [x, y, 9], svg, shapes);
}

// ==== moving parts =====================================================================

function carriageSVG() {
  const plan = { x: CAR_REST_X - CAR_W / 2, y: -CAR_D / 2, w: CAR_W, d: CAR_D, r: 3 };
  let svg = "";
  for (const y of [-RAIL_HALF, RAIL_HALF]) {
    const bush = { x: CAR_REST_X - 7, y: y - 5, w: 14, d: 10, r: 1.5 };
    svg += S(k.slabOf(bush, RAIL_TOP, 3, P, 3, 0.4), { tone: "mid" });
    R.solid(A.slab(bush, RAIL_TOP, 3, { name: "carriage.bushing" }));
  }
  svg += S(k.slabOf(plan, CAR_Z, CAR_H, P, 4, 0.6), { tone: "hi" });
  R.solid(A.slab(plan, CAR_Z, CAR_H, { name: "carriage.body" }));
  svg += L(k.sideSeam(plan, CAR_Z + 3, P, 4), { tone: "faint" });
  const screws = [[CAR_REST_X - 17, -17], [CAR_REST_X + 17, -17], [CAR_REST_X - 17, 17], [CAR_REST_X + 17, 17]];
  svg += L(screws.map(([x, y]) => k.ring(x, y, 2, CAR_TOP, P, 14)).join(""), { tone: "lo" });
  svg += D(screws.map(([x, y]) => at([x, y, CAR_TOP])), { size: 0.42 });
  svg += L(k.lineOnTop([CAR_REST_X - 18, 0], [CAR_REST_X + 18, 0], CAR_TOP, P), { tone: "faint" });
  return svg;
}

function rollerSVG() {
  const head = { x: S1 - 13, y: -17, w: 26, d: 34, r: 3 };
  let svg = S(k.slabOf(head, TOOL_REST, 6, P, 4, 0.6), { tone: "hi" });
  R.solid(A.slab(head, TOOL_REST, 6, { name: "roller.head" }));
  for (const sy of [-1, 1]) {
    const arm = { x: S1 - 5, y: sy === 1 ? 14 : -17, w: 10, d: 3, r: 1 };
    svg += S(k.slabOf(arm, 59, 5, P, 3, 0.4), { tone: "mid" });
    R.solid(A.slab(arm, 59, 5, { name: "roller.arm" }));
  }
  const F = G.frameAlong([S1, -14, 59], [0, 1, 0]);
  svg += S(G.disc(0, 28, 5, F, P), { tone: "hi", crease: "lo" });
  R.solid(A.disc(F, 0, 28, 5, { name: "roller" }));
  svg += S(k.cylinder(S1, 0, 2.6, GLAND_Z0, GLAND_Z1 - GLAND_Z0, P, 20), { tone: "mid", crease: "none" });
  R.solid(A.cylinder(S1, 0, 2.6, GLAND_Z0, GLAND_Z1 - GLAND_Z0, { name: "roller.rod" }));
  return svg;
}

function probeSVG() {
  const head = { x: S2 - 12, y: -12, w: 24, d: 24, r: 3 };
  let svg = S(k.slabOf(head, TOOL_REST, 6, P, 4, 0.6), { tone: "hi" });
  R.solid(A.slab(head, TOOL_REST, 6, { name: "probe.head" }));
  svg += S(G.ringBand(62, 64, 3, 4.5, VF(S2, 0), P), { tone: "mid" });
  R.solid(A.ring(VF(S2, 0), 62, 64, 3, 4.5, { name: "probe.collar" }));
  svg += S(k.cylinder(S2, 0, 3, 58, 6, P, 24), { tone: "hi", crease: "lo" });
  R.solid(A.cylinder(S2, 0, 3, 58, 6, { name: "probe" }));
  svg += S(k.cylinder(S2, 0, 1.6, 55, 3, P, 18), { tone: "hi" });
  R.solid(A.cylinder(S2, 0, 1.6, 55, 3, { name: "probe.tip" }));
  svg += S(k.cylinder(S2, 0, 2.6, GLAND_Z0, GLAND_Z1 - GLAND_Z0, P, 20), { tone: "mid", crease: "none" });
  R.solid(A.cylinder(S2, 0, 2.6, GLAND_Z0, GLAND_Z1 - GLAND_Z0, { name: "probe.rod" }));
  return svg;
}

function stampSVG() {
  const body = { x: S4 - 14, y: -11, w: 28, d: 22, r: 3 };
  let svg = S(k.cylinder(S4, 0, 2.6, 66, GLAND_Z1 - 66, P, 20), { tone: "mid", crease: "none" });
  R.solid(A.cylinder(S4, 0, 2.6, 66, GLAND_Z1 - 66, { name: "stamp.rod" }));
  svg += S(k.slabOf(body, 56, 10, P, 4, 0.6), { tone: "hi" });
  R.solid(A.slab(body, 56, 10, { name: "stamp.body" }));
  svg += L(k.sideSeam(body, 60, P, 4), { tone: "faint" });
  const face = { x: S4 - 12, y: -9, w: 24, d: 18, r: 2 };
  svg += S(k.slabOf(face, 54, 2, P, 3, 0.4), { tone: "hi", crease: "lo" });
  R.solid(A.slab(face, 54, 2, { name: "stamp.face" }));
  svg += L(k.planOutline(k.insetPlan(face, 2), 56, P), { tone: "faint" });
  svg += L(k.knurl(S4, 0, 2.6, 66.5, 69.5, 16, P), { tone: "lo" });
  return svg;
}

function ramSVG() {
  let svg = S(k.cylinder(S3, 0, 5, PRESS_PLATE_Z + PRESS_PLATE_H, PRESS_HEAD_Z - PRESS_PLATE_Z - PRESS_PLATE_H, P, 28), { tone: "mid", crease: "none" });
  R.solid(A.cylinder(S3, 0, 5, PRESS_PLATE_Z + PRESS_PLATE_H, PRESS_HEAD_Z - PRESS_PLATE_Z - PRESS_PLATE_H, { name: "press.ram" }));
  svg += L(k.sideArc(S3, 0, 5, 76, P, 18), { tone: "faint" });
  return svg;
}

function plateSVG() {
  const plate = { x: S3 - 12, y: -10, w: 24, d: 20, r: 3 };
  let svg = S(k.slabOf(plate, PRESS_PLATE_Z, PRESS_PLATE_H, P, 4, 0.6), { tone: "hi", crease: "lo" });
  R.solid(A.slab(plate, PRESS_PLATE_Z, PRESS_PLATE_H, { name: "press.pressure" }));
  svg += L(k.planOutline(k.insetPlan(plate, 2.5), PRESS_PLATE_Z + PRESS_PLATE_H, P), { tone: "faint" });
  for (let i = -1; i <= 1; i++) {
    svg += L(k.lineOnTop([plate.x + 4, i * 6], [plate.x + plate.w - 4, i * 6], PRESS_PLATE_Z + PRESS_PLATE_H, P), { tone: "faint", free: true });
  }
  return svg;
}

// ==== assemble ========================================================================

buildBase();
buildRail();
buildGate(S1, "Заявка");
buildGate(S2, "Анализ");
buildPress();
buildGate(S4, "Решение");
buildTray();
buildChute();
buildWheel();
buildCounter();

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

const art =
  R.items.map((it) => it.svg).join("") +
  `<g data-part="carriage">${carriageSVG()}</g>` +
  `<g data-part="doc" style="opacity:1">${docMarkup(S1, 0, DOC_Z, "")}</g>` +
  `<g data-part="roller-head">${rollerSVG()}</g>` +
  `<g data-part="probe-head">${probeSVG()}</g>` +
  `<g data-part="stamp-head">${stampSVG()}</g>` +
  `<g data-part="press-ram">${ramSVG()}</g>` +
  `<g data-part="press-plate">${plateSVG()}</g>` +
  `<g data-part="press-dial">${pressDialSVG()}</g>` +
  `<g data-part="wheel">${wheelMarkup(90, WHEEL)}</g>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Стенд сертификации: массивное основание на четырёх ножках, рельс на стойках и каретка с документом. Над рельсом стоят четверо ворот с подписями Заявка, Анализ, Испытания и Решение. На первых воротцах документ прижимает ролик, на вторых опускается щуп, на третьих работает пресс с циферблатом, на четвёртых штамп ставит отметку. После решения документ уходит в лоток Сертификат или в жёлоб Отказ. Маховик со стрелкой показывает этап, счётчик считает проверенные заявки.",
  body: art,
});

// ==== geometry data for the live page =================================================

const HOLD = [1.2, 1.7, 1.7, 1.9, 1.7, 2.4];
const LIVE = {
  P,
  S1,
  S2,
  S3,
  S4,
  STATIONS,
  BEATS: M.BEATS_PER_APPLICATION,
  LAST: M.LAST,
  APPLICATIONS: M.APPLICATIONS,
  READOUTS: Array.from({ length: M.LAST + 1 }, (_, beat) => M.readout(beat)),
  TESTED: Array.from({ length: M.LAST + 1 }, (_, beat) => M.testedAt(beat)),
  HOLD,
  DOC_W,
  DOC_D,
  DOC_H,
  DOC_Z,
  DOC_C,
  CAR_W,
  CAR_D,
  CAR_Z,
  CAR_H,
  CAR_TOP,
  RAIL_TOP,
  TRAY_Y,
  TRAY_DOC_Z,
  TRAY_DOC_C,
  CERT_SLOTS,
  CHUTE_Y,
  CHUTE_DOC_Z,
  CHUTE_DOC_C,
  REJECT_X,
  DELIVERY_LIFT,
  WHEEL,
  WHEEL_R,
  WHEEL_Z0,
  WHEEL_Z1,
  PRESS_DIAL,
  PRESS_PLATE_Z,
  PRESS_PLATE_H,
  PRESS_HEAD_Z,
  DROPS,
  SLOT_IDS: ["cert0", "reject", "cert1"],
};

// ==== live code =======================================================================

const live = `
const C = ${JSON.stringify(LIVE)};
const P = C.P;
const DOC_W = C.DOC_W, DOC_D = C.DOC_D, DOC_H = C.DOC_H;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const docEl = svg.querySelector('[data-part="doc"]');
const carEl = svg.querySelector('[data-part="carriage"]');
const rollerEl = svg.querySelector('[data-part="roller-head"]');
const probeEl = svg.querySelector('[data-part="probe-head"]');
const stampEl = svg.querySelector('[data-part="stamp-head"]');
const ramEl = svg.querySelector('[data-part="press-ram"]');
const plateEl = svg.querySelector('[data-part="press-plate"]');
const wheelEl = svg.querySelector('[data-part="wheel"]');
const needleEl = svg.querySelector('[data-part="press-needle"]');
const counterEl = svg.querySelector("[data-counter]");
const slotEls = C.SLOT_IDS.map((id) => svg.querySelector('[data-slot="' + id + '"]'));
const still = matchMedia("(prefers-reduced-motion: reduce)");

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const STATION_FOR_BEAT = [C.S1, C.S1, C.S2, C.S3, C.S4, C.S4, C.S1];

const spokeRing = ${spokeRing.toString()};
const wheelMarkup = ${wheelMarkup.toString().replace(/\bk\./g, "")};
const docMarkup = ${docMarkup.toString().replace(/\bk\./g, "")};
const needleD = ${needleD.toString().replace(/\bk\./g, "")};

function stageIndex(beat) {
  const b = beat % C.BEATS;
  return b <= 1 ? 0 : b === 2 ? 1 : b === 3 ? 2 : 3;
}

function carriageX(s) {
  const i = clamp(Math.floor(s), 0, 5);
  const t = ease(clamp(s - i, 0, 1));
  return STATION_FOR_BEAT[i] + (STATION_FOR_BEAT[i + 1] - STATION_FOR_BEAT[i]) * t;
}

function docAt(appIndex, p) {
  if (p <= 3) {
    const i = Math.min(3, Math.floor(p));
    const t = ease(clamp(p - i, 0, 1));
    const x = C.STATIONS[i] + (C.STATIONS[Math.min(3, i + 1)] - C.STATIONS[i]) * t;
    return [x, 0, C.DOC_C];
  }
  const app = C.APPLICATIONS[appIndex];
  const dest = app.decision === "сертификат"
    ? [C.CERT_SLOTS[app.slot], C.TRAY_Y, C.TRAY_DOC_C]
    : [C.REJECT_X, C.CHUTE_Y, C.CHUTE_DOC_C];
  const a = [C.S4, 0, C.DOC_C];
  const b = [C.S4 + 24, 0, C.DOC_C];
  const c = [dest[0], dest[1], C.DELIVERY_LIFT];
  const t = clamp(p - 3, 0, 1);
  if (t < 0.28) return lerp3(a, b, ease(t / 0.28));
  if (t < 0.72) return lerp3(b, c, ease((t - 0.28) / 0.44));
  return lerp3(c, dest, ease((t - 0.72) / 0.28));
}

function workPulse(t) {
  if (t < 0.2) return ease(t / 0.2);
  if (t < 0.85) return 1;
  if (t < 1.15) return 1 - ease((t - 0.85) / 0.3);
  return 0;
}

let shown = 0;
let target = 0;
let s = 0;
let hold = C.HOLD[0];
let touring = !still.matches;
let resetting = false;
let resetClock = 0;
let arrived = true;
let beatClock = 0;
let wheelAngle = 90;
let lastMark = "";
let frame = 0;
let last = 0;
let visible = false;
let idleTimer = 0;

function draw(dt) {
  const appIndex = clamp(Math.floor(s / C.BEATS), 0, C.APPLICATIONS.length - 1);
  const app = C.APPLICATIONS[appIndex];
  const p = clamp(s - appIndex * C.BEATS - 1, 0, 4);
  const pos = docAt(appIndex, p);
  const rest = [C.S1, 0, C.DOC_C];
  docEl.setAttribute("transform", translateAlong(P, [pos[0] - rest[0], pos[1] - rest[1], pos[2] - rest[2]]));

  let docOpacity = 0;
  if (!resetting) {
    const u = s - appIndex * C.BEATS;
    const fadeIn = appIndex === 0 ? 1 : ease(clamp(u / 0.3, 0, 1));
    const fadeOut = 1 - ease(clamp((u - 5.45) / 0.55, 0, 1));
    docOpacity = clamp(fadeIn * fadeOut, 0, 1);
  }
  docEl.style.opacity = docOpacity.toFixed(3);

  const shownBeat = shown % C.BEATS;
  const decided = shownBeat >= 5 || (shownBeat === 4 && arrived && beatClock > 0.55);
  const mark = decided ? app.decision : "";
  if (mark !== lastMark) {
    docEl.innerHTML = docMarkup(C.S1, 0, C.DOC_Z, mark);
    lastMark = mark;
  }

  const carX = resetting ? C.S4 + (C.S1 - C.S4) * ease(clamp(1 - s / C.LAST, 0, 1)) : carriageX(s);
  carEl.setAttribute("transform", translateAlong(P, [carX - C.S1, 0, 0]));

  const pulse = arrived && !still.matches && !resetting ? workPulse(beatClock) : 0;
  const rollerDrop = shownBeat === 1 ? C.DROPS.roller * pulse : 0;
  const probeDrop = shownBeat === 2 ? C.DROPS.probe * pulse : 0;
  const pressDrop = shownBeat === 3 ? C.DROPS.press * pulse : 0;
  const stampDrop = shownBeat === 4 ? C.DROPS.stamp * pulse : 0;
  rollerEl.setAttribute("transform", translateAlong(P, [0, 0, -rollerDrop]));
  probeEl.setAttribute("transform", translateAlong(P, [0, 0, -probeDrop]));
  stampEl.setAttribute("transform", translateAlong(P, [0, 0, -stampDrop]));
  plateEl.setAttribute("transform", translateAlong(P, [0, 0, -pressDrop]));
  const plateTop = C.PRESS_PLATE_Z + C.PRESS_PLATE_H - pressDrop;
  ramEl.innerHTML = solidSvg(cylinder(C.S3, 0, 5, plateTop, C.PRESS_HEAD_Z - plateTop, P, 28), { tone: "mid", crease: "none" });
  needleEl.setAttribute("d", needleD(pressDrop / C.DROPS.press, C.PRESS_DIAL));

  const want = 90 + stageIndex(shown) * 90;
  let goal = want;
  while (goal - wheelAngle > 180) goal -= 360;
  while (goal - wheelAngle < -180) goal += 360;
  wheelAngle = still.matches ? goal : wheelAngle + (goal - wheelAngle) * (1 - Math.exp(-dt / 0.14));
  wheelEl.innerHTML = wheelMarkup(wheelAngle, C.WHEEL);

  for (let i = 0; i < C.APPLICATIONS.length; i++) {
    const start = i * C.BEATS + 4.7;
    let opacity = 0;
    if (!resetting && s >= start) opacity = ease(clamp((s - start) / 0.3, 0, 1));
    if (resetting) opacity = 0;
    slotEls[i].style.opacity = opacity.toFixed(3);
  }

  const text = C.READOUTS[shown];
  if (readout.textContent !== text) readout.textContent = text;
  const digits = String(C.TESTED[shown]).padStart(2, "0");
  if (counterEl.textContent !== digits) counterEl.textContent = digits;
  stage.setAttribute("aria-valuenow", String(shown));
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (resetting) {
    resetClock += dt;
    s = still.matches ? 0 : s + (0 - s) * (1 - Math.exp(-dt / 0.22));
    if (s < 0.02) {
      s = 0;
      resetting = false;
      target = 0;
      shown = 0;
      arrived = true;
      beatClock = 0;
      hold = C.HOLD[0];
    }
  } else {
    s = still.matches ? target : s + (target - s) * (1 - Math.exp(-dt / 0.3));
    if (Math.abs(target - s) < 0.002) s = target;
    if (!arrived && Math.abs(target - s) < 0.008) {
      arrived = true;
      beatClock = 0;
    }
    if (arrived) beatClock += dt;
    if (touring && arrived) {
      hold -= dt;
      if (hold <= 0) {
        if (target >= C.LAST) {
          resetting = true;
          resetClock = 0;
          target = 0;
          shown = 0;
          arrived = true;
          beatClock = 0;
        } else {
          target += 1;
          shown = target;
          arrived = false;
          beatClock = 0;
          hold = C.HOLD[shown % C.BEATS];
        }
      }
    }
  }
  draw(dt);
  const settled = !touring && !resetting && arrived && Math.abs(target - s) < 0.003;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}

const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};

function steer(next) {
  touring = false;
  resetting = false;
  target = clamp(next, 0, C.LAST);
  shown = target;
  arrived = Math.abs(s - target) < 0.01;
  beatClock = 0;
  hold = C.HOLD[shown % C.BEATS];
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (still.matches) return;
    touring = true;
    hold = C.HOLD[shown % C.BEATS];
    arrived = Math.abs(s - target) < 0.01;
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
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  const want = Math.round(share * C.LAST);
  if (want !== shown) steer(want);
});

stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = shown + 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = shown - 1;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = C.LAST;
  if (next === null) return;
  event.preventDefault();
  steer(next);
});

if (still.matches) touring = false;
draw(1 / 60);
`;

// ==== card ============================================================================

const css = `<style>
.iso-plate-corner[data-corner="readout"]{white-space:normal;text-align:right;max-width:64%;line-height:1.42;bottom:42px}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
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
    title: "Стенд сертификации",
    hint: "Ведите заявку по этапам",
    readout: M.readout(0),
    keys: [
      { mark: "lit", label: "заявка на каретке" },
      { mark: "raised", label: "документы в лотках" },
    ],
    caption:
      "Три заявки проходят станции Заявка, Анализ, Испытания и Решение: две получают сертификат, одна уходит в жёлоб отказа. Щуп опускается на анализ, пресс с циферблатом испытывает, штамп ставит отметку, а маховик и счётчик показывают этап и число проверенных заявок.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Стенд сертификации: стрелки ведут заявку по этапам, Home возвращает к заявке, End показывает выдачу" aria-valuemin="0" aria-valuemax="${M.LAST}" aria-valuenow="0">${svg}</div>`,
  });

function build(theme) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: "Стенд сертификации", theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}

build("dark");
build("light");

A.auditOrExit(R, P, {});
