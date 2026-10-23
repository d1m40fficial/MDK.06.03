import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, STEPS } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 640;
const HEIGHT = 452;

// Верстак: плита на ножках, рельс с картой, портальная рама с тремя штампами,
// лотки источника, приёмника и брака, ловушка повтора и полка с одометрами.

const PLATE = { x: -150, y: -72, w: 300, d: 144, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

const RAIL = { x0: -128, x1: 98, z0: 4, z1: 7 };
const SLEEPER_X = [-118, -90, -62, -34, -6, 22, 50, 78, 94];
const CARD_STOPS = [-124, -84, -54, -24, 72, 72];
const CARD_YS = [0, 0, 0, 0, -15, -15];
const DUP_X = [-124, -124, -124, -124, 72, 72];
const DUP_Y = [4, 4, 4, 4, 29, 29];
const DUP_Z = [2.2, 2.2, 2.2, 2.2, 0, 0];
const MEDIA_Z = 9.4;

const SOURCE = { x: -148, y: -24, w: 40, d: 48, r: 2.4 };
const OUTPUT = { x: 52, y: -30, w: 48, d: 28, r: 2.4 };
const REJECT = { x: 52, y: 16, w: 48, d: 28, r: 2.4 };
const TRAY_WALL_H = 5.2;

const BEAM = { x: -112, y: -10, w: 112, d: 20, r: 3 };
const CROSSHEADS = [
  { x: -120, y: -30, w: 20, d: 60, r: 3 },
  { x: -4, y: -30, w: 20, d: 60, r: 3 },
];
const BEAM_Z0 = 52;
const BEAM_Z1 = 58;
const COLUMNS = [
  { x: -118, y: -30, w: 12, d: 10, r: 2 },
  { x: -118, y: 20, w: 12, d: 10, r: 2 },
  { x: 2, y: -30, w: 12, d: 10, r: 2 },
  { x: 2, y: 20, w: 12, d: 10, r: 2 },
];
const GUIDE = { x: -96, y: -18, w: 84, d: 36, r: 3 };
const GUIDE_Z0 = 38;
const GUIDE_Z1 = 42;
const PUNCHES = [
  { x: -84, y: -7, key: "client", height: 3.4 },
  { x: -54, y: 0, key: "fio", height: 5.0 },
  { x: -24, y: 7, key: "sum", height: 4.2 },
];
const PUNCH_REST = 18;
const PUNCH_DOWN = 6;
const PUNCH_ROD_TOP = 52;

const CARD = { x: -15, y: -12, w: 30, d: 24, r: 2.4 };
const SHOE = { x: -18, y: -15, w: 36, d: 30, r: 3 };
const CARD_LANES = [
  { y: -7, key: "client", height: 3.4 },
  { y: 0, key: "fio", height: 5.0 },
  { y: 7, key: "sum", height: 4.2 },
];

const LEDGER = { x: 22, y: 8, w: 14, d: 14, r: 2 };
const GATE_REST = 26;
const GATE_DROP = 3;
const SHELF = { x: -52, y: 42, w: 116, d: 20, r: 3 };
const SHELF_H = 12;
const ODO_X = [-30, 0, 30];
const ODO_Y = 52;
const ODO_INIT = [100, 100, 0];
const ODO_TOP = SHELF_H + 15;
const DRUM_R = 6.0;

const LABEL = { x: -140, y: -62, w: 30, d: 10, r: 1.2 };
const RULE = { x: -24, y: -66, w: 152, d: 6, r: 1 };

const pts = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  ...k.boxCorners(BEAM, BEAM_Z0, BEAM_Z1),
  ...CROSSHEADS.flatMap((crosshead) => k.boxCorners(crosshead, BEAM_Z0, BEAM_Z1)),
  [PUNCHES[0].x, PUNCHES[0].y, PUNCH_ROD_TOP + 2],
  [PUNCHES[2].x, PUNCHES[2].y, PUNCH_ROD_TOP + 2],
  [SHELF.x, SHELF.y + SHELF.d, ODO_TOP + 2],
  [REJECT.x + REJECT.w, REJECT.y + REJECT.d, TRAY_WALL_H + 4],
  [LABEL.x, LABEL.y, 2],
];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 19, azimuth: 40, elevation: 30 });

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
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  out.push(S(k.slabOf(RULE, 0, 0.6, P, 3), { tone: "mid", crease: "none" }));
  const ticks = k.topTicks(RULE.x + 4, RULE.x + RULE.w - 4, 4, 5, RULE.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(S(k.slabOf(LABEL, 0, 0.9, P, 4), { tone: "mid", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.4), 0.9, P, 4), { tone: "lo" }));
  out.push(
    L(
      [18, 12, 7]
        .map((len, i) => k.lineOnTop([LABEL.x + 3, LABEL.y + 2.6 + i * 2.6], [LABEL.x + 3 + len, LABEL.y + 2.6 + i * 2.6], 0.9, P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(D([at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.9])], { size: 0.5 }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of [-10, 10]) {
    out.push(S(k.slabOf({ x: RAIL.x0, y, w: RAIL.x1 - RAIL.x0, d: 4, r: 1 }, RAIL.z0, RAIL.z1 - RAIL.z0, P, 3, 0.4), { tone: "mid" }));
    out.push(D([-118, -54, 12, 76].map((x) => at([x, y + 1.4, RAIL.z1])), { size: 0.42 }));
  }
  for (const x of SLEEPER_X) {
    out.push(S(k.slabOf({ x, y: -14, w: 6, d: 28, r: 1 }, 0, RAIL.z0, P, 3), { tone: "lo" }));
    out.push(D([at([x + 1.6, -12.6, RAIL.z0]), at([x + 1.6, 12.6, RAIL.z0])], { size: 0.4 }));
  }
  out.push(S(k.slabOf({ x: RAIL.x1 - 3, y: -14, w: 5, d: 28, r: 1 }, 0, RAIL.z1, P, 3, 0.5), { tone: "mid" }));
  return out.join("");
}

function tray(plan, wallH, className, sides) {
  const out = [];
  out.push(S(k.slabOf(plan, 0, 6.8, P, 6, 1), { tone: "lo" }));
  const walls = [];
  if (sides.includes("back")) walls.push({ x: plan.x, y: plan.y, w: plan.w, d: 4, r: 1.2 });
  if (sides.includes("front")) walls.push({ x: plan.x, y: plan.y + plan.d - 4, w: plan.w, d: 4, r: 1.2 });
  if (sides.includes("left")) walls.push({ x: plan.x, y: plan.y + 4, w: 4, d: plan.d - 8, r: 1.2 });
  if (sides.includes("right")) walls.push({ x: plan.x + plan.w - 4, y: plan.y + 4, w: 4, d: plan.d - 8, r: 1.2 });
  for (const wall of walls) out.push(S(k.slabOf(wall, 6.8, wallH, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 3), 6.8, P, 6), { tone: "faint" }));
  out.push(
    D(
      [
        at([plan.x + 5, plan.y + 5, 6.8]),
        at([plan.x + plan.w - 5, plan.y + 5, 6.8]),
        at([plan.x + plan.w - 5, plan.y + plan.d - 5, 6.8]),
      ],
      { size: 0.45 },
    ),
  );
  return `<g class="${className}">${out.join("")}</g>`;
}

function bridge() {
  const out = [];
  for (const column of COLUMNS) {
    out.push(S(k.slabOf({ x: column.x - 2, y: column.y - 2, w: column.w + 4, d: column.d + 4, r: 2 }, 0, 3, P, 4), { tone: "lo" }));
    out.push(S(k.slabOf(column, 3, BEAM_Z0 - 3, P, 4, 0.8), { tone: "mid" }));
    out.push(L(k.sideSeam(column, 3, P, 4), { tone: "faint" }));
    out.push(D([at([column.x + 3, column.y + 3, BEAM_Z0 - 4]), at([column.x + column.w - 3, column.y + 3, BEAM_Z0 - 4])], { size: 0.42 }));
  }
  for (const x of [-116, 0]) {
    out.push(S(k.slabOf({ x: x - 1.5, y: -30, w: 3, d: 60, r: 1.2 }, 33, 3, P, 3), { tone: "lo" }));
  }
  for (const crosshead of CROSSHEADS) {
    out.push(S(k.slabOf(crosshead, BEAM_Z0, BEAM_Z1 - BEAM_Z0, P, 6, 1), { tone: "hi", crease: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(crosshead, 3), BEAM_Z1, P, 6), { tone: "faint" }));
  }
  out.push(S(k.slabOf(BEAM, BEAM_Z0, BEAM_Z1 - BEAM_Z0, P, 8, 1.2), { tone: "hi", crease: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BEAM, 4), BEAM_Z1, P, 8), { tone: "faint" }));
  out.push(
    D(
      [
        at([BEAM.x + 5, BEAM.y + 5, BEAM_Z1]),
        at([BEAM.x + BEAM.w - 5, BEAM.y + 5, BEAM_Z1]),
        at([BEAM.x + BEAM.w - 5, BEAM.y + BEAM.d - 5, BEAM_Z1]),
        at([BEAM.x + 5, BEAM.y + BEAM.d - 5, BEAM_Z1]),
      ],
      { size: 0.5 },
    ),
  );
  for (const x of [-84, -54, -24]) {
    out.push(S(k.slabOf({ x: x - 5, y: -2, w: 10, d: 4, r: 1 }, BEAM_Z1, 1.8, P, 3), { tone: "lo" }));
  }
  return out.join("");
}

function guide() {
  const out = [];
  out.push(S(k.slabOf(GUIDE, GUIDE_Z0, GUIDE_Z1 - GUIDE_Z0, P, 6, 1), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(GUIDE, 3), GUIDE_Z1, P, 6), { tone: "faint" }));
  for (const punch of PUNCHES) {
    out.push(L(k.ring(punch.x, punch.y, 4.4, GUIDE_Z1, P, 20), { tone: "lo" }));
    out.push(D([at([punch.x, punch.y, GUIDE_Z1])], { size: 0.5 }));
  }
  for (const [x, y] of [
    [GUIDE.x + 4, GUIDE.y + 4],
    [GUIDE.x + GUIDE.w - 4, GUIDE.y + 4],
    [GUIDE.x + 4, GUIDE.y + GUIDE.d - 4],
    [GUIDE.x + GUIDE.w - 4, GUIDE.y + GUIDE.d - 4],
  ]) {
    out.push(S(k.cylinder(x, y, 1.2, GUIDE_Z1, BEAM_Z0 - GUIDE_Z1, P, 16), { tone: "lo" }));
  }
  return out.join("");
}

function sleeve(punch) {
  return [
    S(k.cylinder(punch.x, punch.y, 3.3, GUIDE_Z1, BEAM_Z0 - GUIDE_Z1, P, 24), { tone: "lo" }),
    L(k.ring(punch.x, punch.y, 3.3, GUIDE_Z1, P, 24), { tone: "mid" }),
    L(k.ring(punch.x, punch.y, 3.3, BEAM_Z0, P, 24), { tone: "mid" }),
  ].join("");
}

function ledger() {
  const out = [];
  out.push(S(k.slabOf(LEDGER, 0, 6, P, 4, 0.8), { tone: "lo" }));
  out.push(S(k.cylinder(LEDGER.x + LEDGER.w / 2, LEDGER.y + LEDGER.d / 2, 3.2, 6, 18, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(LEDGER.x + LEDGER.w / 2, LEDGER.y + LEDGER.d / 2, 7, 24, 10, P, 32), { tone: "mid", crease: "lo" }));
  out.push(L(k.knurl(LEDGER.x + LEDGER.w / 2, LEDGER.y + LEDGER.d / 2, 7, 24, 34, 18, P, 0.4), { tone: "lo" }));
  out.push(L(k.ring(LEDGER.x + LEDGER.w / 2, LEDGER.y + LEDGER.d / 2, 7, 34, P, 32), { tone: "hi" }));
  out.push(L(k.ring(LEDGER.x + LEDGER.w / 2, LEDGER.y + LEDGER.d / 2, 3.2, 24, P, 20), { tone: "lo" }));
  out.push(D([at([LEDGER.x + LEDGER.w / 2, LEDGER.y + LEDGER.d / 2, 35])], { size: 0.55 }));
  return out.join("");
}

function gate() {
  const out = [];
  out.push(S(k.slabOf({ x: LEDGER.x + 7, y: LEDGER.y + 5, w: 32, d: 4, r: 1 }, GATE_REST, 2.2, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: LEDGER.x + 35, y: LEDGER.y + 4, w: 4, d: 6, r: 1 }, GATE_REST - 2, 6, P, 3, 0.5), { tone: "hi" }));
  out.push(L(k.lineOnTop([LEDGER.x + 9, LEDGER.y + 7], [LEDGER.x + 35, LEDGER.y + 7], GATE_REST + 2.2, P), { tone: "faint", free: true }));
  return out.join("");
}

function shelf() {
  const out = [];
  out.push(S(k.slabOf(SHELF, 0, SHELF_H, P, 6, 1), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(SHELF, 3), SHELF_H, P, 6), { tone: "faint" }));
  const face = SHELF.y + SHELF.d;
  for (let i = 0; i < ODO_X.length; i++) {
    const x = ODO_X[i];
    out.push(S(k.cylinder(x, ODO_Y, 6.6, SHELF_H, 1.5, P, 28), { tone: "mid" }));
    out.push(S(k.cylinder(x, ODO_Y, 2.2, SHELF_H + 1.5, 2.2, P, 20), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, ODO_Y, DRUM_R, SHELF_H + 3.7, 11.3, P, 40), { tone: "mid", crease: "lo" }));
    out.push(`<g data-odo-lines="${i}"></g>`);
    out.push(L(k.ring(x, ODO_Y, DRUM_R, ODO_TOP, P, 40), { tone: "hi" }));
    out.push(L(k.ring(x, ODO_Y, 6.6, SHELF_H + 1.5, P, 28), { tone: "lo" }));
    out.push(
      L(
        [3.2, 4.4, 5.6, 6.8]
          .map((z) => [x - 9, x + 9, z])
          .map(([x0, x1, z]) => k.segment([x0, face, z], [x1, face, z], P))
          .join(""),
        { tone: "faint", free: true },
      ),
    );
    out.push(
      `<g data-odo-count="${i}">${k.faceTextSvg(k.sideMatrix([x, face], 7.4, P, "left"), String(ODO_INIT[i]), {
        size: 5.6,
        tone: "hi",
        anchor: "middle",
      })}</g>`,
    );
  }
  return out.join("");
}

function shoe() {
  const out = [];
  out.push(S(k.slabOf(SHOE, 6.8, 2.6, P, 5, 0.8), { tone: "mid" }));
  out.push(D([-11, -4, 4, 11].map((x) => at([x, SHOE.y + SHOE.d - 1.4, 9.4])), { size: 0.42 }));
  out.push(L(k.lineOnTop([SHOE.x + 1, 14], [SHOE.x + SHOE.w - 1, 14], 9.4, P), { tone: "faint" }));
  const stub = { x: 5, y: 8, w: 5, d: 5, r: 1 };
  out.push(S(k.slabOf(stub, 6.8, 2.4, P, 3), { tone: "mid" }));
  out.push(S(k.cylinder(7.5, 10.5, 2.3, 9.2, 4.4, P, 22), { tone: "mid" }));
  out.push(L(k.knurl(7.5, 10.5, 2.3, 9.2, 13.6, 18, P), { tone: "lo" }));
  return out.join("");
}

function card(kind) {
  const duplicate = kind === "duplicate";
  const out = [];
  out.push(S(k.slabOf(CARD, MEDIA_Z, 2.6, P, 5, 0.8), { tone: duplicate ? "mid" : "hi", className: duplicate ? "dup-base" : "card-base" }));
  out.push(L(k.planOutline(k.insetPlan(CARD, 2), MEDIA_Z + 2.6, P, 5), { tone: "faint" }));
  out.push(D([at([CARD.x + 3, CARD.y + 3, MEDIA_Z + 2.6]), at([CARD.x + CARD.w - 3, CARD.y + 3, MEDIA_Z + 2.6])], { size: 0.42 }));
  for (let i = 0; i < CARD_LANES.length; i++) {
    const lane = CARD_LANES[i];
    const strip = { x: CARD.x + 3, y: lane.y - 1.6, w: CARD.w - 6, d: 3.2, r: 0.8 };
    out.push(S(k.slabOf(strip, MEDIA_Z + 2.6, lane.height, P, 3, 0.5), { tone: duplicate ? "mid" : "hi", crease: "lo" }));
    out.push(L(k.ring(0, lane.y, 2.0, MEDIA_Z + 2.6 + lane.height, P, 16), { tone: "lo" }));
    out.push(
      `<g data-stud="${i}" style="opacity:0">${S(k.cylinder(0, lane.y, 1.8, MEDIA_Z + 2.6 + lane.height, 1.2, P, 18), {
        tone: "hi",
        className: `stud-${lane.key}`,
      })}</g>`,
    );
  }
  out.push(S(k.slabOf({ x: CARD.x + CARD.w - 4, y: CARD.y + 2, w: 2, d: 4, r: 0.6 }, MEDIA_Z + 2.6, 2.8, P, 3), { tone: "mid" }));
  return out.join("");
}

function punch(punch, index) {
  const out = [];
  out.push(S(k.cylinder(punch.x, punch.y, 2.2, PUNCH_REST, PUNCH_ROD_TOP - PUNCH_REST, P, 20), { tone: "hi", crease: "none" }));
  for (let z = 27; z <= 35; z += 1) {
    out.push(L(k.ring(punch.x, punch.y, 3.4, z, P, 18), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: punch.x - 5, y: punch.y - 5, w: 10, d: 10, r: 2 }, PUNCH_REST, 5, P, 4, 0.8), { tone: "hi" }));
  out.push(
    S(k.slabOf({ x: punch.x - 3.6, y: punch.y - 3.6, w: 7.2, d: 7.2, r: 1.2 }, PUNCH_REST + 5, 2.4, P, 3, 0.5), {
      tone: "hi",
      className: `punch-${punch.key}`,
    }),
  );
  out.push(L(k.ring(punch.x, punch.y, 2.2, PUNCH_REST, P, 18), { tone: "lo" }));
  out.push(D([at([punch.x, punch.y, PUNCH_REST + 7.4])], { size: 0.48 }));
  return `<g data-punch="${index}" transform="${k.translateAlong(P, [0, 0, 0])}">${out.join("")}</g>`;
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A portal-frame translation machine on a bench. A card with three field lanes sits on a rail between a CRM source tray and an ERP output tray. Three spring punches hang from a bridge above the rail, one for client_id, one for fio and one for sum. A ratchet gate beside a reject tray catches a duplicate card. A front shelf holds three odometers for sent, accepted and rejected records.",
  body: [
    plate(),
    rails(),
    tray(SOURCE, TRAY_WALL_H, "zone-src", ["back", "front", "left"]),
    tray(OUTPUT, TRAY_WALL_H, "zone-dst", ["back", "front", "right"]),
    tray(REJECT, TRAY_WALL_H, "zone-bad", ["back", "front", "right"]),
    bridge(),
    guide(),
    ledger(),
    shelf(),
    `<g data-part="shoe" transform="${k.translateAlong(P, [CARD_STOPS[0], CARD_YS[0], 0])}">${shoe()}</g>`,
    `<g data-part="card" class="card-src" transform="${k.translateAlong(P, [CARD_STOPS[0], CARD_YS[0], 0])}">${card("original")}</g>`,
    `<g data-part="duplicate" class="card-bad" transform="${k.translateAlong(P, [DUP_X[0], DUP_Y[0], DUP_Z[0]])}">${card("duplicate")}</g>`,
    PUNCHES.map((punchAt, index) => punch(punchAt, index)).join(""),
    PUNCHES.map((punchAt) => sleeve(punchAt)).join(""),
    `<g data-part="gate" transform="${k.translateAlong(P, [0, 0, 0])}">${gate()}</g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const CARD_STOPS = ${JSON.stringify(CARD_STOPS)};
const CARD_YS = ${JSON.stringify(CARD_YS)};
const DUP_X = ${JSON.stringify(DUP_X)};
const DUP_Y = ${JSON.stringify(DUP_Y)};
const DUP_Z = ${JSON.stringify(DUP_Z)};
const ODO_X = ${JSON.stringify(ODO_X)};
const ODO_Y = ${JSON.stringify(ODO_Y)};
const ODO_TOP = ${JSON.stringify(ODO_TOP)};
const ODO_BASE = ${JSON.stringify(ODO_INIT)};
const PUNCH_DOWN = ${JSON.stringify(PUNCH_DOWN)};
const GATE_DROP = ${JSON.stringify(GATE_DROP)};
const STEP_LABELS = ${JSON.stringify(STEPS.map((step) => step.label))};
const STEP_SHORTS = ${JSON.stringify(STEPS.map((step) => step.short))};
const STEP_READOUTS = ${JSON.stringify(STEPS.map((step) => step.readout))};
const N = CARD_STOPS.length;
const RAD = Math.PI / 180;

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const shoe = svg.querySelector('[data-part="shoe"]');
const card = svg.querySelector('[data-part="card"]');
const duplicate = svg.querySelector('[data-part="duplicate"]');
const punches = Array.from(svg.querySelectorAll("[data-punch]"));
const gate = svg.querySelector('[data-part="gate"]');
const cardStuds = Array.from(card.querySelectorAll("[data-stud]"));
const duplicateStuds = Array.from(duplicate.querySelectorAll("[data-stud]"));
const odoLines = ODO_X.map((_, i) => svg.querySelector('[data-odo-lines="' + i + '"]'));
const odoCounts = ODO_X.map((_, i) => svg.querySelector('[data-odo-count="' + i + '"]'));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const near = (a, b) => Math.abs(a - b) < 0.03;
const ease = (cur, target, tau, dt) => {
  const next = cur + (target - cur) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 0.008 ? target : next;
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
let cardX = CARD_STOPS[0], cardTargetX = CARD_STOPS[0];
let cardY = CARD_YS[0], cardTargetY = CARD_YS[0];
let dupX = DUP_X[0], dupTargetX = DUP_X[0];
let dupY = DUP_Y[0], dupTargetY = DUP_Y[0];
let dupZ = DUP_Z[0], dupTargetZ = DUP_Z[0];
let punchDrop = [0, 0, 0], punchTarget = [0, 0, 0];
let gateDrop = 0, gateTarget = 0;
let counts = ODO_BASE.slice(), countShown = ODO_BASE.slice();
let queue = [];
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
const tourAt = (t) => Math.floor(t / 3.6) % N;

function plan(to) {
  step = to;
  const acts = [];
  if (punchDrop.some((value) => value > 0.01)) acts.push({ kind: "lift" });
  acts.push({ kind: "slide" });
  if (to >= 1 && to <= 3) acts.push({ kind: "press", index: to - 1 });
  acts.push({ kind: "gate", on: to >= 4 });
  queue = acts;
}

function bump(done) {
  if (done.kind === "slide") {
    counts = step >= 4 ? [101, 100, 1] : ODO_BASE.slice();
  }
}

function draw(dt) {
  const calm = still.matches;
  shoe.setAttribute("transform", translateAlong(P, [cardX, cardY, 0]));
  card.setAttribute("transform", translateAlong(P, [cardX, cardY, 0]));
  duplicate.setAttribute("transform", translateAlong(P, [dupX, dupY, dupZ]));
  duplicate.style.opacity = step >= 4 ? "1" : ".45";
  card.classList.toggle("card-src", step < 4);
  card.classList.toggle("card-dst", step >= 4);
  for (let i = 0; i < punches.length; i++) {
    punches[i].setAttribute("transform", translateAlong(P, [0, 0, -punchDrop[i]]));
    punches[i].classList.toggle("is-down", punchDrop[i] > 1);
  }
  gate.setAttribute("transform", translateAlong(P, [0, 0, gateDrop]));
  cardStuds.forEach((stud, i) => {
    stud.style.opacity = String(step > i ? 1 : 0);
  });
  duplicateStuds.forEach((stud) => {
    stud.style.opacity = String(step >= 4 ? 1 : 0);
  });
  for (let i = 0; i < ODO_X.length; i++) {
    const lines = drumMarks(i, (countShown[i] - ODO_BASE[i]) * 36);
    if (odoLines[i].dataset.d !== lines) {
      odoLines[i].innerHTML = lines;
      odoLines[i].dataset.d = lines;
    }
    const text = String(Math.round(countShown[i]));
    const node = odoCounts[i].querySelector("text");
    if (node && node.textContent !== text) node.textContent = text;
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
      if (!act.run) {
        act.run = true;
        cardTargetX = CARD_STOPS[step];
        cardTargetY = CARD_YS[step];
        dupTargetX = DUP_X[step];
        dupTargetY = DUP_Y[step];
        dupTargetZ = DUP_Z[step];
      }
      if (near(cardX, cardTargetX) && near(cardY, cardTargetY) && near(dupX, dupTargetX) && near(dupY, dupTargetY) && near(dupZ, dupTargetZ)) {
        bump(act);
        queue.shift();
      }
    } else if (act.kind === "press") {
      if (!act.run) {
        act.run = true;
        punchTarget = [0, 0, 0];
        punchTarget[act.index] = PUNCH_DOWN;
      }
      if (near(punchDrop[act.index], punchTarget[act.index])) queue.shift();
    } else if (act.kind === "lift") {
      if (!act.run) {
        act.run = true;
        punchTarget = [0, 0, 0];
      }
      if (punchDrop.every((value, i) => near(value, punchTarget[i]))) queue.shift();
    } else if (act.kind === "gate") {
      if (!act.run) {
        act.run = true;
        gateTarget = act.on ? -GATE_DROP : 0;
      }
      if (near(gateDrop, gateTarget)) queue.shift();
    }
  }
  cardX = calm ? cardTargetX : ease(cardX, cardTargetX, 0.24, dt);
  cardY = calm ? cardTargetY : ease(cardY, cardTargetY, 0.24, dt);
  dupX = calm ? dupTargetX : ease(dupX, dupTargetX, 0.24, dt);
  dupY = calm ? dupTargetY : ease(dupY, dupTargetY, 0.24, dt);
  dupZ = calm ? dupTargetZ : ease(dupZ, dupTargetZ, 0.24, dt);
  for (let i = 0; i < punchDrop.length; i++) punchDrop[i] = calm ? punchTarget[i] : ease(punchDrop[i], punchTarget[i], 0.18, dt);
  gateDrop = calm ? gateTarget : ease(gateDrop, gateTarget, 0.18, dt);
  for (let i = 0; i < ODO_X.length; i++) countShown[i] = calm ? counts[i] : ease(countShown[i], counts[i], 0.3, dt);
  draw(dt);
  const quiet =
    !touring &&
    !queue.length &&
    near(cardX, cardTargetX) &&
    near(cardY, cardTargetY) &&
    near(dupX, dupTargetX) &&
    near(dupY, dupTargetY) &&
    near(dupZ, dupTargetZ) &&
    punchDrop.every((value, i) => near(value, punchTarget[i])) &&
    near(gateDrop, gateTarget) &&
    ODO_X.every((_, i) => countShown[i] === counts[i]);
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
  }, 3600);
  run();
};
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
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
body.iso{--field-sum:#e0a44a}
body[data-theme="light"].iso{--field-sum:#b26a00;--anatomy-mid:#6f6f75;--anatomy-lo:#a2a2a7;--anatomy-faint:#c6c6ca}
.zone-src .iso-edge{stroke:var(--anatomy-blue)}
.zone-dst .iso-edge{stroke:var(--anatomy-green)}
.zone-bad .iso-edge{stroke:var(--anatomy-red)}
.card-src .card-base .iso-edge{stroke:var(--anatomy-blue)}
.card-dst .card-base .iso-edge{stroke:var(--anatomy-green)}
.dup-base .iso-edge{stroke:var(--anatomy-red)}
.card-bad{transition:opacity .35s ease}
.field-client .iso-top,.stud-client .iso-top,.punch-client .iso-top{fill:var(--anatomy-blue)}
.field-client .iso-edge,.stud-client .iso-edge,.punch-client .iso-edge{stroke:var(--anatomy-blue)}
.field-fio .iso-top,.stud-fio .iso-top,.punch-fio .iso-top{fill:var(--anatomy-green)}
.field-fio .iso-edge,.stud-fio .iso-edge,.punch-fio .iso-edge{stroke:var(--anatomy-green)}
.field-sum .iso-top,.stud-sum .iso-top,.punch-sum .iso-top{fill:var(--field-sum)}
.field-sum .iso-edge,.stud-sum .iso-edge,.punch-sum .iso-edge{stroke:var(--field-sum)}
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
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: стрелки ведут запись через переводник" aria-valuemin="0" aria-valuemax="${STEPS.length - 1}" aria-valuenow="0">${svg}</div>`,
  });

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}
