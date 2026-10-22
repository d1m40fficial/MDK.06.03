import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import {
  LAYERS,
  STAGES,
  RESULT,
  FLOW,
  MACS,
  PAYLOAD,
  TCP_HEADER,
  IP_HEADER,
  ETH_HEADER,
  FCS,
  SEGMENT,
  PACKET,
  FRAME,
  BITS,
  summarize,
} from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-09-network";
const WIDTH = 680;
const HEIGHT = 450;

const LEVEL_Z = { 1: 18, 2: 32, 3: 46, 4: 60, 5: 74, 6: 88, 7: 102 };
const LEFT_X = -148;
const RIGHT_X = 148;
const RACK_W = 104;
const RACK_D = 56;
const BELT_Z = 12;
const BELT_TOP = 16;
const CRATE = { w: 28, d: 19, h: 13 };
const BASE = [-148, 0, LEVEL_Z[7] + 3];

const STAGE_POS = [
  [-148, 0, 105],
  [-148, 0, 105],
  [-148, 0, 63],
  [-148, 0, 49],
  [-148, 0, 35],
  [-52, 25, 19],
  [52, 25, 19],
  [148, 0, 21],
  [148, 0, 35],
  [148, 0, 49],
  [148, 0, 63],
  [148, 0, 105],
];

const P = k.fitProjection(
  [
    ...k.boxCorners({ x: LEFT_X - 62, y: -40, w: RACK_W + 124, d: 84 }, -14, 126),
    ...k.boxCorners({ x: RIGHT_X - 62, y: -40, w: RACK_W + 124, d: 84 }, -14, 126),
    [0, 0, 132],
    [-252, 66, 52],
    [-172, 66, 52],
    [-52, 66, 62],
    [52, 66, 62],
  ],
  WIDTH,
  HEIGHT,
  { pad: 20, headroom: 8, azimuth: 38, elevation: 29 },
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

function rack(cx, side, label) {
  const out = [];
  const basePlan = { x: cx - 60, y: -38, w: 120, d: 76, r: 7 };
  out.push(S(k.slabOf(basePlan, -10, 10, P, 6, 1.2), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(basePlan, 4), 0, P, 6), { tone: "faint" }));
  for (const [x, y] of k.corners(basePlan, 8)) {
    out.push(S(k.cylinder(x, y, 3.4, -14, 4, P, 18), { tone: "mid" }));
  }
  out.push(
    frontFace(cx - 34, 38.4, -2.5, 68, 9, [
      text(34, 6.4, label, { size: 4.0, fill: "var(--anatomy-strong)", anchor: "middle", spacing: 1.2 }),
    ]),
  );

  for (const x of [cx - 46, cx + 46]) {
    for (const y of [-26, 26]) {
      out.push(S(k.cylinder(x, y, 2.3, 0, 124, P, 18), { tone: "mid", crease: "faint" }));
      out.push(S(k.cylinder(x, y, 3.0, 6, 2.2, P, 18), { tone: "hi", crease: "faint" }));
      out.push(S(k.cylinder(x, y, 3.0, 118, 2.2, P, 18), { tone: "hi", crease: "faint" }));
    }
  }
  for (const z of [0, 124]) {
    out.push(S(k.slabOf({ x: cx - 50, y: -30, w: 100, d: 4, r: 1.2 }, z, 3, P, 3), { tone: "lo" }));
    out.push(S(k.slabOf({ x: cx - 50, y: 26, w: 100, d: 4, r: 1.2 }, z, 3, P, 3), { tone: "lo" }));
  }
  for (const x of [cx - 50, cx + 50]) {
    out.push(S(k.slabOf({ x: x - 2, y: -28, w: 4, d: 56, r: 1 }, 122, 3, P, 3), { tone: "mid" }));
  }

  for (const layer of LAYERS) {
    const z = LEVEL_Z[layer.n];
    const plan = { x: cx - RACK_W / 2, y: -RACK_D / 2, w: RACK_W, d: RACK_D, r: 3 };
    const isHeader = layer.n === 4 || layer.n === 3 || layer.n === 2;
    out.push(
      `<g class="tray" data-tray="${side}-${layer.n}" data-side="${side}" data-level="${layer.n}">`,
      S(k.slabOf(plan, z, 3, P, 5, 0.7), { tone: isHeader ? "mid" : "lo", crease: "lo" }),
      L(k.planOutline(k.insetPlan(plan, 5), z + 3.08, P, 5), { tone: "faint" }),
      frontFace(cx - 8, RACK_D / 2 + 0.2, z + 5.4, 16, 8, [
        rect(0, 0, 16, 8, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 1.4, 0.18),
        text(8, 6.0, String(layer.n), { size: 5.0, fill: "var(--anatomy-strong)", anchor: "middle" }),
      ]),
      `</g>`,
    );
    for (const x of [cx - 36, cx + 36]) {
      out.push(D([at([x, -RACK_D / 2 + 4, z + 3.1])], { size: 0.45, tone: "hi" }));
    }
  }
  return out.join("");
}

function belt() {
  const out = [];
  out.push(S(k.slabOf({ x: -112, y: 12, w: 224, d: 28, r: 3 }, BELT_Z, 4, P, 5, 0.7), { tone: "mid", crease: "lo" }));
  for (const y of [12, 38]) {
    out.push(S(k.slabOf({ x: -114, y, w: 228, d: 3, r: 1 }, BELT_TOP, 2.2, P, 3), { tone: "hi" }));
  }
  for (let x = -104; x <= 104; x += 16) {
    out.push(S(k.slabOf({ x: x - 1.2, y: 14, w: 2.4, d: 24, r: 0.7 }, BELT_TOP + 0.1, 1.0, P, 2), { tone: "lo", crease: "none" }));
  }
  for (const x of [-112, 112]) {
    out.push(S(k.cylinder(x, 12, 4.2, BELT_Z - 3, 7, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(x, 38, 4.2, BELT_Z - 3, 7, P, 20), { tone: "mid" }));
  }
  out.push(
    L(k.segment([-100, 26, BELT_TOP + 1.3], [100, 26, BELT_TOP + 1.3], P), { tone: "faint" }),
  );
  for (let x = -96; x <= 96; x += 24) {
    out.push(L(k.segment([x, 14, BELT_TOP + 1.4], [x, 18, BELT_TOP + 1.4], P), { tone: "lo" }));
  }
  return out.join("");
}

function gate(x, n) {
  const out = [];
  for (const y of [4, 46]) {
    out.push(S(k.slabOf({ x: x - 2.4, y: y - 2.4, w: 4.8, d: 4.8, r: 1.2 }, BELT_Z + 4, 42, P, 3, 0.5), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 3.3, BELT_TOP + 2, 2.2, P, 18), { tone: "hi", crease: "faint" }));
    out.push(D([at([x, y, BELT_Z + 47])], { size: 0.5, tone: "hi" }));
  }
  out.push(S(k.slabOf({ x: x - 2.6, y: 0, w: 5.2, d: 52, r: 1.4 }, BELT_Z + 46, 5, P, 3, 0.6), { tone: "hi", crease: "lo" }));
  out.push(S(k.cylinder(x, 25, 5.2, BELT_Z + 51, 4.2, P, 26), { tone: "hi", crease: "lo", className: "router-dial" }));
  out.push(L(k.ring(x, 25, 3.0, BELT_Z + 55.3, P, 24), { tone: "faint" }));
  out.push(
    frontFace(x - 19, 52.4, BELT_Z + 50.6, 38, 12, [
      rect(0, 0, 38, 12, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 1.2, 0.18),
      text(4, 4.6, n === 1 ? "R1" : "R2", { size: 3.2, fill: "var(--anatomy-muted)", spacing: 0.08 }),
      text(34, 4.8, n === 1 ? "64" : "63", { size: 4.2, fill: "var(--anatomy-strong)", anchor: "end", spacing: 0.02 }),
      text(4, 9.6, "TTL", { size: 1.9, fill: "var(--anatomy-muted)", spacing: 0.08 }),
    ], `gate gate-${n}`),
  );
  for (const y of [4, 46]) {
    out.push(D([at([x - 1.1, y, BELT_Z + 5]), at([x + 1.1, y, BELT_Z + 5])], { size: 0.38, tone: "lo" }));
  }
  return out.join("");
}

function gauge() {
  const out = [];
  const body = { x: -248, y: 52, w: 72, d: 10, r: 3 };
  out.push(S(k.slabOf({ x: body.x - 4, y: body.y - 3, w: body.w + 8, d: body.d + 5, r: 4 }, -4, 5, P, 4, 0.6), { tone: "lo" }));
  out.push(S(k.slabOf(body, 1, 48, P, 5, 0.8), { tone: "mid", crease: "lo" }));
  out.push(S(k.slabOf({ x: body.x - 2, y: body.y - 1, w: body.w + 4, d: body.d + 2, r: 3 }, 49, 3, P, 4, 0.5), { tone: "hi" }));
  const rows = [
    ["1258", FRAME],
    ["1240", PACKET],
    ["1220", SEGMENT],
    ["1200", PAYLOAD],
  ];
  out.push(
    frontFace(body.x + 2, body.y + body.d + 0.2, 48, body.w - 4, 44, [
      rect(0, 0, body.w - 4, 44, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 1.2, 0.2),
      text((body.w - 4) / 2, 5.2, "БАЙТЫ", { size: 2.5, fill: "var(--anatomy-muted)", anchor: "middle", spacing: 0.16 }),
      ...rows.flatMap(([value, bytes], index) => [
        `<circle class="size-led" data-size="${value}" data-active="false" cx="6" cy="${10.8 + index * 8.2}" r="1.1" fill="var(--anatomy-faint)"/>`,
        text(10, 12.2 + index * 8.2, value, { size: 3.3, fill: "var(--anatomy-strong)", spacing: 0.04 }),
        text(body.w - 9, 12.2 + index * 8.2, "+" + (bytes - PAYLOAD), { size: 2.4, fill: "var(--anatomy-muted)", anchor: "end" }),
      ]),
      text((body.w - 4) / 2, 41.4, "1200 + 20 + 20 + 18", { size: 1.9, fill: "var(--anatomy-muted)", anchor: "middle", spacing: 0.02 }),
    ], "byte-gauge"),
  );
  return out.join("");
}

function crate() {
  const out = [];
  const x = BASE[0];
  const z = BASE[2];
  out.push(`<g class="packet" data-packet>`);
  out.push(S(k.slabOf({ x: x - CRATE.w / 2, y: -CRATE.d / 2, w: CRATE.w, d: CRATE.d, r: 2.4 }, z, CRATE.h - 4, P, 4, 1.0), { tone: "hi", crease: "lo", className: "crate-body" }));
  out.push(S(k.slabOf({ x: x - CRATE.w / 2 + 2, y: -CRATE.d / 2 + 2, w: CRATE.w - 4, d: CRATE.d - 4, r: 2 }, z + CRATE.h - 4, 4, P, 4, 0.8), { tone: "mid", crease: "lo" }));
  out.push(L(k.planOutline({ x: x - CRATE.w / 2 + 5, y: -CRATE.d / 2 + 5, w: CRATE.w - 10, d: CRATE.d - 10, r: 1.5 }, z + CRATE.h + 0.05, P, 4), { tone: "faint" }));
  const sleeves = [
    ["eth", z + 1.0, "var(--fig-blue)"],
    ["ip", z + 4.2, "var(--fig-green)"],
    ["tcp", z + 7.4, "var(--fig-amber)"],
  ];
  for (const [id, sz, color] of sleeves) {
    out.push(
      `<g class="sleeve sleeve-${id}" data-sleeve="${id}" data-visible="false" style="--sleeve:${color}">`,
      S(k.slabOf({ x: x - CRATE.w / 2 - 1.2, y: -CRATE.d / 2 - 1.2, w: CRATE.w + 2.4, d: CRATE.d + 2.4, r: 2.6 }, sz, 2.2, P, 4, 0.4), { tone: "hi", crease: "lo" }),
      `</g>`,
    );
  }
  out.push(
    frontFace(x - 10, CRATE.d / 2 + 1.4, z + CRATE.h + 1.0, 20, 7, [
      rect(0, 0, 20, 7, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 1.0, 0.16),
      text(10, 5.1, "1200", { size: 3.0, fill: "var(--anatomy-strong)", anchor: "middle", spacing: 0.05 }),
    ], "packet-tag"),
  );
  out.push(`</g>`);
  return out.join("");
}

function baseFeet() {
  const out = [];
  for (const x of [LEFT_X, RIGHT_X]) {
    for (const y of [-38, 38]) {
      out.push(S(k.cylinder(x - 44, y, 3.0, -14, 4, P, 16), { tone: "lo" }));
      out.push(S(k.cylinder(x + 44, y, 3.0, -14, 4, P, 16), { tone: "lo" }));
    }
  }
  return out.join("");
}

const EXTRA_CSS = `
.iso-stage{--fig-amber:#e8b45a;--fig-green:#6be0a0;--fig-blue:#6b9bff;--fig-red:#ff6b6b;--anatomy-shade-0:#d5d5d2;--anatomy-shade-1:#e0e0dd;--anatomy-shade-2:#e9e9e6;--anatomy-shade-3:#f1f1ee;--anatomy-mid:#74747a;--anatomy-lo:#a4a4a8;--anatomy-faint:#b9b9bd}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-mid);outline-offset:-2px;border-radius:6px}
.tray .iso-edge{transition:stroke .3s var(--anatomy-ease),stroke-width .3s var(--anatomy-ease)}
.tray[data-active="true"] .iso-edge{stroke:var(--anatomy-lit);stroke-width:1}
.tray[data-active="true"] .iso-top{fill:var(--anatomy-lit-top)}
.packet{transition:transform .52s var(--anatomy-ease)}
.packet .iso-edge{stroke:var(--fig-amber)}
.crate-body .iso-top{fill:var(--anatomy-lit-top)}
.sleeve{transition:opacity .25s var(--anatomy-ease)}
.sleeve[data-visible="false"]{opacity:0}
.sleeve .iso-fill,.sleeve .iso-top,.sleeve .iso-shade{fill:var(--sleeve)}
.sleeve .iso-top{filter:brightness(1.18)}
.sleeve .iso-edge{stroke:var(--sleeve);stroke-width:.8}
.packet-tag .iso-edge{stroke:var(--fig-amber)}
.size-led[data-active="true"]{fill:var(--anatomy-lit)}
.size-led{transition:fill .25s var(--anatomy-ease)}
.gate[data-hot="true"] .iso-edge{stroke:var(--fig-green);stroke-width:.9}
.gate{transition:opacity .3s var(--anatomy-ease)}
.router-dial .iso-top{fill:var(--anatomy-shade-2)}
.gate[data-hot="true"] .router-dial .iso-top{fill:var(--fig-green)}
.fig-controls{position:absolute;right:14px;top:46px;display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;max-width:320px}
.fig-controls button{font:10px/1.1 var(--anatomy-mono);letter-spacing:.04em;color:var(--anatomy-text);background:var(--anatomy-card);border:1px solid var(--anatomy-faint);border-radius:3px;padding:5px 7px;cursor:pointer}
.fig-controls button:hover,.fig-controls button:focus-visible{color:var(--anatomy-lit);border-color:var(--anatomy-mid);outline:none}
.fig-controls button[data-act="auto"]{color:var(--anatomy-muted)}
@media (prefers-reduced-motion:reduce){
  .packet,.sleeve,.tray .iso-edge,.size-led,.gate,.router-dial .iso-top{transition:none}
}
@media (max-width:560px){
  .fig-controls{left:10px;right:10px;top:42px;max-width:none;justify-content:flex-start}
  .fig-controls button{font-size:8.5px;padding:4px 5px}
}
`;

function build(theme) {
  const art = [];
  art.push(baseFeet());
  art.push(rack(LEFT_X, "tx", "ОТПРАВИТЕЛЬ"));
  art.push(rack(RIGHT_X, "rx", "ПОЛУЧАТЕЛЬ"));
  art.push(belt());
  art.push(gate(-52, 1));
  art.push(gate(52, 2));
  art.push(gauge());
  art.push(crate());

  const shifts = STAGE_POS.map((pos) => {
    const a = at(pos);
    const b = at(BASE);
    return [a[0] - b[0], a[1] - b[1]];
  });

  const data = {
    stages: STAGES,
    readouts: STAGES.map(summarize),
    shifts,
    sizes: [FRAME, PACKET, SEGMENT, PAYLOAD],
    layerByStage: STAGES.map((stage) => `${stage.side}-${stage.level}`),
    tcp: TCP_HEADER,
    ip: IP_HEADER,
    eth: ETH_HEADER + FCS,
    payload: PAYLOAD,
    flow: FLOW,
    macs: MACS,
    result: RESULT,
    bits: BITS,
  };

  const body = k.plateHtml({
    fig: "Fig 1",
    title: "Семь конвертов",
    hint: "→ шаг · Space авто · R сброс",
    readout: summarize(STAGES[0]),
    keys: [
      { mark: "lit", label: "пакет" },
      { mark: "raised", label: "новый заголовок" },
      { mark: "dim", label: "уровни" },
    ],
    caption:
      "Пакет 1200 байт спускается по семи уровням: TCP добавляет 20 байт, IP ещё 20, Ethernet ещё 18. На двух маршрутизаторах TTL падает с 64 до 62, а MAC-конверт меняется на каждом участке. Получатель снимает конверты в обратном порядке и отдаёт те же 1200 байт.",
    body: `<style>${EXTRA_CSS}</style><div class="iso-stage" tabindex="0" aria-label="Почтовый конвейер сети: пакет спускается по семи уровням слева, проходит два маршрутизатора и поднимается по семи уровням справа. Стрелки переключают шаги, пробел включает автопоказ, R сбрасывает."><div class="fig-controls"><button type="button" data-act="prev">←</button><button type="button" data-act="next">Шаг →</button><button type="button" data-act="auto">Авто</button><button type="button" data-act="reset">Сброс</button></div>${k.figureSvg({
      width: WIDTH,
      height: HEIGHT,
      label:
        "Изометрическая почтово-конвейерная станция: два семиуровневых стеллажа, пакет с цветными конвертами TCP, IP и Ethernet, лента с двумя маршрутизаторами и шкала байтов.",
      body: art.join(""),
    })}</div>`,
  });

  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: ID, theme, body, script: kitScript() + liveScript(data) }));
  console.log("wrote", name);
}

function liveScript(data) {
  return `
const DATA = ${JSON.stringify(data)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const packet = svg.querySelector("[data-packet]");
const trays = [...svg.querySelectorAll(".tray")];
const sleeves = [...svg.querySelectorAll("[data-sleeve]")];
const sizeLeds = [...svg.querySelectorAll(".size-led")];
const gates = [...svg.querySelectorAll(".gate")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
let index = 0;
let autoTimer = 0;
let idleTimer = 0;
let auto = false;
let paused = false;

readout.setAttribute("aria-live", "polite");

function apply(nextIndex, animate = true) {
  index = nextIndex;
  const state = DATA.stages[nextIndex];
  const shift = DATA.shifts[nextIndex] || [0, 0];
  packet.style.transition = animate && !still.matches ? "" : "none";
  packet.style.transform = "translate(" + shift[0].toFixed(2) + "px," + shift[1].toFixed(2) + "px)";
  readout.textContent = DATA.readouts[nextIndex];
  const activeTray = DATA.layerByStage[nextIndex];
  for (const tray of trays) {
    tray.dataset.active = tray.dataset.tray === activeTray ? "true" : "false";
  }
  const visible = {
    tcp: nextIndex >= 2 && nextIndex <= 9,
    ip: nextIndex >= 3 && nextIndex <= 8,
    eth: nextIndex >= 4 && nextIndex <= 7,
  };
  for (const sleeve of sleeves) {
    sleeve.dataset.visible = visible[sleeve.dataset.sleeve] ? "true" : "false";
  }
  const size = state.size;
  for (const led of sizeLeds) {
    led.dataset.active = Number(led.dataset.size) === size ? "true" : "false";
  }
  for (const gate of gates) {
    const n = gate.classList.contains("gate-1") ? 1 : 2;
    const hot = (n === 1 && nextIndex === 5) || (n === 2 && nextIndex === 6);
    gate.dataset.hot = hot ? "true" : "false";
    const ttl = gate.querySelector("text[font-size='4.2']");
    if (ttl) {
      if (n === 1) ttl.textContent = nextIndex >= 5 ? "63" : "64";
      else ttl.textContent = nextIndex >= 6 ? "62" : "63";
    }
  }
}

function manual() {
  auto = false;
  paused = true;
  clearTimeout(autoTimer);
  clearTimeout(idleTimer);
}

function prev() { manual(); apply(index > 0 ? index - 1 : 0); }
function next() { manual(); apply(index < DATA.stages.length - 1 ? index + 1 : DATA.stages.length - 1); }
function reset() { manual(); apply(0); }

function play() {
  paused = false;
  auto = true;
  clearTimeout(autoTimer);
  schedule();
}

function schedule() {
  clearTimeout(autoTimer);
  if (!auto || paused || still.matches) return;
  autoTimer = setTimeout(() => {
    if (!auto || paused) return;
    if (index < DATA.stages.length - 1) apply(index + 1);
    else {
      autoTimer = setTimeout(() => {
        if (!auto || paused) return;
        apply(0);
        schedule();
      }, 2200);
      return;
    }
    schedule();
  }, 1150);
}

function arm() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (paused || still.matches) return;
    auto = true;
    apply(0, false);
    schedule();
  }, 3400);
}

stage.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-act]");
  if (button) {
    const act = button.dataset.act;
    if (act === "prev") prev();
    if (act === "next") next();
    if (act === "auto") play();
    if (act === "reset") reset();
    arm();
    return;
  }
  const tray = event.target.closest(".tray");
  if (!tray) return;
  const side = tray.dataset.side;
  const level = Number(tray.dataset.level);
  const found = DATA.stages.findIndex((item) => item.side === side && item.level === level);
  if (found >= 0) {
    manual();
    apply(found);
    arm();
  }
});

stage.addEventListener("keydown", (event) => {
  const key = event.key;
  if (key === "ArrowRight" || key === " ") { event.preventDefault(); next(); arm(); }
  if (key === "ArrowLeft") { event.preventDefault(); prev(); arm(); }
  if (key === "Home") { event.preventDefault(); reset(); arm(); }
  if (key === "End") { event.preventDefault(); manual(); apply(DATA.stages.length - 1); arm(); }
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
