// Figure fig-06-hardware: a 16U training rack whose units pool four resources.
// Truth: ./model.mjs. Run "node build.mjs" for both themes.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../../../_anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../../../../_anatomy/scripts/inline-kit.mjs";
import {
  CAPACITY,
  UNITS,
  formatTotals,
  gauges,
  initial,
  shortLine,
} from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ID = "fig-06-hardware";
const WIDTH = 460;
const HEIGHT = 420;
const FRONT = 30;
const RACK = { x: -60, y: -36, w: 120, d: 72, r: 4 };
const RACK_TOP = 188;

const P = k.fitProjection(
  [...k.boxCorners({ x: -66, y: -42, w: 132, d: 84, r: 5 }, -12, 194)],
  WIDTH,
  HEIGHT - 44,
  { pad: 16, azimuth: 45, elevation: 28 },
);
P.origin[0] -= 72;

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function faceGroup(x, y, z, w, h, inner, className = "") {
  const [ox, oy] = k.iso([x, y, z], P);
  const [ex, ey] = k.iso([x + 1, y, z], P);
  const [dx, dy] = k.iso([x, y, z - 1], P);
  const a = [ex - ox, ey - oy];
  const b = [dx - ox, dy - oy];
  return `<g${className ? ` class="${className}"` : ""} transform="matrix(${a[0].toFixed(4)} ${a[1].toFixed(4)} ${b[0].toFixed(4)} ${b[1].toFixed(4)} ${ox.toFixed(2)} ${oy.toFixed(2)})">${inner}</g>`;
}

const rect = (x, y, w, h, fill, stroke = "none", rx = 0.4, sw = 0.25) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

const text = (
  x,
  y,
  value,
  { size = 2.5, fill = "var(--anatomy-strong)", anchor = "start", spacing = 0 } = {},
) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}" font-family="var(--anatomy-mono)">${esc(value)}</text>`;

const solid = (plan, z, h, { tone = "lo", steps = 6, bevel = 0.4, className = "" } = {}) =>
  k.solidSvg(k.slabOf(plan, z, h, P, steps, bevel), {
    tone,
    className,
    crease: "faint",
    lit: true,
  });

const labelPlate = (x, y, w, h, value) =>
  rect(x, y, w, h, "var(--anatomy-shade-1)", "var(--anatomy-faint)", 0.6, 0.22) +
  text(x + w / 2, y + h * 0.68, value, {
    size: Math.min(3.1, h * 0.55),
    anchor: "middle",
    spacing: 0.18,
  });

function gauge(cx, cy, key, label, value) {
  const angle = -60 + value * 1.2;
  return [
    `<circle cx="${cx}" cy="${cy}" r="5.9" fill="var(--anatomy-shade-1)" stroke="var(--anatomy-mid)" stroke-width="0.28"/>`,
    `<circle cx="${cx}" cy="${cy}" r="4.75" fill="none" stroke="var(--anatomy-faint)" stroke-width="0.5" stroke-dasharray="0.32 0.78"/>`,
    text(cx, cy - 6.5, label, { size: 1.85, fill: "var(--anatomy-muted)", anchor: "middle" }),
    `<path class="gauge-needle" data-needle="${key}" data-cx="${cx}" data-cy="${cy}" d="M${cx} ${cy} L${cx} ${cy - 4.15}" fill="none" stroke="var(--anatomy-lit)" stroke-width="0.38" stroke-linecap="round" data-free="both" transform="rotate(${angle} ${cx} ${cy})"/>`,
    `<circle cx="${cx}" cy="${cy}" r="0.62" fill="var(--anatomy-lit)"/>`,
    `<text x="${cx}" y="${cy + 6.2}" data-gauge-num="${key}" text-anchor="middle" font-size="1.9" fill="var(--anatomy-strong)" font-family="var(--anatomy-mono)">${value}</text>`,
  ].join("");
}

function monitorFace(unit, state) {
  const g = gauges(state);
  const inner = [
    rect(0, 0, 95.2, unit.h - 1.4, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 0.5, 0.3),
    text(47.6, 2.7, "РЕСУРСЫ СТОЙКИ", { size: 1.9, fill: "var(--anatomy-muted)", anchor: "middle", spacing: 0.18 }),
    gauge(14, 11.4, "cpu", "ЦП", g.cpu),
    gauge(36, 11.4, "ram", "ОЗУ", g.ram),
    gauge(58, 11.4, "disk", "ДИСК", g.disk),
    gauge(80, 11.4, "net", "СЕТЬ", g.net),
  ];
  return faceGroup(-47.6, FRONT + 0.06, unit.z + unit.h - 0.7, 95.2, unit.h - 1.4, inner.join(""));
}

function blankFace(unit) {
  const slots = Array.from({ length: 7 }, (_, i) =>
    rect(7, 3 + i * 1.9, 82, 0.65, "var(--anatomy-shade-0)", "none", 0.2, 0),
  ).join("");
  return faceGroup(
    -47.6,
    FRONT + 0.06,
    unit.z + unit.h - 0.7,
    95.2,
    unit.h - 1.4,
    rect(0, 0, 95.2, unit.h - 1.4, "var(--rack-face)", "var(--rack-line)", 0.4, 0.24) +
      slots +
      `<circle cx="92" cy="${(unit.h - 1.4) / 2}" r="0.7" fill="var(--anatomy-faint)"/>`,
  );
}

function patchFace(unit) {
  const ports = [];
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < 12; i += 1) {
      const x = 3.2 + i * 6.15;
      const y = 2.6 + row * 4.8;
      ports.push(rect(x, y, 4.5, 3.4, "var(--anatomy-shade-0)", "var(--anatomy-mid)", 0.25, 0.2));
      if (i < 2) ports.push(rect(x + 1.1, y + 1.0, 2.3, 1.5, "var(--anatomy-mid)", "none", 0.15, 0));
    }
  }
  return faceGroup(
    -47.6,
    FRONT + 0.06,
    unit.z + unit.h - 0.7,
    95.2,
    unit.h - 1.4,
    rect(0, 0, 95.2, unit.h - 1.4, "var(--rack-face)", "var(--rack-line)", 0.4, 0.24) +
      ports.join("") +
      text(79, 5.3, "24", { size: 2.2, fill: "var(--anatomy-muted)", anchor: "middle" }) +
      text(79, 8.6, "ПАТЧ", { size: 2.5, fill: "var(--anatomy-strong)", anchor: "middle", spacing: 0.16 }),
  );
}

function switchFace(unit) {
  const ports = [];
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < 12; i += 1) {
      ports.push(
        rect(3.2 + i * 5.7, 2.5 + row * 4.8, 4.1, 3.3, "var(--anatomy-shade-0)", "var(--anatomy-mid)", 0.25, 0.2),
      );
    }
  }
  for (let i = 0; i < 4; i += 1) {
    ports.push(rect(74 + i * 5.1, 3.0, 4.0, 4.6, "var(--anatomy-shade-1)", "var(--anatomy-mid)", 0.3, 0.22));
  }
  return faceGroup(
    -47.6,
    FRONT + 0.06,
    unit.z + unit.h - 0.7,
    95.2,
    unit.h - 1.4,
    rect(0, 0, 95.2, unit.h - 1.4, "var(--rack-face)", "var(--rack-line)", 0.4, 0.24) +
      ports.join("") +
      `<circle class="unit-led" cx="94" cy="4.2" r="0.8" fill="var(--anatomy-green)"/>` +
      text(93.4, 8.8, "10G", { size: 2.0, fill: "var(--anatomy-muted)", anchor: "end", spacing: 0.1 }),
  );
}

function serverFace(unit) {
  const id = unit.id === "srv-a" ? "A" : "B";
  const bays = Array.from({ length: 8 }, (_, i) => {
    const x = 2.8 + i * 4.8;
    return (
      rect(x, 2.4, 4.0, 13.8, "var(--anatomy-shade-0)", "var(--anatomy-mid)", 0.35, 0.22) +
      rect(x + 0.7, 3.3, 2.6, 1.0, "var(--anatomy-shade-2)", "none", 0.15, 0) +
      `<circle cx="${x + 2}" cy="14.3" r="0.42" fill="var(--anatomy-green)"/>`
    );
  }).join("");
  const grille = Array.from({ length: 8 }, (_, i) =>
    rect(41.5, 3.0 + i * 1.75, 32, 0.72, "var(--anatomy-shade-0)", "var(--anatomy-faint)", 0.2, 0.14),
  ).join("");
  const right = [
    text(77.5, 5.2, `СЕРВЕР ${id}`, { size: 2.6, fill: "var(--anatomy-strong)", spacing: 0.16 }),
    rect(78, 7.2, 15, 6.8, "var(--anatomy-shade-1)", "var(--anatomy-mid)", 0.5, 0.24),
    `<circle class="unit-led" cx="80.2" cy="9.0" r="0.65" fill="var(--anatomy-green)"/>`,
    `<circle cx="82.4" cy="9.0" r="0.65" fill="var(--anatomy-faint)"/>`,
    `<circle cx="84.6" cy="9.0" r="0.65" fill="var(--anatomy-faint)"/>`,
    `<circle cx="80.2" cy="11.2" r="0.65" fill="var(--anatomy-blue)"/>`,
    `<circle cx="91.6" cy="13.6" r="1.6" fill="var(--anatomy-shade-0)" stroke="var(--anatomy-mid)" stroke-width="0.28"/>`,
    `<path d="M90.6 13.6 L92.6 13.6 M91.6 12.6 L91.6 14.6" stroke="var(--anatomy-strong)" stroke-width="0.28" stroke-linecap="round" data-free="both"/>`,
    text(77.5, 17.3, "2U · 16C · 128G", { size: 1.8, fill: "var(--anatomy-muted)", spacing: 0.04 }),
  ].join("");
  return faceGroup(
    -47.6,
    FRONT + 0.06,
    unit.z + unit.h - 0.7,
    95.2,
    unit.h - 1.4,
    rect(0, 0, 95.2, unit.h - 1.4, "var(--rack-face)", "var(--rack-line)", 0.4, 0.24) +
      bays +
      grille +
      right,
  );
}

function storageFace(unit) {
  const bays = Array.from({ length: 12 }, (_, i) => {
    const x = 2.2 + i * 6.8;
    return (
      rect(x, 2.6, 6.1, 30.0, "var(--anatomy-shade-0)", "var(--anatomy-mid)", 0.5, 0.24) +
      rect(x + 0.8, 3.8, 4.5, 2.0, "var(--anatomy-shade-2)", "none", 0.2, 0) +
      `<circle cx="${x + 5}" cy="29.2" r="0.48" fill="var(--anatomy-green)"/>` +
      text(x + 3.05, 13.8, String(i + 1), { size: 1.6, fill: "var(--anatomy-muted)", anchor: "middle" })
    );
  }).join("");
  const psu = (y) =>
    rect(85.2, y, 8.2, 12.4, "var(--anatomy-shade-1)", "var(--anatomy-mid)", 0.5, 0.24) +
    rect(86.5, y + 2.0, 5.5, 1.0, "var(--anatomy-shade-0)", "none", 0.2, 0) +
    rect(86.5, y + 4.4, 5.5, 1.0, "var(--anatomy-shade-0)", "none", 0.2, 0) +
    `<circle cx="92.2" cy="${y + 9.8}" r="0.55" fill="var(--anatomy-green)"/>`;
  return faceGroup(
    -47.6,
    FRONT + 0.06,
    unit.z + unit.h - 0.7,
    95.2,
    unit.h - 1.4,
    rect(0, 0, 95.2, unit.h - 1.4, "var(--rack-face)", "var(--rack-line)", 0.4, 0.24) +
      bays +
      psu(2.6) +
      psu(18.0) +
      text(89.3, 17.1, "20 ТБ", { size: 1.9, fill: "var(--anatomy-muted)", anchor: "middle" }) +
      text(89.3, 33.3, "RAID 6", { size: 1.9, fill: "var(--anatomy-muted)", anchor: "middle" }),
  );
}

function upsFace(unit) {
  const cells = Array.from({ length: 5 }, (_, i) =>
    rect(9 + i * 4.6, 6.4, 3.2, 5.2, i < 4 ? "var(--anatomy-green)" : "var(--anatomy-shade-0)", "var(--anatomy-mid)", 0.2, 0.18),
  ).join("");
  const outlets = Array.from({ length: 6 }, (_, i) => {
    const x = 47 + (i % 3) * 14.5;
    const y = 4.5 + Math.floor(i / 3) * 8.2;
    return (
      rect(x, y, 11.5, 6.6, "var(--anatomy-shade-1)", "var(--anatomy-mid)", 0.4, 0.22) +
      `<circle cx="${x + 3.2}" cy="${y + 3.3}" r="1.1" fill="var(--anatomy-shade-0)" stroke="var(--anatomy-faint)" stroke-width="0.2"/>` +
      `<circle cx="${x + 8.2}" cy="${y + 3.3}" r="1.1" fill="var(--anatomy-shade-0)" stroke="var(--anatomy-faint)" stroke-width="0.2"/>`
    );
  }).join("");
  return faceGroup(
    -47.6,
    FRONT + 0.06,
    unit.z + unit.h - 0.7,
    95.2,
    unit.h - 1.4,
    rect(0, 0, 95.2, unit.h - 1.4, "var(--rack-face)", "var(--rack-line)", 0.4, 0.24) +
      rect(3.5, 3.8, 38, 16.0, "var(--anatomy-shade-0)", "var(--anatomy-mid)", 0.5, 0.3) +
      text(22.5, 6.2, "6 кВА", { size: 2.8, fill: "var(--anatomy-strong)", anchor: "middle", spacing: 0.12 }) +
      cells +
      `<circle class="unit-led" cx="38.8" cy="5.2" r="0.65" fill="var(--anatomy-green)"/>` +
      outlets +
      text(3.8, 24.3, "UPS · 5,4 кВт", { size: 1.8, fill: "var(--anatomy-muted)", spacing: 0.04 }) +
      text(91.5, 24.3, "~30 МИН", { size: 1.8, fill: "var(--anatomy-muted)", anchor: "end", spacing: 0.04 }),
  );
}

function unitFace(unit, state) {
  if (unit.id === "monitor") return monitorFace(unit, state);
  if (unit.id === "blank") return blankFace(unit);
  if (unit.id === "patch") return patchFace(unit);
  if (unit.id === "switch") return switchFace(unit);
  if (unit.id === "storage") return storageFace(unit);
  if (unit.id === "ups") return upsFace(unit);
  return serverFace(unit);
}

function unitGroup(unit, state) {
  const bodyPlan = { x: -48, y: -20, w: 96, d: 48, r: 1 };
  const panelPlan = { x: -48, y: FRONT - 2, w: 96, d: 2, r: 0.8 };
  const selected = unit.id === "srv-a";
  const attributes = [
    `class="unit"`,
    `data-unit="${unit.id}"`,
    `data-label="${esc(unit.label)}"`,
    `data-u="${unit.u}"`,
    `data-cores="${unit.cores}"`,
    `data-ram="${unit.ram}"`,
    `data-disk="${unit.disk}"`,
    `data-net="${unit.net}"`,
    `data-watts="${unit.watts}"`,
    `data-switchable="${unit.switchable}"`,
    `data-short-on="${esc(shortLine(unit, state))}"`,
    `data-short-off="${esc(shortLine(unit, { ...state, [unit.id]: false }))}"`,
    `data-off="false"`,
    `data-selected="${selected}"`,
  ].join(" ");
  const body = solid(bodyPlan, unit.z + 0.6, unit.h - 1.2, { tone: "lo", bevel: 0.45 });
  const panel = solid(panelPlan, unit.z + 0.7, unit.h - 1.4, {
    tone: "hi",
    bevel: 0.22,
    className: "unit-panel",
    steps: 4,
  });
  return `<g ${attributes}>${body}${panel}${unitFace(unit, state)}</g>`;
}

function post(plan, from = 0, to = 180) {
  return solid(plan, from, to - from, { tone: "mid", bevel: 0.55, steps: 4 });
}

function patchCords() {
  const patch = UNITS.find((unit) => unit.id === "patch");
  const sw = UNITS.find((unit) => unit.id === "switch");
  const out = [];
  for (let i = 0; i < 4; i += 1) {
    const x = -39 + i * 8.4;
    const a = k.iso([x, FRONT + 0.15, patch.z + 2.6], P);
    const b = k.iso([x + 0.8, FRONT + 0.15, sw.z + 7.8], P);
    const d = `M${a[0]} ${a[1]} C${a[0] + 4.5} ${a[1] + 10}, ${b[0] + 4.5} ${b[1] - 9}, ${b[0]} ${b[1]}`;
    out.push(k.lineSvg(d, { tone: "hi", className: "patch-cord" }));
    out.push(k.dotsSvg([a, b], { size: 0.9, tone: "hi" }));
  }
  return out.join("");
}

function resourcePanel(state) {
  const g = gauges(state);
  const rows = [
    ["cpu", "ЯДРА", g.cpu, "var(--anatomy-blue)"],
    ["ram", "ПАМЯТЬ", g.ram, "var(--anatomy-green)"],
    ["disk", "ДИСК", g.disk, "var(--anatomy-hi)"],
    ["net", "СЕТЬ", g.net, "var(--anatomy-mid)"],
  ];
  const x = 330;
  const y = 116;
  const w = 118;
  const track = w - 20;
  const out = [
    rect(x, y, w, 188, "var(--anatomy-card)", "var(--anatomy-faint)", 8, 0.45),
    text(x + 10, y + 15, "РЕСУРСЫ", { size: 9.5, fill: "var(--anatomy-strong)", spacing: 0.18 }),
    text(x + w - 10, y + 15, "ДОЛЯ", { size: 7.5, fill: "var(--anatomy-muted)", anchor: "end", spacing: 0.12 }),
  ];
  rows.forEach(([key, label, value, color], index) => {
    const top = y + 27 + index * 39;
    out.push(
      text(x + 10, top + 8, label, { size: 8.2, fill: "var(--anatomy-text)", spacing: 0.1 }),
      `<text x="${x + w - 10}" y="${top + 8}" data-bar-val="${key}" text-anchor="end" font-size="8.2" fill="var(--anatomy-strong)" font-family="var(--anatomy-mono)">${value}%</text>`,
      rect(x + 10, top + 15, track, 2.8, "var(--anatomy-shade-2)", "none", 1.4, 0),
      `<rect data-bar="${key}" data-track="${track}" x="${x + 10}" y="${top + 15}" width="${(track * value) / 100}" height="2.8" rx="1.4" fill="${color}"/>`,
    );
  });
  out.push(text(x + 10, y + 180, "полная конфигурация", { size: 7.2, fill: "var(--anatomy-muted)" }));
  return `<g class="resource-panel">${out.join("")}</g>`;
}

function statusStrip(state) {
  const y = HEIGHT - 20;
  return [
    `<rect x="40" y="${y - 12}" width="${WIDTH - 80}" height="0.7" fill="var(--anatomy-faint)"/>`,
    text(40, y + 1.4, "ИТОГО", { size: 8, fill: "var(--anatomy-muted)", spacing: 0.2 }),
    `<text x="${WIDTH - 40}" y="${y + 1.4}" data-totals text-anchor="end" font-size="9.5" fill="var(--anatomy-strong)" font-family="var(--anatomy-mono)" letter-spacing="0.02">${esc(formatTotals(state))}</text>`,
  ].join("");
}

function build(theme) {
  const state = initial();
  const art = [];

  art.push(`<path class="iso-halo" d="${k.haloOf({ x: -66, y: -42, w: 132, d: 84, r: 6 }, -12, 16, P)}"/>`);

  for (const [x, y] of [[-54, -30], [48, -30], [-54, 24], [48, 24]]) {
    art.push(solid({ x, y, w: 6, d: 6, r: 2.6 }, -10, 6, { tone: "lo", bevel: 0.4, steps: 5 }));
  }

  art.push(solid({ x: -62, y: -38, w: 124, d: 76, r: 5 }, -4, 10, { tone: "mid", bevel: 0.5 }));
  art.push(solid({ x: -57, y: -34, w: 114, d: 68, r: 2 }, 6, 5, { tone: "lo", bevel: 0.35 }));

  art.push(solid({ x: -51, y: -33, w: 102, d: 2, r: 0.8 }, 8, 168, { tone: "lo", bevel: 0.3 }));
  art.push(solid({ x: -57, y: -31, w: 2, d: 58, r: 0.8 }, 8, 168, { tone: "lo", bevel: 0.3 }));

  art.push(post({ x: -56, y: -36, w: 6, d: 6, r: 1.2 }));
  art.push(post({ x: 50, y: -36, w: 6, d: 6, r: 1.2 }));

  for (const unit of [...UNITS].sort((a, b) => a.z - b.z)) {
    art.push(unitGroup(unit, state.state));
  }

  art.push(post({ x: -56, y: FRONT, w: 6, d: 6, r: 1.2 }));
  art.push(post({ x: 50, y: FRONT, w: 6, d: 6, r: 1.2 }));

  art.push(solid({ x: -62, y: -38, w: 124, d: 76, r: 5 }, 180, 8, { tone: "mid", bevel: 0.55, steps: 7 }));
  art.push(
    faceGroup(
      -62,
      38.06,
      RACK_TOP,
      124,
      8,
      rect(2, 1.1, 120, 5.8, "var(--anatomy-shade-1)", "var(--anatomy-faint)", 0.8, 0.24) +
        text(62, 5.0, "УЧЕБНАЯ СТОЙКА · 16U", {
          size: 3.3,
          fill: "var(--anatomy-strong)",
          anchor: "middle",
          spacing: 0.22,
        }),
       "top-label",
    ),
  );

  art.push(patchCords());
  art.push(resourcePanel(state.state));
  art.push(statusStrip(state.state));

  const caption =
    "Учебная стойка 16U: два сервера по 16 ядер и 128 ГБ, СХД на 20 ТБ полезной ёмкости, коммутатор 10 Гбит/с и ИБП 6 кВА. В исходном состоянии все юниты включены: 32 ядра, 256 ГБ, 24 ТБ, 10 Гбит/с, 1,59 кВт.";

  const body = k.plateHtml({
    fig: "Fig 1",
    title: "Серверная стойка: четыре ресурса",
    hint: "Стрелки выбирают · Space включает",
    readout: shortLine(UNITS.find((unit) => unit.id === "srv-a"), state.state),
    keys: [
      { mark: "lit", label: "выбран" },
      { mark: "dim", label: "выключен" },
    ],
    caption,
    body: `<style>${EXTRA_CSS}</style><div class="iso-stage" tabindex="0">${k.figureSvg({
      width: WIDTH,
      height: HEIGHT,
      label:
        "Учебная серверная стойка на 16 юнитов: ИБП, СХД, два сервера, коммутатор, патч-панель, резервный юнит и панель мониторинга. Шкалы показывают суммарные вычисления, память, диск и сеть.",
      body: art.join(""),
    })}</div>`,
  });

  const name = theme === "light" ? `${ID}-light.html` : `${ID}.html`;
  writeFileSync(
    join(HERE, name),
    k.pageHtml({ title: ID, theme, body, script: kitScript() + liveScript(state.state) }),
  );
  console.log("wrote", name);
}

const EXTRA_CSS = `
.iso-stage{--rack-face:#2d2d2d;--rack-line:#696969;--rack-recess:#171717;--rack-raised:#3a3a3a}
body[data-theme="light"] .iso-stage{--rack-face:#f1f1ee;--rack-line:#b7b7b3;--rack-recess:#e4e4df;--rack-raised:#ffffff}
.unit{cursor:pointer;transition:opacity .32s cubic-bezier(.32,.72,0,1)}
.unit[data-off="true"]{opacity:.36}
.unit[data-off="true"] .unit-led{fill:var(--anatomy-red)}
.unit[data-selected="true"] .unit-panel .iso-edge{stroke:var(--anatomy-lit);stroke-width:1}
.unit:hover .unit-panel .iso-edge{stroke:var(--anatomy-lit);stroke-width:.8}
.unit face text,.unit text{pointer-events:none}
.gauge-needle{transition:transform .38s cubic-bezier(.32,.72,0,1)}
.patch-cord{stroke-width:1.15;stroke-linecap:round}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-mid);outline-offset:8px;border-radius:8px}
`;

function liveScript(state) {
  return `
const CAP = ${JSON.stringify(CAPACITY)};
const stage = document.querySelector(".iso-stage");
const units = [...document.querySelectorAll(".unit")];
const readout = document.querySelector("[data-readout]");
const totalsEl = document.querySelector("[data-totals]");
const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
let selected = units.find((u) => u.dataset.unit === "srv-a") || units[0];
let idleToken = 0;
let idleStep = 0;

const unitOf = (id) => units.find((u) => u.dataset.unit === id);
const isOff = (u) => u.dataset.off === "true";

function sum() {
  const total = { cores: 0, ram: 0, disk: 0, net: 0, watts: 0 };
  for (const u of units) {
    if (isOff(u)) continue;
    total.cores += Number(u.dataset.cores);
    total.ram += Number(u.dataset.ram);
    total.disk += Number(u.dataset.disk);
    total.net += Number(u.dataset.net);
    total.watts += Number(u.dataset.watts);
  }
  return total;
}

function pluralCores(n) {
  if (n === 1) return "ядро";
  if (n >= 2 && n <= 4) return "ядра";
  return "ядер";
}

function totalsText(t) {
  return "итого: " + t.cores + " " + pluralCores(t.cores) + " · " + t.ram + " ГБ · " +
    nf.format(t.disk) + " ТБ · " + nf.format(t.net) + " Гбит/с · " +
    (t.watts / 1000).toFixed(2).replace(".", ",") + " кВт · ИБП " +
    Math.round((t.watts / 5400) * 100) + "%";
}

function setNeedle(key, percent) {
  const needle = document.querySelector('[data-needle="' + key + '"]');
  if (!needle) return;
  const angle = -60 + percent * 1.2;
  needle.setAttribute("transform", "rotate(" + angle + " " + needle.dataset.cx + " " + needle.dataset.cy + ")");
  const number = needle.parentElement.querySelector('[data-gauge-num="' + key + '"]');
  if (number) number.textContent = String(percent);
}

function render() {
  const t = sum();
  if (totalsEl) totalsEl.textContent = totalsText(t);
  const values = {
    cpu: Math.round((t.cores / CAP.cores) * 100),
    ram: Math.round((t.ram / CAP.ram) * 100),
    disk: Math.round((t.disk / CAP.disk) * 100),
    net: Math.round((t.net / CAP.net) * 100),
  };
  for (const key of Object.keys(values)) {
    setNeedle(key, values[key]);
    const bar = document.querySelector('[data-bar="' + key + '"]');
    if (bar) bar.setAttribute("width", (Number(bar.dataset.track) * values[key]) / 100);
    const barValue = document.querySelector('[data-bar-val="' + key + '"]');
    if (barValue) barValue.textContent = values[key] + "%";
  }
  for (const u of units) {
    u.dataset.selected = u === selected ? "true" : "false";
    u.dataset.off = u.dataset.off === "true" ? "true" : "false";
  }
  if (readout) {
    const short = isOff(selected) ? selected.dataset.shortOff : selected.dataset.shortOn;
    readout.textContent = short || selected.dataset.label;
  }
}

function selectUnit(unit) {
  if (!unit) return;
  selected = unit;
  render();
}

function move(step) {
  const index = units.indexOf(selected);
  selectUnit(units[(index + step + units.length) % units.length]);
}

function toggle() {
  if (!selected || selected.dataset.switchable !== "true") return;
  selected.dataset.off = isOff(selected) ? "false" : "true";
  render();
}

function resetAll() {
  for (const u of units) u.dataset.off = "false";
  selectUnit(unitOf("srv-a"));
}

function restartIdle() {
  idleToken += 1;
  idleStep = 0;
  clearInterval(window.__rackIdle);
  window.__rackIdle = setInterval(tick, 4800);
}

function tick() {
  if (document.hidden) return;
  const order = ["monitor", "patch", "switch", "srv-a", "srv-b", "storage", "ups"];
  const unit = unitOf(order[idleStep % order.length]);
  idleStep += 1;
  if (unit) selectUnit(unit);
  if (unit && unit.dataset.unit === "srv-b") {
    const token = idleToken;
    unit.dataset.off = "true";
    render();
    setTimeout(() => {
      if (token !== idleToken) return;
      unit.dataset.off = "false";
      render();
    }, 1500);
  }
}

stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    move(event.key === "ArrowRight" ? 1 : -1);
    restartIdle();
  } else if (event.code === "Space") {
    event.preventDefault();
    toggle();
    restartIdle();
  } else if (event.key === "Home") {
    event.preventDefault();
    resetAll();
    restartIdle();
  }
});

stage.addEventListener("click", () => stage.focus({ preventScroll: true }));

for (const unit of units) {
  unit.addEventListener("click", (event) => {
    event.stopPropagation();
    if (unit === selected) toggle();
    else selectUnit(unit);
    stage.focus({ preventScroll: true });
    restartIdle();
  });
}

window.addEventListener("resize", () => {});
restartIdle();
render();
`;
}

build("dark");
build("light");
