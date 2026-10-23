import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import * as G from "../../../../../../_anatomy/kit/lathe.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, STEPS, SHOWN } from "./model.mjs";
import {
  WIDTH, HEIGHT, P, VIEW, at, S, L, D, byDepth, add, mul, tube, pipe, collar, bolts,
  faceCircle, faceDisc, faceRing, faceQuad, facePlate, webBand,
  PLATE, PLATE_H, FOOT_H, PLINTH, PLINTH_H, CASSETTE, CASS_Z0, CASS_Z1,
  APRON_Z0, APRON_Z1, APRON_T, APRON_SLIDE, BACK_SLIDE, CASE, COVER, COVER_Z0, COVER_TOP, COVER_H, COVER_LIFT,
  EARS, EYE, POSTS, POST_R, POST_TOP, SUB_X, SUB, FLOW_Z, PIPE_Z, PY, JOURNAL, PAPER_Z,
  TOWER_IN, TOWER_OUT, TOWER_Z, MECH, MECH_Z, PULLEY, COLUMN, COLUMN_TOP, CONTROL_Z,
  RAIL, LABEL, RULER, JOURNAL_TOP,
} from "./figlib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// Разборный блок-процесс: плита на ножках, пьедестал с кассетой, ряд из четырёх
// низких панелей и высокий кожух-крышка на четырёх направляющих. Внутри четыре
// подпроцесса со своими инструментами, трубки потоков, шина управления,
// журнальный лоток; сзади колонна управления, спереди три механизма.

const SHELL = { x0: COVER.x, x1: COVER.x + COVER.w, y0: COVER.y, y1: COVER.y + COVER.d };
const INNER = { x0: CASE.x0, x1: CASE.x1, y0: CASE.y0, y1: CASE.y1 };

// --- маршруты потоков -------------------------------------------------------

const INLET_X = [-66, -58, -50];

const ROUTES = {
  in: INLET_X.map((x) => [
    [x, 78, PIPE_Z],
    [x, 18, PIPE_Z],
  ]),
  out: PY.map((y) => [
    [67, y, PIPE_Z],
    [132, y, PIPE_Z],
  ]),
  "check-approve": [
    [
      [-41, 0, FLOW_Z],
      [-38, 0, FLOW_Z],
      [-38, 22, FLOW_Z],
      [-25, 22, FLOW_Z],
      [-25, 18, FLOW_Z],
    ],
  ],
  "approve-write": [
    [
      [-5, 0, FLOW_Z],
      [-2, 0, FLOW_Z],
      [-2, 22, FLOW_Z],
      [11, 22, FLOW_Z],
      [11, 18, FLOW_Z],
    ],
  ],
  "write-notice": [
    [
      [31, 0, FLOW_Z],
      [34, 0, FLOW_Z],
      [34, 22, FLOW_Z],
      [47, 22, FLOW_Z],
      [47, 18, FLOW_Z],
    ],
  ],
  control: [
    [
      [-60, -78, CONTROL_Z],
      [-60, -62, CONTROL_Z],
    ],
  ],
  "control-in": [
    [
      [-60, -56, CONTROL_Z],
      [-60, -50, CONTROL_Z],
      [-58, -50, 58],
      [-54, -50, 60],
    ],
  ],
};

const route = (points, r = 5) =>
  points.length > 2 ? G.fillet(points, r, 6, { P, tube: 2.2, margin: 1.4 }) : points;

function flowGroup(name, shapes) {
  const list = Array.isArray(shapes[0][0]) ? shapes : [shapes];
  const body = list
    .map((points) => L(k.pathOf(points.map(at)), { tone: "blue", flow: true }))
    .join("");
  return `<g class="flow" data-flow="${name}">${body}</g>`;
}

// --- плита ------------------------------------------------------------------

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H + FOOT_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.8, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" }));
    out.push(L(k.sideArc(x, y, 7, -PLATE_H - FOOT_H + 1.2, P, 22), { tone: "faint" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 9, 1.7), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P, 9), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 10), 0, P, 9), { tone: "faint" }));
  const screws = k.corners(PLATE, 13);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.1, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.48 }));

  // Линейка вдоль левого края.
  out.push(S(k.slabOf(RULER, 0, 0.7, P, 3), { tone: "mid", crease: "none" }));
  const ticks = k.topTicks(RULER.y + 4, RULER.y + RULER.d - 4, 4, 5, RULER.x + RULER.w, 1.1, [2, 3.6], P, "y");
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(RULER, 1), 0.7, P, 3), { tone: "faint" }));

  // Табличка уровня.
  out.push(S(k.slabOf(LABEL, 0, 1.2, P, 4), { tone: "mid", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.4), 1.2, P, 4), { tone: "lo" }));
  out.push(
    k.faceTextSvg(k.topMatrix([LABEL.x + 5, LABEL.y + LABEL.d / 2], 1.2, P, "x"), "0 → 1", {
      size: 5.2,
      tone: "hi",
      anchor: "start",
    }),
  );
  out.push(D([at([LABEL.x + LABEL.w - 4, LABEL.y + LABEL.d / 2, 1.2])], { size: 0.5 }));
  return out.join("");
}

// --- пьедестал и кассета ----------------------------------------------------

function pedestal() {
  const out = [];
  out.push(S(k.slabOf(PLINTH, 0, PLINTH_H, P, 9, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLINTH, 5), PLINTH_H - 2.6, P, 9), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(PLINTH, 9), PLINTH_H, P, 9), { tone: "faint" }));
  for (const [x, y] of k.corners(k.insetPlan(PLINTH, 12), 0)) {
    out.push(S(k.cylinder(x, y, 2.2, PLINTH_H - 1.2, 1.2, P, 18), { tone: "lo" }));
    out.push(L(k.ring(x, y, 2.8, PLINTH_H, P, 18), { tone: "faint" }));
    out.push(D([at([x, y, PLINTH_H])], { size: 0.42 }));
  }
  // Табличка на передней грани.
  const face = PLINTH.y + PLINTH.d;
  out.push(facePlate([-38, face, 4], [1, 0, 0], [0, 0, 1], [0, 1, 0], 76, 9, 1.2, { tone: "hi", round: 1.2 }));
  out.push(
    L(
      [52, 40, 26]
        .map((len, i) => k.segment([-34, face + 1.2, 10.6 - i * 2.3], [-34 + len, face + 1.2, 10.6 - i * 2.3], P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(D([at([-35, face + 1.2, 5.4]), at([-32, face + 1.2, 5.4])], { size: 0.42 }));
  // Вентиляционные прорези слева и справа: закрытые пазы.
  for (const cx of [-78, 78]) {
    const slots = [];
    for (let i = 0; i < 4; i++) {
      const z = 4 + i * 2.2;
      slots.push(
        k.pathOf(
          [
            [cx - 10, face + 1.1, z - 0.7],
            [cx + 10, face + 1.1, z - 0.7],
            [cx + 10, face + 1.1, z + 0.7],
            [cx - 10, face + 1.1, z + 0.7],
          ].map(at),
          true,
        ),
      );
    }
    out.push(L(slots.join(""), { tone: "faint" }));
  }
  out.push(D([at([-88, face, PLINTH_H]), at([88, face, PLINTH_H]), at([-88, face, 4]), at([88, face, 4])], { size: 0.44 }));
  // Рёбра на передней грани.
  out.push(
    L(
      [-84, -70, 70, 84]
        .map((x) => k.segment([x, face + 0.1, 0], [x, face + 0.1, PLINTH_H], P))
        .join(""),
      { tone: "faint" },
    ),
  );
  return out.join("");
}

function cassette() {
  const out = [];
  out.push(S(k.slabOf(CASSETTE, CASS_Z0, CASS_Z1 - CASS_Z0, P, 6, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(CASSETTE, 4), CASS_Z1, P, 6), { tone: "faint" }));
  for (const [x, y] of k.corners(CASSETTE, 8)) {
    out.push(L(k.ring(x, y, 1.8, CASS_Z1, P, 16), { tone: "faint" }));
    out.push(D([at([x, y, CASS_Z1])], { size: 0.4 }));
  }
  // Журнальный лоток: приподнятый рельс с каналом наверху.
  out.push(S(k.slabOf({ x: JOURNAL.x, y: JOURNAL.y, w: JOURNAL.w, d: JOURNAL.d, r: 1.4 }, CASS_Z1, JOURNAL_TOP - CASS_Z1, P, 5, 0.7), { tone: "hi", crease: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: JOURNAL.x, y: JOURNAL.y, w: JOURNAL.w, d: JOURNAL.d, r: 1.4 }, 2.2), JOURNAL_TOP, P, 5), { tone: "faint" }));
  for (const lip of [
    { x: JOURNAL.x, y: JOURNAL.y - 1, w: JOURNAL.w, d: 3.4 },
    { x: JOURNAL.x, y: JOURNAL.y + JOURNAL.d - 2.4, w: JOURNAL.w, d: 3.4 },
  ]) {
    out.push(S(k.slabOf({ ...lip, r: 0.8 }, JOURNAL_TOP, 1.6, P, 4, 0.4), { tone: "hi", crease: "lo" }));
  }
  out.push(S(k.cylinder(JOURNAL.x + 4, JOURNAL.y + JOURNAL.d / 2, 2.2, JOURNAL_TOP, 1.4, P, 22), { tone: "mid" }));
  out.push(L(k.ring(JOURNAL.x + 4, JOURNAL.y + JOURNAL.d / 2, 2.2, JOURNAL_TOP + 1.4, P, 22), { tone: "lo" }));
  out.push(D([at([JOURNAL.x + JOURNAL.w - 5, JOURNAL.y + JOURNAL.d / 2, JOURNAL_TOP])], { size: 0.42 }));
  // Настил кассеты под подпроцессами.
  const deck = { x: -76, y: -44, w: 152, d: 72, r: 3 };
  out.push(S(k.slabOf(deck, CASS_Z1, 1.6, P, 6, 0.6), { tone: "mid", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(deck, 3), CASS_Z1 + 1.6, P, 6), { tone: "faint" }));
  for (const [x, y] of k.corners(deck, 5)) out.push(D([at([x, y, CASS_Z1 + 1.6])], { size: 0.4 }));
  return out.join("");
}

// --- механизмы на передней грани пьедестала ---------------------------------

function mechanism() {
  const out = [];
  const face = PLINTH.y + PLINTH.d;
  const podFace = face + 5;
  for (let index = 0; index < MECH.length; index++) {
    const pod = MECH[index];
    const cx = pod.x + pod.w / 2;
    out.push(S(k.slabOf({ x: pod.x, y: face - 4, w: pod.w, d: 9, r: 1.6 }, 2, MECH_Z - 2, P, 4, 0.8), { tone: "mid" }));
    out.push(faceQuad([pod.x + 2, podFace, 3], [1, 0, 0], [0, 0, 1], pod.w - 4, MECH_Z - 5, { chamfer: 1.2 }));
    out.push(L(faceQuad([pod.x + 2, podFace, 3], [1, 0, 0], [0, 0, 1], pod.w - 4, MECH_Z - 5, { chamfer: 1.2 }), { tone: "faint" }));
    // Вал в пьедестал.
    out.push(tube([[cx, podFace, PULLEY.z], [cx, face - 6, PULLEY.z]], 1.3, { tone: "hi", maxLength: 10 }));
    out.push(faceRing([cx, podFace, PULLEY.z], [0, 1, 0], 0, 1, 1.3, 2.8, "lo"));
    // Шкив на передней грани корпуса.
    out.push(faceDisc([cx, podFace, PULLEY.z], [0, 1, 0], 0, 1.1, PULLEY.r, "mid"));
    out.push(faceRing([cx, podFace, PULLEY.z], [0, 1, 0], 1.1, 1.8, PULLEY.r - 0.9, PULLEY.r, "hi"));
    out.push(faceDisc([cx, podFace, PULLEY.z], [0, 1, 0], 1.8, 2.7, 1.1, "hi"));
    out.push(faceCircle([cx, podFace + 2.7, PULLEY.z], [0, 1, 0], 1.9, "lo"));
    out.push(`<g class="pulley" data-pulley="${index}"></g>`);
    out.push(D([at([pod.x + 3, podFace, MECH_Z - 2]), at([pod.x + pod.w - 3, podFace, MECH_Z - 2])], { size: 0.38 }));
  }
  // Ремень: шкивы перекрывают заворот.
  const topZ = PULLEY.z + PULLEY.r + 1;
  const lowZ = PULLEY.z - PULLEY.r - 1;
  const x0 = MECH[0].x + 15;
  const x1 = MECH[2].x + 15;
  out.push(tube([[x0, podFace + 1.8, topZ], [x1, podFace + 1.8, topZ]], 0.8, { tone: "mid", maxLength: 28 }));
  out.push(tube([[x0, podFace + 1.8, lowZ], [x1, podFace + 1.8, lowZ]], 0.8, { tone: "mid", maxLength: 28 }));
  out.push(
    flowGroup("mechanism", [
      [x0, podFace + 1.8, topZ],
      [x1, podFace + 1.8, topZ],
    ]),
  );
  return out.join("");
}

// --- патрубки входа и выхода ------------------------------------------------

function inlet() {
  const out = [];
  const plan = TOWER_IN;
  const cx = plan.x + plan.w / 2;
  const face = plan.y + plan.d;
  out.push(
    S(k.slabOf({ x: plan.x - 2, y: plan.y - 2, w: plan.w + 4, d: plan.d + 4, r: 4 }, 0, 4, P, 5, 0.6), {
      tone: "lo",
    }),
  );
  out.push(S(k.slabOf(plan, 4, TOWER_Z - 4, P, 5, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 3), TOWER_Z, P, 5), { tone: "faint" }));
  out.push(L(faceQuad([plan.x + 3, face, 6], [1, 0, 0], [0, 0, 1], plan.w - 6, TOWER_Z - 12, { chamfer: 2 }), { tone: "faint" }));
  // Выходной фланец в сторону корпуса.
  const port = [plan.x + plan.w, 78, PIPE_Z];
  out.push(faceRing(port, [1, 0, 0], 0, 1.6, 2.6, 4.2, "hi"));
  out.push(faceCircle([port[0] + 1.6, port[1], port[2]], [1, 0, 0], 2.6, "lo"));
  out.push(bolts([port[0] + 1.6, port[1], port[2]], [1, 0, 0], 3.4, 4, { size: 0.34, phase: 0.7 }));
  // Маховик и манометр.
  out.push(S(k.cylinder(cx, plan.y + plan.d / 2, 3.4, TOWER_Z, 3.6, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(cx, plan.y + plan.d / 2, 5.8, TOWER_Z + 3.6, 3.4, P, 32), { tone: "mid", crease: "lo" }));
  out.push(L(k.knurl(cx, plan.y + plan.d / 2, 5.8, TOWER_Z + 3.6, TOWER_Z + 7, 22, P, 0.4), { tone: "lo" }));
  out.push(L(k.ring(cx, plan.y + plan.d / 2, 5.8, TOWER_Z + 7, P, 32), { tone: "hi" }));
  out.push(D([at([cx, plan.y + plan.d / 2, TOWER_Z + 7])], { size: 0.52 }));
  out.push(faceDisc([cx, face, 40], [0, 1, 0], 0, 1.6, 4.6, "hi"));
  out.push(faceCircle([cx, face + 1.6, 40], [0, 1, 0], 3.8, "lo"));
  out.push(L(k.pathOf([at([cx, face + 1.7, 40]), at([cx + 2.2, face + 1.7, 42])]), { tone: "hi" }));
  out.push(D([at([cx + 2.2, face + 1.7, 42])], { size: 0.34 }));
  out.push(D([at([plan.x + 4, face, 6]), at([plan.x + plan.w - 4, face, 6])], { size: 0.44 }));
  // Гребёнка: общий коллектор над передней панелью.
  out.push(tube([[port[0], 78, PIPE_Z], [-46, 78, PIPE_Z]], 2.4, { tone: "hi", maxLength: 14 }));
  out.push(faceRing([-46, 78, PIPE_Z], [1, 0, 0], 0, 1.4, 2.4, 3.8, "hi"));
  for (const x of INLET_X) {
    out.push(faceRing([x, 78, PIPE_Z], [0, 1, 0], 0, 1.3, 2.4, 3.7, "mid"));
  }
  return out.join("");
}

function tower(plan, direction) {
  const out = [];
  const cx = plan.x + plan.w / 2;
  out.push(
    S(k.slabOf({ x: plan.x - 2, y: plan.y - 2, w: plan.w + 4, d: plan.d + 4, r: 4 }, 0, 4, P, 5, 0.6), {
      tone: "lo",
    }),
  );
  out.push(S(k.slabOf(plan, 4, TOWER_Z - 4, P, 5, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 3), TOWER_Z, P, 5), { tone: "faint" }));
  const inner = direction > 0 ? plan.x + plan.w : plan.x;
  for (const y of PY) {
    out.push(faceRing([inner - direction * 1.4, y, PIPE_Z], [direction, 0, 0], 0, 1.4, 2.2, 3.5, "hi"));
    out.push(faceCircle([inner - direction * 1.4, y, PIPE_Z], [direction, 0, 0], 3.5, "lo"));
    out.push(bolts([inner - direction * 1.4, y, PIPE_Z], [direction, 0, 0], 2.8, 4, { size: 0.34, phase: 0.7 }));
  }
  out.push(S(k.cylinder(cx, 0, 3.4, TOWER_Z, 4, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(cx, 0, 6, TOWER_Z + 4, 3.6, P, 32), { tone: "mid", crease: "lo" }));
  out.push(L(k.knurl(cx, 0, 6, TOWER_Z + 4, TOWER_Z + 7.6, 22, P, 0.4), { tone: "lo" }));
  out.push(L(k.ring(cx, 0, 6, TOWER_Z + 7.6, P, 32), { tone: "hi" }));
  out.push(D([at([cx, 0, TOWER_Z + 7.6])], { size: 0.55 }));
  const outer = direction > 0 ? plan.x : plan.x + plan.w;
  out.push(tube([[outer, 0, 20], [outer - direction * 9, 0, 20]], 2.4, { tone: "hi", maxLength: 11 }));
  out.push(faceRing([outer, 0, 20], [-direction, 0, 0], 0, 1.6, 2.4, 4.2, "hi"));
  const face = plan.y + plan.d;
  out.push(faceDisc([cx, face, 30], [0, 1, 0], 0, 1.6, 4.6, "hi"));
  out.push(faceCircle([cx, face + 1.6, 30], [0, 1, 0], 3.8, "lo"));
  out.push(L(k.pathOf([at([cx, face + 1.7, 30]), at([cx + 2.2, face + 1.7, 32])]), { tone: "hi" }));
  out.push(D([at([cx + 2.2, face + 1.7, 32])], { size: 0.34 }));
  out.push(D([at([plan.x + 4, face, 6]), at([plan.x + plan.w - 4, face, 6])], { size: 0.44 }));
  return out.join("");
}

// --- колонна управления -----------------------------------------------------

function column() {
  const out = [];
  const { x, y } = COLUMN;
  out.push(S(k.slabOf({ x: x - 9, y: y - 7, w: 18, d: 14, r: 3 }, 0, 3, P, 4, 0.6), { tone: "lo" }));
  out.push(D([at([x - 6.5, y - 4.5, 3]), at([x + 6.5, y - 4.5, 3]), at([x + 6.5, y + 4.5, 3])], { size: 0.44 }));
  out.push(S(k.cylinder(x, y, 4.4, 3, 5, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, COLUMN.r, 8, COLUMN_TOP - 8, P, 24), { tone: "mid", crease: "faint" }));
  for (const z of [22, 62, 82]) {
    out.push(faceRing([x, y, z], [0, 0, 1], 0, 2.2, COLUMN.r, 4.6, "lo"));
  }
  out.push(S(k.cylinder(x, y, 5, COLUMN_TOP, 3, P, 28), { tone: "hi" }));
  out.push(S(k.cylinder(x, y, 2.2, COLUMN_TOP + 3, 4.4, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 7.4, COLUMN_TOP + 4.4, 3, P, 36), { tone: "mid", crease: "lo" }));
  out.push(L(k.knurl(x, y, 7.4, COLUMN_TOP + 4.4, COLUMN_TOP + 6.6, 30, P, 0.35), { tone: "lo" }));
  out.push(L(k.ring(x, y, 7.4, COLUMN_TOP + 7.4, P, 36), { tone: "hi" }));
  const dial = [x - 2.2, y + 6.6, COLUMN_TOP + 5.8];
  out.push(faceDisc(dial, [0, 1, 0.16], 0, 1.4, 4.8, "hi"));
  out.push(faceCircle([dial[0], dial[1] + 1.5, dial[2]], [0, 1, 0.16], 4, "lo"));
  out.push(
    L(k.pathOf([at([dial[0], dial[1] + 1.6, dial[2]]), at([dial[0] + 1.8, dial[1] + 1.6, dial[2] + 1.5])]), {
      tone: "hi",
    }),
  );
  out.push(D([at([dial[0] + 1.8, dial[1] + 1.6, dial[2] + 1.5])], { size: 0.32 }));
  out.push(faceRing([x, y + 4, CONTROL_Z], [0, 1, 0], 0, 1.8, 2.6, 4.2, "hi"));
  out.push(D([at([x - 3, y + 4.6, CONTROL_Z + 2]), at([x + 3, y + 4.6, CONTROL_Z + 2])], { size: 0.4 }));
  return out.join("");
}

function controlBundle() {
  const out = [];
  out.push(tube([[-60, -78, CONTROL_Z], [-60, -62, CONTROL_Z]], 2.6, { tone: "hi", maxLength: 8 }));
  for (const y of [-72, -66]) {
    out.push(faceRing([-60, y, CONTROL_Z], [0, 0, 1], 2.6, 3.4, 1.2, 3.6, "mid"));
  }
  out.push(flowGroup("control", ROUTES.control));
  return out.join("");
}

// --- панели-фартуки ---------------------------------------------------------

function apronBody({ origin, u, v, normal, w, h, name, extra = "" }) {
  const out = [];
  out.push(facePlate(origin, u, v, normal, w, h, APRON_T, { tone: "mid", round: 2, steps: 5 }));
  out.push(L(faceQuad(origin, u, v, w, h, { inset: 3.2, chamfer: 1.6 }), { tone: "faint" }));
  out.push(L(faceQuad(origin, u, v, w, h, { inset: 5.4, chamfer: 1.6 }), { tone: "faint" }));
  // Верхний и нижний рельсы хода.
  const rail = (offset) =>
    L(
      k.segment(
        add(origin, mul(v, offset)),
        add(origin, add(mul(u, w), mul(v, offset))),
        P,
      ),
      { tone: "hi" },
    );
  out.push(rail(1.4), rail(h - 1.4));
  // Вертикальные рёбра жёсткости.
  for (const t of [0.24, 0.5, 0.76]) {
    out.push(
      L(
        k.segment(
          add(origin, mul(u, w * t)),
          add(origin, add(mul(u, w * t), mul(v, h))),
          P,
        ),
        { tone: "faint" },
      ),
    );
  }
  const screws = [
    [4.4, 4.4],
    [w - 4.4, 4.4],
    [w - 4.4, h - 4.4],
    [4.4, h - 4.4],
  ].map(([a, b]) => at(add(add(origin, mul(u, a)), mul(v, b))));
  out.push(D(screws, { size: 0.44 }));
  out.push(extra);
  return `<g data-apron="${name}" transform="${k.translateAlong(P, [0, 0, 0])}">${out.join("")}</g>`;
}

function grommet(center, axis, r) {
  const out = [];
  out.push(faceRing(center, axis, 0, 1.8, r - 1.1, r, "hi"));
  out.push(faceCircle(add(center, mul(axis, 1.8)), axis, r - 1.1, "lo"));
  out.push(bolts(add(center, mul(axis, 1.8)), axis, r + 2.6, 4, { size: 0.32, phase: 0.7 }));
  out.push(faceCircle(center, axis, r + 2.8, "faint"));
  return out.join("");
}

function aprons() {
  const h = APRON_Z1 - APRON_Z0;
  const left = apronBody({
    origin: [INNER.x0 + APRON_T, INNER.y0, APRON_Z0],
    u: [0, 1, 0],
    v: [0, 0, 1],
    normal: [-1, 0, 0],
    w: INNER.y1 - INNER.y0,
    h,
    name: "left",
    extra: PY.map((y) => grommet([INNER.x0 + APRON_T, y, PIPE_Z], [1, 0, 0], 3.4)).join(""),
  });
  const right = apronBody({
    origin: [INNER.x1, INNER.y0, APRON_Z0],
    u: [0, 1, 0],
    v: [0, 0, 1],
    normal: [-1, 0, 0],
    w: INNER.y1 - INNER.y0,
    h,
    name: "right",
    extra: PY.map((y) => grommet([INNER.x1, y, PIPE_Z], [1, 0, 0], 3.4)).join(""),
  });
  const front = apronBody({
    origin: [INNER.x0, INNER.y1, APRON_Z0],
    u: [1, 0, 0],
    v: [0, 0, 1],
    normal: [0, -1, 0],
    w: INNER.x1 - INNER.x0,
    h,
    name: "front",
    extra: frontPlate() + INLET_X.map((x) => grommet([x, INNER.y1, PIPE_Z], [0, 1, 0], 3.4)).join(""),
  });
  const back = apronBody({
    origin: [INNER.x0, INNER.y0 + APRON_T, APRON_Z0],
    u: [1, 0, 0],
    v: [0, 0, 1],
    normal: [0, -1, 0],
    w: INNER.x1 - INNER.x0,
    h,
    name: "back",
    extra: grommet([-60, INNER.y0 + APRON_T, CONTROL_Z], [0, 1, 0], 4.2),
  });
  return { left, right, front, back };
}

function frontPlate() {
  const out = [];
  const origin = [-32, INNER.y1, APRON_Z0 + 5];
  out.push(facePlate(origin, [1, 0, 0], [0, 0, 1], [0, -1, 0], 64, 12, 1.2, { tone: "hi", round: 1.2 }));
  out.push(
    L(
      [44, 32, 20]
        .map((len, i) => k.segment([origin[0] + 4, origin[1] + 1.2, origin[2] + 8 - i * 3], [origin[0] + 4 + len, origin[1] + 1.2, origin[2] + 8 - i * 3], P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(D([at([origin[0] + 56, origin[1] + 1.2, origin[2] + 8]), at([origin[0] + 58, origin[1] + 1.2, origin[2] + 8])], { size: 0.38 }));
  return out.join("");
}

// --- кожух-крышка -----------------------------------------------------------

function cover() {
  const out = [];
  const outer = COVER;
  const z0 = COVER_Z0;
  const z1 = COVER_TOP;
  // Стенки кожуха.
  out.push(S(k.slabOf({ x: outer.x, y: outer.y + outer.d - COVER_T, w: outer.w, d: COVER_T }, z0, z1 - z0, P, 5, 0.8), { tone: "hi", crease: "mid" }));
  out.push(S(k.slabOf({ x: outer.x, y: outer.y, w: outer.w, d: COVER_T }, z0, z1 - z0, P, 5, 0.8), { tone: "hi", crease: "mid" }));
  out.push(S(k.slabOf({ x: outer.x, y: outer.y + COVER_T, w: COVER_T, d: outer.d - COVER_T * 2 }, z0, z1 - z0, P, 5, 0.8), { tone: "hi", crease: "mid" }));
  out.push(S(k.slabOf({ x: outer.x + outer.w - COVER_T, y: outer.y + COVER_T, w: COVER_T, d: outer.d - COVER_T * 2 }, z0, z1 - z0, P, 5, 0.8), { tone: "hi", crease: "mid" }));

  // Накладные панели на стенках кожуха.
  const faces = [
    { origin: [outer.x + 10, outer.y + outer.d, z0 + 7], u: [1, 0, 0], v: [0, 0, 1], normal: [0, 1, 0], w: outer.w - 20, h: z1 - z0 - 14 },
    { origin: [outer.x, outer.y + 10, z0 + 7], u: [0, 1, 0], v: [0, 0, 1], normal: [-1, 0, 0], w: outer.d - 20, h: z1 - z0 - 14 },
    { origin: [outer.x + outer.w, outer.y + 10, z0 + 7], u: [0, 1, 0], v: [0, 0, 1], normal: [-1, 0, 0], w: outer.d - 20, h: z1 - z0 - 14 },
  ];
  for (const face of faces) {
    out.push(facePlate(face.origin, face.u, face.v, face.normal, face.w, face.h, 0.9, { tone: "mid", round: 2 }));
    out.push(L(faceQuad(face.origin, face.u, face.v, face.w, face.h, { inset: 3, chamfer: 2 }), { tone: "faint" }));
    const screws = [
      [4, 4],
      [face.w - 4, 4],
      [face.w - 4, face.h - 4],
      [4, face.h - 4],
    ].map(([a, b]) => at(add(add(face.origin, mul(face.u, a)), add(mul(face.v, b), mul(face.normal, 0.9)))));
    out.push(D(screws, { size: 0.44 }));
  }

  // Швы и рёбра на стенках кожуха.
  const seamLines = [];
  for (const z of [z0 + 4, z1 - 4]) {
    seamLines.push(k.segment([outer.x + 6, outer.y + outer.d, z], [outer.x + outer.w - 6, outer.y + outer.d, z], P));
    seamLines.push(k.segment([outer.x + 6, outer.y, z], [outer.x + outer.w - 6, outer.y, z], P));
    seamLines.push(k.segment([outer.x, outer.y + 6, z], [outer.x, outer.y + outer.d - 6, z], P));
    seamLines.push(k.segment([outer.x + outer.w, outer.y + 6, z], [outer.x + outer.w, outer.y + outer.d - 6, z], P));
  }
  out.push(L(seamLines.join(""), { tone: "faint", free: true }));
  out.push(facePlate([-30, outer.y + outer.d + 0.9, z0 + 10], [1, 0, 0], [0, 0, 1], [0, 1, 0], 58, 10, 1, { tone: "hi", round: 1.2 }));
  out.push(
    L(
      [38, 26, 14]
        .map((len, i) => k.segment([-26, outer.y + outer.d + 1.9, z0 + 16.6 - i * 2.5], [-26 + len, outer.y + outer.d + 1.9, z0 + 16.6 - i * 2.5], P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  out.push(D([at([-25, outer.y + outer.d + 1.9, z0 + 12]), at([-22, outer.y + outer.d + 1.9, z0 + 12])], { size: 0.4 }));
  out.push(
    D(
      [
        at([COVER.x + 6, outer.y + outer.d, z0 + 6]),
        at([COVER.x + outer.w - 6, outer.y + outer.d, z0 + 6]),
        at([COVER.x + 6, outer.y + outer.d, z1 - 6]),
        at([COVER.x + outer.w - 6, outer.y + outer.d, z1 - 6]),
      ],
      { size: 0.44 },
    ),
  );

  // Верх кожуха.
  out.push(S(k.slabOf(outer, z1, COVER_H, P, 10, 1.4), { tone: "hi", crease: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(outer, 5), z1 + COVER_H, P, 10), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(outer, 9), z1 + COVER_H, P, 10), { tone: "faint" }));
  const topScrews = k.corners(k.insetPlan(outer, 13), 0);
  out.push(L(topScrews.map(([x, y]) => k.ring(x, y, 1.9, z1 + COVER_H, P, 16)).join(""), { tone: "lo" }));
  out.push(D(topScrews.map(([x, y]) => at([x, y, z1 + COVER_H])), { size: 0.42 }));
  // Верхняя панель кожуха.
  const panel = { x: -64, y: -42, w: 120, d: 66, r: 5 };
  out.push(S(k.slabOf(panel, z1 + COVER_H, 2.4, P, 6, 0.9), { tone: "mid", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(panel, 4), z1 + COVER_H + 2.4, P, 6), { tone: "faint" }));
  // Вентиляционные щели на верхней панели: закрытые пазы.
  const vents = [];
  for (let i = 0; i < 6; i++) {
    const y = -34 + i * 4.6;
    vents.push(
      k.onTop(
        [
          [30, y - 0.9],
          [50, y - 0.9],
          [50, y + 0.9],
          [30, y + 0.9],
        ],
        z1 + COVER_H + 2.4,
        P,
        true,
      ),
    );
  }
  out.push(L(vents.join(""), { tone: "lo" }));
  // Табличка на крышке.
  out.push(S(k.slabOf({ x: -56, y: -20, w: 76, d: 9, r: 1 }, z1 + COVER_H + 2.4, 0.8, P, 4), { tone: "mid", crease: "none" }));
  out.push(
    L(
      [34, 22]
        .map((len, i) => k.lineOnTop([-52, -17 + i * 4.2], [-52 + len, -17 + i * 4.2], z1 + COVER_H + 3.2, P))
        .join(""),
      { tone: "lo", free: true },
    ),
  );
  // Рым.
  out.push(S(k.cylinder(EYE.x + 14, EYE.y + 6, 5, z1 + COVER_H + 2.4, 1.4, P, 24), { tone: "lo" }));
  out.push(faceRing([EYE.x + 14, EYE.y + 3.4, z1 + COVER_H + 5.4], [0, 1, 0], 0, 1.5, 2.2, 3.8, "hi"));
  out.push(faceCircle([EYE.x + 14, EYE.y + 7.5, z1 + COVER_H + 5.4], [0, 1, 0], 2.2, "lo"));
  out.push(S(k.cylinder(EYE.x + 14, EYE.y + 6, 1.3, z1 + COVER_H + 2.4, 3.2, P, 18), { tone: "mid" }));
  // Уши на направляющих.
  for (const [x, y] of EARS) {
    out.push(S(k.cylinder(x, y, 5.6, z1, COVER_H + 2.6, P, 28), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 4.5, z1 + COVER_H + 2.6, 3, P, 24), { tone: "hi" }));
    out.push(L(k.ring(x, y, 4.5, z1 + COVER_H + 5.6, P, 24), { tone: "hi" }));
    out.push(L(k.ring(x, y, 5.6, z1, P, 28), { tone: "lo" }));
  }
  return `<g data-cover="1" transform="${k.translateAlong(P, [0, 0, 0])}">${out.join("")}</g>`;
}

const COVER_T = APRON_T;

function posts() {
  const out = [];
  for (const [x, y] of POSTS) {
    out.push(S(k.cylinder(x, y, POST_R + 2.6, 0, 3.4, P, 24), { tone: "lo" }));
    out.push(D([at([x - 2.4, y, 3.4]), at([x + 2.4, y, 3.4])], { size: 0.42 }));
    out.push(S(k.cylinder(x, y, POST_R, 3.4, POST_TOP - 3.4, P, 22), { tone: "mid", crease: "faint" }));
    for (const z of [16, 50, 96]) {
      out.push(faceRing([x, y, z], [0, 0, 1], 0, 2.2, POST_R, 4.2, "lo"));
    }
    out.push(S(k.cylinder(x, y, POST_R + 1.2, POST_TOP, 2.4, P, 22), { tone: "hi" }));
    out.push(L(k.ring(x, y, POST_R + 1.2, POST_TOP + 2.4, P, 22), { tone: "hi" }));
    out.push(D([at([x, y, POST_TOP + 2.4])], { size: 0.5 }));
  }
  return out.join("");
}

// --- подпроцессы и инструменты ----------------------------------------------

function blockBase(cx, index) {
  const out = [];
  out.push(S(k.slabOf({ x: cx - 14, y: -19, w: 28, d: 38, r: 2 }, SUB.z0, 2, P, 4, 0.5), { tone: "lo" }));
  out.push(
    S(k.slabOf({ x: cx - 12.5, y: -17.5, w: 25, d: 35, r: 1.6 }, SUB.z0 + 2, 14.5, P, 4, 1), {
      tone: "hi",
      crease: "mid",
    }),
  );
  out.push(
    S(k.slabOf({ x: cx - 11.5, y: -16.5, w: 23, d: 33, r: 1.4 }, SUB.z0 + 16.5, 2.5, P, 4, 0.5), {
      tone: "hi",
      crease: "lo",
    }),
  );
  out.push(L(k.planOutline(k.insetPlan({ x: cx - 10, y: -15, w: 20, d: 30, r: 1 }, 1), SUB.z1, P, 4), { tone: "faint" }));
  out.push(D([at([cx - 7.5, -13.5, SUB.z1]), at([cx + 7.5, -13.5, SUB.z1]), at([cx + 7.5, 13.5, SUB.z1])], { size: 0.38 }));
  // Окно на передней грани.
  out.push(L(faceQuad([cx - 7, 18.6, 31], [1, 0, 0], [0, 0, 1], 14, 8, { chamfer: 1.2 }), { tone: "lo" }));
  // Порты цепи и гнездо управления.
  if (index < 3) {
    out.push(faceRing([cx + 12.5, 0, FLOW_Z], [1, 0, 0], 0, 1.2, 2.2, 3.4, "hi"));
    out.push(faceCircle([cx + 13.7, 0, FLOW_Z], [1, 0, 0], 2.2, "lo"));
  }
  if (index > 0) {
    out.push(faceRing([cx - 7, 17.5, FLOW_Z], [0, 1, 0], 0, 1.2, 2.2, 3.4, "hi"));
    out.push(faceCircle([cx - 7, 18.7, FLOW_Z], [0, 1, 0], 2.2, "lo"));
  }
  out.push(faceRing([cx, -12, SUB.z1], [0, 0, 1], 0, 1.2, 2.4, 4.2, "mid"));
  out.push(faceCircle([cx, -12, SUB.z1 + 1.2], [0, 0, 1], 2.4, "lo"));
  out.push(D([at([cx - 3.4, -12, SUB.z1]), at([cx + 3.4, -12, SUB.z1])], { size: 0.34 }));
  return out.join("");
}

function toolCheck(cx) {
  const out = [];
  out.push(S(k.slabOf({ x: cx - 12, y: -13, w: 7, d: 7, r: 1 }, SUB.z1, 1.2, P, 4), { tone: "mid" }));
  out.push(S(k.cylinder(cx - 8.5, -9.5, 1.6, SUB.z1 + 1.2, 8, P, 18), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(cx - 8.5, -9.5, 1.6, SUB.z1 + 5.4, SUB.z1 + 7.6, 12, P, 0.3), { tone: "lo" }));
  out.push(
    tube(
      [
        [cx - 8.5, -9.5, SUB.z1 + 8.6],
        [cx - 5, -5, SUB.z1 + 8.6],
        [cx - 2.5, 0, SUB.z1 + 8.6],
      ],
      1.1,
      { tone: "hi", maxLength: 8 },
    ),
  );
  out.push(S(G.sphereOf([cx - 2.5, 0, SUB.z1 + 8.6], 1.5, P), { tone: "hi" }));
  const n = [0.42, 0.46, 0.78];
  const lens = [cx - 2.5, 1.4, SUB.z1 + 5.9];
  out.push(
    `<g data-lens="1" transform="${k.translateAlong(P, [0, 0, 0])}">` +
      tube([[cx - 2.5, 0, SUB.z1 + 7.4], [cx - 2.5, 1.4, SUB.z1 + 6.9]], 1.1, { tone: "hi", maxLength: 4 }) +
      faceRing(lens, n, 0, 1.4, 3.5, 4.6, "hi") +
      faceDisc(lens, n, 0.35, 1.05, 3.5, "lo") +
      faceCircle(add(lens, mul(n, 1.4)), n, 4.6, "lo") +
      D([at(add(lens, mul(n, 1.4)))], { size: 0.28 }) +
      `</g>`,
  );
  return out.join("");
}

function toolApprove(cx) {
  const out = [];
  for (const dx of [-8, 8]) {
    out.push(S(k.slabOf({ x: cx + dx - 3, y: -1, w: 6, d: 9, r: 1 }, SUB.z1, 1.2, P, 4), { tone: "lo" }));
    out.push(S(k.cylinder(cx + dx, 3.5, 1.5, SUB.z1 + 1.2, 7, P, 18), { tone: "hi", crease: "lo" }));
    out.push(L(k.ring(cx + dx, 3.5, 1.5, SUB.z1 + 1.2, P, 18), { tone: "lo" }));
  }
  out.push(
    S(k.slabOf({ x: cx - 11, y: -1, w: 22, d: 9, r: 1.4 }, SUB.z1 + 8.2, 2, P, 4, 0.6), {
      tone: "hi",
      crease: "mid",
    }),
  );
  out.push(L(k.planOutline(k.insetPlan({ x: cx - 10, y: 0, w: 20, d: 7, r: 1 }, 1), SUB.z1 + 10.2, P, 4), { tone: "faint" }));
  out.push(faceCircle([cx, 3.5, SUB.z1 + 10.2], [0, 0, 1], 2.3, "lo"));
  out.push(S(k.cylinder(cx, 3.5, 1.2, SUB.z1 + 2, 6.4, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(cx, 3.5, 3.8, SUB.z1 + 10.2, 2.2, P, 28), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(cx, 3.5, 3.8, SUB.z1 + 10.2, SUB.z1 + 12.4, 20, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(cx, 3.5, 3.8, SUB.z1 + 12.4, P, 28), { tone: "hi" }));
  out.push(
    `<g data-ram="1" transform="${k.translateAlong(P, [0, 0, 0])}">` +
      S(k.slabOf({ x: cx - 6.5, y: -1, w: 13, d: 9, r: 1.2 }, SUB.z1 + 1.4, 1.7, P, 4, 0.4), { tone: "hi", crease: "mid" }) +
      S(k.cylinder(cx, 3.5, 2.7, SUB.z1 + 3.1, 2.3, P, 22), { tone: "mid" }) +
      L(k.ring(cx, 3.5, 2.7, SUB.z1 + 5.4, P, 22), { tone: "lo" }) +
      `</g>`,
  );
  out.push(D([at([cx - 9, 1, SUB.z1 + 10.2]), at([cx + 9, 1, SUB.z1 + 10.2])], { size: 0.36 }));
  return out.join("");
}

function toolWrite(cx) {
  const out = [];
  out.push(S(k.slabOf({ x: cx - 7, y: 1, w: 14, d: 12, r: 1.2 }, SUB.z1, 1.4, P, 4), { tone: "lo" }));
  for (const dx of [-7.5, 7.5]) {
    out.push(S(k.slabOf({ x: cx + dx - 1.3, y: 2, w: 2.6, d: 10, r: 1 }, SUB.z1 + 1.4, 5.6, P, 3), { tone: "mid" }));
  }
  const F = G.frameAlong([cx - 6, 7, SUB.z1 + 8], [1, 0, 0]);
  out.push(S(G.disc(0, 12, 5, F, P), { tone: "mid", crease: "lo" }));
  out.push(S(G.ringBand(-0.6, 0.6, 4.4, 5.6, F, P), { tone: "hi" }));
  out.push(S(G.ringBand(11.4, 12.6, 4.4, 5.6, F, P), { tone: "hi" }));
  out.push(L(G.circleOf(F, 0, 5.6, P), { tone: "hi" }));
  out.push(L(G.circleOf(G.frameAlong([cx + 6, 7, SUB.z1 + 8], [1, 0, 0]), 0, 5.6, P), { tone: "hi" }));
  out.push(S(k.cylinder(cx - 6, 7, 1.1, SUB.z1 + 8, 1.4, P, 14), { tone: "lo" }));
  out.push(`<g data-drum-lines="1"></g>`);
  // Бумажное полотно в лоток.
  const web = webBand(
    [
      [cx, 12.2, SUB.z1 + 8],
      [cx, 19, SUB.z1 + 6.6],
      [cx, 22.4, SUB.z1 + 6.6],
      [cx, 34, PAPER_Z + 0.4],
    ],
    5,
  );
  out.push(`<path class="iso-fill" d="${web.outline}"/>`);
  out.push(L(web.outline, { tone: "mid" }));
  out.push(L(web.edges, { tone: "faint" }));
  out.push(S(k.cylinder(cx, 22.4, 1.5, SUB.z1 + 5.1, 3, P, 18), { tone: "mid" }));
  return out.join("");
}

function toolNotice(cx) {
  const out = [];
  for (const dx of [-8, 8]) {
    out.push(S(k.slabOf({ x: cx + dx - 2.4, y: 0, w: 4.8, d: 9, r: 1 }, SUB.z1, 1.2, P, 4), { tone: "lo" }));
    out.push(S(k.cylinder(cx + dx, 4.5, 1.5, SUB.z1 + 1.2, 7.4, P, 18), { tone: "hi", crease: "lo" }));
  }
  out.push(
    S(k.slabOf({ x: cx - 11, y: 0, w: 22, d: 9, r: 1.4 }, SUB.z1 + 8.6, 2, P, 4, 0.6), {
      tone: "hi",
      crease: "mid",
    }),
  );
  out.push(S(k.cylinder(cx, 4.5, 1.2, SUB.z1 + 7.8, 1.4, P, 16), { tone: "mid" }));
  const bell = [
    [0, 7],
    [0.5, 7],
    [1.6, 6.6],
    [4.2, 5.2],
    [6.8, 3.2],
    [8, 2],
    [8.4, 1.2],
    [8.4, 0],
  ].map(([s, r]) => [s, r, s > 0.6 && s < 8 ? 1 : 0]);
  out.push(
    S(G.lathe(bell, G.frameAlong([cx, 4.5, SUB.z1 + 1.4], [0, 0, 1]), P, { smooth: true, bevel: 0.3 }), {
      tone: "hi",
      crease: "lo",
    }),
  );
  out.push(L(G.circleOf(G.frameAlong([cx, 4.5, SUB.z1 + 1.4], [0, 0, 1]), 0, 7, P), { tone: "hi" }));
  const pivot = [cx + 12.5, -3.5, SUB.z1 + 5.4];
  out.push(S(k.slabOf({ x: cx + 9.6, y: -7.2, w: 5.8, d: 7, r: 1 }, SUB.z1, 1.4, P, 4), { tone: "lo" }));
  out.push(S(k.cylinder(pivot[0], pivot[1], 1.5, SUB.z1 + 1.4, 4, P, 16), { tone: "hi" }));
  out.push(D([at(pivot)], { size: 0.44 }));
  out.push(`<g data-striker="1"><path class="iso-line" data-tone="hi" d=""/><circle class="striker-ball" r="1.4"/></g>`);
  return out.join("");
}

function blocks() {
  return SUB_X.map((cx, index) => {
    const key = ["check", "approve", "write", "notice"][index];
    const tool = [toolCheck, toolApprove, toolWrite, toolNotice][index](cx);
    return `<g class="block" data-block="${key}">${blockBase(cx, index)}${tool}</g>`;
  }).join("");
}

// --- связи, журнал, управление ----------------------------------------------

function links() {
  const out = [];
  for (const key of ["check-approve", "approve-write", "write-notice"]) {
    const points = ROUTES[key][0];
    const shape = route(points, 4.5);
    out.push(tube(shape, 2.2, { tone: "hi", maxLength: 14 }));
    out.push(faceRing(points[0], [1, 0, 0], 0, 1.3, 2.2, 3.5, "hi"));
    out.push(faceRing(points[points.length - 1], [0, 1, 0], 0, 1.3, 2.2, 3.5, "hi"));
    out.push(flowGroup(key, shape));
  }
  return out.join("");
}

function pipesInFar() {
  const out = [];
  for (const x of INLET_X) {
    out.push(tube([[x, 78, PIPE_Z], [x, INNER.y1, PIPE_Z]], 2.2, { tone: "hi", maxLength: 16 }));
    out.push(flowGroup("in", [[x, 78, PIPE_Z], [x, INNER.y1, PIPE_Z]]));
  }
  return out.join("");
}

function pipesInNear() {
  const out = [];
  for (const x of INLET_X) {
    out.push(tube([[x, INNER.y1 - APRON_T, PIPE_Z], [x, 18, PIPE_Z]], 2.2, { tone: "hi", maxLength: 16 }));
    out.push(faceRing([x, 18, PIPE_Z], [0, 1, 0], 0, 1.4, 2.2, 3.5, "hi"));
    out.push(faceCircle([x, 19.4, PIPE_Z], [0, 1, 0], 2.2, "lo"));
    out.push(flowGroup("in", [[x, INNER.y1 - APRON_T, PIPE_Z], [x, 18, PIPE_Z]]));
  }
  return out.join("");
}

function pipesOutNear() {
  const out = [];
  for (const y of PY) {
    out.push(tube([[67, y, PIPE_Z], [INNER.x1 - APRON_T, y, PIPE_Z]], 2.2, { tone: "hi", maxLength: 16 }));
    out.push(faceRing([67, y, PIPE_Z], [1, 0, 0], 0, 1.4, 2.2, 3.5, "hi"));
    out.push(faceCircle([67 + 1.4, y, PIPE_Z], [1, 0, 0], 2.2, "lo"));
    out.push(flowGroup("out", [[67, y, PIPE_Z], [INNER.x1 - APRON_T, y, PIPE_Z]]));
  }
  return out.join("");
}

function pipesOutFar() {
  const out = [];
  for (const y of PY) {
    out.push(tube([[INNER.x1, y, PIPE_Z], [120, y, PIPE_Z]], 2.2, { tone: "hi", maxLength: 16 }));
    out.push(flowGroup("out", [[INNER.x1, y, PIPE_Z], [120, y, PIPE_Z]]));
  }
  return out.join("");
}

function journal() {
  const out = [];
  out.push(
    S(k.slabOf({ x: JOURNAL.x, y: JOURNAL.y, w: JOURNAL.w, d: JOURNAL.d, r: 0.5 }, PAPER_Z, 0.45, P, 4), {
      tone: "hi",
      flat: true,
      crease: "none",
    }),
  );
  const rules = [];
  for (const y of [JOURNAL.y + 2.4, JOURNAL.y + JOURNAL.d - 2.4]) {
    rules.push(k.lineOnTop([JOURNAL.x + 2, y], [JOURNAL.x + JOURNAL.w - 2, y], PAPER_Z + 0.45, P));
  }
  for (let x = JOURNAL.x + 8; x < JOURNAL.x + JOURNAL.w - 4; x += 10) {
    rules.push(k.lineOnTop([x, JOURNAL.y + 1.6], [x, JOURNAL.y + JOURNAL.d - 1.6], PAPER_Z + 0.45, P));
  }
  out.push(L(rules.join(""), { tone: "faint", free: true }));
  // След от каждого подпроцесса.
  for (const cx of SUB_X) {
    const x = cx + 9;
    out.push(tube([[x, 18, 34], [x, 26, 35.4], [x, 33, PAPER_Z + 0.5]], 0.55, { tone: "mid", maxLength: 6, spacing: 0.8 }));
    out.push(D([at([x, 33, PAPER_Z + 0.5])], { size: 0.85, tone: "hi" }));
  }
  return out.join("");
}

function control() {
  const out = [];
  out.push(S(k.slabOf(RAIL, RAIL.z0, RAIL.z1 - RAIL.z0, P, 4, 0.6), { tone: "mid" }));
  for (const x of [-58, -18, 18, 58]) {
    out.push(S(k.cylinder(x, RAIL.y + RAIL.d / 2, 1.6, RAIL.z1, 1.2, P, 16), { tone: "hi" }));
  }
  out.push(tube(route(ROUTES["control-in"][0], 4), 2.6, { tone: "hi", maxLength: 9 }));
  out.push(flowGroup("control-in", route(ROUTES["control-in"][0], 4)));
  for (const cx of SUB_X) {
    const points = [
      [cx, RAIL.y + 1, 61],
      [cx, -36, 57],
      [cx, -22, 51],
      [cx, -12, SUB.z1 + 2.6],
    ];
    out.push(tube(points, 1.15, { tone: "mid", maxLength: 7, spacing: 1 }));
    out.push(faceRing([cx, -12, SUB.z1 + 2.6], [0, 0, 1], 0, 1.2, 1.15, 2.4, "hi"));
  }
  return out.join("");
}

// --- сборка -----------------------------------------------------------------

const parts = aprons();

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An exploded process block on guide posts above a heavy base plate. A high cover rides four corner posts; four low panels slide apart below it. Inside stand four smaller process blocks: an inspection block with a magnifier, an approval block with a screw press, a register block with a paper drum and a notice block with a bell. Inlet pipes arrive from a manifold on the left, outlet pipes leave to a manifold on the right, a control column stands behind the case and carries a harness down to four sockets, and three drive pods with pulleys and a belt are set into the front of the pedestal.",
  body: [
    plate(),
    column(),
    controlBundle(),
    inlet(),
    tower(TOWER_OUT, -1),
    pedestal(),
    mechanism(),
    cassette(),
    parts.back,
    parts.left,
    pipesInFar(),
    pipesInNear(),
    control(),
    blocks(),
    links(),
    journal(),
    pipesOutNear(),
    parts.right,
    pipesOutFar(),
    parts.front,
    cover(),
    posts(),
  ],
});

// --- поведение --------------------------------------------------------------

const live = `
const P = ${JSON.stringify(P)};
const V = ${JSON.stringify(VIEW)};
const STEPS = ${JSON.stringify(STEPS.map((step) => ({ key: step.key, label: step.label, readout: step.readout })))};
const SHOWN = ${JSON.stringify(SHOWN)};
const LIFT = ${COVER_LIFT};
const SLIDE = ${APRON_SLIDE};
const BACK_SLIDE = ${BACK_SLIDE};
const DRUM = ${JSON.stringify({ x: 18, y: 7, z: SUB.z1 + 8, r: 5, half: 6 })};
const STRIKER = ${JSON.stringify({ x: 67, y: -3.5, z: SUB.z1 + 5.4, tipX: 60.5, tipY: 3.5 })};
const PULLEYS = ${JSON.stringify(MECH.map((pod) => ({ x: pod.x + pod.w / 2, y: PLINTH.y + PLINTH.d + 5 + 2.75, z: PULLEY.z, r: PULLEY.r })))};
const N = STEPS.length;
const OPEN_AT = 3;

const stage = document.querySelector(".iso-stage");
const holder = stage.querySelector("svg");
const coverEl = holder.querySelector("[data-cover]");
const apronEls = {
  left: holder.querySelector('[data-apron="left"]'),
  right: holder.querySelector('[data-apron="right"]'),
  front: holder.querySelector('[data-apron="front"]'),
  back: holder.querySelector('[data-apron="back"]'),
};
const blockEls = Array.from(holder.querySelectorAll("[data-block]"));
const lens = holder.querySelector("[data-lens]");
const ram = holder.querySelector("[data-ram]");
const drumLines = holder.querySelector("[data-drum-lines]");
const striker = holder.querySelector("[data-striker]");
const strikerArm = striker.querySelector("path");
const strikerBall = striker.querySelector("circle");
const pulleyMarks = Array.from(holder.querySelectorAll("[data-pulley]"));
const flowEls = Array.from(holder.querySelectorAll("[data-flow]"));
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const near = (a, b) => Math.abs(a - b) < 0.005;
const ease = (cur, target, tau, dt) => {
  const next = cur + (target - cur) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 0.003 ? target : next;
};
const path = (points) => points.map((point, index) => (index ? "L" : "M") + iso(point, P).map((n) => n.toFixed(1)).join(" ")).join("");

let step = 0;
let open = 0;
let lensMove = 0;
let ramMove = 0;
let spin = 0;
let strike = 0;
let tap = 0;
let frame = 0;
let last = 0;
let clock = 0;
let touring = true;
let visible = false;
let idleTimer = 0;
const tourAt = (t) => Math.floor(t / 4.4) % N;

function plan(to) {
  step = to;
  if (to === 7) tap = 0.0001;
}

function targets() {
  return {
    open: step >= OPEN_AT ? 1 : 0,
    lens: step === 4 ? 1 : 0,
    ram: step === 5 ? 1 : 0,
  };
}

function applyState() {
  const shown = SHOWN[STEPS[step].key] || { flow: [], lit: [] };
  for (const block of blockEls) {
    block.classList.toggle("is-lit", shown.lit.includes(block.dataset.block));
  }
  for (const flow of flowEls) {
    flow.classList.toggle("is-on", shown.flow.includes(flow.dataset.flow));
  }
  const text = STEPS[step].readout;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(step));
  stage.setAttribute("aria-valuetext", "шаг " + (step + 1) + " из " + N + ": " + STEPS[step].label + ", " + text);
}

function drawFrame() {
  coverEl.setAttribute("transform", translateAlong(P, [0, 0, open * LIFT]));
  apronEls.left.setAttribute("transform", translateAlong(P, [-open * SLIDE, 0, 0]));
  apronEls.right.setAttribute("transform", translateAlong(P, [open * SLIDE, 0, 0]));
  apronEls.front.setAttribute("transform", translateAlong(P, [0, open * SLIDE, 0]));
  apronEls.back.setAttribute("transform", translateAlong(P, [0, -open * BACK_SLIDE, 0]));
  lens.setAttribute("transform", translateAlong(P, [0, lensMove * 2.4, -lensMove * 3.4]));
  ram.setAttribute("transform", translateAlong(P, [0, 0, -ramMove * 2.2]));
  let lines = "";
  for (let i = 0; i < 10; i++) {
    const angle = spin + (i / 10) * Math.PI * 2;
    if (Math.cos(angle) * V[1] + Math.sin(angle) * V[2] <= 0.05) continue;
    const cy = DRUM.y + Math.cos(angle) * (DRUM.r + 0.05);
    const cz = DRUM.z + Math.sin(angle) * (DRUM.r + 0.05);
    lines += path([
      [DRUM.x - DRUM.half, cy, cz],
      [DRUM.x + DRUM.half, cy, cz],
    ]);
  }
  if (drumLines.dataset.d !== lines) {
    drumLines.innerHTML = '<path class="iso-line" data-tone="lo" d="' + lines + '"/>';
    drumLines.dataset.d = lines;
  }
  // Молоток у колокола: качание в плане вокруг стойки.
  const base = Math.atan2(STRIKER.tipY - STRIKER.y, STRIKER.tipX - STRIKER.x);
  const radius = Math.hypot(STRIKER.tipX - STRIKER.x, STRIKER.tipY - STRIKER.y);
  const swing = Math.sin(tap * Math.PI) * 0.3;
  const angle = base + swing;
  const tip = [STRIKER.x + Math.cos(angle) * radius, STRIKER.y + Math.sin(angle) * radius, STRIKER.z];
  strikerArm.setAttribute("d", path([[STRIKER.x, STRIKER.y, STRIKER.z], tip]));
  const guard = iso(tip, P);
  strikerBall.setAttribute("cx", guard[0].toFixed(1));
  strikerBall.setAttribute("cy", guard[1].toFixed(1));
  pulleyMarks.forEach((group, index) => {
    const pulley = PULLEYS[index];
    let marks = "";
    for (let i = 0; i < 3; i++) {
      const a = -spin * 1.7 + (i / 3) * Math.PI * 2;
      marks += path([
        [pulley.x + Math.cos(a) * 1.5, pulley.y, pulley.z + Math.sin(a) * 1.5],
        [pulley.x + Math.cos(a) * 3.4, pulley.y, pulley.z + Math.sin(a) * 3.4],
      ]);
    }
    marks = '<path class="iso-line" data-tone="lo" d="' + marks + '"/>';
    if (group.dataset.d !== marks) {
      group.innerHTML = marks;
      group.dataset.d = marks;
    }
  });
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
  const goal = targets();
  open = calm ? goal.open : ease(open, goal.open, 0.36, dt);
  lensMove = calm ? goal.lens : ease(lensMove, goal.lens, 0.2, dt);
  ramMove = calm ? goal.ram : ease(ramMove, goal.ram, 0.17, dt);
  if (!calm) {
    spin += dt * (step === 6 || step === 8 ? 1.3 : 0.2);
    if (step === 7 || step === 8) tap = (tap + dt * 1.35) % 1;
    else tap = ease(tap, 0, 0.2, dt);
  }
  drawFrame();
  applyState();
  const busy = touring || !near(open, goal.open) || !near(lensMove, goal.lens) || !near(ramMove, goal.ram);
  const moving = step === 6 || step === 7 || step === 8;
  frame = visible && (busy || (!calm && moving)) ? requestAnimationFrame(tick) : 0;
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
  }, 4400);
  run();
};
new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "140px 0px" },
).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const box = holder.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.12) / 0.76, 0, 1);
  steer(Math.min(N - 1, Math.floor(share * N)));
});
stage.addEventListener("pointerleave", () => steer(step));
let touchX = null;
stage.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch") return;
  touchX = event.clientX;
});
stage.addEventListener("pointerup", (event) => {
  if (touchX === null) return;
  const dx = event.clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 34) steer(step + (dx < 0 ? 1 : -1));
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
drawFrame();
applyState();
`;

const css = `<style>
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.block .iso-fill,.block .iso-top,.block .iso-shade,.block .iso-edge{transition:fill .35s ease,stroke .35s ease}
.block.is-lit .iso-fill{fill:var(--anatomy-face)}
.block.is-lit .iso-top{fill:var(--anatomy-lit-top)}
.block.is-lit .iso-shade{fill:var(--anatomy-lit-shade)}
.block.is-lit .iso-edge{stroke:var(--anatomy-blue);stroke-width:1.1}
.block.is-lit .iso-crease{stroke:var(--anatomy-blue)}
.flow{opacity:0;transition:opacity .45s ease}
.flow.is-on{opacity:1}
.flow .iso-line{stroke-width:1.05}
.striker-ball{fill:var(--anatomy-hi);stroke:none}
body.iso{--anatomy-blue:#6b9bff}
body[data-theme="light"].iso{--anatomy-blue:#3e63dd;--anatomy-mid:#77777d;--anatomy-lo:#9c9ca1;--anatomy-faint:#c4c4c8}
.iso-plate-corner[data-corner="readout"]{bottom:16px}
@media (max-width:560px){
.iso-plate{padding-bottom:96px}
.iso-plate-corner[data-corner="readout"]{font-size:9px;bottom:52px}
.iso-plate-corner[data-corner="hint"]{font-size:9px;bottom:14px;left:0;right:0;white-space:normal;line-height:1.35}
}
@media (prefers-reduced-motion:reduce){
.flow{transition:none}
.block .iso-fill,.block .iso-top,.block .iso-shade,.block .iso-edge{transition:none}
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
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: шаги раскрытия и подпроцессы" aria-valuemin="0" aria-valuemax="${STEPS.length - 1}" aria-valuenow="0">${svg}</div>`,
  });

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}
