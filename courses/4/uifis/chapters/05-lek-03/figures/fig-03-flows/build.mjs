// Figure fig-03-flows, built with the Anatomy skill.
//
// Contract with course-studio (kept):
//   1. Kit imported from the vendored copy: ../../../../../../_anatomy/kit/iso-kit.mjs
//   2. `node build.mjs` writes BOTH themes next to this file:
//        fig-03-flows.html        (dark)
//        fig-03-flows-light.html  (light)
//   3. `node build.mjs --audit` runs Anatomy's audit.
//   4. The card `fig` is "Fig 3".
//
// The object: a laboratory bench with two data lanes. Lane A runs from
// source 1 through valves 1 and 2 to receiver 1. Lane B runs from source 2
// through valve 3 to receiver 2. Thick pipes carry the data. A thin blue
// control line visits the three valves from a small control panel, and the
// three-bit signal decides which valves open, how far the data advances and
// which receivers are reached.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import * as A from "../../../../../../_anatomy/kit/audit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-03-flows";
const WIDTH = 640;
const HEIGHT = 452;

// ---- bench ----
const PLATE = { x: -275, y: -125, w: 550, d: 250, r: 14 };
const FOOT_Z = -18;
const FOOT_H = 6;
const PLATE_H = 12;
const TOP = 0;

// ---- tanks ----
const TANK_HALF = 23;
const SOURCES = [
  { x: -210, y: -64, top: 58 },
  { x: -210, y: 60, top: 58 },
];
const RECEIVERS = [
  { x: 210, y: -64, top: 53 },
  { x: 210, y: 60, top: 53 },
];

// ---- data lanes ----
const LANE_A = -64;
const LANE_B = 60;
const PIPE_Z = 32;
const PIPE_R = 5;
const FLANGE_R = 6.6;

// ---- valve stations ----
const VALVES = [
  { x: -95, y: LANE_A, name: "Кран 1" },
  { x: 60, y: LANE_A, name: "Кран 2" },
  { x: -8, y: LANE_B, name: "Кран 3" },
];
const VALVE_HALF = 15; // body half length in x
const VALVE_DEPTH = 11; // body half depth in y
const VALVE_Z0 = 18;
const VALVE_Z1 = 44;
const PORT_LEN = 3;
const PORT_R = 9;
const PORT_FACE = VALVE_HALF + PORT_LEN; // 18
const BONNET_Z = 47;
const STEM_Z = 56;
const HUB_Z = 64;
const HUB_H = 3;
const LEVER_Z = 67;
const LEVER_H = 3;
const LEVER_LEN = 16;
const LEVER_HALF = 2.6;
const LEVER_CLOSED = 130;
const LEVER_OPEN = 30;
const CAP_Z = 70;
const STUB_Z = 71.5;
const STUB_H = 3.5;
const WIRE_Z = 75.5;

// ---- control panel ----
const PANEL = { x: 68, y: 104, w: 64, d: 20, r: 3 };
const PANEL_TOP = 10;
const KNOB_Z = 12;
const KNOB_H = 4;
const KNOB_R = 8;
const KNOB_CX = PANEL.x + 18;
const KNOB_CY = PANEL.y + PANEL.d / 2;
const KNOB_A0 = -120;
const KNOB_A1 = 120;
const KNOB_TOP = KNOB_Z + KNOB_H + 0.2;
const TERMINAL = { x: PANEL.x + PANEL.w - 6, y: PANEL.y + PANEL.d - 6 };
const WIRE_START_Z = PANEL_TOP + 2 + 4.4;

// ---- pipes ----
const PIPE_A = [
  [-182, -113],
  [-77, 42],
  [78, 182],
];
const PIPE_B = [
  [-182, -26],
  [10, 182],
];

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, FOOT_Z, TOP),
    [SOURCES[0].x, SOURCES[0].y, SOURCES[0].top],
    [RECEIVERS[0].x, RECEIVERS[0].y, RECEIVERS[0].top],
    [SOURCES[1].x, SOURCES[1].y, SOURCES[1].top],
    [RECEIVERS[1].x, RECEIVERS[1].y, RECEIVERS[1].top],
    [TERMINAL.x, TERMINAL.y, WIRE_Z],
    [VALVES[0].x, VALVES[0].y, WIRE_Z],
    [VALVES[2].x, VALVES[2].y, WIRE_Z],
  ],
  WIDTH,
  HEIGHT,
  { pad: 38, azimuth: 47, elevation: 31 },
);

// ---- painter's layer, with recorded shapes for the audit ----
const R = A.recorder(P, {});
const put = (name, at3, svg, shapes, bias = 0) => {
  for (const shape of shapes) R.solid(shape);
  return R.put({ name, at: at3, bias, svg, shapes });
};

// ==== bench ====
function buildBench() {
  let feet = "";
  const footShapes = [];
  for (const [x, y] of byDepth(k.corners(PLATE, 26))) {
    feet += S(k.cylinder(x, y, 8, FOOT_Z, 1.8, P, 28), { tone: "lo" });
    feet += S(k.cylinder(x, y, 6, FOOT_Z + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" });
    footShapes.push(A.cylinder(x, y, 8, FOOT_Z, 1.8, { name: "stand.foot.flange" }));
    footShapes.push(A.cylinder(x, y, 6, FOOT_Z + 1.8, FOOT_H - 1.8, { name: "stand.foot" }));
  }
  put("stand.feet", [0, 0, FOOT_Z + FOOT_H], feet, footShapes);

  let svg = `<path class="iso-halo" d="${k.haloOf(PLATE, FOOT_Z, FOOT_H + PLATE_H, P)}"/>`;
  svg += S(k.slabOf(PLATE, FOOT_Z + FOOT_H, PLATE_H, P, 9, 1.6), { tone: "mid" });
  svg += L(k.planOutline(k.insetPlan(PLATE, 7), TOP, P), { tone: "lo" });
  const screws = k.corners(PLATE, 18);
  svg += L(screws.map(([x, y]) => k.ring(x, y, 2.4, TOP, P, 16)).join(""), { tone: "lo" });
  svg += D(screws.map(([x, y]) => at([x, y, TOP])), { size: 0.5 });
  put("stand.base", [0, 0, TOP], svg, [A.slab(PLATE, FOOT_Z + FOOT_H, PLATE_H, { name: "stand.base", ground: true })], 0.1);
}

// ==== tanks ====
function tankBodyPlan(cx, cy) {
  return { x: cx - TANK_HALF, y: cy - TANK_HALF, w: 2 * TANK_HALF, d: 2 * TANK_HALF, r: 6 };
}
function tankOuterPlan(cx, cy) {
  return { x: cx - 25, y: cy - 25, w: 50, d: 50, r: 5 };
}
function tankLabelPlan(cx, cy) {
  return { x: cx - 39, y: cy - 8, w: 78, d: 16, r: 2 };
}

function buildTank(station, index, kind) {
  const cx = station.x;
  const cy = station.y;
  const isSource = kind === "source";
  const shapes = [];
  let svg = "";

  const plinth = tankOuterPlan(cx, cy);
  const body = tankBodyPlan(cx, cy);
  const lid = tankOuterPlan(cx, cy);
  const bodyTop = isSource ? 52 : 48;

  svg += S(k.slabOf(plinth, TOP, 4, P, 6, 0.5), { tone: "lo" });
  shapes.push(A.slab(plinth, TOP, 4, { name: `${kind}${index}.plinth` }));

  svg += S(k.slabOf(body, 4, bodyTop - 4, P, 7, 1.0), {
    tone: "mid",
    inner: L(k.sideSeam(body, 22, P, 7), { tone: "faint" }),
  });
  shapes.push(A.slab(body, 4, bodyTop - 4, { name: `${kind}${index}.body` }));

  if (isSource) {
    svg += S(k.slabOf(lid, bodyTop, 3, P, 6, 0.5), { tone: "hi" });
    svg += L(k.planOutline(k.insetPlan(lid, 4), bodyTop + 3, P), { tone: "faint" });
    svg += S(k.cylinder(cx, cy, 7, bodyTop + 3, 4, P, 28, 0.6), { tone: "mid" });
    svg += L(k.ring(cx, cy, 7, bodyTop + 7, P, 28), { tone: "lo" });
    svg += D([at([cx, cy, bodyTop + 7])], { size: 0.5 });
    svg += S(k.cylinder(cx + 13, cy, 2.6, bodyTop + 3, 2.4, P, 16, 0.3), { tone: "mid" });
    shapes.push(A.slab(lid, bodyTop, 3, { name: `${kind}${index}.lid` }));
    shapes.push(A.cylinder(cx, cy, 7, bodyTop + 3, 4, { name: `${kind}${index}.cap` }));
    shapes.push(A.cylinder(cx + 13, cy, 2.6, bodyTop + 3, 2.4, { name: `${kind}${index}.vent` }));
    const lidScrews = k.corners(lid, 5);
    svg += D(lidScrews.map(([x, y]) => at([x, y, bodyTop + 3])), { size: 0.45 });
  } else {
    const rim = 4;
    const bars = [
      { x: cx - 25, y: cy - 25, w: 50, d: rim, r: 1.5 },
      { x: cx - 25, y: cy + 25 - rim, w: 50, d: rim, r: 1.5 },
      { x: cx - 25, y: cy - 21, w: rim, d: 42, r: 1.5 },
      { x: cx + 21, y: cy - 21, w: rim, d: 42, r: 1.5 },
    ];
    const inner = { x: cx - 21, y: cy - 21, w: 42, d: 42, r: 3 };
    svg += S(k.slabOf(inner, bodyTop, 0.5, P, 4), { tone: "lo", crease: "none" });
    svg += L(k.planOutline(k.insetPlan(inner, 1.5), bodyTop + 0.5, P), { tone: "faint" });
    shapes.push(A.slab(inner, bodyTop, 0.5, { name: `${kind}${index}.mouth` }));
    for (let b = 0; b < bars.length; b++) {
      svg += S(k.slabOf(bars[b], bodyTop, 5, P, 4, 0.4), { tone: "mid" });
      shapes.push(A.slab(bars[b], bodyTop, 5, { name: `${kind}${index}.rim${b}` }));
    }
    const rimScrews = k.corners(lid, 5);
    svg += D(rimScrews.map(([x, y]) => at([x, y, bodyTop + 5])), { size: 0.45 });
  }

  // sight glass on the front face, with a level line that ends on its sides
  const window = { x: cx - 11, y: cy + 22.6, w: 22, d: 1.4, r: 1 };
  const windowTop = isSource ? 42 : 40;
  const level = isSource ? 38 : 18;
  svg += S(k.slabOf(window, 16, windowTop - 16, P, 4, 0.4), { tone: "hi", crease: "none" });
  svg += L(k.pathOf([at([cx - 10.6, cy + 24.02, level]), at([cx + 10.6, cy + 24.02, level])]), { tone: "faint" });
  shapes.push(A.slab(window, 16, windowTop - 16, { name: `${kind}${index}.window` }));

  // port boss on the wall that faces the lane
  const dir = isSource ? 1 : -1;
  const wallX = cx + dir * TANK_HALF;
  const bossF = G.frameAlong([wallX, cy, PIPE_Z], [dir, 0, 0]);
  svg += S(G.disc(0, 5, 8.5, bossF, P), { tone: "hi" });
  svg += D(G.dotsOf(bossF, 5, 6.2, 6, P, { all: true }), { size: 0.42, tone: "lo" });
  shapes.push(A.disc(bossF, 0, 5, 8.5, { name: `${kind}${index}.port` }));

  svg += k.faceTextSvg(k.sideMatrix([cx, cy + 23.4], 24, P, "left"), isSource ? "Источник" : "Приёмник", {
    size: 7.5,
    tone: "hi",
    anchor: "middle",
  });

  put(`${kind}${index}`, [cx, cy, (4 + bodyTop) / 2], svg, shapes);
}

// ==== pipes ====
function pipeProfile(len, r = PIPE_R, fr = FLANGE_R, fl = 1.4) {
  return [
    [0, fr],
    [fl, fr],
    [fl, r],
    [fl + 1.0, r],
    [len - fl - 1.0, r],
    [len - fl, r],
    [len - fl, fr],
    [len, fr],
  ];
}

function buildPipe(name, x0, x1, y, index) {
  const len = x1 - x0;
  const F = G.frameAlong([x0, y, PIPE_Z], [1, 0, 0]);
  const profile = pipeProfile(len);
  const svg = S(G.solidOf(profile, F, P), { tone: "hi" });
  put(name, [x0 + len / 2, y, PIPE_Z], svg, [
    A.solid(F, profile, { name: `pipe${index}` }),
  ]);
}

// ==== valves ====
function capsule(cx, cy, angle, length, half, steps = 8) {
  const a = (angle * Math.PI) / 180;
  const u = [Math.cos(a), Math.sin(a)];
  const v = [-Math.sin(a), Math.cos(a)];
  const p0 = [cx, cy];
  const p1 = [cx + u[0] * length, cy + u[1] * length];
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = a + Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([p0[0] + Math.cos(t) * half, p0[1] + Math.sin(t) * half]);
  }
  for (let i = 0; i <= steps; i++) {
    const t = a - Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([p1[0] + Math.cos(t) * half, p1[1] + Math.sin(t) * half]);
  }
  return pts;
}

function leverRing(index, angle) {
  return capsule(VALVES[index].x, VALVES[index].y, angle, LEVER_LEN, LEVER_HALF);
}

function buildValve(index) {
  const { x: cx, y: cy } = VALVES[index];
  const shapes = [];
  let svg = "";

  const leg = { x: cx - 7, y: cy - 5, w: 14, d: 10, r: 2 };
  svg += S(k.slabOf(leg, TOP, VALVE_Z0, P, 5, 0.4), { tone: "mid" });
  shapes.push(A.slab(leg, TOP, VALVE_Z0, { name: `valve${index}.leg` }));

  const body = { x: cx - VALVE_HALF, y: cy - VALVE_DEPTH, w: 2 * VALVE_HALF, d: 2 * VALVE_DEPTH, r: 3 };
  svg += S(k.slabOf(body, VALVE_Z0, VALVE_Z1 - VALVE_Z0, P, 6, 1.0), {
    tone: "mid",
    inner: L(k.sideSeam(body, 28, P, 6), { tone: "faint" }),
  });
  shapes.push(A.slab(body, VALVE_Z0, VALVE_Z1 - VALVE_Z0, { name: `valve${index}.body` }));

  const top = { x: cx - 16, y: cy - 12, w: 32, d: 24, r: 2.5 };
  svg += S(k.slabOf(top, VALVE_Z1, 3, P, 5, 0.4), { tone: "hi" });
  shapes.push(A.slab(top, VALVE_Z1, 3, { name: `valve${index}.top` }));

  for (const dir of [-1, 1]) {
    const F = G.frameAlong([cx + dir * VALVE_HALF, cy, PIPE_Z], [dir, 0, 0]);
    svg += S(G.disc(0, PORT_LEN, PORT_R, F, P), { tone: "hi" });
    svg += D(G.dotsOf(F, PORT_LEN, 7, 6, P, { all: true }), { size: 0.4, tone: "lo" });
    shapes.push(A.disc(F, 0, PORT_LEN, PORT_R, { name: `valve${index}.port${dir > 0 ? "r" : "l"}` }));
  }

  svg += S(k.cylinder(cx, cy, 7, BONNET_Z, STEM_Z - BONNET_Z, P, 32, 0.6), { tone: "mid" });
  shapes.push(A.cylinder(cx, cy, 7, BONNET_Z, STEM_Z - BONNET_Z, { name: `valve${index}.bonnet` }));

  svg += S(k.cylinder(cx, cy, 2, STEM_Z, HUB_Z - STEM_Z, P, 20, 0), { tone: "hi" });
  shapes.push(A.cylinder(cx, cy, 2, STEM_Z, HUB_Z - STEM_Z, { name: `valve${index}.stem` }));

  svg += S(k.cylinder(cx, cy, 3.6, HUB_Z, HUB_H, P, 24, 0.3), { tone: "hi" });
  shapes.push(A.cylinder(cx, cy, 3.6, HUB_Z, HUB_H, { name: `valve${index}.hub` }));

  const rest = leverRing(index, LEVER_CLOSED);
  svg += `<g data-part="lever${index}">${S(k.extrude(rest, LEVER_Z, LEVER_H, P, { convex: true }), { tone: "hi" })}</g>`;
  shapes.push(A.extruded(rest, LEVER_Z, LEVER_H, { name: `valve${index}.lever` }));

  svg += S(k.cylinder(cx, cy, 3.2, CAP_Z, 1.5, P, 20, 0.2), { tone: "mid" });
  shapes.push(A.cylinder(cx, cy, 3.2, CAP_Z, 1.5, { name: `valve${index}.cap` }));

  svg += S(k.cylinder(cx, cy, 1.0, STUB_Z, STUB_H, P, 12, 0), { tone: "hi" });
  shapes.push(A.cylinder(cx, cy, 1.0, STUB_Z, STUB_H, { name: `valve${index}.stub` }));

  const lamp = at([cx, cy + VALVE_DEPTH + 0.2, 39]);
  svg += `<g class="valve-lamp" data-valve="${index}"><circle class="valve-lamp-ring" cx="${lamp[0].toFixed(1)}" cy="${lamp[1].toFixed(1)}" r="3.8"/><circle class="valve-lamp-dot" cx="${lamp[0].toFixed(1)}" cy="${lamp[1].toFixed(1)}" r="2.2"/></g>`;
  svg += k.faceTextSvg(k.sideMatrix([cx, cy + VALVE_DEPTH + 0.3], 32, P, "left"), "Кран", {
    size: 8,
    tone: "hi",
    anchor: "middle",
  });

  put(`valve${index}`, [cx, cy, PIPE_Z], svg, shapes);
}

// ==== control panel ====
function knobAngle(word) {
  return KNOB_A0 + (word / M.LAST) * (KNOB_A1 - KNOB_A0);
}

function buildPanel() {
  const shapes = [];
  let svg = "";

  const base = { x: PANEL.x, y: PANEL.y, w: PANEL.w, d: PANEL.d, r: PANEL.r };
  const top = { x: PANEL.x + 2, y: PANEL.y + 2, w: PANEL.w - 4, d: PANEL.d - 4, r: 2 };

  svg += S(k.slabOf(base, TOP, PANEL_TOP, P, 5, 0.6), { tone: "mid" });
  shapes.push(A.slab(base, TOP, PANEL_TOP, { name: "panel.base" }));

  svg += S(k.slabOf(top, PANEL_TOP, 2, P, 5, 0.3), { tone: "hi" });
  shapes.push(A.slab(top, PANEL_TOP, 2, { name: "panel.top" }));

  svg += S(k.cylinder(KNOB_CX, KNOB_CY, KNOB_R, KNOB_Z, KNOB_H, P, 32, 0.5), { tone: "hi" });
  shapes.push(A.cylinder(KNOB_CX, KNOB_CY, KNOB_R, KNOB_Z, KNOB_H, { name: "panel.knob" }));
  svg += L(k.ring(KNOB_CX, KNOB_CY, KNOB_R, KNOB_Z + KNOB_H, P, 40), { tone: "mid" });
  svg += D([at([KNOB_CX, KNOB_CY, KNOB_TOP])], { size: 0.8, tone: "mid" });

  const a = (knobAngle(0) * Math.PI) / 180;
  svg += `<g data-knob>${L(k.lineOnTop([KNOB_CX, KNOB_CY], [KNOB_CX + Math.cos(a) * 7.6, KNOB_CY + Math.sin(a) * 7.6], KNOB_TOP, P), { tone: "hi" })}</g>`;

  const leds = [
    [PANEL.x + 36, KNOB_CY],
    [PANEL.x + 45, KNOB_CY],
    [PANEL.x + 54, KNOB_CY],
  ];
  for (let i = 0; i < leds.length; i++) {
    const [x, y] = at([leds[i][0], leds[i][1], PANEL_TOP + 2.2]);
    svg += `<g class="panel-led" data-led="${i}"><circle class="led-ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"/><circle class="led-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.8"/></g>`;
  }

  svg += S(k.cylinder(TERMINAL.x, TERMINAL.y, 2.2, PANEL_TOP + 2, 4, P, 16, 0.3), { tone: "mid" });
  shapes.push(A.cylinder(TERMINAL.x, TERMINAL.y, 2.2, PANEL_TOP + 2, 4, { name: "panel.terminal" }));

  put("panel", [PANEL.x + PANEL.w / 2, PANEL.y + PANEL.d / 2, PANEL_TOP / 2], svg, shapes);
}

// ==== labels ====
function buildLabel(name, cx, cy, w, d, text, size) {
  const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 2 };
  let svg = S(k.slabOf(plan, TOP, 0.9, P, 4, 0.25), { tone: "lo", crease: "none" });
  svg += L(k.planOutline(k.insetPlan(plan, 1.5), 0.9, P), { tone: "faint" });
  svg += k.faceTextSvg(k.topMatrix([cx, cy + size * 0.34], 0.95, P), text, {
    size,
    tone: "hi",
    anchor: "middle",
  });
  const screws = k.corners(plan, 3);
  svg += D(screws.map(([x, y]) => at([x, y, 0.9])), { size: 0.4 });
  put(name, [cx, cy, 0.45], svg, [A.slab(plan, TOP, 0.9, { name })]);
}

// ==== control line ====
function buildControlWire() {
  const points = [
    [TERMINAL.x, TERMINAL.y, WIRE_START_Z],
    [TERMINAL.x, TERMINAL.y, WIRE_Z],
    [VALVES[2].x, VALVES[2].y, WIRE_Z],
    [26, -2, WIRE_Z - 3],
    [VALVES[1].x, VALVES[1].y, WIRE_Z],
    [-17.5, LANE_A, WIRE_Z - 3],
    [VALVES[0].x, VALVES[0].y, WIRE_Z],
  ].map(at);
  const wire = k.wireSvg(points[0], points[points.length - 1], {
    via: points.slice(1, -1),
    tone: "blue",
    size: 1.6,
  });
  const taps = D([points[2], points[4]], { size: 1.4, tone: "blue" });
  return `<g class="control-wire">${wire}${taps}</g>`;
}

// ==== build ====
buildBench();
buildTank(SOURCES[0], 0, "source");
buildTank(SOURCES[1], 1, "source");
buildTank(RECEIVERS[0], 0, "receiver");
buildTank(RECEIVERS[1], 1, "receiver");

for (let i = 0; i < PIPE_A.length; i++) buildPipe(`pipeA${i}`, PIPE_A[i][0], PIPE_A[i][1], LANE_A, `A${i}`);
for (let i = 0; i < PIPE_B.length; i++) buildPipe(`pipeB${i}`, PIPE_B[i][0], PIPE_B[i][1], LANE_B, `B${i}`);

for (let i = 0; i < VALVES.length; i++) buildValve(i);
buildPanel();

buildLabel("label.source0", SOURCES[0].x, -30, 78, 16, "Источник", 12.5);
buildLabel("label.source1", SOURCES[1].x, 92, 78, 14, "Источник", 12.5);
buildLabel("label.receiver0", RECEIVERS[0].x, -30, 78, 16, "Приёмник", 12.5);
buildLabel("label.receiver1", RECEIVERS[1].x, 92, 78, 14, "Приёмник", 12.5);
buildLabel("label.valve0", VALVES[0].x, -30, 46, 14, "Кран", 10.5);
buildLabel("label.valve1", VALVES[1].x, -30, 46, 14, "Кран", 10.5);
buildLabel("label.valve2", VALVES[2].x, 92, 46, 14, "Кран", 10.5);

// ==== assemble ====
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

const art = R.items.map((it) => it.svg).join("");
const wire = buildControlWire();
const flowLayer = `<g data-flow="a"></g><g data-flow="b"></g>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Лабораторный стенд: по толстым трубам данные идут от источников через краны к приёмникам, а тонкая синяя линия управления соединяет краны.",
  body: art + flowLayer + wire,
});

// ==== live code ====
const live = `
const P = ${JSON.stringify(P)};
const VX = ${JSON.stringify(VALVES.map((v) => v.x))};
const VY = ${JSON.stringify(VALVES.map((v) => v.y))};
const A_SEG = ${JSON.stringify(PIPE_A)};
const B_SEG = ${JSON.stringify(PIPE_B)};
const LANE_A = ${LANE_A};
const LANE_B = ${LANE_B};
const PIPE_Z = ${PIPE_Z}, PIPE_R = ${PIPE_R};
const LEVER_Z = ${LEVER_Z}, LEVER_H = ${LEVER_H}, LEVER_LEN = ${LEVER_LEN}, LEVER_HALF = ${LEVER_HALF};
const LEVER_CLOSED = ${LEVER_CLOSED}, LEVER_OPEN = ${LEVER_OPEN};
const KNOB_CX = ${KNOB_CX}, KNOB_CY = ${KNOB_CY}, KNOB_TOP = ${KNOB_TOP};
const KNOB_A0 = ${KNOB_A0}, KNOB_A1 = ${KNOB_A1};
const RATE = ${M.RATE};
const COUNT = ${M.COUNT};
const LAST = ${M.LAST};
const TOUR = ${JSON.stringify(M.TOUR)};

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const leverEls = VX.map((_, i) => svg.querySelector('[data-part="lever' + i + '"]'));
const lampEls = VX.map((_, i) => svg.querySelector('.valve-lamp[data-valve="' + i + '"]'));
const ledEls = VX.map((_, i) => svg.querySelector('.panel-led[data-led="' + i + '"]'));
const knobEl = svg.querySelector("[data-knob]");
const flowA = svg.querySelector('[data-flow="a"]');
const flowB = svg.querySelector('[data-flow="b"]');

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const bits = (word) => Array.from({ length: COUNT }, (_, i) => (word >> i) & 1);
const openCount = (word) => bits(word).reduce((sum, bit) => sum + bit, 0);

function laneA(word) {
  const b = bits(word);
  return Boolean(b[0] && b[1]);
}
function laneB(word) {
  return Boolean(bits(word)[2]);
}
function flow(word) {
  return (laneA(word) ? RATE : 0) + (laneB(word) ? RATE : 0);
}
function pathWord(word) {
  const b = bits(word);
  const a = Boolean(b[0] && b[1]);
  const bb = Boolean(b[2]);
  if (a && bb) return "обе линии";
  if (a) return "линия A";
  if (bb) return "линия B";
  if (b[0]) return "линия A не замкнута";
  if (b[1]) return "нет источника";
  return "потока нет";
}
function readoutWord(word) {
  return pathWord(word) + " · код " + bits(word).join("") + " · краны " + openCount(word) + " из " + COUNT + " · расход " + flow(word) + " л/с";
}

function capsule(cx, cy, angle, length, half, steps) {
  const a = (angle * Math.PI) / 180;
  const u = [Math.cos(a), Math.sin(a)];
  const v = [-Math.sin(a), Math.cos(a)];
  const p0 = [cx, cy];
  const p1 = [cx + u[0] * length, cy + u[1] * length];
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = a + Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([p0[0] + Math.cos(t) * half, p0[1] + Math.sin(t) * half]);
  }
  for (let i = 0; i <= steps; i++) {
    const t = a - Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([p1[0] + Math.cos(t) * half, p1[1] + Math.sin(t) * half]);
  }
  return pts;
}
function leverMarkup(index, angle) {
  const ring = capsule(VX[index], VY[index], angle, LEVER_LEN, LEVER_HALF, 8);
  return solidSvg(extrude(ring, LEVER_Z, LEVER_H, P, { convex: true }), { tone: "hi" });
}
function flowMarkup(segs, y, phase) {
  let out = "";
  for (const seg of segs) {
    const x0 = seg[0];
    const x1 = seg[1];
    const n = Math.max(2, Math.round((x1 - x0) / 34));
    for (let i = 0; i < n; i++) {
      const p = (phase + i / n) % 1;
      const x = x0 + (x1 - x0) * p;
      const point = iso([x, y, PIPE_Z + PIPE_R + 1.2], P);
      out += '<circle class="flow-dot" cx="' + point[0].toFixed(1) + '" cy="' + point[1].toFixed(1) + '" r="1.7"/>';
    }
  }
  return out;
}
function setOn(el, on) {
  if (!el) return;
  if (on) el.setAttribute("data-on", "");
  else el.removeAttribute("data-on");
}

let target = 0;
let share = [0, 0, 0];
let knobWord = 0;
let touring = !still.matches;
let clock = 0;
let tourClock = 1.4;
let tourStep = 0;
let frame = 0;
let last = 0;
let visible = false;
let idleTimer = 0;

function place(dt) {
  const want = bits(target);
  if (still.matches) {
    share = want.slice();
    knobWord = target;
  } else {
    share = share.map((value, i) => {
      const next = value + (want[i] - value) * (1 - Math.exp(-dt / 0.18));
      return Math.abs(want[i] - next) < 0.003 ? want[i] : next;
    });
    knobWord += (target - knobWord) * (1 - Math.exp(-dt / 0.14));
    if (Math.abs(target - knobWord) < 0.004) knobWord = target;
  }

  for (let i = 0; i < COUNT; i++) {
    const angle = LEVER_CLOSED + (LEVER_OPEN - LEVER_CLOSED) * share[i];
    leverEls[i].innerHTML = leverMarkup(i, angle);
    setOn(lampEls[i], share[i] > 0.5);
    setOn(ledEls[i], want[i] === 1);
  }

  const ka = ((KNOB_A0 + (knobWord / LAST) * (KNOB_A1 - KNOB_A0)) * Math.PI) / 180;
  knobEl.innerHTML = lineSvg(lineOnTop([KNOB_CX, KNOB_CY], [KNOB_CX + Math.cos(ka) * 7.6, KNOB_CY + Math.sin(ka) * 7.6], KNOB_TOP, P), { tone: "hi" });

  const on1 = share[0] > 0.55;
  const on2 = share[1] > 0.55;
  const on3 = share[2] > 0.55;
  const segA = [];
  if (on1) segA.push(A_SEG[0], A_SEG[1]);
  if (on1 && on2) segA.push(A_SEG[2]);
  const segB = on3 ? B_SEG : [];
  const phase = still.matches ? 0.18 : (clock * 0.32) % 1;
  flowA.innerHTML = segA.length ? flowMarkup(segA, LANE_A, phase) : "";
  flowB.innerHTML = segB.length ? flowMarkup(segB, LANE_B, phase) : "";

  const live = [on1 ? 1 : 0, on2 ? 1 : 0, on3 ? 1 : 0];
  const liveWord = live[0] | (live[1] << 1) | (live[2] << 2);
  const text = readoutWord(liveWord);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(target));
  stage.setAttribute("aria-valuetext", text);
  return segA.length > 0 || segB.length > 0;
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) {
    tourClock -= dt;
    if (tourClock <= 0) {
      tourStep = (tourStep + 1) % TOUR.length;
      target = TOUR[tourStep];
      tourClock = 1.7;
    }
  }
  clock += dt;
  const flowing = place(dt);
  const want = bits(target);
  const moving = share.some((value, i) => Math.abs(want[i] - value) > 0.004);
  const knobMoving = Math.abs(target - knobWord) > 0.005;
  const keep = visible && !still.matches && (touring || flowing || moving || knobMoving);
  frame = keep ? requestAnimationFrame(tick) : 0;
}

function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}

function takeOver(next) {
  touring = false;
  target = clamp(Math.round(next), 0, LAST);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (still.matches) return;
    touring = true;
    tourClock = 1.2;
    run();
  }, 4500);
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
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = target + 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = target - 1;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = LAST;
  if (next === null) return;
  event.preventDefault();
  takeOver(next);
});

place(0);
`;

// ==== card ====
const css = `<style>
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.valve-lamp .valve-lamp-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.7}
.valve-lamp .valve-lamp-dot{fill:var(--anatomy-lo)}
.valve-lamp[data-on] .valve-lamp-ring{stroke:var(--anatomy-green);stroke-width:1}
.valve-lamp[data-on] .valve-lamp-dot{fill:var(--anatomy-green)}
.panel-led .led-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.7}
.panel-led .led-dot{fill:var(--anatomy-lo)}
.panel-led[data-on] .led-ring{stroke:var(--anatomy-green);stroke-width:1}
.panel-led[data-on] .led-dot{fill:var(--anatomy-green)}
.flow-dot{fill:var(--anatomy-green);stroke:none;opacity:.9}
.control-wire .iso-line{stroke-width:1.15}
.iso-wire[data-tone="blue"] .iso-wire-end{stroke:var(--anatomy-blue)}
.control-wire .iso-wire-end{fill:var(--anatomy-paper)}
.iso-dots[data-tone="blue"] circle{fill:var(--anatomy-blue);opacity:.9}
.iso-plate-corner[data-corner="readout"]{white-space:normal;text-align:right;max-width:62%;line-height:1.42;bottom:42px}
@media (max-width:600px){
.iso-plate{padding-bottom:96px}
.iso-plate-corner[data-corner="readout"]{font-size:9px;letter-spacing:0;max-width:84%;bottom:38px}
.iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px}
}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 3",
    title: "Данные и управление",
    hint: "Наведите или ← →: сигнал переключает краны",
    readout: M.initial.text,
    keys: [
      { mark: "raised", label: "данные" },
      { mark: "blue", label: "управление" },
    ],
    caption:
      "Толстые трубы несут данные от источников через краны к приёмникам. Тонкая синяя линия передаёт сигнал управления кранам: от него зависят открытые краны, а значит, и путь данных.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Лабораторный стенд с трубами данных и линией управления: сигнал открывает краны, и данные идут от источников к приёмникам." aria-valuemin="0" aria-valuemax="${M.LAST}" aria-valuenow="0">${svg}</div>`,
  });

function build(theme) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: ID, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}

build("dark");
build("light");

A.auditOrExit(R, P, {});
