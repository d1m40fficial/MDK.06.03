import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import {
  PROCESSES,
  QUANTUM,
  SWITCH,
  STATES,
  RESULT,
  formatMs,
  summarize,
} from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-07-os";
const WIDTH = 540;
const HEIGHT = 450;

const BASE = { x: -112, y: -84, w: 216, d: 168, r: 12 };
const BASE_BOTTOM = -16;
const FOOT_H = 6;
const CX = -32;
const CY = 0;
const OUTER_R = 76;
const INNER_R = 44;
const CASSETTE_R = 58;
const ANGLES = [-90, -18, 54, 126, 198];
const DIAL = { x: 66, y: -42, r: 22, z: 13.2 };
const PANEL = { x: 46, y: 62, w: 52, d: 5 };
const FRONT_Y = BASE.y + BASE.d;
const MAX_BURST = Math.max(...PROCESSES.map((process) => process.burst));
const HEAD_R = OUTER_R;
const HEAD0 = [CX + Math.cos((-90 * Math.PI) / 180) * HEAD_R, CY + Math.sin((-90 * Math.PI) / 180) * HEAD_R];
const F_CENTER = G.frameAlong([CX, CY, 0], [0, 0, 1]);
const F_CORE = G.frameAlong([CX, CY, 0], [0, 0, 1]);
const F_DIAL = G.frameAlong([DIAL.x, DIAL.y, 0], [0, 0, 1]);

const rad = (angle) => (angle * Math.PI) / 180;
const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function fitPoints() {
  const points = k.boxCorners(BASE, BASE_BOTTOM - FOOT_H, 0);
  for (const angle of ANGLES) {
    for (const r of [CASSETTE_R - 15, CASSETTE_R + 15]) {
      for (const z of [0, 18]) {
        points.push([CX + Math.cos(rad(angle)) * r, CY + Math.sin(rad(angle)) * r, z]);
      }
    }
  }
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    points.push([CX + Math.cos(angle) * (OUTER_R + 3), CY + Math.sin(angle) * (OUTER_R + 3), 0]);
    points.push([CX + Math.cos(angle) * OUTER_R, CY + Math.sin(angle) * OUTER_R, 29]);
  }
  points.push([DIAL.x - 25, DIAL.y, 0], [DIAL.x + 25, DIAL.y, 0]);
  points.push([DIAL.x, DIAL.y - 25, 0], [DIAL.x, DIAL.y + 25, 0]);
  points.push([DIAL.x, DIAL.y, 20]);
  points.push(...k.boxCorners({ x: PANEL.x - 4, y: PANEL.y - 3, w: PANEL.w + 8, d: PANEL.d + 6, r: 2 }, 0, 38));
  return points;
}

const P = k.fitProjection(fitPoints(), WIDTH, HEIGHT, { pad: 18, azimuth: 45, elevation: 30 });
P.origin[0] += 2;

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function localToWorld(angle, radial, u, v, z) {
  const a = rad(angle);
  const rx = Math.cos(a);
  const ry = Math.sin(a);
  const tx = -ry;
  const ty = rx;
  return [CX + rx * radial + tx * u + rx * v, CY + ry * radial + ty * u + ry * v, z];
}

function rotatedRing(angle, radial, width, depth, radius, steps = 3) {
  const a = rad(angle);
  const rx = Math.cos(a);
  const ry = Math.sin(a);
  const tx = -ry;
  const ty = rx;
  const local = k.roundedPlan(
    { x: -width / 2, y: -depth / 2, w: width, d: depth, r: radius },
    steps,
  );
  return local.map(([u, v]) => [CX + rx * radial + tx * u + rx * v, CY + ry * radial + ty * u + ry * v]);
}

function radialBar(angle, from, to, halfWidth) {
  const a = rad(angle);
  const rx = Math.cos(a);
  const ry = Math.sin(a);
  const tx = -ry;
  const ty = rx;
  const corners = [
    [from, -halfWidth],
    [to, -halfWidth],
    [to, halfWidth],
    [from, halfWidth],
  ];
  return corners.map(([r, u]) => [CX + rx * r + tx * u, CY + ry * r + ty * u]);
}

function topMatrix(origin, u, v) {
  const o = at(origin);
  const a = at([origin[0] + u[0], origin[1] + u[1], origin[2] + u[2]]);
  const b = at([origin[0] + v[0], origin[1] + v[1], origin[2] + v[2]]);
  return `matrix(${(a[0] - o[0]).toFixed(4)} ${(a[1] - o[1]).toFixed(4)} ${(b[0] - o[0]).toFixed(4)} ${(b[1] - o[1]).toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`;
}

function frontFace(x, y, top, width, height, inner, className = "") {
  const o = at([x, y, top]);
  const a = at([x + 1, y, top]);
  const b = at([x, y, top - 1]);
  return `<g${className ? ` class="${className}"` : ""} transform="matrix(${(a[0] - o[0]).toFixed(4)} ${(a[1] - o[1]).toFixed(4)} ${(b[0] - o[0]).toFixed(4)} ${(b[1] - o[1]).toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})">${inner}</g>`;
}

function readableBasis(angle) {
  const a = rad(angle);
  let u = [-Math.sin(a), Math.cos(a), 0];
  const dx = at([u[0], u[1], 0])[0] - at([0, 0, 0])[0];
  if (dx < 0) u = [-u[0], -u[1], 0];
  const v = [-u[1], u[0], 0];
  return { u, v };
}

function surfacePoint(origin, u, v, x, y, z = origin[2]) {
  return [
    origin[0] + u[0] * x + v[0] * y,
    origin[1] + u[1] * x + v[1] * y,
    z,
  ];
}

const text = (
  x,
  y,
  value,
  { size = 3, fill = "var(--anatomy-strong)", anchor = "start", spacing = 0 } = {},
) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}" font-family="var(--anatomy-mono)">${esc(value)}</text>`;

const rect = (x, y, w, h, fill, stroke = "none", rx = 0.4, sw = 0.22) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

const circle = (cx, cy, r, fill, stroke = "none", sw = 0.24) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

const solid = (plan, z, h, { tone = "lo", steps = 6, bevel = 0.4, className = "", inner = "" } = {}) =>
  S(k.slabOf(plan, z, h, P, steps, bevel), { tone, className, crease: "faint", inner });

function foot(x, y) {
  return [
    S(k.cylinder(x, y, 8.2, BASE_BOTTOM - FOOT_H, 1.4, P, 32), { tone: "lo" }),
    S(k.cylinder(x, y, 6.2, BASE_BOTTOM - FOOT_H + 1.4, FOOT_H - 1.4, P, 32), { tone: "mid" }),
    circle(at([x, y, BASE_BOTTOM - 0.2])[0], at([x, y, BASE_BOTTOM - 0.2])[1], 1.5, "var(--anatomy-faint)"),
  ].join("");
}

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, BASE_BOTTOM - FOOT_H, 2, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 22))) out.push(foot(x, y));
  out.push(
    S(k.slabOf(BASE, BASE_BOTTOM, -BASE_BOTTOM, P, 10, 1.2), {
      tone: "mid",
      crease: "faint",
      inner: L(k.sideSeam(BASE, -7, P, 10), { tone: "faint" }),
    }),
  );
  out.push(L(k.planOutline(k.insetPlan(BASE, 7), 0.05, P, 10), { tone: "lo" }));
  const screws = k.corners(BASE, 13);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.5, 0.1, P, 20)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0.1])), { size: 0.55, tone: "hi" }));

  const ruler = { x: 94.5, y: -70, w: 4.2, d: 140, r: 1.1 };
  out.push(solid(ruler, 0, 0.8, { tone: "lo", bevel: 0.25, steps: 3 }));
  out.push(L(k.planOutline(k.insetPlan(ruler, 0.6), 0.82, P, 3), { tone: "faint" }));
  const ticks = k.topTicks(-68, 68, 4, 5, 94.6, 0.85, [1.1, 2.3], P, "y");
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  out.push(frontPlate());
  out.push(vent());
  return out.join("");
}

function frontPlate() {
  const w = 80;
  const h = 11;
  const x = -102;
  const z = -2.8;
  const inner = [
    rect(0.8, 0.8, w - 1.6, h - 1.6, "var(--anatomy-shade-0)", "none", 1.0, 0),
    rect(0, 0, w, h, "var(--anatomy-shade-1)", "var(--anatomy-faint)", 1.2, 0.3),
    text(w / 2, 7.2, "ДИСПЕТЧЕР ПРОЦЕССОВ", {
      size: 5.2,
      fill: "var(--anatomy-strong)",
      anchor: "middle",
      spacing: 0.22,
    }),
    circle(4.2, 3.0, 0.9, "var(--anatomy-mid)"),
    circle(w - 4.2, 3.0, 0.9, "var(--anatomy-mid)"),
    circle(4.2, h - 3.0, 0.9, "var(--anatomy-mid)"),
    circle(w - 4.2, h - 3.0, 0.9, "var(--anatomy-mid)"),
  ].join("");
  return frontFace(x - 1.2, FRONT_Y + 0.04, z + 1.2, w + 2.4, h + 2.4, rect(0, 0, w + 2.4, h + 2.4, "var(--anatomy-shade-0)", "none", 1.4, 0)) +
    frontFace(x, FRONT_Y + 0.06, z, w, h, inner);
}

function vent() {
  const x = 60;
  const z = -2.6;
  const w = 36;
  const h = 11;
  const slots = Array.from({ length: 5 }, (_, index) =>
    rect(3, 2.2 + index * 1.55, w - 6, 0.7, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 0.3, 0.16),
  ).join("");
  const inner = [
    rect(0, 0, w, h, "var(--anatomy-shade-2)", "var(--anatomy-faint)", 1.4, 0.26),
    slots,
    circle(2.4, 2.2, 0.55, "var(--anatomy-mid)"),
    circle(w - 2.4, 2.2, 0.55, "var(--anatomy-mid)"),
    circle(2.4, h - 2.2, 0.55, "var(--anatomy-mid)"),
    circle(w - 2.4, h - 2.2, 0.55, "var(--anatomy-mid)"),
  ].join("");
  return frontFace(x, FRONT_Y + 0.06, z, w, h, inner);
}

function buttons() {
  const out = [];
  const controls = [
    { id: "start", label: "ПУСК", x: -4 },
    { id: "step", label: "КВАНТ", x: 14 },
    { id: "reset", label: "СБРОС", x: 32 },
  ];
  for (const control of controls) {
    const z = -7.6;
    const bezel = frontFace(
      control.x - 9.5,
      FRONT_Y + 0.07,
      z + 9.5,
      19,
      19,
      [
        circle(9.5, 9.5, 8.4, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 0.24),
        circle(9.5, 9.5, 7.2, "none", "var(--anatomy-mid)", 0.3),
      ].join(""),
    );
    const frame = G.frameAlong([control.x, FRONT_Y, z], [0, 1, 0]);
    const cap = [
      S(G.ringBand(0, 0.8, 6.05, 7.4, frame, P, { steps: 40 }), { tone: "mid", crease: "lo" }),
      S(G.disc(0.8, 2.2, 6.05, frame, P, { steps: 40 }), { tone: "hi", crease: "lo" }),
      S(G.disc(2.2, 2.55, 5.3, frame, P, { steps: 40 }), { tone: "hi", crease: "faint" }),
    ].join("");
    const face = frontFace(
      control.x - 7,
      FRONT_Y + 2.62,
      z + 7,
      14,
      14,
      [
        circle(7, 7, 5.0, "none", "var(--anatomy-faint)", 0.28),
        text(7, 8.1, control.label, {
          size: control.label.length > 4 ? 2.55 : 2.9,
          fill: "var(--anatomy-strong)",
          anchor: "middle",
          spacing: 0.08,
        }),
      ].join(""),
    );
    out.push(`<g class="ctl" data-action="${control.id}" role="button" tabindex="0" aria-label="${esc(control.label)}">${bezel}${cap}${face}</g>`);
  }
  return out.join("");
}

function carouselBase() {
  const out = [];
  for (const angle of ANGLES) {
    out.push(S(k.extrude(radialBar(angle, 20, OUTER_R + 1, 3.1), 0, 4.0, P, { convex: true, bevel: 0.45 }), { tone: "mid", crease: "lo" }));
  }
  out.push(S(G.ringBand(0, 4.6, 40.5, 45.5, F_CENTER, P, { steps: 144 }), { tone: "mid", crease: "lo" }));
  out.push(S(G.ringBand(0, 5.0, OUTER_R - 3, OUTER_R + 3, F_CENTER, P, { steps: 160 }), { tone: "mid", crease: "lo" }));
  out.push(S(G.ringBand(0, 5.0, 18, 24, F_CENTER, P, { steps: 96 }), { tone: "lo", crease: "faint" }));
  out.push(S(G.disc(5.0, 7.0, 19.4, F_CORE, P, { steps: 80 }), { tone: "mid", crease: "lo" }));

  const rings = [
    [40.5, 4.65],
    [45.5, 4.65],
    [OUTER_R - 3, 5.05],
    [OUTER_R, 5.05],
    [OUTER_R + 3, 5.05],
    [18, 5.05],
    [24, 5.05],
  ];
  out.push(L(rings.map(([r, z]) => k.ring(CX, CY, r, z, P, 120)).join(""), { tone: "lo" }));
  out.push(L(k.ring(CX, CY, OUTER_R, 5.08, P, 120), { tone: "faint" }));
  const ticks = k.radialTicks(CX, CY, OUTER_R + 2.8, 72, 6, 5.1, [1.35, 2.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  for (const angle of ANGLES) {
    out.push(S(k.extrude(rotatedRing(angle, CASSETTE_R, 30, 20, 2.4, 3), 4.1, 1.3, P, { convex: true, bevel: 0.3 }), { tone: "lo", crease: "faint" }));
    const [sx, sy] = [CX + Math.cos(rad(angle)) * 48.2, CY + Math.sin(rad(angle)) * 48.2];
    const frame = G.frameAlong([sx, sy, 4.0], [0, 0, 1]);
    out.push(S(G.ringBand(0, 2.0, 1.25, 3.25, frame, P, { steps: 32 }), { tone: "hi", crease: "lo" }));
    out.push(S(G.disc(2.0, 2.25, 1.25, frame, P, { steps: 24 }), { tone: "lo", crease: "faint" }));
  }

  for (let index = 0; index < ANGLES.length; index += 1) {
    const angle = ANGLES[index];
    const from = [CX + Math.cos(rad(angle)) * 20.2, CY + Math.sin(rad(angle)) * 20.2, 6.32];
    const to = [CX + Math.cos(rad(angle)) * 48.2, CY + Math.sin(rad(angle)) * 48.2, 6.32];
    const groove = k.lineOnTop([from[0], from[1]], [to[0], to[1]], 6.32, P);
    const id = PROCESSES[index].id;
    out.push(`<g class="spoke" data-process="${id}" data-lit="${id === "P1" ? "true" : "false"}">`);
    out.push(`<path class="iso-line spoke-groove" data-tone="faint" d="${groove}" style="stroke-width:3.6"/>`);
    out.push(`<path class="iso-line spoke-halo" data-tone="lit" d="${groove}" style="stroke-width:5.4;opacity:.12"/>`);
    out.push(`<path class="iso-line spoke-lit" data-tone="lit" d="${groove}" style="stroke-width:1.55;stroke-linecap:round"/>`);
    out.push(D([at(from), at(to)], { size: 0.75, tone: "hi" }));
    out.push(`</g>`);
  }
  return out.join("");
}

function cassette(process, angle, active) {
  const center = [CX + Math.cos(rad(angle)) * CASSETTE_R, CY + Math.sin(rad(angle)) * CASSETTE_R];
  const depth = k.depthOf([center[0], center[1], 0], P);
  const bodyRing = rotatedRing(angle, CASSETTE_R, 26, 16, 1.6, 3);
  const topRing = rotatedRing(angle, CASSETTE_R, 22.4, 13.2, 1.3, 3);
  const body = S(k.extrude(bodyRing, 5.5, 9.6, P, { convex: true, bevel: 0.55 }), {
    tone: "mid",
    crease: "lo",
    className: "cass-body",
    inner: L(k.ringSeam(bodyRing, 10.2, P), { tone: "faint" }),
  });
  const top = S(k.extrude(topRing, 15.1, 1.35, P, { convex: true, bevel: 0.4 }), {
    tone: "hi",
    crease: "lo",
    className: "cass-top",
  });
  const basis = readableBasis(angle);
  const origin = [center[0], center[1], 16.5];
  const matrix = topMatrix(origin, basis.u, basis.v);
  const pips = Array.from({ length: 4 }, (_, index) =>
    `<rect class="pip" data-pip="${index}" data-on="true" x="${(0.3 + index * 2.35).toFixed(2)}" y="-3.7" width="1.8" height="1.35" rx="0.32"/>`,
  ).join("");
  const panel = [
    `<g class="cass-panel" transform="${matrix}">`,
    rect(-10.2, -4.7, 20.4, 9.4, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 0.8, 0.24),
    text(-8.7, 1.2, process.id, { size: 5.4, fill: "var(--anatomy-strong)", spacing: 0.06 }),
    text(-8.7, 4.2, `${process.burst} мс`, { size: 2.0, fill: "var(--anatomy-muted)", spacing: 0.02 }),
    pips,
    `<circle cx="-8.0" cy="-2.5" r="0.55" fill="var(--anatomy-faint)"/>`,
    `<circle cx="8.9" cy="-2.5" r="0.55" fill="var(--anatomy-faint)"/>`,
    `</g>`,
  ].join("");
  const ledAt = surfacePoint(origin, basis.u, basis.v, 8.65, 3.0, 16.45);
  const led = S(k.cylinder(ledAt[0], ledAt[1], 1.05, 16.45, 0.8, P, 20), {
    tone: "hi",
    crease: "faint",
    className: "cass-led",
    lit: true,
  });
  return `<g class="cassette${active ? " is-active" : ""}" data-cassette="${process.id}" data-depth="${depth.toFixed(3)}">${body}${top}${panel}${led}</g>`;
}

function core() {
  const depth = k.depthOf([CX, CY, 0], P);
  const profile = [
    [0, 15.2],
    [1.8, 15.2],
    [2.9, 14.1],
    [10.9, 14.1],
    [12.0, 12.2],
    [12.0, 0],
  ];
  const body = S(G.solidOf(profile, F_CORE, P, { steps: 96 }), { tone: "hi", crease: "lo", className: "core-body" });
  const ribs = G.ribsOf(F_CORE, 3.2, 10.8, 14.15, 16, P, {
    phase: 0.12,
    fade: [0.04, 0.48],
    seams: true,
  });
  const seamRings = [2.9, 12.0].map((s) => k.ring(CX, CY, 12.2, 7 + s, P, 64)).join("");
  const studs = G.dotsOf(F_CORE, 11.8, 12.1, 12, P, { all: true });
  const topRing = S(G.ringBand(12.0, 12.65, 4.8, 11.6, F_CORE, P, { steps: 64 }), { tone: "hi", crease: "lo" });
  const lens = S(G.disc(12.0, 12.9, 4.8, F_CORE, P, { steps: 56 }), {
    tone: "hi",
    crease: "faint",
    className: "core-led",
    lit: true,
  });
  return `<g class="core" data-active="true" data-depth="${depth.toFixed(3)}">${body}${k.fadedSvg(ribs, { tone: "lo" })}${L(seamRings, { tone: "faint" })}${D(studs, { size: 0.65, tone: "hi" })}${topRing}${lens}</g>`;
}

function readHead() {
  const x = HEAD0[0];
  const y = HEAD0[1];
  const frame = G.frameAlong([x, y, 0], [0, 0, 1]);
  const depth = k.depthOf([x, y, 0], P);
  const parts = [
    S(G.disc(5.0, 5.75, 6.6, frame, P, { steps: 40 }), { tone: "lo", crease: "faint" }),
    S(G.disc(5.75, 8.0, 5.55, frame, P, { steps: 48, bevel: 0.25 }), { tone: "hi", crease: "lo" }),
    S(G.ringBand(8.0, 8.65, 2.35, 5.2, frame, P, { steps: 40 }), { tone: "hi", crease: "lo" }),
    S(G.disc(8.0, 8.45, 2.35, frame, P, { steps: 32 }), { tone: "lo", crease: "faint" }),
    S(G.disc(8.45, 24.0, 1.75, frame, P, { steps: 28 }), { tone: "mid", crease: "faint" }),
    ...[10.6, 12.1, 13.6].map((z) =>
      S(G.ringBand(z, z + 0.42, 1.75, 2.42, frame, P, { steps: 28 }), { tone: "hi", crease: "faint" }),
    ),
    S(G.disc(23.6, 24.8, 4.1, frame, P, { steps: 40 }), { tone: "mid", crease: "lo" }),
    S(G.disc(24.8, 26.8, 3.5, frame, P, { steps: 40 }), { tone: "hi", crease: "lo" }),
    S(G.ringBand(25.35, 26.25, 3.5, 4.18, frame, P, { steps: 40 }), {
      tone: "lit",
      crease: "none",
      className: "head-lamp",
    }),
    S(G.disc(26.8, 27.5, 2.05, frame, P, { steps: 32 }), { tone: "mid", crease: "lo" }),
    S(G.sphereOf([x, y, 28.1], 1.25, P), { tone: "hi", crease: "faint" }),
  ].join("");
  return `<g class="readhead" data-active="true" data-depth="${depth.toFixed(3)}" transform="">${parts}</g>`;
}

function dialNeedle(remaining) {
  const angle = rad(-135 + (remaining / MAX_BURST) * 270);
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  return k.lineOnTop(
    [DIAL.x - dx * 2.1, DIAL.y - dy * 2.1],
    [DIAL.x + dx * 16.1, DIAL.y + dy * 16.1],
    DIAL.z + 0.42,
    P,
  );
}

function dial() {
  const out = [];
  out.push(S(G.disc(0.8, 3.4, 23.6, F_DIAL, P, { steps: 96 }), { tone: "lo", crease: "faint" }));
  out.push(S(G.ringBand(3.4, 4.5, 19.6, 23.6, F_DIAL, P, { steps: 96 }), { tone: "mid", crease: "lo" }));
  out.push(S(G.disc(4.5, 10.8, 20.9, F_DIAL, P, { steps: 112 }), { tone: "mid", crease: "lo" }));
  out.push(S(G.ringBand(10.8, 13.0, 18.7, 22.9, F_DIAL, P, { steps: 128, bevel: 0.2 }), { tone: "hi", crease: "lo" }));
  out.push(S(G.disc(10.8, 11.7, 18.9, F_DIAL, P, { steps: 112 }), { tone: "hi", crease: "faint" }));
  out.push(L(k.knurl(DIAL.x, DIAL.y, 22.55, 10.9, 12.9, 72, P, 0.35), { tone: "lo" }));
  out.push(L([10.9, 12.9].map((z) => k.sideArc(DIAL.x, DIAL.y, 22.55, z, P, 56)).join(""), { tone: "faint" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, 18.9, 11.78, P, 112), { tone: "faint" }));

  const faceOrigin = [DIAL.x, DIAL.y, 11.78];
  const faceMatrix = topMatrix(faceOrigin, [1, 0, 0], [0, 1, 0]);
  const faceInner = [
    `<g transform="${faceMatrix}">`,
    `<circle cx="0" cy="0" r="18.35" fill="var(--anatomy-shade-0)" stroke="var(--anatomy-faint)" stroke-width="0.28"/>`,
    `</g>`,
  ].join("");
  out.push(faceInner);

  const ticks = k.radialTicks(DIAL.x, DIAL.y, 17.55, 54, 9, 11.92, [1.45, 2.9], P, rad(-135), rad(270));
  out.push(L(k.ring(DIAL.x, DIAL.y, 17.55, 11.92, P, 96), { tone: "lo" }));
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));

  for (const value of [0, 3, 6, 9, 12]) {
    const angle = rad(-135 + (value / MAX_BURST) * 270);
    const rx = Math.sin(angle);
    const ry = -Math.cos(angle);
    const pos = [DIAL.x + rx * 12.1, DIAL.y + ry * 12.1, 11.98];
    const tangent = [Math.cos(angle), Math.sin(angle), 0];
    let u = tangent;
    if (at([u[0], u[1], 0])[0] - at([0, 0, 0])[0] < 0) u = [-u[0], -u[1], 0];
    const v = [-u[1], u[0], 0];
    out.push(
      `<g transform="${topMatrix(pos, u, v)}">${text(0, 0.85, String(value), {
        size: 2.1,
        fill: "var(--anatomy-muted)",
        anchor: "middle",
      })}</g>`,
    );
  }
  out.push(
    `<g transform="${topMatrix([DIAL.x, DIAL.y, 11.98], [1, 0, 0], [0, 1, 0])}">${text(0, 8.5, "ОСТАТОК, МС", {
      size: 2.35,
      fill: "var(--anatomy-muted)",
      anchor: "middle",
      spacing: 0.12,
    })}</g>`,
  );
  out.push(
    `<path class="iso-line dial-needle" data-needle="true" data-free="both" d="${dialNeedle(STATES[0].remaining.P1)}" data-tone="lit" style="stroke-width:1.05"/>`,
  );
  out.push(S(G.disc(11.9, 12.8, 2.8, F_DIAL, P, { steps: 32 }), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, 2.8, 12.82, P, 24), { tone: "faint" }));
  const screws = [0.25, 0.75, 1.25, 1.75].map((share) => {
    const angle = share * Math.PI;
    return [DIAL.x + Math.cos(angle) * 21.4, DIAL.y + Math.sin(angle) * 21.4];
  });
  out.push(D(screws.map(([x, y]) => at([x, y, 13.02])), { size: 0.7, tone: "hi" }));
  return out.join("");
}

function panel() {
  const out = [];
  const plinth = { x: PANEL.x - 4, y: PANEL.y - 3, w: PANEL.w + 8, d: PANEL.d + 6, r: 3 };
  const bodyPlan = { x: PANEL.x, y: PANEL.y, w: PANEL.w, d: PANEL.d, r: 2 };
  const capPlan = { x: PANEL.x - 2, y: PANEL.y - 1, w: PANEL.w + 4, d: PANEL.d + 2, r: 2 };
  out.push(solid(plinth, 0, 3, { tone: "lo", bevel: 0.5, steps: 4 }));
  out.push(
    S(k.slabOf(bodyPlan, 3, 33, P, 4, 0.6), {
      tone: "mid",
      crease: "lo",
      inner: [12, 24].map((z) => k.sideSeam(bodyPlan, z, P, 4)).join(""),
    }),
  );
  out.push(solid(capPlan, 36, 2.4, { tone: "mid", bevel: 0.5, steps: 4 }));

  const w = PANEL.w;
  const h = 33;
  const row = (y, label, value, stat) =>
    `<text x="4.4" y="${y}" font-size="3.0" fill="var(--anatomy-muted)" letter-spacing="0.04" font-family="var(--anatomy-mono)">${label} <tspan fill="var(--anatomy-strong)" letter-spacing="0"${stat ? ` data-stat="${stat}"` : ""}>${value}</tspan></text>`;
  const inner = [
    rect(1.6, 1.6, w - 3.2, h - 3.2, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 1.2, 0.28),
    text(4.4, 6.5, "СТАТИСТИКА", { size: 3.35, fill: "var(--anatomy-text)", spacing: 0.18 }),
    `<circle cx="${w - 6.2}" cy="5.0" r="1.8" fill="var(--anatomy-shade-2)" stroke="var(--anatomy-faint)" stroke-width="0.22"/>`,
    `<circle class="panel-led" cx="${w - 6.2}" cy="5.0" r="1.0" fill="var(--anatomy-faint)"/>`,
    rect(4.4, 8.2, w - 8.8, 0.18, "var(--anatomy-faint)", "none", 0, 0),
    row(13.0, "КВАНТ", `${formatMs(QUANTUM)} МС`),
    rect(4.4, 15.0, w - 8.8, 0.14, "var(--anatomy-faint)", "none", 0, 0),
    row(18.6, "ПЕРЕКЛЮЧЕНИЙ", "0", "switches"),
    rect(4.4, 20.5, w - 8.8, 0.14, "var(--anatomy-faint)", "none", 0, 0),
    row(24.1, "ГОТОВО", "0/5", "done"),
    rect(4.4, 26.0, w - 8.8, 0.14, "var(--anatomy-faint)", "none", 0, 0),
    row(29.6, "ВРЕМЯ", "0,0 МС", "time"),
    rect(4.4, 31.1, w - 8.8, 0.14, "var(--anatomy-faint)", "none", 0, 0),
  ].join("");
  out.push(frontFace(PANEL.x, PANEL.y + PANEL.d + 0.06, 36, w, h, inner));
  return out.join("");
}

function sortNodes(nodes) {
  return [...nodes].sort((a, b) => Number(a.depth) - Number(b.depth)).map((node) => node.svg).join("");
}

function build(theme) {
  const state = STATES[0];
  const art = [];
  art.push(base());
  art.push(buttons());
  art.push(carouselBase());

  const nodeList = [];
  for (let index = 0; index < PROCESSES.length; index += 1) {
    nodeList.push({
      depth: k.depthOf([CX + Math.cos(rad(ANGLES[index])) * CASSETTE_R, CY + Math.sin(rad(ANGLES[index])) * CASSETTE_R, 0], P),
      svg: cassette(PROCESSES[index], ANGLES[index], index === 0),
    });
  }
  nodeList.push({ depth: k.depthOf([CX, CY, 0], P), svg: core() });
  nodeList.push({ depth: k.depthOf([HEAD0[0], HEAD0[1], 0], P), svg: readHead() });
  art.push(`<g data-sortable="true">${sortNodes(nodeList)}</g>`);

  art.push(dial());
  art.push(panel());

  const caption =
    "Карусель из пяти процессов, квант 4 мс и переключение 0,1 мс. За 41,0 мс все пять процессов получают процессор; 40 мс уходит на полезную работу, 1 мс на переключения.";

  const body = k.plateHtml({
    fig: "Fig 1",
    title: "Диспетчер процессов",
    hint: "Space пуск · → квант · R сброс",
    readout: summarize(state),
    keys: [
      { mark: "lit", label: "работает" },
      { mark: "dim", label: "готов" },
    ],
    caption,
    body: `<style>${EXTRA_CSS}</style><div class="iso-stage" tabindex="0" aria-label="Диспетчер процессов: карусель из пяти процессов вокруг процессорного ядра. Space запускает показ, стрелка вправо выполняет один квант, R сбрасывает.">${k.figureSvg({
      width: WIDTH,
      height: HEIGHT,
      label:
        "Настольный диспетчерский пульт: круглая карусель из пяти кассет с процессами вокруг процессорного ядра, латунная каретка на внешнем кольце, стрелочный прибор остатка работы, панель счётчика переключений и три кнопки.",
      body: art.join(""),
    })}</div>`,
  });

  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(
    join(HERE, name),
    k.pageHtml({ title: ID, theme, body, script: kitScript() + liveScript() }),
  );
  console.log("wrote", name);
}

const EXTRA_CSS = `
.iso-stage{--fig-spoke:#ffffff}
body[data-theme="light"] .iso-stage{--fig-spoke:#1d1d1d}
.cassette .cass-body,.cassette .cass-top,.cassette .cass-panel{transition:opacity .35s var(--anatomy-ease)}
.cassette.is-done .cass-body,.cassette.is-done .cass-top,.cassette.is-done .cass-panel{opacity:.42}
.cassette.is-active .cass-top .iso-edge{stroke:var(--anatomy-lit);stroke-width:1}
.cassette.is-active .cass-panel rect{stroke:var(--anatomy-lit)}
.pip{fill:var(--anatomy-faint);transition:fill .28s var(--anatomy-ease)}
.pip[data-on="true"]{fill:var(--anatomy-hi)}
.cassette.is-active .pip[data-on="true"]{fill:var(--anatomy-lit)}
.cassette.is-done .pip{fill:var(--anatomy-faint)}
.cass-led .iso-top{fill:var(--anatomy-faint);transition:fill .3s var(--anatomy-ease)}
.cassette.is-active .cass-led .iso-top{fill:var(--anatomy-lit)}
.cassette.is-done .cass-led .iso-top{fill:var(--anatomy-green)}
.spoke-lit,.spoke-halo{opacity:0;transition:opacity .32s var(--anatomy-ease)}
.spoke[data-lit="true"] .spoke-lit{opacity:1}
.spoke[data-lit="true"] .spoke-halo{opacity:.15}
.spoke-lit{filter:drop-shadow(0 0 2.5px var(--anatomy-lit))}
.core-led .iso-top{fill:var(--anatomy-shade-2);transition:fill .35s var(--anatomy-ease)}
.core[data-active="true"] .core-led .iso-top{fill:var(--anatomy-lit)}
.core-led{filter:drop-shadow(0 0 2px var(--anatomy-lit))}
.head-lamp .iso-fill,.head-lamp .iso-shade{fill:var(--anatomy-lit);stroke:none}
.readhead[data-active="false"] .head-lamp .iso-fill,.readhead[data-active="false"] .head-lamp .iso-shade{fill:var(--anatomy-mid)}
.dial-needle{transition:none}
.panel-led[data-done="true"]{fill:var(--anatomy-green)}
.panel-led{transition:fill .3s var(--anatomy-ease);filter:drop-shadow(0 0 1.4px var(--anatomy-lit))}
.panel-led[data-done="true"]{filter:drop-shadow(0 0 1.6px var(--anatomy-green))}
.ctl{cursor:pointer}
.ctl .iso-edge{transition:stroke .2s var(--anatomy-ease)}
.ctl:hover .iso-edge{stroke:var(--anatomy-lit)}
.ctl:focus{outline:none}
.ctl:focus-visible{outline:1px solid var(--anatomy-lit);outline-offset:3px}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-mid);outline-offset:6px;border-radius:6px}
.iso-plate{padding-bottom:78px}
.iso-plate-corner[data-corner="hint"]{bottom:34px}
.iso-plate-corner[data-corner="readout"]{left:0;right:0;bottom:0;white-space:normal;text-align:right;font-size:10px;line-height:1.45;text-wrap:balance}
@media (max-width:560px){
  .iso-plate{padding:44px 10px 96px}
  .iso-plate-corner[data-corner="hint"]{bottom:34px;font-size:9px;letter-spacing:.06em}
  .iso-plate-corner[data-corner="readout"]{left:0;right:0;bottom:0;white-space:normal;text-align:right;font-size:8.8px;line-height:1.55;text-wrap:balance}
}
@media (prefers-reduced-motion:reduce){
  .cassette .cass-body,.cassette .cass-top,.cassette .cass-panel,.pip,.cass-led .iso-top,.spoke-lit,.spoke-halo,.core-led .iso-top,.ctl .iso-edge,.panel-led{transition:none}
}
`;

function liveScript() {
  const data = {
    processes: PROCESSES.map((process) => ({ id: process.id, name: process.name, burst: process.burst })),
    angles: ANGLES,
    states: STATES,
    readouts: STATES.map((state) => summarize(state)),
    times: STATES.map((state) => formatMs(state.time)),
    quantum: QUANTUM,
    switchCost: SWITCH,
    maxBurst: MAX_BURST,
    center: [CX, CY],
    headRadius: HEAD_R,
    head0: HEAD0,
    dial: { x: DIAL.x, y: DIAL.y, z: DIAL.z },
    result: {
      makespan: RESULT.makespan,
      switches: RESULT.switches,
      utilization: RESULT.utilization,
      averageCompletion: RESULT.averageCompletion,
    },
  };
  return `
const DATA = ${JSON.stringify(data)};
const P = ${JSON.stringify(P)};
const IDS = DATA.processes.map((p) => p.id);
const ANGLE = Object.fromEntries(IDS.map((id, i) => [id, DATA.angles[i]]));
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const sortable = svg.querySelector("[data-sortable]");
const head = svg.querySelector(".readhead");
const needle = svg.querySelector("[data-needle]");
const readout = document.querySelector("[data-readout]");
const cassettes = [...svg.querySelectorAll(".cassette")];
const spokes = [...svg.querySelectorAll(".spoke")];
const core = svg.querySelector(".core");
const panelLed = svg.querySelector(".panel-led");
const switchesEl = svg.querySelector('[data-stat="switches"]');
const doneEl = svg.querySelector('[data-stat="done"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
let stateIndex = 0;
let headSlot = 0;
let headAngle = ANGLE.P1;
let headTarget = ANGLE.P1;
let needleValue = DATA.states[0].remaining.P1;
let needleTarget = needleValue;
let auto = false;
let paused = false;
let autoTimer = 0;
let idleTimer = 0;
let frame = 0;
let last = 0;
let visible = true;
let orderKey = "";

readout.setAttribute("aria-live", "polite");

function formatTime(index) {
  return DATA.times[index] + " МС";
}

function reorder() {
  const nodes = [...sortable.children];
  const key = nodes.map((node) => node.dataset.cassette || node.className.baseVal || node.className || "").join("|");
  const sorted = nodes.sort((a, b) => Number(a.dataset.depth) - Number(b.dataset.depth));
  const sortedKey = sorted.map((node) => node.dataset.cassette || node.className.baseVal || node.className || "").join("|");
  if (sortedKey !== orderKey) {
    for (const node of sorted) sortable.appendChild(node);
    orderKey = sortedKey;
  }
}

function drawHead(angle) {
  const a = ((angle % 360) + 360) % 360;
  const r = (a * Math.PI) / 180;
  const hx = DATA.center[0] + Math.cos(r) * DATA.headRadius;
  const hy = DATA.center[1] + Math.sin(r) * DATA.headRadius;
  head.setAttribute("transform", translateAlong(P, [hx - DATA.head0[0], hy - DATA.head0[1], 0]));
  head.dataset.depth = depthOf([hx, hy, 0], P).toFixed(3);
  reorder();
}

function drawNeedle(value) {
  const angle = (-135 + (value / DATA.maxBurst) * 270) * Math.PI / 180;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  needle.setAttribute("d", lineOnTop(
    [DATA.dial.x - dx * 2.1, DATA.dial.y - dy * 2.1],
    [DATA.dial.x + dx * 16.1, DATA.dial.y + dy * 16.1],
    DATA.dial.z + 0.42,
    P,
  ));
}

function setHead(index) {
  if (index === headSlot) return;
  let target = DATA.angles[index];
  while (target <= headTarget + 0.0001) target += 360;
  headTarget = target;
  headSlot = index;
}

function applyState(index, animate = true) {
  const state = DATA.states[index];
  const done = new Set(state.done);
  const active = Boolean(state.current) && !done.has(state.current);
  for (const cassette of cassettes) {
    const id = cassette.dataset.cassette;
    const isDone = done.has(id);
    cassette.classList.toggle("is-done", isDone);
    cassette.classList.toggle("is-active", id === state.current && !isDone);
    const process = DATA.processes[IDS.indexOf(id)];
    const remaining = state.remaining[id];
    const lit = Math.ceil((remaining / process.burst) * 4);
    for (const pip of cassette.querySelectorAll(".pip")) {
      pip.dataset.on = Number(pip.dataset.pip) < lit ? "true" : "false";
    }
  }
  for (const spoke of spokes) {
    spoke.dataset.lit = spoke.dataset.process === state.current && active ? "true" : "false";
  }
  core.dataset.active = active ? "true" : "false";
  head.dataset.active = active ? "true" : "false";
  switchesEl.textContent = String(state.switches);
  doneEl.textContent = state.done.length + "/" + DATA.processes.length;
  panelLed.dataset.done = state.done.length === DATA.processes.length ? "true" : "false";
  const timeEl = svg.querySelector('[data-stat="time"]');
  if (timeEl) timeEl.textContent = formatTime(index);
  setHead(IDS.indexOf(state.current));
  needleTarget = state.remaining[state.current] ?? 0;
  readout.textContent = DATA.readouts[index];
  stateIndex = index;
  if (!animate || still.matches) {
    headAngle = headTarget;
    needleValue = needleTarget;
    drawHead(headAngle);
    drawNeedle(needleValue);
  } else {
    run();
  }
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
  last = now;
  const calm = still.matches;
  const followHead = calm ? 1 : 1 - Math.exp(-dt / 0.16);
  const followNeedle = calm ? 1 : 1 - Math.exp(-dt / 0.11);
  headAngle += (headTarget - headAngle) * followHead;
  needleValue += (needleTarget - needleValue) * followNeedle;
  if (Math.abs(headTarget - headAngle) < 0.01) headAngle = headTarget;
  if (Math.abs(needleTarget - needleValue) < 0.004) needleValue = needleTarget;
  drawHead(headAngle);
  drawNeedle(needleValue);
  const settled = headAngle === headTarget && needleValue === needleTarget;
  if (settled) {
    frame = 0;
    last = 0;
  } else {
    frame = requestAnimationFrame(tick);
  }
}

function run() {
  if (!visible) return;
  if (!frame) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}

function clearAuto() {
  clearTimeout(autoTimer);
  autoTimer = 0;
}

function schedule(delay) {
  clearAuto();
  if (!auto || paused || still.matches || !visible) return;
  autoTimer = setTimeout(() => {
    if (!auto || paused || still.matches) return;
    if (stateIndex < DATA.states.length - 1) {
      applyState(stateIndex + 1);
      schedule(1600);
    } else {
      autoTimer = setTimeout(() => {
        if (!auto || paused || still.matches) return;
        applyState(0);
        schedule(1600);
      }, 2000);
    }
  }, delay);
}

function stopAuto(explicit = false) {
  auto = false;
  clearAuto();
  clearTimeout(idleTimer);
  idleTimer = 0;
  if (explicit) paused = true;
}

function armIdle() {
  clearTimeout(idleTimer);
  idleTimer = 0;
  if (still.matches || paused) return;
  idleTimer = setTimeout(() => {
    if (paused || still.matches) return;
    auto = true;
    schedule(0);
  }, 2500);
}

function manual(action) {
  paused = false;
  auto = false;
  clearAuto();
  clearTimeout(idleTimer);
  idleTimer = 0;
  action();
  armIdle();
}

function stepOnce() {
  manual(() => {
    if (stateIndex < DATA.states.length - 1) applyState(stateIndex + 1);
    else applyState(0);
  });
}

function resetAll() {
  manual(() => applyState(0));
}

function toggleAuto() {
  if (still.matches) {
    stepOnce();
    return;
  }
  if (auto) {
    stopAuto(true);
    return;
  }
  paused = false;
  auto = true;
  clearTimeout(idleTimer);
  idleTimer = 0;
  schedule(0);
}

for (const control of svg.querySelectorAll(".ctl")) {
  const action = control.dataset.action;
  const runControl = (event) => {
    event.stopPropagation();
    if (action === "start") toggleAuto();
    if (action === "step") stepOnce();
    if (action === "reset") resetAll();
    stage.focus({ preventScroll: true });
  };
  control.addEventListener("click", runControl);
  control.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " " || event.code === "Space") {
      event.preventDefault();
      event.stopPropagation();
      runControl(event);
    }
  });
}

stage.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    toggleAuto();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    stepOnce();
  } else if (event.key === "r" || event.key === "R" || event.key === "Home") {
    event.preventDefault();
    resetAll();
  }
});

stage.addEventListener("click", () => stage.focus({ preventScroll: true }));

new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (!visible) {
    clearAuto();
    clearTimeout(idleTimer);
    idleTimer = 0;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  } else if (auto) {
    schedule(0);
  } else {
    armIdle();
  }
}, { rootMargin: "120px 0px" }).observe(stage);

const onMotionChange = () => {
  if (still.matches) {
    stopAuto(true);
    paused = true;
    headAngle = headTarget;
    needleValue = needleTarget;
    drawHead(headAngle);
    drawNeedle(needleValue);
  } else {
    paused = false;
    armIdle();
  }
};
if (still.addEventListener) still.addEventListener("change", onMotionChange);

applyState(0, false);
reorder();
armIdle();
`;
}

build("dark");
build("light");
