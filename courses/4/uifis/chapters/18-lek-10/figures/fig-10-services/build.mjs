import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, SERVICES } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 680;
const HEIGHT = 440;

const BASE = { x: -152, y: -66, w: 304, d: 132, r: 12 };
const BASE_H = 10;
const MODULE_W = 58;
const MODULE_D = 46;
const MODULE_X = [-105, -35, 35, 105];
const MODULE_Y = -22;
const MODULE_TOP = 47;
const COL_X = [-138, 138];
const BEAM_Z = 80;
const PROBE_DROP = 5.8;

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -16, 0),
    ...k.boxCorners({ x: -40, y: -66, w: 80, d: 132 }, 0, 96),
    ...k.boxCorners({ x: -140, y: -66, w: 280, d: 20 }, 0, 96),
    [-138, -54, 97],
    [138, -54, 97],
    [0, -2, 48],
    [-152, 66, 0],
    [152, 66, 0],
  ],
  WIDTH,
  HEIGHT,
  { pad: 18, headroom: 8, azimuth: 36, elevation: 29 },
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

const rect = (x, y, w, h, fill, stroke = "none", rx = 0.4, sw = 0.22, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra}/>`;

const line = (x1, y1, x2, y2, stroke = "var(--anatomy-faint)", sw = 0.24) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>`;

const circle = (cx, cy, r, fill = "none", stroke = "none", sw = 0.25, extra = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra}/>`;

function frontFace(x, y, top, width, height, inner, className = "") {
  const o = at([x, y, top]);
  const a = at([x + 1, y, top]);
  const b = at([x, y, top - 1]);
  return `<g${className ? ` class="${className}"` : ""} transform="matrix(${(a[0] - o[0]).toFixed(4)} ${(a[1] - o[1]).toFixed(4)} ${(b[0] - o[0]).toFixed(4)} ${(b[1] - o[1]).toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})">${inner}</g>`;
}

function screws(width, height) {
  return [
    [3.2, 3.2],
    [width - 3.2, 3.2],
    [3.2, height - 3.2],
    [width - 3.2, height - 3.2],
  ]
    .map(([x, y]) => circle(x, y, 0.62, "var(--anatomy-shade-3)", "var(--anatomy-faint)", 0.18))
    .join("");
}

function dnsFace() {
  const cards = [
    ["portal", 9.2],
    ["api", 16.2],
    ["db", 23.2],
  ]
    .map(
      ([name, y], index) => `
      ${rect(10, y, 29, 6, "var(--anatomy-shade-3)", "var(--anatomy-faint)", 0.7, 0.16)}
      ${text(13, y + 4.2, name, { size: 2.5, fill: index === 0 ? "var(--anatomy-strong)" : "var(--anatomy-muted)" })}
      ${line(33, y + 1.3, 36, y + 1.3, "var(--anatomy-faint)", 0.18)}
      ${line(33, y + 3.0, 36, y + 3.0, "var(--anatomy-faint)", 0.18)}`,
    )
    .join("");
  return `
    <g data-motion="dns">${cards}</g>
    <path d="M 7.0 9.2 L 9.0 12.2 L 7.0 15.2 Z" fill="var(--anatomy-mid)"/>
    ${line(9, 9, 9, 29.4, "var(--anatomy-faint)", 0.18)}
    ${rect(40, 9, 7, 20, "var(--anatomy-shade-3)", "var(--anatomy-faint)", 0.7, 0.16)}
    ${text(43.5, 14, "A", { size: 2.8, fill: "var(--anatomy-strong)", anchor: "middle" })}
    ${text(43.5, 20, "TTL", { size: 1.65, fill: "var(--anatomy-muted)", anchor: "middle" })}
    ${text(43.5, 24.2, "300", { size: 1.75, fill: "var(--anatomy-muted)", anchor: "middle" })}`;
}

function dhcpFace() {
  return `
    ${rect(8, 9, 29, 22, "var(--anatomy-shade-3)", "var(--anatomy-faint)", 0.6, 0.16)}
    <g data-motion="dhcp">
      ${line(8, 15, 37, 15, "var(--anatomy-faint)", 0.18)}
      ${line(8, 21, 37, 21, "var(--anatomy-faint)", 0.18)}
      ${text(10, 13.5, "10.0.0.104", { size: 2.7, fill: "var(--anatomy-strong)" })}
      ${text(10, 19.5, "24 ч", { size: 2.4, fill: "var(--anatomy-muted)" })}
      ${text(10, 25.5, "шлюз 10.0.0.1", { size: 1.7, fill: "var(--anatomy-muted)" })}
    </g>
    ${line(37.2, 9, 37.2, 31, "var(--anatomy-mid)", 0.45)}
    ${circle(43, 20, 5.3, "var(--anatomy-shade-2)", "var(--anatomy-faint)", 0.22)}
    ${circle(43, 20, 2.2, "var(--anatomy-shade-3)", "var(--anatomy-faint)", 0.18)}
    ${circle(43, 20, 0.65, "var(--anatomy-mid)")}
    ${line(38.4, 9.4, 37.2, 9.0, "var(--anatomy-faint)", 0.2)}
    ${line(38.4, 30.6, 37.2, 31.0, "var(--anatomy-faint)", 0.2)}`;
}

function httpFace() {
  const slats = [11, 15, 19, 23, 27]
    .map((y) => line(4, y, 50, y, "var(--anatomy-faint)", 0.18))
    .join("");
  return `
    <defs><clipPath id="http-window"><rect x="3" y="8" width="48" height="24" rx="1"/></clipPath></defs>
    ${rect(7, 10, 40, 20, "var(--anatomy-shade-3)", "var(--anatomy-faint)", 0.7, 0.16)}
    ${line(10, 14, 31, 14, "var(--anatomy-faint)", 0.2)}
    ${line(10, 18, 34, 18, "var(--anatomy-faint)", 0.2)}
    ${line(10, 22, 28, 22, "var(--anatomy-faint)", 0.2)}
    ${text(40, 25, "200", { size: 6.4, fill: "var(--anatomy-strong)", anchor: "end" })}
    <g clip-path="url(#http-window)">
      <g data-motion="http">
        ${rect(3, 8, 48, 24, "var(--anatomy-shade-2)", "var(--anatomy-faint)", 1.0, 0.26)}
        ${slats}
        ${rect(20, 27.5, 14, 2.1, "var(--anatomy-mid)", "none", 1.0)}
      </g>
    </g>`;
}

function ntpFace() {
  const ticks = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * Math.PI) / 6;
    const r1 = index % 3 === 0 ? 6.4 : 7.4;
    const x1 = 27 + Math.sin(angle) * r1;
    const y1 = 20 - Math.cos(angle) * r1;
    const x2 = 27 + Math.sin(angle) * 8.6;
    const y2 = 20 - Math.cos(angle) * 8.6;
    return line(x1, y1, x2, y2, index % 3 === 0 ? "var(--anatomy-mid)" : "var(--anatomy-faint)", index % 3 === 0 ? 0.4 : 0.2);
  }).join("");
  return `
    ${circle(27, 20, 9.6, "var(--anatomy-shade-3)", "var(--anatomy-faint)", 0.3)}
    ${circle(27, 20, 8.7, "none", "var(--anatomy-faint)", 0.16)}
    ${ticks}
    <g data-motion="ntp">
      ${line(27, 20, 27, 12.5, "var(--anatomy-strong)", 0.75)}
      ${line(27, 20, 31.5, 20, "var(--anatomy-mid)", 0.55)}
      ${circle(27, 20, 0.8, "var(--anatomy-strong)")}
    </g>
    ${text(27, 30.2, "UTC", { size: 1.8, fill: "var(--anatomy-muted)", anchor: "middle" })}`;
}

function face(service) {
  const body = {
    dns: dnsFace,
    dhcp: dhcpFace,
    http: httpFace,
    ntp: ntpFace,
  }[service.id]();
  return `
    ${rect(0, 0, 54, 40, "var(--anatomy-shade-1)", "var(--anatomy-faint)", 1.2, 0.26)}
    ${rect(2, 2, 50, 36, "var(--anatomy-shade-2)", "none", 1.0, 0)}
    <rect class="active-strip" x="0" y="0" width="54" height="1.2" fill="var(--anatomy-lit)" opacity="0"/>
    <rect class="bezel-edge" x="0.4" y="0.4" width="53.2" height="39.2" rx="1.2" fill="none" stroke="var(--anatomy-faint)" stroke-width="0.2"/>
    ${text(4, 5.9, service.label, { size: 5.0, fill: "var(--anatomy-strong)", spacing: 0.04 })}
    ${text(50, 5.9, service.port, { size: 3.4, fill: "var(--anatomy-muted)", anchor: "end" })}
    ${rect(3, 8, 48, 24, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 1.0, 0.2)}
    ${body}
    ${text(4, 37.4, service.result, { size: 2.8, fill: "var(--anatomy-strong)" })}
    ${circle(46.5, 35.4, 1.6, "var(--anatomy-faint)", "none", 0, ' class="lamp"')}
    ${circle(46.5, 35.4, 2.35, "none", "var(--anatomy-faint)", 0.18)}
    ${screws(54, 40)}`;
}

function module(service, cx) {
  const out = [];
  const plan = { x: cx - MODULE_W / 2, y: MODULE_Y, w: MODULE_W, d: MODULE_D, r: 3 };
  const topPlan = { x: cx - 25, y: MODULE_Y + 4, w: 50, d: 38, r: 2 };
  const ticks = k.topTicks(cx - 18, cx + 18, 3, 3, 8, MODULE_TOP + 0.18, [1.2, 2.2], P, "x");
  out.push(`<g class="module" data-module="${service.id}">`);
  out.push(S(k.slabOf({ x: cx - 31, y: MODULE_Y - 4, w: 62, d: 52, r: 4 }, 0, 2, P, 4, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf(plan, 2, 42, P, 6, 0.8), { tone: "mid", crease: "lo" }));
  out.push(S(k.slabOf(topPlan, 44, 3, P, 4, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(topPlan, 4), 47.05, P, 4), { tone: "faint" }));
  out.push(`<g class="top-vent">${ticks.minor}${ticks.major}</g>`);
  out.push(frontFace(cx - 27, MODULE_Y + MODULE_D + 0.2, 43, 54, 40, face(service), "bezel"));
  out.push(S(k.cylinder(cx, -2, 5.2, MODULE_TOP, 1.2, P, 24, 0.4), { tone: "mid", className: "pad" }));
  out.push(L(k.ring(cx, -2, 2.6, MODULE_TOP + 1.25, P, 20), { tone: "faint" }));
  out.push(`</g>`);
  return out.join("");
}

function base() {
  const out = [];
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 10, 1.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0.08, P, 10), { tone: "faint" }));
  for (const [x, y] of k.corners(BASE, 11)) {
    out.push(S(k.cylinder(x, y, 3.4, -16, 6, P, 18), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 1.4, -17, 1.2, P, 14), { tone: "mid" }));
  }
  for (const [x, y] of k.corners(BASE, 17)) {
    out.push(S(k.cylinder(x, y, 1.8, 0, 1.2, P, 14), { tone: "hi", crease: "faint" }));
  }
  out.push(
    frontFace(-54, BASE.y + BASE.d + 0.2, 0.8, 108, 8, [
      rect(0, 0, 108, 8, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 1.0, 0.2),
      text(54, 5.6, "СЕТЕВЫЕ СЛУЖБЫ", { size: 3.8, fill: "var(--anatomy-strong)", anchor: "middle", spacing: 0.16 }),
    ]),
  );
  return out.join("");
}

function gantry() {
  const out = [];
  for (const x of COL_X) {
    out.push(S(k.slabOf({ x: x - 11, y: -65, w: 22, d: 22, r: 3 }, 0, 3, P, 4, 0.4), { tone: "lo" }));
    out.push(S(k.slabOf({ x: x - 6, y: -60, w: 12, d: 14, r: 2 }, 3, 77, P, 4, 0.6), { tone: "mid", crease: "lo" }));
    out.push(S(k.slabOf({ x: x - 8, y: -62, w: 16, d: 18, r: 2 }, 79, 5, P, 4, 0.6), { tone: "hi" }));
    for (const [bx, by] of [
      [x - 7, -59],
      [x + 7, -59],
      [x - 7, -49],
      [x + 7, -49],
    ]) {
      out.push(S(k.cylinder(bx, by, 1.35, 3, 1.2, P, 12), { tone: "hi" }));
    }
  }
  out.push(S(k.slabOf({ x: -140, y: -58, w: 280, d: 12, r: 2 }, BEAM_Z, 7, P, 4, 0.7), { tone: "hi", crease: "lo" }));
  out.push(S(k.slabOf({ x: -140, y: -64, w: 280, d: 3, r: 1 }, 87, 2, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -140, y: -51, w: 280, d: 3, r: 1 }, 87, 2, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -134, y: -56, w: 268, d: 3, r: 1 }, 89, 1.4, P, 3, 0.2), { tone: "lo" }));
  for (let x = -124; x <= 124; x += 24) {
    out.push(S(k.cylinder(x, -54.5, 1.1, 90.2, 0.8, P, 10), { tone: "mid" }));
  }
  out.push(
    frontFace(-36, -45.8, 86.8, 72, 6, [
      rect(0, 0, 72, 6, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 0.8, 0.18),
      text(36, 4.1, "ПРОБНИК СЛУЖБ", { size: 2.2, fill: "var(--anatomy-muted)", anchor: "middle", spacing: 0.08 }),
    ]),
  );
  return out.join("");
}

function carriage() {
  const out = [];
  out.push(`<g data-carriage>`);
  out.push(S(k.slabOf({ x: -10, y: -66, w: 20, d: 20, r: 2.2 }, 86, 8, P, 4, 0.8), { tone: "hi", crease: "lo" }));
  out.push(S(k.slabOf({ x: -12, y: -64, w: 4, d: 16, r: 1 }, 84, 10, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 8, y: -64, w: 4, d: 16, r: 1 }, 84, 10, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -4, y: -58, w: 8, d: 12, r: 1.4 }, 78, 8, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -5, y: -58, w: 10, d: 56, r: 2 }, 72, 6, P, 4, 0.6), { tone: "hi", crease: "lo" }));
  out.push(S(k.slabOf({ x: -7, y: -4, w: 14, d: 8, r: 2 }, 70, 8, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(0, -2, 3.4, 60, 12, P, 24), { tone: "mid", crease: "faint" }));
  out.push(S(k.cylinder(0, -2, 4.2, 70, 2.4, P, 24), { tone: "hi" }));
  out.push(L(k.ring(0, -2, 3.8, 72.5, P, 24), { tone: "faint" }));
  out.push(`<g data-probe>`);
  out.push(S(k.cylinder(0, -2, 1.45, 54, 9, P, 16), { tone: "hi", crease: "lo" }));
  out.push(S(k.cylinder(0, -2, 2.55, 56.8, 2.2, P, 18), { tone: "mid", crease: "lo" }));
  out.push(S(k.cylinder(0, -2, 1.0, 54, 1.9, P, 14), { tone: "hi" }));
  out.push(L(k.ring(0, -2, 2.35, 56.9, P, 18), { tone: "faint" }));
  out.push(`</g>`);
  out.push(S(k.slabOf({ x: -3, y: -60, w: 6, d: 4, r: 1 }, 89, 2, P, 3), { tone: "lo" }));
  out.push(`</g>`);
  return out.join("");
}

const EXTRA_CSS = `
.iso-stage{--anatomy-shade-0:#d5d5d2;--anatomy-shade-1:#e0e0dd;--anatomy-shade-2:#e9e9e6;--anatomy-shade-3:#f1f1ee;--anatomy-mid:#74747a;--anatomy-lo:#a4a4a8;--anatomy-faint:#b9b9bd}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-mid);outline-offset:-2px;border-radius:6px}
.module .lamp{transition:fill .3s var(--anatomy-ease)}
.module[data-active="true"] .lamp{fill:var(--anatomy-lit)}
.module[data-active="true"] .active-strip{opacity:1}
.module[data-active="true"] .bezel-edge{stroke:var(--anatomy-lit);stroke-width:.55}
.module[data-active="true"] .pad .iso-top{fill:var(--anatomy-lit)}
.module[data-active="true"] .pad .iso-edge{stroke:var(--anatomy-lit)}
.module[data-active="true"] .bezel rect{transition:stroke .3s var(--anatomy-ease)}
[data-carriage],[data-probe]{will-change:transform}
.fig-controls{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;max-width:none;margin:10px auto 0}
.fig-controls button{font:10px/1.1 var(--anatomy-mono);letter-spacing:.04em;color:var(--anatomy-text);background:var(--anatomy-card);border:1px solid var(--anatomy-faint);border-radius:3px;padding:5px 7px;cursor:pointer}
.fig-controls button:hover,.fig-controls button:focus-visible{color:var(--anatomy-lit);border-color:var(--anatomy-mid);outline:none}
.fig-controls button[data-act="auto"]{color:var(--anatomy-muted)}
@media (prefers-reduced-motion:reduce){
  .module .lamp,.module .bezel-edge,.module[data-active="true"] .active-strip{transition:none}
}
@media (max-width:560px){
  .fig-controls{justify-content:center;margin-top:8px}
  .fig-controls button{font-size:8.5px;padding:4px 5px}
}
`;

function build(theme) {
  const art = [];
  art.push(base());
  art.push(gantry());
  for (let i = 0; i < SERVICES.length; i += 1) {
    art.push(module(SERVICES[i], MODULE_X[i]));
  }
  art.push(carriage());

  const origin = at([0, 0, 0]);
  const shifts = MODULE_X.map((x) => {
    const p = at([x, 0, 0]);
    return [Number((p[0] - origin[0]).toFixed(3)), Number((p[1] - origin[1]).toFixed(3))];
  });
  const drop = at([0, 0, -PROBE_DROP]);
  const probeShift = [Number((drop[0] - origin[0]).toFixed(3)), Number((drop[1] - origin[1]).toFixed(3))];

  const data = {
    services: SERVICES,
    stops: MODULE_X,
    shifts,
    probeShift,
  };

  const body = k.plateHtml({
    fig: "Fig 1",
    title: TITLE,
    hint: HINT,
    readout: SERVICES[0].readout,
    keys: KEYS,
    caption: CAPTION,
    body: `<style>${EXTRA_CSS}</style><div class="iso-stage" tabindex="0" aria-label="Испытательный стенд сетевых служб: портал с подвижным щупом проверяет модули DNS, DHCP, HTTP и NTP. Стрелки переключают службу, наведение выбирает модуль, пробел включает автопоказ.">${k.figureSvg({
      width: WIDTH,
      height: HEIGHT,
      label:
        "Изометрический испытательный стенд: четыре модуля сетевых служб на плите, портал с подвижным щупом, контактные площадки и табло с портом и ответом.",
      body: art.join(""),
    })}<div class="fig-controls"><button type="button" data-act="prev">←</button><button type="button" data-act="next">Служба →</button><button type="button" data-act="auto">Авто</button><button type="button" data-act="reset">Сброс</button></div></div>`,
  });

  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  const html = k.pageHtml({ title: ID, theme, body, script: kitScript() + liveScript(data) }).replace(/[ \t]+$/gm, "");
  writeFileSync(join(HERE, name), html);
  console.log("wrote", name);
}

function liveScript(data) {
  return `
const DATA = ${JSON.stringify(data)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const carriage = svg.querySelector("[data-carriage]");
const probe = svg.querySelector("[data-probe]");
const modules = [...svg.querySelectorAll(".module")];
const motions = {
  dns: svg.querySelector('[data-motion="dns"]'),
  dhcp: svg.querySelector('[data-motion="dhcp"]'),
  http: svg.querySelector('[data-motion="http"]'),
  ntp: svg.querySelector('[data-motion="ntp"]'),
};
const still = matchMedia("(prefers-reduced-motion: reduce)");
let index = 0;
let x = DATA.stops[0];
let targetX = DATA.stops[0];
let probePos = 0;
let probeTarget = 0;
let auto = false;
let paused = true;
let nextTour = 4.4;
let last = performance.now();
let clock = 0;

readout.setAttribute("aria-live", "polite");

function select(next) {
  index = Math.max(0, Math.min(DATA.services.length - 1, next));
  targetX = DATA.stops[index];
  readout.textContent = DATA.services[index].readout;
  nextTour = 4.4;
  for (const el of modules) {
    el.dataset.active = el.dataset.module === DATA.services[index].id ? "true" : "false";
  }
}

function manual() {
  auto = false;
  paused = true;
}

function next() { manual(); select(index + 1); }
function prev() { manual(); select(index - 1); }
function reset() { manual(); select(0); }
function play() { auto = true; paused = false; nextTour = 0.1; }

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;

  if (auto && !paused && !still.matches) {
    nextTour -= dt;
    if (nextTour <= 0) {
      select((index + 1) % DATA.services.length);
    }
  }

  const dx = targetX - x;
  if (still.matches || Math.abs(dx) < 0.02) {
    x = targetX;
  } else {
    x += dx * Math.min(1, dt * 5.4);
  }

  probeTarget = Math.abs(targetX - x) < 0.35 ? 1 : 0;
  if (still.matches) {
    probePos = probeTarget;
  } else {
    probePos += (probeTarget - probePos) * Math.min(1, dt * 9);
    if (Math.abs(probeTarget - probePos) < 0.01) probePos = probeTarget;
  }

  const progress = (x - DATA.stops[0]) / (DATA.stops[DATA.stops.length - 1] - DATA.stops[0]);
  const shift = [
    DATA.shifts[0][0] + (DATA.shifts[DATA.shifts.length - 1][0] - DATA.shifts[0][0]) * progress,
    DATA.shifts[0][1] + (DATA.shifts[DATA.shifts.length - 1][1] - DATA.shifts[0][1]) * progress,
  ];
  carriage.style.transform = "translate(" + shift[0].toFixed(2) + "px," + shift[1].toFixed(2) + "px)";
  probe.style.transform = "translate(" + (DATA.probeShift[0] * probePos).toFixed(2) + "px," + (DATA.probeShift[1] * probePos).toFixed(2) + "px)";

  const active = DATA.services[index].id;
  if (motions.dns) {
    motions.dns.setAttribute("transform", "translate(0 " + (active === "dns" ? Math.sin(clock * 2.2) * 2.1 : 0).toFixed(2) + ")");
  }
  if (motions.dhcp) {
    motions.dhcp.setAttribute("transform", "translate(0 " + (active === "dhcp" ? Math.sin(clock * 1.8) * 2.2 - 1.0 : 0).toFixed(2) + ")");
  }
  if (motions.http) {
    motions.http.setAttribute("transform", "translate(0 " + (active === "http" ? (-24 * probePos).toFixed(2) : "0") + ")");
  }
  if (motions.ntp) {
    const angle = active === "ntp" ? 18 + ((clock * 46) % 360) : 18;
    motions.ntp.setAttribute("transform", "rotate(" + angle.toFixed(2) + " 27 20)");
  }

  requestAnimationFrame(tick);
}

stage.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-act]");
  if (button) {
    const act = button.dataset.act;
    if (act === "prev") prev();
    if (act === "next") next();
    if (act === "auto") play();
    if (act === "reset") reset();
    return;
  }
  const module = event.target.closest(".module");
  if (module) {
    const found = DATA.services.findIndex((item) => item.id === module.dataset.module);
    if (found >= 0) { manual(); select(found); }
  }
});

for (const module of modules) {
  module.addEventListener("pointerenter", () => {
    const found = DATA.services.findIndex((item) => item.id === module.dataset.module);
    if (found >= 0) { manual(); select(found); }
  });
}

stage.addEventListener("keydown", (event) => {
  const key = event.key;
  if (key === "ArrowRight" || key === "ArrowUp" || key === " ") { event.preventDefault(); next(); }
  if (key === "ArrowLeft" || key === "ArrowDown") { event.preventDefault(); prev(); }
  if (key === "Home") { event.preventDefault(); reset(); }
  if (key === "End") { event.preventDefault(); manual(); select(DATA.services.length - 1); }
  if (key === "r" || key === "R" || key === "к" || key === "К") { reset(); }
  if (key === "a" || key === "A" || key === "ф" || key === "Ф") { play(); }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    auto = false;
  } else if (!paused && !still.matches) {
    auto = true;
    nextTour = 1.2;
  }
});

select(0);
if (!still.matches) {
  setTimeout(() => {
    if (!paused) return;
    auto = true;
    paused = false;
    nextTour = 1.5;
  }, 3600);
}
requestAnimationFrame(tick);
`;
}

build("dark");
build("light");
