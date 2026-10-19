// Figure fig-01-is-machine, built with the Anatomy skill.
//
// Contract with course-studio (kept):
//   1. Kit imported from the vendored copy: ../../../../../_anatomy/kit/iso-kit.mjs
//   2. `node build.mjs` writes BOTH themes next to this file:
//        fig-01-is-machine.html        (dark)
//        fig-01-is-machine-light.html  (light)
//   3. `node build.mjs --audit` runs Anatomy's audit.
//   4. Card `fig` is "Fig 1".
//
// The object (the brief's spec): a bench data-processing machine on feet. Left, an
// intake magazine of record tiles; a feed rail with a carriage; in the middle the
// processing unit with a gear pair and a stamp; right, a card-index cabinet of three
// pull-out drawers (storage) and a separate output tray; on a post above, a mode
// handwheel with a pointer; a thin feedback tie rod runs from the output tray to the
// handwheel. A counter dial on the bed shows how many records are processed.
//
// Architecture: the machine structure is drawn once and its solids are recorded so
// the audit can check that every recorded part rests on the one below; the moving
// parts (records, carriage, stamp, drawers, handwheel, rod, vane, needle) are groups
// rebuilt each frame by the inlined kit, so they are not painter items.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../_anatomy/kit/lathe.mjs";
import * as A from "../../../../../_anatomy/kit/audit.mjs";
import { kitScript } from "../../../../../_anatomy/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-01-is-machine";
const WIDTH = 600;
const HEIGHT = 400;

const PLATE = { x: -152, y: -64, w: 304, d: 128, r: 9 };
const PLATE_H = 13;
const FOOT_H = 5;

const MAG = { x: -140, y: -30, w: 36, d: 48, r: 2 };
const MAG_CX = MAG.x + MAG.w / 2;
const MAG_CY = MAG.y + MAG.d / 2;
const REC_W = 20;
const REC_D = 24;
const REC_H = 2.4;

const RAIL_Y = -6;
const RAIL_X0 = -104;
const RAIL_X1 = 36;
const RAIL_TOP = 3;

const PRESS_X = -6;

const CAB = { x: 56, y: -60, w: 92, d: 52, r: 3 };
const CAB_TOP = 62;
const DW = { x: CAB.x + 7, y: CAB.y + 7, w: CAB.w - 14, d: CAB.d - 14, r: 2 };
const DRAWER_Z0 = [8, 26, 44];
const DRAWER_H = 16;
const DRAWER_OUT = 20;

const TRAY = { x: 12, y: 26, w: 60, d: 34, r: 3 };
const TRAY_TOP = 12;

const DIAL = [108, 30];
const DIAL_R = 14;
const DIAL_TOP = 8;

const POST = [-58, 46];
const POST_R = 4;
const POST_TOP = 58;
const WHEEL_R = 15;
const WHEEL_Z0 = 58;
const WHEEL_Z1 = 64;
const MODE_STEP_DEG = 30;

const ROD_LOW = [72, 58, 12];

const carRestX = -88;
const stampRestZ0 = 16;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [POST[0], POST[1], WHEEL_Z1 + 6],
    [CAB.x + CAB.w, CAB.y + CAB.d, CAB_TOP + 2],
    [MAG.x, MAG.y, 24],
  ],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 50 },
);

const pt = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

const rec = A.recorder(P, {});
const solid = (shape) => rec.solid(shape);

// ==== recorded static solids, drawn once =========================================

function slabStatic(name, plan, z0, z1, { tone = "mid", ground = false, bevel = 0.6, steps = 6, seam = null } = {}) {
  solid(A.slab(plan, z0, z1 - z0, { name, ...(ground ? { ground: true } : {}) }, steps));
  let svg = S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone });
  if (seam) svg += L(k.planOutline(k.insetPlan(plan, seam), z1, P), { tone: "faint" });
  return svg;
}

function cylStatic(name, [x, y], r, z0, z1, { tone = "mid", ground = false, bevel = 0, extra = "" } = {}) {
  solid(A.cylinder(x, y, r, z0, z1 - z0, { name, ...(ground ? { ground: true } : {}) }));
  return S(k.cylinder(x, y, r, z0, z1 - z0, P, 32, bevel), { tone }) + extra;
}

function discStatic(name, F, s0, s1, r, { tone = "mid", extra = "" } = {}) {
  solid(A.disc(F, s0, s1, r, { name }));
  return S(G.disc(s0, s1, r, F, P), { tone }) + extra;
}

const statics = [];
const place = (at, svg) => statics.push({ d: k.depthOf(at, P), svg });

// Four walls that butt against each other (side walls run full depth, back and
// front span only the inner width), so no two walls overlap; they meet at edges.
function wallFrame(prefix, plan, z0, z1, t, { frontZ1 = z1, tone = "mid" } = {}) {
  const { x, y, w, d } = plan;
  let svg = "";
  svg += slabStatic(`${prefix}.wall.left`, { x, y, w: t, d, r: 1 }, z0, z1, { tone });
  svg += slabStatic(`${prefix}.wall.right`, { x: x + w - t, y, w: t, d, r: 1 }, z0, z1, { tone });
  svg += slabStatic(`${prefix}.wall.back`, { x: x + t, y, w: w - 2 * t, d: t, r: 1 }, z0, z1, { tone });
  svg += slabStatic(`${prefix}.wall.front`, { x: x + t, y: y + d - t, w: w - 2 * t, d: t, r: 1 }, z0, frontZ1, { tone });
  return svg;
}

function feet() {
  const out = [];
  for (const [x, y] of k.corners(PLATE, 26)) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
    solid(A.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, { name: `stand.foot.${x}.${y}`, ground: true }));
    solid(A.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, { name: `stand.footpad.${x}.${y}` }));
  }
  return out.join("");
}

function plate() {
  const screws = k.corners(PLATE, 12);
  return (
    `<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>` +
    feet() +
    S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }) +
    L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" }) +
    L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
    D(screws.map(([x, y]) => pt([x, y, 0])), { size: 0.5 })
  );
}
solid(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }, 8));
statics.push({ d: -1e9, svg: plate() });

function magazine() {
  let svg = slabStatic("magazine.base", MAG, 0, 4, { tone: "mid", bevel: 0.6, seam: 3 });
  const wallH = 24;
  svg += wallFrame("magazine", MAG, 4, wallH, 4, { frontZ1: 12 });
  const label = { x: MAG.x + 3, y: MAG.y + 6, w: MAG.w - 6, d: 7, r: 1 };
  svg += S(k.slabOf(label, 4, 0.7, P, 3), { tone: "lo", crease: "none" });
  svg += L([16, 12].map((w, i) => k.lineOnTop([label.x + 3, label.y + 2.2 + i * 2.6], [label.x + 3 + w, label.y + 2.2 + i * 2.6], 4.7, P)).join(""), { tone: "lo", free: true });
  place([MAG_CX, MAG_CY, 8], svg);
}
magazine();

function rail() {
  const out = [];
  for (const y of [RAIL_Y - 8, RAIL_Y + 8]) {
    out.push(slabStatic(`rail.bar.${y}`, { x: RAIL_X0, y, w: RAIL_X1 - RAIL_X0, d: 5, r: 1 }, 0, RAIL_TOP, { tone: "mid", bevel: 0.4 }));
    out.push(D([pt([RAIL_X0 + 6, y + 2.5, RAIL_TOP]), pt([RAIL_X1 - 6, y + 2.5, RAIL_TOP])], { size: 0.4 }));
  }
  place([(RAIL_X0 + RAIL_X1) / 2, RAIL_Y, 4], out.join(""));
}
rail();

function press() {
  const out = [];
  const housing = { x: PRESS_X - 24, y: -34, w: 48, d: 12, r: 3 };
  out.push(slabStatic("press.housing", housing, 0, 46, { tone: "mid", bevel: 1, seam: 6 }));
  out.push(L(k.sideSeam(housing, 12, P, 4) + k.sideSeam(housing, 40, P, 4), { tone: "faint", free: true }));
  for (const [cx, cy] of [[PRESS_X - 20, 14], [PRESS_X + 16, 14]]) {
    out.push(cylStatic("press.column", [cx, cy], 5, 0, 46, { tone: "mid", extra: L(k.sideArc(cx, cy, 5, 20, P, 18), { tone: "faint" }) }));
  }
  const head = { x: PRESS_X - 30, y: -34, w: 60, d: 56, r: 3 };
  out.push(slabStatic("press.head", head, 46, 56, { tone: "mid", bevel: 1.2, seam: 4 }));
  out.push(D([[head.x + 7, head.y + 7], [head.x + head.w - 7, head.y + 7], [head.x + 7, head.y + head.d - 7], [head.x + head.w - 7, head.y + head.d - 7]].map(([x, y]) => pt([x, y, 56])), { size: 0.5 }));
  out.push(cylStatic("press.ram", [PRESS_X, RAIL_Y], 3, 26, 46, { tone: "mid" }));
  const gears = [
    { c: [PRESS_X - 12, -37, 30], r: 10, teeth: 18 },
    { c: [PRESS_X + 8, -37, 26], r: 8.5, teeth: 15 },
  ];
  for (const g of gears) {
    const F = G.frameAlong(g.c, [0, 1, 0]);
    out.push(discStatic("press.gear", F, -3, 3, g.r, {
      tone: "mid",
      extra:
        L(G.ribsOf(F, -3, 3, g.r, g.teeth, P, { seams: false }), { tone: "faint" }) +
        S(G.disc(-3, 3, g.r * 0.32, F, P), { tone: "mid" }) +
        L(G.arcOf(F, 3, g.r, P), { tone: "lo" }),
    }));
  }
  place([PRESS_X, RAIL_Y, 30], out.join(""));
}
press();

function cabinet() {
  const out = [];
  out.push(slabStatic("cabinet.base", CAB, 0, 4, { tone: "mid", bevel: 0.6, seam: 3 }));
  out.push(wallFrame("cabinet", CAB, 4, CAB_TOP, 4));
  out.push(slabStatic("cabinet.top", { x: CAB.x, y: CAB.y, w: CAB.w, d: CAB.d, r: 3 }, CAB_TOP, CAB_TOP + 2, { tone: "mid", bevel: 0.6, seam: 3 }));
  for (const z0 of DRAWER_Z0) {
    out.push(slabStatic("cabinet.shelf", { x: CAB.x + 4, y: CAB.y + 4, w: CAB.w - 8, d: CAB.d - 8, r: 2 }, z0 - 2, z0, { tone: "mid", bevel: 0.4 }));
  }
  out.push(L(k.sideSeam(CAB, 54, P, 4), { tone: "faint", free: true }));
  const tag = { x: CAB.x + CAB.w - 28, y: CAB.y + 8, w: 20, d: 6, r: 1 };
  out.push(S(k.slabOf(tag, CAB_TOP + 2, 0.8, P, 3), { tone: "lo", crease: "none" }));
  place([CAB.x + CAB.w / 2, CAB.y + CAB.d / 2, CAB_TOP / 2], out.join(""));
}
cabinet();

function tray() {
  const out = [];
  out.push(slabStatic("tray.floor", TRAY, 0, 4, { tone: "mid", bevel: 0.6, seam: 3 }));
  out.push(wallFrame("tray", TRAY, 4, TRAY_TOP, 4));
  out.push(L(k.sideSeam(TRAY, 8, P, 4), { tone: "faint", free: true }));
  place([TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, 6], out.join(""));
}
tray();

function dialBody() {
  const [x, y] = DIAL;
  let svg = cylStatic("dial.body", [x, y], DIAL_R, 0, DIAL_TOP, { tone: "hi", bevel: 0.8 });
  svg += L(k.knurl(x, y, DIAL_R, DIAL_TOP - 4, DIAL_TOP, 84, P, 0.3), { tone: "lo" });
  svg += L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 4, P, 40), { tone: "faint" });
  svg += L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" });
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 24, 6, DIAL_TOP, [1.2, 2.6], P);
  svg += L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
  svg += k.faceTextSvg(k.topMatrix([x, y + 9], DIAL_TOP, P, "x"), "5", { size: 2.6, tone: "lo", anchor: "middle" });
  place([x, y, DIAL_TOP / 2], svg);
}
dialBody();

function postAndWheel() {
  const out = [];
  out.push(cylStatic("stand.post", POST, POST_R, 0, POST_TOP, { tone: "mid", extra: L(k.sideArc(POST[0], POST[1], POST_R, 20, P, 18), { tone: "faint" }) }));
  solid(A.cylinder(POST[0], POST[1], WHEEL_R, WHEEL_Z0, WHEEL_Z1 - WHEEL_Z0, { name: "stand.wheel.body" }));
  out.push(S(k.cylinder(POST[0], POST[1], WHEEL_R, WHEEL_Z0, WHEEL_Z1 - WHEEL_Z0, P, 48, 0.8), { tone: "mid" }));
  out.push(L(k.sideArc(POST[0], POST[1], WHEEL_R, WHEEL_Z0 + 1, P, 48), { tone: "faint" }));
  place([POST[0], POST[1], (POST_TOP + WHEEL_Z1) / 2], out.join(""));
}
postAndWheel();

function diverterBracket() {
  const out = [];
  out.push(slabStatic("diverter.bracket", { x: 38, y: RAIL_Y - 12, w: 8, d: 24, r: 2 }, 0, 8, { tone: "mid", bevel: 0.6 }));
  out.push(cylStatic("diverter.pin", [40, RAIL_Y], 2, 8, 14, { tone: "mid" }));
  place([40, RAIL_Y, 6], out.join(""));
}
diverterBracket();

// ==== moving parts (groups rebuilt each frame, solids recorded at rest) ===========

function tileMarkup(i, lit) {
  const z = 4 + REC_H * i;
  const plan = { x: MAG_CX - REC_W / 2, y: RAIL_Y - REC_D / 2, w: REC_W, d: REC_D, r: 2 };
  let svg = S(k.slabOf(plan, z, REC_H, P, 5, 0.4), { tone: "hi", crease: "faint", lit });
  svg += L(k.planOutline(k.insetPlan(plan, 2.2), z + REC_H, P), { tone: "faint" });
  svg += L([0, 1, 2].map((r) => k.lineOnTop([plan.x + 4, plan.y + 6 + r * 5], [plan.x + plan.w - 4, plan.y + 6 + r * 5], z + REC_H, P)).join(""), { tone: "faint", free: true });
  return svg;
}

const recordGroups = M.RECORDS.map((record, i) => {
  const z = 4 + REC_H * i;
  const plan = { x: MAG_CX - REC_W / 2, y: RAIL_Y - REC_D / 2, w: REC_W, d: REC_D, r: 2 };
  solid(A.slab(plan, z, REC_H, { name: `record.${record.id}` }));
  return `<g data-part="rec${i}">${tileMarkup(i, false)}</g>`;
});

function carriageSVG() {
  const plan = { x: carRestX - 13, y: RAIL_Y - 10, w: 26, d: 20, r: 2 };
  let svg = S(k.slabOf(plan, 3, 7, P, 4, 0.6), { tone: "mid" });
  solid(A.slab(plan, 3, 7, { name: "carriage.body" }));
  for (const [x, y] of [[-9, RAIL_Y - 4], [9, RAIL_Y - 4], [-9, RAIL_Y + 4], [9, RAIL_Y + 4]]) {
    const cx = carRestX + x;
    svg += S(k.cylinder(cx, y, 3, 10, 2.6, P, 20), { tone: "mid" });
    svg += L(k.knurl(cx, y, 3, 10, 12.6, 20, P), { tone: "lo" });
    svg += D([pt([cx, y, 12.6])], { size: 0.4 });
  }
  svg += L(k.lineOnTop([carRestX - 10, RAIL_Y - 12], [carRestX + 10, RAIL_Y - 12], 10, P), { tone: "faint" });
  return svg;
}
const CARRIAGE_GROUP = `<g data-part="carriage">${carriageSVG()}</g>`;

function stampSVG() {
  const plan = { x: PRESS_X - 11, y: RAIL_Y - 13, w: 22, d: 26, r: 2 };
  let svg = S(k.slabOf(plan, stampRestZ0, 10, P, 5, 0.6), { tone: "hi", crease: "lo" });
  solid(A.slab(plan, stampRestZ0, 10, { name: "stamp.body" }));
  svg += L(k.planOutline(k.insetPlan(plan, 2.4), stampRestZ0 + 10, P), { tone: "faint" });
  for (let i = -1; i <= 1; i++) svg += L(k.lineOnTop([plan.x + 5, RAIL_Y + i * 5], [plan.x + plan.w - 5, RAIL_Y + i * 5], stampRestZ0 + 10, P), { tone: "faint", free: true });
  return svg;
}
const STAMP_GROUP = `<g data-part="stamp">${stampSVG()}</g>`;

function drawerSVG(n) {
  const z0 = DRAWER_Z0[n];
  const { x, y, w, d } = DW;
  const t = 3;
  let svg = "";
  svg += slabStatic(`drawer${n + 1}.base`, { x, y, w, d, r: 2 }, z0, z0 + 2, { tone: "hi", bevel: 0.4 });
  svg += slabStatic(`drawer${n + 1}.wall.left`, { x, y, w: t, d, r: 1 }, z0 + 2, z0 + DRAWER_H, { tone: "hi" });
  svg += slabStatic(`drawer${n + 1}.wall.right`, { x: x + w - t, y, w: t, d, r: 1 }, z0 + 2, z0 + DRAWER_H, { tone: "hi" });
  svg += slabStatic(`drawer${n + 1}.wall.back`, { x: x + t, y, w: w - 2 * t, d: t, r: 1 }, z0 + 2, z0 + DRAWER_H, { tone: "hi" });
  svg += slabStatic(`drawer${n + 1}.front`, { x, y: y + d, w, d: t, r: 1.5 }, z0, z0 + DRAWER_H, { tone: "hi", bevel: 0.6 });
  const hx = x + w / 2;
  const hy = y + d + t + 2;
  svg += S(k.cylinder(hx, hy, 2, z0 + DRAWER_H - 6, 6, P, 20), { tone: "mid" });
  svg += L(k.knurl(hx, hy, 2, z0 + DRAWER_H - 6, z0 + DRAWER_H, 20, P), { tone: "lo" });
  return svg;
}
const DRAWER_GROUPS = DRAWER_Z0.map((_, n) => `<g data-part="drawer${n + 1}">${drawerSVG(n)}</g>`);

function wheelMarkup(angleDeg) {
  const cx = POST[0];
  const cy = POST[1];
  const z = WHEEL_Z1;
  const base = ((angleDeg - 90) * Math.PI) / 180;
  const out = [];
  out.push(L(k.ring(cx, cy, WHEEL_R - 1.2, z, P, 64), { tone: "lo" }));
  for (let s = 0; s < 4; s++) {
    const a = ((s * MODE_STEP_DEG - 90) * Math.PI) / 180;
    out.push(L(k.segment([cx + Math.cos(a) * (WHEEL_R - 3.4), cy + Math.sin(a) * (WHEEL_R - 3.4), z], [cx + Math.cos(a) * (WHEEL_R - 0.8), cy + Math.sin(a) * (WHEEL_R - 0.8), z], P), { tone: "mid" }));
  }
  for (let i = 0; i < 6; i++) {
    const a = base + (i * Math.PI) / 3;
    out.push(L(k.segment([cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, z], [cx + Math.cos(a) * (WHEEL_R - 2.2), cy + Math.sin(a) * (WHEEL_R - 2.2), z], P), { tone: "faint" }));
  }
  out.push(S(k.cylinder(cx, cy, 4.6, z, 3, P, 24), { tone: "mid" }));
  out.push(L(k.segment([cx + Math.cos(base) * 4.6, cy + Math.sin(base) * 4.6, z + 0.2], [cx + Math.cos(base) * (WHEEL_R - 0.8), cy + Math.sin(base) * (WHEEL_R - 0.8), z + 0.2], P), { tone: "lit" }));
  return out.join("");
}
const WHEEL_GROUP = `<g data-part="wheelrot">${wheelMarkup(0)}</g>`;
solid(A.cylinder(POST[0], POST[1], 4.6, WHEEL_Z1, 3, { name: "stand.wheel.hub" }));

function rodMarkup(pin) {
  return (
    L(k.segment(ROD_LOW, pin, P), { tone: "mid", className: "rod-shaft" }) +
    L(k.ring(ROD_LOW[0], ROD_LOW[1], 2.2, ROD_LOW[2], P, 16), { tone: "lo" }) +
    L(k.ring(pin[0], pin[1], 2.2, pin[2], P, 16), { tone: "lo" })
  );
}
function pinAt(angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [POST[0] + Math.cos(a) * 10, POST[1] + Math.sin(a) * 10, WHEEL_Z1];
}
const ROD_GROUP = `<g data-part="rod">${rodMarkup(pinAt(0))}</g>`;

function diverterMarkup(deg) {
  const x = 40;
  const y = RAIL_Y;
  const a = (deg * Math.PI) / 180;
  const hw = 1.6;
  const hl = 12;
  const corner = (sx, sy) => [x + sx * Math.cos(a) - sy * Math.sin(a), y + sx * Math.sin(a) + sy * Math.cos(a)];
  const blade = [corner(-hw, -hl), corner(hw, -hl), corner(hw, hl), corner(-hw, hl)];
  return (
    S(k.extrude(blade, 8, 10, P, { convex: true }), { tone: "mid" }) +
    S(k.cylinder(x, y, 2, 8, 6, P, 20), { tone: "mid" }) +
    L(k.knurl(x, y, 2, 8, 14, 16, P), { tone: "lo" })
  );
}
const DIVERTER_GROUP = `<g data-part="diverter">${diverterMarkup(0)}</g>`;

const NEEDLE_GROUP = `<g data-part="needle"></g>`;

// ==== assemble ===================================================================

A.settle(rec, P);
A.auditOrExit(rec, P, {});

const art =
  statics
    .sort((a, b) => a.d - b.d)
    .map((s) => s.svg)
    .join("") +
  [
    ...DRAWER_GROUPS,
    ...recordGroups,
    CARRIAGE_GROUP,
    STAMP_GROUP,
    WHEEL_GROUP,
    ROD_GROUP,
    DIVERTER_GROUP,
    NEEDLE_GROUP,
  ].join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Настольная машина обработки данных: слева приёмный магазин с плитками записей, рельс подачи с кареткой, в середине узел обработки с парой шестерён и штампом, справа картотека с тремя выдвижными ящиками и лоток выдачи; на стойке маховик со стрелкой режима, от лотка выдачи к маховику идёт тонкая тяга обратной связи, на станине циферблат счётчика обработанного.",
  body: art,
});

// ==== geometry data for the live page ============================================

const REC_Z0 = 4;
const STATIONS = {
  рейка: [-72, RAIL_Y, RAIL_TOP + REC_H / 2 + 1],
  обработка: [PRESS_X, RAIL_Y, RAIL_TOP + REC_H / 2 + 1],
  рейка2: [24, RAIL_Y, RAIL_TOP + REC_H / 2 + 1],
  подъём: [44, -22, 26],
  спуск: [40, 18, 15],
  ящик1: [DW.x + DW.w / 2, DW.y + DW.d / 2, DRAWER_Z0[0] + 2 + REC_H / 2],
  ящик2: [DW.x + DW.w / 2, DW.y + DW.d / 2, DRAWER_Z0[1] + 2 + REC_H / 2],
  ящик3: [DW.x + DW.w / 2, DW.y + DW.d / 2, DRAWER_Z0[2] + 2 + REC_H / 2],
  выдача1: [30, 44, 4 + REC_H / 2],
  выдача2: [54, 44, 4 + REC_H / 2],
};

const restCenter = M.RECORDS.map((_, i) => [MAG_CX, RAIL_Y, REC_Z0 + REC_H * i + REC_H / 2]);
const DEST = M.RECORDS.map((record) => {
  const m = /^ящик(\d)$/.exec(M.destination(record));
  return m ? Number(m[1]) - 1 : -1;
});
const recordStops = M.RECORDS.map((record, i) =>
  record.stops.map((name) => (name === "магазин" ? restCenter[i] : STATIONS[name])),
);

// ==== live code =================================================================

const live = `
const P = ${JSON.stringify(P)};
const RECORDS = ${JSON.stringify(M.RECORDS)};
const STOPS = ${JSON.stringify(recordStops)};
const DEST = ${JSON.stringify(DEST)};
const REST = ${JSON.stringify(restCenter)};
const CYCLE = ${JSON.stringify(M.CYCLE)};
const LAST = ${M.LAST};
const REC_H = ${REC_H};
const RAIL_Y = ${RAIL_Y};
const RAIL_TOP = ${RAIL_TOP};
const MAG_CX = ${MAG_CX};
const PRESS_X = ${PRESS_X};
const CAR_REST = ${carRestX};
const POST = ${JSON.stringify(POST)};
const WHEEL_R = ${WHEEL_R};
const WHEEL_Z1 = ${WHEEL_Z1};
const MODE_STEP = ${MODE_STEP_DEG};
const ROD_LOW = ${JSON.stringify(ROD_LOW)};
const DIAL = ${JSON.stringify(DIAL)};
const DIAL_R = ${DIAL_R};
const DIAL_TOP = ${DIAL_TOP};
const DRAWERS = ${JSON.stringify(DRAWER_Z0)};
const DRAWER_OUT = ${DRAWER_OUT};

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const recEls = RECORDS.map((_, i) => svg.querySelector('[data-part="rec' + i + '"]'));
const carEl = svg.querySelector('[data-part="carriage"]');
const stampEl = svg.querySelector('[data-part="stamp"]');
const drawerEls = [0, 1, 2].map((n) => svg.querySelector('[data-part="drawer' + (n + 1) + '"]'));
const wheelEl = svg.querySelector('[data-part="wheelrot"]');
const rodEl = svg.querySelector('[data-part="rod"]');
const diverterEl = svg.querySelector('[data-part="diverter"]');
const needleEl = svg.querySelector('[data-part="needle"]');

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function posOf(i, p) {
  const stops = STOPS[i];
  if (p <= 0) return stops[0].slice();
  if (p >= stops.length - 1) return stops[stops.length - 1].slice();
  const j = Math.floor(p);
  const t = p - j;
  return lerp(stops[j], stops[j + 1], t);
}
function atOf(s) {
  const c = clamp(s, 0, LAST);
  const kk = Math.min(LAST - 1, Math.floor(c));
  const t = c - kk;
  return CYCLE[0].at.map((_, i) => CYCLE[kk].at[i] + (CYCLE[kk + 1].at[i] - CYCLE[kk].at[i]) * t);
}
function countsAt(p) {
  const arrived = p.filter((v) => v >= 0.5).length;
  let stored = 0;
  let output = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] < 4.5) continue;
    if (RECORDS[i].kind === "накопление") stored += 1;
    else output += 1;
  }
  return { arrived, stored, output, mode: output > 0 ? 2 : 1 };
}
function phaseAt(p, target) {
  for (let i = 0; i < p.length; i++) {
    const v = p[i];
    if (v > 0.08 && v < 4.9 && Math.round(v) === 2) return "обработка";
  }
  return target;
}
function phaseOf(s) {
  return CYCLE[Math.round(clamp(s, 0, LAST))].phase;
}
function readoutText(p, target) {
  const c = countsAt(p);
  return "шаг: " + phaseAt(p, target) + " · поступило " + c.arrived + " · в хранилище " + c.stored + " · выдано " + c.output;
}

function tile(i, lit) {
  const z = 4 + REC_H * i;
  const plan = { x: MAG_CX - 10, y: RAIL_Y - 12, w: 20, d: 24, r: 2 };
  const body = solidSvg(slabOf(plan, z, REC_H, P, 5, 0.4), { tone: "hi", crease: "faint", lit });
  const edge = lineSvg(planOutline(insetPlan(plan, 2.2), z + REC_H, P), { tone: "faint" });
  const rules = lineSvg([0, 1, 2].map((r) => lineOnTop([plan.x + 4, plan.y + 6 + r * 5], [plan.x + plan.w - 4, plan.y + 6 + r * 5], z + REC_H, P)).join(""), { tone: "faint", free: true });
  return body + edge + rules;
}

function wheelMarkup(angleDeg) {
  const cx = POST[0];
  const cy = POST[1];
  const z = WHEEL_Z1;
  const base = ((angleDeg - 90) * Math.PI) / 180;
  const out = [];
  out.push(lineSvg(ring(cx, cy, WHEEL_R - 1.2, z, P, 64), { tone: "lo" }));
  for (let s = 0; s < 4; s++) {
    const a = ((s * MODE_STEP - 90) * Math.PI) / 180;
    out.push(lineSvg(segment([cx + Math.cos(a) * (WHEEL_R - 3.4), cy + Math.sin(a) * (WHEEL_R - 3.4), z], [cx + Math.cos(a) * (WHEEL_R - 0.8), cy + Math.sin(a) * (WHEEL_R - 0.8), z], P), { tone: "mid" }));
  }
  for (let i = 0; i < 6; i++) {
    const a = base + (i * Math.PI) / 3;
    out.push(lineSvg(segment([cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, z], [cx + Math.cos(a) * (WHEEL_R - 2.2), cy + Math.sin(a) * (WHEEL_R - 2.2), z], P), { tone: "faint" }));
  }
  out.push(solidSvg(cylinder(cx, cy, 4.6, z, 3, P, 24), { tone: "mid" }));
  out.push(lineSvg(segment([cx + Math.cos(base) * 4.6, cy + Math.sin(base) * 4.6, z + 0.2], [cx + Math.cos(base) * (WHEEL_R - 0.8), cy + Math.sin(base) * (WHEEL_R - 0.8), z + 0.2], P), { tone: "lit" }));
  return out.join("");
}
function pinAt(angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [POST[0] + Math.cos(a) * 10, POST[1] + Math.sin(a) * 10, WHEEL_Z1];
}
function rodMarkup(pin) {
  return lineSvg(segment(ROD_LOW, pin, P), { tone: "mid" }) +
    lineSvg(ring(ROD_LOW[0], ROD_LOW[1], 2.2, ROD_LOW[2], P, 16), { tone: "lo" }) +
    lineSvg(ring(pin[0], pin[1], 2.2, pin[2], P, 16), { tone: "lo" });
}
function diverterMarkup(deg) {
  const x = 40;
  const y = RAIL_Y;
  const a = (deg * Math.PI) / 180;
  const hw = 1.6;
  const hl = 12;
  const corner = (sx, sy) => [x + sx * Math.cos(a) - sy * Math.sin(a), y + sx * Math.sin(a) + sy * Math.cos(a)];
  const blade = [corner(-hw, -hl), corner(hw, -hl), corner(hw, hl), corner(-hw, hl)];
  return solidSvg(extrude(blade, 8, 10, P, { convex: true }), { tone: "mid" }) +
    solidSvg(cylinder(x, y, 2, 8, 6, P, 20), { tone: "mid" }) +
    lineSvg(knurl(x, y, 2, 8, 14, 16, P), { tone: "lo" });
}
function needleMarkup(turn) {
  const x = DIAL[0];
  const y = DIAL[1];
  const a = -Math.PI * 0.75 + turn * Math.PI * 1.5;
  return lineSvg(lineOnTop([x - Math.sin(a) * 2.6, y + Math.cos(a) * 2.6], [x + Math.sin(a) * (DIAL_R - 4), y - Math.cos(a) * (DIAL_R - 4)], DIAL_TOP + 0.4, P), { tone: "lit", free: "start" });
}

let target = 0;
let s = 0;
let p = CYCLE[0].at.slice();
let touring = !still.matches;
let clock = 0;
let tourClock = 1.2;
let tourStep = 0;
let frame = 0;
let last = 0;
let visible = false;
let idleTimer = 0;
let wheelAngle = 0;
let dtm = 1 / 60;

function place() {
  const fills = [0, 0, 0];
  for (let n = 0; n < 3; n++) {
    for (let i = 0; i < p.length; i++) {
      if (DEST[i] === n) fills[n] = Math.max(fills[n], clamp((p[i] - 3.2) / 1.2, 0, 1));
    }
  }
  for (let i = 0; i < p.length; i++) {
    const lag = i * 0.09;
    const want = atOf(clamp(s - lag, 0, LAST))[i];
    p[i] = still.matches ? want : p[i] + (want - p[i]) * (1 - Math.exp(-dtm / 0.16));
    if (Math.abs(want - p[i]) < 0.004) p[i] = want;
    const pos = posOf(i, p[i]);
    const base = REST[i];
    const carry = DEST[i] >= 0 ? DRAWER_OUT * fills[DEST[i]] : 0;
    recEls[i].setAttribute("transform", translateAlong(P, [pos[0] - base[0], pos[1] - base[1] + carry, pos[2] - base[2]]));
    const lit = Math.round(p[i]) === 2 && p[i] > 1.5 && p[i] < 2.5;
    recEls[i].innerHTML = tile(i, lit);
  }
  let carX = CAR_REST;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0.4 && p[i] < 3.4) carX = posOf(i, p[i])[0] - 23.5;
  }
  carEl.setAttribute("transform", translateAlong(P, [carX - CAR_REST, 0, 0]));
  let press = 0;
  for (let i = 0; i < p.length; i++) {
    const d = Math.abs(p[i] - 2);
    if (d < 1) press = Math.max(press, 1 - d);
  }
  stampEl.setAttribute("transform", translateAlong(P, [0, 0, -6.4 * (0.35 + 0.65 * Math.max(0, Math.sin(clock * 3.0))) * press]));
  for (let n = 0; n < 3; n++) {
    drawerEls[n].setAttribute("transform", translateAlong(P, [0, DRAWER_OUT * fills[n], 0]));
  }
  const c = countsAt(p);
  const targetAngle = (c.mode - 1) * MODE_STEP;
  wheelAngle = still.matches ? targetAngle : wheelAngle + (targetAngle - wheelAngle) * (1 - Math.exp(-dtm / 0.10));
  wheelEl.innerHTML = wheelMarkup(wheelAngle);
  rodEl.innerHTML = rodMarkup(pinAt(wheelAngle));
  const targetDeg = p.some((v, i) => RECORDS[i].kind === "накопление" && v > 3.4) ? -35 : 35;
  diverterEl.innerHTML = diverterMarkup(targetDeg);
  const processed = p.filter((v) => v >= 1.5).length;
  needleEl.innerHTML = needleMarkup(clamp(processed / 5, 0, 1));
  const text = readoutText(p, phaseOf(s));
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(s)));
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  dtm = dt;
  const calm = still.matches;
  if (touring) {
    tourClock -= dt;
    if (tourClock <= 0) {
      tourStep = (tourStep + 1) % (LAST + 1);
      target = tourStep;
      tourClock = tourStep === 0 ? 1.6 : 1.5;
    }
  }
  s = calm ? target : s + (target - s) * (1 - Math.exp(-dt / 0.42));
  if (Math.abs(target - s) < 0.002) s = target;
  clock += dt;
  place();
  const settled = !touring && Math.abs(target - s) < 0.003 && p.every((v, i) => Math.abs(atOf(clamp(s - i * 0.09, 0, LAST))[i] - v) < 0.01);
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
function takeOver(next) {
  touring = false;
  target = clamp(next, 0, LAST);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (still.matches) return;
    touring = true;
    tourClock = 1.2;
    run();
  }, 4200);
  run();
}
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const f = clamp((event.clientX - box.left) / box.width, 0, 1);
  takeOver(Math.round(f * LAST));
});
stage.addEventListener("pointerleave", () => {
  if (!touring) takeOver(target);
});
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.round(target) + 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.round(target) - 1;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = LAST;
  if (next === null) return;
  event.preventDefault();
  takeOver(next);
});
place();
`;

// ==== card ======================================================================

const css = `<style>
.rod-shaft{stroke-width:1.1px}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
@media (max-width:560px){.iso-plate-corner[data-corner="readout"]{font-size:9px;letter-spacing:0}}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 1",
    title: "Машина ИС",
    hint: "Наведите или ← →, чтобы пройти цикл",
    readout: M.initial.text,
    keys: [
      { mark: "lit", label: "запись в обработке" },
      { mark: "raised", label: "данные в хранилище" },
    ],
    caption:
      "Одна и та же запись проходит приём, обработку и маршрутизацию. Три записи остаются в хранилище, две выдаются как готовая информация, после чего тяга обратной связи доворачивает маховик на шаг 2.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Машина ИС: наведите или нажмите стрелки, чтобы пройти цикл обработки" aria-valuemin="0" aria-valuemax="${M.LAST}" aria-valuenow="0">${svg}</div>`,
  });

function build(theme) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: ID, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}

build("dark");
build("light");
