"use client";

import { useState } from "react";

const FALLBACK = ["NVDA", "AAPL", "AMZN", "AMD", "NFLX"];

export default function Page() {
  const [ticker, setTicker] = useState("NVDA");
  const [amount, setAmount] = useState(20);
  const [data, setData] = useState(null);
  const [wallet, setWallet] = useState("");
  const [side, setSide] = useState("buy");
  const [trade, setTrade] = useState(null);
  const [hash, setHash] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const stocks = data?.stocks?.map((s) => s.ticker) || FALLBACK;

  async function connect() {
    const eth = window.ethereum;
    if (!eth) { setError("Open this page in Binance Wallet or MetaMask."); return; }
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] }).catch(() => eth.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x38", chainName: "BNB Smart Chain", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: ["https://bsc-dataseed.binance.org"], blockExplorerUrls: ["https://bscscan.com"] }] }));
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    setWallet(accounts[0] || "");
  }

  async function compare() {
    setLoading(true); setError(""); setTrade(null); setHash("");
    const res = await fetch(`/api/quote?ticker=${ticker}&amount=${amount}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error || "Quote failed"); return; }
    setData(json);
  }

  async function prepare(route) {
    if (!wallet) { setError("Connect a wallet first."); return; }
    setLoading(true); setError(""); setHash("");
    const res = await fetch("/api/trade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ side, address: route.address, amount, wallet }) });
    const json = await res.json();
    setLoading(false);
    setTrade({ ...json, symbol: route.symbol });
    if (!json.ok) setError(json.error || "Trade route failed");
  }

  async function sign() {
    if (!trade?.tx || !window.ethereum) return;
    if (trade.expiresAt && Date.now() > trade.expiresAt) { setError("Quote expired (30 seconds). Run it again."); return; }
    const tx = await window.ethereum.request({ method: "eth_sendTransaction", params: [{ from: wallet, to: trade.tx.to, data: trade.tx.data, value: trade.tx.value || "0x0" }] });
    setHash(tx);
  }

  const best = data?.quotes?.find((q) => q.issuer === data.best);

  return (
    <main>
      <div className="kicker">BNB Hack: Tokenized Stocks Edition</div>
      <h1>Parity</h1>
      <p className="lede">The fair price for every tokenized stock. Compare bStocks, Ondo, and xStocks, then buy or sell the best route.</p>
      <button className="chip" onClick={connect}>{wallet ? wallet.slice(0, 6) + "..." + wallet.slice(-4) : "Connect wallet"}</button>
      <label>Amount (USD)</label>
      <input value={amount} inputMode="decimal" onChange={(e) => setAmount(Number(e.target.value || 0))} />
      <label>Stock</label>
      <div className="chips">{stocks.map((t) => <button key={t} className={t === ticker ? "chip on" : "chip"} onClick={() => setTicker(t)}>{t}</button>)}</div>
      <div className="chips"><button className={side === "buy" ? "chip on" : "chip"} onClick={() => setSide("buy")}>Buy</button><button className={side === "sell" ? "chip on" : "chip"} onClick={() => setSide("sell")}>Sell</button></div>
      <button className="primary" onClick={compare}>{loading ? "Checking..." : `Find fair price for $${amount || 0} of ${ticker}`}</button>
      {error && <p className="bad">{error}</p>}
      {data && <p className="muted">US market: {data.clock.reason} Last close {data.close ? `$${data.close.closeUsd.toFixed(2)} (${data.close.asOf})` : "unavailable"}. Data: {data.mode}. Catalog rows: {data.catalogCount || 0}.</p>}
      {data?.quotes?.map((q) => (
        <article key={q.issuer} className={q.issuer === data.best ? "card best" : "card"}>
          <strong>{q.name} · {q.symbol}</strong>
          <div className="row"><span>Can trade?</span><span className={q.tradeable ? "good" : "bad"}>{q.tradeable ? "Yes" : "No"}</span></div>
          <div className="row"><span>Price / share</span><span>{q.pricePerShare ? `$${q.pricePerShare.toFixed(2)}` : "—"}</span></div>
          <div className="row"><span>1 token</span><span>{q.ratio} share</span></div>
          <div className="row"><span>Vs last close</span><span>{q.premiumPct == null ? "—" : `${q.premiumPct > 0 ? "+" : ""}${q.premiumPct.toFixed(2)}%`}</span></div>
          <p className="muted">{q.reason}{best && q.tradeable && q.issuer !== best.issuer ? ` About $${((q.pricePerShare - best.pricePerShare) * (amount / q.pricePerShare)).toFixed(2)} more than the best route.` : ""}</p>
          {q.issuer === data.best && <p className="good">Best route for this size.</p>}
          {q.tradeable && <button className="chip" onClick={() => prepare(q)}>{side === "buy" ? "Dry-run buy" : "Dry-run sell"}</button>}
        </article>
      ))}
      {trade && <article className="card"><strong>{trade.symbol} {side}</strong><p>{trade.simOk ? "Simulation passed. Sign in the wallet. Nothing is auto-signed." : trade.simError || trade.error || "Route returned. Review before signing."}</p>{trade.tx && <button className="primary" onClick={sign}>Sign {side}</button>}{hash && <p><a href={`https://bscscan.com/tx/${hash}`}>View on BscScan</a></p>}</article>}
      <footer>BNB Hack: Tokenized Stocks Edition by BNB Chain and Binance Web3 Wallet. Spot only on BSC. <a href="https://github.com/Benito3262/parity-fair">GitHub</a></footer>
    </main>
  );
}
