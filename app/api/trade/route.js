import { quote, swap, simulate } from "../../../lib/binance";
import { USDT } from "../../../lib/tokens";

export const dynamic = "force-dynamic";

function wei(amount) {
  return (BigInt(Math.round(Number(amount) * 1e6)) * BigInt(1e12)).toString();
}

export async function POST(req) {
  const body = await req.json();
  const side = body.side === "sell" ? "sell" : "buy";
  const token = body.address;
  const wallet = body.wallet;
  if (!token || !wallet) return Response.json({ ok: false, error: "Need a token and a connected wallet." }, { status: 400 });
  const from = side === "buy" ? USDT : token;
  const to = side === "buy" ? token : USDT;
  const amount = side === "buy" ? wei(body.amount || 20) : body.tokenAmount;
  if (!amount) return Response.json({ ok: false, error: "Need an amount." }, { status: 400 });
  const q = await quote({ binanceChainId: "56", fromTokenAddress: from, toTokenAddress: to, amount, userWalletAddress: wallet });
  if (!q.ok) return Response.json({ ok: false, error: q.errorMsg || "Quote failed", code: q.errorCode });
  const route = q.data?.data?.routes?.[0] || q.data?.data || {};
  const built = await swap({ binanceChainId: "56", fromTokenAddress: from, toTokenAddress: to, amount, userWalletAddress: wallet, quoteId: route.quoteId || q.data?.data?.quoteId });
  const tx = built.data?.data?.tx;
  let sim = null;
  if (built.ok && tx?.to && tx.data) {
    sim = await simulate({ binanceChainId: "56", evmTx: { from: tx.from || wallet, to: tx.to, data: tx.data, value: tx.value || "0" } });
  }
  return Response.json({
    ok: built.ok,
    error: built.ok ? null : built.errorMsg,
    code: built.errorCode,
    quoteId: route.quoteId || null,
    expiresAt: Date.now() + 30000,
    toAmount: route.toAmount || q.data?.data?.toAmount || null,
    tx: tx || null,
    simOk: sim ? sim.ok && sim.data?.data?.status !== "FAILED" : false,
    simError: sim && !sim.ok ? sim.errorMsg : sim?.data?.data?.failReason || null,
  });
}
