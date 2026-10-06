# Parity Fair

Fair price for tokenized stocks on BNB Chain. Built for BNB Hack: Tokenized Stocks Edition by BNB Chain and Binance Web3 Wallet.

Type a dollar amount and a ticker. Parity checks bStocks, Ondo, and xStocks, converts each quote to price per real share, and shows the gap versus the last NYSE close.

This is a separate demo from the original Parity repo.

## Live in this demo

- Verified BSC addresses for NVDAB, NVDAon, AAPLB, AMZNB
- Last regular close from Yahoo Finance, dated in ET
- Token prices from DexScreener
- US market clock in America/New_York
- Compare, then a dry-run that explains the route

## Waiting on Binance Web3 API

- Signed RWA price, marketStatus, and tokenToShareRatio
- Aggregator quote / swap and RFQ order submit
- Transaction simulate
- Live Ondo and bStock buys

Set `BINANCE_LIVE=true` plus `BINANCE_WEB3_API_KEY` and `BINANCE_WEB3_API_SECRET` when the client is dropped in. Until then the label stays `hybrid`.

## Unsupported

NVDAx, AAPLon, AAPLx, AMZNon, and AMZNx have no verified BSC address in this build. They are shown as unsupported, not invented.

## Run

npm install
npm run dev
