import { createHmac, randomBytes } from "crypto";

const HOST = "https://web3.binance.com";

function sign(secret, timestamp, method, requestPath, body) {
  return createHmac("sha256", secret).update(`${timestamp}${method}${requestPath}${body}`, "utf8").digest("base64");
}

export async function binance(method, apiPath, query, bodyObj) {
  const apiKey = process.env.BINANCE_WEB3_API_KEY;
  const secret = process.env.BINANCE_WEB3_API_SECRET;
  if (!apiKey || !secret) return { ok: false, errorMsg: "Binance keys are not set" };
  const qs = Object.entries(query || {}).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
  const body = bodyObj ? JSON.stringify(bodyObj) : "";
  const requestPath = `/build${apiPath}${qs ? `?${qs}` : ""}`;
  const timestamp = new Date().toISOString();
  const res = await fetch(`${HOST}${requestPath}`, {
    method,
    redirect: "manual",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-OC-APIKEY": apiKey,
      "X-OC-TIMESTAMP": timestamp,
      "X-OC-SIGN": sign(secret, timestamp, method, requestPath, body),
      "X-OC-NONCE": randomBytes(12).toString("hex"),
    },
    body: method === "POST" ? body : undefined,
  });
  if (res.status >= 300 && res.status < 400) return { ok: false, status: res.status, errorMsg: "Redirect refused" };
  const text = await res.text();
  if (!text.trim() || text.trim().startsWith("<")) return { ok: false, status: res.status, errorMsg: "Empty or HTML response" };
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, status: res.status, errorMsg: "Non-JSON response" }; }
  const errorCode = data?.code == null || data.code === "" ? undefined : Number(data.code);
  const errorMsg = data?.msg || data?.message;
  const ok = res.ok && (errorCode === undefined || errorCode === 0);
  if (!ok) console.error("[binance]", res.status, errorCode, errorMsg, requestPath);
  return { ok, status: res.status, data, errorCode, errorMsg };
}

export function rwaPrice(addresses) {
  return binance("GET", "/api/v1/dex/market/rwa/price", { binanceChainId: "56", tokenContractAddresses: addresses.join(",") });
}
export function rwaTokens() {
  return binance("GET", "/api/v1/dex/market/rwa/tokens", { binanceChainId: "56" });
}
export function quoteAndSwap(query) {
  return binance("GET", "/api/v1/dex/aggregator/quote-and-swap", query);
}
export function simulate(body) {
  return binance("POST", "/api/v1/dex/pre-transaction/simulate", null, body);
}
