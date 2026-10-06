"use client";

import { useState } from "react";

const TICKERS = ["NVDA", "AAPL", "AMZN"];

export default function Page() {
  const [ticker, setTicker] = useState("NVDA");
  const [amount, setAmount] = useState(20);
  const [data, setData] = useState(null);
  const [step, setStep] = useState("compare");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function compare() {
    setLoading(true);
    setError("");
    setStep("compare");
    const res = await fetch(`/api/quote?ticker=${ticker}&amount=${amount}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Quote failed");
      return;
    }
    setData(json);
  }

  const best = data?.quotes?.find((q) => q.issuer === data.best);

  return (
    <main>
      <div className="kicker">BNB Hack: Tokenized Stocks Edition</div>
      <h1>Parity</h1>
      <p className="lede">The fair price for every tokenized stock. Same stock, three tokens on BNB. Type a dollar amount. We show the true price per share.</p>
      <label>Amount (USD)</label>
      <input value={amount} inputMode="decimal" onChange={(e) => setAmount(Number(e.target.value || 0))} />
      <label>Stock</label>
      <div className="chips">
        {TICKERS.map((t) => (
          <button key={t} className={t === ticker ? "chip on" : "chip"} onClick={() => setTicker(t)}>{t}</button>
        ))}
      </div>
      <button className="primary" onClick={compare}>{loading ? "Checking…" : `Find fair price for $${amount || 0} of ${ticker}`}</button>
      {error && <p className="bad">{error}</p>}
      {data && (
        <>
          <p className="muted">US market: {data.clock.reason} Last close {data.close ? `$${data.close.closeUsd.toFixed(2)} (${data.close.asOf})` : "unavailable"}. Data: {data.mode}.</p>
          {data.quotes.map((q) => {
            const extra = best && q.tradeable && q.issuer !== best.issuer ? q.pricePerShare - best.pricePerShare : 0;
            return (
              <article key={q.issuer} className={q.issuer === data.best ? "card best" : "card"}>
                <strong>{q.name} · {q.symbol}</strong>
                <div className="row"><span>Can trade?</span><span className={q.tradeable ? "good" : "bad"}>{q.tradeable ? "Yes" : "No"}</span></div>
                <div className="row"><span>Price / share</span><span>{q.pricePerShare ? `$${q.pricePerShare.toFixed(2)}` : "—"}</span></div>
                <div className="row"><span>1 token</span><span>{q.ratio} share</span></div>
                <div className="row"><span>Vs last close</span><span>{q.premiumPct == null ? "—" : `${q.premiumPct > 0 ? "+" : ""}${q.premiumPct.toFixed(2)}%`}</span></div>
                <p className="muted">{q.reason}{extra > 0 ? ` About $${(extra * (amount / q.pricePerShare)).toFixed(2)} more than the best route on this size.` : ""}</p>
                {q.premiumPct > 1.2 && data.clock.status !== "regular" && <p>Might be cheaper at Monday&apos;s open.</p>}
                {q.issuer === data.best && <p className="good">Best route for this size.</p>}
              </article>
            );
          })}
          <button className="primary" onClick={() => setStep("simulate")}>Dry-run the best route</button>
          {step === "simulate" && (
            <article className="card">
              <strong>Dry run</strong>
              <p>{best ? `Would buy ${best.symbol} at about $${best.pricePerShare.toFixed(2)} per share. No wallet signature yet.` : "No executable route. A version is closed, unsupported, or the pool is too thin."}</p>
              <p className="muted">Live Ondo and bStock buys wait on the Binance Web3 client. xStocks buy waits on a verified BSC pool. Nothing is auto-signed.</p>
            </article>
          )}
        </>
      )}
      <footer>
        BNB Hack: Tokenized Stocks Edition by BNB Chain and Binance Web3 Wallet. Spot compare on BSC. Binance RWA signing is stubbed until API access.
        <br />
        <a href="https://github.com/Benito3262/parity-fair">GitHub</a>
      </footer>
    </main>
  );
}
