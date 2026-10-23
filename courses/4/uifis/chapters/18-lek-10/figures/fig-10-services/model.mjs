export const ID = "fig-10-services";
export const TITLE = "Сетевые службы";
export const HINT = "Стрелки или наведение: щуп проверяет службу.";
export const CAPTION =
  "Летучий щуп проверяет службы по одной. DNS возвращает адрес portal.uifis.test, DHCP выдаёт аренду 10.0.0.104 на 24 часа, HTTP отвечает 200 OK, NTP показывает смещение +0,004 с. Порт на модуле и табло объясняют, какая служба ответила.";
export const KEYS = [
  { mark: "lit", label: "Щуп на контакте службы" },
  { mark: "raised", label: "Четыре модуля служб" },
  { mark: "dim", label: "Порт и ответ на табло" },
];

export const SERVICES = [
  {
    id: "dns",
    label: "DNS",
    port: "53",
    result: "10.0.0.15",
    readout: "DNS · 53 · portal.uifis.test → 10.0.0.15",
    detail: "portal.uifis.test",
  },
  {
    id: "dhcp",
    label: "DHCP",
    port: "67/68",
    result: "10.0.0.104 / 24 ч",
    readout: "DHCP · 67/68 · 10.0.0.104 на 24 ч",
    detail: "аренда адреса",
  },
  {
    id: "http",
    label: "HTTP",
    port: "80/443",
    result: "200 OK",
    readout: "HTTP · 80/443 · GET /health.json → 200 OK",
    detail: "GET /health.json",
  },
  {
    id: "ntp",
    label: "NTP",
    port: "123",
    result: "+0,004 с",
    readout: "NTP · 123 · смещение +0,004 с",
    detail: "единое время",
  },
];
