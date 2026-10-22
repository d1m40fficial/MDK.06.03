export const ID = "fig-10-services";
export const TITLE = "Сетевые службы";
export const HINT = "Наведите или используйте стрелки.";
export const CAPTION = "Шесть служб на общей шине. Каретка останавливается у DNS, DHCP, HTTP, файлов, почты или NTP, а табло показывает порт.";
export const KEYS = [
  { mark: "lit", label: "Каретка: текущая служба" },
  { mark: "raised", label: "Шесть станций служб" },
  { mark: "dim", label: "Направление обхода" },
];
export const STATIONS = [
  { label: "DNS", short: "53", detail: "53 UDP/TCP · имя в адрес" },
  { label: "DHCP", short: "67/68", detail: "67/68 UDP · адрес и шлюз" },
  { label: "HTTP", short: "80/443", detail: "80/443 TCP · страницы и API" },
  { label: "ФАЙЛЫ", short: "445", detail: "445/2049 TCP · общие каталоги" },
  { label: "ПОЧТА", short: "25", detail: "25/143/993 · ящики" },
  { label: "NTP", short: "123", detail: "123 UDP · единое время" },
];
