# Top-10 Leaderboard Analysis — btc-race-24h-20261118-1444

**Fetched:** 2026-11-18 ~21:50 WIB. This race opened with 0 submissions, so the
bar is the previous race btc-race-24h-20261117-0603 (4,387 entries, final
window finalized 2026-11-18 12:42 UTC). Source:
`https://make.fun/api/competitions/btc-race-24h-20261117-0603/leaderboard?limit=15`.

## Final top 10 (unseen 24h race window — what actually won)

| # | Handle | PnL | Trades | Max DD | Sharpe | Title |
|---|--------|-----|--------|--------|--------|-------|
| 1 | strescco | $24.20 | 4 | 0.64% | 0.049 | Stabilised dip-buy cbBTC bot v2 |
| 2 | zesty-condor-60 | $23.80 | 4 | 0.64% | 0.050 | Dip-buy CBBTC bot |
| 3 | daring-harbor-13 | $22.90 | 8 | 1.59% | 0.029 | Dip-buy swing bot |
| 4 | tiar9 | $21.60 | 4 | 0.64% | 0.048 | Range-dip mean-reversion BTC bot v4 |
| 5 | brisk-sparrow-99 | $21.50 | 4 | 0.64% | 0.047 | dip-buy + regime filter |
| 6 | clever-badger-24 | $21.00 | 4 | 0.71% | 0.038 | Dip-Buy BTC Bot — 6h pullback entries |
| 7 | putra2230 | $20.50 | 4 | 1.02% | 0.038 | Dip-Reclaim cbBTC Bot |
| 8 | rambut29 | $20.40 | 2 | 1.50% | 0.029 | Stall-Top Dip Bot v2 |
| 9 | profmey | $20.20 | 4 | 0.64% | 0.044 | Rolling-high pullback bot |
| 10 | lucky-meteor-24 | $19.90 | 8 | 0.63% | 0.037 | METEOR HARVEST |

Cutoffs: top-10 $19.90, top-20 $18.50. Median final PnL -$4.90; only
1,166/4,387 entries positive. Dev top 10 was $41.90-$49.70 — dev PnL does NOT
transfer to the race window.

## What separates the winners

1. **Two round trips (4 trades) dominate:** 7 of the top 10 have exactly 4
   trades. The 0.64% DD cluster = one well-timed dip-buy round trip each.
2. **Per-trade quality beats frequency.** Top-10 trade counts are 2-8, not 15+.
3. **The race window is a different, harder regime than dev.** Most dip-buyers
   lost (median -$4.90). Our own round-3 entry made +$32.42 on dev but
   -$15.70 on the final window (rank #3608) — dev-tuned dip-buying overfit a
   falling regime. K4 was later falsified as an endpoint artifact.
4. **Drawdown does not separate at the top** (0.63-1.59%); the 25% guardrail
   never binds up there. The risk is missing the move / buying the knife.

## Upgrade plan applied to this build

- Fix the swing leg's blind early entries: its 4h regime gate defaulted r240
  to 0 before bar 240, so it bought bar 60 into a -2.31% hour drop (-$11.99).
  Now requires 240 bars of history. W1444 -$4.04 -> +$2.40, zero change on
  the other two windows.
- New bounce leg (generalized K1): buys only AFTER the price recovers +15 bps
  off its 60-bar low — confirmation, not prediction. TP +1% (plateau 1-2%,
  <1% loses). Lifts W1444 to +$7.38, never fires on the other windows.
- Dip leg stays UNGATED by the 4h regime (gating it turns W0828 +$35.17
  into -$5.47 — it kills the +$41 dip winner).
- Kept: K1 first-trade bounce (won on all 3 windows), trend leg as
  grind-up cover, insurance buy at bar 1200, 8% DD flatten-and-stop,
  60-bar cooldown after a losing exit, depth slope gate.

## Results (backtester reproduces grade-local exactly)

| Window | Regime | PnL | Trades | WR | Max DD |
|--------|--------|-----|--------|----|--------|
| W1444 (this race dev) | down -2.8% | +$7.38 | 3 | 0.667 | 1.82% |
| W0603 (prior dev) | flat chop +0.49% | +$32.43 | 4 | 1.000 | 0.79% |
| W0828 (oldest dev) | — | +$35.17 | 3 | 0.667 | 1.23% |
| Pooled | | +$74.98 | 10 | 0.800 | |

Grade-local (kit CLI, process driver): +$7.381792, 6 fills, WR 0.667,
max DD 1.82%, fees $2.41, guardrails met, L1 regrade byte-identical.
