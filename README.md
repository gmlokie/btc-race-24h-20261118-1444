# btc-race-24h-20261118-1444

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/gmlokie/btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/gmlokie/btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A BTC trading bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty ($250 in USDC). It trades Coinbase Wrapped BTC (cbBTC) on 1-minute on-chain prices with $1,000 of paper money — simulation only, nothing traded for real.

Strategy: dip-buyer + swing scalper + bounce buyer + trend rider, long only. The swing leg's 4h regime gate now requires 240 bars of real history (before bar 240 the gate silently passed and bought the opening plunge blind); a new bounce leg buys only after the price recovers off its 60-bar low.

## Verified results

- New dev window (1444): +$7.381792, 6 trades, win rate 0.667, max drawdown 1.82%, guardrails met.
- Old dev window (0603): +$32.424590, 8 trades, win rate 1.000, max drawdown 0.79%, guardrails met.
- Pooled across three dev windows: +$74.98.
- Ablation, 18 Nov, exact grader, both windows: ChatGPT rebound-confirmation variant — unchanged on new, -$23.52 on old, rejected; Grok soft-depth variant — byte-identical on both windows, rejected. The bot ships as graded.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1 (newline-delimited JSON on stdin/stdout). See `main.ts` for the full strategy, and TOPLB-RESEARCH.md for the top-10 leaderboard analysis it was built from.

---

<sub>Entered on [make.fun](https://make.fun/?ref=9ex4h6rb&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
