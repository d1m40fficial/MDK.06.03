import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import {
  TABLES,
  OPS,
  STATES,
  TX,
  PEAK_LOCKS,
  summarize,
  stepLabel,
  rowsLine,
  orderCount,
} from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-08-dbms";
const WIDTH = 620;
const HEIGHT = 420;

const DRAWERS = [
  { id: "students", label: "students", ru: "Студенты", z: 16, h: 24 },
  { id: "orders", label: "orders", ru: "Заказы", z: 47, h: 24 },
  { id: "payments", label: "payments", ru: "Платежи", z: 78, h: 24 },
  { id: "audit", label: "audit", ru: "Журнал", z: 109, h: 24 },
];

const CAB = { x: -120, y: -52, w: 240, d: 104 };
const FRONT = CAB.y + CAB.d;
const CAP_Z = 140;
const BAR_Z = 152;
const STOP_X = [-72, -24, 24, 72];
const CLAMP_BASE = STOP_X[0];
const CLAMP_Y = -18;
const LEVER_X = 112;

const P = k.fitProjection(
  [
    ...k.boxCorners({ x: CAB.x - 8, y: CAB.y - 8, w: CAB.w + 16, d: CAB.d + 16 }, -12, CAP_Z + 6),
    [STOP_X[0] - 8, CLAMP_Y, BAR_Z + 14],
    [STOP_X[3] + 8, CLAMP_Y, BAR_Z + 14],
    [-LEVER_X - 10, CLAMP_Y, BAR_Z + 18],
    [LEVER_X + 10, CLAMP_Y, BAR_Z + 18],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, headroom: 10, azimuth: 40, elevation: 31 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const text = (x, y, value, { size = 3, fill = "var(--anatomy-strong)", anchor = "start", spacing = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}" font-family="var(--anatomy-mono)">${esc(value)}</text>`;

const rect = (x, y, w, h, fill, stroke = "none", rx = 0.4, sw = 0.22) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

function frontFace(x, y, top, width, height, inner, className = "") {
  const o = at([x, y, top]);
  const a = at([x + 1, y, top]);
  const b = at([x, y, top - 1]);
  return `<g${className ? ` class="${className}"` : ""} transform="matrix(${(a[0] - o[0]).toFixed(4)} ${(a[1] - o[1]).toFixed(4)} ${(b[0] - o[0]).toFixed(4)} ${(b[1] - o[1]).toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})">${inner}</g>`;
}

function base() {
  const out = [];
  const plinth = { x: -134, y: -64, w: 268, d: 128, r: 8 };
  out.push(S(k.slabOf(plinth, -12, 12, P, 6, 1.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(plinth, 5), 0, P, 6), { tone: "faint" }));
  for (const [x, y] of k.corners(plinth, 9)) {
    out.push(S(k.cylinder(x, y, 4.2, -16, 4.4, P, 20), { tone: "mid" }));
    out.push(D([at([x, y, -11.4])], { size: 0.55, tone: "hi" }));
  }
  const plate = { x: -44, y: -68, w: 88, d: 5, r: 1.5 };
  out.push(S(k.slabOf(plate, 0, 1.2, P, 4), { tone: "hi", crease: "lo" }));
  out.push(
    frontFace(-42, -63.2, 1.1, 84, 9, [
      text(42, 5.8, "ТРАНЗАКЦИЯ 42", { size: 4.2, fill: "var(--anatomy-strong)", anchor: "middle", spacing: 0.5 }),
      text(42, 8.2, "СТРОКИ И БЛОКИРОВКИ", { size: 2.4, fill: "var(--anatomy-muted)", anchor: "middle", spacing: 0.25 }),
    ]),
  );
  return out.join("");
}

function cabinet() {
  const out = [];
  out.push(S(k.slabOf(CAB, 0, CAP_Z, P, 10, 1.8), { tone: "mid", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(CAB, 4), 0.4, P, 10), { tone: "faint" }));
  out.push(S(k.slabOf({ x: CAB.x - 5, y: CAB.y - 5, w: CAB.w + 10, d: CAB.d + 10, r: 6 }, CAP_Z, 6, P, 6, 1.2), { tone: "hi" }));
  out.push(L(k.planOutline({ x: CAB.x + 10, y: CAB.y + 10, w: CAB.w - 20, d: CAB.d - 20, r: 3 }, CAP_Z + 6.05, P, 5), { tone: "faint" }));
  for (const [x, y] of k.corners({ x: CAB.x + 6, y: CAB.y + 6, w: CAB.w - 12, d: CAB.d - 12 }, 0)) {
    out.push(D([at([x, y, CAP_Z + 6.1])], { size: 0.55, tone: "hi" }));
  }
  for (const z of [8, 137]) out.push(L(k.sideSeam(CAB, z, P, 10), { tone: "faint" }));
  return out.join("");
}

function drawer(table) {
  const { id, label, ru, z, h } = table;
  const out = [];
  const frame = { x: -108, y: FRONT - 0.2, w: 216, d: 5.4, r: 2.2 };
  out.push(S(k.slabOf(frame, z - 1.2, h + 2.4, P, 5, 0.8), { tone: "lo", crease: "faint" }));
  out.push(
    `<g class="drawer" data-drawer="${id}">`,
    S(k.slabOf({ x: -104, y: FRONT + 2.2, w: 208, d: 3.6, r: 1.8 }, z, h, P, 5, 0.8), {
      tone: "mid",
      crease: "lo",
      inner: L(k.ringSeam(k.ringOf({ x: -104, y: FRONT + 2.2, w: 208, d: 3.6, r: 1.8 }, 5), z + h * 0.55, P), { tone: "faint" }),
    }),
  );
  out.push(
    frontFace(-101, FRONT + 5.9, z + h - 2, 202, h - 4, [
      rect(1, 1, 200, h - 6, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 1, 0.2),
      text(6, 7.6, label, { size: 5.3, fill: "var(--anatomy-strong)", spacing: 0.25 }),
      text(6, 15.4, ru, { size: 2.7, fill: "var(--anatomy-muted)", spacing: 0.08 }),
      text(196, 7.4, "3", { size: 6.0, fill: "var(--anatomy-strong)", anchor: "end" }),
      text(196, 12.8, "строк", { size: 2.2, fill: "var(--anatomy-muted)", anchor: "end", spacing: 0.05 }),
      text(196, 18.2, "0", { size: 2.4, fill: "var(--anatomy-muted)", anchor: "end" }),
      rect(66, 6.2, 68, 0.18, "var(--anatomy-faint)", "none", 0, 0),
      `<circle cx="70" cy="4.6" r="0.7" fill="var(--anatomy-faint)"/>`,
      `<circle cx="130" cy="4.6" r="0.7" fill="var(--anatomy-faint)"/>`,
    ]),
  );
  const handle = { x: -22, y: FRONT + 6.0, w: 44, d: 3.2, r: 1.4 };
  out.push(S(k.slabOf({ x: handle.x, y: handle.y, w: 6, d: 5.4, r: 1.3 }, z + 11, 3.2, P, 4), { tone: "hi", crease: "faint" }));
  out.push(S(k.slabOf({ x: handle.x + 38, y: handle.y, w: 6, d: 5.4, r: 1.3 }, z + 11, 3.2, P, 4), { tone: "hi", crease: "faint" }));
  out.push(S(k.slabOf(handle, z + 12.2, 2.4, P, 5, 0.6), { tone: "hi", crease: "lo" }));
  out.push(
    S(k.cylinder(102, FRONT + 7.6, 2.5, z + h - 5.2, 4.2, P, 20), {
      tone: "hi",
      crease: "faint",
      className: `lock-pin pin-${id}`,
    }),
  );
  out.push(`</g>`);
  return out.join("");
}

function rails() {
  const out = [];
  const right = 126;
  const left = -126;
  const rail = (x, from, to, tone = "mid") => {
    out.push(S(k.cylinder(x, FRONT + 2.2, 2.1, from, to - from, P, 20), { tone, crease: "faint" }));
    for (const z of [from + 3, to - 3]) {
      out.push(S(k.cylinder(x, FRONT + 2.2, 3.0, z - 0.9, 1.8, P, 20), { tone: "hi", crease: "faint" }));
    }
  };
  rail(right, 31, 94);
  rail(left, 62, 125);
  out.push(
    L(k.segment([right, FRONT + 2.2, 31], [-104, FRONT + 2.2, 31], P), { tone: "lo" }),
    L(k.segment([right, FRONT + 2.2, 94], [-104, FRONT + 2.2, 94], P), { tone: "lo" }),
    L(k.segment([left, FRONT + 2.2, 62], [-104, FRONT + 2.2, 62], P), { tone: "lo" }),
    L(k.segment([left, FRONT + 2.2, 125], [-104, FRONT + 2.2, 125], P), { tone: "lo" }),
  );
  out.push(D([at([right, FRONT + 2.2, 31]), at([right, FRONT + 2.2, 94]), at([left, FRONT + 2.2, 62]), at([left, FRONT + 2.2, 125])], { size: 0.6, tone: "hi" }));
  return out.join("");
}

function clamp() {
  const out = [];
  out.push(S(k.slabOf({ x: -100, y: CLAMP_Y - 4, w: 200, d: 8, r: 2 }, BAR_Z, 5, P, 4, 0.6), { tone: "mid", crease: "lo" }));
  out.push(L(k.planOutline({ x: -94, y: CLAMP_Y - 1, w: 188, d: 2, r: 0.5 }, BAR_Z + 5.1, P, 4), { tone: "faint" }));
  const stopNodes = STOP_X.map((x, index) => {
    const lit = index === 0 ? "true" : "false";
    out.push(
      `<g class="clamp-stop" data-stop="${index}">`,
      S(k.cylinder(x, CLAMP_Y, 4.1, BAR_Z + 5, 2.2, P, 24), { tone: "hi", crease: "faint" }),
      frontFace(x - 3.2, CLAMP_Y - 4.1, BAR_Z + 7.2, 6.4, 4.8, [
        text(3.2, 3.5, String(index + 1), { size: 3.2, fill: "var(--anatomy-strong)", anchor: "middle" }),
      ]),
      `</g>`,
    );
  });
  out.push(stopNodes.join(""));
  out.push(`<g class="clamp-carriage" data-clamp>`);
  out.push(S(k.slabOf({ x: CLAMP_BASE - 7, y: CLAMP_Y - 8, w: 14, d: 16, r: 2.2 }, BAR_Z + 5, 8, P, 4, 0.8), { tone: "hi", crease: "lo", lit: true }));
  out.push(frontFace(CLAMP_BASE - 5.6, CLAMP_Y + 8.2, BAR_Z + 12.2, 11.2, 6.4, [
    rect(1.0, 1.2, 9.2, 4.2, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 0.6, 0.18),
    text(5.6, 4.4, "T42", { size: 2.2, fill: "var(--anatomy-lit)", anchor: "middle", spacing: 0.04 }),
  ]));
  out.push(`</g>`);
  out.push(S(k.slabOf({ x: -98, y: CLAMP_Y - 22, w: 196, d: 4, r: 1.2 }, 148, 4, P, 3), { tone: "lo" }));
  for (const x of [-96, 96]) out.push(S(k.cylinder(x, CLAMP_Y - 20, 2.3, 0, 148, P, 18), { tone: "mid", crease: "faint" }));
  return out.join("");
}

function lever(x, color, label, on = false) {
  return [
    `<g class="lever lever-${color}" data-lever="${color}" data-on="${on ? "true" : "false"}">`,
    S(k.slabOf({ x: x - 9, y: CLAMP_Y - 7, w: 18, d: 14, r: 3 }, 148, 5, P, 4, 0.7), { tone: "lo" }),
    S(k.cylinder(x, CLAMP_Y, 3.2, 153, 12, P, 22), { tone: "mid", crease: "faint" }),
    S(k.cylinder(x, CLAMP_Y, 5.2, 164, 4.2, P, 26), { tone: "hi", crease: "lo", className: "lever-knob" }),
    frontFace(x - 8, CLAMP_Y + 5.2, 163, 16, 5, [
      text(8, 3.6, label, { size: 1.9, fill: "var(--anatomy-muted)", anchor: "middle", spacing: 0.03 }),
    ]),
    `</g>`,
  ].join("");
}

function gauges() {
  const out = [];
  const frame = { x: 138, y: -32, w: 46, d: 62, r: 4 };
  out.push(S(k.slabOf(frame, 84, 3, P, 5, 0.6), { tone: "lo" }));
  out.push(
    frontFace(140, 30.2, 86, 42, 40, [
      rect(1.4, 1.4, 39.2, 37.2, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 1.2, 0.2),
      text(21, 8.5, "СЧЁТЧИК", { size: 2.4, fill: "var(--anatomy-muted)", anchor: "middle", spacing: 0.12 }),
      text(21, 17, "1 1 0", { size: 4.8, fill: "var(--anatomy-strong)", anchor: "middle", spacing: 0.45 }),
      text(21, 23, "ЗАКАЗЫ", { size: 2.1, fill: "var(--anatomy-muted)", anchor: "middle", spacing: 0.1 }),
      text(21, 32, "СТРОК 3", { size: 2.5, fill: "var(--anatomy-hi)", anchor: "middle", spacing: 0.08 }),
    ], "counter-gauge"),
  );
  out.push(
    S(k.cylinder(161, 32, 2.1, 88, 3.4, P, 20), { tone: "hi", crease: "faint" }),
  );
  return out.join("");
}

function bolts() {
  const out = [];
  for (const z of [6, 134]) {
    for (const x of [-112, 112]) {
      out.push(D([at([x, FRONT + 1.0, z])], { size: 0.52, tone: "hi" }));
    }
  }
  return out.join("");
}

const EXTRA_CSS = `
.iso-stage{--fig-amber:#e8b45a;--fig-green:#6be0a0;--fig-red:#ff6b6b;--anatomy-shade-0:#d5d5d2;--anatomy-shade-1:#e0e0dd;--anatomy-shade-2:#e9e9e6;--anatomy-shade-3:#f1f1ee;--anatomy-mid:#74747a;--anatomy-lo:#a4a4a8;--anatomy-faint:#b9b9bd}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-mid);outline-offset:-2px;border-radius:6px}
.drawer .lock-pin{opacity:0;transition:opacity .28s var(--anatomy-ease)}
.drawer[data-locked="true"] .lock-pin{opacity:1}
.drawer[data-locked="true"] .iso-edge{stroke:var(--fig-amber)}
.drawer[data-active="true"] .iso-top{fill:var(--anatomy-lit-top)}
.drawer[data-active="true"] .iso-edge{stroke:var(--anatomy-lit);stroke-width:.9}
.clamp-stop .iso-top{fill:var(--anatomy-shade-2);transition:fill .3s var(--anatomy-ease)}
.clamp-stop[data-lit="true"] .iso-top{fill:var(--anatomy-lit)}
.clamp-carriage{transition:transform .46s var(--anatomy-ease)}
.clamp-carriage .iso-edge{stroke:var(--fig-amber)}
.lever-knob .iso-top{transition:fill .3s var(--anatomy-ease)}
.lever-green[data-on="true"] .lever-knob .iso-top{fill:var(--fig-green)}
.lever-red[data-on="true"] .lever-knob .iso-top{fill:var(--fig-red)}
.lever .iso-edge{transition:stroke .3s var(--anatomy-ease)}
.lever-green[data-on="true"] .iso-edge{stroke:var(--fig-green)}
.lever-red[data-on="true"] .iso-edge{stroke:var(--fig-red)}
.counter-gauge .iso-edge{stroke:var(--fig-amber);stroke-width:.7}
figcaption .iso-caption{max-width:100%}
.fig-controls{position:absolute;right:14px;top:46px;display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;max-width:300px}
.fig-controls button{font:10px/1.1 var(--anatomy-mono);letter-spacing:.04em;color:var(--anatomy-text);background:var(--anatomy-card);border:1px solid var(--anatomy-faint);border-radius:3px;padding:5px 7px;cursor:pointer}
.fig-controls button:hover,.fig-controls button:focus-visible{color:var(--anatomy-lit);border-color:var(--anatomy-mid);outline:none}
.fig-controls button[data-act="commit"]{color:var(--fig-green)}
.fig-controls button[data-act="rollback"]{color:var(--fig-red)}
.lever-green .lever-knob .iso-top{fill:var(--fig-green);opacity:.45}
.lever-red .lever-knob .iso-top{fill:var(--fig-red);opacity:.45}
.lever-green[data-on="true"] .lever-knob .iso-top,.lever-red[data-on="true"] .lever-knob .iso-top{opacity:1}
@media (prefers-reduced-motion:reduce){
  .drawer .lock-pin,.clamp-stop .iso-top,.clamp-carriage,.lever-knob .iso-top,.lever .iso-edge{transition:none}
}
@media (max-width:560px){
  .fig-controls{left:10px;right:10px;top:42px;max-width:none;justify-content:flex-start}
  .fig-controls button{font-size:8.5px;padding:4px 5px}
}
`;

function build(theme) {
  const state = STATES[0];
  const art = [base(), cabinet(), rails(), clamp(), lever(-LEVER_X, "red", "ОТКАТ"), lever(LEVER_X, "green", "ФИКСАЦИЯ"), bolts()];
  art.push(DRAWERS.map((drawer, index) => drawerDummy(drawer, index)).join(""));
  art.push(gauges());

  const body = k.plateHtml({
    fig: "Fig 1",
    title: "Замок транзакции",
    hint: "→ шаг · C фиксация · X откат · R сброс",
    readout: summarize(state),
    keys: [
      { mark: "lit", label: "транзакция" },
      { mark: "raised", label: "блокировка" },
      { mark: "dim", label: "таблицы" },
    ],
    caption:
      "Четыре операции T42 проходят через ящики students, orders, payments и audit. До фиксации видны только промежуточные строки 3/3/2/0, после фиксации остаются 3/3/3/1, а откат возвращает 3/2/2/0.",
    body: `<style>${EXTRA_CSS}</style><div class="iso-stage" tabindex="0" aria-label="Картотека транзакции: четыре ящика-таблицы, замок транзакции и рычаги фиксации и отката. Стрелки переключают операции, C фиксирует, X откатывает, R сбрасывает."><div class="fig-controls"><button type="button" data-act="prev">←</button><button type="button" data-act="next">Шаг →</button><button type="button" data-act="commit">Фиксация</button><button type="button" data-act="rollback">Откат</button><button type="button" data-act="reset">Сброс</button></div>${k.figureSvg({
      width: WIDTH,
      height: HEIGHT,
      label:
        "Изометрическая картотека: четыре ящика students, orders, payments и audit соединены латунными шинами, над ними замок транзакции с четырьмя упорами и рычагами фиксации и отката.",
      body: art.join(""),
    })}</div>`,
  });

  const clampShifts = [0, 1, 2, 3, 3, 3, 0].map((index) => {
    const from = at([CLAMP_BASE, CLAMP_Y, BAR_Z + 5]);
    const to = at([STOP_X[index], CLAMP_Y, BAR_Z + 5]);
    return [to[0] - from[0], to[1] - from[1]];
  });

  const data = {
    states: STATES,
    readouts: STATES.map(summarize),
    labels: STATES.map(stepLabel),
    rows: STATES.map(rowsLine),
    orderCount: STATES.map(orderCount),
    clampShifts,
    peakLocks: PEAK_LOCKS,
    tx: TX,
  };

  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: ID, theme, body, script: kitScript() + liveScript(data) }));
  console.log("wrote", name);
}

function drawerDummy(table) {
  return drawer(table);
}

function liveScript(data) {
  return `
const DATA = ${JSON.stringify(data)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const clampEl = svg.querySelector("[data-clamp]");
const stops = [...svg.querySelectorAll(".clamp-stop")];
const drawers = [...svg.querySelectorAll(".drawer")];
const pins = [...svg.querySelectorAll(".lock-pin")];
const leverGreen = svg.querySelector('[data-lever="green"]');
const leverRed = svg.querySelector('[data-lever="red"]');
const gauge = svg.querySelector(".counter-gauge");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let index = 0;
let autoTimer = 0;
let idleTimer = 0;
let auto = false;
let paused = false;

readout.setAttribute("aria-live", "polite");

function drawClamp(stateIndex) {
  const shift = DATA.clampShifts[stateIndex] || [0, 0];
  clampEl.style.transform = "translate(" + shift[0].toFixed(2) + "px," + shift[1].toFixed(2) + "px)";
}

function apply(stateIndex, animate = true) {
  index = stateIndex;
  const state = DATA.states[stateIndex];
  const locked = new Set(state.locks.map((lock) => String(lock).split("#")[0]));
  readout.textContent = DATA.readouts[stateIndex];
  clampEl.style.transition = animate && !still.matches ? "" : "none";
  drawClamp(stateIndex);
  for (const stop of stops) {
    const n = Number(stop.dataset.stop);
    stop.dataset.lit = state.phase === "work" && n === state.step - 1 ? "true" : "false";
  }
  for (const drawer of drawers) {
    const id = drawer.dataset.drawer;
    drawer.dataset.active = id === state.active && state.phase !== "committed" && state.phase !== "rolledback" ? "true" : "false";
    drawer.dataset.locked = locked.has(id) ? "true" : "false";
    const countEl = drawer.querySelector("text[font-size='6.0']");
    if (countEl) countEl.textContent = String(state.rows[id]);
  }
  for (const pin of pins) {
    const id = [...pin.classList].find((name) => name.startsWith("pin-"))?.slice(4);
    pin.style.opacity = locked.has(id) ? "1" : "0";
  }
  leverGreen.dataset.on = state.phase === "committed" ? "true" : "false";
  leverRed.dataset.on = state.phase === "rolledback" ? "true" : "false";
  if (gauge) {
    const rows = gauge.querySelector("text[font-size='2.5']");
    const counts = gauge.querySelector("text[font-size='4.8']");
    if (rows) rows.textContent = "СТРОК " + state.rows.students;
    if (counts) counts.textContent = state.counters[1] + " " + state.counters[2] + " " + state.counters[3];
  }
}

function prev() {
  manual();
  apply(index > 0 ? index - 1 : 0);
}

function next() {
  manual();
  apply(index < 4 ? index + 1 : 4);
}

function commit() {
  manual();
  apply(5);
}

function rollback() {
  manual();
  apply(6);
}

function reset() {
  manual();
  apply(0);
}

function manual() {
  auto = false;
  paused = true;
  clearTimeout(autoTimer);
  clearTimeout(idleTimer);
}

function schedule() {
  clearTimeout(autoTimer);
  if (!auto || paused || still.matches) return;
  autoTimer = setTimeout(() => {
    if (!auto || paused) return;
    if (index < 5) apply(index + 1);
    if (index === 5) {
      autoTimer = setTimeout(() => {
        if (!auto || paused) return;
        apply(0);
        schedule();
      }, 2200);
      return;
    }
    schedule();
  }, 1300);
}

function arm() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (paused || still.matches) return;
    auto = true;
    apply(0, false);
    schedule();
  }, 3200);
}

stage.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-act]");
  if (!button) return;
  const act = button.dataset.act;
  if (act === "prev") prev();
  if (act === "next") next();
  if (act === "commit") commit();
  if (act === "rollback") rollback();
  if (act === "reset") reset();
  arm();
});

stage.addEventListener("keydown", (event) => {
  const key = event.key;
  if (key === "ArrowRight" || key === " ") { event.preventDefault(); next(); arm(); }
  if (key === "ArrowLeft") { event.preventDefault(); prev(); arm(); }
  if (key === "c" || key === "C" || key === "с" || key === "С") { commit(); arm(); }
  if (key === "x" || key === "X" || key === "ч" || key === "Ч") { rollback(); arm(); }
  if (key === "r" || key === "R" || key === "к" || key === "К") { reset(); arm(); }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    auto = false;
    clearTimeout(autoTimer);
  } else {
    arm();
  }
});

apply(0, false);
arm();
`;
}

build("dark");
build("light");
