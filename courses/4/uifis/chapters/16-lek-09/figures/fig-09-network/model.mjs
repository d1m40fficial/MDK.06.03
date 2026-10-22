export const PAYLOAD = 1200;
export const TCP_HEADER = 20;
export const IP_HEADER = 20;
export const ETH_HEADER = 14;
export const FCS = 4;

export const SEGMENT = PAYLOAD + TCP_HEADER;
export const PACKET = SEGMENT + IP_HEADER;
export const FRAME = PACKET + ETH_HEADER + FCS;
export const BITS = FRAME * 8;

export const FLOW = {
  srcIp: "192.168.1.10",
  dstIp: "10.0.0.9",
  srcPort: 51514,
  dstPort: 443,
  ttlStart: 64,
  ttlEnd: 62,
  routers: 2,
  mss: 1460,
};

export const MACS = {
  client: "02:00:00:00:00:10",
  router1Lan: "02:00:00:00:00:01",
  router1Wan: "02:00:00:00:01:01",
  router2Lan: "02:00:00:00:02:01",
  server: "02:00:00:00:00:09",
};

export const LAYERS = [
  { n: 7, src: "Приложение", dst: "Приложение" },
  { n: 6, src: "Представление", dst: "Представление" },
  { n: 5, src: "Сеанс", dst: "Сеанс" },
  { n: 4, src: "Транспорт", dst: "Транспорт" },
  { n: 3, src: "Сеть", dst: "Сеть" },
  { n: 2, src: "Канал", dst: "Канал" },
  { n: 1, src: "Физика", dst: "Физика" },
];

function stage(data) {
  return {
    ttl: FLOW.ttlStart,
    srcMac: MACS.client,
    dstMac: MACS.router1Lan,
    ...data,
  };
}

export const STAGES = [
  stage({
    step: 0,
    side: "tx",
    level: 7,
    moving: "idle",
    size: PAYLOAD,
    label: "Данные приложения",
    readout: `L7 · данные ${PAYLOAD} Б · GET /grades`,
  }),
  stage({
    step: 1,
    side: "tx",
    level: 7,
    moving: "down",
    size: PAYLOAD,
    label: "HTTP-запрос",
    readout: `L7 · HTTP · данные ${PAYLOAD} Б`,
  }),
  stage({
    step: 2,
    side: "tx",
    level: 4,
    moving: "down",
    size: SEGMENT,
    label: "TCP-сегмент",
    readout: `L4 · TCP +${TCP_HEADER} Б · ${FLOW.srcPort} → ${FLOW.dstPort} · ${SEGMENT} Б`,
  }),
  stage({
    step: 3,
    side: "tx",
    level: 3,
    moving: "down",
    size: PACKET,
    label: "IP-пакет",
    readout: `L3 · IP +${IP_HEADER} Б · ${FLOW.srcIp} → ${FLOW.dstIp} · TTL 64`,
  }),
  stage({
    step: 4,
    side: "tx",
    level: 2,
    moving: "down",
    size: FRAME,
    label: "Ethernet-кадр",
    readout: `L2 · Ethernet +${ETH_HEADER + FCS} Б · кадр ${FRAME} Б`,
    srcMac: MACS.client,
    dstMac: MACS.router1Lan,
  }),
  stage({
    step: 5,
    side: "wire",
    level: 2,
    moving: "across",
    size: FRAME,
    label: "Маршрутизатор 1",
    readout: "R1 · TTL 63 · новый MAC-конверт",
    ttl: 63,
    srcMac: MACS.router1Wan,
    dstMac: MACS.router2Lan,
  }),
  stage({
    step: 6,
    side: "wire",
    level: 2,
    moving: "across",
    size: FRAME,
    label: "Маршрутизатор 2",
    readout: "R2 · TTL 62 · новый MAC-конверт",
    ttl: 62,
    srcMac: MACS.router2Lan,
    dstMac: MACS.server,
  }),
  stage({
    step: 7,
    side: "rx",
    level: 1,
    moving: "up",
    size: FRAME,
    label: "Кадр на сервере",
    readout: `L1 сервера · ${FRAME} Б · ${BITS} бит`,
    ttl: 62,
    srcMac: MACS.router2Lan,
    dstMac: MACS.server,
  }),
  stage({
    step: 8,
    side: "rx",
    level: 2,
    moving: "up",
    size: PACKET,
    label: "Снят Ethernet",
    readout: `L2 сервера · снят Ethernet · ${PACKET} Б`,
    ttl: 62,
    srcMac: MACS.router2Lan,
    dstMac: MACS.server,
  }),
  stage({
    step: 9,
    side: "rx",
    level: 3,
    moving: "up",
    size: SEGMENT,
    label: "Снят IP",
    readout: `L3 сервера · снят IP · ${SEGMENT} Б · TTL 62`,
    ttl: 62,
    srcMac: MACS.router2Lan,
    dstMac: MACS.server,
  }),
  stage({
    step: 10,
    side: "rx",
    level: 4,
    moving: "up",
    size: PAYLOAD,
    label: "Снят TCP",
    readout: `L4 сервера · снят TCP · ${PAYLOAD} Б`,
    ttl: 62,
    srcMac: MACS.router2Lan,
    dstMac: MACS.server,
  }),
  stage({
    step: 11,
    side: "rx",
    level: 7,
    moving: "up",
    size: PAYLOAD,
    label: "Данные доставлены",
    readout: `L7 сервера · данные ${PAYLOAD} Б доставлены`,
    ttl: 62,
    srcMac: MACS.router2Lan,
    dstMac: MACS.server,
  }),
];

export function summarize(current) {
  return current.readout;
}

export const RESULT = {
  segment: SEGMENT,
  packet: PACKET,
  frame: FRAME,
  bits: BITS,
  ttlStart: FLOW.ttlStart,
  ttlEnd: FLOW.ttlEnd,
  routers: FLOW.routers,
  mss: FLOW.mss,
};
