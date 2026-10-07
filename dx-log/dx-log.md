# Parity developer experience log

Project: Parity, fair price for tokenized stocks on BSC. Repo https://github.com/Benito3262/parity-fair. Live site https://parity-fair.vercel.app. Dates below are 2026.

## 6 Oct, first price call

Opened https://web3.binance.com/en/dev-docs/authentication, the RWA price page, and the trading introduction. The first call that returned data was `GET /build/api/v1/dex/market/rwa/price` with `binanceChainId=56` and `tokenContractAddresses` for NVDAB `0x02fca66c1d1afb4e2a7884261eb00f63598a7436` and NVDAon `0xa9ee28c80f960b889dfbd1902055218cba016f75`. The function was in Frankfurt. Both rows had `tokenPrice`. NVDAB was about $241.47 a share, NVDAon about $241.88. Yahoo close that morning was $241.41. The site labeled those two `Binance Web3 RWA`.

I did not time the gap from first opening the docs to that call, so I am not putting a number on it.

## Signing

The old client signed the public path and sent epoch milliseconds as hex. The authentication page says the signed string is timestamp, method, then `/build` plus the path and query, and the signature is Base64. It calls a missing `/build` the main cause of `40102`. We never got a live `40102` back. The calls failed quietly and the app fell back to Yahoo and PancakeSwap. The new client uses ISO 8601, Base64, and the `/build` prefix. Price calls then worked.

## 40304

A signed TSLAon probe returned `40304`, a region block, not a bad signature. `vercel.json` with region `fra1` was not built on the old project. The new project deploys in Frankfurt and the price call succeeded there. A US host still gets `40304`.

## Docs that fought each other

On https://web3.binance.com/en/dev-docs/products/trading-api/introduction the flash section says `/quote-and-swap` needs no `quoteId`. Lower on the same page, `vendor` is required and the only accepted value is `LiquidMesh`. Equity tokens are a different path: `/quote`, then `/swap` with that `quoteId` within 30 seconds, then EIP-712 and `/order/submit` for RFQ. I used the first sentence and hit the second rule.

## Buy errors

6 Oct, Bitget Wallet, button on NVDAB. The page showed `Parameter [quoteId] is required`. `/swap` had been called with no `quoteId`. Deploy `dpl_BC2qdzVmjNE99ZegtboxS18dCppP` switched that route to `/quote-and-swap`.

The next live `POST /api/trade` returned `{"ok":false,"error":"Parameter [vendor] is required","code":40001}`. Deploy `dpl_D4JHQhgLU5vxEHh1FU5A1oLe5fCT` quotes first, passes `quoteId` into `/swap`, and only uses `vendor=LiquidMesh` if no id comes back. That path has not been retested from a wallet. A signed buy is not confirmed.

## Session field

The successful price response had empty `marketStatus` and `reasonMsg`. "Can trade?" still uses a New York clock when those fields are blank.

## What we did not use

Wallet Skills, Agentic Wallet, and the Binance CLI were not used. WalletConnect is on the page with a public example project id, so the QR may be rejected until there is a project id from dashboard.reown.com.

## Same stock, three tokens

NVDAx has no verified BSC address, so that card stays unsupported. `tokenToShareRatio` was 1 on the two NVDA prices we got. The token catalog call returned 488 rows. Only contracts we could verify are shown. Liquidity, slippage, and a weekend premium have not been measured.

## What would have saved the first day

Put a signed chain-56 price example, including `/build`, on the authentication page. On the trading page, say in the first paragraph that Ondo and bStock do not use `quote-and-swap` unless the vendor is `LiquidMesh`, and show the RFQ steps beside the pool steps. Return `marketStatus` on every RWA price row.
