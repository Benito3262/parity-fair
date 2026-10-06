export const USDT = "0x55d398326f99059fF775485246999027B3197955";
export const CHAIN_ID = "0x38";

/** Verified BSC addresses only. Source: Binance eligible bStock list and Alpha listing. */
export const STOCKS = [
  { ticker: "NVDA", name: "NVIDIA", b: ["NVDAB", "0x02fca66c1d1afb4e2a7884261eb00f63598a7436"], on: ["NVDAon", "0xa9ee28c80f960b889dfbd1902055218cba016f75"] },
  { ticker: "AAPL", name: "Apple", b: ["AAPLB", "0x431a3bee82e2ca41e49895cbece5bb0f76a89b7a"] },
  { ticker: "AMZN", name: "Amazon", b: ["AMZNB", "0x1a4b499833a79a09ad7cf1d42d7dacf71e92eb00"] },
  { ticker: "AMD", name: "AMD", b: ["AMDB", "0x75fd4cf6f8392e41e70391d60c90c0d5211603a1"] },
  { ticker: "NFLX", name: "Netflix", b: ["NFLXB", "0xd6829ea836b6fa224d099d40e54b31262f874631"] },
  { ticker: "ORCL", name: "Oracle", b: ["ORCLB", "0x4684d9887fc1c71cba7bab8e88835cec217eb598"] },
  { ticker: "PLTR", name: "Palantir", b: ["PLTRB", "0x0ca5d51d0277bd006fd9607d3e560785ebad8222"] },
  { ticker: "PYPL", name: "PayPal", b: ["PYPLB", "0x2806a561fc1f9259b2d54a281796bde0d92762ae"] },
  { ticker: "QCOM", name: "Qualcomm", b: ["QCOMB", "0x5f7a56e877b9130608bf8be962621011182fefe1"] },
];

export function listingsFor(ticker) {
  const row = STOCKS.find((s) => s.ticker === ticker);
  if (!row) return [];
  const out = [];
  if (row.b) out.push({ issuer: "bstocks", name: "bStocks", symbol: row.b[0], address: row.b[1], hours: "regular", verified: true });
  if (row.on) out.push({ issuer: "ondo", name: "Ondo", symbol: row.on[0], address: row.on[1], hours: "regular", verified: true });
  out.push({ issuer: "xstocks", name: "xStocks", symbol: ticker + "x", address: null, hours: "always", verified: false, source: "No verified BSC address" });
  return out;
}
