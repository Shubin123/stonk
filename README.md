# Stonk ↗

A historical market playground: replay six stocks, trade pretend money, and compare your decisions with three transparent bots. Includes Mines and Plinko with a separate play-credit balance.

**[Open Stonk](https://shubin123.github.io/stonk/)** · [Acceptance spec](SPEC.md)

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm start
```

Open http://127.0.0.1:4173/stonk/. No account, API key, Electron installation, or backend is required. The runtime has no third-party dependencies or external asset requests.

## Verify

```sh
npx playwright install chromium
npm run check
```

`check` runs the unit suite, builds all market data, and runs Playwright against the production artifact at the same subpath used by Pages. Browser tests cover desktop and mobile viewports. On Linux, use `npx playwright install --with-deps chromium`.

## What is implemented

- INTC, AAPL, NVDA, AMZN, TSLA, and IBM with 15,102 bundled historical candles.
- Play/pause/step, adjustable replay speed and history range, a current-date marker, and end-of-data handling.
- $10,000 per-market paper portfolios with whole-share orders, integer-cent settlement, validation, and a trade journal.
- Buy & hold, trend follower, and dip buyer. Bot signals use previous closes and fill at the next open; they cannot see future prices. Each has its own cash and holdings.
- Local saves reconstruct portfolios and bots from validated decisions. Reload resumes paused. Reset affects only the current market. Storage failure is surfaced; another tab's updates prevent silent overwrites.
- Browser-native Mines and Plinko, independent from trading balances, with validated stakes and single settlement per round.

The interface explains strategy rules and data limitations. Source values may be unadjusted for splits/dividends and end in December 2024. Fills exclude fees, slippage, taxes, dividends, and corporate actions. This is an educational toy, not an investment backtester. No real-money functions exist.

## Deployment

The GitHub Actions workflow runs unit tests, builds `dist/`, and tests it in Chromium at desktop/mobile sizes. Only successful default-branch runs deploy `dist/` to GitHub Pages. Configure Pages to use **GitHub Actions**. Pull requests run the same checks without deploying.

## Layout

- `web/` — static interface, pure market/game engines, local state, charts.
- `scripts/` — CSV validation, static build, local preview server.
- `tests/` — unit and browser acceptance tests.
- `assets/` — original historical CSVs. Data provenance: [Nasdaq historical export](https://www.nasdaq.com/market-activity/stocks/aapl/historical), recorded in the original asset notes.
- `legacy/` — archived original Electron/server experiments, excluded from the website and supported checks.

Only `dist/` is published. Browser storage is device-local; arcade credits reset on reload. The latest 100 orders are displayed and up to 10,000 are saved per market.
