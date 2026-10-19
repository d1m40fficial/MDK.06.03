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
// Design: a belt sorting conveyor. A big card rides the belt left to right and passes three pivoting
// gates in order (сфера применения, масштаб, способ обработки). Above each gate stands a large readable
// INDICATOR PLATE (a "stamp"): the признак name on a header and the current card's value in large text.
// The gate arm pivots and its dial needle swings to the value's position on a compact value scale, and the
// class cell for that value lifts. Only the current value per gate is shown large, so the belt, the card
// and the three gates stay the clear subject and the labels never become a wall of small words.
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
const AZIMUTH = 48;
const PAD = 30;

// ---- bench ----
const PLATE = { x: -300, y: -98, w: 600, d: 196, r: 14 };
const PLATE_H = 12;
const FOOT_Z = -22;
const FOOT_H = 9;

// ---- frame, rollers, belt ----
const RAIL_Y = 72;
const RAIL_D = 10;
const RAIL_Z = 30;
const RAIL_H = 10;
const RAIL_TOP = RAIL_Z + RAIL_H;
const LEG_XS = [-272, -136, 0, 136, 272];
const ROLL_R = 11;
const ROLL_Z = 42;
const ROLL_SPAN = 116;
const ROLL_XS = [-220, -160, -100, -40, 20, 80, 140, 200];
const DRUM_XS = [-244, 244];
const BELT_X0 = -248;
const BELT_X1 = 248;
const BELT_Z = 53;
const BELT_H = 3.5;
const BELT_TOP = BELT_Z + BELT_H;
const BELT_Y = 58;

// ---- gate towers ----
const GATE_X = [-215, 0, 215];
const POST_HW = 5;
const POST_TOP = 166;
const BEAM_Z = 166;
const BEAM_H = 7;
const BEAM_TOP = BEAM_Z + BEAM_H;
const ARM_Z = 156;
const ARM_H = 4;
const BLADE_Z = 151;
const BLADE_H = 4;
const HUB_Z = 156;
const HUB_H = 8;
const HUB_R = 7;
const AXLE_R = 3;
const DIAL_Z = BEAM_TOP;
const DIAL_H = 8;
const DIAL_TOP = DIAL_Z + DIAL_H;
const DIAL_R = 13;
const MAST_Z0 = DIAL_TOP;
const MAST_Z1 = 196;
const MAST_R = 3;
const PANEL_Z0 = 196;
const PANEL_H = 70;
const PANEL_TOP = PANEL_Z0 + PANEL_H;
const PANEL_W = 196;
const PANEL_T = 6;
const HEADER_Z = PANEL_Z0 + PANEL_H - 14;
const DIVIDER_Z = PANEL_Z0 + PANEL_H - 25;
const VALUE_Z = PANEL_Z0 + 23;
const F_HEAD = 18;
const F_VALUE = 23;

// ---- class cells (a row in front of each gate) ----
const CELL_Y = 88;
const CELL_D = 20;
const CELL_H = 13;
const CELL_Z0 = PLATE_H;
const CELL_LIFT = 9;
const CELL_GAP = 5;
const CELL_MAXW = 34;
const CELL_SPAN = 120;

// ---- feed chute, output bin, output counter, motor ----
const CHUTE = { x: -296, y: -34, w: 40, d: 68, r: 4 };
const CHUTE_Z = 44;
const CHUTE_H = 10;
const BIN = { x: 256, y: -34, w: 44, d: 68, r: 5 };
const BIN_H = 34;
const BIN_WALL = 5;
const MOTOR = { x: -296, y: -96, w: 32, d: 16, r: 3 };
const MOTOR_H = 22;

// ---- the card ----
const CARD_X0 = -232;
const CARD_W = 170;
const CARD_T = 6;
const CARD_H = 92;
const CARD_Z0 = BELT_TOP;
const CARD_TOP = CARD_Z0 + CARD_H;
const CARD_ENDX = 208;

// ---- gate values, cells, angles ----
for (const [gi, gx] of GATE_X.entries()) {
  const trait = TRAITS[gi];
  const n = trait.values.length;
  const spacing = Math.min(CELL_MAXW + CELL_GAP, CELL_SPAN / Math.max(1, n - 1));
  const cw = spacing - CELL_GAP;
  const cells = Array.from({ length: n }, (_, i) => {
    const cx = gx + (i - (n - 1) / 2) * spacing;
    return { x: cx - cw / 2, y: CELL_Y - CELL_D / 2, w: cw, d: CELL_D, r: 3, cx, cy: CELL_Y };
  });
  GATE_X[gi] = { x: gx, trait: gi, cells, spacing };
}
const GATES = GATE_X;
const REST_ANGLES = GATES.map((g) => valueAngle(g, indices(CARDS[0])[g.trait]));
const CARD_ANGLES = CARDS.map((card) => GATES.map((g) => valueAngle(g, TRAITS[g.trait].values.indexOf(card.values[g.trait]))));
const READOUTS = CARDS.map(readout);

function valueAngle(g, index) {
  const c = g.cells[index];
  return Math.atan2(c.cx - g.x, -c.cy);
}

// name wrapped onto the card, up to 3 lines
function wrap(text, maxChars = 15, maxLines = 3) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (!cur || cand.length <= maxChars) cur = cand;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  while (lines.length > maxLines) lines[lines.length - 2] += ` ${lines.pop()}`;
  return lines;
}
const CARD_NAMES = CARDS.map((c) => wrap(c.name));
const CARD_VALUES = CARDS.map((c) => c.values);

// ---- camera (tall figure: fit the width exactly, then size the height to the content) ----
const POINTS = [
  ...k.boxCorners(PLATE, FOOT_Z - FOOT_H, 0),
  ...GATES.flatMap((g) => [
    [g.x - PANEL_W / 2, 0, PANEL_TOP + 2],
    [g.x + PANEL_W / 2, 0, PANEL_TOP + 2],
    ...g.cells.flatMap((c) => [[c.x, c.y, CELL_Z0 + CELL_H + CELL_LIFT], [c.x + c.w, c.y + c.d, CELL_Z0 + CELL_H + CELL_LIFT]]),
  ]),
  [CHUTE.x, CHUTE.y, CHUTE_Z + CHUTE_H + 2],
  [BIN.x + BIN.w, BIN.y + BIN.d, BIN_H],
  [MOTOR.x, MOTOR.y, MOTOR_H],
  [CARD_X0 - CARD_W / 2, -CARD_T, CARD_TOP],
  [CARD_X0 + CARD_W / 2, CARD_T, CARD_TOP],
];
const UNIT = { origin: [0, 0], scale: 1, azimuth: AZIMUTH, elevation: 30 };
const flat = POINTS.map((p) => k.iso(p, UNIT));
const spanX = Math.max(...flat.map(([x]) => x)) - Math.min(...flat.map(([x]) => x));
const spanY = Math.max(...flat.map(([, y]) => y)) - Math.min(...flat.map(([, y]) => y));
const HEIGHT = Math.round((spanY * (WIDTH - PAD * 2)) / spanX + PAD * 2);
const P = k.fitProjection(POINTS, WIDTH, HEIGHT, { pad: PAD, azimuth: AZIMUTH });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const facePath = (pts, close) => pts.map((p, i) => `${i ? "L" : "M"}${at(p)[0].toFixed(1)} ${at(p)[1].toFixed(1)}`).join("") + (close ? "Z" : "");
const textOn = (gx, yFace, z, text, size, tone, anchor, part) =>
  `<text class="iso-face-text" data-tone="${tone}"${part ? ` data-part="${part}"` : ""} transform="${k.sideMatrix([gx, yFace], z, P, "left")}" font-size="${size}" text-anchor="${anchor}">${escapeText(text)}</text>`;
const escapeText = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- painter's layer, with recorded shapes for the audit ----
const R = A.recorder(P, {});
const put = (name, at3, svg, shapes, bias = 0) => R.put({ name, at: at3, bias, svg, shapes });

function rollAt(x, name, extra = "") {
  const F = G.frameAlong([x, 0, ROLL_Z], [0, 1, 0]);
  const svg = S(G.disc(-ROLL_SPAN / 2, ROLL_SPAN / 2, ROLL_R, F, P), { tone: "mid", crease: "faint" }) + extra;
  put(name, [x, 0, ROLL_Z], svg, [A.disc(F, -ROLL_SPAN / 2, ROLL_SPAN / 2, ROLL_R, { name })]);
}

function buildBase() {
  let svg = `<path class="iso-halo" d="${k.haloOf(PLATE, FOOT_Z - FOOT_H, PLATE_H, P)}"/>`;
  const shapes = [];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    svg += S(k.cylinder(x, y, 7, FOOT_Z - FOOT_H, 1.6, P, 28), { tone: "lo" });
    svg += S(k.cylinder(x, y, 5.4, FOOT_Z - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" });
    shapes.push(A.cylinder(x, y, 7, FOOT_Z - FOOT_H, 1.6, { name: "stand.foot.plate" }));
    shapes.push(A.cylinder(x, y, 5.4, FOOT_Z - FOOT_H + 1.6, FOOT_H - 1.6, { name: "stand.foot" }));
  }
  svg += S(k.slabOf(PLATE, FOOT_Z, PLATE_H, P, 8, 1.6), { tone: "mid" });
  shapes.push(A.slab(PLATE, FOOT_Z, PLATE_H, { name: "stand.base", ground: true }));
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
  for (const x of [-204, -68, 68, 204]) {
    const plan = { x: x - 5, y: -RAIL_Y + 5, w: 10, d: 2 * RAIL_Y - 10, r: 2 };
    put(`stand.stretcher@${x}`, [x, 0, 11], S(k.slabOf(plan, 8, 6, P, 3, 0.4), { tone: "lo" }), [A.slab(plan, 8, 6, { name: "stand.stretcher" })]);
  }
  for (const y of [RAIL_Y, -RAIL_Y]) {
    const plan = { x: -276, y: y - RAIL_D / 2, w: 552, d: RAIL_D, r: 2 };
    let railSvg = S(k.slabOf(plan, RAIL_Z, RAIL_H, P, 3, 1), { tone: "mid" }) + L(k.sideSeam(plan, RAIL_TOP - 3, P, 3), { tone: "faint" });
    railSvg += D(LEG_XS.flatMap((x) => [at([x, y - 3, RAIL_TOP]), at([x, y + 3, RAIL_TOP])]), { size: 0.45 });
    put(`stand.rail${y > 0 ? "N" : "F"}`, [0, y, RAIL_TOP - RAIL_H / 2], railSvg, [A.slab(plan, RAIL_Z, RAIL_H, { name: "stand.rail" })]);
  }
  const strip = { x: -262, y: RAIL_Y + RAIL_D / 2, w: 524, d: 0 };
  const ticks = k.sideTicks(-260, 260, 6, 5, RAIL_Y + RAIL_D / 2, RAIL_TOP - 1, [1.6, 3.2], P);
  put("stand.scale", [0, RAIL_Y + RAIL_D / 2, RAIL_TOP - 2], L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }), [A.slab({ x: strip.x, y: RAIL_Y + RAIL_D / 2 - 0.3, w: strip.w, d: 0.6, r: 0 }, RAIL_TOP - 4, 4, { name: "stand.scale" })], 0.2);
}

function buildConveyor() {
  for (const x of ROLL_XS) rollAt(x, `roll@${x}`);
  for (const x of DRUM_XS) {
    const dots = D([-6, 0, 6].flatMap((dy) => [at([x, dy, ROLL_Z + ROLL_R - 0.4])]), { size: 0.4 });
    rollAt(x, `drum@${x}`, dots);
  }
  const plan = { x: BELT_X0, y: -BELT_Y, w: BELT_X1 - BELT_X0, d: 2 * BELT_Y, r: 6 };
  let inner = L(k.planOutline({ x: BELT_X0 + 2, y: -BELT_Y + 2, w: BELT_X1 - BELT_X0 - 4, d: 2 * BELT_Y - 4, r: 5 }, BELT_TOP, P), { tone: "faint" });
  inner += L(k.lineOnTop([BELT_X0 + 2, 0], [BELT_X1 - 2, 0], BELT_TOP + 0.02, P), { tone: "faint", flow: true });
  const zx0 = BELT_X0 + 2;
  const zx1 = BELT_X1 - 2;
  const zy = BELT_Y - 2;
  const steps = Math.round((zx1 - zx0) / 22);
  const zig = Array.from({ length: steps + 1 }, (_, i) => {
    const x = zx0 + ((zx1 - zx0) * i) / steps;
    const y = i % 2 ? -zy : zy;
    return `${i ? "L" : "M"}${at([x, y, BELT_TOP + 0.01]).map((v) => v.toFixed(1)).join(" ")}`;
  }).join("");
  inner += L(zig, { tone: "faint" });
  const svg = S(k.slabOf(plan, BELT_Z, BELT_H, P, 6, 0.6), { tone: "mid", crease: "lo", inner });
  put("belt", [8, 0, BELT_TOP - BELT_H / 2], svg, [A.slab(plan, BELT_Z, BELT_H, { name: "belt" })]);
}

function buildChute() {
  const plan = CHUTE;
  const shapes = [];
  let svg = "";
  for (const [x, y] of [[CHUTE.x + 7, -26], [CHUTE.x + 7, 26], [CHUTE.x + CHUTE.w - 7, -26], [CHUTE.x + CHUTE.w - 7, 26]]) {
    svg += S(k.cylinder(x, y, 3, 0, CHUTE_Z, P, 16), { tone: "mid" });
    shapes.push(A.cylinder(x, y, 3, 0, CHUTE_Z, { name: "chute.post" }));
  }
  svg += S(k.slabOf(plan, CHUTE_Z, CHUTE_H, P, 5, 0.8), { tone: "mid" });
  shapes.push(A.slab(plan, CHUTE_Z, CHUTE_H, { name: "chute.tray" }));
  svg += S(k.slabOf(k.insetPlan(plan, 5), CHUTE_Z + CHUTE_H - 3, 3, P, 4), { tone: "lo", crease: "none" });
  shapes.push(A.slab(k.insetPlan(plan, 5), CHUTE_Z + CHUTE_H - 3, 3, { name: "chute.well" }));
  svg += L(k.planOutline(k.insetPlan(plan, 5), CHUTE_Z + CHUTE_H, P, 4), { tone: "lo" });
  svg += L(k.sideSeam(plan, CHUTE_Z + CHUTE_H - 4, P, 5), { tone: "faint" });
  svg += D([[CHUTE.x + 8, CHUTE.y + 8], [CHUTE.x + CHUTE.w - 8, CHUTE.y + 8], [CHUTE.x + 8, CHUTE.y + CHUTE.d - 8], [CHUTE.x + CHUTE.w - 8, CHUTE.y + CHUTE.d - 8]].map(([x, y]) => at([x, y, CHUTE_Z + CHUTE_H])), { size: 0.45 });
  put("chute", [CHUTE.x + CHUTE.w / 2, 0, CHUTE_Z + CHUTE_H / 2], svg, shapes);
}

function dialTicks(gx) {
  const g = GATES.find((gg) => gg.x === gx);
  const minor = [];
  const major = [];
  for (const c of g.cells) {
    const th = valueAngle(g, g.cells.indexOf(c));
    const dir = [Math.sin(th), -Math.cos(th)];
    minor.push(k.lineOnTop([gx + dir[0] * (DIAL_R - 4.6), 0 + dir[1] * (DIAL_R - 4.6)], [gx + dir[0] * (DIAL_R - 1.6), dir[1] * (DIAL_R - 1.6)], DIAL_TOP, P));
  }
  const zeroTh = valueAngle(g, 0);
  const zdir = [Math.sin(zeroTh), -Math.cos(zeroTh)];
  major.push(k.lineOnTop([gx + zdir[0] * (DIAL_R - 6), zdir[1] * (DIAL_R - 6)], [gx + zdir[0] * (DIAL_R - 1.6), zdir[1] * (DIAL_R - 1.6)], DIAL_TOP, P));
  return { minor: minor.join(""), major: major.join("") };
}

function armRings(px, py, th) {
  const rot = (pts) => pts.map(([x, y]) => {
    const dx = x - px;
    const dy = y - py;
    const c = Math.cos(th);
    const s = Math.sin(th);
    return [px + dx * c - dy * s, py + dx * s + dy * c];
  });
  const bar = rot(k.ringOf({ x: px - 3.5, y: py - 63, w: 7, d: 56, r: 2.5 }, 2));
  const blade = rot(k.ringOf({ x: px - 9, y: py - 67, w: 18, d: 5, r: 1.5 }, 2));
  return { bar, blade };
}
function armSvg(px, py, th) {
  const { bar, blade } = armRings(px, py, th);
  return S(k.extrude(bar, ARM_Z, ARM_H, P), { tone: "mid", crease: "faint" }) + S(k.extrude(blade, BLADE_Z, BLADE_H, P), { tone: "hi", crease: "lo" });
}
function needleD(px, py, th) {
  const dx = Math.sin(th);
  const dy = -Math.cos(th);
  return k.lineOnTop([px - dx * 3.4, py - dy * 3.4], [px + dx * (DIAL_R - 3.2), py + dy * (DIAL_R - 3.2)], DIAL_TOP + 0.25, P);
}

function buildGate(g, gi) {
  const x = g.x;
  // a single far post carries a cantilever bracket; the near side stays open so nothing hides the card
  const post = { x: x - POST_HW, y: -RAIL_Y - POST_HW, w: 2 * POST_HW, d: 2 * POST_HW, r: 2 };
  put(`gate${gi}.post`, [x, -RAIL_Y, RAIL_TOP + (POST_TOP - RAIL_TOP) / 2], S(k.slabOf(post, RAIL_TOP, POST_TOP - RAIL_TOP, P, 3, 0.5), { tone: "mid" }), [A.slab(post, RAIL_TOP, POST_TOP - RAIL_TOP, { name: "gate.post" })]);
  const beam = { x: x - POST_HW, y: -RAIL_Y - POST_HW, w: 2 * POST_HW, d: RAIL_Y + 2 * POST_HW + 6, r: 2 };
  let beamSvg = S(k.slabOf(beam, BEAM_Z, BEAM_H, P, 3, 0.8), { tone: "mid" });
  beamSvg += L(k.sideSeam(beam, BEAM_Z + 2, P, 3), { tone: "faint" });
  put(`gate${gi}.beam`, [x, 0, BEAM_Z + BEAM_H / 2], beamSvg, [A.slab(beam, BEAM_Z, BEAM_H, { name: "gate.beam" })]);
  // fixed axle from the beam down to the rotating hub
  const axleZ0 = HUB_Z + HUB_H;
  put(`gate${gi}.axle`, [x, 0, (axleZ0 + BEAM_Z) / 2], S(k.cylinder(x, 0, AXLE_R, axleZ0, BEAM_Z - axleZ0, P, 20), { tone: "mid" }), [A.cylinder(x, 0, AXLE_R, axleZ0, BEAM_Z - axleZ0, { name: "gate.axle" })]);
  // rotating hub + arm at rest
  const restTh = REST_ANGLES[gi];
  const hubSvg = S(k.cylinder(x, 0, HUB_R, HUB_Z, HUB_H, P, 24), { tone: "mid" }) + L(k.sideArc(x, 0, HUB_R, HUB_Z + 1.4, P, 24), { tone: "faint" });
  const armShapes = [A.cylinder(x, 0, HUB_R, HUB_Z, HUB_H, { name: "gate.hub" }), A.extruded(armRings(x, 0, restTh).bar, ARM_Z, ARM_H, { name: "gate.arm" }), A.extruded(armRings(x, 0, restTh).blade, BLADE_Z, BLADE_H, { name: "gate.blade" })];
  put(`gate${gi}.arm`, [x, -18, ARM_Z], `<g data-part="arm-${gi}">${hubSvg}${armSvg(x, 0, restTh)}</g>`, armShapes);
  // dial: the compact value scale
  const ticks = dialTicks(x);
  let dialInner = L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
  dialInner += L(k.ring(x, 0, DIAL_R - 2, DIAL_TOP, P, 48), { tone: "lo" });
  dialInner += L(k.ring(x, 0, 1.5, DIAL_TOP, P, 16), { tone: "mid" });
  const dialSvg = S(k.cylinder(x, 0, DIAL_R, DIAL_Z, DIAL_H, P, 48, 0.8), { tone: "hi", crease: "lo" }) + L(k.knurl(x, 0, DIAL_R, DIAL_Z + 1.6, DIAL_Z + 3.2, 64, P, 0.3), { tone: "lo" }) + L(k.sideArc(x, 0, DIAL_R, DIAL_Z + 1.6, P, 48), { tone: "faint" }) + dialInner;
  put(`gate${gi}.dial`, [x, 0, DIAL_Z + DIAL_H / 2], dialSvg, [A.cylinder(x, 0, DIAL_R, DIAL_Z, DIAL_H, { name: "gate.dial" })]);
  // mast + indicator plate (the big readable stamp)
  put(`gate${gi}.mast`, [x, 0, (MAST_Z0 + MAST_Z1) / 2], S(k.cylinder(x, 0, MAST_R, MAST_Z0, MAST_Z1 - MAST_Z0, P, 20), { tone: "mid", crease: "none" }) + L(k.sideArc(x, 0, MAST_R, MAST_Z0 + 4, P, 16), { tone: "faint" }), [A.cylinder(x, 0, MAST_R, MAST_Z0, MAST_Z1 - MAST_Z0, { name: "gate.mast" })]);
  buildPanel(g, gi);
  // cell row in front
  buildCells(g, gi);
}

function buildPanel(g, gi) {
  const x = g.x;
  const yFace = PANEL_T / 2;
  const F = G.frameOf([x, 0, PANEL_Z0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const poly = k.ringOf({ x: -PANEL_W / 2, y: 0, w: PANEL_W, d: PANEL_H, r: 7 }, 4);
  let svg = S(G.prismOf(F, poly, -PANEL_T / 2, PANEL_T / 2, P), { tone: "mid", crease: "faint" });
  const ix = PANEL_W / 2 - 7;
  svg += L(facePath([[x - ix, yFace, PANEL_Z0 + 7], [x + ix, yFace, PANEL_Z0 + 7], [x + ix, yFace, PANEL_TOP - 7], [x - ix, yFace, PANEL_TOP - 7]], true), { tone: "lo" });
  svg += L(facePath([[x - ix, yFace, DIVIDER_Z], [x + ix, yFace, DIVIDER_Z]], false), { tone: "lo" });
  svg += D([at([x - ix + 4, yFace, PANEL_Z0 + 11]), at([x + ix - 4, yFace, PANEL_Z0 + 11])], { size: 0.5 });
  svg += textOn(x, yFace + 0.3, HEADER_Z, TRAITS[g.trait].label, F_HEAD, "mid", "middle");
  svg += textOn(x, yFace + 0.3, VALUE_Z, CARD_VALUES[0][g.trait], F_VALUE, "hi", "middle", `value-${gi}`);
  put(`gate${gi}.panel`, [x, 0, PANEL_Z0 + PANEL_H / 2], svg, [A.prism(F, poly, -PANEL_T / 2, PANEL_T / 2, { name: "gate.panel" })]);
}

function buildCells(g, gi) {
  g.cells.forEach((c, ci) => {
    const plan = { x: c.x, y: c.y, w: c.w, d: c.d, r: c.r };
    let svg = S(k.slabOf(plan, CELL_Z0, CELL_H, P, 4, 0.7), { tone: "mid" });
    svg += S(k.slabOf(k.insetPlan(plan, 3), CELL_Z0 + CELL_H - 2.4, 2.4, P, 3), { tone: "lo", crease: "none" });
    svg += L(k.planOutline(k.insetPlan(plan, 3), CELL_Z0 + CELL_H, P, 3), { tone: "lo" });
    svg += D([at([c.x + 2.5, c.y + 2.5, CELL_Z0]), at([c.x + c.w - 2.5, c.y + c.d - 2.5, CELL_Z0])], { size: 0.4 });
    put(`gate${gi}.cell${ci}`, [c.cx, c.cy, CELL_Z0 + CELL_H / 2], `<g data-part="cell-${gi}-${ci}">${svg}</g>`, [A.slab(plan, CELL_Z0, CELL_H, { name: "cell" })]);
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
  const lp = { x: BIN.x + BIN_WALL, y: BIN.y + BIN.d - BIN_WALL, w: BIN.w - 2 * BIN_WALL, d: BIN_WALL, r: 1.5 };
  svg += S(k.slabOf(lp, BIN_H, 3, P, 2, 0.3), { tone: "mid", crease: "lo" });
  svg += k.faceTextSvg(k.topMatrix([lp.x + lp.w / 2, lp.y + lp.d / 2], BIN_H + 3, P, "x"), "00", { size: 8, tone: "hi", anchor: "middle" }).replace(/^<text/, '<text data-part="digits"');
  shapes.push(A.slab(lp, BIN_H, 3, { name: "bin.plate" }));
  put("bin", [BIN.x + BIN.w / 2, 0, BIN_H / 2], svg, shapes);
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

function cardPipSvg(x0, dz) {
  return `<path class="iso-pip" data-part="pip" d="${k.sideRing([x0, CARD_T / 2 + 0.4, CARD_Z0 + dz], 5, "y", P)}"/>`;
}
function buildCard() {
  const x0 = CARD_X0;
  const yFace = CARD_T / 2;
  const F = G.frameOf([x0, 0, CARD_Z0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const poly = k.ringOf({ x: -CARD_W / 2, y: 0, w: CARD_W, d: CARD_H, r: 5 }, 4);
  let svg = S(G.prismOf(F, poly, -CARD_T / 2, CARD_T / 2, P), { tone: "hi", lit: true, crease: "lo" });
  const ix = CARD_W / 2 - 6;
  svg += L(facePath([[x0 - ix, yFace, CARD_Z0 + 6], [x0 + ix, yFace, CARD_Z0 + 6], [x0 + ix, yFace, CARD_TOP - 6], [x0 - ix, yFace, CARD_TOP - 6]], true), { tone: "faint" });
  for (let i = 0; i < 3; i++) {
    svg += `<text class="iso-face-text" data-tone="hi" data-part="cardname-${i}" transform="${k.sideMatrix([x0, yFace + 0.3], CARD_TOP - 14 - i * 27, P, "left")}" font-size="18" text-anchor="middle">${escapeText(CARD_NAMES[0][i] || "")}</text>`;
  }
  svg += `<g data-part="pips">${[-44, 0, 44].map((dx) => cardPipSvg(x0 + dx, 14)).join("")}</g>`;
  put("card", [x0, 0, CARD_TOP], `<g data-part="card" transform="">${svg}</g>`, [A.prism(F, poly, -CARD_T / 2, CARD_T / 2, { name: "card" })]);
}

buildBase();
buildFrame();
buildConveyor();
buildChute();
buildMotor();
GATES.forEach((g, gi) => buildGate(g, gi));
buildBin();
buildCard();

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

const needles = GATES.map((g, gi) => `<path data-part="needle-${gi}" class="iso-line" data-tone="hi" data-free="true" d="${needleD(g.x, 0, REST_ANGLES[gi])}" style="stroke-width:1.1"/>`).join("");
const art = R.items.map((it) => it.svg).join("") + needles;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A belt sorting conveyor on a bench. A card rides the belt from a feed chute to an output bin and passes three pivoting gates one after another. Above each gate stands a large indicator plate: the признак name (сфера, масштаб, способ обработки) and the current card's value. The gate arm pivots and its dial needle swings to that value on a compact scale, and the class cell for it lifts. The card carries the system name and picks up one class at each gate.",
  body: art,
});

// ---- live behaviour ----
const live = `
const P = ${JSON.stringify(P)};
const ARM_Z = ${ARM_Z}, ARM_H = ${ARM_H}, BLADE_Z = ${BLADE_Z}, BLADE_H = ${BLADE_H}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP};
const armRings = ${armRings.toString().replace(/\bk\./g, "")};
const armSvg = ${armSvg.toString().replace(/\bk\./g, "").replace(/\bS\(/g, "solidSvg(")};
const needleD = ${needleD.toString().replace(/\bk\./g, "")};
const GATES = ${JSON.stringify(GATES.map((g) => ({ x: g.x })))};
const CARD_ANGLES = ${JSON.stringify(CARD_ANGLES)};
const READOUTS = ${JSON.stringify(READOUTS)};
const RUN_VALUES = ${JSON.stringify(CARDS.map((c) => indices(c)))};
const CARD_VALUES = ${JSON.stringify(CARD_VALUES)};
const CARD_NAMES = ${JSON.stringify(CARD_NAMES)};
const EMPTY = 0.7, RUN = 4.0, DROP = 0.8, HOLD = 1.0;
const CARD_X0 = ${CARD_X0}, CARD_ENDX = ${CARD_ENDX}, BINX = ${BIN.x + BIN.w / 2}, BINZ = 4, CARDZ = ${CARD_Z0};
const LIFT = ${CELL_LIFT};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const arms = GATES.map((_, i) => svg.querySelector('[data-part="arm-' + i + '"]'));
const needles = GATES.map((_, i) => svg.querySelector('[data-part="needle-' + i + '"]'));
const cellEls = GATES.map((g, i) => svg.querySelectorAll('[data-part^="cell-' + i + '-"]'));
const valueEls = GATES.map((_, i) => svg.querySelector('[data-part="value-' + i + '"]'));
const nameEls = [0, 1, 2].map((k) => svg.querySelector('[data-part="cardname-' + k + '"]'));
const pipEls = svg.querySelectorAll('[data-part="pip"]');
const card = svg.querySelector('[data-part="card"]');
const digits = svg.querySelector('[data-part="digits"]');
const readoutEl = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

let idx = 0, t = 0, counted = false, count = 0;
let frame = 0, last = 0, visible = false, touring = !still.matches, idleTimer = 0;
let cardX = CARD_X0, cardZ = CARDZ, cardOp = 1;
const angleNow = GATES.map((_, i) => 0), angleTarget = GATES.map((_, i) => 0);
const fireNow = GATES.map(() => [false]);
let liftNow = GATES.map((_, i) => cellEls[i].length), liftTarget = liftNow.map(() => 0);

function reset() {
  liftNow = GATES.map((_, i) => new Array(cellEls[i].length).fill(0));
  liftTarget = GATES.map((_, i) => new Array(cellEls[i].length).fill(0));
}
reset();
function paintCard(i) {
  const lines = CARD_NAMES[i];
  nameEls.forEach((el, k) => { el.textContent = lines[k] || ""; });
  valueEls.forEach((el, gi) => { el.textContent = CARD_VALUES[i][gi]; });
}
function setPips(n) {
  pipEls.forEach((el, i) => { el.setAttribute("data-on", i < n ? "" : null); });
  pipEls.forEach((el, i) => { if (i >= n) el.removeAttribute("data-on"); });
}
function advance(dt) {
  t += dt;
  const total = EMPTY + RUN + DROP + HOLD;
  if (t >= total) { t -= total; idx = (idx + 1) % READOUTS.length; counted = false; paintCard(idx); }
  const vals = RUN_VALUES[idx];
  if (t < EMPTY) {
    cardOp = 0;
    GATES.forEach((_, gi) => { angleTarget[gi] = 0; liftTarget[gi].fill(0); fireNow[gi] = false; });
    cardX = CARD_X0; cardZ = CARDZ;
    setPips(0);
  } else {
    cardOp = 1;
    const u = (t - EMPTY) / RUN;
    if (u < 1) {
      cardX = CARD_X0 + u * (CARD_ENDX - CARD_X0);
      cardZ = CARDZ;
      GATES.forEach((g, gi) => {
        const fire = clamp((g.x - CARD_X0) / (CARD_ENDX - CARD_X0), 0, 1);
        const on = u >= fire;
        fireNow[gi] = on;
        angleTarget[gi] = on ? CARD_ANGLES[idx][gi] : 0;
        liftTarget[gi] = liftTarget[gi].map((_, ci) => (on && ci === vals[gi] ? LIFT : 0));
      });
      let passed = 0;
      GATES.forEach((g, gi) => { if (fireNow[gi]) passed++; });
      setPips(passed);
    } else {
      const d = ease((t - EMPTY - RUN) / DROP);
      cardX = CARD_ENDX + d * (BINX - CARD_ENDX);
      cardZ = CARDZ + d * (BINZ - CARDZ);
      GATES.forEach((g, gi) => { angleTarget[gi] = CARD_ANGLES[idx][gi]; fireNow[gi] = true; });
      liftTarget = liftTarget.map((arr, gi) => arr.map((_, ci) => (ci === vals[gi] ? LIFT : 0)));
      setPips(3);
      if (!counted) { counted = true; count += 1; }
    }
  }
  if (readoutEl.textContent !== READOUTS[idx]) readoutEl.textContent = READOUTS[idx];
}
function draw() {
  GATES.forEach((g, gi) => {
    arms[gi].innerHTML = armSvg(g.x, 0, angleNow[gi]);
    needles[gi].setAttribute("d", needleD(g.x, 0, angleNow[gi]));
    liftTarget[gi].forEach((_, ci) => { cellEls[gi][ci].setAttribute("transform", translateAlong(P, [0, 0, liftNow[gi][ci]])); });
  });
  card.setAttribute("transform", translateAlong(P, [cardX - CARD_X0, 0, cardZ - CARDZ]));
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
    angleNow[gi] = calm ? angleTarget[gi] : angleNow[gi] + (angleTarget[gi] - angleNow[gi]) * (1 - Math.exp(-dt / 0.32));
    liftNow[gi] = liftNow[gi].map((v, ci) => (calm ? liftTarget[gi][ci] : v + (liftTarget[gi][ci] - v) * (1 - Math.exp(-dt / 0.3))));
  });
  if (!touring) cardX = calm ? CARD_ENDX : cardX + (CARD_ENDX - cardX) * (1 - Math.exp(-dt / 0.3));
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
function takeOver() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (still.matches) return; touring = true; t = 0; counted = false; run(); }, 4200);
  run();
}
function select(i) {
  idx = clamp(i, 0, READOUTS.length - 1);
  paintCard(idx);
  takeOver();
  const vals = RUN_VALUES[idx];
  GATES.forEach((g, gi) => {
    angleTarget[gi] = CARD_ANGLES[idx][gi];
    liftTarget[gi] = liftTarget[gi].map((_, ci) => (ci === vals[gi] ? LIFT : 0));
    fireNow[gi] = true;
  });
  cardX = CARD_ENDX; cardZ = CARDZ; cardOp = 1;
  setPips(3);
  readoutEl.textContent = READOUTS[idx];
  run();
}
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { touring = false; paintCard(0); const vals = RUN_VALUES[0]; GATES.forEach((g, gi) => { angleTarget[gi] = CARD_ANGLES[0][gi]; angleNow[gi] = angleTarget[gi]; liftTarget[gi] = liftTarget[gi].map((_, ci) => (ci === vals[gi] ? LIFT : 0)); liftNow[gi] = liftTarget[gi].slice(); }); cardX = CARD_ENDX; setPips(3); readoutEl.textContent = READOUTS[0]; }
function pointer(event) {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  select(Math.round(share * (READOUTS.length - 1)));
}
stage.addEventListener("pointermove", pointer);
stage.addEventListener("mousemove", pointer);
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
.iso-pip{fill:var(--anatomy-mid);fill-opacity:.12;stroke:var(--anatomy-lo);stroke-width:.6}
.iso-pip[data-on]{fill:var(--anatomy-hi);fill-opacity:1}
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
