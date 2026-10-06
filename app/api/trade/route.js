import { quoteAndSwap, simulate } from "../../../lib/binance";
import { USDT } from "../../../lib/tokens";

export const dynamic = "force-dynamic";

function wei(amount) {
  return (BigInt(Math.round(Number(amount) * 1e6)) * BigInt(1e12)).toString();
}

function findTx(node) {
  if (!node || typeof node !== "object") return null;
  if (node.to && node.data) return node;
  if (node.tx) return findTx(node.tx);
  if (node.swapTransaction) return findTx(node.swapTransaction);
  for (const value of Object.values(node)) {
    const found = findTx(value);
    if (found) return found;
  }
  return null;
}

export async function POST(req) {
  const body = await req.json();
  const side = body.side === "sell" ? "sell" : "buy";
  const token = body.address;
  const wallet = body.wallet;
  if (!token || !wallet) return Response.json({ ok: false, error: "Connect a wallet first." }, { status: 400 });
  const from = side === "buy" ? USDT : token;
  const to = side === "buy" ? token : USDT;
  const amount = side === "buy" ? wei(body.amount || 20) : body.tokenAmount;
  if (!amount) return Response.json({ ok: false, error: "Enter how many tokens to sell." }, { status: 400 });
  const built = await quoteAndSwap({
    binanceChainId: "56",
    fromTokenAddress: from,
    toTokenAddress: to,
    amount,
    userWalletAddress: wallet,
    slippagePercent: "0.5",
  });
  if (!built.ok) return Response.json({ ok: false, error: built.errorMsg || "Buy route failed", code: built.errorCode });
  const payload = built.data?.data || built.data || {};
  const tx = findTx(payload);
  let sim = null;
  if (tx?.to && tx.data) {
    sim = await simulate({ binanceChainId: "56", evmTx: { from: tx.from || wallet, to: tx.to, data: tx.data, value: tx.value || "0" } });
  }
  return Response.json({
    ok: true,
    mode: payload.executionMode || payload.rfq?.executionMode || (payload.rfq ? "RFQ" : "SWAP"),
    toAmount: payload.toAmount || payload.quote?.toAmount || null,
    tx,
    typedData: payload.rfq?.typedDataToSign || null,
    order: payload.rfq || null,
    simOk: sim ? sim.ok && sim.data?.data?.status !== "FAILED" : false,
    simError: sim && !sim.ok ? sim.errorMsg : sim?.data?.data?.failReason || null,
    expiresAt: Date.now() + 30000,
  });
}
