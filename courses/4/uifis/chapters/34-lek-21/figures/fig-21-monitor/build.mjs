import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, STEPS, GAUGES, SERIES } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 560;
const HEIGHT = 450;
const RAD = Math.PI / 180;

// Приборная стойка: тяжёлая плита на ножках, шкаф с наклонной панелью и шестью
// стрелочными индикаторами, полка с кнопкой снятия нагрузки, маховик нагрузки на
// передней грани, самописец справа и лампа тревоги на стойке позади панели.

const BASE = { x: -196, y: -150, w: 392, d: 202, r: 10 };
const BASE_Z = 10;
const FOOT_H = 5;

const CAB = { x: -174, y: -126, w: 248, d: 162, r: 4 };
const CAB_Z0 = 10;
const CAB_Z1 = 62;

const PANEL = { x0: -174, x1: 74, y0: -126, y1: 16, zB: 100, zF: 72, z0: 62 };
const DIAL_R = 26;
const DIAL_X = [-131, -50, 31];
const DIAL_Y = [-88, -24];

const LEDGE = { x: -174, y: 16, w: 248, d: 22, r: 2 };
const LEDGE_Z0 = 56;
const LEDGE_Z1 = 62;

const BTN = { x: -118, y: 27 };
const WHEEL = { x: 8, z: 32, rOut: 19, rIn: 13.6, hub: 5, scale: 23 };
const WHEEL_Y = 36.2;

const REC = { x: 86, y: -126, w: 88, d: 162, r: 3 };
const REC_Z0 = 10;
const REC_Z1 = 66;
const PLATEN = { x: 84, y: -128, w: 92, d: 166, r: 3 };
const PAPER = { x: 92, y: -118, w: 76, d: 146, r: 2 };
const PAPER_TOP = 70.4;
const RAIL_Z = 78;
const PEN_Y = PAPER.y + 8;

const POST = { x: -166, y: -134, r: 4.4 };
const LAMP = { z: 118, r: 11 };

const LABEL = { x: 92, y: 40, w: 78, d: 9, r: 1 };
const RULER = { x: -190, y: 40, w: 250, d: 7, r: 0.8 };

const DIALS = GAUGES.map((gauge, index) => ({
  ...gauge,
  x: DIAL_X[index % 3],
  y: DIAL_Y[Math.floor(index / 3)],
  r: DIAL_R,
}));

const pts = [
  ...k.boxCorners(BASE, -BASE_Z - FOOT_H, 0),
  [CAB.x, CAB.y, CAB_Z1],
  [PANEL.x0, PANEL.y0, PANEL.zB],
  [PANEL.x1, PANEL.y1, PANEL.zF],
  [REC.x + REC.w, REC.y + REC.d, REC_Z1],
  [PAPER.x + PAPER.w, PAPER.y + PAPER.d, RAIL_Z + 3],
  [POST.x, POST.y, LAMP.z + 22],
  [WHEEL.x - WHEEL.scale, WHEEL_Y, WHEEL.z],
  [WHEEL.x + WHEEL.scale, WHEEL_Y, WHEEL.z],
];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 22, azimuth: 40, elevation: 32 });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (dots, style) => k.dotsSvg(dots, style);
const pathOfScreen = (points, closed) => k.pathOf(points, closed);

function convexHull(input) {
  const sorted = [...input].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const panelZ = (y) => PANEL.zB + ((y - PANEL.y0) * (PANEL.zF - PANEL.zB)) / (PANEL.y1 - PANEL.y0);
const planeIso = (x, y) => k.iso([x, y, panelZ(y)], P);
const planePath = (points, closed = false) => k.pathOf(points.map(([x, y]) => planeIso(x, y)), closed);
const planeCircle = (cx, cy, radius, steps = 44) =>
  planePath(
    Array.from({ length: steps }, (_, index) => {
      const angle = (index / steps) * Math.PI * 2;
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    }),
    true,
  );
const planeAnnulus = (cx, cy, outer, inner, steps = 44) => {
  const rings = [outer, inner].map((radius) =>
    Array.from({ length: steps }, (_, index) => {
      const angle = (index / steps) * Math.PI * 2;
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    }),
  );
  return planePath([...rings[0], ...rings[1].reverse()], true);
};

function needlePath(gauge, angle) {
  const dirX = Math.sin(angle * RAD);
  const dirY = -Math.cos(angle * RAD);
  const perX = Math.cos(angle * RAD);
  const perY = Math.sin(angle * RAD);
  const point = (along, side) => {
    const x = gauge.x + dirX * along + perX * side;
    const y = gauge.y + dirY * along + perY * side;
    return k.iso([x, y, panelZ(y)], P);
  };
  const blade = k.pathOf([point(gauge.r - 6, 0), point(1.5, 1.5), point(1.5, -1.5)], true);
  const tail = k.pathOf([point(-1.4, 1.8), point(-5.6, 1), point(-5.6, -1), point(-1.4, -1.8)], true);
  return blade + tail;
}

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_Z - FOOT_H, BASE_Z, P)}"/>`];
  for (const [x, y] of k.corners(BASE, 20)) {
    out.push(S(k.cylinder(x, y, 7.6, -BASE_Z - FOOT_H, 1.8, P, 26), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.9, -BASE_Z - FOOT_H + 1.8, FOOT_H - 1.8, P, 26), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -BASE_Z, BASE_Z, P, 8, 1.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 6), 0, P, 8), { tone: "faint" }));
  const screws = k.corners(BASE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));

  out.push(S(k.slabOf(RULER, 0, 0.7, P, 4), { tone: "mid", crease: "none" }));
  const ticks = k.topTicks(RULER.x + 7, RULER.x + RULER.w - 7, 5, 5, RULER.y + 0.5, 0.75, [2.2, 4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  out.push(S(k.slabOf(LABEL, 0, 1, P, 4), { tone: "mid", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 1, P, 4), { tone: "lo" }));
  out.push(
    L(
      [34, 24, 15]
        .map((len, index) =>
          k.lineOnTop([LABEL.x + 4, LABEL.y + 2.6 + index * 2.4], [LABEL.x + 4 + len, LABEL.y + 2.6 + index * 2.4], 1, P),
        )
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(D([at([LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 1])], { size: 0.5 }));
  return out.join("");
}

function cabinet() {
  const out = [];
  out.push(S(k.slabOf(CAB, CAB_Z0, CAB_Z1 - CAB_Z0, P, 8, 1.2), { tone: "lo" }));
  out.push(L(k.sideSeam(CAB, CAB_Z1, P, 8), { tone: "faint" }));
  const face = CAB.y + CAB.d;
  const right = CAB.x + CAB.w;
  out.push(L(k.segment([CAB.x, face + 0.1, CAB_Z1 - 7], [right, face + 0.1, CAB_Z1 - 7], P), { tone: "faint" }));

  const doorX = CAB.x + 12;
  const doorW = 92;
  out.push(
    L(
      pathOfScreen(
        [
          at([doorX, face + 0.1, 54]),
          at([doorX + doorW, face + 0.1, 54]),
          at([doorX + doorW, face + 0.1, 16]),
          at([doorX, face + 0.1, 16]),
        ],
        true,
      ),
      { tone: "faint" },
    ),
  );
  for (const z of [22, 46]) {
    out.push(S(k.slabOf({ x: doorX - 1, y: face, w: 5, d: 1.4, r: 0.6 }, z, 4.6, P, 4), { tone: "mid" }));
    out.push(L(k.ring(doorX + 1.5, face + 1.4, 0.8, z + 2.3, P, 10), { tone: "lo" }));
  }
  out.push(S(k.slabOf({ x: doorX + doorW - 11, y: face, w: 3.4, d: 2.4, r: 1 }, 31, 13, P, 4, 0.3), { tone: "mid" }));
  out.push(D([at([doorX + doorW - 9.3, face + 2.4, 33]), at([doorX + doorW - 9.3, face + 2.4, 42])], { size: 0.45 }));

  for (const x of [CAB.x + 9, right - 9]) {
    out.push(L(k.ring(x, face, 1.6, CAB_Z1 - 11, P, 14), { tone: "lo" }));
    out.push(D([at([x, face + 0.2, CAB_Z1 - 11])], { size: 0.45 }));
  }
  for (const y of [CAB.y + 10, CAB.y + CAB.d - 10]) {
    out.push(L(k.ring(right, y, 1.6, CAB_Z0 + 6, P, 14), { tone: "lo" }));
    out.push(D([at([right + 0.2, y, CAB_Z0 + 6])], { size: 0.45 }));
  }
  for (let index = 0; index < 5; index++) {
    const z = CAB_Z0 + 14 + index * 6.5;
    const quad = pathOfScreen(
      [
        at([right, CAB.y + 26, z]),
        at([right, CAB.y + 92, z]),
        at([right, CAB.y + 92, z + 2.2]),
        at([right, CAB.y + 26, z + 2.2]),
      ],
      true,
    );
    out.push(`<path class="iso-shade" data-shade="0" d="${quad}"/>`);
    out.push(L(quad, { tone: "faint" }));
  }
  const plateX = 38;
  out.push(
    L(
      pathOfScreen(
        [
          at([plateX, face + 0.1, 54]),
          at([plateX + 30, face + 0.1, 54]),
          at([plateX + 30, face + 0.1, 42]),
          at([plateX, face + 0.1, 42]),
        ],
        true,
      ),
      { tone: "faint" },
    ),
  );
  out.push(
    L(
      [22, 16, 9]
        .map((len, index) =>
          k.segment([plateX + 3, face + 0.2, 51 - index * 3.2], [plateX + 3 + len, face + 0.2, 51 - index * 3.2], P),
        )
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  return out.join("");
}

function panel() {
  const { x0, x1, y0, y1, zB, zF, z0 } = PANEL;
  const bottom = [at([x0, y0, z0]), at([x1, y0, z0]), at([x1, y1, z0]), at([x0, y1, z0])];
  const top = [at([x0, y0, zB]), at([x1, y0, zB]), at([x1, y1, zF]), at([x0, y1, zF])];
  const hull = convexHull([...bottom, ...top]);
  const out = [];
  out.push(`<path class="iso-fill" d="${k.pathOf(hull, true)}"/>`);
  out.push(`<path class="iso-shade" data-shade="1" d="${k.pathOf([top[1], top[2], bottom[2], bottom[1]], true)}"/>`);
  out.push(`<path class="iso-shade" data-shade="3" d="${k.pathOf([top[3], top[2], bottom[2], bottom[3]], true)}"/>`);
  out.push(`<path class="iso-top" d="${k.pathOf(top, true)}"/>`);
  out.push(L(k.pathOf(hull, true), { tone: "mid" }));
  out.push(L(k.pathOf(top, true), { tone: "hi" }));
  out.push(
    L(
      planePath(
        [
          [x0 + 5, y0 + 5],
          [x1 - 5, y0 + 5],
          [x1 - 5, y1 - 5],
          [x0 + 5, y1 - 5],
        ],
        true,
      ),
      { tone: "faint" },
    ),
  );
  for (const [x, y] of [
    [x0 + 9, y0 + 9],
    [x1 - 9, y0 + 9],
    [x1 - 9, y1 - 9],
    [x0 + 9, y1 - 9],
  ]) {
    out.push(L(planeCircle(x, y, 1.7, 16), { tone: "lo" }));
    out.push(D([planeIso(x, y)], { size: 0.5 }));
  }
  out.push(L(k.lineOnTop([x0, y1 - 1], [x1, y1 - 1], panelZ(y1 - 1), P), { tone: "mid" }));
  return out.join("");
}

function dial(gauge, index) {
  const out = [];
  const pt = (angle, radius) => [gauge.x + radius * Math.sin(angle * RAD), gauge.y - radius * Math.cos(angle * RAD)];
  const arc = (from, to, radius, steps = 26) =>
    k.pathOf(
      Array.from({ length: steps + 1 }, (_, step) => planeIso(...pt(from + ((to - from) * step) / steps, radius))),
    );
  const warnAngle = -120 + 240 * Math.min(1, (gauge.red * 0.7) / gauge.max);
  const redAngle = -120 + 240 * (gauge.red / gauge.max);

  out.push(`<path class="iso-shade bezel" data-shade="2" d="${planeAnnulus(gauge.x, gauge.y, gauge.r + 3.8, gauge.r + 1.2)}"/>`);
  out.push(L(planeCircle(gauge.x, gauge.y, gauge.r + 3.8, 48), { tone: "mid" }));
  out.push(L(planeCircle(gauge.x, gauge.y, gauge.r + 1.2, 48), { tone: "lo" }));
  out.push(`<path class="dial-face" d="${planeCircle(gauge.x, gauge.y, gauge.r)}"/>`);
  out.push(L(planeCircle(gauge.x, gauge.y, gauge.r), { tone: "mid" }));
  out.push(L(arc(-120, warnAngle, gauge.r - 1.9), { className: "zc-ok" }));
  out.push(L(arc(warnAngle, redAngle, gauge.r - 1.9), { className: "zc-warn" }));
  out.push(L(arc(redAngle, 120, gauge.r - 1.9), { className: "zc-hot" }));

  const radial = (angle, inner, outer) => planePath([pt(angle, inner), pt(angle, outer)]);
  for (let tick = 0; tick <= 20; tick++) {
    const angle = -120 + tick * 12;
    const major = tick % 5 === 0;
    out.push(L(radial(angle, gauge.r - 2.4, gauge.r - (major ? 11 : 8)), { tone: major ? "mid" : "lo" }));
  }
  out.push(L(radial(redAngle, gauge.r - 2.4, gauge.r - 11), { className: "thr" }));
  out.push(L(arc(-112, -58, gauge.r - 5.4, 14), { className: "glass", free: true }));
  out.push(L(arc(-118, -96, gauge.r - 9.6, 8), { className: "glass", free: true }));
  out.push(L(planeCircle(gauge.x, gauge.y, gauge.r - 11, 40), { tone: "lo" }));
  out.push(L(planeCircle(gauge.x, gauge.y, gauge.r - 8, 40), { tone: "lo" }));

  const angle = -120 + 240 * Math.min(1, SERIES[0].values[index] / gauge.max);
  out.push(
    `<g class="needle" data-needle="${index}" data-zone="ok"><path class="needle-body" d="${needlePath(gauge, angle)}"/></g>`,
  );
  out.push(`<path class="dial-hub" d="${planeCircle(gauge.x, gauge.y, 2.4, 20)}"/>`);
  out.push(L(planeCircle(gauge.x, gauge.y, 2.4, 20), { tone: "hi" }));

  out.push(L(planeCircle(gauge.x, gauge.y, gauge.r + 4.6, 48), { tone: "lo" }));
  out.push(D([planeIso(...pt(-104, gauge.r + 2.4)), planeIso(...pt(104, gauge.r + 2.4))], { size: 0.5 }));
  return out.join("");
}

function dials() {
  return DIALS.map((gauge, index) => dial(gauge, index)).join("");
}

function ledge() {
  const out = [];
  for (const x of [-140, 66]) {
    out.push(S(k.slabOf({ x: x - 4, y: 20, w: 8, d: 18, r: 1.5 }, 48, LEDGE_Z0 - 48, P, 4), { tone: "lo" }));
  }
  out.push(S(k.slabOf(LEDGE, LEDGE_Z0, LEDGE_Z1 - LEDGE_Z0, P, 6, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(LEDGE, 3), LEDGE_Z1, P, 6), { tone: "faint" }));
  for (const [x, y] of k.corners(LEDGE, 6)) out.push(D([at([x, y, LEDGE_Z1])], { size: 0.45 }));
  for (const x of [-70, -50]) {
    out.push(S(k.cylinder(x, 27, 3.4, LEDGE_Z1, 1.2, P, 20), { tone: "lo" }));
    out.push(S(k.cylinder(x, 27, 2.2, LEDGE_Z1 + 1.2, 0.9, P, 20), { tone: "hi", className: "led" }));
    out.push(L(k.ring(x, 27, 3.4, LEDGE_Z1 + 1.2, P, 20), { tone: "lo" }));
  }
  out.push(S(k.cylinder(-150, 27, 3.4, LEDGE_Z1, 1.2, P, 20), { tone: "lo" }));
  out.push(S(k.cylinder(-150, 27, 2.2, LEDGE_Z1 + 1.2, 0.9, P, 20), { tone: "hi", className: "led led-hot" }));
  return out.join("");
}

function button() {
  const out = [];
  out.push(S(k.cylinder(BTN.x, BTN.y, 11.5, LEDGE_Z1, 1.4, P, 28), { tone: "lo" }));
  out.push(L(k.ring(BTN.x, BTN.y, 11.5, LEDGE_Z1 + 1.4, P, 28), { tone: "mid" }));
  out.push(L(k.ring(BTN.x, BTN.y, 8.6, LEDGE_Z1 + 1.4, P, 28), { tone: "lo" }));
  out.push(`<g data-button transform="${k.translateAlong(P, [0, 0, 0])}">`);
  out.push(S(k.cylinder(BTN.x, BTN.y, 8.2, LEDGE_Z1 + 1.4, 3.4, P, 28, 0.6), { tone: "hi", className: "btn-cap" }));
  out.push(L(k.ring(BTN.x, BTN.y, 5.6, LEDGE_Z1 + 4.8, P, 24), { tone: "lo" }));
  out.push("</g>");
  out.push(D([at([BTN.x - 15, BTN.y, LEDGE_Z1]), at([BTN.x + 15, BTN.y, LEDGE_Z1])], { size: 0.45 }));
  return out.join("");
}

function wheel() {
  const out = [];
  const wIso = (angle, radius, y = WHEEL_Y) =>
    k.iso([WHEEL.x + radius * Math.cos(angle * RAD), y, WHEEL.z + radius * Math.sin(angle * RAD)], P);
  const circle = (radius, y, steps = 48) =>
    k.pathOf(Array.from({ length: steps }, (_, index) => wIso((index / steps) * 360, radius, y)), true);
  const annulus = (outer, inner) => {
    const ringOut = Array.from({ length: 48 }, (_, index) => wIso((index / 48) * 360, outer));
    const ringIn = Array.from({ length: 48 }, (_, index) => wIso(-(index / 48) * 360, inner));
    return k.pathOf([...ringOut, ...ringIn], true);
  };
  out.push(`<path class="iso-fill" d="${circle(WHEEL.scale + 2, WHEEL_Y + 0.4)}"/>`);
  out.push(L(circle(WHEEL.scale + 2, WHEEL_Y + 0.4), { tone: "faint" }));
  for (let tick = 0; tick < 24; tick++) {
    const angle = tick * 15;
    const major = tick % 6 === 0;
    out.push(
      L(k.pathOf([wIso(angle, WHEEL.scale + 2), wIso(angle, WHEEL.scale - (major ? 3.4 : 1.4))]), {
        tone: major ? "mid" : "lo",
      }),
    );
  }
  out.push(
    L(k.pathOf([wIso(-150, WHEEL.scale - 1), wIso(-146, WHEEL.scale - 5.6), wIso(-154, WHEEL.scale - 5.6)], true), {
      tone: "red",
    }),
  );
  out.push(`<path class="iso-shade" data-shade="2" d="${annulus(WHEEL.rOut, WHEEL.rIn)}"/>`);
  out.push(L(circle(WHEEL.rOut, WHEEL_Y - 1.6), { tone: "lo" }));
  out.push(L(circle(WHEEL.rOut), { tone: "hi" }));
  out.push(L(circle(WHEEL.rIn), { tone: "mid" }));
  for (let spoke = 0; spoke < 12; spoke++) {
    const angle = spoke * 30 + 8;
    out.push(L(k.pathOf([wIso(angle, WHEEL.rOut, WHEEL_Y - 1.6), wIso(angle, WHEEL.rOut)]), { tone: "lo" }));
  }
  out.push(`<g data-wheel></g>`);
  out.push(`<path class="iso-shade" data-shade="3" d="${circle(WHEEL.hub, WHEEL_Y - 1.2, 28)}"/>`);
  out.push(L(circle(WHEEL.hub, WHEEL_Y - 1.2, 28), { tone: "hi" }));
  out.push(`<path class="iso-top" d="${circle(2.1, WHEEL_Y - 2, 20)}"/>`);
  out.push(L(circle(2.1, WHEEL_Y - 2, 20), { tone: "lo" }));
  return out.join("");
}

function recorder() {
  const out = [];
  out.push(S(k.slabOf(REC, REC_Z0, REC_Z1 - REC_Z0, P, 8, 1), { tone: "lo" }));
  out.push(L(k.sideSeam(REC, REC_Z1, P, 8), { tone: "faint" }));
  out.push(S(k.slabOf(PLATEN, REC_Z1, 3.2, P, 8, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATEN, 3), REC_Z1 + 3.2, P, 8), { tone: "faint" }));
  for (const [x, y] of k.corners(PLATEN, 6)) out.push(D([at([x, y, REC_Z1 + 3.2])], { size: 0.45 }));

  const front = REC.y + REC.d;
  const side = REC.x + REC.w;
  out.push(
    L(
      pathOfScreen(
        [
          at([REC.x + 8, front + 0.1, 50]),
          at([side - 8, front + 0.1, 50]),
          at([side - 8, front + 0.1, 20]),
          at([REC.x + 8, front + 0.1, 20]),
        ],
        true,
      ),
      { tone: "faint" },
    ),
  );
  out.push(S(k.slabOf({ x: REC.x + REC.w / 2 - 13, y: front, w: 26, d: 1.8, r: 1 }, 32, 3.2, P, 4, 0.3), { tone: "mid" }));
  out.push(D([at([REC.x + REC.w / 2 - 13, front + 1.8, 34]), at([REC.x + REC.w / 2 + 13, front + 1.8, 34])], { size: 0.45 }));
  for (let index = 0; index < 4; index++) {
    const z = 24 + index * 6;
    const quad = pathOfScreen(
      [
        at([side, REC.y + 24, z]),
        at([side, REC.y + 74, z]),
        at([side, REC.y + 74, z + 2]),
        at([side, REC.y + 24, z + 2]),
      ],
      true,
    );
    out.push(`<path class="iso-shade" data-shade="0" d="${quad}"/>`);
    out.push(L(quad, { tone: "faint" }));
  }

  out.push(
    S(k.slabOf(PAPER, REC_Z1 + 3.2, PAPER_TOP - REC_Z1 - 3.2, P, 4), { tone: "hi", crease: "none", className: "paper" }),
  );
  out.push(
    S(k.slabOf({ x: PAPER.x - 2, y: PAPER.y + PAPER.d - 3, w: PAPER.w + 4, d: 5, r: 1 }, PAPER_TOP, 1.8, P, 4, 0.4), {
      tone: "mid",
    }),
  );
  out.push(S(k.slabOf({ x: PAPER.x - 2, y: PAPER.y - 2, w: PAPER.w + 4, d: 4, r: 1 }, PAPER_TOP, 1.4, P, 4, 0.4), { tone: "mid" }));
  out.push(
    D(
      Array.from({ length: 13 }, (_, index) => at([PAPER.x + 3 + index * 6, PAPER.y + PAPER.d - 0.5, PAPER_TOP + 1.8])),
      { size: 0.4 },
    ),
  );

  const gridX = [];
  const perforations = [];
  for (let index = 0; index < 12; index++) {
    const y = PAPER.y + 8 + index * 12;
    gridX.push(k.lineOnTop([PAPER.x + 1.5, y], [PAPER.x + PAPER.w - 1.5, y], PAPER_TOP, P));
    perforations.push(at([PAPER.x + 1.5, y, PAPER_TOP]), at([PAPER.x + PAPER.w - 1.5, y, PAPER_TOP]));
  }
  const gridY = [];
  for (let index = 0; index < 4; index++) {
    const x = PAPER.x + 10 + index * 17;
    gridY.push(k.lineOnTop([x, PAPER.y], [x, PAPER.y + PAPER.d], PAPER_TOP, P));
  }
  out.push(L(gridX.join(""), { tone: "lo" }));
  out.push(L(gridY.join(""), { tone: "faint" }));
  const rulerTicks = k.topTicks(PAPER.y + 6, PAPER.y + PAPER.d - 6, 12, 5, PAPER.x + 0.6, PAPER_TOP, [2.2, 4.2], P, "y");
  out.push(L(rulerTicks.minor, { tone: "lo" }), L(rulerTicks.major, { tone: "mid" }));
  out.push(D(perforations, { size: 0.55 }));
  out.push(`<path class="trace" data-trace d=""/>`);

  for (const x of [PAPER.x + 2, PAPER.x + PAPER.w - 2]) {
    out.push(S(k.cylinder(x, PEN_Y - 4, 2.6, PAPER_TOP, RAIL_Z - PAPER_TOP, P, 20), { tone: "lo" }));
    out.push(L(k.ring(x, PEN_Y - 4, 2.6, RAIL_Z, P, 20), { tone: "mid" }));
    out.push(D([at([x, PEN_Y - 4, RAIL_Z + 0.2])], { size: 0.4 }));
  }
  out.push(S(k.slabOf({ x: PAPER.x, y: PEN_Y - 7.5, w: PAPER.w, d: 6, r: 1.4 }, RAIL_Z, 2.6, P, 4, 0.5), { tone: "mid" }));
  out.push(
    L(k.planOutline({ x: PAPER.x + 1, y: PEN_Y - 6.5, w: PAPER.w - 2, d: 4, r: 1 }, RAIL_Z + 2.6, P, 4), { tone: "faint" }),
  );
  out.push(`<g data-pen transform="${k.translateAlong(P, [0, 0, 0])}">`);
  out.push(S(k.slabOf({ x: PAPER.x + 3, y: PEN_Y - 7, w: 9, d: 8, r: 1.4 }, RAIL_Z - 3.4, 3.4, P, 4, 0.6), { tone: "hi" }));
  out.push(L(k.planOutline({ x: PAPER.x + 4, y: PEN_Y - 6, w: 7, d: 6, r: 1 }, RAIL_Z, P, 4), { tone: "faint" }));
  out.push(S(k.cylinder(PAPER.x + 7.5, PEN_Y, 0.9, PAPER_TOP + 0.6, RAIL_Z - 4 - PAPER_TOP, P, 14), { tone: "mid" }));
  out.push(S(k.cylinder(PAPER.x + 7.5, PEN_Y, 1.8, PAPER_TOP + 0.1, 0.9, P, 16), { tone: "hi", className: "nib" }));
  out.push("</g>");
  out.push(D([at([PAPER.x + 6, PEN_Y, PAPER_TOP + 0.1])], { size: 0.35 }));
  return out.join("");
}

function lamp() {
  const out = [];
  out.push(S(k.cylinder(POST.x, POST.y, 9.5, BASE_Z, 3, P, 24), { tone: "lo" }));
  out.push(L(k.ring(POST.x, POST.y, 9.5, BASE_Z + 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(POST.x, POST.y, POST.r, BASE_Z + 3, LAMP.z - BASE_Z - 3, P, 24), { tone: "mid" }));
  out.push(L(k.ring(POST.x, POST.y, POST.r, LAMP.z - 8, P, 24), { tone: "lo" }));
  out.push(L(k.ring(POST.x, POST.y, POST.r, BASE_Z + 7, P, 24), { tone: "lo" }));
  out.push(D([at([POST.x + POST.r, POST.y, BASE_Z + 16]), at([POST.x + POST.r, POST.y, BASE_Z + 34])], { size: 0.4 }));

  out.push(`<g data-lamp data-on="0">`);
  const lampAt = k.iso([POST.x, POST.y, LAMP.z + 12], P);
  out.push(`<circle class="lamp-glow" data-glow cx="${lampAt[0]}" cy="${lampAt[1]}" r="30"/>`);
  out.push(S(k.cylinder(POST.x, POST.y, 11.6, LAMP.z, 3.2, P, 28), { tone: "lo" }));
  out.push(L(k.ring(POST.x, POST.y, 11.6, LAMP.z + 3.2, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(POST.x, POST.y, 10, LAMP.z + 3.2, 2.4, P, 28), { tone: "mid" }));
  out.push(L(k.ring(POST.x, POST.y, 10, LAMP.z + 5.6, P, 28), { tone: "hi" }));
  out.push(S(k.cylinder(POST.x, POST.y, 9, LAMP.z + 5.6, 12, P, 28), { tone: "hi", className: "glass" }));
  for (const z of [LAMP.z + 8, LAMP.z + 11.6, LAMP.z + 15.2]) {
    out.push(L(k.ring(POST.x, POST.y, 9.5, z, P, 28), { tone: "lo" }));
  }
  out.push(S(k.cylinder(POST.x, POST.y, 10, LAMP.z + 17.6, 2.4, P, 28), { tone: "mid" }));
  out.push(L(k.ring(POST.x, POST.y, 10, LAMP.z + 20, P, 28), { tone: "hi" }));
  out.push(S(k.cylinder(POST.x, POST.y, 6, LAMP.z + 20, 1.4, P, 22), { tone: "mid" }));
  out.push(D([at([POST.x, POST.y, LAMP.z + 21.6])], { size: 0.55, tone: "hi" }));
  out.push("</g>");
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Приборная стойка с наклонной панелью и шестью стрелочными индикаторами: время ответа, запросы в секунду, загрузка процессора, память, диск и ошибки. У каждого индикатора своя шкала и красная отметка порога. Под панелью полка с кнопкой снятия нагрузки, на передней грани маховик нагрузки, справа лента самописца с пером, позади панели лампа тревоги.",
  body: [plate(), lamp(), cabinet(), panel(), dials(), ledge(), button(), wheel(), recorder()],
});

const live = `
const P = ${JSON.stringify(P)};
const PANEL = ${JSON.stringify({ y0: PANEL.y0, y1: PANEL.y1, zB: PANEL.zB, zF: PANEL.zF })};
const DIALS = ${JSON.stringify(DIALS)};
const SERIES = ${JSON.stringify(SERIES)};
const STEP_READOUTS = ${JSON.stringify(STEPS.map((step) => step.readout))};
const STEP_LABELS = ${JSON.stringify(STEPS.map((step) => step.label))};
const WHEEL = ${JSON.stringify({ x: WHEEL.x, z: WHEEL.z, rOut: WHEEL.rOut, rIn: WHEEL.rIn, hub: WHEEL.hub })};
const WHEEL_Y = ${WHEEL_Y};
const PAPER = ${JSON.stringify(PAPER)};
const PAPER_TOP = ${PAPER_TOP};
const TRACE_SPEED = 11;
const RELIEF = ${SERIES.findIndex((step) => step.key === "relief")};
const N = STEP_READOUTS.length;
const RAD = Math.PI / 180;

const stage = document.querySelector(".iso-stage");
const root = stage.querySelector("svg");
const needles = Array.from(root.querySelectorAll("[data-needle]"));
const wheelGroup = root.querySelector("[data-wheel]");
const penGroup = root.querySelector("[data-pen]");
const traceEl = root.querySelector("[data-trace]");
const lampGroup = root.querySelector("[data-lamp]");
const glowEl = root.querySelector("[data-glow]");
const buttonGroup = root.querySelector("[data-button]");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const ease = (current, target, tau, dt) => {
  const next = current + (target - current) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 0.002 ? target : next;
};
const panelZ = (y) => PANEL.zB + ((y - PANEL.y0) * (PANEL.zF - PANEL.zB)) / (PANEL.y1 - PANEL.y0);
const wheelIso = (angle, radius, y = WHEEL_Y) =>
  iso([WHEEL.x + radius * Math.cos(angle * RAD), y, WHEEL.z + radius * Math.sin(angle * RAD)], P);

const needlePath = (gauge, angle) => {
  const dirX = Math.sin(angle * RAD);
  const dirY = -Math.cos(angle * RAD);
  const perX = Math.cos(angle * RAD);
  const perY = Math.sin(angle * RAD);
  const point = (along, side) => {
    const x = gauge.x + dirX * along + perX * side;
    const y = gauge.y + dirY * along + perY * side;
    return iso([x, y, panelZ(y)], P);
  };
  const blade = pathOf([point(gauge.r - 6, 0), point(1.5, 1.5), point(1.5, -1.5)], true);
  const tail = pathOf([point(-1.4, 1.8), point(-5.6, 1), point(-5.6, -1), point(-1.4, -1.8)], true);
  return blade + tail;
};

const spokePath = (angle) => {
  const dirX = Math.cos(angle * RAD);
  const dirZ = Math.sin(angle * RAD);
  const perX = -Math.sin(angle * RAD);
  const perZ = Math.cos(angle * RAD);
  const point = (along, side) =>
    iso([WHEEL.x + dirX * along + perX * side, WHEEL_Y - 0.5, WHEEL.z + dirZ * along + perZ * side], P);
  return pathOf([point(2.6, 1.5), point(WHEEL.rIn, 1.9), point(WHEEL.rIn, -1.9), point(2.6, -1.5)], true);
};

const toothPath = (angle) => {
  const dirX = Math.cos(angle * RAD);
  const dirZ = Math.sin(angle * RAD);
  const perX = -Math.sin(angle * RAD);
  const perZ = Math.cos(angle * RAD);
  const point = (along, side) =>
    iso([WHEEL.x + dirX * along + perX * side, WHEEL_Y - 0.7, WHEEL.z + dirZ * along + perZ * side], P);
  return pathOf(
    [point(WHEEL.rIn + 1, 2.6), point(WHEEL.rOut + 0.6, 1.4), point(WHEEL.rOut + 0.6, -1.4), point(WHEEL.rIn + 1, -2.6)],
    true,
  );
};

let step = 0;
let shown = SERIES[0].values.slice();
let shownLoad = SERIES[0].load;
let samples = [];
for (let index = 24; index >= 1; index--) {
  samples.push({ at: -index * 0.5, value: SERIES[0].values[0] / DIALS[0].max });
}
let clock = 0;
let sampleAt = 0;
let frame = 0;
let last = 0;
let touring = true;
let visible = false;
let idleTimer = 0;
let wheelAt = null;
const tourAt = (time) => Math.floor(time / 3.6) % N;

const traceX = (value) => PAPER.x + 8 + value * (PAPER.w - 16);
const traceY = (sample) => PAPER.y + 8 + (clock - sample.at) * TRACE_SPEED;

function paint(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring && visible) {
    clock += dt;
    const want = tourAt(clock);
    if (want !== step) step = want;
  }

  const target = SERIES[step];
  for (let index = 0; index < DIALS.length; index++) {
    shown[index] = calm ? target.values[index] : ease(shown[index], target.values[index], 0.42, dt);
  }
  shownLoad = calm ? target.load : ease(shownLoad, target.load, 0.5, dt);

  let hot = false;
  for (let index = 0; index < DIALS.length; index++) {
    const gauge = DIALS[index];
    const value = shown[index];
    const angle = -120 + 240 * clamp(value / gauge.max, 0, 1);
    const body = needles[index].querySelector(".needle-body");
    const d = needlePath(gauge, angle);
    if (body.getAttribute("d") !== d) body.setAttribute("d", d);
    const zone = value >= gauge.red - gauge.max * 0.004 ? "hot" : value >= gauge.red * 0.7 ? "warn" : "ok";
    if (needles[index].dataset.zone !== zone) needles[index].dataset.zone = zone;
    if (zone === "hot") hot = true;
  }

  const wheelAngle = -150 + 300 * clamp(shownLoad, 0, 1);
  if (wheelAt === null || Math.abs(wheelAngle - wheelAt) > 0.15) {
    wheelAt = wheelAngle;
    let markup = "";
    for (let spoke = 0; spoke < 3; spoke++) {
      markup += '<path class="spoke" d="' + spokePath(wheelAngle + spoke * 120) + '"/>';
    }
    markup += '<path class="tooth" d="' + toothPath(wheelAngle) + '"/>';
    wheelGroup.innerHTML = markup;
  }

  if (clock - sampleAt > 0.09 || samples.length === 0) {
    sampleAt = clock;
    samples.push({ at: clock, value: clamp(shown[0] / DIALS[0].max, 0, 1) });
    samples = samples.filter((sample) => traceY(sample) < PAPER.y + PAPER.d - 4);
  }
  const trace = pathOf(
    samples.map((sample) =>
      iso([traceX(sample.value), clamp(traceY(sample), PAPER.y + 4, PAPER.y + PAPER.d - 4), PAPER_TOP + 0.12], P),
    ),
  );
  if (traceEl.getAttribute("d") !== trace) traceEl.setAttribute("d", trace);

  const penShift = traceX(clamp(shown[0] / DIALS[0].max, 0, 1)) - traceX(0);
  penGroup.setAttribute("transform", translateAlong(P, [penShift, 0, 0]));

  if (lampGroup.dataset.on !== (hot ? "1" : "0")) lampGroup.dataset.on = hot ? "1" : "0";

  const pressed = step === RELIEF && !calm ? -1.6 : 0;
  buttonGroup.setAttribute("transform", translateAlong(P, [0, 0, pressed]));

  const text = STEP_READOUTS[step];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(step));
  stage.setAttribute("aria-valuetext", "шаг " + (step + 1) + " из " + N + ": " + STEP_LABELS[step] + ", " + STEP_READOUTS[step]);
  stage.dataset.alarm = hot ? "1" : "0";
}

function tick(now) {
  paint(now);
  const settled =
    !touring &&
    DIALS.every((gauge, index) => Math.abs(shown[index] - SERIES[step].values[index]) < 0.002) &&
    Math.abs(shownLoad - SERIES[step].load) < 0.002;
  frame = visible && (touring || !settled) ? requestAnimationFrame(tick) : 0;
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
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    touring = !still.matches;
    clock = 0;
    sampleAt = 0;
    run();
  }, 3600);
  run();
};

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

if (still.matches) touring = false;

let swipeFrom = null;
stage.addEventListener("pointerdown", (event) => {
  swipeFrom = { x: event.clientX, y: event.clientY, at: performance.now() };
});
stage.addEventListener("pointerup", (event) => {
  if (!swipeFrom) return;
  const dx = event.clientX - swipeFrom.x;
  const dy = event.clientY - swipeFrom.y;
  const quick = performance.now() - swipeFrom.at < 800;
  swipeFrom = null;
  if (quick && Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) {
    steer(step + (dx < 0 ? 1 : -1));
  }
});
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = root.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  steer(Math.min(N - 1, Math.floor(share * N)));
});
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

paint(performance.now());
`;

const css = `<style>
body.iso{--field-warn:#d8a13c;--paper-face:#2c2c2c;--dial-face:#1e1e1e}
body[data-theme="light"].iso{--field-warn:#a8760c;--paper-face:#ffffff;--dial-face:#f6f6f3;--anatomy-mid:#6f6f75;--anatomy-lo:#a2a2a7;--anatomy-faint:#c6c6ca}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.dial-face{fill:var(--dial-face)}
.dial-hub{fill:var(--dial-face);stroke:none}
.bezel .iso-shade{fill:var(--anatomy-shade-1)}
.iso-line.zc-ok{stroke:var(--anatomy-green);stroke-width:2;stroke-linecap:butt}
.iso-line.zc-warn{stroke:var(--field-warn);stroke-width:2;stroke-linecap:butt}
.iso-line.zc-hot{stroke:var(--anatomy-red);stroke-width:2;stroke-linecap:butt}
.iso-line.thr{stroke:var(--anatomy-red);stroke-width:2.2;stroke-linecap:butt}
.iso-line.glass{stroke:var(--anatomy-mid);opacity:.55}
.needle-body{fill:var(--anatomy-lit);stroke:var(--anatomy-lit);stroke-width:.4;stroke-linejoin:round}
[data-zone="warn"]>.needle-body{fill:var(--field-warn);stroke:var(--field-warn)}
[data-zone="hot"]>.needle-body{fill:var(--anatomy-red);stroke:var(--anatomy-red)}
.spoke{fill:var(--anatomy-hi);stroke:var(--anatomy-hi);stroke-width:.4;stroke-linejoin:round}
.tooth{fill:var(--anatomy-red);stroke:var(--anatomy-red);stroke-width:.4;stroke-linejoin:round}
.trace{fill:none;stroke:var(--anatomy-red);stroke-width:1.2;stroke-linejoin:round;stroke-linecap:round}
.btn-cap .iso-top{fill:var(--anatomy-red)}
.btn-cap .iso-edge{stroke:var(--anatomy-red)}
.btn-cap .iso-shade{fill:var(--anatomy-red);opacity:.72}
.led .iso-top{fill:var(--anatomy-green)}
.led-hot .iso-top{fill:var(--anatomy-red)}
[data-lamp] .glass .iso-top,[data-lamp] .glass .iso-fill{fill:var(--anatomy-red);opacity:.34}
[data-lamp] .glass .iso-edge{stroke:var(--anatomy-red);opacity:.55}
[data-lamp][data-on="1"] .glass .iso-top,[data-lamp][data-on="1"] .glass .iso-fill{opacity:1}
[data-lamp][data-on="1"] .glass .iso-edge{opacity:1}
.lamp-glow{fill:var(--anatomy-red);opacity:0;filter:blur(9px);transition:opacity .4s ease}
[data-lamp][data-on="1"] .lamp-glow{opacity:.42}
body[data-theme="light"] [data-lamp][data-on="1"] .lamp-glow{opacity:.26}
.paper .iso-top{fill:var(--paper-face)}
.paper .iso-edge{stroke:var(--anatomy-mid)}
.nib .iso-top{fill:var(--anatomy-red)}
@media (max-width:560px){
.iso-plate{padding-bottom:92px}
.iso-plate-corner[data-corner="readout"]{font-size:9px;bottom:46px}
.iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px;right:0;white-space:normal;line-height:1.35}
}
@media (prefers-reduced-motion:reduce){
.lamp-glow{transition:none}
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
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: шаги нагрузки на приборной панели" aria-valuemin="0" aria-valuemax="${
      STEPS.length - 1
    }" aria-valuenow="0">${svg}</div>`,
  });

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, width: 700, body, script: kitScript() + live }));
  console.log("wrote", name);
}
