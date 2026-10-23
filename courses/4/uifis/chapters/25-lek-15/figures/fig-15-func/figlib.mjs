import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import * as T from "../../../../../../_anatomy/kit/tube.mjs";

// Мир: x и y по плите, z вверх. Камера смотрит с +x, +y.
// Слева вход, справа выход, сверху управление, снизу механизмы.

export const WIDTH = 680;
export const HEIGHT = 470;

// Плита на ножках.
export const PLATE = { x: -140, y: -85, w: 280, d: 170, r: 11 };
export const PLATE_H = 14;
export const FOOT_H = 5;

// Пьедестал, на нём кассета с подпроцессами.
export const PLINTH = { x: -98, y: -70, w: 196, d: 140, r: 8 };
export const PLINTH_H = 16;

export const CASSETTE = { x: -80, y: -48, w: 160, d: 96, r: 4 };
export const CASS_Z0 = 16;
export const CASS_Z1 = 26;

// Корпус: четыре низкие панели (фартуки) и высокий кожух-крышка.
export const APRON_Z0 = 26;
export const APRON_Z1 = 46;
export const APRON_T = 6;
export const APRON_SLIDE = 14;
export const BACK_SLIDE = 12;
export const CASE = { x0: -90, x1: 90, y0: -62, y1: 62 };
export const COVER = { x: -96, y: -68, w: 192, d: 136, r: 10 };
export const COVER_Z0 = 46;
export const COVER_TOP = 80;
export const COVER_H = 10;
export const COVER_LIFT = 38;
export const EARS = [
  [-98, -70],
  [98, -70],
  [-98, 70],
  [98, 70],
];
export const EYE = { x: 0, y: -36 };
export const POSTS = EARS;
export const POST_R = 3.6;
export const POST_TOP = 132;

// Внутри: четыре подпроцесса и журнальный лоток.
export const SUB_X = [-54, -18, 18, 54];
export const SUB = { w: 26, d: 36, z0: 26, z1: 48 };
export const SUB_KEYS = ["check", "approve", "write", "notice"];
export const FLOW_Z = 42;
export const PIPE_Z = 40;
export const PY = [-10, 0, 10];
export const JOURNAL = { x: -66, y: 29, w: 132, d: 11 };
export const JOURNAL_TOP = 37;
export const PAPER_Z = 36.4;

// Внешние узлы: патрубки входа и выхода, механизмы, колонна управления.
export const TOWER_IN = { x: -118, y: 66, w: 18, d: 18, r: 3 };
export const TOWER_OUT = { x: 120, y: -17, w: 16, d: 34, r: 3 };
export const TOWER_Z = 56;
export const MECH = [
  { x: -58, y: 62, w: 30, d: 9 },
  { x: -15, y: 62, w: 30, d: 9 },
  { x: 28, y: 62, w: 30, d: 9 },
];
export const MECH_Z = 16;
export const PULLEY = { y: 71, z: 9, r: 4.6 };
export const COLUMN = { x: -60, y: -80, r: 3.2 };
export const COLUMN_TOP = 96;
export const CONTROL_Z = 42;
export const RAIL = { x: -58, y: -52, w: 116, d: 5, z0: 58, z1: 62 };
export const LABEL = { x: 88, y: 70, w: 44, d: 12, r: 1.2 };
export const RULER = { x: -136, y: -75, w: 6, d: 150 };

export const pts = [];
const addBox = (plan, z0, z1) => pts.push(...k.boxCorners(plan, z0, z1));
addBox(PLATE, -PLATE_H - FOOT_H, 0);
addBox(PLINTH, 0, PLINTH_H);
addBox(CASSETTE, CASS_Z0, CASS_Z1);
addBox({ x: CASE.x0, y: CASE.y0, w: CASE.x1 - CASE.x0, d: CASE.y1 - CASE.y0 }, APRON_Z0, APRON_Z1);
addBox(COVER, COVER_Z0 + COVER_LIFT, COVER_TOP + COVER_H + COVER_LIFT);
for (const m of MECH) addBox(m, 0, MECH_Z);
addBox(TOWER_IN, 0, TOWER_Z);
addBox(TOWER_OUT, 0, TOWER_Z);
for (const [x, y] of POSTS) pts.push([x + POST_R, y, POST_TOP + 3], [x - POST_R, y, POST_TOP + 3]);
for (const [x, y] of EARS) pts.push([x, y, COVER_TOP + COVER_H + COVER_LIFT + 2]);
pts.push([COLUMN.x, COLUMN.y, COLUMN_TOP + 16]);
pts.push([LABEL.x, LABEL.y, 2], [LABEL.x + LABEL.w, LABEL.y + LABEL.d, 2]);
pts.push([-60, 62, 44], [60, 62, 44], [-60, -62, 62], [60, -62, 62]);

export const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 18, azimuth: 40, elevation: 30 });
export const VIEW = G.viewOf(P);
export const TAU = Math.PI * 2;

export const at = (point) => k.iso(point, P);
export const S = (paths, style) => k.solidSvg(paths, style);
export const L = (d, style) => k.lineSvg(d, style);
export const D = (dots, style) => k.dotsSvg(dots, style);
export const byDepth = (list) =>
  [...list].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Труба: куски с настоящими торцами.
export function tube(points, r, { tone = "hi", maxLength = 20, spacing = 1.5, rings = null, className } = {}) {
  const pieces = T.tubePieces(points, r, P, { maxLength, spacing, rings });
  const body = pieces.map((piece) => T.tubeSvg(piece, { tone })).join("");
  return className ? `<g class="${className}">${body}</g>` : body;
}

// Труба по ломаной со скруглёнными поворотами.
export function pipe(points, r, { radius = 5, ...options } = {}) {
  const route = points.length > 2 ? G.fillet(points, radius, 6, { P, tube: r, margin: 1.4 }) : points;
  return tube(route, r, options);
}

export function collar(center, axis, r, t, { tone = "hi", className = "collar" } = {}) {
  const end = add(center, mul(axis, t));
  return `<g class="${className}">${tube([center, end], r, { tone, maxLength: t * 1.4, spacing: 1 })}</g>`;
}

export const faceCircle = (center, axis, r, tone = "lo") =>
  L(G.circleOf(G.frameAlong(center, axis), 0, r, P), { tone });

export const faceDisc = (center, axis, s0, s1, r, tone = "mid") =>
  S(G.disc(s0, s1, r, G.frameAlong(center, axis), P), { tone });

export const faceRing = (center, axis, s0, s1, rIn, rOut, tone = "mid") =>
  S(G.ringBand(s0, s1, rIn, rOut, G.frameAlong(center, axis), P), { tone });

export function bolts(face, axis, r, count, { size = 0.42, phase = 0.4 } = {}) {
  if (G.dot3(axis, VIEW) < 0.12) return "";
  const F = G.frameAlong(face, axis);
  const points = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * TAU;
    points.push(at(add(add(face, mul(F.u, Math.cos(a) * r)), add(mul(F.v, Math.sin(a) * r), mul(axis, 0.08)))));
  }
  return D(points, { size });
}

export function helix(cx, cy, z0, z1, r, turns, { step = 0.03 } = {}) {
  const back = [];
  const front = [];
  let run = [];
  let near = null;
  for (let t = 0; t <= turns; t += step) {
    const a = t * TAU;
    const z = z0 + ((z1 - z0) * t) / turns;
    const point = at([cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
    const facing = k.depthOf([Math.cos(a), Math.sin(a), 0], P) > 0;
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(point);
      (near ? front : back).push(k.pathOf(run));
      run = [point];
      near = facing;
      continue;
    }
    run.push(point);
  }
  (near ? front : back).push(k.pathOf(run));
  return { back: back.join(""), front: front.join("") };
}

// Полоса бумаги в плоскости y-z, ширина вдоль x.
export function webBand(points, half) {
  const left = points.map(([x, y, z]) => [x - half, y, z]);
  const right = points.map(([x, y, z]) => [x + half, y, z]);
  const outline = [...left.map(at), ...right.slice().reverse().map(at)];
  const edges = k.pathOf(left.map(at)) + k.pathOf(right.map(at));
  return { outline: k.pathOf(outline, true), edges };
}

export function ringTicks(cx, cy, r0, r1, z, count, phase, { tone = "lo" } = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * TAU;
    out.push(k.lineOnTop([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], z, P));
  }
  return L(out.join(""), { tone });
}

// Прямоугольник на произвольной плоскости: origin + u * w + v * h.
export function faceQuad(origin, u, v, w, h, { inset = 0, chamfer = 0 } = {}) {
  const pt = (a, b) => at(add(add(origin, mul(u, a)), mul(v, b)));
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  const c = Math.min(chamfer, (x1 - x0) / 3, (y1 - y0) / 3);
  const ring = c
    ? [
        [x0 + c, y0],
        [x1 - c, y0],
        [x1, y0 + c],
        [x1, y1 - c],
        [x1 - c, y1],
        [x0 + c, y1],
        [x0, y1 - c],
        [x0, y0 + c],
      ]
    : [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ];
  return k.pathOf(ring.map(([a, b]) => pt(a, b)), true);
}

// Пластина на произвольной плоскости: призма вдоль нормали.
export function facePlate(origin, u, v, normal, w, h, t, { tone = "mid", round = 2, steps = 5 } = {}) {
  const d = Math.max(0.001, Math.min(round, w / 2, h / 2));
  const ring = [];
  const corner = (cx, cy, start) => {
    for (let i = 0; i <= steps; i++) {
      const a = start + (Math.PI / 2) * (i / steps);
      ring.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]);
    }
  };
  corner(w - d, d, -Math.PI / 2);
  corner(w - d, h - d, 0);
  corner(d, h - d, Math.PI / 2);
  corner(d, d, Math.PI);
  const F = G.frameOf(origin, normal, u, v);
  return S(G.prismOf(F, ring, 0, t, P), { tone });
}
