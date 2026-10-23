import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, STEPS } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 640;
const HEIGHT = 430;

const PLATE = { x: -170, y: -78, w: 340, d: 150, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

const RAIL = { x0: -126, x1: 84, z0: 4, z1: 6.8 };
const SLEEPER_X = [-112, -76, -40, -4, 32, 68];
const SHOE_X = [-138, -72, -45, 52.8, -138];
const CARD_X = [-138, -72, -45, 52.8, 106];
const MEDIA_Z = 9.4; // низ карты на каретке

const TRAY = { x: -158, y: -18, w: 32, d: 26, r: 2 };
const TRAY_WALL_H = 4.8;
const ERP = { x: -148, y: 26, w: 52, d: 22, r: 2 };
const ERP_WALL_H = 5.6;
const JUNK = { x: 86, y: -20, w: 46, d: 28, r: 2 };
const JUNK_WALL_H = 4.2;

const ROD_X = [-92, -72, -52];
const BEAM = { x: -99, y: -37, w: 54, d: 57, r: 3 };
const BEAM_Z0 = 21.4;
const BEAM_Z1 = 25.4;
const TOWER_Z1 = 27.8;
const ROD_COLLAR_Z0 = 31.4;
const ROD_TOP = 34;
const TOOTH = { client: 4.4, fio: 6.2, sum: 3.8 };
const OFF = { client: 7, fio: 0, sum: -7 };

const PIN = { x: 66, y: 9 };
const PIN_TOP = 10.4;
const JUNK_X = 106;

const TABLET = { x: -166, y: -76, w: 80, d: 20, r: 2 };
const TABLET_H = 8;
const ODO_X = [-148, -126, -104];
const ODO_Y = -66;
const ODO_LABELS = ["отправлено", "принято", "отклонено"];
const ODO_INIT = [100, 100, 0];
const DRUM_R = 5.6;

const RULE = { x: -100, y: -50, w: 226, d: 7, r: 1 };
const LABEL = { x: -138, y: -56, w: 24, d: 9, r: 1.2 };

const pts = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  [ROD_X[2], -3, ROD_TOP + 1],
  [ROD_X[0], -3, ROD_TOP + 1],
  [ODO_X[0], ODO_Y, TABLET_H + 16],
  [ERP.x, ERP.y + ERP.d, ERP_WALL_H + 7],
  [PIN.x, PIN.y, PIN_TOP + 2],
  [RAIL.x1, -4, 10],
];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 26, azimuth: 42, elevation: 31 });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (dots, style) => k.dotsSvg(dots, style);
const byDepth = (list) => [...list].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  out.push(S(k.slabOf(RULE, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(RULE.x + 4, RULE.x + RULE.w - 4, 4, 5, RULE.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([RULE.x + 2, RULE.y + 3.5, 0.6]), at([RULE.x + RULE.w - 2, RULE.y + 3.5, 0.6])], { size: 0.45 }));
  out.push(S(k.slabOf(LABEL, 0, 0.9, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.4), 0.9, P, 4), { tone: "lo" }));
  out.push(
    L(
      [20, 13, 7]
        .map((len, i) => k.lineOnTop([LABEL.x + 3, LABEL.y + 2.6 + i * 2.6], [LABEL.x + 3 + len, LABEL.y + 2.6 + i * 2.6], 0.9, P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(D([at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.9])], { size: 0.45 }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of [-12, 0]) {
    out.push(S(k.slabOf({ x: RAIL.x0, y, w: RAIL.x1 - RAIL.x0, d: 4, r: 1 }, RAIL.z0, RAIL.z1 - RAIL.z0, P, 3, 0.4), { tone: "mid" }));
    out.push(D([-116, -52, 12, 75].map((x) => at([x, y + 1.4, RAIL.z1])), { size: 0.4 }));
  }
  for (const x of SLEEPER_X) {
    out.push(S(k.slabOf({ x, y: -14, w: 6, d: 18, r: 1 }, 0, RAIL.z0, P, 3), { tone: "lo" }));
    out.push(D([at([x + 1.6, -12.6, RAIL.z0]), at([x + 1.6, 1.4, RAIL.z0])], { size: 0.4 }));
  }
  out.push(S(k.slabOf({ x: RAIL.x1 - 3, y: -14, w: 5, d: 20, r: 1 }, 0, RAIL.z1, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([RAIL.x1 + 0.2, -11.4, RAIL.z1]), at([RAIL.x1 + 0.2, 1.6, RAIL.z1])], { size: 0.45 }));
  return out.join("");
}

function tray() {
  const out = [];
  out.push(S(k.slabOf(TRAY, 0, 6.8, P, 6, 1), { tone: "lo" }));
  const walls = [
    { x: TRAY.x, y: 4, w: TRAY.w, d: 4, r: 1.2 },
    { x: TRAY.x, y: TRAY.y, w: 5, d: TRAY.d, r: 1.2 },
    { x: TRAY.x, y: TRAY.y, w: 9, d: 5, r: 1.2 },
  ];
  for (const wall of walls) out.push(S(k.slabOf(wall, 6.8, TRAY_WALL_H, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(TRAY, 3), 6.8, P, 6), { tone: "faint" }));
  out.push(D([
    at([TRAY.x + 4, TRAY.y + 4, 6.8]),
    at([TRAY.x + TRAY.w - 4, TRAY.y + 4.6, 6.8]),
    at([TRAY.x + TRAY.w - 5, TRAY.y + TRAY.d - 3, 6.8]),
  ], { size: 0.5 }));
  return out.join("");
}

function die() {
  const out = [];
  out.push(S(k.slabOf({ x: -94, y: -37, w: 11, d: 10, r: 1.5 }, 0, BEAM_Z0, P, 4, 0.8), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -56, y: 10, w: 11, d: 10, r: 1.5 }, 0, BEAM_Z0, P, 4, 0.8), { tone: "lo" }));
  out.push(L(k.sideSeam({ x: -94, y: -37, w: 11, d: 10, r: 1.5 }, 15, P, 4), { tone: "faint" }));
  out.push(L(k.sideSeam({ x: -56, y: 10, w: 11, d: 10, r: 1.5 }, 15, P, 4), { tone: "faint" }));
  return out.join("");
}

function dieBeam() {
  const out = [];
  out.push(S(k.slabOf(BEAM, BEAM_Z0, BEAM_Z1 - BEAM_Z0, P, 8, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BEAM, 4), BEAM_Z1, P, 8), { tone: "faint" }));
  out.push(D([
    at([BEAM.x + 5, BEAM.y + 5, BEAM_Z1]),
    at([BEAM.x + BEAM.w - 5, BEAM.y + BEAM.d - 5, BEAM_Z1]),
  ], { size: 0.5 }));
  return out.join("");
}

const rodSvg = (x) => {
  const out = [];
  out.push(S(k.cylinder(x, -3, 2.2, BEAM_Z0, ROD_COLLAR_Z0 - BEAM_Z0, P, 24), { tone: "hi", crease: "none" }));
  out.push(S(k.cylinder(x, -3, 3.8, ROD_COLLAR_Z0, ROD_TOP - ROD_COLLAR_Z0, P, 28), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, -3, 3.8, ROD_COLLAR_Z0, ROD_TOP, 20, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(x, -3, 2.2, BEAM_Z0, P, 20), { tone: "lo" }));
  return out.join("");
};

const bootSvg = (x) => {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const z = 19.9 + i * 0.9;
    out.push(S(k.cylinder(x, -3, 3.2, z, 0.55, P, 20), { tone: "mid", crease: "none" }));
  }
  return out.join("");
};

function tower(x) {
  const plan = { x: x - 5.5, y: -8, w: 11, d: 10, r: 1.6 };
  const out = [];
  out.push(S(k.slabOf(plan, BEAM_Z1, TOWER_Z1 - BEAM_Z1, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 1.6), TOWER_Z1, P, 4), { tone: "faint" }));
  out.push(D([at([x - 2.6, -7, TOWER_Z1]), at([x + 2.6, -7, TOWER_Z1])], { size: 0.45 }));
  return out.join("");
}

function pinHouse() {
  const out = [];
  out.push(S(k.cylinder(PIN.x, PIN.y, 4.4, 0, 2.4, P, 28), { tone: "lo" }));
  out.push(S(k.cylinder(PIN.x, PIN.y, 3.4, 2.4, 6.2, P, 28), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(PIN.x, PIN.y, 3.4, 6.2, P, 28), { tone: "lo" }));
  out.push(L(k.ring(PIN.x, PIN.y, 2.2, 6.2, P, 20), { tone: "hi" }));
  return out.join("");
}

function pinSvg() {
  const out = [];
  out.push(S(k.cylinder(PIN.x, PIN.y, 2.2, 6.2, 4.2, P, 22), { tone: "hi", crease: "none" }));
  out.push(L(k.ring(PIN.x, PIN.y, 2.2, PIN_TOP, P, 18), { tone: "hi" }));
  out.push(D([at([PIN.x, PIN.y, PIN_TOP])], { size: 0.5, tone: "hi" }));
  return out.join("");
}

function rejectTray() {
  const out = [];
  const walls = [
    { x: JUNK.x, y: JUNK.y, w: JUNK.w, d: 4, r: 1 },
    { x: JUNK.x + JUNK.w - 4, y: JUNK.y + 4, w: 4, d: JUNK.d - 4, r: 1 },
  ];
  for (const wall of walls) out.push(S(k.slabOf(wall, 0, JUNK_WALL_H, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(JUNK, 0, P, 6), { tone: "faint" }));
  out.push(D([at([JUNK.x + 4, JUNK.y + 4, 0]), at([JUNK.x + JUNK.w - 6, JUNK.y + 4.4, 0])], { size: 0.45 }));
  return out.join("");
}

function junkFront() {
  return S(k.slabOf({ x: JUNK.x, y: JUNK.y + JUNK.d - 4, w: 34, d: 4, r: 1 }, 0, JUNK_WALL_H, P, 4, 0.6), { tone: "mid" });
}

function erpTray() {
  const out = [];
  out.push(S(k.slabOf(ERP, 0, 6.8, P, 6, 1), { tone: "lo" }));
  const walls = [
    { x: ERP.x, y: ERP.y, w: 4, d: ERP.d, r: 1 },
    { x: ERP.x, y: ERP.y, w: ERP.w, d: 4, r: 1 },
    { x: ERP.x, y: ERP.y + ERP.d - 4, w: ERP.w, d: 4, r: 1 },
  ];
  for (const wall of walls) out.push(S(k.slabOf(wall, 6.8, ERP_WALL_H, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(ERP, 3), 6.8, P, 6), { tone: "faint" }));
  out.push(D([
    at([ERP.x + 6.5, ERP.y + 6.5, 6.8]),
    at([ERP.x + ERP.w - 6.5, ERP.y + 6.5, 6.8]),
  ], { size: 0.5 }));
  const card = { x: -126, y: 31, w: 22, d: 12, r: 2 };
  out.push(S(k.slabOf(card, 6.8, 2.6, P, 4, 0.8), { tone: "hi" }));
  out.push(L(k.planOutline(k.insetPlan(card, 2), 9.4, P, 4), { tone: "faint" }));
  const teeth = [
    { off: -7, h: 4.4 },
    { off: 0, h: 6.2 },
    { off: 7, h: 3.8 },
  ];
  for (const tooth of teeth) {
    const plan = { x: -115 + tooth.off - 1.7, y: 33, w: 3.4, d: 4, r: 0.8 };
    out.push(S(k.slabOf(plan, 9.4, tooth.h, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  }
  return out.join("");
}

function tablet() {
  const out = [];
  out.push(S(k.slabOf(TABLET, 0, TABLET_H, P, 6, 1), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(TABLET, 2.4), TABLET_H, P, 6), { tone: "faint" }));
  out.push(
    L(
      [
        [ODO_X[0] - 7, ODO_X[0] + 7],
        [ODO_X[1] - 7, ODO_X[1] + 7],
        [ODO_X[2] - 7, ODO_X[2] + 7],
      ]
        .map(([x0, x1]) => k.lineOnTop([x0, TABLET.y + TABLET.d - 1], [x1, TABLET.y + TABLET.d - 1], TABLET_H, P))
        .join(""),
      { tone: "lo" },
    ),
  );
  return out.join("");
}

const SHOE = { x: -13, y: -16, w: 22, d: 24, r: 2 };
const CARD = { x: -11, y: -15, w: 22, d: 18, r: 2 };
const CARD_TEETH = [
  { off: 7, h: 4.4 },
  { off: 0, h: 6.2 },
  { off: -7, h: 3.8 },
];

function shoe() {
  const out = [];
  out.push(S(k.slabOf(SHOE, 6.8, 2.6, P, 5, 0.8), { tone: "mid" }));
  out.push(D([-8, -4, 2, 8].map((x) => at([x, SHOE.y + SHOE.d - 1.4, 9.4])), { size: 0.4 }));
  out.push(L(k.lineOnTop([SHOE.x + 1, 14], [SHOE.x + SHOE.w - 1, 14], 9.4, P), { tone: "faint" }));
  const stub = { x: 4.2, y: 8, w: 4.4, d: 4, r: 1 };
  out.push(S(k.slabOf(stub, 6.8, 2.4, P, 3), { tone: "mid" }));
  out.push(S(k.cylinder(6.4, 10.2, 2.2, 9.2, 4.4, P, 22), { tone: "mid" }));
  out.push(L(k.knurl(6.4, 10.2, 2.2, 9.2, 13.6, 18, P), { tone: "lo" }));
  return out.join("");
}

function card() {
  const out = [];
  out.push(S(k.slabOf(CARD, MEDIA_Z, 2.6, P, 4, 0.8), { tone: "hi" }));
  out.push(L(k.planOutline(k.insetPlan(CARD, 2), MEDIA_Z + 2.6, P, 4), { tone: "faint" }));
  for (const tooth of CARD_TEETH) {
    const plan = { x: tooth.off - 1.7, y: -5, w: 3.4, d: 4, r: 0.8 };
    out.push(S(k.slabOf(plan, MEDIA_Z + 2.6, tooth.h, P, 3, 0.5), { tone: "hi", lit: true, crease: "lo" }));
  }
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A bench adapter for record exchange: a source tray with a waiting card, two guide rails, a raised die with three slots and spring pins that ride the card's teeth, a release pin at a reject cassette, a receiver tray with a shifted tooth layout, and three counter drums on a tablet. The card slides from the tray, the pins read and rewrite the fields, a duplicate is caught and dropped into the reject tray, and the counters step.",
  body: [
    plate(),
    rails(),
    tray(),
    die(),
    rejectTray(),
    erpTray(),
    tablet(),
    ROD_X.map((x) => `<g data-rod="${ROD_X.indexOf(x)}" transform="${k.translateAlong(P, [0, 0, 0])}">${rodSvg(x)}</g>`).join(""),
    ROD_X.map((x) => bootSvg(x)).join(""),
    dieBeam(),
    ROD_X.map((x) => tower(x)).join(""),
    `<g data-part="pin" transform="${k.translateAlong(P, [0, 0, -4.2])}">${pinSvg()}</g>`,
    pinHouse(),
    ODO_X.map((x, index) => {
      const odo = [];
      odo.push(S(k.cylinder(x, ODO_Y, 7.2, TABLET_H, 1.6, P, 28), { tone: "mid" }));
      odo.push(S(k.cylinder(x, ODO_Y, 2.4, TABLET_H + 1.6, 2, P, 20), { tone: "mid", crease: "none" }));
      odo.push(S(k.cylinder(x, ODO_Y, 5.6, TABLET_H + 3.6, 12, P, 40), { tone: "mid", crease: "lo" }));
      odo.push(`<g data-odo-lines="${index}"></g>`);
      odo.push(L(k.ring(x, ODO_Y, 5.6, TABLET_H + 15.6, P, 40), { tone: "lo" }));
      odo.push(L(k.ring(x, ODO_Y, 7.2, TABLET_H + 1.6, P, 28), { tone: "lo" }));
      const face = TABLET.y + TABLET.d;
      odo.push(
        L(
          [3.2, 4.4, 5.6, 6.8]
            .map((z) => [x - 9, x + 9, z])
            .map(([x0, x1, z]) => k.segment([x0, face, z], [x1, face, z], P))
            .join(""),
          { tone: "faint" },
        ),
      );
      odo.push(`<g data-odo-count="${index}">${k.faceTextSvg(k.sideMatrix([x + 11, face], TABLET_H - 1.6, P, "left"), String(ODO_INIT[index]), { size: 4.6, tone: "hi", anchor: "middle" })}</g>`);
      odo.push(k.faceTextSvg(k.sideMatrix([x + 11, face], 1.6, P, "left"), ODO_LABELS[index], { size: 2.6, tone: "mid", anchor: "middle" }));
      return odo.join("");
    }).join(""),
    `<g data-part="shoe" transform="${k.translateAlong(P, [SHOE_X[0], 0, 0])}">${shoe()}</g>`,
    `<g data-part="card" transform="${k.translateAlong(P, [CARD_X[0], 0, 0])}">${card()}</g>`,
    junkFront(),
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const STOPS = ${JSON.stringify(SHOE_X)};
const CARD_STOPS = ${JSON.stringify(CARD_X)};
const ROD_X = ${JSON.stringify(ROD_X)};
const OFF = ${JSON.stringify(OFF)};
const TOOTH = ${JSON.stringify(TOOTH)};
const BEAM = ${JSON.stringify(BEAM_Z0)};
const MEDIA = ${JSON.stringify(MEDIA_Z)};
const PIN_LIFT = ${JSON.stringify(PIN_TOP - 6.2)};
const ODO_X = ${JSON.stringify(ODO_X)};
const ODO_Y = ${JSON.stringify(ODO_Y)};
const ODO_TOP = ${JSON.stringify(TABLET_H + 15.6)};
const ODO_BASE = ${JSON.stringify(ODO_INIT)};
const STEP_LABELS = ${JSON.stringify(STEPS.map((step) => step.label))};
const STEP_SHORTS = ${JSON.stringify(STEPS.map((step) => step.short))};
const STEP_READOUTS = ${JSON.stringify(STEPS.map((step) => step.readout))};
const N = STOPS.length;
const RAD = Math.PI / 180;

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const shoe = svg.querySelector('[data-part="shoe"]');
const card = svg.querySelector('[data-part="card"]');
const pin = svg.querySelector('[data-part="pin"]');
const rods = Array.from(svg.querySelectorAll("[data-rod]"));
const odoLines = ODO_X.map((_, i) => svg.querySelector('[data-odo-lines="' + i + '"]'));
const odoCounts = ODO_X.map((_, i) => svg.querySelector('[data-odo-count="' + i + '"]'));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const ease = (cur, target, tau, dt) => {
  const next = cur + (target - cur) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 0.008 ? target : next;
};
const cardZ = (cx) => (cx < 78 ? MEDIA : cx < 90 ? MEDIA * (1 - (cx - 78) / 12) : 0);
const rodWant = (cx) => {
  const want = ROD_X.map(() => 0);
  for (const key of Object.keys(OFF)) {
    const wx = cx + OFF[key];
    ROD_X.forEach((rx, i) => {
      if (Math.abs(wx - rx) < 2) want[i] = Math.max(want[i], BEAM - (MEDIA + 2.6 + TOOTH[key]));
    });
  }
  return want;
};
const drumMarks = (i, deg) => {
  const cx = ODO_X[i];
  let out = "";
  for (let m = 0; m < 3; m++) {
    const a = (deg + m * 120) * RAD;
    out += lineOnTop(
      [cx + Math.cos(a) * 3.1, ODO_Y + Math.sin(a) * 3.1],
      [cx + Math.cos(a) * 4.7, ODO_Y + Math.sin(a) * 4.7],
      ODO_TOP + 0.2,
      P,
    );
  }
  return out;
};

let step = 0;
let shoeX = STOPS[0], shoeTarget = STOPS[0];
let cardX = CARD_STOPS[0], cardTarget = CARD_STOPS[0];
let lift = 0, liftTarget = 0;
let rodDrop = ROD_X.map(() => 0), rodLit = ROD_X.map(() => false), rodWantNow = ROD_X.map(() => 0);
let counts = ODO_BASE.slice(), countShown = ODO_BASE.slice();
let queue = [];
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
const tourAt = (t) => Math.floor(t / 2.6) % N;

function plan(to) {
  const from = step;
  const fwd = CARD_STOPS[to] > CARD_STOPS[from];
  step = to;
  const acts = [];
  if (to === 3 && from !== 3) acts.push({ kind: "slide", fwd }, { kind: "pin", on: true, fwd });
  else if (to === 4 && from === 3) acts.push({ kind: "pin", on: false }, { kind: "slide", fwd });
  else acts.push({ kind: "pin", on: false }, { kind: "slide", fwd });
  queue = acts;
}
function bump(done) {
  if (done.kind === "slide" && done.fwd) {
    if (step === 1) counts[0] += 1;
    else if (step === 2) { counts[0] += 1; counts[1] += 1; }
    else if (step === 3) counts[0] += 1;
    else if (step === 4) counts = ODO_BASE.slice();
  }
  if (done.kind === "pin" && done.on && done.fwd) counts[2] += 1;
}
function draw(dt) {
  const calm = still.matches;
  shoe.setAttribute("transform", translateAlong(P, [shoeX, 0, 0]));
  card.setAttribute("transform", translateAlong(P, [cardX, 0, cardZ(cardX) - MEDIA]));
  pin.setAttribute("transform", translateAlong(P, [0, 0, lift - PIN_LIFT]));
  const want = rodWant(cardX);
  for (let i = 0; i < ROD_X.length; i++) {
    rodDrop[i] = calm ? want[i] : ease(rodDrop[i], want[i], 0.08, dt);
    rods[i].setAttribute("transform", translateAlong(P, [0, 0, rodDrop[i]]));
    const on = rodDrop[i] > 0.05;
    if (on !== rodLit[i]) {
      rodLit[i] = on;
      rods[i].querySelectorAll(".iso-solid").forEach((solid) => (on ? solid.setAttribute("data-lit", "") : solid.removeAttribute("data-lit")));
    }
  }
  rodWantNow = want;
  for (let i = 0; i < ODO_X.length; i++) {
    const lines = drumMarks(i, (countShown[i] - ODO_BASE[i]) * 36);
    if (odoLines[i].dataset.d !== lines) { odoLines[i].innerHTML = lines; odoLines[i].dataset.d = lines; }
    const text = String(Math.round(countShown[i]));
    if (odoCounts[i].textContent !== text) odoCounts[i].textContent = text;
  }
  const busy = queue.length > 0;
  const text = busy ? "идёт обмен · " + STEP_SHORTS[step] : STEP_READOUTS[step];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(step));
  stage.setAttribute("aria-valuetext", "шаг " + (step + 1) + " из " + N + ": " + STEP_LABELS[step] + ", " + STEP_READOUTS[step]);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    const want = tourAt(clock);
    if (want !== step) plan(want);
  }
  if (queue.length) {
    const act = queue[0];
    if (act.kind === "slide") {
      if (!act.run) { act.run = true; shoeTarget = STOPS[step]; cardTarget = CARD_STOPS[step]; }
      if (shoeX === shoeTarget && cardX === cardTarget) { bump(act); queue.shift(); }
    } else {
      if (!act.run) { act.run = true; liftTarget = act.on ? PIN_LIFT : 0; }
      if (lift === liftTarget) { bump(act); queue.shift(); }
    }
  }
  shoeX = calm ? shoeTarget : ease(shoeX, shoeTarget, 0.26, dt);
  cardX = calm ? cardTarget : ease(cardX, cardTarget, 0.26, dt);
  lift = calm ? liftTarget : ease(lift, liftTarget, 0.13, dt);
  for (let i = 0; i < ODO_X.length; i++) countShown[i] = calm ? counts[i] : ease(countShown[i], counts[i], 0.24, dt);
  draw(dt);
  const quiet = !touring && !queue.length
    && shoeX === shoeTarget && cardX === cardTarget && lift === liftTarget
    && rodDrop.every((value, i) => value === rodWantNow[i])
    && ODO_X.every((_, i) => countShown[i] === counts[i]);
  frame = visible && !quiet ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (to) => {
  touring = false;
  plan(clamp(to, 0, N - 1));
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.15) / 0.7, 0, 1);
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
draw(1 / 60);
`;

const css = `<style>
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.iso-plate-corner[data-corner="readout"]{bottom:16px}
@media (max-width:560px){
.iso-plate{padding-bottom:78px}
.iso-plate-corner[data-corner="readout"]{font-size:9px;bottom:34px}
.iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px}
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
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: стрелки ведут запись через адаптер" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0">${svg}</div>`,
});

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}
