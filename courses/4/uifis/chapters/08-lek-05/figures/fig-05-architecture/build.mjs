// Figure fig-05-architecture: a reconfigurable three-cabin test stand.
// Anatomy guide: .opencode/skills/course-studio/anatomy/ANATOMY.md
// Truth: ./model.mjs. Run "node build.mjs" for both themes, "node build.mjs --audit" for the geometry audit.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import * as A from "../../../../../../_anatomy/kit/audit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { CABINS, MODES, route } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-05-architecture";
const WIDTH = 620;
const HEIGHT = 430;

const BASE = { x: -136, y: -50, w: 272, d: 100, r: 7 };
const BASE_TOP = 10;
const CAB = { w: 56, d: 64, y0: -40, y1: 24, z0: 16, z1: 72 };
const CAB_X = { client: -120, app: -28, db: 64 };
const CAB_CX = { client: -92, app: 0, db: 92 };
const WIN = { dx: 9, w: 38, z0: 54, z1: 70 };
const LINE_Y = 35;
const LINE_Z = 22;
const LINE_R = 2.4;
const RAIL_Y = [28, 42];
const RAIL_Z0 = 26;
const RAIL_Z1 = 30;
const RAIL_X = [-116, 116];
const REST_X = CAB_CX.client;
const CLUTCH_X = [-46, 46];
const CLUTCH_OPEN = -6.5;
const HUB = [-128.2, LINE_Y, LINE_Z];
const CRANK_R = 9;

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -15, BASE_TOP),
    ...Object.values(CAB_X).flatMap((x0) => k.boxCorners({ x: x0 - 3, y: -44, w: 62, d: 72 }, 10, 80)),
    [HUB[0], HUB[1], 31],
    [HUB[0], HUB[1], 13],
    [-134, 44, 32],
    [-134, 26, 13],
    ...CABINS.map((cabin) => [CAB_CX[cabin.id], -8, 80]),
    [RAIL_X[1], RAIL_Y[1], RAIL_Z1],
    [0, 49.6, BASE_TOP],
  ],
  WIDTH,
  HEIGHT,
  { pad: 34, azimuth: 48, elevation: 30 },
);

const S = (paths, style = {}) => k.solidSvg(paths, style);
const L = (d, style = {}) => k.lineSvg(d, style);
const D = (points, style = {}) => k.dotsSvg(points, style);
const at = (point) => k.iso(point, P);
const depthSort = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const facePath = (points, closed = false) => k.pathOf(points.map((point) => k.iso(point, P)), closed);

const R = A.recorder(P);
const put = (name, at, svg, shapes, extra = {}) => R.put({ name, at, svg, shapes, piece: extra.piece ?? name, ...extra });
const shape = (value) => R.solid(value);

// ---------------------------------------------------------------------------
// base, feet, ruler, nameplates

function base() {
  const MAIN = { x: -136, y: -50, w: 272, d: 74, r: 0 };
  const APRON = { x: -136, y: 24, w: 272, d: 26, r: 0 };
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BASE, -15, 25, P)}"/>`);
  const feet = [];
  const spots = [...k.corners(BASE, 18), [0, -44], [0, 44]];
  for (const [x, y] of depthSort(spots)) {
    out.push(S(k.cylinder(x, y, 6.4, -10, 4, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.8, -15, 5, P, 28), { tone: "mid" }));
    feet.push(shape(A.cylinder(x, y, 6.4, -10, 4, { name: "stand.foot" })));
    feet.push(shape(A.cylinder(x, y, 4.8, -15, 5, { name: "stand.foot.pad" })));
  }
  out.push(S(k.slabOf(MAIN, -6, 16, P, 4, 1.2), {
    tone: "mid",
    inner: L(k.sideSeam(MAIN, 4, P, 4), { tone: "faint" }),
  }));
  out.push(L(k.planOutline(k.insetPlan(MAIN, 5), BASE_TOP, P, 4), { tone: "lo" }));
  const screws = k.corners(MAIN, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, BASE_TOP, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, BASE_TOP])), { size: 0.5 }));
  const shapes = [shape(A.slab(MAIN, -6, 16, { name: "stand.base.plate" }, 4)), ...feet];
  put("stand.base", [0, -12, 0], out.join(""), shapes);

  const apron = [];
  const apronShapes = [];
  apron.push(S(k.slabOf(APRON, -6, 16, P, 4, 1.2), {
    tone: "mid",
    inner: L(k.sideSeam(APRON, 4, P, 4), { tone: "faint" }),
  }));
  apron.push(L(k.planOutline(k.insetPlan(APRON, 3), BASE_TOP, P, 4), { tone: "faint" }));
  apronShapes.push(shape(A.slab(APRON, -6, 16, { name: "stand.apron" }, 4)));
  const frontScrews = [[-128, 47], [128, 47]];
  apron.push(L(frontScrews.map(([x, y]) => k.ring(x, y, 2.2, BASE_TOP, P, 16)).join(""), { tone: "lo" }));
  apron.push(D(frontScrews.map(([x, y]) => at([x, y, BASE_TOP])), { size: 0.5 }));
  apron.push(S(k.slabOf({ x: 124.5, y: -34, w: 6.5, d: 68, r: 1 }, BASE_TOP, 0.7, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(-30, 30, 4, 5, 124.8, BASE_TOP + 0.7, [1.4, 2.8], P, "y");
  apron.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  apron.push(D([at([125.2, -32, BASE_TOP + 0.7]), at([125.2, 32, BASE_TOP + 0.7])], { size: 0.45 }));
  apronShapes.push(shape(A.slab({ x: 124.5, y: -34, w: 6.5, d: 68, r: 1 }, BASE_TOP, 0.7, { name: "stand.ruler" })));

  const names = { client: "КЛИЕНТ", app: "ПРИЛОЖЕНИЯ", db: "БД" };
  for (const room of CABINS) {
    const plan = { x: CAB_CX[room.id] - 22, y: 45, w: 44, d: 4.8, r: 1 };
    apron.push(S(k.slabOf(plan, BASE_TOP, 0.9, P, 4, 0.4), { tone: "hi", className: "fig-label" }));
    apron.push(L(k.planOutline(k.insetPlan(plan, 1.2), BASE_TOP + 0.9, P, 4), { tone: "faint" }));
    apron.push(`<g class="fig-label-text">${k.faceTextSvg(k.topMatrix([CAB_CX[room.id], 48.2], BASE_TOP + 0.9, P, "x"), names[room.id], { size: room.id === "app" ? 3.5 : 4.1, tone: "mid", anchor: "middle" })}</g>`);
    apron.push(D([at([plan.x + 3, plan.y + 2.4, BASE_TOP + 0.9]), at([plan.x + plan.w - 3, plan.y + 2.4, BASE_TOP + 0.9])], { size: 0.4 }));
    apronShapes.push(shape(A.slab(plan, BASE_TOP, 0.9, { name: `stand.label.${room.id}` }, 4)));
  }
  put("stand.apron", [0, 37, BASE_TOP], apron.join(""), apronShapes);
}

// ---------------------------------------------------------------------------
// cabin helpers

function teethPath(F, s, r, teeth, phase) {
  const step = (Math.PI * 2) / teeth;
  const points = [];
  for (let i = 0; i < teeth; i++) {
    const a = phase + i * step;
    points.push(G.pointOf(F, s, r + 0.1, a));
    points.push(G.pointOf(F, s, r + 0.1, a + step * 0.25));
    points.push(G.pointOf(F, s, r + 0.95, a + step * 0.3));
    points.push(G.pointOf(F, s, r + 0.95, a + step * 0.7));
    points.push(G.pointOf(F, s, r + 0.1, a + step * 0.75));
    points.push(G.pointOf(F, s, r + 0.1, a + step));
  }
  return k.pathOf(points.map((point) => k.iso(point, P)), true);
}

function spokesPath(F, s, r0, r1, count, phase) {
  const lines = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2;
    lines.push(k.pathOf([k.iso(G.pointOf(F, s, r0, a), P), k.iso(G.pointOf(F, s, r1, a), P)]));
  }
  return lines.join("");
}

function shaftIndex(F, xFace, phase, rHub, rRim) {
  const a = phase;
  return k.pathOf([
    k.iso([xFace, LINE_Y + rHub * Math.cos(a), LINE_Z + rHub * Math.sin(a)], P),
    k.iso([xFace, LINE_Y + rRim * Math.cos(a), LINE_Z + rRim * Math.sin(a)], P),
  ]);
}

function faceGroup(x, y, zTop, body) {
  const transform = k.sideMatrix([x, y], zTop, P, "left");
  return `<g transform="${transform}">${body}</g>`;
}

function cabin(id, x0) {
  const cx = CAB_CX[id];
  const accent = `var(--fig-${id})`;
  const out = [];
  const shapes = [];
  const owner = id;
  const plinth = { x: x0 - 3, y: -44, w: 62, d: 70, r: 3 };
  const rear = { x: x0, y: -40, w: 56, d: 60, r: 1.2 };
  const lower = { x: x0, y: 20, w: 56, d: 4, r: 0.8 };
  const leftStrip = { x: x0, y: 20, w: WIN.dx, d: 4, r: 0.8 };
  const rightStrip = { x: x0 + WIN.dx + WIN.w, y: 20, w: CAB.w - WIN.dx - WIN.w, d: 4, r: 0.8 };
  const topStrip = { x: x0 + WIN.dx, y: 20, w: WIN.w, d: 4, r: 0.8 };
  const bottomStrip = { x: x0 + WIN.dx, y: 20, w: WIN.w, d: 4, r: 0.8 };
  const winTop = { x: x0 + WIN.dx, y: 20, w: WIN.w, d: 4, r: 0.8 };

  out.push(S(k.slabOf(plinth, BASE_TOP, 6, P, 6, 0.8), { tone: "lo" }));
  shapes.push(shape(A.slab(plinth, BASE_TOP, 6, { name: `${id}.plinth`, owner }, 6)));
  out.push(S(k.slabOf(rear, 16, 56, P, 6, 0.8), {
    tone: "mid",
    inner: L(k.sideSeam(rear, 24, P, 6), { tone: "faint" }),
  }));
  shapes.push(shape(A.slab(rear, 16, 56, { name: `${id}.body`, owner }, 6)));

  if (id === "client") {
    out.push(faceGroup(x0 + WIN.dx + 2, 20.06, WIN.z1 - 2, `
      <rect x="0" y="0" width="${WIN.w - 4}" height="${WIN.z1 - WIN.z0 - 4}" rx="1.2" fill="var(--fig-screen)" stroke="var(--anatomy-lo)" stroke-width="0.6"/>
      <rect x="1.4" y="1.4" width="${WIN.w - 6.8}" height="2.1" rx="0.6" fill="var(--fig-accent)" opacity="0.55"/>
      <rect x="1.4" y="5.2" width="7.2" height="${WIN.z1 - WIN.z0 - 8.4}" rx="0.5" fill="var(--anatomy-shade-2)" opacity="0.9"/>
      <rect x="10.2" y="5.4" width="16.5" height="1.2" rx="0.5" class="fig-screen-bar"/>
      <rect x="10.2" y="8.1" width="${WIN.w - 15}" height="1.2" rx="0.5" class="fig-screen-bar" opacity="0.55"/>
      <rect x="10.2" y="10.8" width="11.5" height="1.2" rx="0.5" class="fig-screen-bar" opacity="0.35"/>
      <rect x="10.2" y="${WIN.z1 - WIN.z0 - 5.2}" width="1.9" height="1.5" rx="0.25" class="fig-cursor"/>
    `));
  }

  if (id === "app" || id === "db") {
    out.push(faceGroup(x0 + WIN.dx, 20.04, WIN.z1, `<rect x="0" y="0" width="${WIN.w}" height="${WIN.z1 - WIN.z0}" fill="var(--fig-recess)" stroke="var(--anatomy-lo)" stroke-width="0.55"/>`));
  }

  if (id === "app") {
    const gears = [
      { key: "a", cx: x0 + 21.5, r: 6.5, teeth: 20, ratio: 1, s: 2.23 },
      { key: "b", cx: x0 + 32.5, r: 4.5, teeth: 14, ratio: -6.5 / 4.5, s: 2.23 },
    ];
    for (const gear of gears) {
      const F = G.frameOf([gear.cx, 20, 62], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
      const pin = G.disc(0, 2.55, 1.05, F, P, { steps: 24 });
      const body = G.disc(0.25, 2.15, gear.r, F, P, { steps: 56 });
      out.push(S(body, { tone: "hi", crease: "lo" }));
      out.push(S(pin, { tone: "mid" }));
      out.push(L(G.circleOf(F, 2.2, gear.r, P, 56), { tone: "lo" }));
      out.push(L(G.circleOf(F, 2.26, 1.35, P, 20), { tone: "mid" }));
      const mark = L(teethPath(F, gear.s, gear.r, gear.teeth, 0), { tone: "mid" }) + L(spokesPath(F, gear.s + 0.04, 1.4, gear.r, gear.r > 5 ? 8 : 6, 0), { tone: "lo" });
      out.push(`<g data-gear="${gear.key}">${mark}</g>`);
      const own = `${id}.gear-${gear.key}`;
      shapes.push(shape(A.disc(F, 0, 2.55, 1.05, { name: `${own}.pin`, owner: own })));
      shapes.push(shape(A.disc(F, 0.25, 2.15, gear.r, { name: `${own}.body`, owner: own })));
    }
  }

  if (id === "db") {
    const F = G.frameOf([cx, 20, 62], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    const platters = [
      { s0: 0.35, s1: 0.85 },
      { s0: 1.25, s1: 1.75 },
      { s0: 2.15, s1: 2.65 },
    ];
    const own = `${id}.spindle`;
    for (const platter of platters) {
      out.push(S(G.disc(platter.s0, platter.s1, 7.2, F, P, { steps: 64 }), { tone: "hi", crease: "lo" }));
      out.push(L(G.circleOf(F, platter.s1 + 0.02, 7.2, P, 64), { tone: "lo" }));
      shapes.push(shape(A.disc(F, platter.s0, platter.s1, 7.2, { name: `${own}.platter`, owner: own })));
    }
    out.push(S(G.disc(0, 3.1, 1.1, F, P, { steps: 24 }), { tone: "mid" }));
    out.push(L(G.circleOf(F, 3.02, 1.2, P, 20), { tone: "mid" }));
    out.push(L(G.circleOf(F, 3.04, 7.05, P, 64), { tone: "lo" }));
    for (const ringR of [2.8, 4.6, 6.2]) out.push(L(G.circleOf(F, 3.03, ringR, P, 56), { tone: "faint" }));
    out.push(`<g data-disk="main">${L(spokesPath(F, 3.05, 1.25, 7.05, 1, 0), { tone: "mid" })}</g>`);
    shapes.push(shape(A.disc(F, 0, 3.1, 1.1, { name: `${own}.shaft`, owner: own })));
  }

  if (id !== "client") {
    out.push(faceGroup(x0 + WIN.dx, 23.65, WIN.z1, `<rect class="fig-blind" x="0" y="0" width="${WIN.w}" height="${WIN.z1 - WIN.z0}" fill="var(--fig-off)"/>`));
  }

  out.push(S(k.slabOf(lower, 16, 28, P, 4, 0.5), { tone: "mid" }));
  shapes.push(shape(A.slab(lower, 16, 28, { name: `${id}.front.lower`, owner }, 4)));

  out.push(S(k.slabOf(leftStrip, 44, 28, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(rightStrip, 44, 28, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(topStrip, WIN.z1, 2, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf(bottomStrip, 44, WIN.z0 - 44, P, 3, 0.3), { tone: "mid" }));
  shapes.push(shape(A.slab(leftStrip, 44, 28, { name: `${id}.front.left`, owner }, 3)));
  shapes.push(shape(A.slab(rightStrip, 44, 28, { name: `${id}.front.right`, owner }, 3)));
  shapes.push(shape(A.slab(topStrip, WIN.z1, 2, { name: `${id}.front.top`, owner }, 3)));
  shapes.push(shape(A.slab(bottomStrip, 44, WIN.z0 - 44, { name: `${id}.front.bottom`, owner }, 3)));

  const trim = facePath([
    [x0 + WIN.dx, 24.14, WIN.z0],
    [x0 + WIN.dx + WIN.w, 24.14, WIN.z0],
    [x0 + WIN.dx + WIN.w, 24.14, WIN.z1],
    [x0 + WIN.dx, 24.14, WIN.z1],
  ], true);
  out.push(L(trim, { tone: "lo", className: "fig-trim" }));
  out.push(L(facePath([[x0, 24.18, 44], [x0 + CAB.w, 24.18, 44]]), { tone: "faint" }));

  if (id === "client") {
    const keyboard = { x: x0 + 8, y: 24, w: 40, d: 8, r: 1.4 };
    out.push(S(k.slabOf(keyboard, 49, 3.5, P, 4, 0.6), { tone: "mid" }));
    out.push(D(k.dotGrid(x0 + 11, 26, 12, 2, 2.7, 52.5, P), { size: 0.45, tone: "lo" }));
    out.push(S(k.slabOf({ x: x0 + 14, y: 30.5, w: 22, d: 1.8, r: 0.6 }, 52.5, 0.5, P, 3), { tone: "lo", crease: "none" }));
    shapes.push(shape(A.slab(keyboard, 49, 3.5, { name: `${id}.keyboard`, owner }, 4)));
    shapes.push(shape(A.slab({ x: x0 + 14, y: 30.5, w: 22, d: 1.8, r: 0.6 }, 52.5, 0.5, { name: `${id}.spacebar`, owner }, 3)));
  }

  const capPlan = { x: x0 - 2, y: -42, w: 60, d: 68, r: 2.5 };
  out.push(S(k.slabOf(capPlan, 72, 4, P, 6, 1.2), {
    tone: "mid",
    inner: L(k.sideSeam(capPlan, 73.4, P, 6), { tone: "faint" }),
  }));
  out.push(L(k.planOutline(k.insetPlan(capPlan, 3), 76, P, 6), { tone: "faint" }));
  for (let i = 0; i < 3; i++) {
    const vent = { x: x0 + 12, y: -32 + i * 3.2, w: 32, d: 1.3, r: 0.6 };
    out.push(L(k.planOutline(vent, 76, P, 3), { tone: "lo" }));
  }
  const capScrews = k.corners(capPlan, 9);
  out.push(L(capScrews.map(([x, y]) => k.ring(x, y, 1.9, 76, P, 14)).join(""), { tone: "lo" }));
  out.push(D(capScrews.map(([x, y]) => at([x, y, 76])), { size: 0.45 }));
  shapes.push(shape(A.slab(capPlan, 72, 4, { name: `${id}.cap`, owner }, 6)));

  const lampBase = G.disc(0, 1.3, 3.1, G.frameOf([cx, -8, 75.8], [0, 0, 1], [1, 0, 0], [0, 1, 0]), P, { steps: 28 });
  const lampLens = G.disc(0, 2.4, 2.15, G.frameOf([cx, -8, 77.0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), P, { steps: 28 });
  out.push(S(lampBase, { tone: "mid" }));
  out.push(S(lampLens, { tone: "mid", className: "fig-lamp", crease: "lo" }));
  const glow = at([cx, -8, 79.5]);
  out.push(`<circle class="fig-lamp-glow" cx="${glow[0]}" cy="${glow[1]}" r="5.5"/>`);
  shapes.push(shape(A.disc(G.frameOf([cx, -8, 75.8], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, 1.3, 3.1, { name: `${id}.lamp.base`, owner })));
  shapes.push(shape(A.disc(G.frameOf([cx, -8, 77.0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, 2.4, 2.15, { name: `${id}.lamp.lens`, owner })));

  const door = { x: x0 + 8, y: 24, w: 40, d: 1.6, r: 0.6 };
  out.push(S(k.slabOf(door, 18, 22, P, 4, 0.45), { tone: "mid" }));
  out.push(L(facePath([
    [door.x + 0.4, 25.64, 18.6],
    [door.x + door.w - 0.4, 25.64, 18.6],
    [door.x + door.w - 0.4, 25.64, 39.4],
    [door.x + 0.4, 25.64, 39.4],
  ], true), { tone: "lo" }));
  out.push(D([at([door.x + 2.3, 25.66, 24]), at([door.x + 2.3, 25.66, 34]), at([door.x + door.w - 3.2, 25.66, 29])], { size: 0.45 }));
  const handleF = G.frameAlong([door.x + door.w - 3, 25.6, 23], [0, 1, 0]);
  out.push(S(G.disc(0, 2.8, 1.15, handleF, P, { steps: 20 }), { tone: "mid" }));
  shapes.push(shape(A.slab(door, 18, 22, { name: `${id}.door`, owner }, 4)));
  shapes.push(shape(A.disc(G.frameAlong([door.x + door.w - 3, 25.6, 23], [0, 1, 0]), 0, 2.8, 1.15, { name: `${id}.door.handle`, owner })));

  const sidePanel = { x: x0 + 56, y: -30, w: 1.6, d: 36, r: 0.5 };
  out.push(S(k.slabOf(sidePanel, 22, 32, P, 3, 0.4), { tone: "mid" }));
  out.push(L(facePath([
    [x0 + 57.7, -27, 24], [x0 + 57.7, -27, 52], [x0 + 57.7, 3, 52], [x0 + 57.7, 3, 24],
  ], true), { tone: "lo" }));
  out.push(D([at([x0 + 57.7, -25, 28]), at([x0 + 57.7, -25, 47]), at([x0 + 57.7, 1, 38])], { size: 0.45 }));
  const sideHandle = G.disc(0, 2.8, 1.05, G.frameAlong([x0 + 57.6, 1, 38], [1, 0, 0]), P, { steps: 20 });
  out.push(S(sideHandle, { tone: "mid" }));
  shapes.push(shape(A.slab(sidePanel, 22, 32, { name: `${id}.side.panel`, owner }, 3)));
  shapes.push(shape(A.disc(G.frameAlong([x0 + 57.6, 1, 38], [1, 0, 0]), 0, 2.8, 1.05, { name: `${id}.side.handle`, owner })));
  for (let i = 0; i < 3; i++) {
    const z0 = 43 + i * 3;
    out.push(L(facePath([
      [x0 + 57.72, -22, z0], [x0 + 57.72, -2, z0], [x0 + 57.72, -2, z0 + 1.4], [x0 + 57.72, -22, z0 + 1.4],
    ], true), { tone: "lo" }));
  }
  if (id !== "client") {
    for (let i = 0; i < 4; i++) {
      const sx = x0 + 14 + i * 5;
      out.push(L(facePath([
        [sx, 24.16, 46], [sx + 2.4, 24.16, 46], [sx + 2.4, 24.16, 51], [sx, 24.16, 51],
      ], true), { tone: "lo" }));
    }
  }

  const item = `<g class="fig-cabin" data-cabin="${id}" data-active="${route(2).activeCabins.includes(id) ? "1" : "0"}" data-busy="0" style="--fig-accent:${accent}">${out.join("")}</g>`;
  put(`${id}.cabin`, [cx, 0, 45], item, shapes);
}

// ---------------------------------------------------------------------------
// shafts, clutches, bearings

function bearing(capX, label) {
  const pedestalPlan = { x: capX - 3, y: 31, w: 6, d: 8, r: 1 };
  const pedestal = [S(k.slabOf(pedestalPlan, BASE_TOP, 7.4, P, 3, 0.5), { tone: "mid" })];
  put(label, [capX, LINE_Y, 16], pedestal.join(""), [
    shape(A.slab(pedestalPlan, BASE_TOP, 7.4, { name: `${label}.pedestal` }, 3)),
  ]);
  const out = [];
  const F = G.frameAlong([capX, LINE_Y, LINE_Z], [1, 0, 0]);
  out.push(S(G.disc(-1.5, 1.5, 4.7, F, P, { steps: 40 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.circleOf(F, 1.55, 4.7, P, 40), { tone: "lo" }));
  out.push(D(G.dotsOf(F, 1.56, 3.85, 4, P, { all: true, phase: 0.4 }), { size: 0.45 }));
  put(`line.cap.${capX}`, [capX, LINE_Y, LINE_Z], out.join(""), [
    shape(A.disc(F, -1.5, 1.5, 4.7, { name: `line.cap.${capX}`, owner: "line" })),
  ]);
}

function shaftSegment(from, to, id, index = null) {
  const out = [];
  const shapes = [];
  const F = G.frameAlong([from, LINE_Y, LINE_Z], [1, 0, 0]);
  out.push(S(G.disc(0, to - from, LINE_R, F, P, { steps: 40 }), { tone: "hi", crease: "lo" }));
  shapes.push(shape(A.disc(F, 0, to - from, LINE_R, { name: `${id}.shaft`, owner: "line" })));
  if (index) {
    const flangeF = G.frameAlong([index.x0, LINE_Y, LINE_Z], [1, 0, 0]);
    out.push(S(G.disc(0, 1.4, 3.8, flangeF, P, { steps: 40 }), { tone: "hi", crease: "lo" }));
    out.push(L(G.circleOf(flangeF, 1.45, 3.72, P, 40), { tone: "lo" }));
    out.push(L(G.circleOf(flangeF, 1.47, 1.2, P, 20), { tone: "mid" }));
    const indexD = shaftIndex(flangeF, index.x0 + 1.45, 0, 1.2, 3.72);
    out.push(`<g data-shaft="${index.indexId}">${L(indexD, { tone: "mid" })}</g>`);
    shapes.push(shape(A.disc(flangeF, 0, 1.4, 3.8, { name: `${id}.flange`, owner: "line" })));
  }
  put(id, [(from + to) / 2, LINE_Y, LINE_Z], out.join(""), shapes);
}

function clutchFlange(cx, side, index) {
  const x0 = side < 0 ? cx - 4 : cx + 2.5;
  const F = G.frameAlong([x0, LINE_Y, LINE_Z], [1, 0, 0]);
  const out = [
    S(G.disc(0, 1.5, 4.0, F, P, { steps: 40 }), { tone: "hi", crease: "lo" }),
    L(G.circleOf(F, 1.52, 3.92, P, 40), { tone: "lo" }),
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.15;
    const tooth = [
      G.pointOf(F, 1.53, 2.6, a - 0.13),
      G.pointOf(F, 1.53, 3.8, a - 0.13),
      G.pointOf(F, 1.53, 3.8, a + 0.13),
      G.pointOf(F, 1.53, 2.6, a + 0.13),
    ];
    out.push(L(k.pathOf(tooth.map((point) => k.iso(point, P)), true), { tone: "mid" }));
  }
  out.push(L(G.circleOf(F, 1.54, 1.2, P, 20), { tone: "mid" }));
  const label = side < 0 ? "left" : "right";
  put(`line.clutch-${index}.flange-${label}`, [x0 + 0.75, LINE_Y, LINE_Z], out.join(""), [
    shape(A.disc(F, 0, 1.5, 4.0, { name: `line.clutch-${index}.flange-${label}`, owner: "line" })),
  ]);
}

function clutch(index) {
  const cx = CLUTCH_X[index];
  const out = [];
  const shapes = [];
  const F = G.frameAlong([cx, LINE_Y, LINE_Z], [1, 0, 0]);
  out.push(S(G.disc(-4, 4, 5.4, F, P, { steps: 48 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.circleOf(F, 4.02, 5.4, P, 48), { tone: "lo" }));
  const knobF = G.frameAlong([cx, LINE_Y, LINE_Z + 5.4], [0, 0, 1]);
  out.push(S(G.disc(0, 3, 1.35, knobF, P, { steps: 20 }), { tone: "mid" }));
  out.push(D([at([cx, LINE_Y, LINE_Z + 8.1])], { size: 0.55, tone: "hi" }));
  shapes.push(shape(A.disc(F, -4, 4, 5.4, { name: `line.clutch-${index}.collar`, owner: "line" })));
  shapes.push(shape(A.disc(knobF, 0, 3, 1.35, { name: `line.clutch-${index}.knob`, owner: "line" })));
  put(`line.clutch-${index}`, [cx, LINE_Y, LINE_Z], `<g class="fig-clutch" data-clutch="${index}">${out.join("")}</g>`, shapes);
}

function driveLine() {
  const START = -129.5;
  const END = -65.5;
  const f = G.frameAlong([START, LINE_Y, LINE_Z], [1, 0, 0]);
  const out = [S(G.disc(0, END - START, LINE_R, f, P, { steps: 44 }), { tone: "hi", crease: "lo" })];
  out.push(S(G.disc(0.5, 2.0, 4.5, f, P, { steps: 40 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.circleOf(f, 2.05, 4.42, P, 40), { tone: "lo" }));
  out.push(S(G.disc(2.0, 3.9, 2.2, f, P, { steps: 24 }), { tone: "mid" }));
  const flangeF = G.frameAlong([-68, LINE_Y, LINE_Z], [1, 0, 0]);
  out.push(S(G.disc(0, 1.4, 3.8, flangeF, P, { steps: 40 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.circleOf(flangeF, 1.45, 3.72, P, 40), { tone: "lo" }));
  out.push(L(G.circleOf(flangeF, 1.47, 1.2, P, 20), { tone: "mid" }));
  out.push(`<g data-shaft="drive">${L(shaftIndex(flangeF, -66.55, 0, 1.2, 3.72), { tone: "mid" })}</g>`);
  out.push(`<path class="fig-arm" fill="none" stroke="var(--anatomy-lo)" stroke-width="3.2" stroke-linecap="round"/>`);
  const armF = G.frameAlong([HUB[0], LINE_Y, LINE_Z], [0, 0, 1]);
  const shapes = [
    shape(A.disc(f, 0, END - START, LINE_R, { name: "line.drive.shaft", owner: "line" })),
    shape(A.disc(f, 0.5, 2.0, 4.5, { name: "line.drive.web", owner: "line" })),
    shape(A.disc(f, 2.0, 3.9, 2.2, { name: "line.drive.hub", owner: "line" })),
    shape(A.disc(flangeF, 0, 1.4, 3.8, { name: "line.drive.flange", owner: "line" })),
    shape(A.disc(armF, 0, 9, 1.4, { name: "line.crank.arm", owner: "line" })),
  ];
  const gripF = G.frameAlong([HUB[0], LINE_Y, 31], [1, 0, 0]);
  shapes.push(shape(A.disc(gripF, -2.5, 2.5, 2.0, { name: "line.crank.grip", owner: "line" })));
  const grip = `<g data-crank-grip-transform>${S(G.disc(-2.5, 2.5, 2.0, gripF, P, { steps: 28 }), { tone: "mid", className: "fig-grip", crease: "lo" })}<circle cx="${at([HUB[0], LINE_Y, 31])[0]}" cy="${at([HUB[0], LINE_Y, 31])[1]}" r="0.8" fill="var(--fig-wood-ink)"/></g>`;
  put("line.drive", [-97, LINE_Y, LINE_Z], `<g class="fig-crank" data-crank="drive">${out.join("")}${grip}</g>`, shapes);
}

function rails() {
  RAIL_Y.forEach((y, index) => {
    const out = [];
    const shapes = [];
    out.push(S(k.slabOf({ x: RAIL_X[0], y: y - 1.5, w: RAIL_X[1] - RAIL_X[0], d: 3, r: 0.8 }, RAIL_Z0, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL_X[0] + 6, RAIL_X[1] - 6].map((x) => at([x, y, RAIL_Z1])), { size: 0.4 }));
    shapes.push(shape(A.slab({ x: RAIL_X[0], y: y - 1.5, w: RAIL_X[1] - RAIL_X[0], d: 3, r: 0.8 }, RAIL_Z0, 4, { name: `stand.rail.${index}` }, 3)));
    for (const x of [-116, -56, 56, 116]) {
      const post = { x: x - 1.5, y: y - 1.5, w: 3, d: 3, r: 0.6 };
      out.push(S(k.slabOf(post, BASE_TOP, RAIL_Z0 - BASE_TOP, P, 3, 0.3), { tone: "lo" }));
      shapes.push(shape(A.slab(post, BASE_TOP, RAIL_Z0 - BASE_TOP, { name: `stand.rail.${index}.post` }, 3)));
    }
    put(`stand.rail.${index}`, [0, y, RAIL_Z0], out.join(""), shapes);
  });
}

// ---------------------------------------------------------------------------
// pallet

function pallet() {
  const out = [];
  const shapes = [];
  const owner = "pallet";
  const deckPlan = { x: REST_X - 13, y: 26, w: 26, d: 18, r: 2 };
  out.push(S(k.slabOf(deckPlan, 34, 3, P, 5, 0.6), { tone: "hi" }));
  shapes.push(shape(A.slab(deckPlan, 34, 3, { name: "pallet.deck", owner }, 5)));
  const lipBack = { x: REST_X - 12, y: 26, w: 24, d: 2.2, r: 0.8 };
  const lipFront = { x: REST_X - 12, y: 41.8, w: 24, d: 2.2, r: 0.8 };
  out.push(S(k.slabOf(lipBack, 37, 1.5, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf(lipFront, 37, 1.5, P, 3, 0.3), { tone: "mid" }));
  shapes.push(shape(A.slab(lipBack, 37, 1.5, { name: "pallet.lip.back", owner }, 3)));
  shapes.push(shape(A.slab(lipFront, 37, 1.5, { name: "pallet.lip.front", owner }, 3)));

  for (const x of [REST_X - 9, REST_X + 9]) {
    const axleF = G.frameAlong([x, 28, 32], [0, 1, 0]);
    out.push(S(G.disc(0, 14, 0.7, axleF, P, { steps: 16 }), { tone: "lo" }));
    shapes.push(shape(A.disc(axleF, 0, 14, 0.7, { name: "pallet.axle", owner })));
    for (const y of RAIL_Y) {
      const F = G.frameAlong([x, y, 32], [0, 1, 0]);
      out.push(S(G.disc(-0.8, 0.8, 2.0, F, P, { steps: 32 }), { tone: "mid", crease: "lo" }));
      out.push(L(G.circleOf(F, 0.84, 2.0, P, 32), { tone: "lo" }));
      out.push(D([at([x, y + 0.86, 32])], { size: 0.45 }));
      shapes.push(shape(A.disc(F, -0.8, 0.8, 2.0, { name: "pallet.wheel", owner })));
    }
  }

  const crate = { x: REST_X - 9, y: 29, w: 18, d: 12, r: 1.2 };
  const crateBody = `<g class="fig-crate">${S(k.slabOf(crate, 37, 9.2, P, 4, 0.6), { tone: "hi", lit: true })}${S(k.slabOf(k.insetPlan(crate, 0.8), 46.2, 1.0, P, 4, 0.4), { tone: "mid" })}${L(k.planOutline(k.insetPlan(crate, 2.4), 47.2, P, 4), { tone: "faint" })}${faceGroup(crate.x + 1.7, 41.01, 45.5, `
    <rect x="0" y="0" width="14.6" height="6.8" rx="0.7" fill="var(--anatomy-shade-3)" stroke="var(--anatomy-lo)" stroke-width="0.5"/>
    <path d="M1.6 2.1h9.8M1.6 3.5h7.4M1.6 4.9h10.8" fill="none" stroke="var(--anatomy-lo)" stroke-width="0.45" stroke-linecap="round"/>
  `)}</g>`;
  out.push(crateBody);
  shapes.push(shape(A.slab(crate, 37, 9.2, { name: "pallet.crate", owner }, 4)));
  shapes.push(shape(A.slab(k.insetPlan(crate, 0.8), 46.2, 1.0, { name: "pallet.crate.lid", owner }, 4)));

  const packet = { x: REST_X - 5.5, y: 31, w: 11, d: 8, r: 0.9 };
  const packetBody = `<g class="fig-token-request">${S(k.slabOf(packet, 37, 5, P, 4, 0.4), { tone: "hi", lit: true })}${L(facePath([
    [packet.x + 1.4, 42.03, packet.y],
    [packet.x + packet.w / 2, 42.03, packet.y + packet.d / 2],
    [packet.x + packet.w - 1.4, 42.03, packet.y + packet.d],
  ]), { tone: "lo" })}${L(facePath([[packet.x + 0.95, 39.02, 39.5], [packet.x + packet.w - 0.95, 39.02, 39.5]]), { tone: "faint" })}</g>`;
  out.push(packetBody);
  shapes.push(shape(A.slab(packet, 37, 5, { name: "pallet.packet", owner }, 4)));

  put("pallet", [REST_X, LINE_Y, 40], `<g class="fig-pallet" data-part="pallet" transform="${k.translateAlong(P, [0, 0, 0])}">${out.join("")}</g>`, shapes);
}

// ---------------------------------------------------------------------------
// assemble

function scene() {
  base();
  for (const room of CABINS) cabin(room.id, CAB_X[room.id]);
  rails();
  driveLine();
  shaftSegment(-62.5, -48.5, "line.link1.left");
  shaftSegment(-42, -29.5, "line.link1.right", { x0: -34, indexId: "link1" });
  shaftSegment(29.5, 43.5, "line.link2.left");
  shaftSegment(50, 62.5, "line.link2.right", { x0: 56, indexId: "link2" });
  for (const x of [-131, -64, -28, 28, 64]) bearing(x, `stand.bearing.${x}`);
  clutchFlange(CLUTCH_X[0], -1, 0);
  clutchFlange(CLUTCH_X[0], 1, 0);
  clutchFlange(CLUTCH_X[1], -1, 1);
  clutchFlange(CLUTCH_X[1], 1, 1);
  clutch(0);
  clutch(1);
  pallet();
  A.settle(R, P);
  const items = R.items.slice().sort((a, b) => a.key - b.key);
  return items.map((item) => item.svg).join("");
}

const art = scene();
A.auditOrExit(R, P);

const initial = route(2);
const DATA = {
  cabX: CAB_CX,
  restX: REST_X,
  line: { y: LINE_Y, z: LINE_Z, r: LINE_R },
  clutch: [{ x: CLUTCH_X[0], open: CLUTCH_OPEN }, { x: CLUTCH_X[1], open: CLUTCH_OPEN }],
  hub: HUB,
  crankR: CRANK_R,
  shafts: [
    { id: "drive", faceX: -66.55, rHub: 1.2, rRim: 3.72 },
    { id: "link1", faceX: -32.55, rHub: 1.2, rRim: 3.72 },
    { id: "link2", faceX: 57.45, rHub: 1.2, rRim: 3.72 },
  ],
  gears: [
    { id: "a", o: [CAB_X.app + 21.5, 20, 62], r: 6.5, teeth: 20, ratio: 1, face: 2.27 },
    { id: "b", o: [CAB_X.app + 32.5, 20, 62], r: 4.5, teeth: 14, ratio: -6.5 / 4.5, face: 2.27 },
  ],
  disk: { o: [CAB_CX.db, 20, 62], r: 7.05, hub: 1.25, face: 3.05 },
  routes: MODES.map((_, index) => route(index)),
  initialMode: 2,
  initialReadout: initial.readout,
};

const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

const live = `
const P = ${JSON.stringify(P)};
const D = ${JSON.stringify(DATA)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const palletEl = svg.querySelector('[data-part="pallet"]');
const readout = document.querySelector("[data-readout]");
const liveRegion = document.querySelector("[data-live]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const cabins = Object.fromEntries(${JSON.stringify(CABINS.map((c) => c.id))}.map((id) => [id, svg.querySelector('[data-cabin="' + id + '"]')]));
const clutchEls = [svg.querySelector('[data-clutch="0"]'), svg.querySelector('[data-clutch="1"]')];
const shaftEls = {
  drive: svg.querySelector('[data-shaft="drive"] path'),
  link1: svg.querySelector('[data-shaft="link1"] path'),
  link2: svg.querySelector('[data-shaft="link2"] path'),
};
const gearEls = {
  a: svg.querySelector('[data-gear="a"]'),
  b: svg.querySelector('[data-gear="b"]'),
};
const diskEl = svg.querySelector('[data-disk="main"]');
const armEl = svg.querySelector(".fig-arm");
const gripEl = svg.querySelector("[data-crank-grip-transform]");
const calm = () => still.matches;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const smoothstep = (t) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const stopX = (id) => D.cabX[id];
const stopAt = (x) => { let best = null; for (const id of r.stops) if (Math.abs(D.cabX[id] - x) < 0.45) best = id; return best; };
const nearestStop = (x) => { let best = r.stops[0]; for (const id of r.stops) if (Math.abs(D.cabX[id] - x) < Math.abs(D.cabX[best] - x)) best = id; return stopX(best); };

let r = route(D.initialMode);
let mode = D.initialMode;
let clutches = null;
let palletX = D.restX;
let targetX = D.restX;
let busy = null;
let hover = null;
let trip = null;
let touring = !calm();
let tourStep = 0;
let tourTimer = 0.9;
let drag = null;
let frame = 0;
let last = 0;
let visible = false;
let resumeTimer = 0;
let clutchX = [0, 0];
const phase = { crank: Math.PI / 2, drive: 0, link1: 0, link2: 0, gears: 0, disk: 0 };

function applyRoute(next) {
  r = next;
  stage.dataset.mode = r.id;
  stage.dataset.payload = r.payload;
  for (const cabin of ${JSON.stringify(CABINS.map((c) => c.id))}) {
    const el = cabins[cabin];
    if (el) el.dataset.active = r.activeCabins.includes(cabin) ? "1" : "0";
  }
  stage.setAttribute("aria-label", "Стенд архитектур. " + r.readout.replace("\\n", ". ") + ". Стрелки переключают режим, Space запускает прогон, Home возвращает трёхзвенную.");
  if (liveRegion) liveRegion.textContent = r.readout.replace("\\n", " · ");
  showReadout();
}

function showReadout() {
  if (hover) {
    const cabin = ${JSON.stringify(CABINS)}.find((item) => item.id === hover);
    readout.textContent = cabin.label + " · " + r.cabinText[hover];
  } else {
    readout.textContent = r.readout;
  }
}

function setBusy(next) {
  if (busy === next) return;
  busy = next;
  for (const cabin of ${JSON.stringify(CABINS.map((c) => c.id))}) {
    const el = cabins[cabin];
    if (el) el.dataset.busy = busy === cabin ? "1" : "0";
  }
}

function setMode(index, fromTour = false) {
  if (!fromTour) { stopTour(); scheduleResume(); }
  mode = ((index % MODES.length) + MODES.length) % MODES.length;
  clutches = null;
  trip = null;
  hover = null;
  setBusy(null);
  applyRoute(route(mode));
  targetX = nearestStop(palletX);
  run();
}

function setClutch(index) {
  stopTour();
  scheduleResume();
  trip = null;
  setBusy(null);
  const base = route(mode).clutches;
  const next = r.clutches.slice();
  next[index] = !next[index];
  clutches = next.every((value, i) => value === base[i]) ? null : next;
  applyRoute(route(mode, clutches));
  targetX = nearestStop(palletX);
  run();
}

function reset() {
  stopTour();
  scheduleResume();
  mode = 2;
  clutches = null;
  trip = null;
  hover = null;
  setBusy(null);
  applyRoute(route(2));
  targetX = stopX("client");
  run();
}

function moveTo(next) {
  const delta = next - palletX;
  if (Math.abs(delta) < 1e-4) return;
  palletX = next;
  phase.crank += delta * 0.42;
  phase.drive += delta * 1.15;
  if (r.clutches[0]) phase.link1 += delta * 1.15;
  if (r.clutches[1]) phase.link2 += delta * 1.15;
  phase.gears += delta * 2.3;
  phase.disk += delta * 4.6;
}

function beginLeg() {
  if (!trip) return;
  if (trip.i >= trip.seq.length) { completeTrip(); return; }
  const to = trip.seq[trip.i].x;
  if (Math.abs(to - palletX) < 0.06) {
    trip.leg = null;
    trip.timer = trip.seq[trip.i].dwell;
    setBusy(stopAt(to));
    return;
  }
  trip.leg = { from: palletX, to, t: 0, dur: Math.max(0.7, Math.abs(to - palletX) / 68) };
  setBusy(null);
}

function completeTrip() {
  trip = null;
  setBusy(null);
  if (touring) tourTimer = 1.25;
}

function startTrip() {
  if (trip) return;
  const stops = r.stops.map(stopX);
  if (stops.length < 2) return;
  const client = stopX("client");
  const seq = [];
  if (Math.abs(palletX - client) > 0.35) seq.push({ x: client, dwell: 0.4 });
  for (let i = 1; i < stops.length; i++) seq.push({ x: stops[i], dwell: 0.95 });
  for (let i = stops.length - 2; i >= 0; i--) seq.push({ x: stops[i], dwell: i === 0 ? 1.15 : 0.95 });
  trip = { seq, i: 0, leg: null, timer: 0 };
  beginLeg();
  run();
}

function nudge(direction) {
  if (!direction) return;
  trip = null;
  const stops = r.stops.map(stopX);
  let index = 0;
  for (let i = 0; i < stops.length; i++) if (Math.abs(stops[i] - targetX) < Math.abs(stops[index] - targetX)) index = i;
  targetX = stops[clamp(index + Math.sign(direction), 0, stops.length - 1)];
  setBusy(null);
  run();
}

function stopTour() {
  touring = false;
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = 0;
}

function scheduleResume() {
  if (calm()) return;
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => {
    resumeTimer = 0;
    if (calm()) return;
    touring = true;
    tourStep = 0;
    tourTimer = 0.9;
    run();
  }, 6500);
}

function interact() {
  stopTour();
  scheduleResume();
  run();
}

function tourAction() {
  if (tourStep === 0) { setMode(2, true); startTrip(); tourStep = 1; }
  else if (tourStep === 1) { setMode(1, true); startTrip(); tourStep = 2; }
  else if (tourStep === 2) { setMode(0, true); startTrip(); tourStep = 3; }
  else if (tourStep === 3) { setMode(2, true); tourStep = 4; tourTimer = 3.4; }
  else { tourStep = 0; tourTimer = 0.7; }
}

function axisPoint(F, s, radius, angle) {
  const c = Math.cos(angle), sn = Math.sin(angle);
  return [
    F.o[0] + F.a[0] * s + F.u[0] * radius * c + F.v[0] * radius * sn,
    F.o[1] + F.a[1] * s + F.u[1] * radius * c + F.v[1] * radius * sn,
    F.o[2] + F.a[2] * s + F.u[2] * radius * c + F.v[2] * radius * sn,
  ];
}

function gearMark(F, phaseValue, radius, teeth) {
  const step = Math.PI * 2 / teeth;
  const points = [];
  for (let i = 0; i < teeth; i++) {
    const a = phaseValue + i * step;
    points.push(axisPoint(F, F.s, radius + 0.1, a));
    points.push(axisPoint(F, F.s, radius + 0.1, a + step * 0.25));
    points.push(axisPoint(F, F.s, radius + 0.95, a + step * 0.3));
    points.push(axisPoint(F, F.s, radius + 0.95, a + step * 0.7));
    points.push(axisPoint(F, F.s, radius + 0.1, a + step * 0.75));
    points.push(axisPoint(F, F.s, radius + 0.1, a + step));
  }
  let spokes = "";
  const count = radius > 5 ? 8 : 6;
  for (let i = 0; i < count; i++) {
    const a = phaseValue + (i / count) * Math.PI * 2;
    spokes += pathOf([iso(axisPoint(F, F.s + 0.04, 1.4, a), P), iso(axisPoint(F, F.s + 0.04, radius, a), P)]);
  }
  return lineSvg(pathOf(points.map((point) => iso(point, P)), true), { tone: "mid" }) + lineSvg(spokes, { tone: "lo" });
}

function gearFrame(gear) {
  return { o: gear.o, a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], s: gear.face };
}

function draw(now) {
  palletEl.setAttribute("transform", translateAlong(P, [palletX - D.restX, 0, 0]));
  for (let i = 0; i < 2; i++) {
    const want = r.clutches[i] ? 0 : D.clutch[i].open;
    if (calm()) clutchX[i] = want;
    clutchEls[i].setAttribute("transform", translateAlong(P, [clutchX[i], 0, 0]));
  }
  const crankAngle = phase.crank;
  const gy = D.hub[1] + D.crankR * Math.cos(crankAngle);
  const gz = D.hub[2] + D.crankR * Math.sin(crankAngle);
  armEl.setAttribute("d", pathOf([iso([D.hub[0], D.hub[1], D.hub[2]], P), iso([D.hub[0], gy, gz], P)]));
  gripEl.setAttribute("transform", translateAlong(P, [0, gy - D.hub[1], gz - (D.hub[2] + D.crankR)]));
  for (const shaft of D.shafts) {
    const el = shaftEls[shaft.id];
    if (!el) continue;
    const a = phase[shaft.id];
    const d = pathOf([
      iso([shaft.faceX, D.line.y + shaft.rHub * Math.cos(a), D.line.z + shaft.rHub * Math.sin(a)], P),
      iso([shaft.faceX, D.line.y + shaft.rRim * Math.cos(a), D.line.z + shaft.rRim * Math.sin(a)], P),
    ]);
    el.setAttribute("d", d);
  }
  for (const gear of D.gears) {
    const el = gearEls[gear.id];
    if (!el) continue;
    el.innerHTML = gearMark(gearFrame(gear), phase.gears * gear.ratio, gear.r, gear.teeth);
  }
  if (diskEl) {
    const F = { o: D.disk.o, a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] };
    const a = phase.disk;
    const d = pathOf([
      iso(axisPoint(F, D.disk.face, D.disk.hub, a), P),
      iso(axisPoint(F, D.disk.face, D.disk.r, a), P),
    ]);
    diskEl.innerHTML = lineSvg(d, { tone: "mid" });
  }
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const stillNow = calm();

  if (touring && !trip) {
    tourTimer -= dt;
    if (tourTimer <= 0) tourAction();
  }

  if (trip) {
    if (trip.leg) {
      if (stillNow) {
        moveTo(trip.leg.to);
        trip.timer = trip.seq[trip.i].dwell;
        trip.leg = null;
        setBusy(stopAt(trip.seq[trip.i].x));
      } else {
        trip.leg.t += dt;
        const share = smoothstep(trip.leg.t / trip.leg.dur);
        moveTo(trip.leg.from + (trip.leg.to - trip.leg.from) * share);
        if (share >= 1) {
          trip.leg = null;
          trip.timer = trip.seq[trip.i].dwell;
          setBusy(stopAt(trip.seq[trip.i].x));
        }
      }
    } else {
      trip.timer -= dt;
      if (trip.timer <= 0) {
        trip.i += 1;
        if (trip.i >= trip.seq.length) completeTrip();
        else beginLeg();
      }
    }
  } else {
    const want = nearestStop(targetX);
    targetX = want;
    if (stillNow) moveTo(targetX);
    else if (Math.abs(targetX - palletX) > 0.01) {
      moveTo(palletX + (targetX - palletX) * (1 - Math.exp(-dt / 0.2)));
    } else {
      moveTo(targetX);
      if (!busy) setBusy(stopAt(targetX));
    }
  }

  for (let i = 0; i < 2; i++) {
    const want = r.clutches[i] ? 0 : D.clutch[i].open;
    clutchX[i] = stillNow ? want : clutchX[i] + (want - clutchX[i]) * (1 - Math.exp(-dt / 0.16));
    if (Math.abs(want - clutchX[i]) < 0.005) clutchX[i] = want;
  }

  if (busy === "app") phase.gears += dt * 1.35;
  if (busy === "db") phase.disk += dt * 4.2;

  draw(now);

  const clutchMoving = clutchX.some((value, i) => Math.abs(value - (r.clutches[i] ? 0 : D.clutch[i].open)) > 0.01);
  const palletMoving = Math.abs(targetX - palletX) > 0.02;
  const settled = !trip && !touring && !palletMoving && !clutchMoving;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}

function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}

new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
if (calm()) touring = false;
window.addEventListener("pagehide", () => { if (resumeTimer) clearTimeout(resumeTimer); });

stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    interact();
    setMode(r.index + (event.key === "ArrowRight" ? 1 : -1));
  } else if (event.key === " " || event.key === "Spacebar") {
    event.preventDefault();
    interact();
    startTrip();
  } else if (event.key === "Home") {
    event.preventDefault();
    interact();
    reset();
  }
});

for (const [index, el] of clutchEls.entries()) {
  if (!el) continue;
  el.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    interact();
    setClutch(index);
  });
}

for (const id of ${JSON.stringify(CABINS.map((c) => c.id))}) {
  const el = cabins[id];
  if (!el) continue;
  el.addEventListener("pointerenter", () => { hover = id; showReadout(); });
  el.addEventListener("pointerleave", () => { if (hover === id) hover = null; showReadout(); });
}

const crankEl = svg.querySelector('[data-crank="drive"]');
if (crankEl) {
  crankEl.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    stopTour();
    drag = { x: event.clientX, id: event.pointerId };
    if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
    stage.focus();
  });
}
stage.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const steps = Math.trunc((event.clientX - drag.x) / 18);
  if (!steps) return;
  drag.x += steps * 18;
  for (let i = 0; i < Math.abs(steps); i++) nudge(Math.sign(steps));
});
const endDrag = (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  if (stage.hasPointerCapture && stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  drag = null;
  scheduleResume();
};
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("pointerenter", () => { if (touring) { stopTour(); scheduleResume(); } });

applyRoute(r);
draw(0);
run();
`;

const extraCss = `
.fig-cabin{cursor:help}
.fig-clutch{cursor:pointer}
.fig-crank{cursor:grab}
.fig-crank:active{cursor:grabbing}
.fig-pallet{pointer-events:none}
.fig-lamp .iso-top{fill:var(--anatomy-shade-1)}
.fig-cabin[data-active="1"] .fig-lamp .iso-top{fill:var(--fig-accent)}
.fig-cabin[data-active="1"] .fig-lamp .iso-shade{fill:var(--anatomy-shade-2)}
.fig-lamp-glow{fill:var(--fig-accent);opacity:0;filter:blur(4px);pointer-events:none;transition:opacity .5s var(--anatomy-ease)}
.fig-cabin[data-busy="1"] .fig-lamp-glow{opacity:.62}
.fig-screen-bar{fill:var(--fig-accent);opacity:.85}
.fig-cursor{fill:var(--fig-accent);animation:fig-blink 1.15s steps(1,end) infinite}
.fig-trim{stroke:var(--fig-accent);opacity:.65}
.fig-blind{opacity:0;transition:opacity .42s var(--anatomy-ease)}
.fig-cabin[data-active="0"] .fig-blind{opacity:.9}
.fig-cabin[data-active="0"] .fig-trim{opacity:.16}
.fig-cabin[data-active="1"]:hover .fig-lamp-glow{opacity:.38}
.fig-cabin[data-active="1"]:hover .fig-trim{opacity:1}
.fig-arm{pointer-events:none}
.fig-grip .iso-top{fill:var(--fig-wood)}
.fig-grip .iso-shade{fill:var(--fig-wood-shade)}
.fig-grip .iso-edge{stroke:var(--fig-wood-ink)}
.fig-label .iso-fill{fill:var(--fig-label)}
.fig-label .iso-shade{fill:var(--fig-label-shade)}
.fig-label .iso-top{fill:var(--fig-label-top)}
.fig-label .iso-edge{stroke:var(--fig-label-edge)}
.fig-label-text text{fill:var(--fig-label-ink)}
.fig-crate,.fig-token-request{transition:opacity .38s var(--anatomy-ease)}
.iso-stage[data-payload="file"] .fig-token-request{opacity:0}
.iso-stage[data-payload="request"] .fig-crate{opacity:0}
.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.iso-stage{touch-action:pan-y;user-select:none;-webkit-user-select:none}
.iso[data-theme="light"] .fig-lamp-glow{filter:blur(3px)}
.iso[data-theme="light"] .fig-cabin[data-busy="1"] .fig-lamp-glow{opacity:.26}
@keyframes fig-blink{0%,55%{opacity:1}56%,100%{opacity:.08}}
.iso-plate-corner[data-corner="readout"]{white-space:pre-line;text-align:right;max-width:72%;line-height:1.55;font-size:10px}
@media (max-width:560px){
  .iso-plate{padding:48px 12px 94px}
  .iso-stage{margin:0 -8px 26px}
  .iso-stage .iso-svg{transform:scale(1.08);transform-origin:50% 50%}
  .iso-plate-corner[data-corner="readout"]{left:0;right:0;bottom:34px;max-width:none;font-size:9px;line-height:1.5}
  .iso-plate-corner[data-corner="hint"]{bottom:16px}
}
@media (prefers-reduced-motion:reduce){
  .fig-cursor,.fig-lamp-glow{animation:none}
  .fig-crate,.fig-token-request,.fig-lamp-glow{transition:none}
}
`;

const customTheme = `
.iso{
  --anatomy-page:#090909;--anatomy-card:#181816;--anatomy-text:#b9b6ac;--anatomy-strong:#f0eee7;--anatomy-muted:#827f76;
  --anatomy-paper:#181816;--anatomy-face:#262622;--anatomy-top:#2c2c27;
  --anatomy-shade-0:#111110;--anatomy-shade-1:#181816;--anatomy-shade-2:#1e1e1b;--anatomy-shade-3:#242420;
  --anatomy-hi:#eae7de;--anatomy-mid:#918e84;--anatomy-lo:#5b5951;--anatomy-faint:#3a3832;
  --anatomy-halo:#040404;--anatomy-halo-opacity:.92;
  --fig-client:#e2b06a;--fig-app:#86cbb8;--fig-db:#93b6ee;
  --fig-wood:#8a5b36;--fig-wood-shade:#5e3b22;--fig-wood-ink:#3a2414;
  --fig-screen:#0c0e10;--fig-recess:#0e1012;--fig-off:#090b0c;
  --fig-label:#d2bd92;--fig-label-shade:#b49d70;--fig-label-top:#e6d4ac;--fig-label-edge:#6a5634;--fig-label-ink:#2b2213;
}
.iso[data-theme="light"]{
  --anatomy-page:#e9e5dc;--anatomy-card:#f7f4ec;--anatomy-text:#5d5a52;--anatomy-strong:#1b1a17;--anatomy-muted:#918d83;
  --anatomy-paper:#f7f4ec;--anatomy-face:#fbf8f1;--anatomy-top:#fffdf7;
  --anatomy-shade-0:#c7c3b7;--anatomy-shade-1:#d7d3c7;--anatomy-shade-2:#e4e0d5;--anatomy-shade-3:#efebe1;
  --anatomy-hi:#201f1c;--anatomy-mid:#66635b;--anatomy-lo:#9c988e;--anatomy-faint:#c9c5bb;
  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.36;
  --fig-client:#8f5f14;--fig-app:#1f6f5c;--fig-db:#2c4f91;
  --fig-wood:#9a6a3e;--fig-wood-shade:#7c502b;--fig-wood-ink:#4a2d17;
  --fig-screen:#101214;--fig-recess:#cec8ba;--fig-off:#1b1d1e;
  --fig-label:#ecdbb6;--fig-label-shade:#d6c294;--fig-label-top:#f6e8c8;--fig-label-edge:#8b774f;--fig-label-ink:#3a2d18;
}
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Стенд архитектур",
  hint: "режимы ← → · Space: прогон",
  readout: initial.readout,
  keys: [
    { mark: "raised", label: "канал" },
    { mark: "lit", label: "звено включено" },
    { mark: "flat", label: "запрос или файл" },
  ],
  caption:
    "Трёхзвенная архитектура: клиент показывает, сервер приложений считает, сервер БД хранит. В файл-серверной всё считает клиент, а сервер только отдаёт файлы.",
  body: `<style>${customTheme}${extraCss}</style><div class="iso-stage" tabindex="0" role="application" aria-label="Стенд архитектур: три кабины, два вала с муфтами и паллета с грузом. Стрелки переключают режим, Space запускает прогон, Home возвращает трёхзвенную.">${k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "Регулируемый стенд архитектур: три кабины на одной плите, между ними два вала с муфтами, слева рукоятка, по рельсам идёт паллета с грузом. Клиент показывает, сервер приложений считает, сервер БД хранит; муфты включают звенья, а груз показывает, что идёт по каналу.",
    body: art,
    className: "fig-svg",
  })}<span class="visually-hidden" aria-live="polite" data-live></span></div>`,
});

const script = kitScript() + modelSource + live;
for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  const html = k.pageHtml({ title: "Стенд архитектур", theme, body, script, width: 660 }).replace('<html lang="en">', '<html lang="ru">');
  writeFileSync(join(HERE, name), html);
  console.log("wrote", name);
}
