# Figure brief: fig-09-network

Пакет спускается по семи уровням, обрастает конвертами, проходит два маршрутизатора и поднимается на сервере.

- **Course / chapter / position:** УФИС, МДК.06.03 · Ch 16 (лекция 9) · Fig 1 of the chapter
- **Size:** Figure, about 65 to 85 parts
- **Reader:** знает, что компьютеры соединены сетью, но смешивает IP-адрес, MAC-адрес, порт и уровень, на котором работает коммутатор или маршрутизатор.

## The idea it must make obvious
Каждый уровень добавляет свой заголовок при отправке и снимает его при получении; IP-адреса не меняются по пути, MAC-адреса меняются на каждом участке, а TTL уменьшается на каждом маршрутизаторе.

## Truth (the model)
Use `./model.mjs`; every byte count and address comes from it.

- **Inputs:** payload 1200 B, TCP header 20 B, IP header 20 B, Ethernet header 14 B, Ethernet FCS 4 B.
- **Sizes:** TCP segment 1220 B, IP packet 1240 B, Ethernet frame 1258 B, on the wire 10064 bits.
- **Flow:** source `192.168.1.10:51514`, destination `10.0.0.9:443`, TTL starts at 64, two routers, TTL at the server 62, MSS 1460 B.
- **Addresses:** client MAC `02:00:00:00:00:10`, first-hop router MAC `02:00:00:00:00:01`, router 1 WAN MAC `02:00:00:00:01:01`, router 2 LAN MAC `02:00:00:00:02:01`, server MAC `02:00:00:00:00:09`.
- **Rules:** application data 1200 B. TCP adds 20 B and ports. IP adds 20 B and addresses. Ethernet adds 14 B header and 4 B FCS. Each router removes the incoming Ethernet frame, decrements TTL, chooses the next hop and builds a new Ethernet frame. The IP packet and TCP segment stay the same. At the server the envelopes come off in reverse order: Ethernet, IP, TCP, then data.
- **Concrete values:** stage sizes `1200`, `1200`, `1220`, `1240`, `1258`, `1258`, `1258`, `1258`, `1240`, `1220`, `1200`, `1200`; TTL `64` until the first router, `63` after it, `62` after the second.

## The object
A postal conveyor station. Two vertical racks of seven trays face each other: the left rack is the sender, the right rack is the server. Each tray is one OSI level, numbered 7 at the top to 1 at the bottom. A packet crate rides a lift between trays. At every level a clerk wraps the crate in a colored paper sleeve with a printed header tag. At the bottom a belt carries the wrapped crate through two router gates. On the right rack the same clerks remove the sleeves in reverse order.

- **What moves:** the crate moves down the left rack, across the belt through two gates, then up the right rack; each tray either adds or removes one sleeve, and a TTL dial clicks down at each gate.
- **Mapping:** left rack -> sender stack; right rack -> receiver stack; tray number -> OSI layer; crate -> payload; sleeve -> protocol header; printed tag -> address and port fields; belt -> physical link; gate -> router; TTL dial -> time to live; mail slot at tray 7 -> application.
- **The one lit part:** the crate and the sleeve added or removed at the current tray, because the reader must see that headers are added and stripped, not converted into data.

## Interaction
- **Pointer:** hover a tray to name its level and protocol data unit; click a tray to jump to that stage. Drag does nothing.
- **Keyboard:** `Right` and `Space` step forward; `Left` steps back; `Home` goes to the start; `End` jumps to delivery; `R` resets.
- **Idle tour:** show data at tray 7; add TCP at tray 4; add IP at tray 3; add Ethernet at tray 2; send through router 1 and show TTL 63 and the new MAC; send through router 2 and show TTL 62; climb the right rack and strip Ethernet, IP, TCP; deliver 1200 B at tray 7. Nine beats, about 11 seconds total.
- **Readout:** `L3 · IP +20 Б · 192.168.1.10 → 10.0.0.9 · TTL 64`, then `R2 · TTL 62 · новый MAC-конверт`, then `L7 сервера · данные 1200 Б доставлены`.

## Card text
- **Fig:** Fig 1
- **Title:** Семь конвертов
- **Hint:** `→ шаг · Space авто · R сброс`
- **Legend keys:** `lit` пакет, `raised` новый заголовок, `dim` уровни
- **Caption:** Пакет 1200 байт спускается по семи уровням: TCP добавляет 20 байт, IP ещё 20, Ethernet ещё 18. На двух маршрутизаторах TTL падает с 64 до 62, а MAC-конверт меняется на каждом участке. Получатель снимает конверты в обратном порядке и отдаёт те же 1200 байт.

## How the chapter uses it
The paragraph before names the two racks and the seven trays. After the figure, the text points at tray 4 for the port pair, tray 3 for the IP pair and TTL, and the two gates for the MAC change. It asks the reader to step to the server and confirm that the payload is again 1200 B. The chapter repeats the same byte counts and addresses.

## Done when
- `node build.mjs` writes `fig-09-network.html` and `fig-09-network-light.html`; `--audit` passes if the geometry has pipes, cables or round parts.
- Anatomy verify steps pass on desktop and 390 px, both themes, with 4x close-ups.
- A reader can point to the exact tray where 20 bytes of TCP, 20 bytes of IP, and 18 bytes of Ethernet appear and disappear.
