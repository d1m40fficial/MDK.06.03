import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, STEPS, BUTTONS } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 640;
const HEIGHT = 470;

// Пульт оператора: станина на ножках, наклонная консоль, экран, строка
// сообщения, ряд крупных кнопок в дуге досягаемости, мелкие ручки по краям,
// красная кнопка под прозрачной крышкой, лампа обратной связи, клавиатура на
// полке и фигурка оператора, которая тянется рукой к элементу.

const PLINTH = { x: -46, y: -24, w: 92, d: 48, r: 7 };
const PED = { x: -42, y: -19, w: 84, d: 38, r: 4.5 };
const HEAD = { x0: -42, x1: 42, yF: 18, yB: -12, zBot: 38, zLip: 40, zTop: 49 };
const PANEL = { yF: 18, zF: 40, depth: 30, rise: 9, u0: -38, u1: 38 };
const FACE = PED.y + PED.d; // передняя плоскость станины, y = 19

const PL = Math.hypot(PANEL.depth, PANEL.rise);
const SLOPE = [0, -PANEL.depth / PL, PANEL.rise / PL];
const NORM = [0, PANEL.rise / PL, PANEL.depth / PL];
const SURF = 1.6; // толщина накладки пульта

const p3 = (u, s, h = 0) => [
  u,
  PANEL.yF + SLOPE[1] * s + NORM[1] * h,
  PANEL.zF + SLOPE[2] * s + NORM[2] * h,
];
const pj = (u, s, h = 0) => k.iso(p3(u, s, h), P);

/* ---------- раскладка пульта ---------- */
const BUTTONS_X = [-16.5, -5.5, 5.5, 16.5];
const BUTTON_S = 9.5;
const BUTTON_R = 3.2;
const RED = { u: 30, s: 11, r: 6.5 };
const LAMP = { u: -33.5, s: 21, r: 3.4 };
const KNOBS = [
  { u: -33.5, s: 13, r: 3.2 },
  { u: 34, s: 26, r: 3.2 },
  { u: 34, s: 21, r: 2.6 },
];
const TOGGLE = { u: -33.5, s: 5.5 };
const ARC = { u: 0, s: 3, rx: 30, ry: 12.5 };
const SCREEN = { u0: -30, u1: 30, s0: 21, s1: 31 };
const MSG = { u0: -28, u1: 28, s0: 16, s1: 20.4 };
const LID = { u0: 23, s0: 3.6, w: 14, d: 14.8, h: 6.2 };
const TRAY = { x: -26, y: 19, w: 34, d: 11, z: 30, h: 2.4 };
const KEY = { x0: -23, y0: 20.6, cols: 10, rows: 5, px: 2.8, py: 1.5, w: 2.2, d: 1.1 };
const CONTRAST = { x: -8, w: 4, gap: 5.2, n: 6 };
const OPERATOR = { y: 35 };

const pts = [
  ...k.boxCorners(PLINTH, 0, 8),
  [HEAD.x1, HEAD.yF, HEAD.zLip],
  [HEAD.x0, HEAD.yB, HEAD.zTop],
  [HEAD.x1, HEAD.yB, HEAD.zTop],
  [LAMP.u - 7, -12, 54],
  [-32, 34, 0],
  [30, 34, 0],
  [24, 30, 0],
];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 18, azimuth: 40, elevation: 30 });

const SO = (paths, style) => k.solidSvg(paths, style);
const LN = (d, style) => k.lineSvg(d, style);
const DT = (points, style) => k.dotsSvg(points, style);
const at = (p) => k.iso(p, P);
const f1 = (v) => Math.round(v * 10) / 10;

const area2 = (ring) => {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};

// Выдавливание кольца в экранных координатах: нижнее и верхнее кольцо в 3D.
function shell(base, top, cls = "") {
  const b = base.map((p) => k.iso(p, P));
  const t = top.map((p) => k.iso(p, P));
  const sign = Math.sign(area2(t)) || 1;
  let out = `<g class="pf ${cls}">`;
  for (let i = 0; i < b.length; i++) {
    const j = (i + 1) % b.length;
    const quad = [b[i], b[j], t[j], t[i]];
    if (Math.sign(area2(quad)) === -sign) out += `<path class="pf-side" d="${k.pathOf(quad, true)}"/>`;
  }
  out += `<path class="pf-top" d="${k.pathOf(t, true)}"/></g>`;
  return out;
}

const ring3 = (cu, cs, r, h, n = 26) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return p3(cu + r * Math.cos(a), cs + r * Math.sin(a), h);
  });

const ringAtFlat = (x0, x1, z0, z1, y) => [
  [x0, y, z0],
  [x1, y, z0],
  [x1, y, z1],
  [x0, y, z1],
];

const puck = (cu, cs, r, h0, h1, cls = "", n = 26) => shell(ring3(cu, cs, r, h0, n), ring3(cu, cs, r, h1, n), cls);

const quad3 = (u0, u1, s0, s1, h) => [p3(u0, s0, h), p3(u1, s0, h), p3(u1, s1, h), p3(u0, s1, h)];

const planeQuad = (u0, u1, s0, s1, h, cls = "") =>
  `<path class="pf-top ${cls}" d="${k.pathOf(quad3(u0, u1, s0, s1, h).map((p) => k.iso(p, P)), true)}"/>`;

const planeLine = (points, h, cls, style = {}) =>
  LN(k.pathOf(points.map(([u, s]) => pj(u, s, h))), { className: cls, ...style });

const faceQuad = (x0, x1, z0, z1, y, cls) =>
  `<path class="${cls}" d="${k.pathOf(ringAtFlat(x0, x1, z0, z1, y).map((p) => k.iso(p, P)), true)}"/>`;

const faceCircle = (cx, cz, r, y, cls, n = 18) =>
  `<path class="${cls}" d="${k.pathOf(
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return k.iso([cx + r * Math.cos(a), y, cz + r * Math.sin(a)], P);
    }),
    true,
  )}"/>`;

const sideQuad = (x, y0, y1, z0, z1, cls) =>
  `<path class="${cls}" d="${k.pathOf(
    [
      [x, y0, z0],
      [x, y1, z0],
      [x, y1, z1],
      [x, y0, z1],
    ].map((p) => k.iso(p, P)),
    true,
  )}"/>`;

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function faceText(matrix, text, { size = 3, tone = "hi", anchor = "start", attr = "" } = {}) {
  return `<text class="iso-face-text" data-tone="${tone}" transform="${matrix}" font-size="${size}" text-anchor="${anchor}"${attr}>${esc(text)}</text>`;
}

// Плоскость пульта: строка идёт вдоль u, строки вниз к оператору.
function planeMatrix(u, s, h) {
  const o = pj(u, s, h);
  const a = pj(u + 1, s, h);
  const b = pj(u, s - 1, h);
  return `matrix(${f1(a[0] - o[0])} ${f1(a[1] - o[1])} ${f1(b[0] - o[0])} ${f1(b[1] - o[1])} ${f1(o[0])} ${f1(o[1])})`;
}

const planeText = (u, s, h, text, opts) => faceText(planeMatrix(u, s, h), text, opts);

/* ---------- станина ---------- */
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLINTH, 0, 8, P)}"/>`];
  for (const [x, y] of k.corners(PLINTH, 11)) {
    out.push(SO(k.cylinder(x, y, 4.8, 0, 2, P, 26), { tone: "lo" }));
    out.push(SO(k.cylinder(x, y, 3.8, 2, 1.2, P, 24), { tone: "mid" }));
  }
  out.push(SO(k.slabOf(PLINTH, 2, 6, P, 8, 1.4), { tone: "mid" }));
  out.push(LN(k.planOutline(k.insetPlan(PLINTH, 3.2), 8, P, 8), { tone: "faint" }));
  out.push(DT(k.corners(PLINTH, 8).map(([x, y]) => at([x, y, 8])), { size: 0.5, tone: "mid" }));
  out.push(SO(k.slabOf(PED, 8, 30, P, 6, 1.6), { tone: "mid" }));
  out.push(LN(k.sideSeam(PED, 8, P, 6), { tone: "faint" }));
  out.push(LN(k.planOutline(k.insetPlan(PED, 2.6), 8, P, 6), { tone: "faint" }));

  const plate = (x0, x1, z0, z1, raise, cls) =>
    shell(ringAtFlat(x0, x1, z0, z1, FACE + 0.05), ringAtFlat(x0, x1, z0, z1, FACE + 0.05 + raise), cls);

  // заводская табличка
  out.push(plate(-36, -16, 26, 33.4, 0.8, "p-label"));
  out.push(faceText(k.sideMatrix([-34.6, FACE + 0.9], 31.4, P, "left"), "пульт оператора", { size: 2.1, tone: "hi" }));
  for (let i = 0; i < 3; i++) {
    const len = [11, 13.6, 8.4][i];
    out.push(
      LN(k.segment([-34.6, FACE + 0.92, 29.2 - i * 1.6], [-34.6 + len, FACE + 0.92, 29.2 - i * 1.6], P), {
        tone: "faint",
        free: true,
      }),
    );
  }
  out.push(DT([at([-17.4, FACE + 0.9, 32.4])], { size: 0.45 }));

  // шкала контраста
  out.push(plate(-10, 26, 21.4, 29.4, 0.7, "p-scale"));
  for (let i = 0; i < CONTRAST.n; i++) {
    const x = CONTRAST.x + i * CONTRAST.gap;
    out.push(faceQuad(x, x + CONTRAST.w, 24, 27.6, FACE + 0.78, `sw sw-${i}`));
  }
  const scaleM = k.sideMatrix([-8.6, FACE + 0.9], 22.3, P, "left");
  out.push(faceText(scaleM, "контраст", { size: 1.9, tone: "mid" }));
  out.push(faceText(k.sideMatrix([3.6, FACE + 0.9], 22.3, P, "left"), "4,5:1", { size: 1.9, tone: "mid" }));
  out.push(faceText(k.sideMatrix([17.6, FACE + 0.9], 22.3, P, "left"), "7:1", { size: 1.9, tone: "mid" }));
  out.push(
    `<g data-marker transform="${k.translateAlong(P, [CONTRAST.gap * 3, 0, 0])}">${shell(
      ringAtFlat(CONTRAST.x + 0.3, CONTRAST.x + CONTRAST.w - 0.3, 28, 29, FACE + 0.74),
      ringAtFlat(CONTRAST.x + 0.3, CONTRAST.x + CONTRAST.w - 0.3, 28, 29, FACE + 1.5),
      "p-mark",
    )}</g>`,
  );

  // дверца и ручка
  out.push(
    LN(
      k.pathOf(
        [
          [-14, FACE + 0.06, 11],
          [10, FACE + 0.06, 11],
          [10, FACE + 0.06, 18.6],
          [-14, FACE + 0.06, 18.6],
        ].map((p) => k.iso(p, P)),
        true,
      ),
      { tone: "faint" },
    ),
  );
  out.push(faceQuad(2.2, 5.2, 14.4, 15.4, FACE + 0.06, "handle"));
  out.push(faceCircle(9, 14.9, 0.8, FACE + 0.06, "screw-ring"));
  out.push(DT([at([9, FACE + 0.06, 14.9])], { size: 0.3 }));

  // вентиляционные щели
  for (let i = 0; i < 5; i++) {
    const z = 23.6 + i * 1.5;
    out.push(`<path class="vent" d="${k.segment([13, FACE + 0.06, z], [33, FACE + 0.06, z + 0.45], P)}"/>`);
  }
  out.push(
    LN(
      [0, 1, 2, 3, 4].map((i) => k.segment([13, FACE + 0.3, 23 + i * 1.5], [33, FACE + 0.3, 23.45 + i * 1.5], P)).join(""),
      { tone: "faint" },
    ),
  );
  for (const [x, z] of [
    [-38.5, 11],
    [37.5, 11],
    [-38.5, 35],
    [37.5, 35],
  ]) {
    out.push(faceCircle(x, z, 1.25, FACE + 0.05, "screw-ring"));
    out.push(faceQuad(x - 1.1, x + 1.1, z - 0.18, z + 0.18, FACE + 0.06, "screw-slot"));
  }

  // правый бок станины: ниша и крепёж
  const SIDE = PED.x + PED.w;
  out.push(sideQuad(SIDE + 0.04, -10, 9, 14, 33, "side-panel"));
  out.push(sideQuad(SIDE + 0.05, -8.4, 7.4, 15.4, 31.6, "side-line"));
  for (const [y, z] of [
    [-8, 16],
    [7, 16],
    [-8, 31],
    [7, 31],
  ]) {
    out.push(faceCircle(SIDE + 0.06, z, 0.9, y, "screw-ring", 14));
  }
  out.push(sideQuad(SIDE + 0.05, 11, 17, 10, 13, "side-slot"));
  out.push(sideQuad(SIDE + 0.05, 11, 17, 14.6, 17.6, "side-slot"));
  return out.join("");
}

/* ---------- голова консоли ---------- */
function headUnit() {
  const out = [];
  const face = (points, cls) => `<path class="${cls}" d="${k.pathOf(points.map((q) => k.iso(q, P)), true)}"/>`;
  out.push(
    face(
      [
        [HEAD.x0, HEAD.yF, HEAD.zLip],
        [HEAD.x1, HEAD.yF, HEAD.zLip],
        [HEAD.x1, HEAD.yB, HEAD.zTop],
        [HEAD.x0, HEAD.yB, HEAD.zTop],
      ],
      "slope",
    ),
  );
  out.push(
    face(
      [
        [HEAD.x1, HEAD.yF, HEAD.zBot],
        [HEAD.x1, HEAD.yF, HEAD.zLip],
        [HEAD.x1, HEAD.yB, HEAD.zTop],
        [HEAD.x1, HEAD.yB, HEAD.zBot],
      ],
      "head-end",
    ),
  );
  out.push(
    face(
      [
        [HEAD.x0, HEAD.yF, HEAD.zBot],
        [HEAD.x1, HEAD.yF, HEAD.zBot],
        [HEAD.x1, HEAD.yF, HEAD.zLip],
        [HEAD.x0, HEAD.yF, HEAD.zLip],
      ],
      "head-front",
    ),
  );
  out.push(LN(k.segment([HEAD.x0, HEAD.yF, HEAD.zBot], [HEAD.x1, HEAD.yF, HEAD.zBot], P), { tone: "faint" }));
  out.push(LN(k.segment([HEAD.x1, HEAD.yF, HEAD.zBot], [HEAD.x1, HEAD.yF, HEAD.zLip], P), { tone: "mid" }));
  out.push(LN(k.segment([HEAD.x0, HEAD.yB, HEAD.zTop], [HEAD.x1, HEAD.yB, HEAD.zTop], P), { tone: "hi" }));
  out.push(LN(k.segment([HEAD.x1, HEAD.yB, HEAD.zTop], [HEAD.x1, HEAD.yB, HEAD.zBot], P), { tone: "faint" }));

  // правый торец головы: швы и табличка
  out.push(sideQuad(HEAD.x1 + 0.05, -10, 16, 41.5, 42.1, "side-line"));
  out.push(sideQuad(HEAD.x1 + 0.05, -10, 16, 45.5, 46.1, "side-line"));
  out.push(sideQuad(HEAD.x1 + 0.05, 2, 12, 42.6, 45, "side-slot"));
  for (const [y, z] of [
    [-9, 39.6],
    [15, 39.6],
    [-9, 48.2],
    [15, 48.2],
  ]) {
    out.push(faceCircle(HEAD.x1 + 0.06, z, 0.85, y, "screw-ring", 14));
  }

  // накладка пульта
  out.push(shell(quad3(PANEL.u0, PANEL.u1, 0, PL, 0), quad3(PANEL.u0, PANEL.u1, 0, PL, SURF), "p-deck"));
  out.push(LN(k.pathOf(quad3(-36.6, 36.6, 1.2, PL - 1.2, SURF).map((q) => k.iso(q, P)), true), { tone: "faint" }));

  // линейка по переднему краю
  for (let u = -36; u <= 36; u += 2) {
    const major = Math.abs(u % 10) === 0;
    const len = major ? 1.7 : 1;
    out.push(planeLine([[u, 0.55], [u, 0.55 + len]], SURF, "tick", { tone: major ? "mid" : "faint" }));
  }
  // винты накладки
  for (const u of [-36.4, 36.4]) {
    for (const s of [2.2, 29.4]) {
      out.push(`<circle class="screw" cx="${f1(pj(u, s, SURF)[0])}" cy="${f1(pj(u, s, SURF)[1])}" r="0.55"/>`);
    }
  }
  return out.join("");
}

/* ---------- экран ---------- */
function screenUnit() {
  const out = [];
  const h = SURF;
  out.push(planeQuad(SCREEN.u0, SCREEN.u1, SCREEN.s0, SCREEN.s1, h + 0.4, "p-well"));
  const bez = [
    [SCREEN.u0 - 1.6, SCREEN.u0, SCREEN.s0 - 1.6, SCREEN.s1 + 1.6],
    [SCREEN.u1, SCREEN.u1 + 1.6, SCREEN.s0 - 1.6, SCREEN.s1 + 1.6],
    [SCREEN.u0, SCREEN.u1, SCREEN.s1, SCREEN.s1 + 1.6],
    [SCREEN.u0, SCREEN.u1, SCREEN.s0 - 1.6, SCREEN.s0],
  ];
  for (const [u0, u1, s0, s1] of bez) {
    out.push(shell(quad3(u0, u1, s0, s1, h), quad3(u0, u1, s0, s1, h + 1.5), "p-bezel"));
  }
  const th = h + 0.5;
  out.push(planeText(-27.4, 23.4, th, "состояние пульта", { size: 2.2, tone: "mid" }));
  out.push(planeText(-27.4, 28.4, th, STEPS[0].screen, { size: 4.6, tone: "hi", attr: ' data-screen=""' }));
  out.push(planeText(9.5, 23.2, th, "журнал", { size: 2, tone: "faint" }));
  for (let i = 0; i < 4; i++) {
    out.push(planeLine([[9.5, 26.4 - i * 1.55], [24, 26.4 - i * 1.55]], th, "log", { tone: i ? "faint" : "lo", free: true }));
  }
  out.push(planeLine([[-27.4, 22.1], [24, 22.1]], th, "log", { tone: "faint", free: true }));
  return out.join("");
}

/* ---------- строка сообщения ---------- */
function messageUnit() {
  const out = [];
  const h = SURF;
  out.push(planeQuad(MSG.u0 + 0.9, MSG.u1 - 0.9, MSG.s0 + 0.8, MSG.s1 - 0.8, h + 0.35, "p-msg-well"));
  for (const [u0, u1, s0, s1] of [
    [MSG.u0, MSG.u0 + 0.9, MSG.s0, MSG.s1],
    [MSG.u1 - 0.9, MSG.u1, MSG.s0, MSG.s1],
    [MSG.u0, MSG.u1, MSG.s1 - 0.8, MSG.s1],
    [MSG.u0, MSG.u1, MSG.s0, MSG.s0 + 0.8],
  ]) {
    out.push(shell(quad3(u0, u1, s0, s1, h), quad3(u0, u1, s0, s1, h + 1.3), "p-msg-frame"));
  }
  out.push(
    `<g data-msg-group>${planeText(-26, 18.3, h + 0.45, STEPS[0].msg, {
      size: 2.2,
      tone: "hi",
      attr: ' data-msg=""',
    })}</g>`,
  );
  out.push(planeText(MSG.u0 + 1.4, MSG.s1 - 1.3, h + 0.45, "сообщение", { size: 1.9, tone: "mid" }));
  return out.join("");
}

/* ---------- дуга досягаемости ---------- */
function arcUnit() {
  const out = [];
  const h = SURF + 0.2;
  const pts2 = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI;
    pts2.push([ARC.u + ARC.rx * Math.cos(a), ARC.s + ARC.ry * Math.sin(a)]);
  }
  out.push(`<g data-arc class="arc">`);
  out.push(planeLine(pts2, h, "arc-line", { tone: "lo" }));
  for (let deg = 10; deg < 180; deg += 10) {
    const a = (deg / 180) * Math.PI;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    out.push(planeLine([[ARC.u + ARC.rx * c, ARC.s + ARC.ry * sn], [ARC.u + (ARC.rx - 1.5) * c, ARC.s + (ARC.ry - 0.8) * sn]], h, "arc-tick", { tone: "faint" }));
  }
  for (const a of [0, Math.PI]) {
    const p = pj(ARC.u + ARC.rx * Math.cos(a), ARC.s + 0.2, h);
    out.push(`<circle class="arc-dot" cx="${f1(p[0])}" cy="${f1(p[1])}" r="0.7"/>`);
  }
  out.push(planeText(0.5, 15.9, h, "досягаемость", { size: 2, tone: "mid", anchor: "middle" }));
  out.push(`</g>`);
  return out.join("");
}

/* ---------- крупные кнопки ---------- */
function buttons() {
  const out = [];
  for (let i = 0; i < BUTTONS_X.length; i++) {
    const u = BUTTONS_X[i];
    const h0 = SURF;
    out.push(`<g class="b-btn" data-btn="${i}">`);
    out.push(puck(u, BUTTON_S, BUTTON_R + 0.9, h0, h0 + 0.6, "b-ring"));
    out.push(puck(u, BUTTON_S, BUTTON_R, h0 + 0.6, h0 + 2.2, "b-body"));
    out.push(puck(u, BUTTON_S, BUTTON_R - 0.45, h0 + 2.2, h0 + 2.9, "b-cap"));
    out.push(planeText(u, BUTTON_S - 1.05, h0 + 2.95, BUTTONS[i], { size: 1.55, tone: "lo", anchor: "middle" }));
    out.push(`</g>`);
  }
  return out.join("");
}

/* ---------- ручки и тумблер ---------- */
function knobs() {
  const out = [];
  for (const knob of KNOBS) {
    const h0 = SURF;
    out.push(puck(knob.u, knob.s, knob.r + 0.7, h0, h0 + 0.5, "k-base"));
    out.push(puck(knob.u, knob.s, knob.r, h0 + 0.5, h0 + 1.9, "k-body"));
    out.push(puck(knob.u, knob.s, knob.r - 0.35, h0 + 1.9, h0 + 2.3, "k-cap"));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      out.push(
        planeLine(
          [[knob.u + knob.r * c, knob.s + knob.r * sn], [knob.u + (knob.r - 0.5) * c, knob.s + (knob.r - 0.5) * sn]],
          h0 + 0.55,
          "knurl",
          { tone: "faint" },
        ),
      );
    }
    out.push(planeLine([[knob.u, knob.s], [knob.u, knob.s + knob.r - 0.6]], h0 + 2.35, "knurl", { tone: "hi" }));
    const p = pj(knob.u, knob.s, h0 + 2.36);
    out.push(`<circle class="screw" cx="${f1(p[0])}" cy="${f1(p[1])}" r="0.42"/>`);
  }
  const h0 = SURF;
  out.push(puck(TOGGLE.u, TOGGLE.s, 2.2, h0, h0 + 1, "k-base"));
  const baseP = p3(TOGGLE.u, TOGGLE.s, h0 + 1);
  const tip = p3(TOGGLE.u, TOGGLE.s - 2.6, h0 + 3.4);
  out.push(LN(k.pathOf([k.iso(baseP, P), k.iso(tip, P)]), { tone: "hi", className: "lever" }));
  out.push(`<circle class="lever-tip" cx="${f1(k.iso(tip, P)[0])}" cy="${f1(k.iso(tip, P)[1])}" r="1.15"/>`);
  return out.join("");
}

/* ---------- красная кнопка и крышка ---------- */
function lidMatrix(theta) {
  const hinge = p3(LID.u0 + LID.w / 2, LID.s0 + LID.d, LID.h);
  const rot = (u, s) => {
    const p = p3(u, s, LID.h);
    const vy = p[1] - hinge[1];
    const vz = p[2] - hinge[2];
    return k.iso([p[0], hinge[1] + vy * Math.cos(theta) - vz * Math.sin(theta), hinge[2] + vy * Math.sin(theta) + vz * Math.cos(theta)], P);
  };
  const o = rot(LID.u0, LID.s0);
  const a = rot(LID.u0 + 1, LID.s0);
  const b = rot(LID.u0, LID.s0 + 1);
  return `matrix(${f1(a[0] - o[0])} ${f1(a[1] - o[1])} ${f1(b[0] - o[0])} ${f1(b[1] - o[1])} ${f1(o[0])} ${f1(o[1])})`;
}

function dangerUnit() {
  const out = [];
  const h0 = SURF;
  out.push(puck(RED.u, RED.s, RED.r + 0.8, h0, h0 + 0.7, "d-plate"));
  out.push(puck(RED.u, RED.s, RED.r, h0 + 0.7, h0 + 1.9, "d-well"));
  out.push(`<g data-red>`);
  out.push(puck(RED.u, RED.s, RED.r - 1.1, h0 + 1.9, h0 + 3.3, "d-cap"));
  out.push(puck(RED.u, RED.s, RED.r - 2.2, h0 + 3.3, h0 + 3.9, "d-dome"));
  out.push(`</g>`);
  for (const du of [-4.6, 4.6]) {
    out.push(puck(LID.u0 + LID.w / 2 + du, LID.s0 + LID.d, 1.05, h0, LID.h + 0.4, "d-hinge", 14));
  }
  out.push(
    `<g data-lid transform="${lidMatrix(0)}">` +
      `<path class="lid-glass" d="M0 0H${LID.w}V${LID.d}H0Z"/>` +
      `<path class="lid-frame" d="M0 0H${LID.w}V${LID.d}H0Z"/>` +
      `<path class="lid-frame" d="M1.6 1.6H${LID.w - 1.6}V${LID.d - 1.6}H1.6Z"/>` +
      `<path class="lid-shine" d="M3 ${LID.d - 3}L${LID.w - 3} ${LID.d - 3}"/>` +
      `<path class="lid-grip" d="M3.4 0.6H${LID.w - 3.4}V2.1H3.4Z"/>` +
      `</g>`,
  );
  out.push(planeText(26, 2.4, SURF + 0.2, "опасные", { size: 1.9, tone: "mid" }));
  return out.join("");
}

/* ---------- лампа ---------- */
function lampUnit() {
  const out = [];
  const h0 = SURF;
  out.push(puck(LAMP.u, LAMP.s, LAMP.r + 0.9, h0, h0 + 0.6, "l-base"));
  out.push(puck(LAMP.u, LAMP.s, LAMP.r, h0 + 0.6, h0 + 2.1, "l-body"));
  out.push(puck(LAMP.u, LAMP.s, LAMP.r - 0.7, h0 + 2.1, h0 + 2.5, "l-bezel"));
  const p = pj(LAMP.u, LAMP.s, h0 + 2.55);
  const g = pj(LAMP.u - 0.6, LAMP.s - 0.6, h0 + 2.6);
  out.push(`<circle class="lamp-lens" data-lamp cx="${f1(p[0])}" cy="${f1(p[1])}" r="1.9"/>`);
  out.push(`<circle class="lamp-gloss" cx="${f1(g[0])}" cy="${f1(g[1])}" r="0.55"/>`);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const q = pj(LAMP.u + (LAMP.r + 0.3) * Math.cos(a), LAMP.s + (LAMP.r + 0.3) * Math.sin(a), h0 + 0.62);
    out.push(`<circle class="screw" cx="${f1(q[0])}" cy="${f1(q[1])}" r="0.34"/>`);
  }
  return out.join("");
}

/* ---------- таблички зон ---------- */
function plates() {
  const out = [];
  const zone = (u, s, w, text, key) => {
    out.push(`<g data-zone="${key}">`);
    out.push(shell(quad3(u - w / 2, u + w / 2, s - 1.5, s + 1.5, SURF), quad3(u - w / 2, u + w / 2, s - 1.5, s + 1.5, SURF + 0.5), "z-plate"));
    out.push(planeText(u, s + 0.6, SURF + 0.55, text, { size: 1.9, tone: "mid", anchor: "middle" }));
    out.push(`</g>`);
  };
  zone(-1.5, 2.4, 15, "частые", "often");
  zone(-23, 2.4, 12, "редкие", "rare");
  zone(23, 2.4, 11, "опасные", "danger");
  return out.join("");
}

/* ---------- полка с клавиатурой ---------- */
function trayUnit() {
  const out = [];
  out.push(SO(k.slabOf({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: TRAY.d, r: 3 }, TRAY.z, TRAY.h, P, 5, 1), { tone: "mid" }));
  out.push(LN(k.planOutline(k.insetPlan({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: TRAY.d, r: 3 }, 2), TRAY.z + TRAY.h, P, 5), { tone: "faint" }));
  for (const x of [TRAY.x + 3, TRAY.x + TRAY.w - 7]) {
    out.push(SO(k.slabOf({ x, y: TRAY.y + 2.5, w: 4, d: 4, r: 1 }, TRAY.z + TRAY.h, 1.4, P, 3), { tone: "lo" }));
    out.push(DT([at([x + 2, TRAY.y + 4.5, TRAY.z + TRAY.h + 1.4])], { size: 0.4 }));
  }
  out.push(SO(k.slabOf({ x: KEY.x0 - 2, y: KEY.y0 - 1.6, w: 30.4, d: 10.2, r: 2 }, TRAY.z + TRAY.h, 1, P, 5, 0.8), { tone: "lo" }));
  const kz = TRAY.z + TRAY.h + 1;
  for (let r = 0; r < KEY.rows; r++) {
    for (let c = 0; c < KEY.cols; c++) {
      const x = KEY.x0 + c * KEY.px;
      const y = KEY.y0 + r * KEY.py;
      out.push(SO(k.slabOf({ x, y, w: KEY.w, d: KEY.d, r: 0.35 }, kz, 0.85, P, 3), { tone: r === 0 ? "lo" : "hi", crease: "none" }));
    }
  }
  const fx = KEY.x0 - 0.7;
  const fy = KEY.y0 + 4 * KEY.py - 0.7;
  const ringPath = k.pathOf(
    [
      [fx, fy, kz + 1],
      [fx + KEY.w + 1.4, fy, kz + 1],
      [fx + KEY.w + 1.4, fy + KEY.d + 1.4, kz + 1],
      [fx, fy + KEY.d + 1.4, kz + 1],
    ].map((p) => k.iso(p, P)),
    true,
  );
  out.push(`<g data-focus><path class="focus-ring" d="${ringPath}"/><path class="focus-ring inner" d="${ringPath}"/></g>`);
  out.push(planeTextNear(KEY.x0 + 1.6, KEY.y0 + 8.6, TRAY.z + TRAY.h + 1.9, "клавиатура", { size: 1.9, tone: "mid" }));
  return out.join("");
}

function planeTextNear(x, y, z, text, opts) {
  const o = k.iso([x, y, z], P);
  const a = k.iso([x + 1, y, z], P);
  const b = k.iso([x, y, z + 1], P);
  return faceText(
    `matrix(${f1(a[0] - o[0])} ${f1(a[1] - o[1])} ${f1(-b[0] + o[0])} ${f1(-b[1] + o[1])} ${f1(o[0])} ${f1(o[1])})`,
    text,
    opts,
  );
}

/* ---------- фигурка оператора ---------- */
function operator() {
  const Y = OPERATOR.y;
  const oy = (v) => Y + v;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -9, y: Y - 7, w: 18, d: 15, r: 6 }, 0, 3, P)}"/>`];
  // ступни и ноги с просветом
  for (const x of [-6.6, 2.2]) {
    out.push(SO(k.slabOf({ x, y: oy(-5.6), w: 4.4, d: 8.4, r: 1.6 }, 0, 2.2, P, 5, 0.6), { tone: "mid" }));
    out.push(SO(k.slabOf({ x: x + 0.3, y: oy(0.2), w: 3.8, d: 3, r: 1 }, 2.2, 1.4, P, 4), { tone: "lo" }));
    out.push(SO(k.slabOf({ x: x + 0.1, y: oy(-2.2), w: 4, d: 4.6, r: 1.5 }, 2.2, 24.8, P, 5), { tone: "lo" }));
    out.push(SO(k.cylinder(x + 2, oy(0), 1.9, 15.6, 1.8, P, 14), { tone: "mid" }));
  }
  out.push(SO(k.slabOf({ x: -6.4, y: oy(-3), w: 12.8, d: 6.2, r: 2.8 }, 26, 6, P, 6, 0.9), { tone: "mid" }));
  out.push(SO(k.slabOf({ x: -5.4, y: oy(-3.2), w: 10.8, d: 6.6, r: 2.8 }, 31, 8, P, 6, 0.8), { tone: "mid" }));
  out.push(SO(k.slabOf({ x: -6.5, y: oy(-3.7), w: 13, d: 7.6, r: 3.2 }, 38, 8.6, P, 6, 1.2), { tone: "hi" }));
  out.push(SO(k.slabOf({ x: -7.1, y: oy(-3.2), w: 14.2, d: 6.6, r: 2.6 }, 45.2, 2.4, P, 6, 0.8), { tone: "mid" }));
  // шея, голова, каска
  out.push(SO(k.cylinder(0, oy(-0.8), 1.7, 46.2, 3, P, 16), { tone: "mid" }));
  out.push(SO(k.cylinder(0, oy(-0.8), 3.1, 48.2, 3.4, P, 24, 0.9), { tone: "hi" }));
  out.push(SO(k.cylinder(0, oy(-0.8), 2.5, 51.6, 1.4, P, 22), { tone: "hi" }));
  out.push(SO(k.cylinder(0, oy(-0.8), 1.4, 53, 0.7, P, 16), { tone: "hi" }));
  // дальняя рука висит вдоль тела
  out.push(SO(k.slabOf({ x: -9.8, y: oy(-2.4), w: 3.2, d: 3.6, r: 1.5 }, 29.4, 16, P, 5), { tone: "lo" }));
  out.push(SO(k.slabOf({ x: -10, y: oy(-3.2), w: 3.6, d: 4.4, r: 1.6 }, 26.4, 3.2, P, 4), { tone: "mid" }));
  // бейдж и карман
  out.push(SO(k.slabOf({ x: 1.6, y: oy(-3.9), w: 3.4, d: 0.6, r: 0.3 }, 41.4, 2.2, P, 3), { tone: "hi" }));
  out.push(SO(k.slabOf({ x: -4.4, y: oy(-3.9), w: 4, d: 0.5, r: 0.3 }, 34.6, 2.6, P, 3), { tone: "lo" }));
  out.push(DT([at([3, oy(-4.1), 42.4])], { size: 0.32 }));
  return out.join("");
}

/* ---------- сборка ---------- */
const scene = [
  base(),
  headUnit(),
  plates(),
  arcUnit(),
  buttons(),
  knobs(),
  messageUnit(),
  screenUnit(),
  dangerUnit(),
  lampUnit(),
  trayUnit(),
  `<g data-body transform="${k.translateAlong(P, [-18, 0, 0])}"><g class="op-sil">${operator()}</g></g>`,
  `<g data-arm></g>`,
].join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A sloped operator console on a heavy pedestal. On the panel: a wide status screen and a message line, four large buttons in the middle inside a reach arc, small knobs and a signal lamp at the edges, a red button under a clear lid, a keyboard on a shelf below, and a standing operator whose arm reaches the active control.",
  body: scene,
});

/* ---------- цели шагов ---------- */
const TARGETS = [
  p3(0, 2.6, 4.4),
  p3(0, 3, 5),
  p3(BUTTONS_X[1], BUTTON_S, 6.4),
  p3(LAMP.u, LAMP.s, 6.4),
  p3(0, 18.2, 4.2),
  p3(RED.u, RED.s, 7.4),
  [KEY.x0 + 5 * KEY.px, KEY.y0 + 4 * KEY.py, TRAY.z + TRAY.h + 2.4],
  [8, FACE - 0.4, 29],
];

const LID_FRAMES = Array.from({ length: 49 }, (_, i) => lidMatrix((i / 48) * 1.83));
const MARKER_STEPS = [3, 3, 3, 3, 3, 3, 3, 5];

const DATA = {
  targets: TARGETS,
  ox0: -18,
  southY: 30.3,
  shoulderZ: 46,
  armLen: 21,
  panel: { yF: PANEL.yF, zF: PANEL.zF, slope: SLOPE, norm: NORM },
  buttons: STEPS.map((step) => (typeof step.button === "number" ? step.button : -1)),
  lidFrames: LID_FRAMES,
  markerSteps: MARKER_STEPS,
  markerGap: CONTRAST.gap,
  msg: STEPS.map((s) => s.msg),
  screen: STEPS.map((s) => s.screen),
  lamp: STEPS.map((s) => s.lamp),
  acts: STEPS.map((s) => s.act),
  arc: { u: ARC.u, s: ARC.s, rx: ARC.rx, ry: ARC.ry },
  focus: [3, 5, 1, 7, 2, 6, 4, 0],
  readouts: STEPS.map((s) => s.readout),
  labels: STEPS.map((s) => s.label),
};

const live = `
const P = ${JSON.stringify(P)};
const D = ${JSON.stringify(DATA)};
const N = D.targets.length;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const msgNode = svg.querySelector("[data-msg]");
const screenNode = svg.querySelector("[data-screen]");
const arm = svg.querySelector("[data-arm]");
const body = svg.querySelector("[data-body]");
const lid = svg.querySelector("[data-lid]");
const red = svg.querySelector("[data-red]");
const marker = svg.querySelector("[data-marker]");
const focus = svg.querySelector("[data-focus]");
const arc = svg.querySelector("[data-arc]");
const btns = Array.from(svg.querySelectorAll("[data-btn]"));
const zones = Array.from(svg.querySelectorAll("[data-zone]"));
const still = matchMedia("(prefers-reduced-motion: reduce)");

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const near = (a, b) => Math.abs(a - b) < 0.02;
const r2 = (v) => Math.round(v * 100) / 100;
const ease = (cur, target, tau, dt) => {
  const next = cur + (target - cur) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 0.004 ? target : next;
};
const O = iso([0, 0, 0], P);
const X1 = iso([1, 0, 0], P);
const UPX = Math.hypot(X1[0] - O[0], X1[1] - O[1]);

let step = 0;
let clock = 0, last = 0, frame = 0, visible = false, touring = true, idleTimer = 0;
let ox = D.ox0, oxT = D.ox0;
let hand = D.targets[0].slice(), handT = D.targets[0].slice();
let press = 0, pressT = 0;
let lidA = 0, lidT = 0;
let markerV = D.markerSteps[0], markerT = D.markerSteps[0];
let focusAt = D.focus[0];

function panelPoint(u, s, h) {
  const pn = D.panel;
  return [u, pn.yF + pn.slope[1] * s + pn.norm[1] * h, pn.zF + pn.slope[2] * s + pn.norm[2] * h];
}
function capsule(a, b, w) {
  const p = iso(a, P), q = iso(b, P);
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w * UPX, ny = (dx / len) * w * UPX;
  return '<path class="op-limb" d="M' + r2(p[0] + nx) + " " + r2(p[1] + ny) + "L" + r2(q[0] + nx) + " " + r2(q[1] + ny) +
    "L" + r2(q[0] - nx) + " " + r2(q[1] - ny) + "L" + r2(p[0] - nx) + " " + r2(p[1] - ny) + 'Z"/>';
}
function joint(p, r) {
  const q = iso(p, P);
  return '<circle class="op-joint" cx="' + r2(q[0]) + '" cy="' + r2(q[1]) + '" r="' + r2(r * UPX) + '"/>';
}
function drawArm() {
  const sh = [ox + 5.6, D.southY, D.shoulderZ];
  const ax = hand[0] - sh[0], ay = hand[1] - sh[1], az = hand[2] - sh[2];
  const d = Math.max(0.8, Math.hypot(ax, ay, az));
  const L = D.armLen;
  const stretch = Math.max(1, d / (L * 2));
  const l = L * stretch;
  const dir = [ax / d, ay / d, az / d];
  const mid = [sh[0] + dir[0] * d / 2, sh[1] + dir[1] * d / 2, sh[2] + dir[2] * d / 2];
  const hh = Math.sqrt(Math.max(0, l * l - (d / 2) * (d / 2)));
  let pole = [0.62, 0.2, -0.76];
  const pd = pole[0] * dir[0] + pole[1] * dir[1] + pole[2] * dir[2];
  pole = [pole[0] - dir[0] * pd, pole[1] - dir[1] * pd, pole[2] - dir[2] * pd];
  const pn = Math.hypot(pole[0], pole[1], pole[2]) || 1;
  const el = [mid[0] + (pole[0] / pn) * hh, mid[1] + (pole[1] / pn) * hh, mid[2] + (pole[2] / pn) * hh];
  arm.innerHTML = capsule(sh, el, 2.1) + capsule(el, hand, 1.85) + joint(sh, 2.1) + joint(el, 1.9) + joint(hand, 1.9);
}

function plan(to) {
  step = to;
  handT = D.targets[to].slice();
  for (let i = 0; i < 3; i++) if (!Number.isFinite(hand[i])) hand[i] = handT[i];
  oxT = clamp(handT[0] - 18, -58, 22);
  pressT = D.buttons[to] >= 0 || D.acts[to] === "danger" ? 1 : 0;
  lidT = D.acts[to] === "danger" ? 1 : 0;
  markerT = D.markerSteps[to];
  focusAt = D.focus[to];
  stage.style.setProperty("--ui-lamp", D.lamp[to] === "bad" ? "var(--anatomy-red)" : "var(--anatomy-green)");
  stage.dataset.step = String(to);
  if (msgNode.textContent !== D.msg[to]) msgNode.textContent = D.msg[to];
  if (screenNode.textContent !== D.screen[to]) screenNode.textContent = D.screen[to];
  if (readout.textContent !== D.readouts[to]) readout.textContent = D.readouts[to];
  stage.setAttribute("aria-valuenow", String(to));
  stage.setAttribute("aria-valuetext", "шаг " + (to + 1) + " из " + N + ": " + D.labels[to]);
  btns.forEach((node, i) => node.classList.toggle("is-hit", D.buttons[to] === i));
  zones.forEach((node) => node.classList.toggle("is-hit", to === 1));
  arc.classList.toggle("is-on", to === 1);
}

function draw() {
  body.setAttribute("transform", translateAlong(P, [ox, 0, 0]));
  const nrm = D.panel.norm;
  btns.forEach((node, i) => {
    const down = D.buttons[step] === i ? press : 0;
    node.setAttribute("transform", translateAlong(P, [0, -nrm[1] * 1.5 * down, -nrm[2] * 1.5 * down]));
    node.classList.toggle("is-down", down > 0.5);
  });
  if (D.acts[step] === "danger") {
    red.setAttribute("transform", translateAlong(P, [0, -nrm[1] * 1.2 * press, -nrm[2] * 1.2 * press]));
  } else {
    red.removeAttribute("transform");
  }
  lid.setAttribute("transform", D.lidFrames[Math.round(lidA * 48)]);
  marker.setAttribute("transform", translateAlong(P, [markerV * D.markerGap, 0, 0]));
  focus.setAttribute("transform", translateAlong(P, [focusAt * 2.8, 0, 0]));
  drawArm();
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring && !calm) {
    clock += dt;
    const want = Math.floor(clock / 4.2) % N;
    if (want !== step) plan(want);
  }
  if (!calm && step === 1) {
    const a = 0.9 + Math.sin(clock * 1.1) * 1.5;
    handT = panelPoint(D.arc.u + Math.cos(a) * D.arc.rx * 0.92, D.arc.s + Math.sin(a) * D.arc.ry * 0.92, 4.4);
    oxT = clamp(handT[0] - 18, -58, 22);
  }
  ox = calm ? oxT : ease(ox, oxT, 0.34, dt);
  for (let i = 0; i < 3; i++) hand[i] = calm ? handT[i] : ease(hand[i], handT[i], 0.22, dt);
  press = calm ? pressT : ease(press, pressT, 0.12, dt);
  lidA = calm ? lidT : ease(lidA, lidT, 0.2, dt);
  markerV = calm ? markerT : ease(markerV, markerT, 0.2, dt);
  draw();
  const quiet = !touring && near(ox, oxT) && near(hand[0], handT[0]) && near(hand[1], handT[1]) && near(hand[2], handT[2]) &&
    near(press, pressT) && near(lidA, lidT) && near(markerV, markerT) && !(step === 1 && !calm);
  frame = visible && !quiet ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); }
};
const steer = (to) => {
  touring = false;
  plan(clamp(to, 0, N - 1));
  clock = 0;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4200);
  run();
};
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
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
plan(0);
draw();
`;

const css = `<style>
:root, body.iso{--ui-lamp:var(--anatomy-green);--ui-warn:#e0a44a;--ui-red:var(--anatomy-red);--ui-figure:#2e2e2e;--ui-figure-top:#3a3a3a;--ui-figure-shade:#242424}
body[data-theme="light"].iso{--ui-warn:#b26a00;--ui-figure:#e2e1dc;--ui-figure-top:#efeee9;--ui-figure-shade:#d3d2cc;--anatomy-mid:#6f6f75;--anatomy-lo:#a2a2a7;--anatomy-faint:#c6c6ca}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.slope{fill:var(--anatomy-shade-1);stroke:var(--anatomy-mid);stroke-width:.45}
.head-end{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:.45}
.head-front{fill:var(--anatomy-shade-2);stroke:var(--anatomy-lo);stroke-width:.45}
.pf-side{fill:var(--anatomy-shade-1);stroke:var(--anatomy-lo);stroke-width:.42;stroke-linejoin:round}
.pf-top{fill:var(--anatomy-face);stroke:var(--anatomy-lo);stroke-width:.42;stroke-linejoin:round}
.p-deck .pf-side{fill:var(--anatomy-shade-1)}
.p-bezel .pf-top{fill:var(--anatomy-shade-3)}
.p-well,.p-msg-well{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo)}
.p-msg-frame .pf-top{fill:var(--anatomy-shade-3)}
.b-ring .pf-top{fill:var(--anatomy-shade-2)}
.b-body .pf-top{fill:var(--anatomy-shade-3)}
.b-cap .pf-top{fill:var(--anatomy-shade-2)}
.b-btn.is-hit .pf-top,.b-btn.is-down .pf-top{stroke:var(--anatomy-lit)}
.k-base .pf-top{fill:var(--anatomy-shade-2)}
.k-body .pf-top{fill:var(--anatomy-shade-3)}
.k-cap .pf-top{fill:var(--anatomy-shade-1)}
.d-plate .pf-top{fill:var(--anatomy-shade-2)}
.d-well .pf-top{fill:var(--anatomy-shade-0)}
.d-cap .pf-top{fill:var(--ui-red);fill-opacity:.85}
.d-dome .pf-top{fill:var(--ui-red)}
.d-hinge .pf-top{fill:var(--anatomy-shade-1)}
.l-base .pf-top{fill:var(--anatomy-shade-2)}
.l-body .pf-top{fill:var(--anatomy-shade-3)}
.l-bezel .pf-top{fill:var(--anatomy-shade-1)}
.z-plate .pf-top{fill:var(--anatomy-shade-2)}
.z-plate.is-hit .pf-top{fill:var(--anatomy-shade-1);stroke:var(--anatomy-lit)}
.p-label .pf-top,.p-scale .pf-top{fill:var(--anatomy-shade-2)}
.p-mark .pf-top{fill:var(--anatomy-hi)}
.lamp-lens{fill:var(--ui-lamp);stroke:var(--anatomy-lo);stroke-width:.4}
.lamp-gloss{fill:var(--anatomy-top);opacity:.55}
.screw{fill:var(--anatomy-mid)}
.vent{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:.3}
.sw{stroke:var(--anatomy-lo);stroke-width:.3}
.sw-0{fill:var(--anatomy-faint)}
.sw-1{fill:var(--anatomy-lo)}
.sw-2{fill:var(--anatomy-mid)}
.sw-3{fill:var(--anatomy-hi)}
.sw-4{fill:var(--anatomy-strong)}
.sw-5{fill:var(--anatomy-lit)}
.handle{fill:var(--anatomy-mid)}
.screw-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.4}
.screw-slot{fill:var(--anatomy-lo)}
.side-panel{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:.4}
.side-line{fill:none;stroke:var(--anatomy-lo);stroke-width:.45}
.side-slot{fill:var(--anatomy-shade-0);stroke:var(--anatomy-faint);stroke-width:.35}
.arc .arc-line{stroke:var(--anatomy-lo)}
.arc .arc-tick{stroke:var(--anatomy-faint)}
.arc .arc-dot{fill:var(--anatomy-lo)}
.arc.is-on .arc-line{stroke:var(--anatomy-hi)}
.arc.is-on .arc-tick{stroke:var(--anatomy-mid)}
.arc.is-on .arc-dot{fill:var(--anatomy-hi)}
.lever{stroke-width:1.4}
.lever-tip{fill:var(--anatomy-face);stroke:var(--anatomy-hi);stroke-width:.5}
.lid-glass{fill:var(--anatomy-face);fill-opacity:.5}
.lid-frame{fill:none;stroke:var(--anatomy-hi);stroke-width:.55}
.lid-shine{fill:none;stroke:var(--anatomy-lo);stroke-width:.4}
.lid-grip{fill:var(--anatomy-mid);fill-opacity:.7;stroke:var(--anatomy-hi);stroke-width:.35}
.focus-ring{fill:none;stroke:var(--anatomy-lit);stroke-width:1.6}
.focus-ring.inner{stroke-width:.8;stroke:var(--anatomy-hi)}
.op-limb{fill:var(--ui-figure);stroke:var(--anatomy-hi);stroke-width:.55;stroke-linejoin:round}
.op-joint{fill:var(--ui-figure);stroke:var(--anatomy-hi);stroke-width:.5}
.op-body .pf-top{fill:var(--ui-figure)}
.op-body .pf-side{fill:var(--anatomy-shade-0)}
.op-sil .iso-fill{fill:var(--ui-figure)}
.op-sil .iso-top{fill:var(--ui-figure-top)}
.op-sil .iso-shade[data-shade="0"]{fill:var(--ui-figure-shade)}
.op-sil .iso-shade[data-shade="1"]{fill:var(--ui-figure-shade)}
.op-sil .iso-shade[data-shade="2"]{fill:var(--ui-figure)}
.op-sil .iso-shade[data-shade="3"]{fill:var(--ui-figure-top)}
.op-sil .iso-edge{stroke:var(--anatomy-hi)}
.op-sil .iso-crease,.op-sil .iso-bevel{stroke:var(--ui-figure-shade)}
.op-badge{fill:var(--anatomy-hi);stroke:var(--anatomy-lo);stroke-width:.3}
.op-pocket{fill:none;stroke:var(--anatomy-lo);stroke-width:.35}
.op-seam{fill:none;stroke:var(--anatomy-faint);stroke-width:.4;stroke-linecap:round}
[data-step="4"] [data-msg-group] .iso-face-text,[data-step="5"] [data-msg-group] .iso-face-text{fill:var(--ui-red)}
[data-step="0"] .b-btn .pf-top{stroke:var(--anatomy-lo)}
.iso-plate-corner[data-corner="readout"]{bottom:16px}
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
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: стрелки ведут по зонам пульта" aria-valuemin="0" aria-valuemax="${STEPS.length - 1}" aria-valuenow="0">${svg}</div>`,
  });

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}
console.log("solids:", (scene.match(/class="iso-solid/g) || []).length, "plane parts:", (scene.match(/pf-top/g) || []).length);
