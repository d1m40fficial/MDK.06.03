// Figure fig-audit-bench, built with the Anatomy skill.
//
// Contract with course-studio (kept):
//   1. Kit imported from the vendored copy: ../../../../../../_anatomy/kit/iso-kit.mjs
//   2. `node build.mjs` writes BOTH themes next to this file:
//        fig-audit-bench.html        (dark)
//        fig-audit-bench-light.html  (light)
//   3. `node build.mjs --audit` runs Anatomy's audit.
//   4. The card `fig` is "Fig 1".
//
// The object: an audit stand on a heavy bed. A turntable carries five evidence
// tiles. A lever on a column takes one tile at a time with its probe, holds it
// at the comparator in front of the reference card, then drops it into the
// «Соответствие» or «Несоответствие» tray. A handwheel on a post drives the
// lever, a dial of findings counts checked evidences and nonconformities, and
// after the fifth evidence the report card slides out into its tray.
//
// The static machine is drawn through one recorder so the audit can prove that
// every recorded part rests on the one below and that overlapping parts are
// painted in true depth order. The moving parts (tiles, lever, handwheel
// spokes, table index marks, needles, report card, status lens) are groups
// rebuilt each frame by the inlined kit.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import * as A from "../../../../../../_anatomy/kit/audit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-audit-bench";
const WIDTH = 660;
const HEIGHT = 430;
const SAMPLE = M.SAMPLE;
const STEP = 4.55;
const END = SAMPLE * STEP + 2.6;

// ---- bed ----
const PLATE = { x: -190, y: -112, w: 360, d: 220, r: 14 };
const PLATE_H = 12;
const FOOT_Z = -9;
const FOOT_H = 9;
const BED = 12;

// ---- turntable ----
const T = [-111, 20];
const TABLE_R = 58;
const TABLE_TOP = 34;
const TILE_R = 40;
const TILE_W = 24;
const TILE_H = 4;

// ---- lever ----
const PIVOT = [30, 20];
const R_ARM = 101;
const ARM_Z = 124;
const BEAM_H = 7;
const ARM_PARK = 180;
const REF_DEG = 270;
const TRAY_DEG = [25, -25];
const PROBE_HIGH = 58;
const GRAB_Z = TABLE_TOP + TILE_H;
const COMPARE_TOP = 38;
const COMPARE_Z = COMPARE_TOP + TILE_H;
const TRAY_FLOOR = 16;
const HEAD_H = 4.5;
const HEAD_R = 7;
const ROD_R = 2.6;

const rad = (deg) => (deg * Math.PI) / 180;
const trayCentre = (deg) => [PIVOT[0] + R_ARM * Math.cos(rad(deg)), PIVOT[1] + R_ARM * Math.sin(rad(deg))];
const TRAY_C = trayCentre(TRAY_DEG[0]);
const TRAY_N = trayCentre(TRAY_DEG[1]);
const trayPlan = (centre) => ({ x: centre[0] - 24, y: centre[1] - 18, w: 48, d: 36, r: 4 });

// ---- reference stand ----
const STAND_PAD = { x: 6, y: -104, w: 48, d: 24, r: 3 };
const STAND_COL = { x: 10, y: -102, w: 6, d: 8, r: 1.5 };
const STAND_COL_R = { x: 44, y: -102, w: 6, d: 8, r: 1.5 };
const STAND_CROSS = { x: 6, y: -104, w: 48, d: 24, r: 3 };
const STAND_FRAME = { x: 8, y: -94, w: 44, d: 4, r: 1.5 };
const STAND_CARD = { x: 12, y: -90, w: 36, d: 1, r: 0.6 };
const STAND_HANGER = { x: 24, y: -94, w: 12, d: 4, r: 1 };
const STAND_BRACKET = { x: 20, y: -94, w: 20, d: 24, r: 2 };
const STAND_POST = { x: 12, y: -90, w: 8, d: 8, r: 1.5 };
const STAND_POST_R = { x: 40, y: -90, w: 8, d: 8, r: 1.5 };
const COMPARATOR = { x: 10, y: -94, w: 40, d: 28, r: 3 };

// ---- report ----
const REPORT = { x: -55, y: 71, w: 50, d: 34, r: 4 };
const PRINT = { x: -86, y: 72, w: 24, d: 32, r: 3 };
const CARD_W = 26;
const CARD_D = 18;
const CARD_REST_Z = 16.0;

// ---- handwheel ----
const FLY = [30, 78];
const FLY_Y = 60;
const FLY_R = 18;

// ---- dial ----
const DIAL = [60, 84];
const DIAL_R = 22;
const DIAL_TOP = 25;

// ---- fit ----
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, FOOT_Z, 0),
    [PIVOT[0], PIVOT[1], 136],
    [PIVOT[0] - 50, PIVOT[1], 136],
    [STAND_CARD.x, STAND_CARD.y, 88],
    [STAND_CARD.x + STAND_CARD.w, STAND_CARD.y, 88],
    [FLY[0] + FLY_R, FLY[1], 96],
    [TRAY_C[0] + 24, TRAY_C[1] + 18, 30],
    [TRAY_N[0] + 24, TRAY_N[1] + 18, 30],
    [DIAL[0] + DIAL_R, DIAL[1], DIAL_TOP + 2],
    [T[0] - TABLE_R, T[1], TABLE_TOP],
    [T[0] + TABLE_R, T[1], TABLE_TOP],
    [REPORT.x, REPORT.y + REPORT.d, 18],
    [PRINT.x, PRINT.y + PRINT.d, 34],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 45 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// bare kit names, so the same geometry functions run in the page
const extrude = k.extrude;
const cylinder = k.cylinder;
const segment = k.segment;
const iso = k.iso;
const pathOf = k.pathOf;
const circleRing = k.circleRing;
const solidSvg = k.solidSvg;
const lineSvg = k.lineSvg;
const dotsSvg = k.dotsSvg;
const lineOnTop = k.lineOnTop;
const planOutline = k.planOutline;
const insetPlan = k.insetPlan;
const ring = k.ring;

// ---- painter's layer, with recorded shapes for the audit ----
const R = A.recorder(P, {});
const put = (name, at3, svg, shapes, bias = 0) => {
  for (const shape of shapes) R.solid(shape);
  return R.put({ name, at: at3, bias, svg, shapes });
};

// ==== movable geometry ================================================================

function tileRing(cx, cy, angle, w) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const h = w / 2;
  return [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
  ].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

function outlineOf(points, z) {
  return pathOf(points.map((p) => iso([p[0], p[1], z], P)), true);
}

function tileMarkup(cx, cy, angle, z, lines, lit) {
  let svg = solidSvg(extrude(tileRing(cx, cy, angle, TILE_W), z, TILE_H, P, { convex: true }), { tone: "hi", crease: "lo", lit });
  svg += lineSvg(outlineOf(tileRing(cx, cy, angle, TILE_W - 4), z + TILE_H), { tone: "faint" });
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  for (let row = 0; row < lines; row++) {
    const yy = -5 + row * 5;
    const p0 = [cx - 7 * c - yy * s, cy - 7 * s + yy * c];
    const p1 = [cx + 7 * c - yy * s, cy + 7 * s + yy * c];
    svg += lineSvg(segment([p0[0], p0[1], z + TILE_H], [p1[0], p1[1], z + TILE_H], P), { tone: "lo", free: true });
  }
  return svg;
}

function beamRing(angle, r0, r1, hw, ch) {
  const u = [Math.cos(angle), Math.sin(angle)];
  const v = [-Math.sin(angle), Math.cos(angle)];
  const p = (s, t) => [PIVOT[0] + u[0] * s + v[0] * t, PIVOT[1] + u[1] * s + v[1] * t];
  return [p(r0, -hw + ch), p(r0 + ch, -hw), p(r1 - ch, -hw), p(r1, -hw + ch), p(r1, hw - ch), p(r1 - ch, hw), p(r0 + ch, hw), p(r0, -hw + ch)];
}

function armMarkup(deg, probe) {
  const a = rad(deg);
  const u = [Math.cos(a), Math.sin(a)];
  const px = PIVOT[0] + u[0] * R_ARM;
  const py = PIVOT[1] + u[1] * R_ARM;
  let svg = "";
  svg += solidSvg(extrude(beamRing(a, 0, 106, 7, 3), ARM_Z, BEAM_H, P, { convex: true }), { tone: "mid", crease: "lo" });
  svg += solidSvg(extrude(beamRing(a, -36, 0, 5, 2), ARM_Z, BEAM_H - 2, P, { convex: true }), { tone: "mid", crease: "faint" });
  svg += solidSvg(cylinder(PIVOT[0] + u[0] * -28, PIVOT[1] + u[1] * -28, 8, ARM_Z - 12, 12, P, 32), { tone: "mid", crease: "lo" });
  svg += solidSvg(extrude(beamRing(a, 93, 106, 9, 2), 117, 7, P, { convex: true }), { tone: "mid", crease: "lo" });
  svg += solidSvg(cylinder(px, py, 4, 115, 2, P, 24), { tone: "mid" });
  const headTop = probe + HEAD_H;
  svg += solidSvg(cylinder(px, py, ROD_R, headTop, 115 - headTop, P, 16), { tone: "hi", crease: "none" });
  svg += solidSvg(cylinder(px, py, HEAD_R, probe, HEAD_H, P, 28), { tone: "hi", crease: "lo" });
  svg += lineSvg(ring(px, py, HEAD_R + 0.1, probe + HEAD_H - 1, P, 28), { tone: "faint" });
  svg += solidSvg(cylinder(px, py, 4.5, probe - 0.4, 0.4, P, 20), { tone: "hi" });
  // a rib along the top of the beam and two bolts on the carriage
  svg += lineSvg(segment([PIVOT[0], PIVOT[1], ARM_Z + BEAM_H], [PIVOT[0] + u[0] * 106, PIVOT[1] + u[1] * 106, ARM_Z + BEAM_H], P), { tone: "faint" });
  svg += dotsSvg([iso([px, py, ARM_Z + BEAM_H], P), iso([PIVOT[0] + u[0] * 96, PIVOT[1] + u[1] * 96, ARM_Z + BEAM_H], P), iso([PIVOT[0] + u[0] * 40, PIVOT[1] + u[1] * 40, ARM_Z + BEAM_H], P), iso([PIVOT[0] + u[0] * 62, PIVOT[1] + u[1] * 62, ARM_Z + BEAM_H], P)], { size: 0.45, tone: "lo" });
  return svg;
}

function flyMarkup(deg) {
  let svg = "";
  for (let i = 0; i < 5; i++) {
    const a = rad(deg + i * 72);
    svg += lineSvg(segment([FLY[0] + Math.cos(a) * 4.5, FLY_Y + 6.2, FLY[1] + Math.sin(a) * 4.5], [FLY[0] + Math.cos(a) * 14.5, FLY_Y + 6.2, FLY[1] + Math.sin(a) * 14.5], P), { tone: "hi" });
  }
  const a = rad(deg + 36);
  const hx = FLY[0] + Math.cos(a) * 14.6;
  const hz = FLY[1] + Math.sin(a) * 14.6;
  svg += lineSvg(pathOf(circleRing(hx, hz, 2.6, 14).map(([x, z]) => iso([x, FLY_Y + 7.6, z], P)), true), { tone: "hi" });
  svg += dotsSvg([iso([hx, FLY_Y + 7.6, hz], P)], { size: 0.55, tone: "hi" });
  return svg;
}

function tableMarkup(theta) {
  let svg = "";
  for (let j = 0; j < SAMPLE; j++) {
    const a = rad(-j * 72 + theta);
    const cx = T[0] + TILE_R * Math.cos(a);
    const cy = T[1] + TILE_R * Math.sin(a);
    svg += lineSvg(outlineOf(tileRing(cx, cy, a, TILE_W + 4), TABLE_TOP), { tone: "faint" });
  }
  const a = rad(theta);
  const ax = T[0] + (TABLE_R - 6) * Math.cos(a);
  const ay = T[1] + (TABLE_R - 6) * Math.sin(a);
  const bx = T[0] + (TABLE_R - 1.5) * Math.cos(a);
  const by = T[1] + (TABLE_R - 1.5) * Math.sin(a);
  svg += lineSvg(segment([ax, ay, TABLE_TOP], [bx, by, TABLE_TOP], P), { tone: "hi" });
  for (let j = 0; j < SAMPLE; j++) {
    const g = rad(-36 - j * 72 + theta);
    svg += lineSvg(segment([T[0] + Math.cos(g) * 24, T[1] + Math.sin(g) * 24, TABLE_TOP], [T[0] + Math.cos(g) * 50, T[1] + Math.sin(g) * 50, TABLE_TOP], P), { tone: "faint" });
  }
  return svg;
}

function needlesMarkup(checked, mismatched) {
  const long = rad(180 + 36 * checked);
  const short = rad(180 + 36 * mismatched);
  let svg = lineSvg(lineOnTop([DIAL[0] + Math.cos(long) * 3.4, DIAL[1] + Math.sin(long) * 3.4], [DIAL[0] + Math.cos(long) * 14, DIAL[1] + Math.sin(long) * 14], DIAL_TOP + 0.4, P), { tone: "lit", free: true });
  svg += lineSvg(lineOnTop([DIAL[0] + Math.cos(short) * 2.8, DIAL[1] + Math.sin(short) * 2.8], [DIAL[0] + Math.cos(short) * 9.5, DIAL[1] + Math.sin(short) * 9.5], DIAL_TOP + 0.9, P), { tone: "lo", className: "needle-bad", free: true });
  return svg;
}

function reportCardMarkup(x, y, z) {
  const plan = { x: x - CARD_W / 2, y: y - CARD_D / 2, w: CARD_W, d: CARD_D, r: 1 };
  let svg = solidSvg(k.slabOf(plan, z, 1.6, P, 3, 0.4), { tone: "hi", crease: "lo" });
  svg += lineSvg(planOutline(insetPlan(plan, 2.4), z + 1.6, P, 3), { tone: "faint" });
  for (let row = 0; row < 3; row++) {
    svg += lineSvg(lineOnTop([plan.x + 4, plan.y + 5 + row * 4], [plan.x + CARD_W - 4 - (row === 2 ? 8 : 0), plan.y + 5 + row * 4], z + 1.6, P), { tone: "lo", free: true });
  }
  return svg;
}

function lampMarkup(colour) {
  const points = circleRing(46, -86, 3, 20).map(([x, y]) => iso([x, y, 106], P));
  return `<path d="${pathOf(points, true)}" fill="${colour}" stroke="none"/>`;
}

// ==== static machine ==================================================================

function buildBase() {
  const shapes = [];
  let svg = `<path class="iso-halo" d="${k.haloOf(PLATE, FOOT_Z, FOOT_H + PLATE_H, P)}"/>`;
  for (const [x, y] of byDepth(k.corners(PLATE, 30))) {
    svg += S(k.cylinder(x, y, 7, FOOT_Z, FOOT_H, P, 28), { tone: "lo" });
    svg += L(k.ring(x, y, 7, FOOT_Z + 2, P, 24), { tone: "faint" });
    shapes.push(A.cylinder(x, y, 7, FOOT_Z, FOOT_H, { name: "stand.foot" }));
  }
  svg += S(k.slabOf(PLATE, 0, PLATE_H, P, 8, 1.6), { tone: "mid" });
  shapes.push(A.slab(PLATE, 0, PLATE_H, { name: "stand.base", ground: true }));
  svg += L(k.planOutline(k.insetPlan(PLATE, 6), PLATE_H, P), { tone: "lo" });
  const screws = k.corners(PLATE, 14);
  svg += L(screws.map(([x, y]) => k.ring(x, y, 2.4, PLATE_H, P, 16)).join(""), { tone: "lo" });
  svg += D(screws.map(([x, y]) => at([x, y, PLATE_H])), { size: 0.5 });
  // ruler strip along the left edge of the bed
  const strip = { x: PLATE.x + 8, y: -60, w: 7, d: 120, r: 1 };
  svg += S(k.slabOf(strip, PLATE_H, 0.6, P, 3), { tone: "lo", crease: "none" });
  const ticks = k.topTicks(-54, 54, 5, 5, strip.x + 0.8, PLATE_H + 0.6, [2, 3.6], P, "y");
  svg += L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
  shapes.push(A.slab(strip, PLATE_H, 0.6, { name: "stand.rule" }));
  // engraved nameplate on the bed
  const nameplate = { x: -168, y: 84, w: 66, d: 14, r: 1.5 };
  svg += S(k.slabOf(nameplate, PLATE_H, 0.9, P, 4), { tone: "lo", crease: "none" });
  svg += L(k.planOutline(k.insetPlan(nameplate, 1.6), PLATE_H + 0.9, P), { tone: "faint" });
  svg += L([40, 28, 34].map((w, i) => k.lineOnTop([nameplate.x + 5, nameplate.y + 3.6 + i * 3], [nameplate.x + 5 + w, nameplate.y + 3.6 + i * 3], PLATE_H + 0.9, P)).join(""), { tone: "lo", free: true });
  svg += D([at([nameplate.x + nameplate.w - 3, nameplate.y + 3, PLATE_H + 0.9]), at([nameplate.x + nameplate.w - 3, nameplate.y + nameplate.d - 3, PLATE_H + 0.9])], { size: 0.45 });
  shapes.push(A.slab(nameplate, PLATE_H, 0.9, { name: "stand.nameplate" }));
  // panel joint and a tapped pad on the free end of the bed
  svg += L(k.lineOnTop([84, -112], [84, 108], PLATE_H, P), { tone: "faint" });
  const pad = { x: 100, y: -100, w: 56, d: 44, r: 3 };
  svg += L(k.planOutline(pad, PLATE_H, P), { tone: "faint" });
  svg += D(k.corners(pad, 6).map(([x, y]) => at([x, y, PLATE_H])), { size: 0.45, tone: "lo" });
  // a stack of blank report cards waiting on the pad
  for (let i = 0; i < 3; i++) {
    const plan = { x: 112 + i * 0.7, y: -88 + i * 0.7, w: 30, d: 20, r: 1 };
    svg += S(k.slabOf(plan, PLATE_H + i * 1.8, 1.8, P, 3, 0.4), { tone: "hi", crease: "faint" });
    shapes.push(A.slab(plan, PLATE_H + i * 1.8, 1.8, { name: "stand.cards" + i }));
  }
  svg += L([0, 1, 2].map((i) => k.lineOnTop([116, -82 + i * 5], [136, -82 + i * 5], PLATE_H + 5.4, P)).join(""), { tone: "faint", free: true });
  put("stand.base", [0, 0, 0], svg, shapes, 0.1);
}

function buildTable() {
  const shapes = [];
  let svg = "";
  svg += S(k.cylinder(T[0], T[1], 48, BED, 3, P, 56), { tone: "lo" });
  shapes.push(A.cylinder(T[0], T[1], 48, BED, 3, { name: "table.flange" }));
  svg += S(k.cylinder(T[0], T[1], 44, BED + 3, 11, P, 56), { tone: "mid" });
  svg += L(k.sideArc(T[0], T[1], 44, BED + 8, P, 32), { tone: "faint" });
  shapes.push(A.cylinder(T[0], T[1], 44, BED + 3, 11, { name: "table.pedestal" }));
  svg += S(k.cylinder(T[0], T[1], TABLE_R, 26, 6, P, 72, 0.8), { tone: "mid", crease: "lo" });
  shapes.push(A.cylinder(T[0], T[1], TABLE_R, 26, 6, { name: "table.disc" }));
  svg += S(k.cylinder(T[0], T[1], TABLE_R - 2, 32, 2, P, 72), { tone: "hi", crease: "faint" });
  shapes.push(A.cylinder(T[0], T[1], TABLE_R - 2, 32, 2, { name: "table.top" }));
  svg += L(k.knurl(T[0], T[1], TABLE_R, 26.4, 31.6, 96, P, 0.35), { tone: "lo" });
  svg += L(k.ring(T[0], T[1], TABLE_R + 0.2, 26.4, P, 72), { tone: "faint" });
  svg += L(k.ring(T[0], T[1], TABLE_R + 0.2, 31.6, P, 72), { tone: "faint" });
  svg += L(k.ring(T[0], T[1], TABLE_R - 4.4, TABLE_TOP, P, 72), { tone: "lo" });
  svg += L(k.ring(T[0], T[1], 50, TABLE_TOP, P, 64), { tone: "faint" });
  svg += L(k.ring(T[0], T[1], 24, TABLE_TOP, P, 48), { tone: "faint" });
  svg += L(k.ring(T[0], T[1], 12, TABLE_TOP, P, 40), { tone: "faint" });
  svg += S(k.cylinder(T[0], T[1], 8, TABLE_TOP, 8, P, 32), { tone: "mid" });
  shapes.push(A.cylinder(T[0], T[1], 8, TABLE_TOP, 8, { name: "table.hub" }));
  svg += S(k.cylinder(T[0], T[1], 6, TABLE_TOP + 8, 2, P, 28), { tone: "hi" });
  shapes.push(A.cylinder(T[0], T[1], 6, TABLE_TOP + 8, 2, { name: "table.cap" }));
  svg += L(k.knurl(T[0], T[1], 8, TABLE_TOP + 1, TABLE_TOP + 7, 24, P, 0.3), { tone: "faint" });
  svg += L(k.ring(T[0], T[1], 8.2, TABLE_TOP + 1, P, 32), { tone: "faint" });
  svg += L(k.ring(T[0], T[1], 8.2, TABLE_TOP + 7, P, 32), { tone: "faint" });
  svg += D([at([T[0] + 24, T[1], 26]), at([T[0] - 24, T[1], 26]), at([T[0], T[1] + 24, 26]), at([T[0], T[1] - 24, 26])], { size: 0.45, tone: "lo" });
  put("table", [T[0], T[1], 22], svg, shapes);
}

function buildColumn() {
  const shapes = [];
  let svg = "";
  svg += S(k.cylinder(PIVOT[0], PIVOT[1], 16, BED, 4, P, 40), { tone: "mid" });
  shapes.push(A.cylinder(PIVOT[0], PIVOT[1], 16, BED, 4, { name: "lever.flange" }));
  svg += S(k.cylinder(PIVOT[0], PIVOT[1], 11, BED + 4, 3, P, 32), { tone: "mid" });
  shapes.push(A.cylinder(PIVOT[0], PIVOT[1], 11, BED + 4, 3, { name: "lever.collar" }));
  svg += S(k.cylinder(PIVOT[0], PIVOT[1], 9, BED + 7, 85, P, 32), { tone: "mid", crease: "none" });
  svg += L(k.sideArc(PIVOT[0], PIVOT[1], 9, 52, P, 20), { tone: "faint" });
  svg += L(k.ring(PIVOT[0], PIVOT[1], 9.2, 60, P, 32), { tone: "faint" });
  svg += L(k.ring(PIVOT[0], PIVOT[1], 9.2, 88, P, 32), { tone: "faint" });
  shapes.push(A.cylinder(PIVOT[0], PIVOT[1], 9, BED + 7, 85, { name: "lever.column" }));
  svg += S(k.cylinder(PIVOT[0], PIVOT[1], 14, 104, 10, P, 40, 0.7), { tone: "mid", crease: "lo" });
  shapes.push(A.cylinder(PIVOT[0], PIVOT[1], 14, 104, 10, { name: "lever.bearing" }));
  svg += L(k.knurl(PIVOT[0], PIVOT[1], 14, 105, 113, 48, P, 0.3), { tone: "lo" });
  svg += L(k.ring(PIVOT[0], PIVOT[1], 14.2, 105, P, 40), { tone: "faint" });
  svg += L(k.ring(PIVOT[0], PIVOT[1], 14.2, 113, P, 40), { tone: "faint" });
  svg += S(k.cylinder(PIVOT[0], PIVOT[1], 12, 114, 10, P, 36), { tone: "hi", crease: "lo" });
  shapes.push(A.cylinder(PIVOT[0], PIVOT[1], 12, 114, 10, { name: "lever.hub" }));
  svg += D([[PIVOT[0] + 7, PIVOT[1]], [PIVOT[0] - 7, PIVOT[1]], [PIVOT[0], PIVOT[1] + 7], [PIVOT[0], PIVOT[1] - 7]].map(([x, y]) => at([x, y, 124])), { size: 0.45, tone: "mid" });
  svg += L(k.ring(PIVOT[0], PIVOT[1], 12.4, 124, P, 40), { tone: "lo" });
  put("lever.column", [PIVOT[0], PIVOT[1], 60], svg, shapes);
}

function buildFlywheel() {
  const shapes = [];
  let svg = "";
  svg += S(k.cylinder(FLY[0], 50, 11, BED, 3, P, 32), { tone: "mid" });
  shapes.push(A.cylinder(FLY[0], 50, 11, BED, 3, { name: "wheel.flange" }));
  svg += S(k.cylinder(FLY[0], 50, 8, BED + 3, 67, P, 32), { tone: "mid", crease: "none" });
  shapes.push(A.cylinder(FLY[0], 50, 8, BED + 3, 67, { name: "wheel.post" }));
  svg += L(k.sideArc(FLY[0], 50, 8, 40, P, 20), { tone: "faint" });
  svg += L(k.ring(FLY[0], 50, 8.2, 52, P, 24), { tone: "faint" });
  // bearing block from the post to the wheel
  const bearing = { x: 26, y: 58, w: 8, d: 2, r: 1 };
  svg += S(k.slabOf(bearing, 74, 8, P, 3, 0.4), { tone: "mid" });
  shapes.push(A.slab(bearing, 74, 8, { name: "wheel.bearing" }));
  const F = G.frameAlong([FLY[0], FLY_Y, FLY[1]], [0, 1, 0]);
  svg += S(G.disc(0, 6, FLY_R, F, P), { tone: "lo", crease: "lo" });
  shapes.push(A.disc(F, 0, 6, FLY_R, { name: "wheel.disc" }));
  svg += S(G.ringBand(6, 7.4, FLY_R - 4, FLY_R, F, P), { tone: "hi", crease: "lo" });
  shapes.push(A.ring(F, 6, 7.4, FLY_R - 4, FLY_R, { name: "wheel.rim" }));
  svg += L(G.ribsOf(F, 0.4, 5.6, FLY_R, 60, P, { seams: true }), { tone: "faint" });
  svg += S(G.disc(6, 8, 5, F, P), { tone: "mid", crease: "faint" });
  shapes.push(A.disc(F, 6, 8, 5, { name: "wheel.hub" }));
  for (const rr of [5, 14]) {
    svg += L(pathOf(circleRing(FLY[0], FLY[1], rr, 40).map(([x, z]) => iso([x, FLY_Y + 6, z], P)), true), { tone: "faint" });
  }
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    svg += L(segment([FLY[0] + Math.cos(a) * (FLY_R - 3.4), FLY_Y + 7.4, FLY[1] + Math.sin(a) * (FLY_R - 3.4)], [FLY[0] + Math.cos(a) * (FLY_R - 1.2), FLY_Y + 7.4, FLY[1] + Math.sin(a) * (FLY_R - 1.2)], P), { tone: "lo" });
  }
  put("wheel", [FLY[0], 55, 60], svg, shapes);
}

function buildStand() {
  const shapes = [];
  let svg = "";
  svg += S(k.slabOf(STAND_PAD, BED, 6, P, 4, 0.6), { tone: "mid" });
  shapes.push(A.slab(STAND_PAD, BED, 6, { name: "stand.pad" }));
  for (const plan of [STAND_COL, STAND_COL_R]) {
    svg += S(k.slabOf(plan, BED + 6, 78, P, 3, 0.6), { tone: "mid" });
    svg += L(k.sideSeam(plan, 46, P, 3), { tone: "faint" });
    shapes.push(A.slab(plan, BED + 6, 78, { name: "stand.post" }));
  }
  svg += S(k.slabOf(STAND_CROSS, 96, 6, P, 4, 0.8), { tone: "mid" });
  svg += L(k.sideSeam(STAND_CROSS, 99, P, 4), { tone: "faint" });
  shapes.push(A.slab(STAND_CROSS, 96, 6, { name: "stand.crossbar" }));
  svg += D([[STAND_CROSS.x + 6, STAND_CROSS.y + 6], [STAND_CROSS.x + STAND_CROSS.w - 6, STAND_CROSS.y + 6], [STAND_CROSS.x + 6, STAND_CROSS.y + STAND_CROSS.d - 6], [STAND_CROSS.x + STAND_CROSS.w - 6, STAND_CROSS.y + STAND_CROSS.d - 6]].map(([x, y]) => at([x, y, 102])), { size: 0.45 });
  svg += S(k.slabOf(STAND_FRAME, 52, 36, P, 3, 0.6), { tone: "mid" });
  shapes.push(A.slab(STAND_FRAME, 52, 36, { name: "stand.frame" }));
  svg += L(k.sideSeam(STAND_FRAME, 70, P, 3), { tone: "faint" });
  svg += S(k.slabOf(STAND_HANGER, 88, 8, P, 3, 0.5), { tone: "mid" });
  shapes.push(A.slab(STAND_HANGER, 88, 8, { name: "stand.hanger" }));
  svg += S(k.slabOf(STAND_CARD, 56, 30, P, 2, 0.5), { tone: "hi", crease: "lo" });
  shapes.push(A.slab(STAND_CARD, 56, 30, { name: "stand.card" }));
  const cx0 = STAND_CARD.x + 3;
  const cx1 = STAND_CARD.x + STAND_CARD.w - 3;
  const cy0 = STAND_CARD.y - 0.05;
  svg += L([0, 1, 2, 3].map((i) => k.segment([cx0, cy0, 80 - i * 5], [cx1 - (i === 3 ? 14 : 0), cy0, 80 - i * 5], P)).join(""), { tone: "lo", free: true });
  svg += L(k.segment([cx0, cy0, 84], [cx0 + 14, cy0, 84], P), { tone: "mid", free: true });
  svg += D([at([STAND_CARD.x + 4, cy0, 58]), at([cx1, cy0, 58])], { size: 0.45 });
  // comparator bracket, posts and plate
  svg += S(k.slabOf(STAND_POST, BED + 6, 12, P, 3, 0.5), { tone: "mid" });
  shapes.push(A.slab(STAND_POST, BED + 6, 12, { name: "stand.post.left" }));
  svg += S(k.slabOf(STAND_POST_R, BED + 6, 12, P, 3, 0.5), { tone: "mid" });
  shapes.push(A.slab(STAND_POST_R, BED + 6, 12, { name: "stand.post.right" }));
  svg += S(k.slabOf(STAND_BRACKET, 30, 4, P, 4, 0.6), { tone: "mid" });
  shapes.push(A.slab(STAND_BRACKET, 30, 4, { name: "stand.bracket" }));
  svg += S(k.slabOf(COMPARATOR, COMPARE_TOP - 4, 4, P, 4, 0.6), { tone: "hi", crease: "lo" });
  shapes.push(A.slab(COMPARATOR, COMPARE_TOP - 4, 4, { name: "stand.comparator" }));
  svg += L(k.planOutline(k.insetPlan(COMPARATOR, 3), COMPARE_TOP, P), { tone: "faint" });
  svg += D([[COMPARATOR.x + 4, COMPARATOR.y + 4], [COMPARATOR.x + COMPARATOR.w - 4, COMPARATOR.y + 4], [COMPARATOR.x + 4, COMPARATOR.y + COMPARATOR.d - 4], [COMPARATOR.x + COMPARATOR.w - 4, COMPARATOR.y + COMPARATOR.d - 4]].map(([x, y]) => at([x, y, COMPARE_TOP])), { size: 0.4, tone: "lo" });
  // work lamp above the comparator
  svg += S(k.cylinder(18, -84, 1.5, 93, 3, P, 16), { tone: "mid" });
  shapes.push(A.cylinder(18, -84, 1.5, 93, 3, { name: "stand.lamp.rod" }));
  svg += S(k.cylinder(18, -84, 6, 88, 5, P, 28, 0.6), { tone: "mid", crease: "lo" });
  shapes.push(A.cylinder(18, -84, 6, 88, 5, { name: "stand.lamp.hood" }));
  svg += L(k.sideArc(18, -84, 6, 88.2, P, 16), { tone: "faint" });
  // status lens housing on the crossbar
  svg += S(k.cylinder(46, -86, 4, 102, 4, P, 24), { tone: "mid" });
  shapes.push(A.cylinder(46, -86, 4, 102, 4, { name: "stand.lamp.housing" }));
  put("stand", [30, -84, 50], svg, shapes);
}

function buildTray(centre, label, name) {
  const plan = trayPlan(centre);
  const shapes = [];
  let svg = "";
  const inner = k.insetPlan(plan, 4);
  svg += S(k.slabOf(inner, BED, 4, P, 4, 0.5), { tone: "lo" });
  shapes.push(A.slab(inner, BED, 4, { name: `${name}.floor` }));
  const t = 4;
  const walls = [
    ["left", { x: plan.x, y: plan.y, w: t, d: plan.d, r: 1 }],
    ["right", { x: plan.x + plan.w - t, y: plan.y, w: t, d: plan.d, r: 1 }],
    ["back", { x: plan.x + t, y: plan.y, w: plan.w - 2 * t, d: t, r: 1 }],
    ["front", { x: plan.x + t, y: plan.y + plan.d - t, w: plan.w - 2 * t, d: t, r: 1 }],
  ];
  for (const [key, wall] of walls) {
    const top = key === "front" ? 22 : 28;
    svg += S(k.slabOf(wall, BED, top - BED, P, 3, 0.5), { tone: "mid", inner: k.sideSeam(plan, BED + 6, P, 4) });
    shapes.push(A.slab(wall, BED, top - BED, { name: `${name}.${key}` }));
  }
  svg += D([[plan.x + 2, plan.y + 2], [plan.x + plan.w - 2, plan.y + 2], [plan.x + 2, plan.y + plan.d - 2], [plan.x + plan.w - 2, plan.y + plan.d - 2]].map(([x, y]) => at([x, y, 28])), { size: 0.4, tone: "lo" });
  const plate = { x: centre[0] - 27, y: plan.y + plan.d + 3, w: 54, d: 8, r: 1 };
  svg += S(k.slabOf(plate, BED, 0.8, P, 3), { tone: "lo", crease: "none" });
  svg += L(k.planOutline(k.insetPlan(plate, 1.4), BED + 0.8, P), { tone: "faint" });
  svg += k.faceTextSvg(k.topMatrix([centre[0], plate.y + 5.6], BED + 0.8, P, "x"), label, { size: 5.4, tone: "mid", anchor: "middle" });
  shapes.push(A.slab(plate, BED, 0.8, { name: `${name}.label` }));
  put(name, [centre[0], centre[1], 16], svg, shapes);
}

function buildReport() {
  const shapes = [];
  let svg = "";
  const inner = k.insetPlan(REPORT, 4);
  svg += S(k.slabOf(inner, BED, 4, P, 4, 0.5), { tone: "lo" });
  shapes.push(A.slab(inner, BED, 4, { name: "report.floor" }));
  const t = 4;
  const walls = [
    ["left", { x: REPORT.x, y: REPORT.y, w: t, d: REPORT.d, r: 1 }],
    ["right", { x: REPORT.x + REPORT.w - t, y: REPORT.y, w: t, d: REPORT.d, r: 1 }],
    ["back", { x: REPORT.x + t, y: REPORT.y, w: REPORT.w - 2 * t, d: t, r: 1 }],
    ["front", { x: REPORT.x + t, y: REPORT.y + REPORT.d - t, w: REPORT.w - 2 * t, d: t, r: 1 }],
  ];
  for (const [key, wall] of walls) {
    const top = key === "front" ? 22 : 28;
    svg += S(k.slabOf(wall, BED, top - BED, P, 3, 0.5), { tone: "mid" });
    shapes.push(A.slab(wall, BED, top - BED, { name: `report.${key}` }));
  }
  svg += D([[REPORT.x + 2, REPORT.y + 2], [REPORT.x + REPORT.w - 2, REPORT.y + 2], [REPORT.x + 2, REPORT.y + REPORT.d - 2], [REPORT.x + REPORT.w - 2, REPORT.y + REPORT.d - 2]].map(([x, y]) => at([x, y, 28])), { size: 0.4, tone: "lo" });
  put("report", [REPORT.x + REPORT.w / 2, REPORT.y + REPORT.d / 2, 16], svg, shapes);
}

function buildPrinter() {
  const shapes = [];
  let svg = "";
  svg += S(k.slabOf(PRINT, BED, 22, P, 4, 0.8), { tone: "mid" });
  shapes.push(A.slab(PRINT, BED, 22, { name: "print.body" }));
  svg += L(k.sideSeam(PRINT, BED + 8, P, 4), { tone: "faint" });
  const lid = k.insetPlan(PRINT, 3);
  svg += S(k.slabOf(lid, BED + 22, 2, P, 3, 0.4), { tone: "mid" });
  shapes.push(A.slab(lid, BED + 22, 2, { name: "print.lid" }));
  const slot = { x: PRINT.x + PRINT.w, y: PRINT.y + 6, w: 0.4, d: PRINT.d - 12, r: 0.4 };
  svg += S(k.slabOf(slot, 29, 2.4, P, 2), { tone: "lo", crease: "none" });
  shapes.push(A.slab(slot, 29, 2.4, { name: "print.slot" }));
  for (let i = 0; i < 3; i++) {
    svg += L(k.lineOnTop([PRINT.x + 3, PRINT.y + 10 + i * 5], [PRINT.x + PRINT.w - 3, PRINT.y + 10 + i * 5], BED + 24, P), { tone: "faint" });
  }
  svg += S(k.cylinder(PRINT.x + 6, PRINT.y + 5, 3, BED + 24, 2, P, 20), { tone: "hi" });
  shapes.push(A.cylinder(PRINT.x + 6, PRINT.y + 5, 3, BED + 24, 2, { name: "print.knob" }));
  svg += D([[PRINT.x + 3, PRINT.y + PRINT.d - 3], [PRINT.x + PRINT.w - 3, PRINT.y + PRINT.d - 3]].map(([x, y]) => at([x, y, BED + 22])), { size: 0.45 });
  put("print", [PRINT.x + PRINT.w / 2, PRINT.y + PRINT.d / 2, 24], svg, shapes);
}

function buildDial() {
  const shapes = [];
  let svg = "";
  svg += S(k.cylinder(DIAL[0], DIAL[1], DIAL_R, BED, 3, P, 56), { tone: "mid" });
  shapes.push(A.cylinder(DIAL[0], DIAL[1], DIAL_R, BED, 3, { name: "dial.base" }));
  svg += S(k.cylinder(DIAL[0], DIAL[1], 19, BED + 3, 9, P, 56, 0.8), { tone: "mid", crease: "lo" });
  shapes.push(A.cylinder(DIAL[0], DIAL[1], 19, BED + 3, 9, { name: "dial.body" }));
  svg += L(k.knurl(DIAL[0], DIAL[1], 19, BED + 3.4, BED + 11.4, 80, P, 0.3), { tone: "lo" });
  svg += L(k.ring(DIAL[0], DIAL[1], 19.2, BED + 3.4, P, 56), { tone: "faint" });
  svg += L(k.ring(DIAL[0], DIAL[1], 19.2, BED + 11.4, P, 56), { tone: "faint" });
  svg += S(k.cylinder(DIAL[0], DIAL[1], 18, BED + 12, 1, P, 56), { tone: "hi" });
  shapes.push(A.cylinder(DIAL[0], DIAL[1], 18, BED + 12, 1, { name: "dial.face" }));
  svg += L(k.ring(DIAL[0], DIAL[1], 16.4, BED + 13, P, 56), { tone: "lo" });
  const ticks = k.radialTicks(DIAL[0], DIAL[1], 16.2, 10, 5, BED + 13, [1.4, 2.8], P, Math.PI, Math.PI);
  svg += L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
  svg += S(k.cylinder(DIAL[0], DIAL[1], 2.5, BED + 13, 2.2, P, 20), { tone: "hi" });
  shapes.push(A.cylinder(DIAL[0], DIAL[1], 2.5, BED + 13, 2.2, { name: "dial.hub" }));
  svg += D([[DIAL[0] - 13, DIAL[1] + 13], [DIAL[0] + 13, DIAL[1] + 13]].map(([x, y]) => at([x, y, BED + 13])), { size: 0.45 });
  put("dial", [DIAL[0], DIAL[1], 18], svg, shapes);
}

buildBase();
buildTable();
buildColumn();
buildFlywheel();
buildStand();
buildTray(TRAY_C, "СООТВЕТСТВИЕ", "tray.comply");
buildTray(TRAY_N, "НЕСООТВЕТСТВИЕ", "tray.reject");
buildReport();
buildPrinter();
buildDial();

// ==== moving parts (groups rebuilt each frame, solids recorded at rest) ================

const restTile = (i) => {
  const a = rad(-i * 72);
  return { cx: T[0] + TILE_R * Math.cos(a), cy: T[1] + TILE_R * Math.sin(a), angle: a };
};

const tileGroups = M.EVIDENCE.map((item, i) => {
  const rest = restTile(i);
  R.solid(A.extruded(tileRing(rest.cx, rest.cy, rest.angle, TILE_W), TABLE_TOP, TILE_H, { name: `tile.${item.id}` }));
  return `<g data-part="tile${i}">${tileMarkup(rest.cx, rest.cy, rest.angle, TABLE_TOP, M.linesOf(item), false)}</g>`;
});

R.solid(A.extruded(beamRing(rad(ARM_PARK), 0, 106, 7, 3), ARM_Z, BEAM_H, { name: "lever.beam", owner: "lever" }));
R.solid(A.extruded(beamRing(rad(ARM_PARK), -36, 0, 5, 2), ARM_Z, BEAM_H - 2, { name: "lever.counterarm", owner: "lever" }));
R.solid(A.cylinder(PIVOT[0] + Math.cos(rad(ARM_PARK)) * -28, PIVOT[1] + Math.sin(rad(ARM_PARK)) * -28, 8, ARM_Z - 12, 12, { name: "lever.counterweight", owner: "lever" }));
R.solid(A.extruded(beamRing(rad(ARM_PARK), 93, 106, 9, 2), 117, 7, { name: "lever.carriage", owner: "lever" }));
const restProbe = [PIVOT[0] - R_ARM, PIVOT[1]];
R.solid(A.cylinder(restProbe[0], restProbe[1], 4, 115, 2, { name: "lever.collar" }));
R.solid(A.cylinder(restProbe[0], restProbe[1], ROD_R, PROBE_HIGH + HEAD_H, 115 - (PROBE_HIGH + HEAD_H), { name: "lever.rod" }));
R.solid(A.cylinder(restProbe[0], restProbe[1], HEAD_R, PROBE_HIGH, HEAD_H, { name: "lever.head" }));
R.solid(A.cylinder(restProbe[0], restProbe[1], 4.5, PROBE_HIGH - 0.4, 0.4, { name: "lever.tip" }));

R.solid(A.slab({ x: -43, y: 79, w: CARD_W, d: CARD_D, r: 1 }, CARD_REST_Z, 1.6, { name: "report.card" }));

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

const art =
  R.items.map((it) => it.svg).join("") +
  `<g data-part="tablemarks">${tableMarkup(0)}</g>` +
  tileGroups.join("") +
  `<g data-part="lever">${armMarkup(ARM_PARK, PROBE_HIGH)}</g>` +
  `<g data-part="wheelspokes">${flyMarkup(0)}</g>` +
  `<g data-part="needles">${needlesMarkup(0, 0)}</g>` +
  `<g data-part="lamp">${lampMarkup("var(--anatomy-lo)")}</g>` +
  `<g data-part="reportcard" opacity="0">${reportCardMarkup(-70, 88, 29.5)}</g>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Стенд аудита: на массивном основании поворотный стол с пятью плитками свидетельств, над ним рычаг на колонке с щупом, у дальней стойки эталонная карта и плита сравнения, справа два лотка для соответствий и несоответствий, на переднем крае циферблат находок и лоток отчёта, маховик на стойке связан с рычагом.",
  body: art,
});

// ==== live code =======================================================================

const live = `
const P = ${JSON.stringify(P)};
const EVIDENCE = ${JSON.stringify(M.EVIDENCE)};
const SAMPLE = ${M.SAMPLE};
const STEP = ${STEP};
const CHECK_AT = ${M.CHECK_AT};
const END = ${END};
const T = ${JSON.stringify(T)};
const TILE_R = ${TILE_R};
const TILE_W = ${TILE_W};
const TILE_H = ${TILE_H};
const TABLE_TOP = ${TABLE_TOP};
const TABLE_R = ${TABLE_R};
const PIVOT = ${JSON.stringify(PIVOT)};
const R_ARM = ${R_ARM};
const ARM_Z = ${ARM_Z};
const BEAM_H = ${BEAM_H};
const PROBE_HIGH = ${PROBE_HIGH};
const GRAB_Z = ${GRAB_Z};
const COMPARE_Z = ${COMPARE_Z};
const TRAY_FLOOR = ${TRAY_FLOOR};
const HEAD_H = ${HEAD_H};
const HEAD_R = ${HEAD_R};
const ROD_R = ${ROD_R};
const FLY = ${JSON.stringify(FLY)};
const FLY_Y = ${FLY_Y};
const FLY_R = ${FLY_R};
const DIAL = ${JSON.stringify(DIAL)};
const DIAL_TOP = ${DIAL_TOP};
const CARD_W = ${CARD_W};
const CARD_D = ${CARD_D};
const CARD_REST_Z = ${CARD_REST_Z};
const TRAY_C = ${JSON.stringify(TRAY_C)};
const TRAY_N = ${JSON.stringify(TRAY_N)};
const TRAY_DEG = ${JSON.stringify(TRAY_DEG)};
const rad = ${rad.toString()};
const tileRing = ${tileRing.toString().replace(/\bk\./g, "")};
const outlineOf = ${outlineOf.toString().replace(/\bk\./g, "")};
const tileMarkup = ${tileMarkup.toString().replace(/\bk\./g, "")};
const beamRing = ${beamRing.toString()};

const armMarkup = ${armMarkup.toString().replace(/\bk\./g, "")};
const flyMarkup = ${flyMarkup.toString().replace(/\bk\./g, "")};
const tableMarkup = ${tableMarkup.toString().replace(/\bk\./g, "")};
const needlesMarkup = ${needlesMarkup.toString().replace(/\bk\./g, "")};
const reportCardMarkup = ${reportCardMarkup.toString().replace(/\bk\./g, "")};
const lampMarkup = ${lampMarkup.toString().replace(/\bk\./g, "")};
const counts = ${M.counts.toString()};
const readout = ${M.readout.toString()};
const linesOf = ${M.linesOf.toString()};

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readoutEl = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const tileEls = EVIDENCE.map((_, i) => svg.querySelector('[data-part="tile' + i + '"]'));
const tableEl = svg.querySelector('[data-part="tablemarks"]');
const leverEl = svg.querySelector('[data-part="lever"]');
const wheelEl = svg.querySelector('[data-part="wheelspokes"]');
const needleEl = svg.querySelector('[data-part="needles"]');
const lampEl = svg.querySelector('[data-part="lamp"]');
const cardEl = svg.querySelector('[data-part="reportcard"]');

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (x) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
const mix = (a, b, x) => a + (b - a) * ease(x);

function trayOf(i) {
  return EVIDENCE[i].compliant ? TRAY_C : TRAY_N;
}
function stackBefore(i) {
  let n = 0;
  for (let j = 0; j < i; j++) if (EVIDENCE[j].compliant === EVIDENCE[i].compliant) n += 1;
  return n;
}
function tableTheta(t) {
  if (t >= SAMPLE * STEP) return 360;
  const cur = Math.min(SAMPLE - 1, Math.floor(t / STEP));
  const lt = t - cur * STEP;
  let theta = cur * 72;
  if (lt > 4.05) theta += 72 * ease((lt - 4.05) / 0.5);
  return theta;
}
function armAt(t) {
  if (t >= SAMPLE * STEP) return { deg: 180, probe: PROBE_HIGH };
  const cur = Math.min(SAMPLE - 1, Math.floor(t / STEP));
  const lt = t - cur * STEP;
  const trayDeg = EVIDENCE[cur].compliant ? TRAY_DEG[0] : TRAY_DEG[1];
  const dropZ = TRAY_FLOOR + stackBefore(cur) * TILE_H + TILE_H;
  let deg = 180;
  let probe = PROBE_HIGH;
  if (lt < 0.35) probe = mix(PROBE_HIGH, GRAB_Z, lt / 0.35);
  else if (lt < 0.7) probe = mix(GRAB_Z, PROBE_HIGH, (lt - 0.35) / 0.35);
  else if (lt < 1.5) deg = mix(180, 270, (lt - 0.7) / 0.8);
  else if (lt < 1.9) { deg = 270; probe = mix(PROBE_HIGH, COMPARE_Z, (lt - 1.5) / 0.4); }
  else if (lt < 2.3) { deg = 270; probe = COMPARE_Z; }
  else if (lt < 2.55) { deg = 270; probe = mix(COMPARE_Z, PROBE_HIGH, (lt - 2.3) / 0.25); }
  else if (lt < 3.2) { probe = PROBE_HIGH; deg = mix(270, trayDeg, (lt - 2.55) / 0.65); }
  else if (lt < 3.6) { deg = trayDeg; probe = mix(PROBE_HIGH, dropZ, (lt - 3.2) / 0.4); }
  else if (lt < 3.8) { deg = trayDeg; probe = dropZ; }
  else if (lt < 4.05) { deg = trayDeg; probe = mix(dropZ, PROBE_HIGH, (lt - 3.8) / 0.25); }
  else { probe = PROBE_HIGH; deg = mix(trayDeg, 180, (lt - 4.05) / 0.5); }
  return { deg, probe };
}
function tileAt(i, t) {
  const tray = trayOf(i);
  const stack = TRAY_FLOOR + stackBefore(i) * TILE_H;
  if (t >= SAMPLE * STEP) return { cx: tray[0], cy: tray[1], angle: 0, z: stack };
  const cur = Math.min(SAMPLE - 1, Math.floor(t / STEP));
  const lt = t - cur * STEP;
  if (i < cur) return { cx: tray[0], cy: tray[1], angle: 0, z: stack };
  if (i > cur) {
    const a = rad(-i * 72 + tableTheta(t));
    return { cx: T[0] + TILE_R * Math.cos(a), cy: T[1] + TILE_R * Math.sin(a), angle: a, z: TABLE_TOP };
  }
  if (lt < 0.35) {
    const a = rad(-i * 72 + tableTheta(t));
    return { cx: T[0] + TILE_R * Math.cos(a), cy: T[1] + TILE_R * Math.sin(a), angle: a, z: TABLE_TOP };
  }
  if (lt < 3.6) {
    const arm = armAt(t);
    const a = rad(arm.deg);
    return { cx: PIVOT[0] + Math.cos(a) * R_ARM, cy: PIVOT[1] + Math.sin(a) * R_ARM, angle: 0, z: arm.probe - TILE_H };
  }
  return { cx: tray[0], cy: tray[1], angle: 0, z: stack };
}
function checkedAt(t) {
  let done = 0;
  for (let i = 0; i < SAMPLE; i++) if (t >= i * STEP + CHECK_AT) done = i + 1;
  return done;
}
function reportAt(t) {
  const start = SAMPLE * STEP + 0.45;
  if (t < start) return { x: -70, y: 88, z: 29.5, opacity: 0 };
  const p = clamp((t - start) / 1.7, 0, 1);
  const slide = ease(p / 0.55);
  const fall = ease((p - 0.55) / 0.45);
  return { x: -70 + 40 * slide, y: 88, z: 29.5 - 13.5 * fall, opacity: clamp((t - start) / 0.2, 0, 1) };
}

let target = END;
let s = END;
let last = 0;
let frame = 0;
let visible = false;
let touring = !still.matches;
let tourPhase = "hold";
let phaseT = 0;
let holdFor = 5.0;
let idleTimer = 0;

function place() {
  const theta = tableTheta(s);
  tableEl.innerHTML = tableMarkup(theta);
  for (let i = 0; i < SAMPLE; i++) {
    const t = tileAt(i, s);
    const cur = Math.min(SAMPLE - 1, Math.floor(s / STEP));
    const lt = s - cur * STEP;
    const lit = s < SAMPLE * STEP && i === cur && lt > 1.86 && lt < 2.34;
    tileEls[i].innerHTML = tileMarkup(t.cx, t.cy, t.angle, t.z, linesOf(EVIDENCE[i]), lit);
  }
  const arm = armAt(s);
  leverEl.innerHTML = armMarkup(arm.deg, arm.probe);
  const wheelDeg = -(arm.deg - 180) * 2.2;
  wheelEl.innerHTML = flyMarkup(wheelDeg);
  const c = counts(checkedAt(s));
  needleEl.innerHTML = needlesMarkup(c.checked, c.nonCompliant);
  const bad = c.nonCompliant > 0;
  const colour = c.checked === 0 ? "var(--anatomy-lo)" : bad ? "var(--anatomy-red)" : "var(--anatomy-green)";
  lampEl.innerHTML = lampMarkup(colour);
  const card = reportAt(s);
  cardEl.innerHTML = reportCardMarkup(card.x, card.y, card.z);
  cardEl.setAttribute("opacity", String(card.opacity));
  const text = readout(c.checked);
  if (readoutEl.textContent !== text) readoutEl.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(s * 10) / 10));
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    if (tourPhase === "fwd") {
      target += dt;
      if (target >= END) { target = END; tourPhase = "hold"; phaseT = 0; }
    } else if (tourPhase === "hold") {
      phaseT += dt;
      if (phaseT > holdFor) { tourPhase = "back"; phaseT = 0; holdFor = 2.0; }
    } else if (tourPhase === "back") {
      target -= dt * 6;
      if (target <= 0) { target = 0; tourPhase = "hold0"; phaseT = 0; }
    } else {
      phaseT += dt;
      if (phaseT > 0.8) { tourPhase = "fwd"; }
    }
  }
  s = calm ? target : s + (target - s) * (1 - Math.exp(-dt / 0.16));
  if (Math.abs(target - s) < 0.004) s = target;
  place();
  const settled = !touring && Math.abs(target - s) < 0.006;
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
  target = clamp(next, 0, END);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (still.matches) return;
    touring = true;
    if (target >= END - 0.01) { tourPhase = "hold"; phaseT = 0; }
    else { tourPhase = "fwd"; }
    run();
  }, 5000);
  run();
}
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const f = clamp((event.clientX - box.left) / box.width, 0, 1);
  takeOver(f * END);
});
stage.addEventListener("pointerleave", () => {
  if (!touring) takeOver(target);
});
stage.addEventListener("keydown", (event) => {
  const cur = Math.round(target / STEP);
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = (cur + 1) * STEP;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = (cur - 1) * STEP;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = END;
  if (next === null) return;
  event.preventDefault();
  takeOver(next);
});
place();
`;

// ==== card ============================================================================

const css = `<style>
.needle-bad{stroke:var(--anatomy-red)!important;stroke-width:1.4px}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.iso-plate-corner[data-corner="readout"]{white-space:normal;text-align:right;max-width:58%;line-height:1.42;bottom:42px}
@media (max-width:600px){
.iso-plate{padding-bottom:104px}
.iso-plate-corner[data-corner="readout"]{font-size:9px;letter-spacing:0;max-width:84%;bottom:40px}
.iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px}
}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 1",
    title: "Стенд аудита",
    hint: "Проверьте свидетельства",
    readout: M.final,
    keys: [
      { mark: "lit", label: "свидетельство на сравнении" },
      { mark: "raised", label: "эталонная карта и лотки находок" },
    ],
    caption:
      "Рычаг снимает плитку свидетельства со стола, подносит её к эталонной карте и опускает в лоток соответствий или несоответствий. Циферблат считает проверенные свидетельства и найденные несоответствия, а после пятого свидетельства из щели выходит карточка отчёта.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Стенд аудита: наведите или нажмите стрелки, чтобы проверить свидетельства" aria-valuemin="0" aria-valuemax="${Math.round(END * 10) / 10}" aria-valuenow="0">${svg}</div>`,
  });

function build(theme) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: "Стенд аудита", theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}

build("dark");
build("light");

A.auditOrExit(R, P, {});
