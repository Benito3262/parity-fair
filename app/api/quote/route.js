import { TOKENS } from "../../lib/tokens";
import { marketStatus, canTrade } from "../../lib/clock";

export const dynamic = "force-dynamic";

async function yahooClose(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=10d`;
  const res = await fetch(url, { headers: { "user-agent": "parity-fair" }, next: { revalidate: 300 } });
  if (!res.ok) return null;
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const stamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  let last = null;
  for (let i = stamps.length - 1; i >= 0; i -= 1) {
    if (closes[i] != null) {
      last = { close: closes[i], ts: stamps[i] * 1000 };
      break;
    }
  }
  if (!last) return null;
  const asOf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(last.ts));
  return { closeUsd: last.close, asOf };
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
    if (!prev || liq > prev.liquidityUsd) {
      out[addr] = {
        priceUsd: price,
        liquidityUsd: liq,
        volume24hUsd: Number(pair.volume?.h24 || 0),
      };
    }
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

  const quotes = listings.map((listing) => {
    const session = canTrade(listing.hours, clock.status);
    const dexRow = listing.address ? dex[listing.address.toLowerCase()] : null;
    const ratio = listing.ratio || 1;
    const tokenPrice = dexRow?.priceUsd || 0;
    const pricePerShare = tokenPrice > 0 ? tokenPrice / ratio : 0;
    const premiumPct = close && pricePerShare ? ((pricePerShare - close.closeUsd) / close.closeUsd) * 100 : null;
    const impact = dexRow && amount > 0 && dexRow.liquidityUsd > 0 ? (amount / dexRow.liquidityUsd) * 100 : null;
    const thin = impact != null && impact > 8;
    let tradeable = listing.verified && session.ok && pricePerShare > 0 && !thin;
    let reason = listing.verified ? session.reason : listing.source;
    if (listing.verified && !pricePerShare) reason = "No DexScreener price for this contract.";
    if (thin) {
      tradeable = false;
      reason = "Pool too thin for this size.";
    }
    if (listing.hours !== "always" && !session.ok) tradeable = false;
    return {
      ...listing,
      tokenPriceUsd: tokenPrice,
      pricePerShare,
      premiumPct,
      impact,
      liquidityUsd: dexRow?.liquidityUsd || 0,
      tradeable,
      reason,
      dataSource: dexRow ? "DexScreener" : "none",
    };
  });

  const executable = quotes.filter((q) => q.tradeable).sort((a, b) => a.pricePerShare - b.pricePerShare);
  const best = executable[0] || null;

  return Response.json({
    ticker,
    amount,
    mode: "hybrid",
    clock,
    close,
    quotes,
    best: best ? best.issuer : null,
    pricedAt: new Date().toISOString(),
  });
}
