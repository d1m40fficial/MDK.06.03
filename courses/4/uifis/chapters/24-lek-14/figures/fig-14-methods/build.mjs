import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import {
  ID, TITLE, HINT, CAPTION, KEYS, STEPS, STATIONS, MODES, ROUNDS, RETURNS, ROUTE, STEP_POINT,
} from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 640;
const HEIGHT = 452;

// Станок: станина на ножках, прямой рельс с пятью порталами, возвратная петля
// на опорах, две клети подъёма, тележка с изделием, кассета, лоток, счётчики и
// переводной рычаг со стрелкой.

const BED = { x: -152, y: -62, w: 312, d: 124, r: 10 };
const BED_H = 13;
const FOOT_H = 6;
const TRACK_X0 = -120;
const TRACK_X1 = 134;
const RAIL_Y = 7;
const RAIL_Z0 = 3;
const RAIL_Z1 = 7;
const RAIL_TOP = 7;
const SLEEPERS = [-116, -93, -70, -47, -24, -1, 22, 45, 68, 91, 114, 130];
const STATION_X = STATIONS.map((station) => station.x);
const POST_Y = 12;
const POST_TOP = 40;
const BEAM_Z0 = 40;
const BEAM_Z1 = 44;
const LOOP_Y = -32;
const LOOP_Z0 = 48;
const LOOP_Z1 = 53;
const LOOP_X0 = -60;
const LOOP_RAIL_END = 76;
const LOOP_STUB = 92;
const LOOP_END = 96;
const LIFT_X = [84, -52];
const BLADE_PIVOT = [62, 2];
const LEVER = [100, 42];
const CASSETTE = { x: -148, y: -14, w: 26, d: 28, r: 2 };
const TRAY = { x: 132, y: -21, w: 27, d: 42, r: 2.6 };
const CONSOLE = { x: -126, y: 40, w: 80, d: 18, r: 2 };
const PLAQUE = { x: -38, y: 34, w: 40, d: 12, r: 1.4 };
const CARD = { x: -8, y: -4.5, w: 16, d: 9, r: 1.1 };
const DECK_Z = 8.2;
const CARD_TOP = 19.5;
const COUNTER_X = [-104, -66];
const COUNTER_Y = 49;
const COUNTER_TOP = 30.2;
const BLADE_LEN = 22;
const BLADE_OFFSET = -6;
const NEEDLE = [-29, 40];
const NEEDLE_ROWS = [38, 42];

const pts = [
  ...k.boxCorners(BED, -BED_H - FOOT_H, 0),
  ...k.boxCorners({ x: LOOP_X0 - 6, y: LOOP_Y - 9, w: LOOP_END + 4 - (LOOP_X0 - 6), d: 18 }, LOOP_Z0, LOOP_Z1 + 7),
  ...k.boxCorners({ x: LIFT_X[0] - 3, y: -48, w: 6, d: 33 }, 0, 61),
  ...k.boxCorners({ x: LIFT_X[1] - 3, y: -48, w: 6, d: 33 }, 0, 61),
  ...STATIONS.flatMap((station) => k.boxCorners({ x: station.x - 9, y: -16, w: 18, d: 32 }, 0, BEAM_Z1)),
  ...k.boxCorners(TRAY, 0, 8),
  ...k.boxCorners(CASSETTE, 0, 15),
  ...k.boxCorners(CONSOLE, 0, 32),
  [LEVER[0], LEVER[1], 24],
  [PLAQUE.x, PLAQUE.y + PLAQUE.d, 3],
  [84, LOOP_Y, 68],
];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 18, azimuth: 38, elevation: 31 });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (dots, style) => k.dotsSvg(dots, style);
const byDepth = (list) => [...list].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const seg3 = (a, b) => k.segment(a, b, P);

// Полоса-призма по произвольному отрезку плана: рельсы ветки, рычаг, тяга.
function bandOf(from, to, width, z, height, bevel = 0.4) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (width / 2);
  const ny = (dx / len) * (width / 2);
  const ring = [
    [from[0] + nx, from[1] + ny],
    [to[0] + nx, to[1] + ny],
    [to[0] - nx, to[1] - ny],
    [from[0] - nx, from[1] - ny],
  ];
  return k.extrude(ring, z, height, P, { convex: true, bevel });
}

function arcOfPlan(cx, cy, r0, r1, a0, a1, steps = 14) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const a = (a0 + ((a1 - a0) * i) / steps) * (Math.PI / 180);
    out.push([cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = (a0 + ((a1 - a0) * i) / steps) * (Math.PI / 180);
    out.push([cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)]);
  }
  return out;
}

function screws(points, radius = 2.1) {
  return [
    L(points.map(([x, y]) => k.ring(x, y, radius, 0, P, 16)).join(""), { tone: "lo" }),
    D(points.map(([x, y]) => at([x, y, 0])), { size: 0.5 }),
  ].join("");
}

function bed() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BED, -BED_H - FOOT_H, BED_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BED, 27))) {
    out.push(S(k.cylinder(x, y, 7, -BED_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -BED_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
    out.push(L(k.sideArc(x, y, 7, -BED_H - FOOT_H + 1.1, P, 24), { tone: "faint" }));
  }
  out.push(S(k.slabOf(BED, -BED_H, BED_H, P, 9, 1.7), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BED, 5), 0, P, 9), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(BED, 9), 0, P, 9), { tone: "faint" }));
  out.push(screws([...k.corners(BED, 12), ...k.corners(BED, 9).map(([x, y]) => [x + 26, y])]));
  out.push(
    S(k.slabOf({ x: -146, y: -60, w: 268, d: 7, r: 1 }, 0, 0.7, P, 3), { tone: "mid", crease: "none" }),
  );
  const ticks = k.topTicks(-142, 114, 4, 5, -59.4, 1.1, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(
    S(k.slabOf({ x: -34, y: 52, w: 120, d: 6, r: 1 }, 0, 0.7, P, 3), { tone: "mid", crease: "none" }),
  );
  const front = k.topTicks(-30, 82, 4, 5, 52.8, 1.1, [2, 3.4], P);
  out.push(L(front.minor, { tone: "lo" }), L(front.major, { tone: "mid" }));
  out.push(S(k.slabOf({ x: PLAQUE.x, y: PLAQUE.y, w: PLAQUE.w + 6, d: PLAQUE.d + 2, r: 1.6 }, 0, 1.1, P, 4), { tone: "mid", crease: "none" }));
  out.push(
    L(
      [18, 13, 8]
        .map((len, i) => k.lineOnTop([PLAQUE.x + 5, PLAQUE.y + 2 + i * 2.4], [PLAQUE.x + 5 + len, PLAQUE.y + 2 + i * 2.4], 1.1, P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(D([at([PLAQUE.x + PLAQUE.w + 3, PLAQUE.y + PLAQUE.d / 2, 1.1])], { size: 0.46 }));
  return out.join("");
}

function track() {
  const out = [];
  for (const x of SLEEPERS) {
    out.push(S(k.slabOf({ x, y: -15, w: 6, d: 30, r: 1 }, 0, RAIL_Z0, P, 3), { tone: "lo" }));
    out.push(D([at([x + 2, -12, RAIL_Z0]), at([x + 2, 12, RAIL_Z0])], { size: 0.4 }));
  }
  for (const y of [-RAIL_Y, RAIL_Y]) {
    out.push(
      S(k.slabOf({ x: TRACK_X0, y: y - 1.8, w: TRACK_X1 - TRACK_X0, d: 3.6, r: 1.2 }, RAIL_Z0, 2.2, P, 3, 0.4), {
        tone: "mid",
      }),
    );
    out.push(
      S(k.slabOf({ x: TRACK_X0, y: y - 1.3, w: TRACK_X1 - TRACK_X0, d: 2.6, r: 0.9 }, RAIL_Z0 + 2.2, 1.8, P, 3, 0.35), {
        tone: "hi",
        crease: "lo",
      }),
    );
  }
  for (const x of [TRACK_X0 - 3, TRACK_X1]) {
    out.push(S(k.slabOf({ x, y: -17, w: 5, d: 34, r: 1.2 }, 0, 10, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2, -14, 10]), at([x + 2, 14, 10])], { size: 0.45 }));
  }
  // Ветка на петлю: две наклонные рельсовые нити и переводная колодка.
  const dir = [LIFT_X[0] - 66, LOOP_Y - 0];
  const len = Math.hypot(dir[0], dir[1]);
  const nx = (-dir[1] / len) * 7;
  const ny = (dir[0] / len) * 7;
  for (const sign of [1, -1]) {
    const from = [66 + nx * sign, ny * sign];
    const to = [LIFT_X[0] + nx * sign, LOOP_Y + ny * sign];
    out.push(S(bandOf(from, to, 3.4, RAIL_Z0, 2.2, 0.4), { tone: "mid" }));
    out.push(S(bandOf(from, to, 2.4, RAIL_Z0 + 2.2, 1.8, 0.35), { tone: "hi", crease: "lo" }));
  }
  out.push(S(bandOf([60, 0], [LIFT_X[0], LOOP_Y], 26, 0, 1.1, 0.5), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf({ x: 56, y: -4, w: 10, d: 12, r: 1.6 }, RAIL_Z0, 3.2, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(BLADE_PIVOT[0], BLADE_PIVOT[1], 2.4, RAIL_Z0 + 3.2, 1.6, P, 18), { tone: "hi" }));
  out.push(L(k.ring(BLADE_PIVOT[0], BLADE_PIVOT[1], 2.4, RAIL_Z0 + 4.8, P, 18), { tone: "lo" }));
  out.push(D([at([BLADE_PIVOT[0], BLADE_PIVOT[1], RAIL_Z0 + 4.8])], { size: 0.46 }));

  // Обратная ветка: от петли к прямому рельсу у станции проекта.
  const back = [-46 - -52, 0 - -32];
  const blen = Math.hypot(back[0], back[1]);
  const bnx = (-back[1] / blen) * 7;
  const bny = (back[0] / blen) * 7;
  for (const sign of [1, -1]) {
    const from = [-52 + bnx * sign, -32 + bny * sign];
    const to = [-46 + bnx * sign, 0 + bny * sign];
    out.push(S(bandOf(from, to, 3.4, RAIL_Z0, 2.2, 0.4), { tone: "mid" }));
    out.push(S(bandOf(from, to, 2.4, RAIL_Z0 + 2.2, 1.8, 0.35), { tone: "hi", crease: "lo" }));
  }
  out.push(S(bandOf([-52, -32], [-46, 0], 26, 0, 1.1, 0.5), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf({ x: -52, y: -6, w: 10, d: 12, r: 1.6 }, RAIL_Z0, 3.2, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(-50, 0, 2.4, RAIL_Z0 + 3.2, 1.6, P, 18), { tone: "hi" }));
  out.push(D([at([-50, 0, RAIL_Z0 + 4.8])], { size: 0.44 }));
  return out.join("");
}

// ===== Возвратная петля и её опоры =====

function loop() {
  const out = [];
  // Опоры позвоночной балки.
  for (const x of [-16, 44]) {
    out.push(S(k.slabOf({ x: x - 6, y: -58, w: 12, d: 12, r: 2 }, 0, 2.2, P, 4, 0.5), { tone: "lo" }));
    out.push(S(k.slabOf({ x: x - 2.4, y: -54.4, w: 4.8, d: 4.8, r: 1.1 }, 2.2, 41.2, P, 4, 0.7), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 2.2, y: -50, w: 4.4, d: 17.6, r: 1.1 }, 40.4, 3, P, 4, 0.6), { tone: "mid" }));
    out.push(L(seg3([x, -54.4, 20], [x, -35, 40.4]), { tone: "lo" }));
    out.push(D([at([x, -54.4, 20]), at([x, -35, 40.4])], { size: 0.4 }));
    out.push(D([at([x + 1.6, -56, 2.2]), at([x - 1.6, -56, 2.2]), at([x + 1.6, -52, 43.4])], { size: 0.4 }));
  }
  const spine = { x: LOOP_X0 - 3, y: LOOP_Y - 2.2, w: LOOP_END + 3 - (LOOP_X0 - 3), d: 4.4, r: 1.4 };
  out.push(S(k.slabOf(spine, 43.4, 2.8, P, 4, 0.7), { tone: "mid" }));
  out.push(L(k.sideSeam(k.insetPlan(spine, 1.2), 44.6, P, 4), { tone: "faint" }));
  out.push(
    S(k.slabOf({ x: LOOP_X0 - 3, y: LOOP_Y - 1.4, w: LOOP_END + 3 - (LOOP_X0 - 3), d: 2.8, r: 0.8 }, 46.2, 0.6, P, 3), {
      tone: "lo",
      crease: "none",
    }),
  );
  // Поперечные связи.
  for (let x = LOOP_X0 + 4; x <= LOOP_STUB; x += 13) {
    out.push(S(k.slabOf({ x, y: LOOP_Y - 9, w: 4.6, d: 18, r: 1 }, 46.2, 1.8, P, 3), { tone: "lo" }));
    out.push(D([at([x + 1.6, LOOP_Y - 7, 48]), at([x + 1.6, LOOP_Y + 7, 48])], { size: 0.4 }));
  }
  // Рельсовые нити петли с разрывами в клетях подъёма.
  const runs = [
    [LOOP_X0, LOOP_X0 + 4],
    [LOOP_X0 + 16, LOOP_RAIL_END],
    [LOOP_STUB, LOOP_END],
  ];
  for (const y of [LOOP_Y - RAIL_Y, LOOP_Y + RAIL_Y]) {
    for (const [x0, x1] of runs) {
      out.push(
        S(k.slabOf({ x: x0, y: y - 1.8, w: x1 - x0, d: 3.6, r: 1.2 }, LOOP_Z0, 2.2, P, 3, 0.4), { tone: "mid" }),
      );
      out.push(
        S(k.slabOf({ x: x0, y: y - 1.3, w: x1 - x0, d: 2.6, r: 0.9 }, LOOP_Z0 + 2.2, 1.8, P, 3, 0.35), {
          tone: "hi",
          crease: "lo",
        }),
      );
    }
  }
  // Упор в конце петли.
  out.push(S(k.slabOf({ x: LOOP_END, y: LOOP_Y - 9, w: 3.4, d: 18, r: 1 }, LOOP_Z0 - 1, 7, P, 3, 0.6), { tone: "mid" }));
  out.push(D([at([LOOP_END + 1.4, LOOP_Y - 6, LOOP_Z1 + 6]), at([LOOP_END + 1.4, LOOP_Y + 6, LOOP_Z1 + 6])], { size: 0.42 }));
  return out.join("");
}

function lift(x) {
  const out = [];
  out.push(S(k.slabOf({ x: x - 13, y: -47, w: 26, d: 33, r: 3 }, 0, 2, P, 5, 0.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan({ x: x - 13, y: -47, w: 26, d: 33, r: 3 }, 2.2), 2, P, 5), { tone: "faint" }));
  out.push(D([at([x - 10, -44, 2]), at([x + 10, -44, 2]), at([x + 10, -20, 2])], { size: 0.42 }));
  for (const y of [-47, -17]) {
    out.push(S(k.slabOf({ x: x - 2.2, y: y - 2.2, w: 4.4, d: 4.4, r: 1.1 }, 2, 56, P, 4, 0.6), { tone: "mid" }));
    out.push(L(k.sideSeam({ x: x - 2.2, y: y - 2.2, w: 4.4, d: 4.4, r: 1.1 }, 30, P, 4), { tone: "faint" }));
    for (const z of [8, 38]) {
      out.push(S(k.slabOf({ x: x - 3, y: y - 3, w: 6, d: 6, r: 1.4 }, z, 2.2, P, 4, 0.5), { tone: "lo" }));
      out.push(D([at([x + 1.8, y + 1.8, z + 1.1]), at([x - 1.8, y + 1.8, z + 1.1])], { size: 0.36 }));
    }
    out.push(S(k.slabOf({ x: x - 3, y: y - 3, w: 6, d: 6, r: 1.4 }, 58, 2.4, P, 4, 0.6), { tone: "mid" }));
    out.push(D([at([x, y, 60.4])], { size: 0.4 }));
  }
  // Зубчатая рейка на задней колонне.
  for (let z = 6; z < 50; z += 3.4) {
    out.push(S(k.slabOf({ x: x - 1.3, y: -44.6, w: 2.6, d: 1.4, r: 0.2 }, z, 1.2, P, 2), { tone: "lo", crease: "none" }));
  }
  // Кронштейны к позвоночной балке.
  out.push(S(k.slabOf({ x: x - 2.2, y: -47, w: 4.4, d: 17.4, r: 1 }, 44.2, 2, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 2.2, y: -32.4, w: 4.4, d: 12.4, r: 1 }, 44.2, 2, P, 4, 0.5), { tone: "mid" }));
  out.push(D([at([x + 1.2, -31.6, 46.2]), at([x - 1.2, -31.6, 46.2])], { size: 0.4 }));
  return out.join("");
}

// ===== Станции =====

function post(x, y) {
  const out = [];
  const pad = { x: x - 5.4, y: y - 5.4, w: 10.8, d: 10.8, r: 1.8 };
  out.push(S(k.slabOf(pad, 0, 2.2, P, 4, 0.5), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(pad, 2), 2.2, P, 4), { tone: "faint" }));
  out.push(S(k.slabOf({ x: x - 2.6, y: y - 2.6, w: 5.2, d: 5.2, r: 1 }, 2.2, POST_TOP - 2.2, P, 4, 0.7), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: x - 2.6, y: y - 2.6, w: 5.2, d: 5.2, r: 1 }, 20, P, 4), { tone: "faint" }));
  out.push(D([at([x + 2, y + 2, 2.4]), at([x - 2, y + 2, 2.4])], { size: 0.36 }));
  for (const z of [6, 33]) {
    out.push(S(k.slabOf({ x: x - 3.3, y: y - 3.3, w: 6.6, d: 6.6, r: 1.3 }, z, 2.2, P, 4, 0.5), { tone: "lo" }));
    out.push(D([at([x + 2.2, y + 2.2, z + 1.1]), at([x - 2.2, y + 2.2, z + 1.1])], { size: 0.34 }));
  }
  return out.join("");
}

function beamOf(sx) {
  const plan = { x: sx - 9, y: -16, w: 18, d: 32, r: 2 };
  const out = [];
  out.push(S(k.slabOf(plan, BEAM_Z0, BEAM_Z1 - BEAM_Z0, P, 6, 0.9), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.6), BEAM_Z1, P, 6), { tone: "faint" }));
  out.push(L(k.sideSeam(k.insetPlan(plan, 1.6), BEAM_Z0 + 2.2, P, 6), { tone: "faint" }));
  out.push(S(k.slabOf({ x: sx - 1.4, y: -13, w: 2.8, d: 26, r: 0.8 }, BEAM_Z0 - 2.2, 2.2, P, 3, 0.4), { tone: "mid" }));
  out.push(
    D(
      [
        at([sx - 6.8, -13.4, BEAM_Z1]),
        at([sx + 6.8, -13.4, BEAM_Z1]),
        at([sx + 6.8, 13.4, BEAM_Z1]),
        at([sx - 6.8, 13.4, BEAM_Z1]),
      ],
      { size: 0.42 },
    ),
  );
  // Прорезь на передней грани балки.
  out.push(S(k.slabOf({ x: sx - 3.8, y: 15.4, w: 7.6, d: 0.8, r: 0.4 }, BEAM_Z0 + 1.2, 1.6, P, 3), { tone: "lo", crease: "none" }));
  return out.join("");
}

function rod(x, y, z0, z1, r = 0.55) {
  return S(k.cylinder(x, y, r, z0, z1 - z0, P, 14), { tone: "mid" });
}

function tool(station) {
  const sx = station.x;
  const out = [];
  switch (station.key) {
    case "requirements": {
      out.push(rod(sx - 6, 6, 35.4, BEAM_Z0), rod(sx + 6, 6, 35.4, BEAM_Z0));
      const tray = { x: sx - 8.4, y: -7, w: 16.8, d: 15.6, r: 1.2 };
      out.push(S(k.slabOf(tray, 31.2, 1.2, P, 4, 0.4), { tone: "mid" }));
      out.push(S(k.slabOf({ x: tray.x, y: tray.y, w: tray.w, d: 1.4, r: 0.5 }, 32.4, 3, P, 3, 0.5), { tone: "mid" }));
      out.push(S(k.slabOf({ x: tray.x, y: tray.y + 1.4, w: 1.4, d: tray.d - 1.4, r: 0.5 }, 32.4, 2.2, P, 3, 0.4), { tone: "mid" }));
      out.push(S(k.slabOf({ x: tray.x + tray.w - 1.4, y: tray.y + 1.4, w: 1.4, d: tray.d - 1.4, r: 0.5 }, 32.4, 2.2, P, 3, 0.4), { tone: "mid" }));
      for (let i = 0; i < 3; i++) {
        out.push(
          S(k.slabOf({ x: tray.x + 2.6, y: tray.y + 3 + i * 0.5, w: 11.6, d: 10.2, r: 0.4 }, 32.5 + i * 0.6, 0.55, P, 2, 0.2), {
            tone: "hi",
            crease: "lo",
          }),
        );
      }
      out.push(L(k.lineOnTop([tray.x + 4, tray.y + 11], [tray.x + 13, tray.y + 11], 34.2, P), { tone: "faint", free: true }));
      out.push(D([at([sx - 6.6, tray.y + 1.8, 35.4]), at([sx + 6.6, tray.y + 1.8, 35.4])], { size: 0.36 }));
      out.push(S(k.slabOf({ x: sx - 4.4, y: tray.y + 1.4, w: 8.8, d: 2.2, r: 0.7 }, 35.2, 1.1, P, 3), { tone: "lo" }));
      out.push(S(k.slabOf({ x: tray.x, y: tray.y + tray.d - 1.4, w: tray.w, d: 1.4, r: 0.5 }, 32.4, 1.4, P, 3, 0.4), { tone: "mid" }));
      break;
    }
    case "design": {
      const board = { x: sx - 1.1, y: -10, w: 2.2, d: 20, r: 0.7 };
      out.push(S(k.slabOf(board, 28.5, 11.5, P, 3, 0.5), { tone: "hi", crease: "mid" }));
      out.push(L(k.planOutline(k.insetPlan(board, 0.5), 40, P, 3), { tone: "lo" }));
      out.push(S(k.slabOf({ x: sx - 1.6, y: -3.4, w: 3.2, d: 6.8, r: 0.6 }, 38.6, 1.4, P, 3, 0.4), { tone: "mid" }));
      const f = sx + 1.14;
      out.push(
        L(
          [
            seg3([f, -8.4, 30.4], [f, 8.4, 30.4]),
            seg3([f, -8.4, 38.2], [f, 8.4, 38.2]),
            seg3([f, -8.4, 30.4], [f, -8.4, 38.2]),
            seg3([f, 8.4, 30.4], [f, 8.4, 38.2]),
            seg3([f, 0.4, 30.4], [f, 0.4, 38.2]),
            seg3([f, -8.4, 35.4], [f, 8.4, 35.4]),
            seg3([f, -5, 30.4], [f, -5, 35.4]),
            seg3([f, 5.2, 35.4], [f, 5.2, 38.2]),
          ].join(""),
          { tone: "lo", free: true },
        ),
      );
      out.push(L(k.ring(sx, 4.4, 2.1, 40.02, P, 20), { tone: "lo" }));
      out.push(D([at([f, -8.4, 38.2]), at([f, 8.4, 30.4])], { size: 0.32, tone: "lo" }));
      break;
    }
    case "assembly": {
      out.push(S(k.cylinder(sx, 0, 3.2, 33.4, BEAM_Z0 - 33.4, P, 26, 0.6), { tone: "hi" }));
      out.push(S(k.cylinder(sx, 0, 4.2, 31.2, 2.2, P, 30, 0.8), { tone: "hi" }));
      out.push(L(k.knurl(sx, 0, 4.2, 31.2, 33.4, 26, P, 0.5), { tone: "lo" }));
      out.push(L(k.ring(sx, 0, 4.2, 31.2, P, 30), { tone: "mid" }));
      out.push(S(k.cylinder(sx, 0, 1.4, 29.2, 2, P, 18), { tone: "mid" }));
      out.push(S(k.cylinder(sx, 0, 2, 28, 1.2, P, 18), { tone: "hi" }));
      out.push(S(k.cylinder(sx, 0, 0.7, 27.2, 0.8, P, 12), { tone: "hi" }));
      for (let z = 34.2; z < 37.6; z += 0.9) out.push(L(k.ring(sx, 0, 3.2, z, P, 22), { tone: "lo" }));
      out.push(D([at([sx, 0, BEAM_Z0]), at([sx + 3.2, 0, 34])], { size: 0.38 }));
      break;
    }
    case "check": {
      const F = G.frameAlong([sx, -3.2, 34.8], [0, 1, 0]);
      out.push(S(G.disc(0, 2.6, 5.0, F, P), { tone: "hi" }));
      out.push(S(G.ringBand(2.6, 3.2, 4.3, 5.7, F, P), { tone: "mid" }));
      out.push(L(G.circleOf(F, 3.22, 4.3, P), { tone: "lo" }));
      out.push(L(G.circleOf(F, 3.22, 1, P), { tone: "lo" }));
      const face = (r, deg) => {
        const a = (deg * Math.PI) / 180;
        return [
          F.o[0] + F.a[0] * 3.22 + F.u[0] * r * Math.cos(a) + F.v[0] * r * Math.sin(a),
          F.o[1] + F.a[1] * 3.22 + F.u[1] * r * Math.cos(a) + F.v[1] * r * Math.sin(a),
          F.o[2] + F.a[2] * 3.22 + F.u[2] * r * Math.cos(a) + F.v[2] * r * Math.sin(a),
        ];
      };
      const ticks = [];
      const majors = [];
      for (let i = 0; i < 12; i++) {
        const a = -120 + i * 24;
        (i % 3 === 0 ? majors : ticks).push(seg3(face(i % 3 === 0 ? 2.5 : 3.1, a), face(4.1, a)));
      }
      out.push(L(ticks.join(""), { tone: "lo" }), L(majors.join(""), { tone: "mid" }));
      out.push(L(seg3(face(0, -70), face(3.2, 40)), { tone: "hi", free: true }));
      out.push(D([at(face(0, 0))], { size: 0.46, tone: "hi" }));
      out.push(S(k.cylinder(sx, -1.4, 1.1, 29.4, 5.4, P, 18), { tone: "mid" }));
      out.push(S(k.cylinder(sx, -1.4, 0.6, 27.4, 2, P, 12), { tone: "hi" }));
      out.push(S(k.slabOf({ x: sx - 6.4, y: -8.6, w: 12.8, d: 4.6, r: 1 }, 38.4, 1.6, P, 3), { tone: "mid" }));
      out.push(rod(sx - 5, -7.4, 38.4, BEAM_Z0), rod(sx + 5, -7.4, 38.4, BEAM_Z0));
      out.push(D([at([sx - 5.6, -6.8, 40]), at([sx + 5.6, -6.8, 40])], { size: 0.34 }));
      break;
    }
    default: {
      out.push(rod(sx - 4.4, 5, 39.4, BEAM_Z0), rod(sx + 4.4, 5, 39.4, BEAM_Z0));
      out.push(S(k.slabOf({ x: sx - 5.4, y: -5.4, w: 10.8, d: 10.8, r: 1.5 }, 32.6, 3.8, P, 4, 0.7), { tone: "hi" }));
      out.push(S(k.cylinder(sx, 0, 3, 36.4, 3, P, 24, 0.7), { tone: "mid" }));
      out.push(L(k.knurl(sx, 0, 3, 36.4, 39.4, 22, P, 0.5), { tone: "lo" }));
      out.push(L(k.ring(sx, 0, 3, 39.4, P, 24), { tone: "hi" }));
      out.push(S(k.slabOf({ x: sx - 4.2, y: -4.2, w: 8.4, d: 8.4, r: 1.1 }, 30.6, 2, P, 3, 0.5), { tone: "lo" }));
      out.push(S(k.slabOf({ x: sx - 3.4, y: -3.4, w: 6.8, d: 6.8, r: 0.9 }, 29, 1.6, P, 3, 0.4), { tone: "mid" }));
      out.push(L(k.ring(sx, 0, 1.5, 29, P, 16), { tone: "lo" }));
      out.push(D([at([sx - 3.8, 3.8, 32.6]), at([sx + 3.8, 3.8, 32.6]), at([sx, 0, 39.4])], { size: 0.38 }));
      break;
    }
  }
  return out.join("");
}

function stationBack(station, index) {
  return [post(station.x, -POST_Y), `<g data-tool="${index}">${tool(station)}</g>`].join("");
}

function stationFront(station) {
  const sx = station.x;
  return [
    post(sx, POST_Y),
    S(k.slabOf({ x: sx - 1.3, y: 14.6, w: 2.6, d: 0.8, r: 0.3 }, 26, 6, P, 2), { tone: "lo", crease: "none" }),
    D([at([sx - 2.2, POST_Y + 3, 32]), at([sx + 2.2, POST_Y + 3, 32])], { size: 0.32 }),
  ].join("");
}

// Верстак за рельсом и его оснастка.
function bench(x) {
  const out = [];
  const plan = { x: x - 8, y: -22, w: 16, d: 5.6, r: 1.2 };
  out.push(S(k.slabOf(plan, 0, 5.6, P, 4, 0.7), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 1.4), 5.6, P, 4), { tone: "faint" }));
  out.push(D([at([x - 6.2, -20.6, 5.6]), at([x + 6.2, -20.6, 5.6])], { size: 0.38 }));
  return out.join("");
}

function benchProps(station) {
  const x = station.x;
  const out = [];
  if (station.key === "requirements") {
    for (let i = 0; i < 3; i++) {
      out.push(
        S(k.slabOf({ x: x - 6 + i * 4.2, y: -21, w: 3.4, d: 2.4, r: 0.4 }, 5.6, 9 - i * 1.2, P, 2, 0.3), {
          tone: "hi",
          crease: "lo",
        }),
      );
    }
    out.push(D([at([x + 5.4, -19.8, 5.6])], { size: 0.34 }));
  } else if (station.key === "design") {
    out.push(S(k.cylinder(x + 4.4, -19.8, 1.6, 5.6, 10.4, P, 20, 0.5), { tone: "hi" }));
    out.push(L(k.ring(x + 4.4, -19.8, 1.6, 16, P, 20), { tone: "lo" }));
    out.push(L(k.ring(x + 4.4, -19.8, 1.8, 8.4, P, 20), { tone: "lo" }));
    out.push(S(k.cylinder(x - 4.2, -20, 1, 5.6, 3.2, P, 16), { tone: "mid" }));
  } else if (station.key === "assembly") {
    out.push(S(k.slabOf({ x: x - 7, y: -21, w: 14, d: 4.2, r: 0.8 }, 5.6, 4, P, 3, 0.5), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 6.2, y: -20.6, w: 3, d: 3.6, r: 0.5 }, 9.6, 5.4, P, 2, 0.4), { tone: "hi" }));
    out.push(S(k.slabOf({ x: x + 1.8, y: -20.6, w: 2.4, d: 3.6, r: 0.5 }, 9.6, 4.2, P, 2, 0.4), { tone: "hi" }));
    out.push(L(k.lineOnTop([x - 6, -19], [x + 1.6, -19], 9.8, P), { tone: "lo" }));
    out.push(S(k.cylinder(x + 6, -19, 1.6, 7.2, 0.8, P, 16), { tone: "lo" }));
    out.push(S(k.cylinder(x + 6, -19, 0.6, 8, 1.4, P, 10), { tone: "mid" }));
    out.push(L(seg3([x + 3.8, -19, 8.4], [x + 6.6, -19, 9.6]), { tone: "lo" }));
    out.push(D([at([x + 6.8, -19, 9.7])], { size: 0.34 }));
  } else if (station.key === "check") {
    for (let i = 0; i < 3; i++) {
      out.push(S(k.slabOf({ x: x - 6 + i * 4.6, y: -20.6, w: 3, d: 3, r: 0.3 }, 5.6, 2.2 + i * 0.6, P, 2, 0.3), { tone: "hi" }));
    }
    out.push(S(k.slabOf({ x: x - 6.4, y: -21.2, w: 13.2, d: 4, r: 0.6 }, 5.6, 1.2, P, 3, 0.4), { tone: "mid" }));
  } else {
    out.push(S(k.slabOf({ x: x - 5.6, y: -21.2, w: 9, d: 4, r: 0.6 }, 5.6, 1.4, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 5.2, y: -20.8, w: 8.2, d: 3.2, r: 0.4 }, 7, 0.6, P, 2, 0.2), { tone: "lo", crease: "none" }));
    out.push(S(k.cylinder(x + 5.4, -19.4, 1.4, 5.6, 3.4, P, 16), { tone: "mid" }));
    out.push(L(k.ring(x + 5.4, -19.4, 1.4, 9, P, 16), { tone: "lo" }));
  }
  return out.join("");
}

// ===== Передняя оснастка станины =====

function crate(plan, height, dividers) {
  const out = [];
  out.push(S(k.slabOf(plan, 0, 1.8, P, 4, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf({ x: plan.x, y: plan.y, w: plan.w, d: 1.8, r: 0.5 }, 1.8, height, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: plan.x, y: plan.y + plan.d - 1.8, w: plan.w, d: 1.8, r: 0.5 }, 1.8, height * 0.8, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: plan.x, y: plan.y + 1.8, w: 1.8, d: plan.d - 3.6, r: 0.5 }, 1.8, height, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: plan.x + plan.w - 1.8, y: plan.y + 1.8, w: 1.8, d: plan.d - 3.6, r: 0.5 }, 1.8, height, P, 3, 0.5), { tone: "mid" }));
  for (let i = 1; i < dividers; i++) {
    const step = (plan.w - 3.6) / dividers;
    out.push(S(k.slabOf({ x: plan.x + 1.8 + step * i, y: plan.y + 2.4, w: 0.7, d: plan.d - 4.8, r: 0.2 }, 1.8, height * 0.7, P, 2), { tone: "lo", crease: "none" }));
  }
  out.push(L(k.planOutline(k.insetPlan(plan, 1.2), height, P, 4), { tone: "faint" }));
  out.push(D([at([plan.x + 2.4, plan.y + 2.4, height]), at([plan.x + plan.w - 2.4, plan.y + 2.4, height])], { size: 0.36 }));
  return out.join("");
}

function frontProps() {
  const out = [];
  // Ящик с мелочью у левого края.
  out.push(crate({ x: -146, y: 26, w: 18, d: 13, r: 1.2 }, 9, 2));
  out.push(S(k.slabOf({ x: -143, y: 29, w: 4.4, d: 3.4, r: 0.4 }, 3.4, 2.4, P, 2, 0.3), { tone: "hi" }));
  out.push(S(k.slabOf({ x: -137, y: 31, w: 3.4, d: 2.6, r: 0.4 }, 3.4, 1.8, P, 2, 0.3), { tone: "hi" }));
  // Лоток с крепежом у счётчиков.
  out.push(crate({ x: 56, y: 30, w: 20, d: 12, r: 1.4 }, 7.4, 3));
  out.push(S(k.cylinder(62, 36, 1.1, 2.2, 1.6, P, 14), { tone: "hi" }));
  out.push(S(k.cylinder(68, 36, 1.1, 2.2, 1.6, P, 14), { tone: "hi" }));
  // Маслёнка.
  out.push(S(k.cylinder(84, 35, 3, 0, 1.2, P, 22), { tone: "lo" }));
  out.push(S(k.cylinder(84, 35, 2.4, 1.2, 6.4, P, 22, 0.6), { tone: "mid" }));
  out.push(L(k.ring(84, 35, 2.4, 5, P, 22), { tone: "faint" }));
  out.push(S(k.cylinder(84, 35, 1, 7.6, 1.6, P, 14), { tone: "mid" }));
  out.push(L(seg3([84, 35, 8], [88.6, 31.6, 10.2]), { tone: "lo" }));
  out.push(D([at([88.6, 31.6, 10.2])], { size: 0.42 }));
  // Тележка с оснасткой у правого края.
  out.push(S(k.slabOf({ x: 120, y: 32, w: 26, d: 14, r: 1.6 }, 0, 13, P, 4, 0.8), { tone: "mid" }));
  for (const z of [3.6, 8.4]) {
    out.push(S(k.slabOf({ x: 121, y: 33, w: 24, d: 1.2, r: 0.4 }, z, 1.4, P, 2), { tone: "lo", crease: "none" }));
    out.push(D([at([126, 32.6, z + 0.7]), at([140, 32.6, z + 0.7])], { size: 0.34 }));
  }
  for (const [x, y] of [[123, 35], [143, 35], [123, 43], [143, 43]]) {
    out.push(S(k.cylinder(x, y, 1.4, 0, 1.6, P, 14), { tone: "lo" }));
  }
  out.push(S(k.slabOf({ x: 122, y: 34, w: 22, d: 10, r: 1.2 }, 13, 1.2, P, 3, 0.4), { tone: "hi" }));
  return out.join("");
}

// ===== Переводная стрелка и рычаг режима =====

const LEVER_ANGLES = Array.from({ length: 7 }, (_, i) =>
  MODES.cascade.lever + ((MODES.iterative.lever - MODES.cascade.lever) * i) / 6,
);
const BLADE_ANGLES = Array.from({ length: 7 }, (_, i) =>
  MODES.cascade.blade + ((MODES.iterative.blade - MODES.cascade.blade) * i) / 6,
);

function bladeAt(deg) {
  const a = (deg * Math.PI) / 180;
  const rot = (x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const p0 = rot(0, BLADE_OFFSET);
  const p1 = rot(BLADE_LEN, BLADE_OFFSET);
  const from = [BLADE_PIVOT[0] + p0[0], BLADE_PIVOT[1] + p0[1]];
  const to = [BLADE_PIVOT[0] + p1[0], BLADE_PIVOT[1] + p1[1]];
  const out = [];
  out.push(S(bandOf(from, to, 2.8, RAIL_Z0 + 2.4, 2.2, 0.4), { tone: "hi" }));
  out.push(D([at([to[0], to[1], RAIL_Z0 + 4.6])], { size: 0.42 }));
  return out.join("");
}

function bladePoses() {
  return BLADE_ANGLES.map(
    (angle, i) => `<g data-blade-pose="${i}" style="opacity:${i === 0 ? 1 : 0}">${bladeAt(angle)}</g>`,
  ).join("");
}

function leverAt(deg) {
  const a = (deg * Math.PI) / 180;
  const tip = [LEVER[0] + Math.cos(a) * 22, LEVER[1] + Math.sin(a) * 22];
  const out = [];
  out.push(S(bandOf(LEVER, [LEVER[0] + Math.cos(a) * 18, LEVER[1] + Math.sin(a) * 18], 5.4, 15.4, 3, 0.6), { tone: "hi" }));
  out.push(S(k.cylinder(LEVER[0], LEVER[1], 4, 14.6, 3.4, P, 22, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(tip[0], tip[1], 4.4, 18.4, 2.2, P, 24, 0.7), { tone: "hi" }));
  out.push(S(k.cylinder(tip[0], tip[1], 3.2, 20.6, 5, P, 22, 0.6), { tone: "hi" }));
  out.push(L(k.ring(tip[0], tip[1], 3.2, 25.6, P, 22), { tone: "lo" }));
  out.push(L(k.knurl(tip[0], tip[1], 3.2, 20.6, 25, 18, P, 0.4), { tone: "lo" }));
  out.push(D([at([tip[0], tip[1], 25.8])], { size: 0.5 }));
  return out.join("");
}

function leverPoses() {
  return LEVER_ANGLES.map(
    (angle, i) => `<g data-lever-pose="${i}" style="opacity:${i === 0 ? 1 : 0}">${leverAt(angle)}</g>`,
  ).join("");
}

function leverStand() {
  const out = [];
  out.push(S(k.slabOf({ x: 93, y: 35, w: 14, d: 14, r: 2 }, 0, 1.6, P, 4, 0.5), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan({ x: 93, y: 35, w: 14, d: 14, r: 2 }, 2), 1.6, P, 4), { tone: "faint" }));
  out.push(D([at([97, 38, 1.6]), at([103, 38, 1.6]), at([97, 46, 1.6]), at([103, 46, 1.6])], { size: 0.4 }));
  out.push(S(k.slabOf({ x: 96.4, y: 38.4, w: 7.2, d: 7.2, r: 1.4 }, 1.6, 12.4, P, 4, 0.7), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: 96.4, y: 38.4, w: 7.2, d: 7.2, r: 1.4 }, 1.6), 14, P, 4), { tone: "faint" }));
  out.push(S(k.cylinder(LEVER[0], LEVER[1], 3.6, 14, 0.8, P, 22), { tone: "lo" }));
  // Сектор с прорезями двух положений.
  out.push(
    S(k.extrude(arcOfPlan(LEVER[0], LEVER[1], 10.6, 14.6, 198, 258, 16), 1.6, 0.9, P, { convex: true, bevel: 0.4 }), {
      tone: "lo",
      crease: "none",
    }),
  );
  for (const deg of [MODES.cascade.lever, MODES.iterative.lever]) {
    const a = (deg * Math.PI) / 180;
    const px = LEVER[0] + Math.cos(a) * 12.6;
    const py = LEVER[1] + Math.sin(a) * 12.6;
    out.push(S(k.slabOf({ x: px - 1.2, y: py - 1.2, w: 2.4, d: 2.4, r: 0.4 }, 1.6, 1.8, P, 2, 0.3), { tone: "mid" }));
    out.push(D([at([px, py, 3.4])], { size: 0.32 }));
  }
  return out.join("");
}

function linkRod() {
  const out = [];
  out.push(L(seg3([97, 36, 2.6], [68, 9, 2.6]), { tone: "mid" }));
  for (const [x, y] of [[88, 28], [77, 17]]) {
    out.push(L(k.ring(x, y, 1.7, 2.6, P, 14), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 1.5, 1.2, 1.4, P, 12), { tone: "lo" }));
  }
  out.push(D([at([97, 36, 2.6]), at([68, 9, 2.6])], { size: 0.44 }));
  return out.join("");
}

// ===== Кассета, лоток выпуска, счётчики, табличка =====

function cassette() {
  const out = [];
  const plan = CASSETTE;
  out.push(S(k.slabOf(plan, 0, 2.4, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 1.6), 2.4, P, 4), { tone: "faint" }));
  out.push(S(k.slabOf({ x: plan.x, y: plan.y, w: plan.w, d: 2.4, r: 0.6 }, 2.4, 9, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: plan.x, y: plan.y + 2.4, w: 2.2, d: plan.d - 2.4, r: 0.6 }, 2.4, 6.4, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: plan.x + plan.w - 2.2, y: plan.y + 2.4, w: 2.2, d: plan.d - 2.4, r: 0.6 }, 2.4, 6.4, P, 3, 0.5), { tone: "mid" }));
  for (let i = 0; i < 3; i++) {
    out.push(
      S(k.slabOf({ x: plan.x + 4, y: plan.y + 4, w: plan.w - 8, d: plan.d - 8, r: 0.5 }, 2.6 + i * 2.1, 1.4, P, 2, 0.3), {
        tone: "hi",
        crease: "lo",
      }),
    );
  }
  out.push(S(k.slabOf({ x: plan.x + plan.w - 6, y: plan.y + 4, w: 2, d: plan.d - 8, r: 0.4 }, 2.4, 7.6, P, 2, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: plan.x, y: plan.y + plan.d - 2.4, w: plan.w, d: 2.4, r: 0.6 }, 2.4, 3.6, P, 3, 0.5), { tone: "mid" }));
  out.push(L(seg3([plan.x + 3, plan.y + plan.d - 1.2, 4], [plan.x + plan.w - 3, plan.y + plan.d - 1.2, 4]), { tone: "lo" }));
  out.push(D([at([plan.x + 2.4, plan.y + 2.4, 11.4]), at([plan.x + plan.w - 2.4, plan.y + 2.4, 11.4])], { size: 0.42 }));
  return out.join("");
}

function outputTray() {
  const out = [];
  const plan = TRAY;
  out.push(S(k.slabOf(plan, 0, 4.4, P, 4, 0.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2), 4.4, P, 4), { tone: "faint" }));
  out.push(S(k.slabOf({ x: plan.x, y: plan.y, w: plan.w, d: 3, r: 0.8 }, 4.4, 6, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: plan.x, y: plan.y + 3, w: 2.6, d: plan.d - 3, r: 0.7 }, 4.4, 4.6, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: plan.x + plan.w - 2.6, y: plan.y + 3, w: 2.6, d: plan.d - 3, r: 0.7 }, 4.4, 4.6, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: plan.x + 5, y: plan.y + 9, w: plan.w - 10, d: plan.d - 14, r: 0.6 }, 4.4, 0.5, P, 2, 0.2), { tone: "lo", crease: "none" }));
  out.push(
    `<g data-output style="opacity:0">${[
      S(k.slabOf({ x: plan.x + 7, y: plan.y + 12, w: plan.w - 14, d: plan.d - 20, r: 0.5 }, 5.6, 1.2, P, 2, 0.3), { tone: "hi", crease: "lo" }),
      L(k.planOutline({ x: plan.x + 7, y: plan.y + 12, w: plan.w - 14, d: plan.d - 20, r: 0.5 }, 6.8, P, 2), { tone: "lo" }),
      S(k.slabOf({ x: plan.x + 9, y: plan.y + 15, w: 8, d: 2.4, r: 0.3 }, 6.8, 0.9, P, 2, 0.2), { tone: "hi" }),
    ].join("")}</g>`,
  );
  out.push(S(k.slabOf({ x: plan.x, y: plan.y + plan.d - 3, w: plan.w, d: 3, r: 0.8 }, 4.4, 2.2, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([plan.x + 4, plan.y + 2, 10.4]), at([plan.x + plan.w - 4, plan.y + 2, 10.4])], { size: 0.4 }));
  return out.join("");
}

function drumMarks(cx, deg) {
  const out = [];
  for (let m = 0; m < 3; m++) {
    const a = ((deg + m * 120) * Math.PI) / 180;
    out.push(
      k.lineOnTop(
        [cx + Math.cos(a) * 3, COUNTER_Y + Math.sin(a) * 3],
        [cx + Math.cos(a) * 4.6, COUNTER_Y + Math.sin(a) * 4.6],
        COUNTER_TOP + 0.22,
        P,
      ),
    );
  }
  return out.join("");
}

function consoleBlock() {
  const out = [];
  const plan = CONSOLE;
  out.push(S(k.slabOf(plan, 0, 15, P, 5, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.4), 15, P, 5), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 1.4), 3.4, P, 5), { tone: "faint" }));
  out.push(D([at([plan.x + 4, plan.y + plan.d - 3, 15]), at([plan.x + plan.w - 4, plan.y + plan.d - 3, 15])], { size: 0.42 }));
  const faceY = plan.y + plan.d;
  for (let i = 0; i < 2; i++) {
    const cx = COUNTER_X[i];
    out.push(S(k.slabOf({ x: cx - 6.4, y: faceY - 0.9, w: 12.8, d: 0.9, r: 0.4 }, 4.6, 8.4, P, 3, 0.2), { tone: "lo", crease: "none" }));
    out.push(
      `<g data-count="${i}">${k.faceTextSvg(k.sideMatrix([cx, faceY + 0.1], 7, P, "left"), String([1, 0][i]), {
        size: 5.6,
        tone: "hi",
        anchor: "middle",
      })}</g>`,
    );
    out.push(
      L(
        [3.2, 4.4, 5.6]
          .map((offset) => k.segment([cx - 9.8, faceY, offset + 5], [cx - 7.8, faceY, offset + 5], P))
          .join(""),
        { tone: "faint", free: true },
      ),
    );
    out.push(S(k.cylinder(cx, COUNTER_Y, 6.6, 15, 1.5, P, 28), { tone: "mid" }));
    out.push(S(k.cylinder(cx, COUNTER_Y, 2.2, 16.5, 2.4, P, 20), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(cx, COUNTER_Y, 5.6, 18.9, 10.4, P, 36, 0.4), { tone: "mid", crease: "lo" }));
    out.push(L(k.ring(cx, COUNTER_Y, 6.6, 16.5, P, 28), { tone: "lo" }));
    out.push(L(k.ring(cx, COUNTER_Y, 5.6, COUNTER_TOP, P, 36), { tone: "hi" }));
    out.push(S(k.cylinder(cx, COUNTER_Y, 1.1, COUNTER_TOP, 1.4, P, 14), { tone: "lo" }));
    out.push(`<g data-drum="${i}">${drumMarks(cx, 0)}</g>`);
  }
  return out.join("");
}

function plaque() {
  const out = [];
  out.push(S(k.slabOf(PLAQUE, 1.1, 1.2, P, 3, 0.4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(PLAQUE, 1.2), 2.3, P, 3), { tone: "faint" }));
  for (const y of NEEDLE_ROWS) {
    out.push(L(k.lineOnTop([PLAQUE.x + 1.2, y], [PLAQUE.x + PLAQUE.w - 1.2, y], 2.34, P), { tone: "mid" }));
    for (let i = 0; i < 5; i++) {
      out.push(L(k.lineOnTop([PLAQUE.x + 5 + i * 2.2, y - 1.3], [PLAQUE.x + 5 + i * 2.2, y - 0.6], 2.32, P), { tone: "faint" }));
    }
  }
  out.push(S(k.cylinder(NEEDLE[0], NEEDLE[1], 1.2, 2.3, 1.4, P, 14), { tone: "mid" }));
  out.push(
    `<path class="iso-line" data-tone="hi" data-needle d="${k.segment([NEEDLE[0], NEEDLE[1], 3.7], [NEEDLE[0] + 11, NEEDLE_ROWS[0], 3.7], P)}"/>`,
  );
  out.push(D([at([NEEDLE[0], NEEDLE[1], 3.7]), at([NEEDLE[0] + 11, NEEDLE_ROWS[0], 3.7])], { size: 0.42 }));
  return out.join("");
}

// ===== Тележка с изделием =====

function wheel(x, y) {
  const F = G.frameAlong([x, y, 2.5], [0, 1, 0]);
  return [
    S(G.disc(-1.3, 1.3, 2.5, F, P), { tone: "lo" }),
    S(G.disc(1.3, 1.7, 1, F, P), { tone: "mid" }),
    L(G.circleOf(F, 1.72, 1.9, P), { tone: "lo" }),
    L(G.circleOf(F, 1.72, 2.35, P), { tone: "mid" }),
    D([at([x, y + 1.75, 2.5])], { size: 0.36 }),
  ].join("");
}

function cart() {
  const out = [];
  for (const [x, y] of [[-8.5, -7], [8.5, -7], [-8.5, 7], [8.5, 7]]) {
    out.push(wheel(x, y));
  }
  const frame = { x: -9, y: -4.8, w: 18, d: 9.6, r: 1.5 };
  out.push(S(k.slabOf(frame, 4.6, 1.6, P, 4, 0.5), { tone: "mid" }));
  for (const [x, y] of k.corners(frame, 1.6)) {
    out.push(S(k.cylinder(x, y, 0.9, 6.2, 1.1, P, 12), { tone: "lo" }));
  }
  out.push(S(k.slabOf({ x: -8.4, y: -4.2, w: 16.8, d: 8.4, r: 1.3 }, 6.2, 2, P, 4, 0.5), { tone: "hi" }));
  out.push(L(k.planOutline(k.insetPlan({ x: -8.4, y: -4.2, w: 16.8, d: 8.4, r: 1.3 }, 1), DECK_Z, P, 4), { tone: "faint" }));
  out.push(D([at([-6.6, 3, DECK_Z]), at([6.6, 3, DECK_Z])], { size: 0.34 }));
  // Ручка тележки.
  for (const x of [-6, 6]) {
    out.push(S(k.cylinder(x, 5.4, 0.55, DECK_Z, 7.4, P, 12), { tone: "mid" }));
    out.push(S(k.cylinder(x, 5.4, 1, DECK_Z + 7.4, 1, P, 12), { tone: "lo" }));
  }
  out.push(L(seg3([-6, 5.4, DECK_Z + 8.4], [6, 5.4, DECK_Z + 8.4]), { tone: "mid" }));
  out.push(D([at([-6, 5.4, DECK_Z + 8.4]), at([6, 5.4, DECK_Z + 8.4])], { size: 0.34 }));
  // Изделие: папка с чертежом на тележке.
  out.push(S(k.slabOf(CARD, DECK_Z + 0.6, CARD_TOP - DECK_Z - 0.6, P, 4, 0.9), { tone: "hi", className: "fig14-product", lit: true }));
  out.push(L(k.planOutline(k.insetPlan(CARD, 1.4), CARD_TOP + 0.6, P, 4), { tone: "lo" }));
  for (const z of [DECK_Z + 3.8, DECK_Z + 7.4]) {
    out.push(
      S(k.slabOf({ x: CARD.x - 0.3, y: CARD.y - 0.3, w: CARD.w + 0.6, d: CARD.d + 0.6, r: 1 }, z, 1.1, P, 4, 0.3), {
        tone: "mid",
        crease: "none",
      }),
    );
  }
  out.push(S(k.slabOf({ x: -4, y: CARD.y + CARD.d - 0.6, w: 8, d: 1.2, r: 0.4 }, DECK_Z + 5, 3.4, P, 2, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(seg3([-3, CARD.y + CARD.d, DECK_Z + 6], [3, CARD.y + CARD.d, DECK_Z + 6]), { tone: "faint", free: true }));
  out.push(L(seg3([-3, CARD.y + CARD.d, DECK_Z + 7.4], [3, CARD.y + CARD.d, DECK_Z + 7.4]), { tone: "faint", free: true }));
  out.push(S(k.slabOf({ x: -2.8, y: -0.9, w: 5.6, d: 1.8, r: 0.4 }, CARD_TOP + 0.6, 1.2, P, 2, 0.3), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 1.4, CARD_TOP + 0.7, P, 16), { tone: "lo" }));
  out.push(D([at([-4, CARD.y + CARD.d - 1, CARD_TOP + 0.6]), at([4, CARD.y + CARD.d - 1, CARD_TOP + 0.6])], { size: 0.32 }));
  return out.join("");
}

// ===== Сборка страницы =====

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Двухрежимный протяжный станок на станине. Слева кассета заготовок, справа лоток выпуска. По прямому рельсу с пятью порталами идёт тележка с изделием: требования, проект, сборка, проверка, выпуск. Над рельсом смонтирована возвратная петля с двумя клетями подъёма и переводной стрелкой, рядом рычаг режима, счётчики кругов и возвратов и табличка с двумя положениями.",
  body: [
    bed(),
    track(),
    loop(),
    ...LIFT_X.map((x) => lift(x)),
    ...STATIONS.map((station, index) => stationBack(station, index)),
    ...STATIONS.map((station) => bench(station.x) + benchProps(station)),
    cassette(),
    outputTray(),
    consoleBlock(),
    plaque(),
    leverStand(),
    linkRod(),
    frontProps(),
    bladePoses(),
    leverPoses(),
    `<g data-part="cart">${cart()}</g>`,
    ...STATIONS.map((station) => beamOf(station.x)),
    ...STATIONS.map((station) => stationFront(station)),
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const ROUTE = ${JSON.stringify(ROUTE)};
const STEP_POINT = ${JSON.stringify(STEP_POINT)};
const READOUTS = ${JSON.stringify(STEPS.map((step) => step.readout))};
const LABELS = ${JSON.stringify(STEPS.map((step) => step.label))};
const SHORTS = ${JSON.stringify(STEPS.map((step) => step.short))};
const ROUND_VALUES = ${JSON.stringify(ROUNDS)};
const RETURN_VALUES = ${JSON.stringify(RETURNS)};
const STATION_OF_STEP = [-1, 0, 1, 2, 3, 4, -1, 1];
const STATION_DROPS = [1.2, 0.8, 0.5, 0.9, 2.4];
const STATION_N = ${STATIONS.length};
const RAIL_TOP = ${RAIL_TOP};
const COUNTER_X = ${JSON.stringify(COUNTER_X)};
const COUNTER_Y = ${COUNTER_Y};
const COUNTER_TOP = ${COUNTER_TOP};
const NEEDLE = ${JSON.stringify(NEEDLE)};
const NEEDLE_ROWS = ${JSON.stringify(NEEDLE_ROWS)};
const N = STEP_POINT.length;
const RAD = Math.PI / 180;

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const cart = svg.querySelector('[data-part="cart"]');
const tools = Array.from(svg.querySelectorAll("[data-tool]"));
const leverPoses = Array.from(svg.querySelectorAll("[data-lever-pose]"));
const bladePoses = Array.from(svg.querySelectorAll("[data-blade-pose]"));
const countNodes = [0, 1].map((i) => svg.querySelector('[data-count="' + i + '"] text'));
const drumNodes = [0, 1].map((i) => svg.querySelector('[data-drum="' + i + '"]'));
const output = svg.querySelector("[data-output]");
const needle = svg.querySelector("[data-needle]");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const near = (a, b, slack) => Math.abs(a - b) < slack;
const ease = (cur, target, tau, dt) => {
  const next = cur + (target - cur) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 0.004 ? target : next;
};

const marks = [0];
for (let i = 1; i < ROUTE.length; i++) {
  const a = ROUTE[i - 1], b = ROUTE[i];
  marks.push(marks[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
}
const pointAt = (s) => {
  const at = clamp(s, 0, marks[marks.length - 1]);
  let i = 1;
  while (i < ROUTE.length - 1 && marks[i] < at) i++;
  const span = marks[i] - marks[i - 1] || 1;
  const t = clamp((at - marks[i - 1]) / span, 0, 1);
  const a = ROUTE[i - 1], b = ROUTE[i];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};
const drumTicks = (i, deg) => {
  let out = "";
  const cx = COUNTER_X[i];
  for (let m = 0; m < 3; m++) {
    const a = (deg + m * 120) * RAD;
    out += lineOnTop(
      [cx + Math.cos(a) * 3, COUNTER_Y + Math.sin(a) * 3],
      [cx + Math.cos(a) * 4.6, COUNTER_Y + Math.sin(a) * 4.6],
      COUNTER_TOP + 0.22,
      P,
    );
  }
  return out;
};

let step = 0;
let travel = marks[STEP_POINT[0]], travelTarget = travel;
let mode = 0, modeTarget = 0;
let drops = Array.from({ length: STATION_N }, () => 0);
let dropTargets = Array.from({ length: STATION_N }, () => 0);
let roundsShown = ROUND_VALUES[0], roundsTarget = roundsShown;
let returnsShown = RETURN_VALUES[0], returnsTarget = returnsShown;
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
const tourAt = (t) => Math.floor(t / 3.3) % N;

function targets() {
  travelTarget = marks[STEP_POINT[step]];
  modeTarget = step >= 6 ? 1 : 0;
  dropTargets = dropTargets.map(() => 0);
  const active = STATION_OF_STEP[step];
  if (active >= 0) dropTargets[active] = STATION_DROPS[active];
  roundsTarget = ROUND_VALUES[step];
  returnsTarget = RETURN_VALUES[step];
  output.style.opacity = step === 5 || step === 6 ? "1" : "0";
}

function setPoses() {
  const index = clamp(Math.round(mode * 6), 0, 6);
  leverPoses.forEach((node, i) => {
    const value = i === index ? "1" : "0";
    if (node.style.opacity !== value) node.style.opacity = value;
  });
  bladePoses.forEach((node, i) => {
    const value = i === index ? "1" : "0";
    if (node.style.opacity !== value) node.style.opacity = value;
  });
}

function draw() {
  const point = pointAt(travel);
  cart.setAttribute("transform", translateAlong(P, [point[0], point[1], RAIL_TOP + point[2]]));
  tools.forEach((node, i) => {
    node.setAttribute("transform", translateAlong(P, [0, 0, -drops[i]]));
  });
  setPoses();
  if (needle) {
    const row = NEEDLE_ROWS[0] + (NEEDLE_ROWS[1] - NEEDLE_ROWS[0]) * mode;
    needle.setAttribute("d", segment([NEEDLE[0], NEEDLE[1], 3.7], [NEEDLE[0] + 11, row, 3.7], P));
  }
  const rounds = Math.round(roundsShown);
  const returns = Math.round(returnsShown);
  if (countNodes[0] && countNodes[0].textContent !== String(rounds)) countNodes[0].textContent = String(rounds);
  if (countNodes[1] && countNodes[1].textContent !== String(returns)) countNodes[1].textContent = String(returns);
  drumNodes.forEach((node, i) => {
    const base = i === 0 ? ROUND_VALUES[0] : RETURN_VALUES[0];
    const shown = i === 0 ? roundsShown : returnsShown;
    const ticks = drumTicks(i, (shown - base) * 40);
    if (node.dataset.d !== ticks) {
      node.innerHTML = ticks;
      node.dataset.d = ticks;
    }
  });
  const busy = !near(travel, travelTarget, 0.6) || !near(mode, modeTarget, 0.01);
  const text = busy ? "идёт ход · " + SHORTS[step] : READOUTS[step];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(step));
  stage.setAttribute("aria-valuetext", "шаг " + (step + 1) + " из " + N + ": " + LABELS[step] + ", " + READOUTS[step]);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const want = tourAt(clock);
    if (want !== step) {
      step = want;
      targets();
    }
  }
  travel = calm ? travelTarget : ease(travel, travelTarget, 0.5, dt);
  mode = calm ? modeTarget : ease(mode, modeTarget, 0.28, dt);
  for (let i = 0; i < drops.length; i++) drops[i] = calm ? dropTargets[i] : ease(drops[i], dropTargets[i], 0.2, dt);
  roundsShown = calm ? roundsTarget : ease(roundsShown, roundsTarget, 0.3, dt);
  returnsShown = calm ? returnsTarget : ease(returnsShown, returnsTarget, 0.3, dt);
  draw();
  const quiet =
    !touring &&
    near(travel, travelTarget, 0.02) &&
    near(mode, modeTarget, 0.002) &&
    drops.every((value, i) => near(value, dropTargets[i], 0.01)) &&
    near(roundsShown, roundsTarget, 0.01) &&
    near(returnsShown, returnsTarget, 0.01);
  frame = visible && !quiet ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
const steer = (to) => {
  touring = false;
  step = clamp(to, 0, N - 1);
  targets();
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    touring = !still.matches;
    clock = 0;
    run();
  }, 3600);
  run();
};
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) {
  touring = false;
  still.addEventListener("change", (event) => {
    if (event.matches) touring = false;
  });
}
let touchFrom = null;
stage.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") touchFrom = event.clientX;
});
stage.addEventListener("pointerup", (event) => {
  if (touchFrom === null) return;
  const delta = event.clientX - touchFrom;
  touchFrom = null;
  if (Math.abs(delta) > 26) steer(step + (delta < 0 ? 1 : -1));
});
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.12) / 0.76, 0, 1);
  steer(Math.min(N - 1, Math.floor(share * N)));
});
stage.addEventListener("pointerleave", () => steer(step));
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
targets();
draw();
`;

const css = `<style>
.iso-stage{touch-action:pan-y;cursor:ew-resize}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
[data-lever-pose],[data-blade-pose]{transition:opacity .1s linear}
[data-output]{transition:opacity .3s ease}
.iso-solid[data-lit].fig14-product>.iso-top{fill:var(--anatomy-hi)}
.iso-plate-corner[data-corner="readout"]{bottom:16px}
@media (prefers-reduced-motion:reduce){
[data-lever-pose],[data-blade-pose],[data-output]{transition:none}
}
@media (max-width:560px){
.iso-plate{padding-bottom:88px}
.iso-plate-corner[data-corner="readout"]{font-size:9px;bottom:48px}
.iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px;right:0;white-space:normal;line-height:1.35}
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
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: переключение режимов и обход станций" aria-valuemin="0" aria-valuemax="${STEPS.length - 1}" aria-valuenow="0">${svg}</div>`,
  });

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}
