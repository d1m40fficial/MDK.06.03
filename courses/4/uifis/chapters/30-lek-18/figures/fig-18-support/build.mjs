import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as lathe from "../../../../../../_anatomy/kit/lathe.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, STEPS, STANDS, DRAWERS } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 640;
const HEIGHT = 456;

// Тележка сопровождения: рельс вдоль пяти стоек, четыре ящика с содержимым,
// планшет маршрута с часами SLA, счётчик обращений, стрелка приоритета и
// ворота архива с запечатанным ящиком.

const PLATE = { x: -130, y: -64, w: 316, d: 98, r: 12 };
const PLATE_H = 10;
const FOOT_H = 6;
const RAIL_Y = [-9, 9];
const RAIL = { x0: -124, x1: 134, z0: 0, z1: 3.2 };
const SLEEPERS = Array.from({ length: 13 }, (_, index) => -120 + index * 20);
const POST_X = [-104, -58, -12, 34, 74];
const STOP_X = [-104, -58, -12, 34, 34, 74, 110];
const ROUTE_MARKS = [-104, -58, -12, 34, 74, 110];

const CART_HALF = 24;
const CART_Y0 = -16;
const CART_Y1 = 16;
const DECK_Z = 30.6;
const BAYS = [-17.4, -5.8, 5.8, 17.4];
const PULL = 8.6;
const WHEEL_R = 3.2;
const WHEEL_W = 3.4;
const WHEEL_Z = RAIL.z1 + WHEEL_R;
const WHEEL_X = [-18, 18];
const WHEEL_Y = [-9, 9];
const ARCHIVE_X = 154;
const GATE_LIFT = 12.4;

const D = DRAWERS.map((drawer) => drawer.key);
const DRAWER_INDEX = Object.fromEntries(STEPS.map((step) => [step.key, D.indexOf(step.drawer)]));
const ROUTE_X = Array.from({ length: STEPS.length }, (_, index) => -18.6 + index * 3.5);

const pts = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  [POST_X[0] - 6, -58, 51.4],
  [POST_X[4] + 6, -42, 51.4],
  [PLATE.x, PLATE.y + PLATE.d, 0],
  [ARCHIVE_X + 7, 28, 40.2],
  [170, 14, 21.6],
  [STOP_X[0] + 28, 0, 45.6],
];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 18, azimuth: 38, elevation: 30 });

const at = (point) => k.iso(point, P);
const S = (paths, style) => {
  parts += 1;
  return k.solidSvg(paths, style);
};
const L = (d, style) => k.lineSvg(d, style);
const Dot = (dots, style) => k.dotsSvg(dots, style);
let parts = 0;

function roundDisc(x, y, z, axis, from, to, radius, style) {
  const frame = lathe.frameAlong([x, y, z], axis);
  return S(lathe.disc(from, to, radius, frame, P, { bevel: 0.35 }), style);
}

function ringOn(x, y, z, axis, radius, tone = "lo") {
  const frame = lathe.frameAlong([x, y, z], axis);
  return L(lathe.circleOf(frame, 0, radius, P), { tone });
}

// ---------------------------------------------------------------- основание

function plate() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H + FOOT_H, P)}"/>`);
  const feet = k.corners(PLATE, 14).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 5.6, -PLATE_H - FOOT_H, 1.8, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.2, -PLATE_H - 4.4, 4.4, P, 28), { tone: "mid" }));
    out.push(L(k.ring(x, y, 5.6, -PLATE_H, P, 28), { tone: "lo" }));
    out.push(Dot([at([x, y, -PLATE_H - FOOT_H + 0.2])], { size: 0.42 }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 10, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P, 10), { tone: "faint" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.1, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(Dot(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  out.push(S(k.slabOf({ x: -78, y: 23, w: 34, d: 8, r: 1.2 }, 0, 0.8, P, 4), { tone: "mid", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan({ x: -78, y: 23, w: 34, d: 8, r: 1.2 }, 1.3), 0.8, P, 4), { tone: "lo" }));
  out.push(
    L(
      [17, 11, 6]
        .map((len, index) => k.lineOnTop([-75, 25.2 + index * 2.2], [-75 + len, 25.2 + index * 2.2], 0.8, P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(Dot([at([-50, 27, 0.8])], { size: 0.5 }));
  const strip = { x: 20, y: 27, w: 136, d: 5, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.7, P, 4), { tone: "mid", crease: "none" }));
  const ticks = k.topTicks(22, 154, 4, 5, 27.8, 0.7, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(Dot([at([-104, 29.5, 0.7]), at([34, 29.5, 0.7]), at([110, 29.5, 0.7])], { size: 0.5 }));
  out.push(S(k.slabOf({ x: -110, y: 12.5, w: 224, d: 2.4, r: 1 }, 0, 0.35, P, 4), { tone: "faint", crease: "none" }));
  for (const x of ROUTE_MARKS) {
    out.push(L(k.lineOnTop([x, 12.9], [x, 14.5], 0.35, P), { tone: "mid" }));
    out.push(Dot([at([x, 13.7, 0.35])], { size: 0.5 }));
  }
  out.push(S(k.slabOf({ x: 127, y: -16, w: 6.6, d: 32, r: 1.4 }, 0, 5, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline({ x: 128.6, y: -13, w: 2.6, d: 26, r: 1 }, 5, P, 4), { tone: "faint" }));
  out.push(S(k.slabOf({ x: -128, y: -16, w: 6, d: 32, r: 1.4 }, 0, 4, P, 4, 0.5), { tone: "mid" }));
  return out.join("");
}

// ------------------------------------------------------------------- рельсы

function rails() {
  const out = [];
  for (const y of RAIL_Y) {
    out.push(S(k.slabOf({ x: RAIL.x0, y: y - 2, w: RAIL.x1 - RAIL.x0, d: 4, r: 1 }, RAIL.z0, RAIL.z1, P, 4, 0.5), { tone: "mid" }));
    out.push(L(k.lineOnTop([RAIL.x0 + 3, y], [RAIL.x1 - 3, y], RAIL.z1, P), { tone: "faint" }));
    out.push(Dot([-116, -72, -28, 16, 62, 108].map((x) => at([x, y, RAIL.z1])), { size: 0.4 }));
  }
  for (const x of SLEEPERS) {
    out.push(S(k.slabOf({ x, y: -15, w: 5.2, d: 30, r: 1 }, 0, RAIL.z0, P, 4), { tone: "lo" }));
    out.push(Dot([at([x + 1.4, -12.6, RAIL.z0]), at([x + 1.4, 12.6, RAIL.z0])], { size: 0.38 }));
  }
  return out.join("");
}

// ------------------------------------------------------------------- стойки

function post(index, px) {
  const out = [];
  const column = { x: px - 4, y: -56, w: 8, d: 8, r: 1.4 };
  out.push(S(k.slabOf({ x: px - 8, y: -60, w: 16, d: 16, r: 2 }, 0, 2.4, P, 6), { tone: "lo" }));
  out.push(Dot(k.corners({ x: px - 8, y: -60, w: 16, d: 16 }, 3).map(([x, y]) => at([x, y, 2.4])), { size: 0.4 }));
  out.push(S(k.slabOf(column, 2.4, 44.2, P, 6, 0.6), { tone: "mid" }));
  out.push(L(k.sideSeam(column, 30, P, 6), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(column, 1.1), 2.4, P, 6), { tone: "lo" }));
  for (const band of [9.4, 40.6]) {
    out.push(S(k.slabOf({ x: px - 5, y: -57, w: 10, d: 10, r: 1.6 }, band, 1.2, P, 5), { tone: "lo" }));
  }
  out.push(S(k.slabOf({ x: px - 6, y: -58, w: 12, d: 12, r: 1.5 }, 46.6, 1.8, P, 6, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline({ x: px - 4.2, y: -56.2, w: 8.4, d: 8.4, r: 1 }, 48.4, P, 5), { tone: "faint" }));
  out.push(Dot([at([px - 3, -53, 2.4]), at([px + 3, -53, 2.4])], { size: 0.4 }));
  for (let pip = 0; pip < STANDS[index].pips; pip += 1) {
    out.push(S(k.cylinder(px - 3 + pip * 2, -54, 0.8, 48.4, 0.9, P, 16), { tone: "hi" }));
  }
  const arm = { x: px - 2.2, y: -52, w: 4.4, d: 44, r: 1 };
  out.push(S(k.slabOf(arm, 43.4, 2.2, P, 5, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(arm, 1), 45.6, P, 5), { tone: "faint" }));
  out.push(Dot([at([px, -30, 45.6]), at([px, -18, 45.6]), at([px - 1.4, -48, 43.4])], { size: 0.38 }));
  const head = [px, -11];
  out.push(roundDisc(head[0], head[1], 40.6, [0, 0, 1], 0, 2.6, 1.9, { tone: "mid", crease: "lo" }));
  out.push(roundDisc(head[0], head[1], 40.4, [0, 0, 1], 0, 0.5, 3.1, { tone: "lo", crease: "faint" }));
  out.push(ringOn(head[0], head[1], 40.9, [0, 0, 1], 3.1, "mid"));
  out.push(Dot([at([px - 1.1, -11, 40.4]), at([px + 1.1, -11, 40.4])], { size: 0.38 }));
  out.push(roundDisc(px, -47.8, 34, [0, 1, 0], 0, 2.1, 2, { tone: "lo", crease: "faint" }));
  out.push(ringOn(px, -45.7, 34, [0, 1, 0], 2, "mid"));
  out.push(
    k.wireSvg(at([px + 1.8, -11, 42.5]), at([px + 0.6, -56.6, 32.4]), {
      via: [at([px + 2.4, -18, 45.9]), at([px + 1.6, -48, 45.9]), at([px + 0.4, -56.4, 38])],
      tone: "lo",
      size: 1.1,
    }),
  );
  out.push(S(k.cylinder(px, -52, 1.5, 48.4, 1.1, P, 18), { tone: "lo" }));
  out.push(
    `<g data-lamp="${index}">${S(k.cylinder(px, -52, 2.1, 49.5, 1.8, P, 22), { tone: "hi", crease: "lo", className: "lamp-lens" })}${L(k.ring(px, -52, 2.1, 51.3, P, 22), { tone: "mid" })}</g>`,
  );
  return `<g data-post="${index}">${out.join("")}</g>`;
}

// ------------------------------------------------------------ ворота архива

function archive() {
  const out = [];
  out.push(S(k.slabOf({ x: 159, y: 2, w: 19, d: 18, r: 2 }, 0, 8.4, P, 5), { tone: "lo" }));
  out.push(S(k.slabOf({ x: 157.6, y: 0.8, w: 21.8, d: 20.4, r: 2 }, 8.4, 1.8, P, 6, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline({ x: 159.6, y: 2.6, w: 17.8, d: 16.8, r: 1.4 }, 10.2, P, 5), { tone: "faint" }));
  for (const gy of [-17, 27]) {
    out.push(S(k.slabOf({ x: ARCHIVE_X - 7, y: gy - 5, w: 14, d: 10, r: 2 }, 0, 2.2, P, 5), { tone: "lo" }));
    out.push(S(k.slabOf({ x: ARCHIVE_X - 3, y: gy - 3, w: 6, d: 6, r: 1 }, 2.2, 33.8, P, 5, 0.5), { tone: "mid" }));
    out.push(L(k.sideSeam({ x: ARCHIVE_X - 3, y: gy - 3, w: 6, d: 6, r: 1 }, 20, P, 5), { tone: "faint" }));
    out.push(S(k.slabOf({ x: ARCHIVE_X - 4.4, y: gy - 4.4, w: 8.8, d: 8.8, r: 1.2 }, 36, 1.6, P, 5), { tone: "mid" }));
    out.push(Dot([at([ARCHIVE_X - 5, gy - 4, 2.2]), at([ARCHIVE_X + 5, gy - 4, 2.2])], { size: 0.4 }));
  }
  out.push(S(k.slabOf({ x: ARCHIVE_X - 2.6, y: -20, w: 5.2, d: 50, r: 1 }, 36, 2.8, P, 6, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline({ x: ARCHIVE_X - 1.6, y: -19, w: 3.2, d: 48, r: 0.8 }, 38.8, P, 5), { tone: "faint" }));
  out.push(Dot([at([ARCHIVE_X, -14, 38.8]), at([ARCHIVE_X, 8, 38.8]), at([ARCHIVE_X, 24, 38.8])], { size: 0.4 }));
  out.push(S(k.slabOf({ x: ARCHIVE_X - 2, y: -5, w: 4, d: 12, r: 0.8 }, 33.2, 2.6, P, 4), { tone: "lo" }));
  out.push(
    L([7, 4.4].map((len, index) => k.lineOnTop([ARCHIVE_X - 1, -3 + index * 2.4], [ARCHIVE_X - 1 - len, -3 + index * 2.4], 35.8, P)).join(""), {
      tone: "faint",
      free: true,
    }),
  );
  out.push(S(k.cylinder(ARCHIVE_X, 16, 1.4, 38.8, 1.5, P, 20), { tone: "hi" }));
  out.push(L(k.ring(ARCHIVE_X, 16, 1.4, 40.3, P, 20), { tone: "mid" }));
  out.push(
    `<g data-barrier>${S(k.slabOf({ x: ARCHIVE_X - 1.3, y: -16, w: 2.6, d: 18, r: 0.6 }, 15.6, 2.4, P, 4, 0.4), { tone: "hi" })}${L(k.lineOnTop([ARCHIVE_X, -15.4], [ARCHIVE_X, 1.4], 18, P), { tone: "faint" })}${Dot([at([ARCHIVE_X, -14, 16]), at([ARCHIVE_X, 0, 16])], { size: 0.4 })}</g>`,
  );
  const box = { x: 161, y: 4, w: 14, d: 16, r: 1.2 };
  const boxGroup = [];
  boxGroup.push(S(k.slabOf(box, 10.2, 10.8, P, 6, 0.8), { tone: "hi" }));
  boxGroup.push(L(k.planOutline(k.insetPlan(box, 1.4), 21, P, 6), { tone: "faint" }));
  for (const x of [163.4, 172.2]) {
    boxGroup.push(S(k.slabOf({ x, y: box.y - 0.4, w: 1.8, d: box.d + 0.8, r: 0.4 }, 21, 0.7, P, 3), { tone: "mid", crease: "none" }));
    boxGroup.push(S(k.slabOf({ x, y: box.y + box.d - 0.3, w: 1.8, d: 0.9, r: 0.4 }, 10.2, 10.8, P, 3), { tone: "mid", crease: "none" }));
  }
  boxGroup.push(roundDisc(168.4, 20.4, 15.4, [0, 1, 0], 0, 0.7, 1.7, { tone: "mid", crease: "faint" }));
  boxGroup.push(ringOn(168.4, 21.1, 15.4, [0, 1, 0], 1.7, "red"));
  boxGroup.push(S(k.slabOf({ x: 160.6, y: 3.5, w: 14.8, d: 17, r: 1.4 }, 14.2, 1.2, P, 4), { tone: "mid", crease: "none" }));
  boxGroup.push(L(k.lineOnTop([162.4, 20.6], [166.6, 20.6], 18, P), { tone: "faint", free: true }));
  out.push(`<g data-archive-box>${boxGroup.join("")}</g>`);
  out.push(S(k.slabOf({ x: 158.4, y: 1.6, w: 20.4, d: 19.2, r: 1 }, 8.4, 1.8, P, 5), { tone: "lo" }));
  return out.join("");
}

// ------------------------------------------------------------------ тележка

function drawerContents(index, bx) {
  const out = [];
  if (D[index] === "docs") {
    for (let stack = 0; stack < 3; stack += 1) {
      out.push(S(k.slabOf({ x: bx - 4.2 + stack * 0.25, y: 6.2 + stack * 0.5, w: 7.6 - stack * 0.4, d: 4.2, r: 0.4 }, 15.2 + stack * 0.95, 0.95, P, 4), { tone: "hi", crease: "lo" }));
      out.push(L(k.lineOnTop([bx - 3.7, 7.2 + stack * 0.5], [bx + 2.9, 7.2 + stack * 0.5], 15.35 + (stack + 1) * 0.95, P), { tone: "faint", free: true }));
    }
    out.push(roundDisc(bx - 2.6, 5.4, 16.1, [1, 0, 0], 0, 6, 1.1, { tone: "mid", crease: "faint" }));
    out.push(ringOn(bx + 0.6, 5.4, 16.1, [1, 0, 0], 1.1, "lo"));
    out.push(S(k.slabOf({ x: bx - 3.5, y: 10.9, w: 7, d: 0.7, r: 0.3 }, 15.2, 8, P, 4, 0.3), { tone: "hi" }));
    out.push(
      L(
        [4.4, 3.2, 4]
          .map((len, line) => k.segment([bx - 2.8, 11.62, 17.4 + line * 1.4], [bx - 2.8 + len, 11.62, 17.4 + line * 1.4], P))
          .join(""),
        { tone: "faint", free: true },
      ),
    );
    out.push(S(k.slabOf({ x: bx - 2.2, y: 7.2, w: 5.6, d: 0.6, r: 0.3 }, 15.2, 6.6, P, 4, 0.3), { tone: "mid" }));
  }
  if (D[index] === "spares") {
    out.push(roundDisc(bx - 2.5, 9.4, 15.2, [0, 0, 1], 0, 8, 1.9, { tone: "hi", crease: "lo" }));
    out.push(roundDisc(bx + 1.7, 8.8, 15.2, [0, 0, 1], 0, 6.8, 1.6, { tone: "hi", crease: "lo" }));
    out.push(ringOn(bx - 2.5, 9.4, 23.2, [0, 0, 1], 1.9, "mid"));
    out.push(ringOn(bx + 1.7, 8.8, 22, [0, 0, 1], 1.6, "mid"));
    out.push(Dot([at([bx - 2.5, 9.4, 23.2]), at([bx + 1.7, 8.8, 22])], { size: 0.45 }));
    out.push(S(k.slabOf({ x: bx - 4.2, y: 4.4, w: 3.6, d: 3.4, r: 0.4 }, 15.2, 3, P, 4), { tone: "mid" }));
    out.push(L(k.lineOnTop([bx - 3.8, 5.4], [bx - 1.1, 5.4], 18.2, P), { tone: "faint", free: true }));
  }
  if (D[index] === "tools") {
    out.push(roundDisc(bx - 4.2, 8.4, 16.6, [1, 0, 0], 0, 2.8, 1.25, { tone: "mid", crease: "lo" }));
    out.push(roundDisc(bx - 1.4, 8.4, 16.6, [1, 0, 0], 0, 4.6, 0.4, { tone: "hi", crease: "none" }));
    out.push(ringOn(bx - 4.25, 8.4, 16.6, [1, 0, 0], 1.25, "lo"));
    out.push(Dot([at([bx + 3.3, 8.4, 16.6])], { size: 0.4 }));
    out.push(S(k.slabOf({ x: bx - 4.2, y: 5.4, w: 6.4, d: 1.7, r: 0.5 }, 15.2, 0.9, P, 4), { tone: "hi" }));
    out.push(L(k.ring(bx - 3.6, 6.2, 1.05, 16.1, P, 16), { tone: "lo" }));
    out.push(L(k.lineOnTop([bx - 1.6, 6.2], [bx + 1.6, 6.2], 16.1, P), { tone: "faint", free: true }));
    out.push(S(k.slabOf({ x: bx + 2.1, y: 9.6, w: 1.4, d: 1.2, r: 0.3 }, 15.2, 7.4, P, 3, 0.2), { tone: "mid" }));
    out.push(roundDisc(bx + 2.8, 10.2, 22.4, [0, 1, 0], 0, 1, 1.15, { tone: "hi", crease: "faint" }));
    out.push(ringOn(bx + 2.8, 11.2, 22.4, [0, 1, 0], 1.15, "mid"));
    out.push(Dot([at([bx + 2.8, 11.25, 22.4])], { size: 0.4 }));
    out.push(S(k.slabOf({ x: bx - 4.2, y: 10.6, w: 3.8, d: 2.6, r: 0.4 }, 15.2, 0.8, P, 3), { tone: "lo" }));
    out.push(Dot([at([bx - 3.4, 11.4, 16]), at([bx - 2.5, 11.7, 16]), at([bx - 1.6, 11.3, 16])], { size: 0.34 }));
  }
  if (D[index] === "journal") {
    out.push(S(k.slabOf({ x: bx - 4.4, y: 4.6, w: 8.8, d: 4.6, r: 0.5 }, 15.2, 1.7, P, 4), { tone: "hi", crease: "lo" }));
    out.push(
      L(
        [3.6, 2.4, 4.1]
          .map((len, line) => k.lineOnTop([bx - 3.8, 5.4 + line * 1.1], [bx - 3.8 + len, 5.4 + line * 1.1], 16.9, P))
          .join(""),
        { tone: "faint", free: true },
      ),
    );
    out.push(S(k.slabOf({ x: bx - 4, y: 5, w: 7.6, d: 3.8, r: 0.4 }, 16.9, 0.9, P, 4), { tone: "mid" }));
    out.push(L(k.lineOnTop([bx - 3.4, 5.8], [bx + 2.6, 5.8], 17.8, P), { tone: "faint", free: true }));
    out.push(S(k.slabOf({ x: bx - 3.8, y: 10.9, w: 7.6, d: 0.7, r: 0.3 }, 15.2, 7.8, P, 4, 0.3), { tone: "hi" }));
    out.push(
      L(
        [4.6, 3.4, 4.2, 2.8]
          .map((len, line) => k.segment([bx - 3, 11.62, 16.9 + line * 1.3], [bx - 3 + len, 11.62, 16.9 + line * 1.3], P))
          .join(""),
        { tone: "faint", free: true },
      ),
    );
    out.push(roundDisc(bx - 3, 9.6, 18, [1, 0, 0], 0, 6, 0.35, { tone: "mid", crease: "none" }));
    out.push(Dot([at([bx + 3.1, 9.6, 18])], { size: 0.34 }));
  }
  return out.join("");
}

function drawer(index, bx) {
  const tray = [];
  tray.push(S(k.slabOf({ x: bx - 5.1, y: 0.8, w: 10.2, d: 13.2, r: 0.8 }, 14, 0.9, P, 4), { tone: "lo" }));
  tray.push(S(k.slabOf({ x: bx - 5.4, y: 0.8, w: 0.6, d: 14.6, r: 0.2 }, 13.9, 0.5, P, 3), { tone: "mid", crease: "none" }));
  tray.push(S(k.slabOf({ x: bx + 4.8, y: 0.8, w: 0.6, d: 14.6, r: 0.2 }, 13.9, 0.5, P, 3), { tone: "mid", crease: "none" }));
  tray.push(S(k.slabOf({ x: bx - 5.1, y: 0.8, w: 10.2, d: 1.1 }, 14.9, 3.2, P, 3), { tone: "lo" }));
  tray.push(S(k.slabOf({ x: bx - 5.1, y: 0.8, w: 0.9, d: 14 }, 14.9, 3.2, P, 3), { tone: "lo" }));
  tray.push(S(k.slabOf({ x: bx + 4.2, y: 0.8, w: 0.9, d: 14 }, 14.9, 3.2, P, 3), { tone: "lo" }));
  tray.push(drawerContents(index, bx));
  tray.push(L(k.planOutline({ x: bx - 4.5, y: 1.4, w: 9, d: 11.8, r: 0.6 }, 14.9, P, 4), { tone: "faint" }));

  const face = [];
  face.push(S(k.slabOf({ x: bx - 5.1, y: 14.4, w: 10.2, d: 1.6, r: 0.6 }, 14, 3.4, P, 5, 0.5), { tone: "hi", className: "drawer-front" }));
  face.push(L(k.planOutline({ x: bx - 4.4, y: 15.9, w: 8.8, d: 0.3, r: 0.2 }, 17.4, P, 3), { tone: "faint" }));
  face.push(L(k.planOutline({ x: bx - 4.4, y: 16.05, w: 8.8, d: 1, r: 0.4 }, 15.4, P, 3), { tone: "lo" }));
  face.push(S(k.slabOf({ x: bx - 3, y: 16, w: 6, d: 0.6, r: 0.3 }, 15.3, 1.2, P, 3), { tone: "mid", crease: "none" }));
  for (let line = 0; line <= index; line += 1) {
    face.push(L(k.lineOnTop([bx - 2.4, 16.3], [bx - 2.4 + 4.8 - line * 0.7, 16.3], 16.5, P), { tone: "lo", free: true }));
  }
  face.push(S(k.slabOf({ x: bx - 3.1, y: 16, w: 6.2, d: 1, r: 0.4 }, 17.8, 1.2, P, 4, 0.3), { tone: "mid" }));
  face.push(S(k.slabOf({ x: bx - 2.7, y: 15.9, w: 1, d: 1.1, r: 0.2 }, 17.4, 0.5, P, 3), { tone: "lo", crease: "none" }));
  face.push(S(k.slabOf({ x: bx + 1.7, y: 15.9, w: 1, d: 1.1, r: 0.2 }, 17.4, 0.5, P, 3), { tone: "lo", crease: "none" }));
  face.push(Dot([at([bx - 4.1, 16.05, 16.8]), at([bx + 4.1, 16.05, 16.8]), at([bx - 4.1, 16.05, 14.5]), at([bx + 4.1, 16.05, 14.5])], { size: 0.36 }));

  return {
    tray: `<g data-tray="${index}">${tray.join("")}</g>`,
    face: `<g data-drawer="${index}" class="drawer">${face.join("")}</g>`,
  };
}

function cart() {
  const out = [];
  out.push(roundDisc(0, -10.7, WHEEL_Z, [0, 1, 0], 0, 21.4, 1.1, { tone: "lo", crease: "none" }));
  out.push(ringOn(0, 10.75, WHEEL_Z, [0, 1, 0], 1.1, "mid"));
  for (const wy of WHEEL_Y) {
    for (const wx of WHEEL_X) {
      const frame = lathe.frameAlong([wx, wy - WHEEL_W / 2, WHEEL_Z], [0, 1, 0]);
      out.push(S(lathe.disc(0, WHEEL_W, WHEEL_R, frame, P, { bevel: 0.5 }), { tone: "lo", crease: "faint" }));
      out.push(ringOn(wx, wy + WHEEL_W / 2, WHEEL_Z, [0, 1, 0], WHEEL_R * 0.58, "mid"));
      out.push(S(lathe.disc(0, WHEEL_W + 0.28, WHEEL_R * 0.4, frame, P, { bevel: 0.2 }), { tone: "mid" }));
      out.push(ringOn(wx, wy + WHEEL_W / 2 + 0.3, WHEEL_Z, [0, 1, 0], WHEEL_R * 0.4, "lo"));
      const lugs = Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2 + 0.4;
        return at([wx + Math.cos(angle) * 1.6, wy + WHEEL_W / 2 + 0.32, WHEEL_Z + Math.sin(angle) * 1.6]);
      });
      out.push(Dot(lugs, { size: 0.34 }));
    }
  }
  for (const y of [-15, 9]) {
    out.push(S(k.slabOf({ x: -22, y, w: 44, d: 5, r: 1 }, 9.4, 1.1, P, 4), { tone: "lo" }));
  }
  out.push(S(k.slabOf({ x: -CART_HALF, y: CART_Y0, w: 48, d: CART_Y1 - CART_Y0, r: 3 }, 10.5, 3.1, P, 8, 1), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: -CART_HALF, y: CART_Y0, w: 48, d: CART_Y1 - CART_Y0, r: 3 }, 2), 13.6, P, 8), { tone: "faint" }));
  for (const [x, y] of k.corners({ x: -CART_HALF, y: CART_Y0, w: 48, d: CART_Y1 - CART_Y0 }, 3)) {
    out.push(Dot([at([x, y, 13.6])], { size: 0.4 }));
  }
  out.push(S(k.slabOf({ x: -23, y: CART_Y0, w: 46, d: 2.2 }, 13.6, 15.4, P, 4), { tone: "lo" }));
  out.push(L(k.sideSeam({ x: -23, y: CART_Y0, w: 46, d: 2.2 }, 22, P, 4), { tone: "faint" }));
  for (const x of [-23.4, 21.4]) {
    for (const y of [CART_Y0, 12]) {
      out.push(S(k.slabOf({ x, y, w: 2, d: 2 }, 13.6, 15.4, P, 3, 0.3), { tone: "mid" }));
      out.push(Dot([at([x + 1, y + 1, 29])], { size: 0.36 }));
    }
  }
  for (const x of [-23, -11.6, 0, 11.6, 23]) {
    out.push(S(k.slabOf({ x: x - 0.4, y: CART_Y0 + 2, w: 0.8, d: 27.6 }, 13.6, 15.4, P, 3), { tone: "lo" }));
  }
  const trays = [];
  const faces = [];
  for (let index = 0; index < BAYS.length; index += 1) {
    const built = drawer(index, BAYS[index]);
    trays.push(built.tray);
    faces.push(built.face);
  }
  out.push(...trays, ...faces);
  out.push(S(k.slabOf({ x: -23, y: 12, w: 46, d: 2.4, r: 0.6 }, 27.4, 1.6, P, 4), { tone: "mid" }));
  for (const x of [-24, 22]) {
    out.push(S(k.slabOf({ x, y: CART_Y0, w: 2, d: CART_Y1 - CART_Y0 }, 27.4, 1.6, P, 4), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: -25, y: -17, w: 50, d: 34, r: 3 }, 29, 1.6, P, 8, 1), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: -25, y: -17, w: 50, d: 34, r: 3 }, 2.2), DECK_Z, P, 8), { tone: "faint" }));
  out.push(
    Dot(
      k.corners({ x: -25, y: -17, w: 50, d: 34 }, 4).map(([x, y]) => at([x, y, DECK_Z])),
      { size: 0.4 },
    ),
  );
  out.push(S(k.slabOf({ x: -24, y: 13.8, w: 48, d: 2.8, r: 0.8 }, 28, 2.6, P, 4, 0.4), { tone: "mid" }));
  out.push(L(k.lineOnTop([-22, 16.2], [22, 16.2], 30.6, P), { tone: "faint" }));

  // Мачта и планшет маршрута.
  out.push(S(k.slabOf({ x: -19.8, y: -14.4, w: 5, d: 5, r: 1 }, DECK_Z, 1.2, P, 4), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -18.4, y: -13, w: 3, d: 3, r: 0.6 }, DECK_Z + 1.2, 6.4, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -21.4, y: -18, w: 4, d: 6, r: 0.6 }, 36, 2, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -23, y: -25, w: 29, d: 18.5, r: 2.4 }, 38, 1.6, P, 6, 0.7), { tone: "hi" }));
  out.push(L(k.planOutline({ x: -21.8, y: -23.8, w: 26.6, d: 16.1, r: 1.6 }, 39.6, P, 6), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -21.6, y: -23.6, w: 26.2, d: 15.7, r: 1.5 }, 39.6, 0.22, P, 5), { tone: "mid", flat: true, crease: "none" }));
  out.push(L(k.lineOnTop([-19.4, -16.5], [2.6, -16.5], 39.85, P), { tone: "mid" }));
  for (let index = 0; index < STEPS.length; index += 1) {
    const x = ROUTE_X[index];
    out.push(Dot([at([x, -16.5, 39.85])], { size: index === 0 ? 0.85 : 0.55, tone: "hi" }));
    out.push(L(k.ring(x, -16.5, index === 0 ? 1.05 : 0.7, 39.86, P, 14), { tone: index === 0 ? "mid" : "faint" }));
  }
  out.push(
    `<g data-marker>${L(k.ring(ROUTE_X[0], -16.5, 1.8, 39.9, P, 18), { tone: "hi" })}${Dot([at([ROUTE_X[0], -16.5, 39.92])], { size: 0.9, tone: "hi" })}</g>`,
  );
  out.push(
    L(
      [11, 7]
        .map((len, index) => k.lineOnTop([-19.4, -22.4 + index * 1.8], [-19.4 + len, -22.4 + index * 1.8], 39.9, P))
        .join(""),
      { tone: "faint", free: true },
    ),
  );
  out.push(roundDisc(3.8, -21.6, 39.6, [0, 0, 1], 0, 0.5, 0.9, { tone: "lo", crease: "faint" }));
  out.push(Dot([at([-21.4, -23.4, 39.6]), at([4.4, -23.4, 39.6]), at([-21.4, -7.6, 39.6]), at([4.4, -7.6, 39.6])], { size: 0.34 }));

  // Часы SLA.
  const clock = { x: -12.5, y: 7, z: DECK_Z };
  out.push(roundDisc(clock.x, clock.y, clock.z, [0, 0, 1], 0, 1.4, 5.3, { tone: "mid", crease: "lo" }));
  out.push(L(k.ring(clock.x, clock.y, 5.3, clock.z + 1.4, P, 40), { tone: "hi" }));
  out.push(L(k.ring(clock.x, clock.y, 4.4, clock.z + 1.45, P, 36), { tone: "faint" }));
  out.push(L(k.ring(clock.x, clock.y, 3.6, clock.z + 1.45, P, 36), { tone: "faint" }));
  const clockTicks = k.radialTicks(clock.x, clock.y, 5.3, 12, 3, clock.z + 1.4, [0.9, 1.7], P);
  out.push(L(clockTicks.minor, { tone: "lo" }), L(clockTicks.major, { tone: "mid" }));
  out.push(roundDisc(clock.x, clock.y, clock.z + 1.4, [0, 0, 1], 0, 0.7, 0.95, { tone: "hi", crease: "none" }));
  out.push(
    `<path class="iso-line" data-tone="hi" data-clock-hand d="${k.lineOnTop([clock.x, clock.y], [clock.x + 3.6, clock.y], clock.z + 1.5, P)}"/>`,
  );
  out.push(roundDisc(clock.x + 5.5, clock.y, clock.z + 0.3, [1, 0, 0], 0, 1.5, 0.8, { tone: "mid", crease: "none" }));
  out.push(roundDisc(clock.x - 5.5, clock.y, clock.z + 0.3, [1, 0, 0], 0, 1.5, 0.8, { tone: "mid", crease: "none" }));

  // Счётчик обращений.
  const counter = { x: 5, y: 2.5, w: 16, d: 8.7 };
  out.push(S(k.slabOf({ ...counter, r: 1.4 }, DECK_Z, 3.8, P, 6, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline({ x: 5.9, y: 3.3, w: 14.2, d: 7.1, r: 1 }, 34.4, P, 5), { tone: "faint" }));
  out.push(S(k.slabOf({ x: 6.5, y: 10.4, w: 13.2, d: 0.9, r: 0.6 }, 31.4, 2.3, P, 3), { tone: "lo", crease: "none" }));
  for (const x of [10.8, 15]) {
    out.push(L(k.segment([x, 11.34, 31.4], [x, 11.34, 33.7], P), { tone: "faint" }));
  }
  for (let index = 0; index < 3; index += 1) {
    out.push(
      `<g data-digit="${index}">${k.faceTextSvg(k.sideMatrix([8.6 + index * 4.2, 11.4], 32, P, "left"), "0", {
        size: 2.4,
        tone: "hi",
        anchor: "middle",
      })}</g>`,
    );
  }
  out.push(S(k.slabOf({ x: 5.9, y: 3.5, w: 8.6, d: 2, r: 0.5 }, 34.4, 0.5, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.lineOnTop([6.9, 4.5], [13.3, 4.5], 34.9, P), { tone: "faint", free: true }));
  out.push(S(k.cylinder(18.6, 5, 0.9, 34.4, 1.2, P, 16), { tone: "mid" }));
  out.push(Dot([at([6.5, 10.9, 34.4]), at([19.1, 10.9, 34.4])], { size: 0.36 }));

  // Стрелка приоритета.
  const scale = { x: 13.4, y: -15.4, w: 9.6, d: 1.2 };
  out.push(S(k.slabOf({ ...scale, r: 0.6 }, DECK_Z, 15.8, P, 4, 0.4), { tone: "mid" }));
  out.push(L(k.segment([18.2, -14.22, 30.8], [18.2, -14.22, 46.4], P), { tone: "faint" }));
  for (let index = 0; index <= 8; index += 1) {
    const z = 32.4 + index * 1.5;
    out.push(L(k.segment([20.6, -14.22, z], [23, -14.22, z], P), { tone: index % 4 === 0 ? "mid" : "faint" }));
  }
  const limit = 42.6;
  out.push(L(k.lineOnTop([13.4, -14.18], [23, -14.18], limit, P), { tone: "red" }));
  out.push(
    `<g data-priority>${roundDisc(18.2, -12.6, 32.1, [0, 0, 1], 0, 3.4, 0.65, { tone: "hi", crease: "none" })}${S(
      lathe.solidOf(
        [
          [0, 1.7],
          [2.4, 0],
        ],
        lathe.frameAlong([18.2, -12.6, 35.5], [0, 0, 1]),
        P,
        { bevel: 0.2 },
      ),
      { tone: "hi", crease: "none", className: "priority-head" },
    )}</g>`,
  );
  out.push(S(k.slabOf({ x: 13, y: -15.8, w: 10.4, d: 2, r: 0.6 }, 46.4, 0.8, P, 3), { tone: "mid" }));
  out.push(Dot([at([14.6, -14.8, 46.4]), at([21.8, -14.8, 46.4])], { size: 0.34 }));

  return `<g data-cart transform="${k.translateAlong(P, [STOP_X[0], 0, 0])}">${out.join("")}</g>`;
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A service trolley on a rail beside five system stations. The trolley carries four drawers for documentation, spare parts, tools and a call journal, and a tablet above them shows the route and an SLA clock. A counter and a rising priority arrow sit on the deck. A gate at the far end holds a sealed archive box on a shelf.",
  body: [plate(), postsAll(), rails(), archive(), cart()],
});

function postsAll() {
  return POST_X.map((px, index) => post(index, px)).join("");
}

const live = `
const P = ${JSON.stringify(P)};
const STOP_X = ${JSON.stringify(STOP_X)};
const DRAWER_OF_STEP = ${JSON.stringify(STEPS.map((step) => D.indexOf(step.drawer)))};
const PRIORITY = ${JSON.stringify(STEPS.map((step) => step.priority))};
const CLOCK = ${JSON.stringify(STEPS.map((step) => step.clock))};
const COUNTER = ${JSON.stringify(STEPS.map((step) => step.counter))};
const STAND = ${JSON.stringify(STEPS.map((step) => step.stand))};
const READOUTS = ${JSON.stringify(STEPS.map((step) => step.readout))};
const SHORTS = ${JSON.stringify(STEPS.map((step) => step.short))};
const LABELS = ${JSON.stringify(STEPS.map((step) => step.label))};
const ROUTE_X = ${JSON.stringify(ROUTE_X)};
const PULL = ${JSON.stringify(PULL)};
const N = STOP_X.length;
const RAD = Math.PI / 180;

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const cart = svg.querySelector("[data-cart]");
const fronts = Array.from(svg.querySelectorAll("[data-drawer]"));
const trays = Array.from(svg.querySelectorAll("[data-tray]"));
const digits = Array.from(svg.querySelectorAll("[data-digit]"));
const hand = svg.querySelector("[data-clock-hand]");
const priority = svg.querySelector("[data-priority]");
const marker = svg.querySelector("[data-marker]");
const barrier = svg.querySelector("[data-barrier]");
const lamps = Array.from(svg.querySelectorAll("[data-lamp]"));
const archiveBox = svg.querySelector("[data-archive-box]");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const near = (a, b) => Math.abs(a - b) < 0.03;
const ease = (cur, target, tau, dt) => {
  const next = cur + (target - cur) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 0.01 ? target : next;
};

let step = 0;
let cartX = STOP_X[0];
let cartTarget = STOP_X[0];
const pulls = [0, 0, 0, 0];
const pullTargets = [0, 0, 0, 0];
let priorityZ = 0.35;
let priorityTarget = 0.35;
let barrierLift = 0;
let barrierTarget = 0;
let clockBase = CLOCK[0];
let clockSpin = 0;
let count = COUNTER[0];
let countTarget = COUNTER[0];
let markerX = ROUTE_X[0];
let frame = 0;
let last = 0;
let clock = 0;
let touring = true;
let visible = false;
let idleTimer = 0;

function plan(to) {
  step = to;
  cartTarget = STOP_X[to];
  pullTargets.fill(0);
  pullTargets[DRAWER_OF_STEP[to]] = PULL;
  priorityTarget = 0.35 + PRIORITY[to] * 7.2;
  barrierTarget = to === N - 1 ? ${JSON.stringify(GATE_LIFT)} : 0;
  countTarget = COUNTER[to];
}

function drawClock(dt, calm) {
  const moving = !near(cartX, cartTarget);
  clockSpin += calm ? 0 : dt * (moving ? 0.62 : 0.16);
  clockBase = calm ? CLOCK[step] : ease(clockBase, CLOCK[step], 0.5, dt);
  const angle = (clockBase + clockSpin / RAD) * RAD;
  const cx = -11.5;
  const cy = 6.5;
  hand.setAttribute(
    "d",
    lineOnTop([cx, cy], [cx + Math.cos(angle) * 3.9, cy + Math.sin(angle) * 3.9], 32.1, P),
  );
}

function draw(dt, calm) {
  cart.setAttribute("transform", translateAlong(P, [cartX, 0, 0]));
  for (let index = 0; index < pulls.length; index += 1) {
    const offset = translateAlong(P, [0, pulls[index], 0]);
    fronts[index].setAttribute("transform", offset);
    trays[index].setAttribute("transform", offset);
    const active = index === DRAWER_OF_STEP[step] && pulls[index] > 0.8;
    fronts[index].classList.toggle("is-open", active);
  }
  priority.setAttribute("transform", translateAlong(P, [0, 0, priorityZ]));
  barrier.setAttribute("transform", translateAlong(P, [0, 0, barrierLift]));
  const span = STOP_X[N - 1] - STOP_X[0];
  markerX = ROUTE_X[0] + ((ROUTE_X[N - 1] - ROUTE_X[0]) * clamp((cartX - STOP_X[0]) / span, 0, 1));
  marker.setAttribute("transform", translateAlong(P, [markerX - ROUTE_X[0], 0, 0]));
  lamps.forEach((lamp, index) => lamp.classList.toggle("is-on", STAND[step] === index));
  archiveBox.classList.toggle("is-on", step === N - 1);
  drawClock(dt, calm);
  const shown = String(Math.round(count)).padStart(3, "0");
  digits.forEach((node, index) => {
    const text = node.querySelector("text");
    if (text && text.textContent !== shown[index]) text.textContent = shown[index];
  });
  const busy =
    Math.abs(cartX - cartTarget) > 2.4 ||
    pulls.some((value, index) => Math.abs(value - pullTargets[index]) > 0.25) ||
    Math.abs(priorityZ - priorityTarget) > 0.45 ||
    Math.abs(barrierLift - barrierTarget) > 0.45;
  const text = busy ? "support · в пути" : READOUTS[step];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(step));
  stage.setAttribute(
    "aria-valuetext",
    "шаг " + (step + 1) + " из " + N + ": " + LABELS[step] + ", " + READOUTS[step] + ", ящик " + ${JSON.stringify(DRAWERS.map((drawer) => drawer.label))}[DRAWER_OF_STEP[step]],
  );
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const want = Math.floor(clock / 4.4) % N;
    if (want !== step) plan(want);
  }
  cartX = calm ? cartTarget : ease(cartX, cartTarget, 0.38, dt);
  for (let index = 0; index < pulls.length; index += 1) {
    pulls[index] = calm ? pullTargets[index] : ease(pulls[index], pullTargets[index], 0.3, dt);
  }
  priorityZ = calm ? priorityTarget : ease(priorityZ, priorityTarget, 0.4, dt);
  barrierLift = calm ? barrierTarget : ease(barrierLift, barrierTarget, 0.42, dt);
  count = calm ? countTarget : ease(count, countTarget, 0.34, dt);
  draw(dt, calm);
  const quiet =
    !touring &&
    near(cartX, cartTarget) &&
    pulls.every((value, index) => near(value, pullTargets[index])) &&
    near(priorityZ, priorityTarget) &&
    near(barrierLift, barrierTarget) &&
    near(count, countTarget);
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
    clock = 0;
    run();
  }, 4600);
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

let pressX = null;
stage.addEventListener("pointerdown", (event) => {
  pressX = event.clientX;
});
stage.addEventListener("pointerup", (event) => {
  if (pressX === null) return;
  const delta = event.clientX - pressX;
  pressX = null;
  if (Math.abs(delta) > 36) steer(step + (delta < 0 ? 1 : -1));
});
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") return;
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.12) / 0.76, 0, 1);
  const to = Math.min(N - 1, Math.floor(share * N));
  if (to !== step) steer(to);
});
stage.addEventListener("pointerleave", () => {
  pressX = null;
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
pulls[0] = PULL;
cartX = STOP_X[0];
priorityZ = priorityTarget;
barrierLift = barrierTarget;
count = countTarget;
draw(1 / 60, still.matches);
`;

const css = `<style>
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.drawer.is-open .drawer-front .iso-edge{stroke:var(--anatomy-lit);stroke-width:.9px}
[data-lamp].is-on .lamp-lens .iso-top{fill:var(--anatomy-green)}
[data-lamp].is-on .lamp-lens .iso-shade{fill:var(--anatomy-green)}
[data-lamp].is-on .lamp-lens .iso-edge{stroke:var(--anatomy-green);stroke-width:.9px}
[data-tray]{transition:opacity .28s ease}
.priority-head .iso-edge{stroke:var(--anatomy-red)}
[data-archive-box].is-on .iso-edge{stroke:var(--anatomy-red);stroke-width:.85px}
body[data-theme="light"].iso{--anatomy-mid:#77777c;--anatomy-lo:#a7a7ab;--anatomy-faint:#cdcdd0}
.iso-plate-corner[data-corner="readout"]{bottom:16px}
@media (max-width:560px){
  .iso-plate{padding-bottom:94px}
  .iso-plate-corner[data-corner="readout"]{font-size:9px;bottom:52px}
  .iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px;right:0;white-space:normal;line-height:1.35}
}
@media (prefers-reduced-motion:reduce){[data-tray]{transition:none}}
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
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: маршрут сопровождения" aria-valuemin="0" aria-valuemax="${STEPS.length - 1}" aria-valuenow="0">${svg}</div>`,
  });

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}
console.log("частей:", parts);
