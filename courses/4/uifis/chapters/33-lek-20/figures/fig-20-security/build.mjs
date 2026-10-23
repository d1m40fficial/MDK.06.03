import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, STEPS, ROLES, JOURNAL } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 620;
const HEIGHT = 470;

// Ключевая стойка: плита на ножках, шкаф с тремя рядами дверцей, барабан выдачи
// ключей слева, журнальный барабан с бумажной лентой и печатающей головкой справа,
// лампа отказа и консоль проверки личности на верхней крышке.

const BASE = { x: -158, y: -72, w: 316, d: 144, r: 12 };
const BASE_H = 12;
const FOOT_H = 5;
const CAB = { x: -96, y: -56, w: 192, d: 76, r: 4 };
const CAB_TOP = 150;
const CAP = { x: -102, y: -62, w: 204, d: 88, r: 6 };
const DOOR_Y = 20;
const DOOR_T = 3.2;
const PANEL_Y = DOOR_Y + DOOR_T;
const OPEN = 68;

const ROWS = [
  { key: "student", z0: 18, z1: 58, xs: [-84, -27, 30], w: 54 },
  { key: "teacher", z0: 62, z1: 102, xs: [-84, -1.5], w: 82.5 },
  { key: "admin", z0: 106, z1: 146, xs: [-84], w: 168 },
];

const DOORS = [];
for (const row of ROWS) {
  for (const x of row.xs) {
    DOORS.push({
      row: row.key,
      x,
      w: row.w,
      z0: row.z0,
      z1: row.z1,
      mid: (row.z0 + row.z1) / 2,
      hingeX: x + row.w - 1.2,
      lockX: x + 22,
    });
  }
}
const doorIndex = (rowKey, n) => DOORS.findIndex((door) => door.row === rowKey) + n;

const DRUM = { x: -128, y: -4 };
const KEY_R = 25;
const KEY_Z = 34;
const SOCKETS = [
  { role: "student", angle: 90, teeth: 1 },
  { role: "teacher", angle: 210, teeth: 2 },
  { role: "admin", angle: 330, teeth: 3 },
].map((socket) => ({
  ...socket,
  x: DRUM.x + KEY_R * Math.cos((socket.angle * Math.PI) / 180),
  y: DRUM.y + KEY_R * Math.sin((socket.angle * Math.PI) / 180),
  deg: socket.angle - 90,
}));
const TEACHER_KEY = SOCKETS[1];

const JOURNAL_X0 = 108;
const JOURNAL_X1 = 144;
const PAPER_Z = 45;
const PRINT_Y = -28;
const LINE_GAP = 6;

const LOCK = {
  student: { x: DOORS[0].lockX, z: DOORS[0].mid + 4.8 + 10.4 },
  teacher: { x: DOORS[3].lockX, z: DOORS[3].mid + 4.8 + 10.4 },
  admin: { x: DOORS[5].lockX, z: DOORS[5].mid + 4.8 + 10.4 },
};
const Y_INS = 28.7;

const pts = [
  ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
  ...k.boxCorners(CAB, 0, 162),
  ...k.boxCorners(CAP, CAB_TOP, 162),
  [-70, -34, 176],
  [-22, -8, 176],
  [70, -20, 184],
  [152, -30, 56],
  [152, 16, 40],
  [TEACHER_KEY.x - 5, TEACHER_KEY.y, KEY_Z + 5],
  [-140, 40, 108],
  [DOORS[3].hingeX - DOORS[3].w * Math.cos((OPEN * Math.PI) / 180), DOOR_Y + DOORS[3].w * Math.sin((OPEN * Math.PI) / 180), 102],
  [DOORS[0].hingeX - DOORS[0].w * Math.cos((OPEN * Math.PI) / 180), DOOR_Y + DOORS[0].w * Math.sin((OPEN * Math.PI) / 180), 58],
  [BASE.x, BASE.y + BASE.d, 0],
  [BASE.x + BASE.w, BASE.y + BASE.d, 0],
];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 22, azimuth: 40, elevation: 30 });
const { sinA, cosA, sinE, cosE, k: scaleK } = k.cameraOf(P);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (dots, style) => k.dotsSvg(dots, style);
const byDepth = (list) => [...list].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const deg = (value) => (value * Math.PI) / 180;

// Плоская деталь в вертикальной плоскости: группы точек заданы парой [x, z],
// толщина по y. Каждая группа это своя деталь, отверстие задаётся встречным обходом.
function vPlate(pieces, y, thickness, P, { tone = "hi", lit = false, className = "" } = {}) {
  const project = (piece, shift) =>
    piece.map((list) => k.pathOf(list.map(([x, z]) => k.iso([x, y + shift, z], P)), true)).join("");
  const back = pieces.map((piece) => project(piece, 0)).join("");
  const front = pieces.map((piece) => project(piece, thickness)).join("");
  return (
    `<g class="iso-solid ${className}"${lit ? " data-lit" : ""}>` +
    `<path class="iso-shade" data-shade="1" fill-rule="evenodd" d="${back}"/>` +
    `<path class="iso-top" fill-rule="evenodd" d="${front}"/>` +
    `<path class="iso-line iso-edge" data-tone="${tone}" fill-rule="evenodd" d="${front}"/>` +
    `</g>`
  );
}

function ringPts(cx, cz, r, steps = 28, reverse = false) {
  return Array.from({ length: steps }, (_, i) => {
    const a = ((reverse ? -1 : 1) * (i / steps) * Math.PI * 2);
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
  });
}

function faceDisc(cx, cz, r, y, P, tone = "mid", shade = "2") {
  const d = k.pathOf(ringPts(cx, cz, r, 26).map(([x, z]) => k.iso([x, y, z], P)), true);
  return `<g class="iso-solid"><path class="iso-shade" data-shade="${shade}" d="${d}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${d}"/></g>`;
}

function faceRect(x0, z0, x1, z1, y, P) {
  return k.pathOf(
    [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ].map(([x, z]) => k.iso([x, y, z], P)),
    true,
  );
}

// Экранная матрица для вертикальной панели, повёрнутой вокруг вертикальной оси:
// направление x переходит в своё экранное изображение, z остаётся вертикалью.
function panelRot(P, value) {
  const angle = deg(value);
  const X0 = sinA * scaleK;
  const X1 = cosA * sinE * scaleK;
  const U0 = (Math.cos(angle) * sinA - Math.sin(angle) * cosA) * scaleK;
  const U1 = (Math.cos(angle) * cosA + Math.sin(angle) * sinA) * sinE * scaleK;
  return [U0 / X0, (U1 - X1) / X0, 0, 1];
}

// Экранная матрица поворота вокруг вертикальной оси для плоской горизонтальной
// детали: действует на экранные координаты пола.
function screenRot(P, value) {
  const angle = deg(value);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const app = (x, y) => [(x * sinA - y * cosA) * scaleK, (x * cosA + y * sinA) * sinE * scaleK];
  const inv = (X, Y) => {
    const a = X / scaleK;
    const b = Y / (scaleK * sinE);
    return [a * sinA + b * cosA, -a * cosA + b * sinA];
  };
  const e1 = inv(1, 0);
  const e2 = inv(0, 1);
  const r1 = [e1[0] * c - e1[1] * s, e1[0] * s + e1[1] * c];
  const r2 = [e2[0] * c - e2[1] * s, e2[0] * s + e2[1] * c];
  const A = app(r1[0], r1[1]);
  const B = app(r2[0], r2[1]);
  return [A[0], A[1], B[0], B[1]];
}

const num = (value) => Math.round(value * 1000) / 1000;

function keyMatrix(px, py, pz, value, P) {
  const [a, b, c, d] = panelRot(P, value);
  const origin = k.iso([px, py, pz], P);
  const local = k.iso([0, 0, 0], P);
  return `matrix(${num(a)} ${num(b)} ${num(c)} ${num(d)} ${num(origin[0] - a * local[0] - c * local[1])} ${num(origin[1] - b * local[0] - d * local[1])})`;
}

function needleMatrix(px, py, pz, value, P) {
  const [a, b, c, d] = screenRot(P, value);
  const origin = k.iso([px, py, pz], P);
  const local = k.iso([0, 0, 0], P);
  return `matrix(${num(a)} ${num(b)} ${num(c)} ${num(d)} ${num(origin[0] - a * local[0] - c * local[1])} ${num(origin[1] - b * local[0] - d * local[1])})`;
}

function doorMatrix(hx, hy, value, P) {
  const [a, b, c, d] = panelRot(P, value);
  const hinge = k.iso([hx, hy, 0], P);
  return `matrix(${num(a)} ${num(b)} ${num(c)} ${num(d)} ${num(hinge[0] - a * hinge[0] - c * hinge[1])} ${num(hinge[1] - b * hinge[0] - d * hinge[1])})`;
}

// ---------- плита и основание

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 22))) {
    out.push(S(k.cylinder(x, y, 8, -BASE_H - FOOT_H, 1.8, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.2, -BASE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" }));
    out.push(L(k.ring(x, y, 6.2, -BASE_H, P, 24), { tone: "lo" }));
  }
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 10, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(BASE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  const rule = { x: -150, y: 60, w: 112, d: 6, r: 1 };
  out.push(S(k.slabOf(rule, 0, 0.7, P, 3), { tone: "mid", crease: "none" }));
  const ticks = k.topTicks(rule.x + 4, rule.x + rule.w - 4, 4, 5, rule.y + rule.d, 0.7, [-1.4, -3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  const label = { x: 2, y: BASE.y + BASE.d, w: 98, d: 1.6, r: 0.6 };
  out.push(S(k.slabOf(label, -11, 9.4, P, 3, 0.3), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(label, 0.8), -10.6, P, 3), { tone: "lo" }));
  out.push(
    k.faceTextSvg(k.sideMatrix([label.x + 5, BASE.y + BASE.d + 1.7], -7.2, P, "left"), "аутентификация → роль", {
      size: 3.8,
      tone: "hi",
    }),
    k.faceTextSvg(k.sideMatrix([label.x + 5, BASE.y + BASE.d + 1.7], -3.2, P, "left"), "доступ → аудит", {
      size: 3.8,
      tone: "mid",
    }),
  );
  out.push(D([at([label.x + label.w - 3, BASE.y + BASE.d + 1.7, -1.6])], { size: 0.5 }));

  const serial = { x: -84, y: -72, w: 30, d: 9, r: 1 };
  out.push(S(k.slabOf(serial, 0, 0.7, P, 3), { tone: "mid", crease: "none" }));
  out.push(
    L(
      [16, 11, 7]
        .map((len, i) => k.lineOnTop([serial.x + 3, serial.y + 2.4 + i * 2.4], [serial.x + 3 + len, serial.y + 2.4 + i * 2.4], 0.7, P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  return out.join("");
}

// ---------- корпус шкафа

function interior() {
  const out = [];
  out.push(S(k.slabOf({ x: -90, y: -26, w: 180, d: 2.4, r: 0.5 }, 14, 136, P, 3), { tone: "lo" }));
  for (const row of ROWS) {
    for (const z of [row.z0 + 13, row.z0 + 27]) {
      out.push(S(k.slabOf({ x: -82, y: -24, w: 164, d: 32, r: 0.8 }, z, 2.2, P, 3), { tone: "mid" }));
      out.push(L(k.planOutline({ x: -82, y: -24, w: 164, d: 32, r: 0.8 }, z + 2.2, P, 3), { tone: "faint" }));
    }
    const shelfZ = row.z0 + 15.2;
    const files = row.key === "student" ? 5 : row.key === "teacher" ? 4 : 2;
    for (let i = 0; i < files; i++) {
      const x = -74 + i * (16 + (row.key === "admin" ? 12 : 0));
      const h = 9 + ((i * 5 + row.z0) % 7);
      out.push(S(k.slabOf({ x, y: -20, w: 9, d: 22, r: 1 }, shelfZ, h, P, 3, 0.4), { tone: i % 2 ? "mid" : "lo" }));
      out.push(L(k.rise([x + 4.5, -9], shelfZ + 2, shelfZ + h - 2, P), { tone: "faint" }));
    }
  }
  return out.join("");
}

function cabinet() {
  const out = [];
  out.push(S(k.slabOf({ x: -92, y: -52, w: 184, d: 68, r: 3 }, 0, 14, P, 5), { tone: "lo" }));
  out.push(L(k.planOutline({ x: -92, y: -52, w: 184, d: 68, r: 3 }, 14, P, 5), { tone: "faint" }));
  out.push(S(k.slabOf({ x: CAB.x, y: CAB.y, w: CAB.w, d: 8, r: 2 }, 14, CAB_TOP - 14, P, 5, 0.6), { tone: "mid" }));
  out.push(interior());
  for (const x of [CAB.x, CAB.x + CAB.w - 10]) {
    out.push(S(k.slabOf({ x, y: CAB.y + 8, w: 10, d: 62, r: 2 }, 14, CAB_TOP - 14, P, 4, 0.5), { tone: "mid" }));
    out.push(L(k.sideSeam({ x, y: CAB.y + 8, w: 10, d: 62, r: 2 }, 60, P, 4), { tone: "faint" }));
  }
  out.push(S(k.slabOf(CAP, CAB_TOP, 12, P, 8, 1.4), { tone: "hi", crease: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(CAP, 4), CAB_TOP + 12, P, 8), { tone: "faint" }));
  const capScrews = k.corners(CAP, 9);
  out.push(D(capScrews.map(([x, y]) => at([x, y, CAB_TOP + 12])), { size: 0.55 }));
  out.push(L(capScrews.map(([x, y]) => k.ring(x, y, 2, CAB_TOP + 12, P, 16)).join(""), { tone: "lo" }));
  out.push(L(k.ring(-131, -4, 24, 0, P, 32), { tone: "faint" }));
  for (let i = 0; i < 4; i++) {
    out.push(S(k.slabOf({ x: 95.6, y: -36, w: 0.6, d: 24, r: 0.3 }, 40 + i * 4, 1.7, P, 3), { tone: "lo", crease: "none" }));
  }
  out.push(S(k.slabOf({ x: 95.6, y: -40, w: 0.6, d: 12, r: 0.3 }, 104, 9, P, 3), { tone: "hi", crease: "none" }));
  out.push(
    L(
      [6, 9, 5]
        .map((len, i) => k.segment([95.9, -38, 110 - i * 2.2], [95.9, -38 + len, 110 - i * 2.2], P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );

  for (const x of [-96, 84]) {
    out.push(S(k.slabOf({ x, y: 16, w: 12, d: 5, r: 1.4 }, 14, 136, P, 3, 0.5), { tone: "mid" }));
    out.push(L(k.sideSeam({ x, y: 16, w: 12, d: 5, r: 1.4 }, 30, P, 3), { tone: "faint" }));
  }
  for (const z of [14, 58, 102, 146]) {
    out.push(S(k.slabOf({ x: -84, y: 16, w: 168, d: 5, r: 1.2 }, z, 4, P, 3, 0.4), { tone: "mid" }));
  }
  return out.join("");
}

// ---------- дверцы, замки, ручки, петли

function keyhole(x, topZ) {
  return [
    `<path class="iso-shade" data-shade="0" d="${k.pathOf(
      [
        [x - 3.4, 27.4],
        [x + 3.4, 27.4],
        [x + 3.4, 30],
        [x - 3.4, 30],
      ].map(([px, py]) => k.iso([px, py, topZ + 0.04], P)),
      true,
    )}"/>`,
    L(k.lineOnTop([x - 3.4, 28.7], [x + 3.4, 28.7], topZ + 0.05, P), { tone: "lo", free: true }),
  ].join("");
}

function doorSvg(door, index) {
  const out = [];
  const h = door.z1 - door.z0;
  out.push(S(k.slabOf({ x: door.x, y: DOOR_Y, w: door.w, d: DOOR_T, r: 2 }, door.z0, h, P, 4, 0.8), { tone: "hi", className: "door-face" }));
  out.push(S(k.slabOf({ x: door.x + 5, y: PANEL_Y, w: door.w - 10, d: 1.0, r: 1.4 }, door.z0 + 5, h - 10, P, 4, 0.5), { tone: "mid", className: "panel-face" }));
  out.push(L(faceRect(door.x + 7, door.z0 + 7, door.x + door.w - 7, door.z1 - 7, PANEL_Y + 1.02, P), { tone: "faint" }));
  out.push(D([at([door.x + 9, PANEL_Y + 1.03, door.z1 - 9]), at([door.x + door.w - 9, PANEL_Y + 1.03, door.z1 - 9])], { size: 0.42 }));
  for (let i = 0; i < 3; i++) {
    out.push(
      L(k.lineOnTop([door.x + door.w / 2 - 9, door.z0 + 8 + i * 1.8], [door.x + door.w / 2 + 9, door.z0 + 8 + i * 1.8], PANEL_Y + 1.04, P), {
        tone: "lo",
        free: true,
      }),
    );
  }
  if (DOORS.findIndex((entry) => entry.row === door.row) === index) {
    out.push(S(k.slabOf({ x: door.x + door.w - 22, y: PANEL_Y + 1.02, w: 18, d: 0.7, r: 0.8 }, door.z1 - 10, 6, P, 3), { tone: "hi", crease: "none" }));
    out.push(
      k.faceTextSvg(k.sideMatrix([door.x + door.w - 13, PANEL_Y + 1.8], door.z1 - 6.4, P, "left"), door.row, {
        size: 3.2,
        tone: "hi",
        anchor: "middle",
      }),
    );
  }
  out.push(S(k.slabOf({ x: door.x + 5, y: DOOR_Y - 2.4, w: door.w - 10, d: 2.4, r: 1 }, door.z0 + 6, h - 12, P, 3), { tone: "lo" }));
  out.push(D([at([door.x + 9, DOOR_Y - 2.4, door.z0 + 9]), at([door.x + door.w - 9, DOOR_Y - 2.4, door.z1 - 9])], { size: 0.4 }));

  const lockX = door.lockX;
  const mid = door.mid;
  out.push(S(k.slabOf({ x: lockX - 7, y: PANEL_Y, w: 14, d: 9, r: 2 }, mid - 4, 8, P, 4, 0.6), { tone: "hi" }));
  out.push(S(k.cylinder(lockX, 28.7, 4.6, mid + 4, 0.8, P, 28), { tone: "mid" }));
  out.push(L(k.ring(lockX, 28.7, 4.6, mid + 4.8, P, 28), { tone: "hi" }));
  out.push(L(k.ring(lockX, 28.7, 2.6, mid + 4.8, P, 22), { tone: "lo" }));
  out.push(keyhole(lockX, mid + 4.8));
  out.push(D([at([lockX - 5.4, PANEL_Y, mid + 3]), at([lockX + 5.4, PANEL_Y, mid + 3])], { size: 0.42 }));
  const notches = ROLES.find((role) => role.key === door.row).teeth;
  for (let i = 0; i < notches; i++) {
    out.push(L(k.lineOnTop([lockX - 3 + i * 3, 25.2], [lockX - 3 + i * 3, 26.6], mid + 4.82, P), { tone: "lo", free: true }));
  }

  const handleX = door.x + 9;
  out.push(faceDisc(handleX, mid, 3.1, PANEL_Y + 0.02, P, "hi", "3"));
  out.push(L(k.ring(handleX, mid, 3.1, PANEL_Y + 0.03, P, 22), { tone: "hi" }));
  out.push(S(k.slabOf({ x: handleX - 1.3, y: PANEL_Y + 0.3, w: 2.6, d: 4.6, r: 1 }, mid - 1.3, 2.6, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: handleX - 1.1, y: PANEL_Y + 4.9, w: 9.4, d: 2.2, r: 1.1 }, mid - 1.5, 3, P, 3, 0.5), { tone: "hi" }));
  out.push(S(k.cylinder(handleX + 8, PANEL_Y + 6, 1.5, mid - 1.5, 3, P, 16), { tone: "mid" }));
  out.push(D([at([handleX, PANEL_Y + 0.34, mid])], { size: 0.42 }));

  for (const z of [door.z0 + 6, door.z1 - 6]) {
    out.push(S(k.slabOf({ x: door.hingeX - 5, y: PANEL_Y, w: 5, d: 1.2, r: 0.5 }, z - 3, 6, P, 3, 0.3), { tone: "mid" }));
    out.push(S(k.cylinder(door.hingeX, PANEL_Y + 1.6, 1.2, z - 4.4, 8.8, P, 18), { tone: "hi" }));
    out.push(L(k.ring(door.hingeX, PANEL_Y + 1.6, 1.2, z + 4.4, P, 18), { tone: "lo" }));
  }
  return `<g data-door="${index}" transform="${doorMatrix(door.hingeX, PANEL_Y, 0, P)}">${out.join("")}</g>`;
}

function hingesStatic(door) {
  const out = [];
  for (const z of [door.z0 + 6, door.z1 - 6]) {
    out.push(S(k.slabOf({ x: door.hingeX + 0.4, y: PANEL_Y, w: 4.4, d: 1.2, r: 0.5 }, z - 3, 6, P, 3, 0.3), { tone: "lo" }));
    out.push(D([at([door.hingeX + 2.6, PANEL_Y + 1.2, z - 1]), at([door.hingeX + 2.6, PANEL_Y + 1.2, z + 1])], { size: 0.4 }));
  }
  return out.join("");
}

// ---------- ключи

function keyGeom(teeth, P) {
  const blade = [
    [-1.9, -4.2],
    [1.9, -4.2],
    [1.9, -5.0],
    [2.5, -5.2],
    [2.5, -6.4],
    [1.3, -7.0],
    [1.3, -9.0],
  ];
  for (let t = 0; t < teeth; t++) {
    const z = -9.0 - t * 1.7;
    blade.push([0.3, z], [0.3, z - 0.95], [1.3, z - 0.95]);
  }
  blade.push([1.3, -14.3], [-1.3, -14.3], [-1.3, -7.0], [-2.5, -6.4], [-2.5, -5.2], [-1.9, -5.0]);
  const bow = [ringPts(0, 0, 4.6, 30), ringPts(0, 0, 2.0, 22, true)];
  return vPlate([[blade], bow], -0.6, 1.2, P, { tone: "hi", lit: true, className: "key-body" });
}

function keyTag(socket, P) {
  return `<g transform="${keyMatrix(socket.x, socket.y, KEY_Z, socket.deg, P)}">${keyGeom(socket.teeth, P)}</g>`;
}

function keyDrum() {
  const out = [];
  out.push(S(k.cylinder(DRUM.x, DRUM.y, 26, 0, 10, P, 40, 0.8), { tone: "lo" }));
  out.push(L(k.ring(DRUM.x, DRUM.y, 26, 10, P, 40), { tone: "faint" }));
  out.push(D(k.pointsAt(Array.from({ length: 6 }, (_, i) => [DRUM.x + 23 * Math.cos((i / 6) * Math.PI * 2 + 0.4), DRUM.y + 26 * Math.sin((i / 6) * Math.PI * 2 + 0.4), 10]), P), { size: 0.45 }));
  out.push(S(k.cylinder(DRUM.x, DRUM.y, 20, 10, 26, P, 48, 0.8), { tone: "mid" }));
  out.push(L(k.knurl(DRUM.x, DRUM.y, 20, 10, 36, 40, P, 0.5), { tone: "lo" }));
  out.push(L(k.ring(DRUM.x, DRUM.y, 20, 20, P, 40), { tone: "faint" }));
  out.push(S(k.cylinder(DRUM.x, DRUM.y, 21.5, 36, 3.2, P, 48, 0.5), { tone: "hi" }));
  out.push(L(k.ring(DRUM.x, DRUM.y, 21.5, 39.2, P, 44), { tone: "hi" }));
  out.push(L(k.ring(DRUM.x, DRUM.y, 17.5, 39.2, P, 40), { tone: "faint" }));
  out.push(S(k.cylinder(DRUM.x, DRUM.y, 5.2, 39, 4.4, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(DRUM.x, DRUM.y, 6.6, 43.4, 5.2, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(DRUM.x, DRUM.y, 6.6, 43.4, 48.6, 22, P, 0.4), { tone: "lo" }));
  out.push(S(k.cylinder(DRUM.x, DRUM.y, 3.4, 48.6, 1.4, P, 20), { tone: "hi" }));

  for (const socket of SOCKETS) {
    const a = deg(socket.angle);
    const peg = G.frameAlong([DRUM.x + 19.4 * Math.cos(a), DRUM.y + 19.4 * Math.sin(a), KEY_Z], [Math.cos(a), Math.sin(a), 0]);
    out.push(S(G.lathe([[0, 0], [0, 2.1], [8.6, 2.1], [9.8, 1.2], [9.8, 0]], peg, P, { steps: 22 }), { tone: "hi" }));
    out.push(L(G.circleOf(peg, 9.8, 1.2, P, 16), { tone: "lo" }));
    for (let i = 0; i < socket.teeth; i++) {
      const r = 13 + i * 3.2;
      out.push(D([at([DRUM.x + r * Math.cos(a), DRUM.y + r * Math.sin(a), 39.2])], { size: 0.55, tone: "hi" }));
    }
    const tag = { x: DRUM.x + 18 * Math.cos(a) - 3, y: DRUM.y + 18 * Math.sin(a) - 3, w: 6, d: 6, r: 1 };
    out.push(S(k.slabOf(tag, 39.2, 0.5, P, 3), { tone: "faint", crease: "none" }));
  }
  const needle = `<g data-part="needle" transform="${needleMatrix(DRUM.x, DRUM.y, 39.4, 90, P)}">${vPlate(
    [
      [
        [
          [-2.2, -1.1],
          [17.5, -1.1],
          [17.5, 1.1],
          [-2.2, 1.1],
        ],
      ],
    ],
    0,
    1.4,
    P,
    { tone: "hi", lit: true },
  )}</g>`;
  out.push(needle);
  return out.join("");
}

// ---------- журнальный барабан

const JOURNAL_COUNTS = [
  [0, 0, 0],
  [1, 1, 0],
  [2, 2, 0],
  [3, 2, 1],
];

function horizontalRoll(x0, x1, y, z, r, P, tone = "mid", steps = 40) {
  const F = G.frameAlong([x0, y, z], [1, 0, 0]);
  const len = x1 - x0;
  const shape = G.lathe(
    [
      [0, 0],
      [0, r],
      [len, r],
      [len, 0],
    ],
    F,
    P,
    { steps },
  );
  return { shape, F, len };
}

function rollWithRings(x0, x1, y, z, r, P, rings, tone) {
  const { shape, F, len } = horizontalRoll(x0, x1, y, z, r, P, tone);
  const out = [S(shape, { tone })];
  rings.forEach((share) => {
    out.push(L(G.circleOf(F, len * share, r, P, 36), { tone: "faint" }));
  });
  return out.join("");
}

function tapeTable() {
  const out = [];
  const x0 = JOURNAL_X0 + 1;
  const x1 = JOURNAL_X1 - 1;
  out.push(
    `<path class="paper-face" d="${k.pathOf(
      [
        [x0, -56, PAPER_Z - 0.4],
        [x1, -56, PAPER_Z - 0.4],
        [x1, -58, 38],
        [x0, -58, 38],
      ].map((point) => at(point)),
      true,
    )}"/>`,
  );
  out.push(S(k.slabOf({ x: x0, y: -56, w: x1 - x0, d: 54, r: 0.4 }, PAPER_Z - 0.5, 0.5, P, 2), { tone: "hi", crease: "none", className: "paper-solid" }));
  out.push(L(k.lineOnTop([x0, -56], [x1, -56], PAPER_Z + 0.02, P), { tone: "faint", free: true }));
  out.push(L(k.lineOnTop([x0, -2], [x1, -2], PAPER_Z + 0.02, P), { tone: "faint", free: true }));

  for (let i = 0; i < JOURNAL.length; i++) {
    const glyphs = [];
    const seed = JOURNAL[i].what.length + JOURNAL[i].result.length * 3;
    for (let g = 0; g < 8; g++) {
      const gx = 112 + g * 3.2;
      const len = 1.2 + ((seed + g * 5) % 4) * 0.36;
      glyphs.push(
        `<g data-glyph="${g}" data-x="${gx}">${L(k.lineOnTop([gx, PRINT_Y], [gx + len, PRINT_Y], PAPER_Z + 0.12, P), {
          tone: "hi",
          free: true,
        })}</g>`,
      );
    }
    out.push(`<g data-line="${i}">${glyphs.join("")}</g>`);
  }
  return out.join("");
}

function tapeFront() {
  const x0 = JOURNAL_X0 + 1;
  const x1 = JOURNAL_X1 - 1;
  const quad = (y0, z0, y1, z1) =>
    `<path class="paper-face" d="${k.pathOf(
      [
        [x0, y0, z0],
        [x1, y0, z0],
        [x1, y1, z1],
        [x0, y1, z1],
      ].map((point) => at(point)),
      true,
    )}"/>`;
  return [
    quad(-2, PAPER_Z, 2, 46.9),
    quad(2, 46.9, 7, 42),
    quad(7, 42, 9, 37.4),
    quad(9, 37.4, 15.6, 31.6),
  ].join("");
}

function journal() {
  const out = [];
  out.push(S(k.slabOf({ x: 100, y: -64, w: 52, d: 70, r: 4 }, 0, 10, P, 5, 0.8), { tone: "lo" }));
  out.push(L(k.planOutline({ x: 100, y: -64, w: 52, d: 70, r: 4 }, 10, P, 5), { tone: "faint" }));
  out.push(D([[104, -60], [148, -60], [148, 2], [104, 2]].map(([x, y]) => at([x, y, 10])), { size: 0.45 }));
  out.push(S(k.slabOf({ x: 102, y: -62, w: 48, d: 64, r: 3 }, 10, 32, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: 102, y: -62, w: 48, d: 64, r: 3 }, 30, P, 5), { tone: "faint" }));
  out.push(S(k.slabOf({ x: 100, y: -64, w: 52, d: 70, r: 4 }, 42, 2, P, 5, 0.5), { tone: "hi" }));
  out.push(L(k.planOutline({ x: 104, y: -60, w: 44, d: 62, r: 3 }, 44, P, 4), { tone: "faint" }));
  out.push(
    `<path class="iso-shade" data-shade="0" d="${k.pathOf(
      [
        [JOURNAL_X0, -58],
        [JOURNAL_X1, -58],
        [JOURNAL_X1, -54],
        [JOURNAL_X0, -54],
      ].map(([x, y]) => at([x, y, 44.05])),
      true,
    )}"/>`,
  );

  out.push(rollWithRings(106, 146, 2, 42, 5, P, [0.5], "hi"));
  out.push(rollWithRings(106, 146, 9, 30, 7, P, [0.22, 0.5, 0.78], "mid"));
  for (const x of [102, 146]) {
    out.push(S(k.slabOf({ x, y: 2, w: 4, d: 9, r: 1 }, 27, 6, P, 3), { tone: "mid" }));
  }

  out.push(tapeTable());

  out.push(S(k.slabOf({ x: 104, y: PRINT_Y - 4, w: 44, d: 8, r: 1.4 }, 52, 2.2, P, 4, 0.4), { tone: "hi" }));
  for (const x of [104, 145]) {
    out.push(S(k.slabOf({ x, y: PRINT_Y - 2, w: 3, d: 4, r: 0.8 }, 44, 8, P, 3), { tone: "mid" }));
  }
  out.push(L(k.lineOnTop([110, PRINT_Y], [142, PRINT_Y], 54.3, P), { tone: "faint", free: true }));

  const head = [
    S(k.slabOf({ x: 120, y: PRINT_Y - 5, w: 10, d: 10, r: 2 }, 47, 5, P, 4, 0.6), { tone: "hi" }),
    S(k.slabOf({ x: 122, y: PRINT_Y - 3, w: 6, d: 6, r: 1.2 }, 45.8, 1.4, P, 3, 0.3), { tone: "mid" }),
    S(k.slabOf({ x: 124.4, y: PRINT_Y - 1.2, w: 1.6, d: 2.4, r: 0.4 }, 45.1, 0.9, P, 3), { tone: "lo" }),
    S(k.cylinder(120.4, PRINT_Y - 3.4, 1.8, 52, 1.5, P, 16), { tone: "mid" }),
    D([at([126, PRINT_Y + 4.6, 49.6])], { size: 0.42 }),
  ];
  out.push(`<g data-part="head" transform="${k.translateAlong(P, [0, 0, 0])}">${head.join("")}</g>`);

  out.push(tapeFront());
  out.push(
    `<g data-part="crank"><path class="iso-line" data-tone="hi" data-free="" data-arm="1" d="${k.segment([150.6, 16, 30], [150.6, 9, 30], P)}"/><g data-knob transform="${k.translateAlong(P, [0, 0, 0])}">${S(
      k.cylinder(150.6, 16, 1.9, 28.2, 3.6, P, 16),
      { tone: "hi" },
    )}</g>${L(k.sideRing([150.6, 9, 30], 2.2, "x", P, 16), { tone: "lo" })}</g>`,
  );

  for (let i = 0; i < 3; i++) {
    const x = 113 + i * 13;
    out.push(faceDisc(x, 17, 4.6, 2.05, P, "hi", "1"));
    out.push(L(k.sideRing([x, 2.1, 17], 4.6, "y", P, 24), { tone: "hi" }));
    out.push(
      `<g data-count="${i}">${k.faceTextSvg(k.sideMatrix([x, 2.1], 17, P, "left"), "0", {
        size: 4.8,
        tone: "hi",
        anchor: "middle",
      })}</g>`,
    );
  }
  out.push(S(k.slabOf({ x: 108, y: 1.8, w: 36, d: 1.2, r: 0.6 }, 10, 1.6, P, 3), { tone: "lo" }));
  return out.join("");
}

// ---------- консоль личности и лампа отказа

function consoleBox() {
  const out = [];
  out.push(S(k.slabOf({ x: -70, y: -34, w: 50, d: 26, r: 3 }, 162, 12, P, 4, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -67, y: -31, w: 44, d: 20, r: 2 }, 174, 1.4, P, 3, 0.4), { tone: "hi" }));
  out.push(S(k.slabOf({ x: -64, y: -28, w: 26, d: 17, r: 1.4 }, 175.4, 0.6, P, 3), { tone: "hi", crease: "none" }));
  out.push(D([at([-60, -25, 176]), at([-60, -14, 176])], { size: 0.5 }));
  out.push(S(k.slabOf({ x: -36, y: -24, w: 7, d: 11, r: 0.8 }, 175.4, 0.9, P, 3), { tone: "mid" }));
  out.push(L(k.planOutline({ x: -41, y: -27, w: 16, d: 17, r: 1.6 }, 176, P, 3), { tone: "faint" }));
  out.push(`<g data-part="scan" transform="${k.translateAlong(P, [0, 0, 0])}">${S(
    k.slabOf({ x: -63, y: -26, w: 2.4, d: 13, r: 0.6 }, 176.2, 0.8, P, 3),
    { tone: "lit", lit: true },
  )}</g>`);
  out.push(`<g data-part="idled">${S(k.cylinder(-30, -14, 2.2, 176, 1.2, P, 18), { tone: "green", className: "id-led" })}</g>`);
  out.push(L(k.planOutline({ x: -70, y: -34, w: 50, d: 26, r: 3 }, 174, P, 4), { tone: "faint" }));
  return out.join("");
}

function lamp() {
  const out = [];
  out.push(S(k.slabOf({ x: 52, y: -32, w: 28, d: 20, r: 3 }, 162, 3.4, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(66, -22, 2.6, 165.4, 5.4, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(66, -22, 7, 170.8, 2.4, P, 28), { tone: "hi" }));
  out.push(
    `<g data-part="lamp" class="lamp-lens">${S(G.sphereOf([66, -22, 176], 5.6, P, { steps: 36 }), { tone: "hi" })}${L(
      G.circleOf(G.frameAlong([66, -22, 176], [0, 0, 1]), 0, 5.6, P, 28),
      { tone: "red" },
    )}</g>`,
  );
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    out.push(
      S(k.cylinder(66 + 6.2 * Math.cos(a), -22 + 6.2 * Math.sin(a), 0.45, 171.8, 9.4, P, 10), {
        tone: "mid",
      }),
    );
  }
  out.push(S(k.cylinder(66, -22, 6.6, 181.2, 1.6, P, 28), { tone: "hi" }));
  out.push(D([at([52 + 4, -32 + 4, 165.4]), at([52 + 24, -32 + 16, 165.4])], { size: 0.45 }));
  out.push(L(k.ring(66, -22, 6.6, 182.8, P, 28), { tone: "hi" }));
  return out.join("");
}

// ---------- сборка

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A lock rack on a heavy base. Three rows of doors are labelled student, teacher and admin, each door with its own lock box, handle and two hinges. A key drum on the left holds three keys with one, two and three teeth. A journal printer on the right carries a paper tape over a platen and under a moving print head, with three counters on its front panel. A red refusal lamp and an identity console stand on the cabinet top.",
  body: [
    `<defs><radialGradient id="lampGlow"><stop offset="0" style="stop-color:var(--anatomy-red);stop-opacity:.55"/><stop offset=".55" style="stop-color:var(--anatomy-red);stop-opacity:.18"/><stop offset="1" style="stop-color:var(--anatomy-red);stop-opacity:0"/></radialGradient></defs>`,
    plate(),
    cabinet(),
    DOORS.map((door, index) => hingesStatic(door)).join(""),
    keyDrum(),
    journal(),
    consoleBox(),
    `<circle data-glow cx="${at([66, -22, 176])[0]}" cy="${at([66, -22, 176])[1]}" r="24" fill="url(#lampGlow)" style="opacity:0;pointer-events:none"/>`,
    lamp(),
    DOORS.map((entry, index) => doorSvg(entry, index)).join(""),
    SOCKETS.filter((socket) => socket.role !== "teacher").map((socket) => keyTag(socket, P)).join(""),
    `<g data-part="key" transform="${keyMatrix(TEACHER_KEY.x, TEACHER_KEY.y, KEY_Z, TEACHER_KEY.deg, P)}">${keyGeom(TEACHER_KEY.teeth, P)}</g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const DOORS = ${JSON.stringify(DOORS.map((door) => ({ hx: door.hingeX, hy: PANEL_Y })))};
const KEY_REST = ${JSON.stringify([TEACHER_KEY.x, TEACHER_KEY.y, KEY_Z, TEACHER_KEY.deg])};
const LOCK = ${JSON.stringify(LOCK)};
const SCAN_X = ${JSON.stringify([-63, -63])};
const PRINT_X = ${JSON.stringify([112, 138])};
const COUNTS = ${JSON.stringify(JOURNAL_COUNTS)};
const N = ${STEPS.length};
const STEP_READOUTS = ${JSON.stringify(STEPS.map((step) => step.readout))};
const STEP_LABELS = ${JSON.stringify(STEPS.map((step) => step.label))};
const OPEN = ${-OPEN};
const LAMP_ON = ${JSON.stringify([0, 0, 0, 0, 0, 1, 1, 0])};
const FINAL_DOORS = ${JSON.stringify([[], [], [], [3, 0], [3, 0], [3, 0], [3, 0], [3, 0]])};

const K = (x, y, z, d) => ({ key: [x, y, z, d] });
const PLANS = [
  [],
  [K(-140, 10, 64, 120)],
  [K(-108, 46, 88, 0)],
  [
    K(-92, 58, 104, 0),
    K(LOCK.teacher.x, 46, LOCK.teacher.z + 8, 0),
    K(LOCK.teacher.x, ${Y_INS}, LOCK.teacher.z, 0),
    K(LOCK.teacher.x, ${Y_INS}, LOCK.teacher.z, 85),
    K(LOCK.teacher.x, 46, LOCK.teacher.z, 0),
    { door: [3, OPEN] },
    K(-56, 56, 80, 0),
    K(LOCK.student.x, 46, LOCK.student.z + 8, 0),
    K(LOCK.student.x, ${Y_INS}, LOCK.student.z, 0),
    K(LOCK.student.x, ${Y_INS}, LOCK.student.z, 85),
    K(LOCK.student.x, 46, LOCK.student.z, 0),
    { door: [0, OPEN] },
    K(-84, 60, 76, 35),
  ],
  [
    K(-40, 62, 98, 10),
    K(24, 64, 122, 0),
    K(LOCK.admin.x, 46, LOCK.admin.z + 10, 0),
    K(LOCK.admin.x, ${Y_INS}, LOCK.admin.z, 0),
    K(LOCK.admin.x, ${Y_INS}, LOCK.admin.z, 9),
    K(LOCK.admin.x, ${Y_INS}, LOCK.admin.z, 0),
    K(LOCK.admin.x, 50, LOCK.admin.z + 6, 12),
  ],
  [K(LOCK.admin.x - 8, 58, LOCK.admin.z + 8, 45)],
  [
    K(10, 70, 108, 55),
    K(-90, 62, 76, 85),
    K(-132, 30, 60, 105),
    K(-150, -18, 44, 112),
    K(KEY_REST[0], KEY_REST[1], KEY_REST[2], KEY_REST[3]),
  ],
  [],
];
const STEP_PRINTED = ${JSON.stringify([0, 0, 0, 2, 2, 2, 3, 3])};
const NEEDLE = ${JSON.stringify([90, 210, 210, 210, 210, 210, 210, 210])};

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const key = svg.querySelector('[data-part="key"]');
const needle = svg.querySelector('[data-part="needle"]');
const head = svg.querySelector('[data-part="head"]');
const arm = svg.querySelector('[data-part="crank"] [data-arm]');
const knob = svg.querySelector('[data-part="crank"] [data-knob]');
const scan = svg.querySelector('[data-part="scan"]');
const idled = svg.querySelector('[data-part="idled"]');
const lampEl = svg.querySelector('[data-part="lamp"]');
const glow = svg.querySelector("[data-glow]");
const doors = Array.from(svg.querySelectorAll("[data-door]"));
const lines = Array.from(svg.querySelectorAll("[data-line]"));
const counts = [0, 1, 2].map((i) => svg.querySelector('[data-count="' + i + '"] text'));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const RAD = Math.PI / 180;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const near = (a, b) => Math.abs(a - b) < 0.04;

const ease = (cur, target, tau, dt) => {
  const next = cur + (target - cur) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 0.008 ? target : next;
};

const keyMatrix = (px, py, pz, value) => {
  const a = value * RAD;
  const X0 = SIN_A * SCALE;
  const X1 = COS_A * SIN_E * SCALE;
  const U0 = (Math.cos(a) * SIN_A - Math.sin(a) * COS_A) * SCALE;
  const U1 = (Math.cos(a) * COS_A + Math.sin(a) * SIN_A) * SIN_E * SCALE;
  const A = U0 / X0;
  const B = (U1 - X1) / X0;
  const o = iso([px, py, pz], P);
  const l = iso([0, 0, 0], P);
  const f = (value) => Math.round(value * 1000) / 1000;
  return 'matrix(' + f(A) + ' ' + f(B) + ' 0 1 ' + f(o[0] - A * l[0]) + ' ' + f(o[1] - B * l[0] - l[1]) + ')';
};
const needleMatrix = (px, py, pz, value) => {
  const a = value * RAD;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const app = (x, y) => [(x * SIN_A - y * COS_A) * SCALE, (x * COS_A + y * SIN_A) * SIN_E * SCALE];
  const inv = (X, Y) => {
    const u = X / SCALE;
    const v = Y / (SCALE * SIN_E);
    return [u * SIN_A + v * COS_A, -u * COS_A + v * SIN_A];
  };
  const e1 = inv(1, 0);
  const e2 = inv(0, 1);
  const r1 = [e1[0] * c - e1[1] * s, e1[0] * s + e1[1] * c];
  const r2 = [e2[0] * c - e2[1] * s, e2[0] * s + e2[1] * c];
  const A = app(r1[0], r1[1]);
  const B = app(r2[0], r2[1]);
  const o = iso([px, py, pz], P);
  const l = iso([0, 0, 0], P);
  const f = (value) => Math.round(value * 1000) / 1000;
  return 'matrix(' + f(A[0]) + ' ' + f(A[1]) + ' ' + f(B[0]) + ' ' + f(B[1]) + ' ' + f(o[0] - A[0] * l[0] - B[0] * l[1]) + ' ' + f(o[1] - A[1] * l[0] - B[1] * l[1]) + ')';
};
const doorMatrix = (hx, hy, value) => {
  const a = value * RAD;
  const X0 = SIN_A * SCALE;
  const X1 = COS_A * SIN_E * SCALE;
  const U0 = (Math.cos(a) * SIN_A - Math.sin(a) * COS_A) * SCALE;
  const U1 = (Math.cos(a) * COS_A + Math.sin(a) * SIN_A) * SIN_E * SCALE;
  const A = U0 / X0;
  const B = (U1 - X1) / X0;
  const o = iso([hx, hy, 0], P);
  const f = (value) => Math.round(value * 1000) / 1000;
  return 'matrix(' + f(A) + ' ' + f(B) + ' 0 1 ' + f(o[0] - A * o[0]) + ' ' + f(o[1] - B * o[0] - o[1]) + ')';
};

const SIN_A = ${num(sinA)};
const COS_A = ${num(cosA)};
const SIN_E = ${num(sinE)};
const COS_E = ${num(cosE)};
const SCALE = ${num(scaleK)};

let step = 0;
let queue = [];
let kx = KEY_REST[0], ky = KEY_REST[1], kz = KEY_REST[2], ka = KEY_REST[3];
let ktx = kx, kty = ky, ktz = kz, kta = ka;
let doorAngle = DOORS.map(() => 0);
let doorTarget = DOORS.map(() => 0);
let lamp = 0, lampTarget = 0;
let printed = 0, printing = -1;
let headX = 144, headTarget = 144;
let crankAngle = 0, crankTarget = 0;
let needleA = 90, needleTA = 90;
let scanA = 0, scanTarget = 0;
let lineShift = [0, 0, 0];
let countsShown = [0, 0, 0];
let frame = 0, last = 0, touring = true, visible = false, idleTimer = 0, dwell = 0;
const DWELL = 3.2;

function plan(to) {
  step = clamp(to, 0, N - 1);
  const openNow = step === 3 ? [] : FINAL_DOORS[step];
  doorTarget = DOORS.map((_, i) => (openNow.includes(i) ? OPEN : 0));
  lampTarget = LAMP_ON[step];
  needleTA = NEEDLE[step];
  scanTarget = step === 0 ? 1 : 0;
  if (STEP_PRINTED[step] < printed) {
    printed = STEP_PRINTED[step];
    printing = -1;
  }
  queue = (PLANS[step] || []).slice();
  for (let i = printed; i < STEP_PRINTED[step]; i++) queue.push({ kind: "print" });
  dwell = 0;
}

function targetCounts(n) {
  return COUNTS[clamp(n, 0, 3)];
}

function advance(dt) {
  if (!queue.length) return;
  const act = queue[0];
  if (act.key) {
    const [x, y, z, d] = act.key;
    ktx = x; kty = y; ktz = z; kta = d;
    if (near(kx, x) && near(ky, y) && near(kz, z) && near(ka, d)) queue.shift();
  } else if (act.door) {
    doorTarget[act.door[0]] = act.door[1];
    if (near(doorAngle[act.door[0]], act.door[1])) queue.shift();
  } else if (act.kind === "print") {
    if (act.phase === undefined) {
      act.phase = 0;
      headTarget = PRINT_X[0];
    }
    if (act.phase === 0) {
      if (near(headX, PRINT_X[0])) {
        act.phase = 1;
        printing = printed;
        headTarget = PRINT_X[1];
      }
    } else if (near(headX, PRINT_X[1])) {
      printed += 1;
      printing = -1;
      headTarget = 144;
      crankTarget += 120;
      queue.shift();
    }
  }
}

function draw(dt) {
  const calm = still.matches;
  key.setAttribute("transform", keyMatrix(kx, ky, kz, ka));
  needle.setAttribute("transform", needleMatrix(-131, -4, 39.4, needleA));
  for (let i = 0; i < doors.length; i++) {
    doors[i].setAttribute("transform", doorMatrix(DOORS[i].hx, DOORS[i].hy, doorAngle[i]));
  }
  head.setAttribute("transform", translateAlong(P, [headX - 125, 0, 0]));
  const ca = crankAngle * RAD;
  const cy = 9 + 7 * Math.cos(ca);
  const cz = 30 + 7 * Math.sin(ca);
  arm.setAttribute("d", segment([150.6, 9, 30], [150.6, cy, cz], P));
  knob.setAttribute("transform", translateAlong(P, [0, cy - 16, cz - 30]));
  scan.setAttribute("transform", translateAlong(P, [scanA * 22, 0, 0]));
  idled.style.opacity = scanA > 0.5 ? "1" : ".25";
  lampEl.classList.toggle("is-on", lamp > 0.6);
  glow.style.opacity = String(lamp * 0.85);

  for (let i = 0; i < lines.length; i++) {
    const group = lines[i];
    const glyphs = group.querySelectorAll("[data-glyph]");
    const active = i === printing;
    const done = i < printed;
    for (const glyph of glyphs) {
      const visibleNow = done || (active && Number(glyph.dataset.x) <= headX);
      glyph.style.opacity = visibleNow ? "1" : "0";
    }
    const target = done ? (printed - 1 - i) * ${LINE_GAP} : 0;
    lineShift[i] = calm ? target : ease(lineShift[i], target, 0.22, dt);
    group.setAttribute("transform", translateAlong(P, [0, lineShift[i], 0]));
  }
  const shown = targetCounts(printed);
  for (let i = 0; i < 3; i++) {
    countsShown[i] = calm ? shown[i] : ease(countsShown[i], shown[i], 0.25, dt);
    const text = String(Math.round(countsShown[i]));
    if (counts[i] && counts[i].textContent !== text) counts[i].textContent = text;
  }
  const text = STEP_READOUTS[step];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(step));
  stage.setAttribute("aria-valuetext", "шаг " + (step + 1) + " из " + N + ": " + STEP_LABELS[step] + ", " + STEP_READOUTS[step]);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 0.08) : 1 / 60;
  last = now;
  const calm = still.matches;
  advance(dt);
  if (!queue.length) {
    dwell += dt;
    if (touring && dwell > DWELL) {
      plan((step + 1) % N);
      dwell = 0;
    }
  }
  kx = calm ? ktx : ease(kx, ktx, 0.26, dt);
  ky = calm ? kty : ease(ky, kty, 0.26, dt);
  kz = calm ? ktz : ease(kz, ktz, 0.26, dt);
  ka = calm ? kta : ease(ka, kta, 0.22, dt);
  for (let i = 0; i < doors.length; i++) doorAngle[i] = calm ? doorTarget[i] : ease(doorAngle[i], doorTarget[i], 0.3, dt);
  lamp = calm ? lampTarget : ease(lamp, lampTarget, 0.16, dt);
  headX = calm ? headTarget : ease(headX, headTarget, 0.1, dt);
  crankAngle = calm ? crankTarget : ease(crankAngle, crankTarget, 0.35, dt);
  needleA = calm ? needleTA : ease(needleA, needleTA, 0.35, dt);
  scanA = calm ? scanTarget : ease(scanA, scanTarget, 0.3, dt);
  draw(dt);
  const quiet =
    !touring &&
    !queue.length &&
    near(kx, ktx) && near(ky, kty) && near(kz, ktz) && near(ka, kta) &&
    doorAngle.every((value, i) => near(value, doorTarget[i])) &&
    near(lamp, lampTarget) && near(headX, headTarget) && near(crankAngle, crankTarget) &&
    near(needleA, needleTA) && near(scanA, scanTarget);
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
  plan(clamp(to, 0, N - 1));
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    touring = !still.matches;
    run();
  }, 4200);
  run();
};
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
let hovered = 0;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.12) / 0.76, 0, 1);
  const want = Math.min(N - 1, Math.floor(share * N));
  if (want !== hovered) {
    hovered = want;
    if (want !== step) steer(want);
  }
});
stage.addEventListener("pointerleave", () => {
  hovered = step;
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
plan(0);
draw(1 / 60);
`;

const css = `<style>
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.paper-face{fill:var(--anatomy-face)}
.paper-face,.paper-solid .iso-top{stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);stroke-linejoin:round}
.paper-solid .iso-top{fill:var(--anatomy-face)}
.door-face .iso-shade[data-shade="3"]{fill:var(--anatomy-shade-2)}
body[data-theme="dark"] .door-face .iso-shade[data-shade="3"]{fill:#1b1b1b}
body[data-theme="light"] .panel-face .iso-shade[data-shade="3"]{fill:#f7f7f4}
body[data-theme="dark"] .panel-face .iso-shade[data-shade="3"]{fill:#202020}
body[data-theme="light"] .door-face .iso-shade[data-shade="3"]{fill:#dedbd6}
.panel-face .iso-shade[data-shade="3"]{fill:var(--anatomy-shade-1)}
.panel-face .iso-top{fill:var(--anatomy-shade-3)}
.table-face .iso-top{fill:var(--anatomy-shade-1)}
.key-body .iso-top{fill:var(--anatomy-lit-top)}
.key-body .iso-shade{fill:var(--anatomy-lit-shade)}
.lamp-lens .iso-fill{fill:var(--anatomy-red);opacity:.26}
.lamp-lens .iso-top{fill:var(--anatomy-red);opacity:.4}
.lamp-lens .iso-shade{fill:var(--anatomy-red);opacity:.3}
.lamp-lens.is-on .iso-fill{opacity:.8}
.lamp-lens.is-on .iso-top{opacity:1}
.lamp-lens.is-on .iso-shade{opacity:.7}
.lamp-lens .iso-edge{stroke:var(--anatomy-red)}
.id-led .iso-top{fill:var(--anatomy-green)}
.id-led .iso-edge{stroke:var(--anatomy-green)}
[data-line] [data-glyph]{transition:opacity .08s linear}
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
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: стрелки ведут проверку доступа от личности до журнала" aria-valuemin="0" aria-valuemax="${STEPS.length - 1}" aria-valuenow="0">${svg}</div>`,
  });

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}
