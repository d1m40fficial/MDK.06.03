import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, STEPS, STAGES, TURNOUT, COUNTERS } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 640;
const HEIGHT = 452;
const RAD = Math.PI / 180;

// Кольцевой конвейер: тяжёлая плита, круговой рельс, семь станций с порталами,
// тележка с ящиком, переводная стрелка и ворота архива в середине кольца.

const PLATE = { x: -176, y: -176, w: 352, d: 352, r: 22 };
const PLATE_H = 13;
const FOOT_H = 5;
const RING_R = 86;
const RAIL_IN = 79;
const RAIL_OUT = 93;
const STATION_R = 120;
const ARCHIVE_R = 150;
const CART_STOP = 124;
const SWITCH_ANGLE = TURNOUT.angle;

const dir = (deg) => [Math.cos(deg * RAD), Math.sin(deg * RAD)];
function frame(deg, r = 0) {
  const u = dir(deg);
  const t = [-u[1], u[0]];
  return { u, t, deg, cx: u[0] * r, cy: u[1] * r };
}
const at = (f, a, b) => [f.cx + f.u[0] * a + f.t[0] * b, f.cy + f.u[1] * a + f.t[1] * b];
const at3 = (f, a, b, z) => [...at(f, a, b), z];
const plan = (f, a, b) => at3(f, a, b, 0);
const ringOf = (f, a0, a1, b0, b1, r = 1.2, steps = 3) =>
  k.roundedPlan({ x: a0, y: b0, w: a1 - a0, d: b1 - b0, r }, steps).map(([a, b]) => at(f, a, b));
const rslab = (f, a0, a1, b0, b1, z, h, r = 1.2, bevel = 0) =>
  k.extrude(ringOf(f, a0, a1, b0, b1, r), z, h, P, { convex: true, bevel });
const rcyl = (f, a, b, radius, z, h, steps = 26, bevel = 0) => {
  const [x, y] = at(f, a, b);
  return k.cylinder(x, y, radius, z, h, P, steps, bevel);
};
const p3 = (f, a, b, z) => at3(f, a, b, z);
const seg3 = (A, B) => k.segment(A, B, P);

const pts = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  ...STAGES.map((stage) => {
    const f = frame(stage.angle, STATION_R);
    return [...at(f, 0, 0), 53];
  }),
  [...at(frame(SWITCH_ANGLE, ARCHIVE_R), 0, 0), 47],
  [150, 104, 21],
  [150, 104, -PLATE_H - FOOT_H],
];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 18, azimuth: 40, elevation: 30 });

const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (dots, style) => k.dotsSvg(dots, style);
const byDepth = (list) => [...list].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function merge(pieces, style) {
  const acc = { fill: "", outline: "", crease: "", top: "", shades: ["", "", "", ""], bevel: "" };
  for (const piece of pieces) {
    acc.fill += piece.fill;
    acc.outline += piece.outline;
    acc.crease += piece.crease;
    acc.top += piece.top;
    acc.bevel += piece.bevel || "";
    for (let i = 0; i < 4; i++) acc.shades[i] += piece.shades[i];
  }
  return k.solidSvg(acc, style);
}

function arcSlab(rIn, rOut, a0, a1, z, h, bevel = 0.3) {
  const ring = [
    [rOut * Math.cos(a0 * RAD), rOut * Math.sin(a0 * RAD)],
    [rOut * Math.cos(a1 * RAD), rOut * Math.sin(a1 * RAD)],
    [rIn * Math.cos(a1 * RAD), rIn * Math.sin(a1 * RAD)],
    [rIn * Math.cos(a0 * RAD), rIn * Math.sin(a0 * RAD)],
  ];
  return k.extrude(ring, z, h, P, { convex: true, bevel });
}

function arcLine(r, a0, a1, z, steps = 26) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    out.push([r * Math.cos(a * RAD), r * Math.sin(a * RAD)]);
  }
  return k.onTop(out, z, P);
}

// Метка на наружной грани станции: текст читается слева направо от зрителя.
function faceLabel(f, a, b, z, text, options = {}) {
  const o = k.iso(p3(f, a, b, z), P);
  const u = k.axisVector(P, [-f.t[0], -f.t[1], 0]);
  const v = k.axisVector(P, [0, 0, -1]);
  const m = `matrix(${u[0].toFixed(3)} ${u[1].toFixed(3)} ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`;
  return k.faceTextSvg(m, text, { size: 2.8, tone: "mid", anchor: "start", ...options });
}

// ===== Плита =====
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 26))) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 2, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 2, FOOT_H - 2, P, 28), { tone: "mid" }));
    out.push(L(k.ring(x, y, 6, -PLATE_H - FOOT_H + 2, P, 26), { tone: "lo" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 10, 2.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 7), 0, P, 10), { tone: "faint" }));
  out.push(L(k.sideSeam(k.insetPlan(PLATE, 3), -2.2, P, 10), { tone: "faint" }));
  const screws = k.corners(PLATE, 13);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => k.iso([x, y, 0], P)), { size: 0.55 }));

  // Линейка вдоль передней кромки и заводская табличка.
  const RULE = { x: -132, y: 148, w: 104, d: 7, r: 1 };
  out.push(S(k.slabOf(RULE, 0, 0.8, P, 3), { tone: "mid", crease: "none" }));
  const ticks = k.topTicks(RULE.x + 4, RULE.x + RULE.w - 4, 4, 5, RULE.y + 0.9, 0.9, [2, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const LABEL = { x: -52, y: 150, w: 40, d: 12, r: 1.4 };
  out.push(S(k.slabOf(LABEL, 0, 0.9, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.9, P, 3), { tone: "lo" }));
  out.push(
    L(
      [26, 18, 11]
        .map((len, i) => k.lineOnTop([LABEL.x + 3.4, LABEL.y + 3 + i * 2.8], [LABEL.x + 3.4 + len, LABEL.y + 3 + i * 2.8], 0.9, P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(D([k.iso([LABEL.x + LABEL.w - 3, LABEL.y + LABEL.d / 2, 0.9], P)], { size: 0.5 }));
  return out.join("");
}

// ===== Рельс =====
function track() {
  const out = [];
  const step = 10;
  const sleepers = [];
  const railIn = [];
  const railOut = [];
  for (let a = 0; a < 360; a += step) {
    sleepers.push(rslab(frame(a + step / 2, RING_R), -11.5, 11.5, -2.2, 2.2, 0, 2.6, 1));
    railIn.push(arcSlab(RAIL_IN - 1.9, RAIL_IN + 1.9, a + 0.35, a + step - 0.35, 2.6, 2.8));
    railOut.push(arcSlab(RAIL_OUT - 1.9, RAIL_OUT + 1.9, a + 0.35, a + step - 0.35, 2.6, 2.8));
  }
  out.push(merge(sleepers, { tone: "lo", crease: "faint" }));
  out.push(merge(railIn, { tone: "mid", crease: "lo" }));
  out.push(merge(railOut, { tone: "mid", crease: "lo" }));
  out.push(L(arcLine(RAIL_IN, 0, 360, 5.4), { tone: "faint" }));
  out.push(L(arcLine(RAIL_OUT, 0, 360, 5.4), { tone: "faint" }));

  // Стрелки направления на шпалах: две линии с точкой в вершине.
  for (let i = 0; i < STAGES.length; i++) {
    const a = STAGES[i].angle + 22.5;
    const f = frame(a, RING_R);
    const tip = p3(f, -1, 0, 2.6);
    const left = p3(f, -7, 3.4, 2.6);
    const right = p3(f, -7, -3.4, 2.6);
    out.push(L(seg3(left, tip) + seg3(right, tip), { tone: "faint" }));
    out.push(D([k.iso(tip, P)], { size: 0.42, tone: "lo" }));
  }
  return out.join("");
}

// ===== Тележка =====
function cart() {
  const out = [];
  const base = { x: -11, y: -11, w: 22, d: 22, r: 4 };
  out.push(S(k.slabOf({ x: -12, y: -12, w: 24, d: 24, r: 4.5 }, 7, 2.4, P, 6, 1), { tone: "mid" }));
  out.push(S(k.slabOf(base, 4, 3.2, P, 6, 1), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(base, 2.4), 7.2, P, 6), { tone: "faint" }));
  for (const [x, y] of k.corners(base, 5)) {
    out.push(S(k.cylinder(x, y, 2.7, 0.6, 4.4, P, 22), { tone: "lo" }));
    out.push(L(k.ring(x, y, 2.7, 0.6, P, 22), { tone: "lo" }));
    out.push(D([k.iso([x, y, 0.6], P)], { size: 0.45 }));
  }
  for (const [x, y] of k.corners(base, 9.6)) {
    out.push(S(k.cylinder(x, y, 0.7, 7.2, 1.4, P, 14), { tone: "lo" }));
  }
  // Ящик изделия.
  const crate = { x: -8, y: -8, w: 16, d: 16, r: 1.4 };
  out.push(S(k.slabOf(crate, 9.4, 15.6, P, 4, 1), { tone: "hi", crease: "mid" }));
  out.push(S(k.slabOf({ x: -8.6, y: -8.6, w: 17.2, d: 17.2, r: 1.6 }, 25, 2.2, P, 4, 0.8), { tone: "hi" }));
  for (const z of [12.2, 22.4]) {
    out.push(S(k.slabOf({ x: -8.35, y: -8.35, w: 16.7, d: 16.7, r: 1.4 }, z, 1.5, P, 4, 0.4), { tone: "mid", crease: "none" }));
  }
  for (const z of [14.4, 17.6, 20.6]) {
    out.push(L(k.segment([8, -8, z], [8, 8, z], P), { tone: "faint" }));
    out.push(L(k.segment([-8, 8, z], [8, 8, z], P), { tone: "faint" }));
  }
  out.push(L(k.ring(0, 0, 2.2, 27.2, P, 20), { tone: "hi" }));
  out.push(S(k.cylinder(0, 0, 1.5, 27.2, 1.6, P, 18), { tone: "hi" }));
  const tag = { x: -4.4, y: 7.9, w: 8.8, d: 0.9, r: 0.5 };
  out.push(S(k.slabOf(tag, 16.6, 4.4, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(tag, 0.6), 21, P, 3), { tone: "lo" }));
  out.push(k.faceTextSvg(topMatrixOf([0, 8.45, 16.6], [0, 1, 0]), "ИС", { size: 3.6, tone: "hi", anchor: "middle" }));
  out.push(D([k.iso([-6.6, 8.2, 24.8], P), k.iso([6.6, 8.2, 24.8], P)], { size: 0.42 }));
  return out.join("");
}

// Матрица текста на вертикальной грани с нормалью n: буквы идут слева направо.
function topMatrixOf(origin, normal, at3d = origin) {
  const p = [normal[1], -normal[0]];
  const o = k.iso(at3d, P);
  const u = k.axisVector(P, [p[0], p[1], 0]);
  const v = k.axisVector(P, [0, 0, -1]);
  const s = u[0] < 0 ? [-1, -1] : [1, 1];
  return `matrix(${(u[0] * s[0]).toFixed(3)} ${(u[1] * s[0]).toFixed(3)} ${(v[0] * s[1]).toFixed(3)} ${(v[1] * s[1]).toFixed(3)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`;
}

// ===== Станция =====
function stationFrame(angle) {
  return frame(angle, STATION_R);
}

function tokenAt(f, a, b, z) {
  return `<g class="token" opacity="0">${S(k.cylinder(...at(f, a, b), 2.4, z, 1.3, P, 20), { tone: "green" })}${L(
    k.ring(...at(f, a, b), 2.4, z + 1.3, P, 20),
    { tone: "green" },
  )}${D([k.iso(p3(f, a, b, z + 1.3), P)], { size: 0.45, tone: "green" })}</g>`;
}

function tray(f) {
  const out = [];
  out.push(S(rslab(f, -7, 7, -11.8, -2.8, 24, 1, 0.8), { tone: "lo" }));
  out.push(S(rslab(f, -7.6, 7.6, -12.4, -11.8, 24, 3, 0.6), { tone: "mid" }));
  out.push(S(rslab(f, -7.6, 7.6, -2.8, -2.2, 24, 1.6, 0.6), { tone: "mid" }));
  out.push(S(rslab(f, -7.6, -7, -11.8, -2.8, 24, 3, 0.6), { tone: "mid" }));
  out.push(S(rslab(f, 7, 7.6, -11.8, -2.8, 24, 3, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(ringOf(f, -6.2, 6.2, -11.2, -3.4, 0.6), 25.4, P, 3), { tone: "faint" }));
  out.push(D([k.iso(p3(f, -6.4, -11.4, 25.2), P), k.iso(p3(f, 6.4, -11.4, 25.2), P)], { size: 0.4 }));
  return out.join("");
}

function toolHead(kind, f) {
  const out = [];
  const body = (a0, a1, b0, b1, z, h, tone = "hi") => S(rslab(f, a0, a1, b0, b1, z, h, 0.9, 0.5), { tone });
  if (kind === "requirements") {
    out.push(body(-4.6, 4.6, -4.4, 4.6, 32, 5.2));
    out.push(L(k.planOutline(ringOf(f, -3.6, 3.6, -3.4, 3.6, 0.6), 37.2, P, 3), { tone: "lo" }));
    out.push(S(rcyl(f, 0, 0, 2.7, 29.4, 2.6, 24, 0.4), { tone: "hi" }));
    out.push(L(k.ring(...at(f, 0, 0), 2.7, 29.4, P, 24), { tone: "lo" }));
    out.push(D([k.iso(p3(f, -3, 3.4, 37.2), P), k.iso(p3(f, 3, -3.2, 37.2), P)], { size: 0.42 }));
  } else if (kind === "design") {
    out.push(body(8.8, 12.4, -3.4, 3.4, 33, 4));
    out.push(body(9.4, 10.8, -1.2, 1.2, 36.8, 4.4, "mid"));
    out.push(S(rslab(f, 8, 9.4, -1, 1, 34.2, 1.2, 0.3), { tone: "hi" }));
    out.push(S(rcyl(f, 10.8, 0, 1.4, 37, 1.8, 16), { tone: "mid" }));
    out.push(L(k.ring(...at(f, 10.8, 0), 1.4, 38.8, P, 16), { tone: "lo" }));
    out.push(D([k.iso(p3(f, 11.8, 3, 37), P)], { size: 0.42 }));
  } else if (kind === "build") {
    out.push(S(rcyl(f, 0, 1, 2.6, 33, 5, 24, 0.5), { tone: "hi" }));
    out.push(S(rcyl(f, 0, 1, 0.8, 29, 4, 14), { tone: "hi" }));
    out.push(S(rcyl(f, 0, 1, 1.5, 27.6, 1.6, 18), { tone: "mid" }));
    out.push(L(k.ring(...at(f, 0, 1), 2.6, 33, P, 24), { tone: "lo" }));
    out.push(L(k.ring(...at(f, 0, 1), 2.6, 38, P, 24), { tone: "lo" }));
    out.push(D([k.iso(p3(f, 0, 1, 38), P)], { size: 0.48 }));
  } else if (kind === "test") {
    out.push(S(rcyl(f, 0, 1, 2.8, 33.4, 4.6, 24, 0.5), { tone: "hi" }));
    out.push(S(rcyl(f, 0, 1, 1.9, 31.6, 1.8, 20), { tone: "mid" }));
    out.push(S(rcyl(f, 0, 1, 0.5, 28.6, 3, 12), { tone: "hi" }));
    out.push(L(k.ring(...at(f, 0, 1), 2.8, 33.4, P, 24), { tone: "lo" }));
    out.push(k.wireSvg(k.iso(p3(f, 2.4, 2.7, 37.2), P), k.iso(p3(f, 4.6, 3.4, 35), P), { tone: "lo", ends: "both", size: 0.9 }));
  } else if (kind === "deploy") {
    out.push(S(rcyl(f, 0, 1, 2.9, 34.4, 3.8, 24, 0.4), { tone: "hi" }));
    out.push(S(rcyl(f, 0, 1, 4.6, 31.6, 2.8, 28, 0.5), { tone: "mid" }));
    out.push(L(k.ring(...at(f, 0, 1), 4.6, 31.6, P, 28), { tone: "lo" }));
    out.push(L(k.ring(...at(f, 0, 1), 2.9, 38.2, P, 24), { tone: "lo" }));
    for (const a of [-2.4, 2.4]) {
      out.push(L(seg3(p3(f, a, 0.4, 34.4), p3(f, a * 1.6, 0.9, 32.4)), { tone: "lo" }));
    }
    out.push(D([k.iso(p3(f, 0, 1, 38.2), P)], { size: 0.45 }));
  } else if (kind === "operate") {
    out.push(body(-3.4, 3.4, -3.4, 4.2, 31.4, 6.4));
    out.push(S(rcyl(f, 0, 0.4, 1.1, 37.8, 2.4, 16), { tone: "mid" }));
    out.push(L(k.ring(...at(f, 0, 0.4), 1.1, 40.2, P, 16), { tone: "lo" }));
    out.push(L(k.planOutline(ringOf(f, -2.4, 2.4, -2.4, 3.2, 0.5), 31.4, P, 3), { tone: "lo" }));
    out.push(D([k.iso(p3(f, -2.4, 3.2, 37.8), P), k.iso(p3(f, 2.4, -2.4, 37.8), P)], { size: 0.42 }));
  } else {
    out.push(S(rcyl(f, 0, 1, 2.7, 33, 5, 24, 0.5), { tone: "hi" }));
    out.push(S(rcyl(f, 0, 1, 1.7, 29, 4, 18), { tone: "mid" }));
    out.push(L(k.ring(...at(f, 0, 1), 2.7, 33, P, 24), { tone: "lo" }));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      out.push(D([k.iso([...at(f, Math.cos(a) * 1.7, 1 + Math.sin(a) * 1.7), 29], P)], { size: 0.38, tone: "lo" }));
    }
    out.push(D([k.iso(p3(f, 0, 1, 38), P)], { size: 0.45 }));
  }
  return out.join("");
}

function stationProps(kind, f) {
  const out = [];
  if (kind === "requirements") {
    out.push(S(rslab(f, -8, 2, 4.2, 12.6, 24, 0.8, 0.4), { tone: "mid" }));
    out.push(S(rslab(f, -8, 2, 4.2, 12.6, 24.8, 0.6, 0.4), { tone: "hi" }));
    out.push(S(rslab(f, -8, -7.2, 4.2, 12.6, 25.4, 0.5, 0.2), { tone: "hi" }));
    out.push(
      L(
        [8, 6.4, 7.4]
          .map((len, i) => k.lineOnTop(at(f, -6.6, 6.2 + i * 2.2), at(f, -6.6 + len, 6.2 + i * 2.2), 25.4, P))
          .join(""),
        { tone: "faint", free: true },
      ),
    );
    out.push(D([k.iso(p3(f, 0.8, 11.4, 25.4), P)], { size: 0.4 }));
    // Лупа на стойке.
    out.push(S(rcyl(f, 9.6, 9.6, 1.1, 24, 6.4, 16), { tone: "mid" }));
    out.push(S(rcyl(f, 9.6, 9.6, 1.8, 29.2, 1.2, 18), { tone: "lo" }));
    out.push(S(rcyl(f, 8.2, 8.6, 4, 30.4, 0.9, 28), { tone: "hi", crease: "none" }));
    out.push(L(k.ring(...at(f, 8.2, 8.6), 4, 30.4, P, 28) + k.ring(...at(f, 8.2, 8.6), 3.1, 31.3, P, 28), { tone: "lo" }));
    out.push(S(rcyl(f, 5.6, 6, 0.8, 29.6, 1, 12), { tone: "mid" }));
  } else if (kind === "design") {
    out.push(S(rslab(f, 3.4, 5.6, -11, 11, 24, 16, 0.8), { tone: "mid" }));
    const face = 5.6;
    const draw = [
      seg3(p3(f, face, -9, 26), p3(f, face, -9, 38.6)),
      seg3(p3(f, face, -3, 26), p3(f, face, -3, 38.6)),
      seg3(p3(f, face, -9, 36.4), p3(f, face, 9, 36.4)),
      seg3(p3(f, face, -9, 30.4), p3(f, face, 9, 30.4)),
      seg3(p3(f, face, -9, 26.4), p3(f, face, 9, 26.4)),
      seg3(p3(f, face, 3.2, 30.4), p3(f, face, 3.2, 36.4)),
      seg3(p3(f, face, -9, 33.6), p3(f, face, 9, 33.6)),
      seg3(p3(f, face, -6.4, 26.4), p3(f, face, -6.4, 30.4)),
      seg3(p3(f, face, 6.4, 36.4), p3(f, face, 6.4, 38.6)),
    ];
    out.push(L(draw.join(""), { tone: "lo", free: true }));
    out.push(S(rslab(f, 5.6, 6.8, -11, 11, 24.4, 1.4, 0.4), { tone: "hi" }));
    out.push(S(rslab(f, 5.6, 7, -2.4, 2.4, 24.4, 2.6, 0.5), { tone: "mid" }));
    out.push(S(rslab(f, 9.5, 10.9, -12, 12, 41, 1.4, 0.5), { tone: "mid" }));
    out.push(S(rslab(f, -1, 9.8, -1.2, 1.2, 41.4, 3, 0.5), { tone: "mid" }));
    out.push(D([k.iso(p3(f, 9.2, 10.4, 42.4), P), k.iso(p3(f, 9.2, -10.4, 42.4), P)], { size: 0.4 }));
    out.push(D([k.iso(p3(f, 5.9, 10.2, 25.8), P), k.iso(p3(f, 5.9, -10.2, 25.8), P)], { size: 0.4 }));
  } else if (kind === "build") {
    out.push(S(rslab(f, -9, -1, 3.6, 12.4, 24, 1.2, 0.4), { tone: "hi" }));
    const caps = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) caps.push(rslab(f, -8.2 + j * 2.5, -8.2 + j * 2.5 + 1.9, 4.4 + i * 1.7, 4.4 + i * 1.7 + 1.3, 25.2, 0.8, 0.3));
    }
    out.push(merge(caps, { tone: "mid", crease: "lo" }));
    out.push(S(rslab(f, -9, -8.2, 3.6, 12.4, 24, 13, 0.6), { tone: "mid" }));
    out.push(S(rslab(f, -8.3, -7.9, 4.6, 11.4, 27, 8.6, 0.4), { tone: "lo", crease: "none" }));
    out.push(L(seg3(p3(f, -7.88, 5.4, 30.4), p3(f, -7.88, 10.6, 30.4)) + seg3(p3(f, -7.88, 5.4, 29.2), p3(f, -7.88, 9.2, 29.2)), { tone: "lo", free: true }));
    out.push(S(rcyl(f, 2.4, 7.4, 4.2, 24, 1.4, 26), { tone: "mid" }));
    out.push(S(rcyl(f, 2.4, 7.4, 3.2, 25.4, 3.4, 24), { tone: "hi" }));
    out.push(L(k.knurl(...at(f, 2.4, 7.4), 3.2, 25.4, 28.8, 24, P, 0.5), { tone: "lo" }));
    out.push(L(k.ring(...at(f, 2.4, 7.4), 3.2, 28.8, P, 24), { tone: "hi" }));
    out.push(k.wireSvg(k.iso(p3(f, 2.4, 4.2, 25.4), P), k.iso(p3(f, -4.8, 9.4, 25.4), P), { tone: "lo", via: [k.iso(p3(f, -0.6, 2.6, 25.2), P)], ends: "both", size: 0.9 }));
    out.push(D([k.iso(p3(f, -8.6, 4.2, 24.6), P), k.iso(p3(f, -8.6, 11.8, 24.6), P)], { size: 0.4 }));
  } else if (kind === "test") {
    out.push(S(rcyl(f, 6.4, 9, 1.4, 24, 4.2, 16), { tone: "mid" }));
    out.push(S(rcyl(f, 6.4, 9, 5.4, 28.2, 1.6, 30), { tone: "hi", crease: "none" }));
    out.push(L(k.ring(...at(f, 6.4, 9), 5.4, 29.8, P, 30) + k.ring(...at(f, 6.4, 9), 4.4, 28.2, P, 30), { tone: "mid" }));
    const ticks = k.radialTicks(...at(f, 6.4, 9), 4.4, 10, 5, 29.8, [1, 1.8], P, -Math.PI * 0.25, Math.PI * 1.5);
    out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
    out.push(L(k.lineOnTop(at(f, 6.4, 9), [at(f, 6.4, 9)[0] + 2.6 * Math.cos(-Math.PI * 0.25), at(f, 6.4, 9)[1] + 2.6 * Math.sin(-Math.PI * 0.25)], 29.9, P), { tone: "hi", free: true }));
    out.push(D([k.iso(p3(f, 6.4, 9, 29.9), P)], { size: 0.5, tone: "hi" }));
    out.push(S(rcyl(f, -5, 9.4, 2.8, 24, 1.2, 20), { tone: "mid" }));
    out.push(S(rcyl(f, -5, 9.4, 2.1, 25.2, 2.2, 20), { tone: "red", className: "lamp-red" }));
    out.push(L(k.ring(...at(f, -5, 9.4), 2.1, 25.2, P, 20), { tone: "lo" }));
    out.push(S(rcyl(f, -6.6, 3.8, 1.2, 24, 2.4, 14), { tone: "mid" }));
    out.push(k.wireSvg(k.iso(p3(f, -6.6, 3.8, 26.4), P), k.iso(p3(f, 2.2, 9.4, 24.6), P), { tone: "lo", via: [k.iso(p3(f, -2, 6.6, 25.2), P)], ends: "both", size: 0.9 }));
  } else if (kind === "deploy") {
    out.push(S(rslab(f, -10, -3.4, -2, 11, 24, 1, 0.4), { tone: "mid" }));
    out.push(S(rslab(f, -3.4, 2.6, -2, 11, 24, 1.9, 0.4), { tone: "mid" }));
    out.push(S(rslab(f, 2.6, 8.6, -2, 11, 24, 2.8, 0.4), { tone: "mid" }));
    out.push(S(rslab(f, -8.4, -3.8, 0.4, 5.4, 25, 5.4, 0.5), { tone: "hi" }));
    out.push(S(rslab(f, -3.2, 1.8, 4.6, 9.6, 25.9, 5.4, 0.5), { tone: "hi" }));
    out.push(L(k.sideSeam(ringOf(f, -8.4, -3.8, 0.4, 5.4, 0.5), 27.8, P, 3), { tone: "faint" }));
    out.push(L(seg3(p3(f, -8.4, 2.9, 30.4), p3(f, -3.8, 2.9, 30.4)), { tone: "faint" }));
    out.push(L(seg3(p3(f, -3.2, 7.1, 31.3), p3(f, 1.8, 7.1, 31.3)), { tone: "faint" }));
    out.push(D([k.iso(p3(f, -8.2, 0.8, 30.4), P), k.iso(p3(f, 1.6, 9.4, 31.3), P)], { size: 0.4 }));
  } else if (kind === "operate") {
    out.push(S(rslab(f, 5.6, 7.6, 1.4, 12.4, 24, 15, 0.8), { tone: "mid" }));
    out.push(L(k.planOutline(ringOf(f, 5.2, 8, 1, 12.8, 0.8), 39, P, 3), { tone: "lo" }));
    for (const b of [3.4, 6.2, 9]) {
      out.push(S(rslab(f, 7.6, 8.4, b - 1, b + 1, 29.4, 2.6, 0.5), { tone: "lo" }));
      out.push(L(k.ring(...at(f, 8.4, b), 1.4, 32, P, 16), { tone: "lo" }));
      out.push(D([k.iso(p3(f, 8.45, b, 32.4), P)], { size: 0.34, tone: "lo" }));
    }
    out.push(S(rcyl(f, 7.2, 4.6, 1.4, 36.4, 1.8, 16), { tone: "green", className: "lamp-green" }));
    out.push(L(k.ring(...at(f, 7.2, 4.6), 1.4, 36.4, P, 16), { tone: "lo" }));
    out.push(S(rslab(f, -9, -1.4, 2.6, 11.4, 24, 0.9, 0.4), { tone: "hi" }));
    out.push(S(rslab(f, -9, -1.4, 2.6, 11.4, 24.9, 0.7, 0.4), { tone: "hi" }));
    out.push(
      L(
        [6.4, 5.2, 6.8, 4.4]
          .map((len, i) => k.lineOnTop(at(f, -8.2, 4 + i * 2), at(f, -8.2 + len, 4 + i * 2), 25.6, P))
          .join(""),
        { tone: "faint", free: true },
      ),
    );
    out.push(D([k.iso(p3(f, -2.2, 3.2, 25.6), P)], { size: 0.4 }));
  } else {
    out.push(S(rcyl(f, -5.6, 6.2, 2, 24, 1.2, 18), { tone: "mid" }));
    out.push(S(rcyl(f, -5.6, 6.2, 2.6, 25.2, 13, 22), { tone: "hi" }));
    for (const z of [28.6, 32.2, 35.8]) {
      out.push(S(rcyl(f, -5.6, 6.2, 4.4, z, 1.8, 26), { tone: "mid" }));
      out.push(L(k.ring(...at(f, -5.6, 6.2), 4.4, z, P, 26), { tone: "lo" }));
    }
    out.push(L(k.ring(...at(f, -5.6, 6.2), 2.6, 38.2, P, 22), { tone: "hi" }));
    out.push(S(rcyl(f, 3.4, 8.6, 1.4, 24, 2.2, 16), { tone: "lo" }));
    out.push(S(rcyl(f, 1, 10.4, 1.4, 24, 2.2, 16), { tone: "lo" }));
    // Ключ на крюке у стойки.
    out.push(L(seg3(p3(f, 2, 12.4, 44), p3(f, 2, 12.4, 40.4)), { tone: "lo" }));
    out.push(S(rslab(f, 2, 2.8, 11.6, 13.2, 34, 6.4, 0.4), { tone: "mid" }));
    out.push(S(rslab(f, 2, 2.8, 12.6, 14.4, 34, 1.6, 0.4), { tone: "mid" }));
    out.push(S(rslab(f, 2, 2.8, 12.6, 14.4, 38.8, 1.6, 0.4), { tone: "mid" }));
    out.push(L(k.ring(...at(f, 2.4, 13.2), 1.2, 40.4, P, 14), { tone: "lo" }));
  }
  return out.join("");
}

function station(stage, index) {
  const f = stationFrame(stage.angle);
  const out = [];
  out.push(S(rslab(f, -10.5, 10.5, -15, 15, 0, 22, 1.8, 1.4), { tone: "mid" }));
  out.push(L(k.sideSeam(ringOf(f, -10.5, 10.5, -15, 15, 1.8), 5.2, P, 3), { tone: "faint" }));
  out.push(S(rslab(f, -11.5, 11.5, -16, 16, 22, 2, 1.4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(ringOf(f, -11, 11, -15.5, 15.5, 1.4), 24, P, 3), { tone: "faint" }));
  out.push(S(rslab(f, 10.5, 11.3, -12, 12, 3.4, 12.4, 0.9), { tone: "mid" }));
  out.push(S(rslab(f, 11.3, 12, -10, 10, 6, 8, 0.7), { tone: "hi" }));
  out.push(D([k.iso(p3(f, 12.05, 0, 13.2), P), k.iso(p3(f, 11.35, -9.2, 14.6), P), k.iso(p3(f, 11.35, 9.2, 14.6), P)], { size: 0.44 }));
  out.push(S(rcyl(f, 11.8, 0, 0.6, 13.6, 1.4, 12), { tone: "lo" }));
  out.push(S(rslab(f, -10.5, -9.9, -11, -8.4, 2, 17.6, 0.5), { tone: "faint" }));
  out.push(S(rslab(f, -10.5, -9.9, 8.4, 11, 2, 17.6, 0.5), { tone: "faint" }));
  out.push(tray(f));
  out.push(stationProps(stage.key, f));
  for (const b of [-14, 14]) {
    out.push(S(rcyl(f, 0, b, 1.8, 24, 3, 18), { tone: "mid" }));
    out.push(S(rcyl(f, 0, b, 1.7, 24, 20, 18), { tone: "mid" }));
    out.push(L(k.ring(...at(f, 0, b), 1.7, 24, P, 18) + k.ring(...at(f, 0, b), 1.7, 44, P, 18), { tone: "lo" }));
    out.push(S(rcyl(f, 0, b, 2.4, 24.4, 1.4, 18), { tone: "lo" }));
  }
  out.push(S(rslab(f, -3, 3, -15.6, 15.6, 44, 3.2, 1, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(ringOf(f, -2.4, 2.4, -15, 15, 0.8), 47.2, P, 3), { tone: "faint" }));
  out.push(
    D(
      [
        k.iso(p3(f, 0, -13.6, 47.2), P),
        k.iso(p3(f, 0, 13.6, 47.2), P),
        k.iso(p3(f, 0, -4, 47.2), P),
        k.iso(p3(f, 0, 4, 47.2), P),
      ],
      { size: 0.42 },
    ),
  );
  // Пружина и шток инструмента.
  const stemA = stage.key === "design" ? 10.2 : 0;
  const stemB = stage.key === "design" ? 0 : 1;
  out.push(S(rcyl(f, stemA, stemB, 1.3, 36, 8, 16), { tone: "hi" }));
  for (let i = 0; i < 7; i++) {
    out.push(L(k.ring(...at(f, stemA, stemB), 2.4, 38.2 + i * 0.72, P, 18), { tone: "lo" }));
  }
  out.push(S(rcyl(f, stemA, stemB, 2.1, 42.8, 1.6, 18), { tone: "mid" }));
  out.push(L(k.ring(...at(f, stemA, stemB), 2.1, 42.8, P, 18), { tone: "lo" }));
  // Голова инструмента опускается.
  out.push(`<g data-tool="${index}">${toolHead(stage.key, f)}</g>`);
  // Жетон-артефакт.
  out.push(`<g data-token="${index}" style="opacity:0">${tokenInner(f)}</g>`);
  return `<g class="station" data-station="${index}">${out.join("")}</g>`;
}

function tokenInner(f) {
  const [x, y] = at(f, 0, 1);
  return [
    S(k.cylinder(x, y, 2.4, 28.4, 1.3, P, 20), { tone: "green" }),
    L(k.ring(x, y, 2.4, 29.7, P, 20), { tone: "green" }),
    D([k.iso([x, y, 29.7], P)], { size: 0.45, tone: "green" }),
  ].join("");
}

const cartAt = at3(frame(STAGES[0].angle, STATION_R), 0, 0);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Кольцевой конвейер на тяжёлой плите. Тележка с ящиком ИС стоит на круговом рельсе у станции требований. Восемь станций с инструментами и лотками окружают кольцо, переводная стрелка ведёт к модернизации и воротам архива.",
  body: [
    plate(),
    track(),
    ...STAGES.map((stage, index) => station(stage, index)),
    `<g data-part="cart" transform="${k.translateAlong(P, cartAt)}">${cart()}</g>`,
  ],
});

const live = `
const stage = document.querySelector('.iso-stage');
const readout = document.querySelector('[data-readout]');
const stations = Array.from(stage.querySelectorAll('[data-station]'));
const labels = ${JSON.stringify(STEPS.map((step) => step.label))};
const readouts = ${JSON.stringify(STEPS.map((step) => step.readout))};
const N = labels.length;
let step = 0;
let timer = 0;
function show(n) {
  step = (n + N) % N;
  stations.forEach((node, i) => { node.style.opacity = i === step ? '1' : '.52'; });
  if (readout) readout.textContent = readouts[step];
  stage.setAttribute('aria-valuenow', String(step));
  stage.setAttribute('aria-valuetext', labels[step]);
}
function tick() { show(step + 1); }
function start() { if (!timer) timer = setInterval(tick, 3200); }
function stop() { clearInterval(timer); timer = 0; }
stage.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); stop(); show(step + 1); }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); stop(); show(step - 1); }
  if (event.key === 'Home') { event.preventDefault(); stop(); show(0); }
  if (event.key === 'End') { event.preventDefault(); stop(); show(N - 1); }
});
stage.addEventListener('pointermove', (event) => {
  const box = stage.getBoundingClientRect();
  const share = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
  stop(); show(Math.min(N - 1, Math.floor(share * N)));
});
stage.addEventListener('pointerleave', start);
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) start();
show(0);
`;

const css = `<style>
.station{transition:opacity .25s ease}
.iso-plate-corner[data-corner="readout"]{bottom:27px;background:var(--anatomy-plate,#f6f2e8);padding:1px 4px}
@media (prefers-reduced-motion: reduce){.station{transition:none}}
</style>`;

const body = css + k.plateHtml({
  fig: "Fig 1",
  title: TITLE,
  hint: HINT,
  readout: STEPS[0].readout,
  keys: KEYS,
  caption: CAPTION,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: станции жизненного цикла" aria-valuemin="0" aria-valuemax="${STEPS.length - 1}" aria-valuenow="0">${svg}</div>`,
});

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}
