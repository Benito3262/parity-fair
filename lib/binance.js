import { createHmac, randomBytes } from "crypto";

const HOST = "https://web3.binance.com";

function sign(secret, timestamp, method, requestPath, body) {
  const preHash = `${timestamp}${method}${requestPath}${body}`;
  return createHmac("sha256", secret).update(preHash, "utf8").digest("base64");
}

export async function binanceGet(apiPath, query) {
  const apiKey = process.env.BINANCE_WEB3_API_KEY;
  const secret = process.env.BINANCE_WEB3_API_SECRET;
  if (!apiKey || !secret) {
    return { ok: false, errorCode: 0, errorMsg: "Binance keys are not set" };
  }
  const qs = Object.entries(query)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  const requestPath = `/build${apiPath}${qs ? `?${qs}` : ""}`;
  const timestamp = new Date().toISOString();
  const signature = sign(secret, timestamp, "GET", requestPath, "");
  const res = await fetch(`${HOST}${requestPath}`, {
    method: "GET",
    redirect: "manual",
    headers: {
      Accept: "application/json",
      "X-OC-APIKEY": apiKey,
      "X-OC-TIMESTAMP": timestamp,
      "X-OC-SIGN": signature,
      "X-OC-NONCE": randomBytes(12).toString("hex"),
    },
  });
  if (res.status >= 300 && res.status < 400) {
    return { ok: false, status: res.status, errorMsg: "Redirect refused" };
  }
  const text = await res.text();
  if (!text.trim() || text.trim().startsWith("<")) {
    console.error("[binance]", res.status, requestPath, text.slice(0, 160));
    return { ok: false, status: res.status, errorMsg: "Empty or HTML response" };
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, status: res.status, errorMsg: "Non-JSON response" };
  }
  const errorCode = data?.code == null || data.code === "" ? undefined : Number(data.code);
  const errorMsg = data?.msg || data?.message;
  const ok = res.ok && (errorCode === undefined || errorCode === 0);
  if (!ok) console.error("[binance]", res.status, errorCode, errorMsg, requestPath);
  return { ok, status: res.status, data, errorCode, errorMsg };
}

export async function rwaPrice(addresses) {
  return binanceGet("/api/v1/dex/market/rwa/price", {
    binanceChainId: "56",
    tokenContractAddresses: addresses.join(","),
  });
}
