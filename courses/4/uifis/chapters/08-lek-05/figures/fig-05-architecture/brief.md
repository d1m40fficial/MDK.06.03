# Figure brief: fig-05-architecture

Один стенд показывает три архитектуры: где выполняется представление, логика и данные.

- **Course / chapter / position:** УФИС · Ch 8 (Лекция 5) · Fig 1 of the chapter
- **Size:** Figure (one mechanism, 40–80 parts)
- **Reader:** knows the components of an IS and that functions are distributed; now needs to see that the same three jobs can be packed into two or three nodes.

## The idea it must make obvious

Architecture is not a list of programs: it is a decision about which node does presentation, which does logic and which stores data. The same machine can be re-shafted into two or three tiers, and the work moves with the shafts.

## Truth (the model)

Three jobs (tiers): **представление** (screen, input), **логика** (rules, calculations), **данные** (storage, queries).

Three modes, cycled with the arrows:

| Mode | Tiers | Presentation | Logic | Data | Payload on the link |
|---|---|---|---|---|---|
| Файл-сервер | 2 | клиент | клиент | файловый сервер | целый файл |
| Клиент-сервер | 2 | клиент | клиент + сервер БД | сервер БД | запрос и результат |
| Трёхзвенная | 3 | клиент | сервер приложений | сервер БД | запрос и результат |

Rules:
- In файл-сервер the middle cabin is disengaged and the link carries a whole file crate; the server only stores files, all rules run on the client.
- In клиент-сервер the middle cabin is disengaged; the database server executes queries, so part of the logic sits there; the link carries small request packets.
- In трёхзвенная both shafts are engaged and the packet passes through the middle cabin; logic lives only on the application server.
- The number of engaged shafts is `tiers - 1`: 1 for the two-tier modes, 2 for the three-tier mode.

Put this in `model.mjs`: `MODES` (id, label, tiers, roles, payload, link), `JOBS` (presentation, logic, data) and a pure `route(modeIndex)` returning which cabin does each job, the number of engaged shafts and the payload kind. `build.mjs` imports it; the readout is generated from it.

Readout examples:
- `файл-сервер · звеньев 2 · логика: клиент · данные: файловый сервер · по каналу: файл`
- `клиент-сервер · звеньев 2 · логика: клиент + сервер БД · данные: сервер БД · по каналу: запрос`
- `трёхзвенная · звеньев 3 · логика: сервер приложений · данные: сервер БД · по каналу: запрос`

## The object

A reconfigurable three-cabin test stand. Three cabin housings stand in a row on one base plate: **Клиент** (left, with a small screen and keyboard), **Сервер приложений** (middle, with a gear train), **Сервер БД** (right, with a stack of disk platters). Between the cabins are two horizontal shafts with clutches. A hand crank on the left drives the line. A pallet carrying the job token travels along the shafts; the token is either a large file crate (файл-сервер) or a small packet (the other two modes).

- **What moves, and what that motion means:** the crank turns the line, the engaged shafts carry the pallet from cabin to cabin, and the cabins that do a job light up; disengaging a clutch removes that cabin from the route.
- **Mapping:** left cabin = presentation; middle cabin = application logic; right cabin = data; shafts = network links; clutch = whether that link is used; crate or packet = what travels (whole file or request); gear train = the rules that run in the logic tier; disk stack = stored data; lit cabin = the tier that performs a job.
- **The one lit part:** the pallet crossing an engaged clutch, and the cabin that receives it lighting up as the job is performed.

Build it as a real bench object: a cast base with three cabin housings, bolted flanges, hinged service doors with handles, a crank with a wooden grip, two shafts with visible dog clutches (sliding collars with teeth), a small pallet on rails, a screen inset and a keyboard block on the client, a gear train behind a window on the application server, and a stack of three platters behind a window on the DB server. Keep the course's visual family: graphite frame, warm paper labels, one calm accent per tier (client, logic, data), no glow except the active cabin lamp.

## Interaction

- **Pointer:** hover a cabin shows its job; drag the crank turns the line one step; click a clutch to engage or disengage it (the readout then reports an invalid or partial configuration).
- **Keyboard:** `←` `→` switch mode (файл-сервер, клиент-сервер, трёхзвенная); `Space` runs one pallet trip; `Home` resets to трёхзвенная.
- **Idle tour:** (1) start in трёхзвенная, both clutches engaged, packet goes client → logic → data and back; (2) switch to клиент-сервер: the middle clutch opens, the middle cabin goes dark, the packet goes client ↔ data; (3) switch to файл-сервер: the middle stays dark, the pallet becomes a file crate and travels client ↔ file server; (4) return to трёхзвенная and pause with all three cabins lit and `звеньев 3`.
- **Readout:** live line as above, plus `валов 2 из 2` or `валов 1 из 2` and `груз: файл` or `груз: запрос`.

## Card text

- **Fig:** Fig 1
- **Title:** Стенд архитектур
- **Hint:** `режимы ← → · Space: прогон`
- **Legend keys:** `shaft` = канал; `clutch` = звено включено; `pallet` = запрос или файл.
- **Caption:** Трёхзвенная архитектура: клиент показывает, сервер приложений считает, сервер БД хранит. В файл-серверной всё считает клиент, а сервер только отдаёт файлы.

## How the chapter uses it

The paragraph before: «Посмотрите на стенд. Три кабины это представление, логика и данные. Переключайте режимы стрелками: меняются не функции, а то, между какими кабинами замкнут вал». The paragraph after: «В файл-серверной кабина логики выключена, и по валу идёт целый файл. В трёхзвенной работают оба вала, а запрос проходит через среднюю кабину. Это и есть архитектура: распределение трёх работ по узлам». The comparison table in the chapter must use the same three modes and the same payload words (`файл`, `запрос`).

## Done when

- `node build.mjs` writes `fig-05-architecture.html` and `fig-05-architecture-light.html`; `--audit` passes (it has shafts, clutches and round parts).
- Anatomy's verify steps pass (desktop, 390 px phone, both themes, 4× close-ups). Read every PNG.
- A learner who only plays with the figure can say where presentation, logic and data live in each of the three modes.
