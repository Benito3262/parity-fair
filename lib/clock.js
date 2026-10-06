const HOLIDAYS_2026 = new Set([
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
]);

function parts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const ymd = `${bag.year}-${bag.month}-${bag.day}`;
  const minutes = Number(bag.hour) * 60 + Number(bag.minute);
  return { ymd, minutes, weekday: bag.weekday, label: fmt.format(date) };
}

export function marketStatus(date = new Date()) {
  const p = parts(date);
  if (p.weekday === "Sat" || p.weekday === "Sun" || HOLIDAYS_2026.has(p.ymd)) {
    return { status: "closed", reason: "US cash market is closed.", asOfEt: p.label };
  }
  if (p.minutes >= 4 * 60 && p.minutes < 9 * 60 + 30) {
    return { status: "premarket", reason: "Pre-market (4:00\u20139:30 ET).", asOfEt: p.label };
  }
  if (p.minutes >= 9 * 60 + 30 && p.minutes < 16 * 60) {
    return { status: "regular", reason: "Regular session (9:30\u201316:00 ET).", asOfEt: p.label };
  }
  if (p.minutes >= 16 * 60 && p.minutes < 20 * 60) {
    return { status: "postmarket", reason: "Post-market (16:00\u201320:00 ET).", asOfEt: p.label };
  }
  return { status: "overnight", reason: "Overnight. Regular session is closed.", asOfEt: p.label };
}

export function canTrade(hours, status) {
  if (hours === "always") return { ok: true, reason: "xStocks pools are 24/7 when a verified pool exists." };
  if (status === "regular") return { ok: true, reason: "Regular US session." };
  return { ok: false, reason: "Ondo and bStocks are treated as regular-hours only until Binance says otherwise." };
}
