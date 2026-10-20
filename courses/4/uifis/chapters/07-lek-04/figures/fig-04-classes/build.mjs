// Figure fig-04-classes, built with the Anatomy skill.
//
// Contract with course-studio (kept):
//   1. Kit imported from the vendored copy: ../../../../../../_anatomy/kit/iso-kit.mjs
//   2. `node build.mjs` writes BOTH themes next to this file:
//        fig-04-classes.html        (dark)
//        fig-04-classes-light.html  (light)
//   3. `node build.mjs --audit` runs Anatomy's audit.
//   4. The card `fig` is "Fig 1".
//
// The object: a four-lane card sorter on a bench. One thin card sits in a
// cradle on a rail. Four read heads run on parallel lanes above the card. The
// cradle indexes the card under each head in turn; the head reads one trait,
// travels to its chosen bin and drops one token. Four tokens in four rows are
// the four classes of the same system. The truth lives in ./model.mjs.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import * as A from "../../../../../../_anatomy/kit/audit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-04-classes";
const WIDTH = 720;
const HEIGHT = 520;

// ---- bench ----
const BASE = { x: -215, y: -140, w: 430, d: 255, r: 14 };
const BASE_BOTTOM = -14;
const BASE_TOP = 0;
const FOOT_Z = -21;

// ---- frame ----
const LANE_X = [-135, -45, 45, 135];
const BEAM_Y0 = -124;
const BEAM_Y1 = 80;
const RAIL_Z0 = 40;
const RAIL_Z1 = 45;
const CROSS_Z0 = 36;
const CROSS_Z1 = 40;

// ---- bins: one row of cells per trait, its values run back to front ----
const BIN_Y = [
  [-98, -64, -30, 4],
  [-82, -48, -14],
  [-98, -64, -30, 4],
  [-82, -48, -14],
];
const BIN_INNER = { w: 26, d: 20 };
const BIN_FLOOR_Z = 0;
const BIN_FLOOR_H = 2.5;
const BIN_WALL_H = 8;

// ---- card ----
const CARD0 = M.CARDS[0];
const CARD_W = 40;
const CARD_D = 30;
const CARD_Z = 18.6;
const CARD_H = 1.8;
const CRADLE_BASE_X = LANE_X[3];
const CRADLE_Z = 14;
const CARD_Y = 72;

// ---- heads ----
const HEAD_HOME_Y = 72;
const HEAD_BASELINE = BIN_Y.map((row, lane) => row[CARD0.picks[lane]] - 6);

// ---- tokens ----
const TOKEN_R = 2.8;
const TOKEN_H = 3.2;
const TOKEN_REST_Z = BIN_FLOOR_Z + BIN_FLOOR_H;
const TOKEN_LIFT = 16.3; // released at z = 18.8, the top touches the nozzle at 22

// ---- points the camera must fit: the whole stand plus both cradle extremes ----
const CARD_STATIONS = LANE_X;
const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, FOOT_Z, BASE_TOP),
    [-170, -128, CROSS_Z1 + 6],
    [170, 84, CROSS_Z1 + 6],
    ...LANE_X.flatMap((lx) => [
      [lx, -104, 57],
      [lx, 80, 57],
    ]),
    ...CARD_STATIONS.flatMap((x) => [
      [x - CARD_W / 2, CARD_Y - CARD_D / 2, CARD_Z + CARD_H],
      [x + CARD_W / 2, CARD_Y + CARD_D / 2, CARD_Z + CARD_H],
    ]),
    [-20, -124, 13],
    [20, -124, 13],
    [198, 92, 30],
    [212, 84, 27],
  ],
  WIDTH,
  HEIGHT,
  { pad: 36, azimuth: 45, elevation: 31 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style = {}) => k.solidSvg(paths, style);
const L = (d, style = {}) => k.lineSvg(d, style);
const D = (points, style = {}) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// The recorder gets every solid, including the moving tokens and the cradle,
// so the audit can prove the rest pose and the token and cradle extremes.
const R = A.recorder(P, {
  order: ["cradle", "token0", "token1", "token2", "token3"],
  spring: {},
});

function put(name, at3, svg, shapes, extra = {}) {
  for (const shape of shapes) R.solid(shape);
  return R.put({ name, at: at3, svg, shapes, ...extra });
}

const laneSvg = (lane, svg, attrs = "", extraClass = "") =>
  `<g class="lane-part${extraClass ? ` ${extraClass}` : ""}" data-lane="${lane}"${attrs}>${svg}</g>`;

// ---------------------------------------------------------------------------
// base, feet, ruler, nameplate

function buildStand() {
  const shapes = [];
  let svg = "";

  for (const [x, y] of byDepth(k.corners(BASE, 30))) {
    svg += S(k.cylinder(x, y, 7.5, FOOT_Z, 3.6, P, 28), { tone: "lo" });
    svg += S(k.cylinder(x, y, 5.6, FOOT_Z + 3.6, 3.4, P, 28), { tone: "mid" });
    shapes.push(A.cylinder(x, y, 7.5, FOOT_Z, 3.6, { name: "base.foot.flange" }));
    shapes.push(A.cylinder(x, y, 5.6, FOOT_Z + 3.6, 3.4, { name: "base.foot" }));
  }

  svg += `<path class="iso-halo" d="${k.haloOf(BASE, FOOT_Z, 21, P)}"/>`;
  svg += S(k.slabOf(BASE, BASE_BOTTOM, 14, P, 10, 1.6), { tone: "mid" });
  shapes.push(A.slab(BASE, BASE_BOTTOM, 14, { name: "stand.base", ground: true }));

  svg += L(k.planOutline(k.insetPlan(BASE, 8), BASE_TOP, P, 10), { tone: "lo" });
  const screws = k.corners(BASE, 20);
  svg += L(screws.map(([x, y]) => k.ring(x, y, 2.6, BASE_TOP, P, 16)).join(""), { tone: "lo" });
  svg += D(screws.map(([x, y]) => at([x, y, BASE_TOP])), { size: 0.55, tone: "mid" });

  const strip = { x: -205, y: 106, w: 410, d: 8, r: 1.5 };
  svg += S(k.slabOf(strip, BASE_TOP, 0.8, P, 3), { tone: "lo", crease: "none" });
  shapes.push(A.slab(strip, BASE_TOP, 0.8, { name: "base.ruler" }));
  const ticks = k.topTicks(strip.x + 5, strip.x + strip.w - 5, 5, 5, strip.y + 0.8, BASE_TOP + 0.8, [2, 4], P);
  svg += L(ticks.minor, { tone: "lo" });
  svg += L(ticks.major, { tone: "mid" });
  svg += D([at([strip.x + 2, strip.y + 4, BASE_TOP + 0.8]), at([strip.x + strip.w - 2, strip.y + 4, BASE_TOP + 0.8])], { size: 0.5 });

  const plate = { x: -190, y: 94, w: 70, d: 9, r: 2 };
  svg += S(k.slabOf(plate, BASE_TOP, 1.1, P, 4, 0.25), { tone: "mid" });
  shapes.push(A.slab(plate, BASE_TOP, 1.1, { name: "base.nameplate" }));
  for (let line = 0; line < 3; line++) {
    svg += L(k.lineOnTop([plate.x + 6, plate.y + 3 + line * 2], [plate.x + plate.w - 6, plate.y + 3 + line * 2], BASE_TOP + 1.15, P), { tone: "lo", free: true });
  }
  svg += D([at([plate.x + 3, plate.y + 3, BASE_TOP + 1.1]), at([plate.x + plate.w - 3, plate.y + 3, BASE_TOP + 1.1])], { size: 0.42 });
  svg += D(k.dotGrid(120, -120, 6, 2, 4, BASE_TOP, P), { size: 0.4, tone: "lo" });

  put("stand", [0, 0, BASE_TOP], svg, shapes);
}

// ---------------------------------------------------------------------------
// frame: four posts, two crossbars, eight lane rails

function buildFrame() {
  const postSpots = [[-166, -124, 8], [166, -124, 8], [-166, 80, 8], [165, 80, 6]];
  postSpots.forEach(([x, y, half], index) => {
    let svg = "";
    const shapes = [];
    const foot = { x: x - half, y: y - half, w: half * 2, d: half * 2, r: 3 };
    svg += S(k.slabOf(foot, BASE_TOP, 2, P, 4, 0.4), { tone: "lo" });
    shapes.push(A.slab(foot, BASE_TOP, 2, { name: `frame${index}.foot` }));
    const post = { x: x - 4, y: y - 4, w: 8, d: 8, r: 1.5 };
    svg += S(k.slabOf(post, 2, CROSS_Z0 - 2, P, 4, 0.5), { tone: "mid" });
    shapes.push(A.slab(post, 2, CROSS_Z0 - 2, { name: `frame${index}.post` }));
    svg += D([at([x, y, CROSS_Z0])], { size: 0.45, tone: "lo" });
    put(`frame.post.${index}`, [x, y, 20], svg, shapes);
  });

  for (const [name, bar] of [
    ["frame.cross.rear", { x: -170, y: -128, w: 340, d: 8, r: 2 }],
    ["frame.cross.front", { x: -170, y: 76, w: 340, d: 8, r: 2 }],
  ]) {
    let svg = S(k.slabOf(bar, CROSS_Z0, CROSS_Z1 - CROSS_Z0, P, 5, 0.5), {
      tone: "mid",
      inner: L(k.sideSeam(bar, CROSS_Z0 + 2, P, 5), { tone: "faint" }),
    });
    svg += D(k.corners(bar, 3).map(([x, y]) => at([x, y, CROSS_Z1])), { size: 0.42, tone: "lo" });
    put(name, [bar.x + bar.w / 2, bar.y + bar.d / 2, CROSS_Z0 + 2], svg, [
      A.slab(bar, CROSS_Z0, CROSS_Z1 - CROSS_Z0, { name }),
    ]);
  }

  for (let lane = 0; lane < LANE_X.length; lane++) {
    const lx = LANE_X[lane];
    for (const side of ["far", "near"]) {
      const [x0, x1] = side === "far" ? [lx - 8, lx - 2] : [lx + 2, lx + 8];
      const rail = { x: x0, y: BEAM_Y0, w: x1 - x0, d: BEAM_Y1 - BEAM_Y0, r: 1.5 };
      let svg = S(k.slabOf(rail, RAIL_Z0, RAIL_Z1 - RAIL_Z0, P, 4, 0.4), {
        tone: "mid",
        inner: L(k.sideSeam(rail, RAIL_Z0 + 2.5, P, 4), { tone: "faint" }),
      });
      svg += D([at([lx, BEAM_Y0 + 4, RAIL_Z1]), at([lx, BEAM_Y1 - 4, RAIL_Z1])], { size: 0.4, tone: "lo" });
      put(`frame.rail.${side}.${lane}`, [lx, -22, RAIL_Z0 + 2.5], svg, [
        A.slab(rail, RAIL_Z0, RAIL_Z1 - RAIL_Z0, { name: `frame.rail.${side}.${lane}` }),
      ]);
    }
  }
}

// ---------------------------------------------------------------------------
// bins: a floor and a back lip behind the token, three near lips in front

function buildBin(lane, index) {
  const lx = LANE_X[lane];
  const cy = BIN_Y[lane][index];
  const floor = { x: lx - 16, y: cy - 13, w: 32, d: 26, r: 2.5 };
  const back = { x: lx - 16, y: cy - 13, w: 32, d: 3, r: 1 };
  const left = { x: lx - 16, y: cy - 10, w: 3, d: 20, r: 1 };
  const right = { x: lx + 13, y: cy - 10, w: 3, d: 20, r: 1 };
  const front = { x: lx - 16, y: cy + 10, w: 32, d: 3, r: 1 };

  let backSvg = "";
  const backShapes = [];
  backSvg += S(k.slabOf(floor, BIN_FLOOR_Z, BIN_FLOOR_H, P, 5, 0.3), { tone: "mid" });
  backShapes.push(A.slab(floor, BIN_FLOOR_Z, BIN_FLOOR_H, { name: `bin${lane}.${index}.floor` }));
  backSvg += S(k.slabOf(back, BIN_FLOOR_H, BIN_WALL_H, P, 4, 0.4), { tone: "mid" });
  backShapes.push(A.slab(back, BIN_FLOOR_H, BIN_WALL_H, { name: `bin${lane}.${index}.back` }));
  backSvg += L(k.planOutline(k.insetPlan(floor, 2.5), BIN_FLOOR_H, P, 4), { tone: "lo" });
  put(`bin.back.${lane}.${index}`, [lx, cy - 8, 4], laneSvg(lane, backSvg, ` data-bin="${lane}-${index}"`, "bin"), backShapes);

  let frontSvg = "";
  const frontShapes = [];
  for (const wall of [left, right, front]) {
    frontSvg += S(k.slabOf(wall, BIN_FLOOR_H, BIN_WALL_H, P, 4, 0.4), { tone: "mid" });
    frontShapes.push(A.slab(wall, BIN_FLOOR_H, BIN_WALL_H, { name: `bin${lane}.${index}.lip` }));
  }
  const tab = { x: lx - 3, y: cy + 13, w: 6, d: 2, r: 0.5 };
  frontSvg += S(k.slabOf(tab, BIN_FLOOR_H + BIN_WALL_H, 0.8, P, 3, 0.2), { tone: "hi" });
  frontShapes.push(A.slab(tab, BIN_FLOOR_H + BIN_WALL_H, 0.8, { name: `bin${lane}.${index}.tab` }));
  frontSvg += D([at([lx, cy + 14, BIN_FLOOR_H + BIN_WALL_H + 0.8])], { size: 0.45, tone: "mid" });
  put(`bin.front.${lane}.${index}`, [lx, cy + 8, 6], laneSvg(lane, frontSvg, ` data-bin="${lane}-${index}"`, "bin"), frontShapes);
}

function buildBins() {
  BIN_Y.forEach((row, lane) => row.forEach((_, index) => buildBin(lane, index)));
}

// ---------------------------------------------------------------------------
// tokens: one per trait, between the far and near halves of its bin

function buildToken(lane, index) {
  const x = LANE_X[lane];
  const y = BIN_Y[lane][index];
  const chosen = CARD0.picks[lane] === index;
  const paths = k.cylinder(x, y, TOKEN_R, TOKEN_REST_Z, TOKEN_H, P, 28, 0.35);
  let svg = S(paths, { tone: "hi", className: "token-shape" });
  svg += L(k.ring(x, y, TOKEN_R, TOKEN_REST_Z + TOKEN_H, P, 28), { tone: "mid" });
  svg += D([at([x, y, TOKEN_REST_Z + TOKEN_H])], { size: 0.45, tone: "hi" });
  const shape = A.cylinder(x, y, TOKEN_R, TOKEN_REST_Z, TOKEN_H, { name: `token${lane}.${index}` });
  put(
    `token.${lane}.${index}`,
    [x, y, TOKEN_REST_Z + TOKEN_H / 2],
    laneSvg(
      lane,
      `<g class="token-group" data-token="${lane}" data-token-bin="${lane}-${index}" data-trait="${lane}" style="opacity:${chosen ? 1 : 0}">${svg}</g>`,
    ),
    [shape],
    chosen
      ? { piece: `token${lane}`, move: [0, 0, TOKEN_LIFT] }
      : { piece: `token${lane}.${index}` },
  );
}

// ---------------------------------------------------------------------------
// read heads: the below parts, the neck through the rail gap, and the top

function buildHead(lane) {
  const lx = LANE_X[lane];
  const hy = HEAD_BASELINE[lane];

  let belowSvg = "";
  const belowShapes = [];
  const block = { x: lx - 5, y: hy - 4, w: 10, d: 12, r: 1.5 };
  belowSvg += S(k.slabOf(block, 23, 5, P, 4, 0.4), {
    tone: "hi",
    inner: L(k.sideSeam(block, 25.5, P, 4), { tone: "faint" }),
  });
  belowShapes.push(A.slab(block, 23, 5, { name: `head${lane}.block` }));
  belowSvg += S(k.cylinder(lx, hy, 2.6, 21.5, 1.5, P, 24, 0.3), { tone: "hi" });
  belowShapes.push(A.cylinder(lx, hy, 2.6, 21.5, 1.5, { name: `head${lane}.lens` }));
  belowSvg += L(k.ring(lx, hy, 2.6, 23, P, 24), { tone: "mid" });
  const nozzleY = hy + 6;
  belowSvg += S(k.cylinder(lx, nozzleY, 3, 22, 1, P, 24, 0.25), { tone: "mid" });
  belowShapes.push(A.cylinder(lx, nozzleY, 3, 22, 1, { name: `head${lane}.nozzle` }));
  belowSvg += L(k.ring(lx, nozzleY, 3, 22, P, 24), { tone: "lo" });
  const lamp = at([lx, hy + 8.1, 25.5]);
  belowSvg += `<circle class="head-lamp" cx="${lamp[0].toFixed(1)}" cy="${lamp[1].toFixed(1)}" r="1.7"/>`;
  put(
    `head.below.${lane}`,
    [lx, hy, 24],
    laneSvg(lane, `<g class="head-group" data-head="${lane}">${belowSvg}</g>`),
    belowShapes,
    { piece: `head${lane}` },
  );

  const neck = { x: lx - 1.7, y: hy - 2.5, w: 3.4, d: 5, r: 1 };
  const neckSvg = S(k.slabOf(neck, 28, RAIL_Z1 - 28, P, 3, 0.3), { tone: "mid" });
  put(
    `head.neck.${lane}`,
    [lx, hy, 36],
    laneSvg(lane, `<g class="head-group" data-head="${lane}">${neckSvg}</g>`),
    [A.slab(neck, 28, RAIL_Z1 - 28, { name: `head${lane}.neck` })],
    { piece: `head${lane}` },
  );

  let topSvg = "";
  const topShapes = [];
  const carriage = { x: lx - 10, y: hy - 8, w: 20, d: 16, r: 2.5 };
  topSvg += S(k.slabOf(carriage, RAIL_Z1, 7, P, 5, 0.5), {
    tone: "mid",
    inner: L(k.sideSeam(carriage, RAIL_Z1 + 3.4, P, 5), { tone: "faint" }),
  });
  topShapes.push(A.slab(carriage, RAIL_Z1, 7, { name: `head${lane}.carriage` }));
  topSvg += S(k.cylinder(lx, hy, 4, RAIL_Z1 + 7, 1.6, P, 24, 0.3), { tone: "hi" });
  topShapes.push(A.cylinder(lx, hy, 4, RAIL_Z1 + 7, 1.6, { name: `head${lane}.boss` }));
  topSvg += S(k.cylinder(lx, hy, 2.4, RAIL_Z1 + 8.6, 2.6, P, 20, 0.25), { tone: "hi" });
  topShapes.push(A.cylinder(lx, hy, 2.4, RAIL_Z1 + 8.6, 2.6, { name: `head${lane}.screw` }));
  topSvg += L(k.knurl(lx, hy, 2.4, RAIL_Z1 + 8.6, RAIL_Z1 + 11.2, 14, P), { tone: "lo" });
  topSvg += L(k.ring(lx, hy, 2.4, RAIL_Z1 + 11.2, P, 20), { tone: "mid" });
  topSvg += S(k.cylinder(lx, hy - 6.5, 1.8, RAIL_Z1 + 7, 0.6, P, 16, 0.2), { tone: "hi", className: "head-badge" });
  topShapes.push(A.cylinder(lx, hy - 6.5, 1.8, RAIL_Z1 + 7, 0.6, { name: `head${lane}.badge` }));
  put(
    `head.top.${lane}`,
    [lx, hy, 50],
    laneSvg(lane, `<g class="head-group" data-head="${lane}">${topSvg}</g>`),
    topShapes,
    { piece: `head${lane}` },
  );
}

function buildHeads() {
  for (let lane = 0; lane < LANE_X.length; lane++) buildHead(lane);
}

// ---------------------------------------------------------------------------
// cradle and card

function cardRing(cx, cy) {
  const x0 = cx - CARD_W / 2;
  const x1 = cx + CARD_W / 2;
  const y0 = cy - CARD_D / 2;
  const y1 = cy + CARD_D / 2;
  const points = [[x0, y0]];
  for (const ax of [cx - 18, cx - 8, cx + 2, cx + 12]) {
    points.push([ax, y0], [ax, y0 + 5], [ax + 5, y0 + 5], [ax + 5, y0]);
  }
  points.push([x1, y0], [x1, y1], [x0, y1]);
  return points;
}

function buildCradle() {
  const cx = CRADLE_BASE_X;
  const shapes = [];
  let svg = "";

  const body = { x: cx - 26, y: 57, w: 52, d: 30, r: 5 };
  svg += S(k.slabOf(body, CRADLE_Z, 4.2, P, 6, 0.6), {
    tone: "mid",
    inner: L(k.sideSeam(body, CRADLE_Z + 2.4, P, 6), { tone: "faint" }),
  });
  shapes.push(A.slab(body, CRADLE_Z, 4.2, { name: "cradle.body" }));

  const pad = { x: cx - 22, y: 60, w: 44, d: 24, r: 3 };
  svg += S(k.slabOf(pad, 18.2, 0.4, P, 5, 0.2), { tone: "lo", crease: "none" });
  shapes.push(A.slab(pad, 18.2, 0.4, { name: "cradle.pad" }));

  const ring = cardRing(cx, CARD_Y);
  svg += S(k.extrude(ring, CARD_Z, CARD_H, P, { convex: false, bevel: 0.3 }), { tone: "hi", crease: "mid" });
  shapes.push(A.extruded(ring, CARD_Z, CARD_H, { name: "cradle.card" }));
  svg += `<g data-card-label>${k.faceTextSvg(k.topMatrix([cx, CARD_Y + 0.8], CARD_Z + CARD_H + 0.05, P), CARD0.short, {
    size: 6.2,
    tone: "hi",
    anchor: "middle",
  })}</g>`;
  svg += D([cx - 15.5, cx - 5.5, cx + 4.5, cx + 14.5].map((x) => at([x, CARD_Y - 8.5, CARD_Z + CARD_H])), { size: 0.55, tone: "mid" });

  for (const side of [-1, 1]) {
    const post = { x: cx + side * 25 - 1.5, y: 68, w: 3, d: 8, r: 1 };
    svg += S(k.slabOf(post, 18.2, 5.4, P, 3, 0.3), { tone: "mid" });
    shapes.push(A.slab(post, 18.2, 5.4, { name: `cradle.clamp${side}` }));
    const finger = { x: side < 0 ? cx - 25 : cx + 19, y: 69, w: 6, d: 6, r: 1 };
    svg += S(k.slabOf(finger, 23.6, 0.8, P, 3, 0.2), { tone: "hi" });
    shapes.push(A.slab(finger, 23.6, 0.8, { name: `cradle.finger${side}` }));
    svg += S(k.cylinder(cx + side * 22, 72, 1.6, 24.4, 1.2, P, 16, 0.2), { tone: "mid" });
    shapes.push(A.cylinder(cx + side * 22, 72, 1.6, 24.4, 1.2, { name: `cradle.thumb${side}` }));
    svg += L(k.knurl(cx + side * 22, 72, 1.6, 24.4, 25.6, 10, P), { tone: "lo" });
    svg += L(k.ring(cx + side * 22, 72, 1.6, 25.6, P, 16), { tone: "mid" });
  }

  put("cradle", [cx, CARD_Y, CRADLE_Z + 3], `<g class="cradle-group" data-part="cradle">${svg}</g>`, shapes, {
    piece: "cradle",
    move: [LANE_X[0] - CRADLE_BASE_X, 0, 0],
  });
}

// ---------------------------------------------------------------------------
// hopper of spare tokens

function buildHopper() {
  const shapes = [];
  let svg = "";
  const floor = { x: -20, y: -124, w: 40, d: 22, r: 3 };
  svg += S(k.slabOf(floor, BASE_TOP, 3, P, 5, 0.4), { tone: "mid" });
  shapes.push(A.slab(floor, BASE_TOP, 3, { name: "hopper.floor" }));
  for (const wall of [
    { x: -20, y: -124, w: 40, d: 3, r: 1 },
    { x: -20, y: -105, w: 40, d: 3, r: 1 },
    { x: -20, y: -121, w: 3, d: 16, r: 1 },
    { x: 17, y: -121, w: 3, d: 16, r: 1 },
  ]) {
    svg += S(k.slabOf(wall, 3, 10, P, 4, 0.4), { tone: "mid" });
    shapes.push(A.slab(wall, 3, 10, { name: R.nameFor("hopper.wall") }));
  }
  svg += L(k.planOutline(k.insetPlan(floor, 3), 3, P, 4), { tone: "lo" });
  for (const x of [-10, 0, 10]) {
    svg += S(k.cylinder(x, -112, 2.4, 3, 4, P, 24, 0.3), { tone: "hi" });
    shapes.push(A.cylinder(x, -112, 2.4, 3, 4, { name: R.nameFor("hopper.token") }));
    svg += L(k.ring(x, -112, 2.4, 7, P, 24), { tone: "mid" });
  }
  put("hopper", [0, -112, 6], svg, shapes);
}

// ---------------------------------------------------------------------------
// hand crank that indexes the cradle

function buildCrank() {
  const shapes = [];
  let svg = "";

  const housing = { x: 172, y: 60, w: 16, d: 24, r: 3 };
  svg += S(k.slabOf(housing, BASE_TOP, 22, P, 5, 0.8), {
    tone: "mid",
    inner: L(k.sideSeam(housing, 12, P, 5), { tone: "faint" }),
  });
  shapes.push(A.slab(housing, BASE_TOP, 22, { name: "crank.housing" }));
  const cap = { x: 176, y: 64, w: 8, d: 16, r: 2 };
  svg += S(k.slabOf(cap, 22, 2, P, 4, 0.3), { tone: "hi" });
  shapes.push(A.slab(cap, 22, 2, { name: "crank.cap" }));
  svg += D([at([178, 66, 24]), at([182, 66, 24]), at([178, 78, 24]), at([182, 78, 24])], { size: 0.4 });

  const F = G.frameAlong([188, 72, 16], [1, 0, 0]);
  svg += S(G.disc(0, 8, 2.4, F, P), { tone: "hi" });
  shapes.push(A.disc(F, 0, 8, 2.4, { name: "crank.shaft" }));
  svg += S(G.disc(8, 10, 6, F, P, { bevel: 0.4 }), { tone: "hi" });
  shapes.push(A.disc(F, 8, 10, 6, { name: "crank.disc" }));
  svg += L(G.circleOf(F, 10, 6, P, 40), { tone: "mid" });

  const angle = (35 * Math.PI) / 180;
  const cy = Math.cos(angle);
  const cz = Math.sin(angle);
  const half = 2.2;
  const len = 14;
  const px = -cz;
  const pz = cy;
  const bar = [
    [px * half, pz * half],
    [cy * len + px * half, cz * len + pz * half],
    [cy * len - px * half, cz * len - pz * half],
    [-px * half, -pz * half],
  ];
  const FX = G.frameOf([198, 72, 16], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  svg += S(G.prismOf(FX, bar, 0, 2.4, P), { tone: "mid" });
  shapes.push(A.prism(FX, bar, 0, 2.4, { name: "crank.arm" }));
  const grip = G.frameAlong([200.4, 72 + cy * len, 16 + cz * len], [1, 0, 0]);
  svg += S(G.disc(0, 11, 3, grip, P, { bevel: 0.4 }), { tone: "hi" });
  shapes.push(A.disc(grip, 0, 11, 3, { name: "crank.grip" }));
  svg += L(G.circleOf(grip, 11, 3, P, 24), { tone: "mid" });

  put("crank", [180, 72, 12], svg, shapes);
}

// ---------------------------------------------------------------------------
// rail and its posts

function buildRail() {
  const shapes = [];
  let svg = "";
  const rail = { x: -185, y: 69, w: 357, d: 6, r: 2 };
  svg += S(k.slabOf(rail, 10, 4, P, 4, 0.4), {
    tone: "mid",
    inner: L(k.sideSeam(rail, 12, P, 4), { tone: "faint" }),
  });
  shapes.push(A.slab(rail, 10, 4, { name: "rail.bar" }));
  for (const x of [-184, 88]) {
    const post = { x: x - 6, y: 66, w: 12, d: 12, r: 2 };
    svg += S(k.slabOf(post, BASE_TOP, 10, P, 4, 0.4), { tone: "mid" });
    shapes.push(A.slab(post, BASE_TOP, 10, { name: R.nameFor("rail.post") }));
    svg += D([at([x, 72, 10])], { size: 0.45, tone: "lo" });
  }
  svg += D([at([-180, 72, 14]), at([166, 72, 14])], { size: 0.42, tone: "lo" });
  put("rail", [0, 72, 12], svg, shapes);
}

// ---------------------------------------------------------------------------
// build everything, settle painter order, audit the geometry

buildStand();
buildRail();
buildFrame();
buildCrank();
buildHopper();
buildBins();
buildTokens();
buildHeads();
buildCradle();

function buildTokens() {
  BIN_Y.forEach((row, lane) => row.forEach((_, index) => buildToken(lane, index)));
}

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

const art = R.items.map((item) => item.svg).join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Сортировщик классов: одна карточка в каретке проходит под четырьмя читающими головками, и каждая головка кладёт свой жетон в ячейку своего ряда.",
  body: art,
});

// ---------------------------------------------------------------------------
// live behaviour: cradle indexes the card, heads read and drop tokens

const live = `
const P = ${JSON.stringify(P)};
const MODEL = ${JSON.stringify(M.summary)};
const LANE_X = ${JSON.stringify(LANE_X)};
const BIN_Y = ${JSON.stringify(BIN_Y)};
const HEAD_BASE = ${JSON.stringify(HEAD_BASELINE)};
const CRADLE_BASE = ${CRADLE_BASE_X};
const HOME_Y = ${HEAD_HOME_Y};
const TOKEN_LIFT = ${TOKEN_LIFT};
const TOKEN_REST = ${TOKEN_REST_Z};
const LANE_OFFSET = 0.9;
const LANE_PERIOD = 1.7;
const DROP_DELAY = 0.85;
const FALL_TIME = 0.5;
const HOLD_TIME = 5.5;

const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const cradleEl = svgEl.querySelector('[data-part="cradle"]');
const headEls = [0, 1, 2, 3].map((lane) => Array.from(svgEl.querySelectorAll('[data-head="' + lane + '"]')));
const tokenEls = [0, 1, 2, 3].map((lane) => {
  const map = new Map();
  for (const el of svgEl.querySelectorAll('[data-token="' + lane + '"]')) {
    const bin = Number(el.getAttribute("data-token-bin").split("-")[1]);
    map.set(bin, el);
  }
  return map;
});
const binEls = Array.from(svgEl.querySelectorAll("[data-bin]"));
const laneEls = [0, 1, 2, 3].map((lane) => Array.from(svgEl.querySelectorAll('[data-lane="' + lane + '"]')));
const labelEl = svgEl.querySelector("[data-card-label] text");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const axis = axisVector(P, [1, 0, 0]);
const cam = cameraOf(P);
const floorAt = (sx, sy, z) => {
  const u = (sx - P.origin[0]) / cam.k;
  const v = ((sy - P.origin[1]) / cam.k + z * cam.cosE) / cam.sinE;
  return [u * cam.sinA + v * cam.cosA, -u * cam.cosA + v * cam.sinA];
};

const state = {
  card: 0,
  mask: MODEL.initial.mask,
  phase: "hold",
  t0: 0,
  holdSince: 0,
  cradle: CRADLE_BASE,
  cradleTarget: CRADLE_BASE,
  headY: HEAD_BASE.slice(),
  headTarget: HEAD_BASE.slice(),
  tokenZ: [0, 0, 0, 0],
  tokenVisible: [true, true, true, true],
  falling: [false, false, false, false],
  started: [true, true, true, true],
  landed: [true, true, true, true],
  hover: -1,
  drag: null,
  dragged: false,
  touring: !still.matches,
  clock: 0,
  last: 0,
  frame: 0,
  visible: false,
  idleTimer: 0,
};

const current = () => MODEL.states[state.card][state.mask];
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function placeCradle(value) {
  state.cradle = value;
  cradleEl.setAttribute("transform", translateAlong(P, [value - CRADLE_BASE, 0, 0]));
}
function placeHead(lane, value) {
  state.headY[lane] = value;
  for (const el of headEls[lane]) el.setAttribute("transform", translateAlong(P, [0, value - HEAD_BASE[lane], 0]));
}
function placeToken(lane, z) {
  state.tokenZ[lane] = z;
  const pick = current().picks[lane];
  for (const [index, el] of tokenEls[lane]) {
    const chosen = index === pick.binIndex;
    el.setAttribute("transform", translateAlong(P, [0, 0, chosen ? z : 0]));
    el.style.opacity = chosen && state.tokenVisible[lane] ? (pick.active ? "1" : "0.3") : "0";
    if (chosen && state.falling[lane]) el.setAttribute("data-falling", "");
    else el.removeAttribute("data-falling");
  }
}
function paintLabel() {
  if (labelEl) labelEl.textContent = MODEL.cards[state.card].short;
}
function paintReadout() {
  const data = current();
  if (readout.textContent !== data.readout) readout.textContent = data.readout;
  stage.setAttribute("aria-valuetext", data.readout);
  stage.setAttribute("aria-valuenow", String(state.card * 16 + state.mask));
}
function paintBins() {
  const picks = current().picks;
  for (const el of binEls) {
    const parts = el.getAttribute("data-bin").split("-");
    const lane = Number(parts[0]);
    const index = Number(parts[1]);
    const pick = picks[lane];
    el.removeAttribute("data-picked");
    el.removeAttribute("data-lit");
    el.removeAttribute("data-off");
    if (!pick.active) {
      el.setAttribute("data-off", "");
      continue;
    }
    if (index === pick.binIndex) {
      el.setAttribute("data-picked", "");
      if (state.landed[lane]) el.setAttribute("data-lit", "");
    } else {
      el.removeAttribute("data-picked");
    }
  }
  for (let lane = 0; lane < 4; lane++) {
    for (const el of headEls[lane]) {
      if (picks[lane].active) el.removeAttribute("data-off");
      else el.setAttribute("data-off", "");
    }
    for (const [index, el] of tokenEls[lane]) {
      const chosen = index === picks[lane].binIndex;
      el.style.opacity = chosen && state.tokenVisible[lane] ? (picks[lane].active ? "1" : "0.3") : "0";
    }
  }
}
function paintHover() {
  for (let lane = 0; lane < 4; lane++) {
    for (const el of laneEls[lane]) {
      if (lane === state.hover) el.setAttribute("data-hover", "");
      else el.removeAttribute("data-hover");
    }
    for (const head of headEls[lane]) {
      if (lane === state.hover) head.setAttribute("data-hover", "");
      else head.removeAttribute("data-hover");
    }
  }
}
function paintArrow(lane) {
  const dropping = state.falling[lane];
  for (const head of headEls[lane]) {
    if (dropping) head.setAttribute("data-active", "");
    else head.removeAttribute("data-active");
  }
}
function paintAll() {
  paintLabel();
  paintReadout();
  paintBins();
  paintHover();
  for (let lane = 0; lane < 4; lane++) paintArrow(lane);
}

function loadCard(index, instant = false) {
  state.card = ((index % MODEL.cards.length) + MODEL.cards.length) % MODEL.cards.length;
  state.started = [false, false, false, false];
  state.landed = [false, false, false, false];
  state.falling = [false, false, false, false];
  state.tokenVisible = [false, false, false, false];
  state.tokenZ = [0, 0, 0, 0];
  state.headTarget = [HOME_Y, HOME_Y, HOME_Y, HOME_Y];
  state.cradleTarget = LANE_X[0];
  state.phase = "run";
  state.t0 = state.clock;
  paintAll();
  if (instant || still.matches) completeCard();
}

function completeCard() {
  const picks = current().picks;
  state.phase = "hold";
  state.holdSince = state.clock;
  state.started = [true, true, true, true];
  state.landed = [true, true, true, true];
  state.falling = [false, false, false, false];
  state.tokenVisible = [true, true, true, true];
  for (let lane = 0; lane < 4; lane++) {
    const y = BIN_Y[lane][picks[lane].binIndex];
    state.cradleTarget = LANE_X[lane];
    state.headTarget[lane] = y - 6;
    placeHead(lane, y - 6);
    placeToken(lane, 0);
  }
  state.cradleTarget = LANE_X[3];
  placeCradle(LANE_X[3]);
  paintAll();
}

function nearestLane(x) {
  let best = 0;
  let distance = Infinity;
  for (let lane = 0; lane < 4; lane++) {
    const next = Math.abs(x - LANE_X[lane]);
    if (next < distance) {
      distance = next;
      best = lane;
    }
  }
  return best;
}

function laneAt(clientX, clientY) {
  const box = svgEl.getBoundingClientRect();
  if (!box.width || !box.height) return -1;
  const sx = ((clientX - box.left) * ${WIDTH}) / box.width;
  const sy = ((clientY - box.top) * ${HEIGHT}) / box.height;
  const [x] = floorAt(sx, sy, 34);
  let best = -1;
  let distance = 48;
  for (let lane = 0; lane < 4; lane++) {
    const next = Math.abs(x - LANE_X[lane]);
    if (next < distance) {
      distance = next;
      best = lane;
    }
  }
  return best;
}

function stopTour() {
  state.touring = false;
  clearTimeout(state.idleTimer);
  state.idleTimer = setTimeout(() => {
    if (still.matches) return;
    state.touring = true;
    if (state.phase === "hold") state.holdSince = state.clock;
    run();
  }, 7000);
}

function tick(now) {
  const dt = state.last ? Math.min((now - state.last) / 1000, 1 / 30) : 1 / 60;
  state.last = now;
  state.clock += dt;
  const data = current();
  const picks = data.picks;

  if (state.phase === "run") {
    for (let lane = 0; lane < 4; lane++) {
      const start = state.t0 + LANE_OFFSET + lane * LANE_PERIOD;
      const targetY = BIN_Y[lane][picks[lane].binIndex] - 6;
      if (!state.drag && state.clock >= start - 0.25) state.cradleTarget = LANE_X[lane];
      if (state.clock >= start + 0.25) state.headTarget[lane] = targetY;
      else state.headTarget[lane] = HOME_Y;
      const dropAt = start + DROP_DELAY;
      if (!state.started[lane] && state.clock >= dropAt) {
        state.started[lane] = true;
        state.falling[lane] = true;
        state.tokenVisible[lane] = true;
        placeToken(lane, TOKEN_LIFT);
      }
      if (state.falling[lane]) {
        const share = clamp((state.clock - dropAt) / FALL_TIME, 0, 1);
        placeToken(lane, TOKEN_LIFT * (1 - easeOut(share)));
        if (share >= 1) {
          state.falling[lane] = false;
          state.landed[lane] = true;
          placeToken(lane, 0);
          paintBins();
        }
      }
    }
    if (state.clock >= state.t0 + LANE_OFFSET + 3 * LANE_PERIOD + DROP_DELAY + FALL_TIME + 0.15) {
      completeCard();
    }
  } else if (state.phase === "hold") {
    if (state.touring && state.clock - state.holdSince > HOLD_TIME) {
      loadCard(state.card + 1);
    }
  }

  const calm = still.matches;
  const follow = (value, target) => (calm ? target : value + (target - value) * (1 - Math.exp(-dt / 0.18)));
  if (!state.drag) state.cradleTarget = clamp(state.cradleTarget, LANE_X[0], LANE_X[3]);
  placeCradle(follow(state.cradle, state.cradleTarget));
  for (let lane = 0; lane < 4; lane++) {
    placeHead(lane, follow(state.headY[lane], state.headTarget[lane]));
    for (const [index, el] of tokenEls[lane]) {
      const chosen = index === picks[lane].binIndex;
      el.style.opacity = chosen && state.tokenVisible[lane] ? (picks[lane].active ? "1" : "0.3") : "0";
      if (chosen && state.falling[lane]) el.setAttribute("data-falling", "");
      else el.removeAttribute("data-falling");
    }
    paintArrow(lane);
  }

  const settled =
    Math.abs(state.cradle - state.cradleTarget) < 0.02 &&
    state.headY.every((value, lane) => Math.abs(value - state.headTarget[lane]) < 0.02) &&
    !state.falling.some(Boolean);
  const keep = state.visible && (state.touring || state.phase === "run" || !settled);
  state.frame = keep ? requestAnimationFrame(tick) : 0;
}

function run() {
  if (!state.frame && state.visible) {
    state.last = 0;
    state.frame = requestAnimationFrame(tick);
  }
}

new IntersectionObserver((entries) => {
  state.visible = entries[entries.length - 1].isIntersecting;
  if (state.visible) run();
}, { rootMargin: "140px 0px" }).observe(stage);

stage.addEventListener("pointerdown", (event) => {
  if (event.button !== undefined && event.button !== 0) return;
  state.drag = { id: event.pointerId, x: event.clientX, base: state.cradle };
  state.dragged = false;
  state.touring = false;
  clearTimeout(state.idleTimer);
  stage.classList.add("dragging");
  if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
  stopTour();
  run();
});

stage.addEventListener("pointermove", (event) => {
  if (state.drag && state.drag.id === event.pointerId) {
    const dx = (event.clientX - state.drag.x) / (axis[0] || 1);
    if (Math.abs(event.clientX - state.drag.x) > 3) state.dragged = true;
    state.cradleTarget = clamp(state.drag.base + dx, LANE_X[0], LANE_X[3]);
    state.cradle = state.cradleTarget;
    placeCradle(state.cradle);
    return;
  }
  const lane = laneAt(event.clientX, event.clientY);
  if (lane !== state.hover) {
    state.hover = lane;
    paintHover();
  }
});

stage.addEventListener("pointerup", (event) => {
  if (!state.drag || state.drag.id !== event.pointerId) return;
  if (stage.releasePointerCapture) stage.releasePointerCapture(event.pointerId);
  if (state.dragged) {
    state.cradleTarget = LANE_X[nearestLane(state.cradle)];
    placeCradle(state.cradleTarget);
  }
  state.drag = null;
  stage.classList.remove("dragging");
  stopTour();
  run();
});

stage.addEventListener("pointerleave", () => {
  if (state.drag) return;
  state.hover = -1;
  paintHover();
});

stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    event.preventDefault();
    stopTour();
    loadCard(state.card + 1);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    event.preventDefault();
    stopTour();
    loadCard(state.card - 1);
  } else if (/^[1-4]$/.test(event.key)) {
    event.preventDefault();
    stopTour();
    state.mask ^= 1 << (Number(event.key) - 1);
    state.mask &= (1 << 4) - 1;
    paintAll();
    if (state.phase === "hold") applyMaskToHold();
    run();
  } else if (event.key === "Home") {
    event.preventDefault();
    stopTour();
    loadCard(0);
  }
});

function applyMaskToHold() {
  for (let lane = 0; lane < 4; lane++) {
    if (state.tokenVisible[lane]) placeToken(lane, 0);
  }
  paintAll();
}

paintAll();
placeCradle(state.cradle);
for (let lane = 0; lane < 4; lane++) {
  placeHead(lane, state.headY[lane]);
  placeToken(lane, state.tokenZ[lane]);
}
run();
`;

// ---------------------------------------------------------------------------
// card and page

const css = `<style>
.iso-stage{touch-action:pan-y;cursor:grab}
.iso-stage.dragging{cursor:grabbing}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.iso{--token-0:#c9a17b;--token-1:#b6a066;--token-2:#88a890;--token-3:#8fa4c4}
.iso[data-theme="light"]{--token-0:#a86f45;--token-1:#8a7433;--token-2:#4f7d5c;--token-3:#4f6a9a}
.token-group[data-trait="0"] .iso-top{fill:var(--token-0)}
.token-group[data-trait="1"] .iso-top{fill:var(--token-1)}
.token-group[data-trait="2"] .iso-top{fill:var(--token-2)}
.token-group[data-trait="3"] .iso-top{fill:var(--token-3)}
.token-group[data-trait="0"] .iso-edge{stroke:var(--token-0)}
.token-group[data-trait="1"] .iso-edge{stroke:var(--token-1)}
.token-group[data-trait="2"] .iso-edge{stroke:var(--token-2)}
.token-group[data-trait="3"] .iso-edge{stroke:var(--token-3)}
.token-group[data-falling] .iso-edge{stroke:var(--anatomy-lit);stroke-width:1}
.bin[data-lit] .iso-top{fill:var(--anatomy-lit-top)}
.bin[data-lit] .iso-edge{stroke:var(--anatomy-lit)}
.lane-part[data-off]{opacity:.34}
.head-group[data-hover] .iso-edge{stroke:var(--anatomy-hi);stroke-width:1}
.bin[data-picked][data-hover] .iso-edge{stroke:var(--anatomy-hi);stroke-width:1}
.head-lamp{fill:var(--anatomy-lo);stroke:none;opacity:.95}
.head-group[data-active] .head-lamp{fill:var(--anatomy-lit)}
.head-group[data-head="0"] .head-badge .iso-top{fill:var(--token-0)}
.head-group[data-head="1"] .head-badge .iso-top{fill:var(--token-1)}
.head-group[data-head="2"] .head-badge .iso-top{fill:var(--token-2)}
.head-group[data-head="3"] .head-badge .iso-top{fill:var(--token-3)}
.iso-plate{padding-bottom:92px}
.iso-plate-corner[data-corner="readout"]{white-space:normal;text-align:right;max-width:78%;line-height:1.38;bottom:38px}
@media (max-width:600px){
.iso-plate{padding:48px 12px 132px}
.iso-plate-corner[data-corner="readout"]{font-size:9px;max-width:96%;line-height:1.42;bottom:42px}
.iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px}
}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 1",
    title: "Сортировщик классов",
    hint: "карточки ← → · признак 1–4",
    readout: M.initial.readout,
    keys: [
      { mark: "raised", label: "класс по признаку" },
      { mark: "lit", label: "выбранная ячейка" },
      { mark: "dim", label: "признак выключен" },
    ],
    caption:
      "Одна карточка проходит четыре независимых ряда. Банковская АБС получает четыре класса: финансы, автоматическая, обработка данных, корпоративная.",
    body: `<div class="iso-stage" tabindex="0" role="application" aria-label="Сортировщик классов: одна карточка, четыре независимых ряда ячеек, четыре жетона. Стрелки меняют карточку, цифры 1–4 включают и выключают признак, каретку можно тянуть влево и вправо." aria-valuemin="0" aria-valuemax="${M.CARDS.length * 16 - 1}" aria-valuenow="15">${svg}</div>`,
  });

function build(theme) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: ID, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}

build("dark");
build("light");

A.auditOrExit(R, P, {});


