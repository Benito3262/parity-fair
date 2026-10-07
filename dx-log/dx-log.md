# Parity Developer Experience notes

For BNB Hack: Tokenized Stocks Edition. The report is mandatory and worth 25% of the score. Vague or generated-sounding text is rejected. Official form: https://forms.gle/EUQ39xf54GHjC2ys5

Source: https://www.bnbchain.org/en/hackathons/tokenized-stocks?tab=tracks

This file is the working Developer Experience record. Folder: dx-log. File: dx-log.md. New errors get appended here.

## What the hackathon asks

1. Onboarding: time from docs to first successful call, and where it stuck.
2. Documentation issues: page, and where on the page.
3. API pitfalls: exact error, edge case, latency.
4. AI stack: Wallet Skills, Agentic Wallet, CLI. What worked, what did not, what is missing.
5. Tokenized-stock specifics: liquidity, slippage, hours, on-chain vs reference, bStocks vs Ondo vs xStocks.
6. Redesign: how to make a first call work on landing.
7. Requested capabilities.

Also required with the project: public repo, deployed link or judge instructions, demo video of 4 minutes or less. Submissions lock 11 Oct 2026, 12:00 UTC. Repo and link must stay up through judging.

## Onboarding

- Docs opened: https://web3.binance.com/en/dev-docs and the authentication, RWA, trading, and transaction pages.
- First successful call: 2026-10-06, signed `GET /api/v1/dex/market/rwa/price` for NVDAB and NVDAon on chain 56, from the Frankfurt deploy. Response had `tokenPrice`. Site labeled `Binance Web3 RWA`.
- Time to that call was not measured from first doc open. Do not invent a duration.
- Stuck before that on signing, region, and deploy, below.

## Documentation issues

- Authentication page says the signed string includes `/build` plus path and query. Missing `/build` is called the top cause of `40102`. The old client signed the public path only.
- Trading introduction says `/quote-and-swap` needs no `quoteId`, then the same page says `vendor` is required and only `LiquidMesh` is accepted. Equity tokens are a different flow: `/quote`, then `/swap` with `quoteId`, then EIP-712 and `/order/submit` for RFQ. That split is easy to miss.
- RWA price docs use `binanceChainId` and `tokenContractAddresses`. The old client used `/bapi/defi/...` and `symbol=`.
- Timestamp docs want ISO 8601. The old client sent epoch milliseconds and a hex signature.

## API pitfalls

### Signing and path, 2026-10-06

- Message: silent failure, fallback to Yahoo or PancakeSwap. `40102` expected if `/build` is missing. Not confirmed on a live response.
- Attempt: rewrite to `/build/api/v1/dex/market/rwa/*`, ISO timestamp, Base64 HMAC, headers `X-OC-APIKEY`, `X-OC-TIMESTAMP`, `X-OC-SIGN`.
- Result: rewrite truncated in old repo. New `parity-fair` client succeeded on price.

### `40304`, 2026-10-06

- Message: compliance restriction, not `40102`.
- Attempt: signed TSLAon probe. Then `vercel.json` region `fra1`.
- Result: Frankfurt price calls returned live prices. A US host still gets `40304`.

### `Parameter [quoteId] is required`, 2026-10-06

- Seen in Bitget Wallet on Buy.
- Cause: `/swap` called without `quoteId`.
- Attempt: switch to `/quote-and-swap`. Deploy `dpl_BC2qdzVmjNE99ZegtboxS18dCppP`.
- Result: `quoteId` error gone. Next error appeared.

### `40001` `Parameter [vendor] is required`, 2026-10-06

- Live `POST /api/trade` returned that body.
- Docs: `quote-and-swap` requires `vendor=LiquidMesh`. Ondo and bStock need quote then swap.
- Attempt: quote, find `quoteId`, swap with it. Fallback `vendor=LiquidMesh`. Deploy `dpl_D4JHQhgLU5vxEHh1FU5A1oLe5fCT`.
- Result: not retested. Buy is not confirmed.

### Empty `marketStatus`, 2026-10-06

- Price call succeeded but `marketStatus` and `reasonMsg` were empty.
- Result: "Can trade?" still uses the local New York clock when Binance sends no session.

## AI stack

- Wallet Skills, Agentic Wallet, and the Binance CLI were not used.
- WalletConnect was added in the page. It uses a public example project id. A project-owned Reown id is still missing, so the QR may fail.
- Nothing here can honestly claim the $2,000 Agentic Wallet prize yet.

## Tokenized-stock specifics

- Same stock, different tokens. NVDA checked on 2026-10-06: NVDAB about $241.47 per share, NVDAon about $241.88, Yahoo last close $241.41. Both marked tradeable in the regular session. NVDAx has no verified BSC address, so it stays unsupported.
- `tokenToShareRatio` was 1 on those two. Price per share is token price divided by that ratio.
- Catalog call returned 488 rows. Only verified BSC contracts are shown.
- Liquidity, slippage, and weekend premium are not measured yet. Do not write numbers for them.

## Redesign suggestions

- One page that shows a signed price call for chain 56, with the `/build` prefix in the example.
- State that equity tokens cannot use `quote-and-swap` unless `vendor=LiquidMesh`, and show the RFQ steps next to the pool steps.
- Return `marketStatus` on every RWA price row, including closed and pause.

## Requested capabilities

- Verified BSC addresses for xStocks in the RWA token list.
- A quote response that always includes `quoteId` at a stable path.
- Session status on the price endpoint when the market is closed.

## Project status for judges

- Repo: https://github.com/Benito3262/parity-fair
- Link: https://parity-fair.vercel.app
- Live: RWA price, Yahoo close, nine verified bStock names, NVDA Ondo, wallet connect UI.
- Not confirmed: signed buy, sell, RFQ submit, xStocks.
