"use client";

import { useState } from "react";

const FALLBACK = ["NVDA", "AAPL", "AMZN", "AMD", "NFLX", "ORCL", "PLTR", "PYPL", "QCOM"];
const PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694";

export default function Page() {
  const [ticker, setTicker] = useState("NVDA");
  const [amount, setAmount] = useState(20);
  const [data, setData] = useState(null);
  const [wallet, setWallet] = useState("");
  const [provider, setProvider] = useState(null);
  const [side, setSide] = useState("buy");
  const [trade, setTrade] = useState(null);
  const [hash, setHash] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState(false);
  const stocks = data?.stocks?.map((s) => s.ticker) || FALLBACK;
  const action = side === "buy" ? "Buy" : "Sell";
  const best = data?.quotes?.find((q) => q.issuer === data.best);

  function useProvider(next, account) {
    setProvider(next);
    setWallet(account || "");
    setSheet(false);
  }

  async function connectInjected() {
    const eth = window.ethereum;
    if (!eth) { setError("No browser wallet on this page. Use WalletConnect."); return; }
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] }).catch(() => null);
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    useProvider(eth, accounts[0]);
  }

  async function connectWalletConnect() {
    setError("");
    const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
    const wc = await EthereumProvider.init({
      projectId: PROJECT_ID,
      optionalChains: [56],
      showQrModal: true,
      rpcMap: { 56: "https://bsc-dataseed.binance.org" },
      metadata: { name: "Parity", description: "Fair price for tokenized stocks", url: "https://parity-fair.vercel.app", icons: ["https://parity-fair.vercel.app/logo.jpg"] },
    });
    await wc.connect();
    useProvider(wc, wc.accounts?.[0]);
  }

  async function compare() {
    setLoading(true); setError(""); setTrade(null); setHash("");
    const res = await fetch(`/api/quote?ticker=${ticker}&amount=${amount}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error || "Quote failed"); return; }
    setData(json);
  }

  async function buy(route) {
    if (!wallet) { setSheet(true); return; }
    setLoading(true); setError(""); setHash("");
    const res = await fetch("/api/trade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ side, address: route.address, amount, wallet }) });
    const json = await res.json();
    setLoading(false);
    setTrade({ ...json, symbol: route.symbol });
    if (!json.ok) setError(json.error || "Buy failed");
  }

  async function sign() {
    if (!provider) return;
    if (trade?.expiresAt && Date.now() > trade.expiresAt) { setError("Quote expired (30 seconds). Tap Buy again."); return; }
    if (trade?.tx) {
      const tx = await provider.request({ method: "eth_sendTransaction", params: [{ from: wallet, to: trade.tx.to, data: trade.tx.data, value: trade.tx.value || "0x0" }] });
      setHash(tx);
      return;
    }
    if (trade?.typedData) {
      const signed = await provider.request({ method: "eth_signTypedData_v4", params: [wallet, JSON.stringify(trade.typedData)] });
      setHash(signed);
      setError("Order signed. Submit is the next step.");
    }
  }

  return (
    <>
      <header>
        <a className="brand" href="/"><img src="/logo.jpg" alt="Parity" /></a>
        <button className="connect" onClick={() => setSheet(true)}>{wallet ? wallet.slice(0, 6) + "..." + wallet.slice(-4) : "Connect"}</button>
      </header>
      <main>
        <section className="hero">
          <div>
            <p className="kicker">Tokenized stocks on BNB Chain</p>
            <h1>Buy the fair price.</h1>
            <p className="lede">Same stock, three tokens. Parity checks bStocks, Ondo, and xStocks, converts each quote to the price of one real share, and buys the cheapest route that can trade.</p>
          </div>
        </section>
        <section className="panel">
          <label>Amount in USD</label>
          <input value={amount} inputMode="decimal" onChange={(e) => setAmount(Number(e.target.value || 0))} />
          <label>Stock</label>
          <div className="chips">{stocks.map((t) => <button key={t} className={t === ticker ? "chip on" : "chip"} onClick={() => setTicker(t)}>{t}</button>)}</div>
          <label>Side</label>
          <div className="chips"><button className={side === "buy" ? "seg on" : "seg"} onClick={() => setSide("buy")}>Buy</button><button className={side === "sell" ? "seg on" : "seg"} onClick={() => setSide("sell")}>Sell</button></div>
          <button className="primary" onClick={compare}>{loading ? "Checking..." : `Compare $${amount || 0} of ${ticker}`}</button>
          {error && <p className="bad">{error}</p>}
          {data && <p className="muted">US market: {data.clock.reason} Last close {data.close ? `$${data.close.closeUsd.toFixed(2)} (${data.close.asOf})` : "unavailable"}. Data: {data.mode}.</p>}
        </section>
        <section className="grid">
          {data?.quotes?.map((q) => (
            <article key={q.issuer} className={q.issuer === data.best ? "card best" : "card"}>
              <strong>{q.name} · {q.symbol}</strong>
              <div className="row"><span>Can trade?</span><span className={q.tradeable ? "good" : "bad"}>{q.tradeable ? "Yes" : "No"}</span></div>
              <div className="row"><span>Price / share</span><span>{q.pricePerShare ? `$${q.pricePerShare.toFixed(2)}` : "—"}</span></div>
              <div className="row"><span>Vs last close</span><span>{q.premiumPct == null ? "—" : `${q.premiumPct > 0 ? "+" : ""}${q.premiumPct.toFixed(2)}%`}</span></div>
              <p className="muted">{q.reason}{best && q.tradeable && q.issuer !== best.issuer ? ` About $${((q.pricePerShare - best.pricePerShare) * (amount / q.pricePerShare)).toFixed(2)} more than the best route.` : ""}</p>
              {q.issuer === data.best && <p className="good">Best route.</p>}
              {q.tradeable && <button className="primary" onClick={() => buy(q)}>{action}</button>}
            </article>
          ))}
        </section>
        {trade?.ok && <article className="card sign"><strong>{action} {trade.symbol}</strong><p>{trade.simOk ? "Route tested. Sign to send the real trade." : trade.simError || "Route ready. Sign in your wallet."}</p><button className="primary" onClick={sign}>Sign {action}</button>{hash && <p><a href={hash.startsWith("0x") && hash.length === 66 ? `https://bscscan.com/tx/${hash}` : "#"}>{hash.slice(0, 18)}...</a></p>}</article>}
        <footer>BNB Hack: Tokenized Stocks Edition. Spot only on BSC. <a href="https://github.com/Benito3262/parity-fair">GitHub</a></footer>
      </main>
      {sheet && (
        <div className="sheet" onClick={() => setSheet(false)}>
          <article onClick={(e) => e.stopPropagation()}>
            <strong>Connect a wallet</strong>
            <p className="muted">WalletConnect works on desktop and mobile. Browser wallet works inside Bitget, Binance, or MetaMask.</p>
            <button className="primary" onClick={connectWalletConnect}>WalletConnect</button>
            <button className="chip" onClick={connectInjected}>Browser wallet</button>
          </article>
        </div>
      )}
      <img className="peeker" src="/mascot.png" alt="Parity mascot peeking from the side" />
    </>
  );
}
