import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import { ID, TITLE, HINT, CAPTION, KEYS, STATIONS } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 620;
const HEIGHT = 420;
const N = STATIONS.length;

const PLATE = { x: -150, y: -70, w: 300, d: 140, r: 12 };
const PLATE_H = 12;
const FOOT_H = 5;
const RAIL_FROM = -124;
const RAIL_TO = 124;
const CARRIAGE = { x: -26, y: -24, w: 52, d: 48, r: 3 };
const CARRIAGE_Z = 3;
const CARRIAGE_TOP = 9;
const STATION_X = Array.from({ length: N }, (_, index) => -105 + index * (210 / (N - 1)));
const STATION = { y: -58, w: 20, d: 24, h: 14 };

const points = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  [RAIL_FROM - 8, 0, 16],
  [RAIL_TO + 8, 0, 16],
  [STATION_X[0], STATION.y, STATION.h + 2],
  [STATION_X[N - 1], STATION.y + STATION.d, STATION.h + 2],
];
const P = k.fitProjection(points, WIDTH, HEIGHT, { pad: 26, azimuth: 42, elevation: 30 });

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
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of [-20, 15]) {
    out.push(S(k.slabOf({ x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: 5, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL_FROM + 6, RAIL_TO - 6].map((x) => at([x, y + 2.5, 3])), { size: 0.4 }));
  }
  for (const x of [RAIL_FROM - 5, RAIL_TO]) {
    out.push(S(k.slabOf({ x, y: -23, w: 5, d: 46, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
  }
  return out.join("");
}

function stations() {
  const out = [];
  STATIONS.forEach((station, index) => {
    const x = STATION_X[index];
    const plan = { x: x - STATION.w / 2, y: STATION.y, w: STATION.w, d: STATION.d, r: 2 };
    out.push(S(k.slabOf(plan, 0, STATION.h, P, 4, 0.6), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(plan, 2), STATION.h, P, 3), { tone: "faint" }));
    const p = at([x, STATION.y + STATION.d / 2, STATION.h + 1.2]);
    out.push(
      `<text x="${p[0].toFixed(2)}" y="${p[1].toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="7.2" fill="var(--anatomy-strong)" font-family="var(--anatomy-mono)">${index + 1}</text>`,
    );
  });
  return out.join("");
}

function carriage() {
  const out = [];
  out.push(S(k.slabOf(CARRIAGE, CARRIAGE_Z, CARRIAGE_TOP - CARRIAGE_Z, P, 5, 0.6), { tone: "mid" }));
  out.push(D([-20, -7, 7, 20].map((x) => at([x, CARRIAGE.y + CARRIAGE.d - 2.6, CARRIAGE_TOP])), { size: 0.4, tone: "lo" }));
  out.push(L(k.lineOnTop([CARRIAGE.x, 15.5], [CARRIAGE.x + CARRIAGE.w, 15.5], CARRIAGE_TOP, P), { tone: "faint" }));
  out.push(S(k.slabOf({ x: -2, y: CARRIAGE.y - 8, w: 4, d: 8, r: 1 }, CARRIAGE_TOP - 2, 3, P, 2), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 4.2, CARRIAGE_TOP, 5, P, 24), { tone: "hi", lit: true }));
  out.push(L(k.ring(0, 0, 4.2, CARRIAGE_TOP + 5, P, 24), { tone: "lo" }));
  const handle = [CARRIAGE.x + CARRIAGE.w - 8, CARRIAGE.y + CARRIAGE.d + 3];
  out.push(S(k.cylinder(handle[0], handle[1] + 1, 3, CARRIAGE_Z, 5, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(handle[0], handle[1] + 1, 3, CARRIAGE_Z, CARRIAGE_Z + 5, 18, P), { tone: "lo" }));
  return out.join("");
}

const startX = STATION_X[0];
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An inspection conveyor on a surface plate. A carriage with a lit beacon slides along two rails past six numbered service stations. The readout names the station under the carriage and its protocol.",
  body: [
    plate(),
    rails(),
    stations(),
    `<g data-part="carriage" transform="${k.translateAlong(P, [startX, 0, 0])}">${carriage()}</g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const STOPS = ${JSON.stringify(STATION_X)};
const STATIONS = ${JSON.stringify(STATIONS)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const nearest = (value) => STOPS.reduce((best, stop, index) => Math.abs(stop - value) < Math.abs(STOPS[best] - value) ? index : best, 0);
const tourAt = (t) => STOPS[Math.floor(t / 2.4) % STOPS.length];
let x = ${startX}, target = x;
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
function draw() {
  carriage.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  const index = nearest(x);
  const station = STATIONS[index];
  const text = station.label + " · " + station.short;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(index));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = tourAt(clock); }
  x = calm ? target : x + (target - x) * (1 - Math.exp(-dt / 0.26));
  if (Math.abs(target - x) < 0.01) x = target;
  draw();
  const settled = !touring && x === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  target = clamp(next, STOPS[0], STOPS[STOPS.length - 1]);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.18) / 0.64, 0, 1);
  steer(STOPS[Math.round(share * (STOPS.length - 1))]);
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  const here = nearest(target);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(STOPS.length - 1, here + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, here - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = STOPS.length - 1;
  if (to === null) return;
  event.preventDefault();
  steer(STOPS[to]);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: TITLE,
  hint: HINT,
  readout: `${STATIONS[0].label} · ${STATIONS[0].short}`,
  keys: KEYS,
  caption: CAPTION,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${TITLE}: стрелки перемещают каретку по службам" aria-valuemin="0" aria-valuemax="${N - 1}" aria-valuenow="0">${svg}</div>`,
});

for (const theme of ["dark", "light"]) {
  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(join(HERE, name), k.pageHtml({ title: TITLE, theme, body, script: kitScript() + live }));
  console.log("wrote", name);
}
