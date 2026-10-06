import { TOKENS } from "../../../lib/tokens";
import { marketStatus, canTrade } from "../../../lib/clock";
import { rwaPrice } from "../../../lib/binance";

export const dynamic = "force-dynamic";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function yahooClose(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=10d`;
  const res = await fetch(url, { headers: { "user-agent": "parity-fair" }, next: { revalidate: 300 } });
  if (!res.ok) return null;
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const stamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  for (let i = stamps.length - 1; i >= 0; i -= 1) {
    if (closes[i] != null) {
      const asOf = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(stamps[i] * 1000));
      return { closeUsd: closes[i], asOf };
    }
  }
  return null;
}

async function dexPrices(addresses) {
  if (!addresses.length) return {};
  const url = `https://api.dexscreener.com/latest/dex/tokens/${addresses.join(",")}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) return {};
  const json = await res.json();
  const out = {};
  for (const pair of json.pairs || []) {
    const addr = (pair.baseToken?.address || "").toLowerCase();
    const price = Number(pair.priceUsd || 0);
    const liq = Number(pair.liquidity?.usd || 0);
    const prev = out[addr];
    if (!prev || liq > prev.liquidityUsd) out[addr] = { priceUsd: price, liquidityUsd: liq };
  }
  return out;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get("ticker") || "NVDA").toUpperCase();
  const amount = Number(searchParams.get("amount") || 20);
  const listings = TOKENS[ticker];
  if (!listings) return Response.json({ error: "Unsupported ticker" }, { status: 400 });
  const clock = marketStatus();
  const close = await yahooClose(ticker);
  const addresses = listings.map((l) => l.address).filter(Boolean);
  const dex = await dexPrices(addresses);
  const binance = await rwaPrice(addresses);
  const byAddr = {};
  const rows = binance.data?.data;
  if (binance.ok && Array.isArray(rows)) {
    for (const row of rows) {
      const addr = String(row.tokenContractAddress || "").toLowerCase();
      if (addr) byAddr[addr] = row;
    }
  }
  const quotes = listings.map((listing) => {
    const session = canTrade(listing.hours, clock.status);
    const row = listing.address ? byAddr[listing.address.toLowerCase()] : null;
    const dexRow = listing.address ? dex[listing.address.toLowerCase()] : null;
    const ratio = num(row?.tokenToShareRatio) || listing.ratio || 1;
    const tokenPrice = num(row?.tokenPrice) || dexRow?.priceUsd || 0;
    const pricePerShare = tokenPrice > 0 ? tokenPrice / ratio : 0;
    const ref = num(row?.referencePrice) || close?.closeUsd || 0;
    const premiumPct = ref && pricePerShare ? ((pricePerShare - ref) / ref) * 100 : null;
    const status = String(row?.marketStatus || "").toLowerCase();
    const open = ["premarket", "regular", "postmarket", "overnight"].includes(status);
    let tradeable = listing.verified && pricePerShare > 0;
    let reason = listing.verified ? session.reason : listing.source;
    if (row) {
      tradeable = listing.verified && pricePerShare > 0 && (open || status === "");
      if (status === "closed" || status === "pause") {
        tradeable = false;
        reason = row.reasonMsg || (status === "pause" ? "Trading is paused." : "Session is closed.");
      } else if (status) reason = row.reasonMsg || status;
    } else if (!pricePerShare) reason = listing.verified ? "No live price for this contract." : listing.source;
    if (listing.hours !== "always" && !row && !session.ok) tradeable = false;
    return { ...listing, tokenPriceUsd: tokenPrice, pricePerShare, ratio, premiumPct, liquidityUsd: dexRow?.liquidityUsd || 0, tradeable, reason, marketStatus: status || null, dataSource: row ? "Binance Web3 RWA" : dexRow ? "DexScreener" : "none" };
  });
  const executable = quotes.filter((q) => q.tradeable).sort((a, b) => a.pricePerShare - b.pricePerShare);
  return Response.json({ ticker, amount, mode: binance.ok ? "live" : "hybrid", binanceError: binance.ok ? null : { code: binance.errorCode, message: binance.errorMsg }, clock, close, quotes, best: executable[0]?.issuer || null, pricedAt: new Date().toISOString() });
}
