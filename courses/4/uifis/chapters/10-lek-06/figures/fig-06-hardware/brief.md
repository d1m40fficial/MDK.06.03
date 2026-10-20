# fig-06-hardware

**Figure.** Fig 1 in the lecture “Аппаратное обеспечение информационной системы”.

**One idea.** A server rack is not a pile of boxes: it is a pool of four resources
(compute, memory, storage, network) plus power and cooling. Each unit occupies its
place and contributes a measurable share. Switching a unit off removes its share,
and the gauges show which resource the rack loses.

**Object.** A 16U training server rack, four posts, a plinth, a top cap and an open
right side. From bottom to top:

- `ups`, 3U: uninterruptible power supply, 6 kVA / 5.4 kW, 6 outlets, LCD and
  battery bars.
- `storage`, 4U: disk shelf with 12 caddies of 2 TB in RAID 6, 20 TB usable,
  550 W, two PSUs.
- `srv-b`, 2U: server, 16 cores, 128 GB ECC, 2 TB local disk, 450 W.
- `srv-a`, 2U: server, same specification, 450 W.
- `switch`, 1U: 24-port 10 Gbit/s switch, four uplinks, 120 W.
- `patch`, 1U: 24-port passive patch panel.
- `blank`, 1U: vented blanking panel, reserved space.
- `monitor`, 2U: resource monitoring panel with four analogue gauges for CPU, RAM,
  disk and network, 20 W.

Four patch cords run from the patch panel down to the switch. The front posts are
left of the unit fronts, so the panels stay readable. A small label plate on the top
cap reads `УЧЕБНАЯ СТОЙКА · 16U`.

**Truth.** The model lives in `model.mjs`; every number in the figure, card and
chapter comes from it.

- All on: 32 cores, 256 GB RAM, 24 TB disk, 10 Gbit/s, 1590 W (1.59 kW), UPS load
  29 percent, about 30 minutes of autonomy.
- Server A or B off: 16 cores, 128 GB RAM, 22 TB disk, 10 Gbit/s, 1140 W, UPS load
  21 percent.
- Storage off: 4 TB of local server disks remain, 1040 W, data availability lost.
- Switch off: network falls to 0, all other resources remain, 1470 W.
- Monitor, patch panel and UPS are informative units: `Space` does not switch them.
- Gauges show the percentage of the full configuration: CPU 32 cores, RAM 256 GB,
  disk 24 TB, network 10 Gbit/s. At full configuration every needle points straight
  up; turning off server A drops CPU and RAM to 50 percent, disk to 92 percent.

**Interaction.** `←` `→` select a unit. `Space` switches the selected server, storage
or switch on and off; the readout, totals strip and all four gauges update. `Home`
restores every unit. Clicking a unit selects it; clicking the selected unit toggles
it. A calm idle tour selects each unit in turn and briefly switches server B off,
then restores it. Any key or pointer interaction restarts the tour.

**Composition.** Card width 600, height 380. Rack occupies the left and centre;
the monitoring panel is the brightest face; the status strip at the bottom prints
the live totals. Four-tone shading, painter's order: plinth, rear panel, side panel,
unit bodies bottom to top, front panels, posts, top cap, patch cords, monitor face,
status strip. Selected unit gets a light outline; a switched-off unit fades to 38
percent and its LED turns red. The palette is the standard Anatomy dark and light
pair, no custom colours except the existing red and green tokens.

**Caption.** “Учебная стойка 16U: два сервера по 16 ядер и 128 ГБ, СХД на 20 ТБ
полезной ёмкости, коммутатор 10 Гбит/с и ИБП 6 кВА. В исходном состоянии все юниты
включены: 32 ядра, 256 ГБ, 24 ТБ, 10 Гбит/с, 1,59 кВт.”
