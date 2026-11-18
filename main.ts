// Race a BTC trading bot live for 24 hours (make.fun bars-replay/v1).
//
// TOP-10 ANALYSIS (mandatory, Dhika 17 Nov 01:36 WIB) — this race opened with
// 0 submissions, so the bar is the PREVIOUS race (btc-race-24h-20261117-0603,
// 4,387 entries, final window finalized 18 Nov 12:42 UTC):
// - Final top 10 on the UNSEEN 24h race window: $19.90-$24.20 only (dev top 10
//   was $41.90-$49.70 — dev PnL does NOT transfer). Median final PnL -$4.90;
//   only 1,166/4,387 entries finished positive. The race window is a different,
//   harder regime than dev: most dip-buyers lost.
// - Winners: 2 round trips (4 trades in 7 of the top 10), DD 0.64%-1.59%,
//   Sharpe 0.029-0.050. The 0.64% DD cluster = one well-timed dip-buy round
//   trip each. Trade count 2-8; per-trade quality beats frequency.
// - OUR round-3 entry (champion + K1-fit + K4) made +$32.42 on dev but
//   -$15.70 on the final window (rank #3608): dev-tuned dip-buying overfit a
//   falling regime. K4 was later FALSIFIED as an endpoint artifact — this bot
//   is champion + K1-fit ONLY, plus the two fixes below.
// - Upgrade plan from that analysis: (1) stop buying blind into the opening
//   plunge — the swing leg's 4h regime gate was USELESS before bar 240 because
//   r240 defaulted to 0, so it bought bar 60 into a -2.3% hour drop and lost
//   -$11.99; (2) add a bounce leg that buys only AFTER the price recovers off
//   its 60-bar low (confirmation, not prediction); (3) keep the dip leg
//   ungated (a 4h gate on it kills the +$41 W0828 dip winner).
//
// Strategy: dip-buyer + swing scalper + bounce buyer + trend rider, long
// only, $1,000 paper money. Backtested on THREE dev windows with a Python
// backtester that reproduces the kit's grade-local exactly (this race:
// backtester -$4.04 vs grade-local -$4.035880 for the un-fixed bot).
//   W1444 = this race's dev window (BTC -2.8%, 65.08 -> 63.26, max 1h drop
//     -2.31%, max 1h rise +1.19% — a down/choppy window, same family as the
//     regime that beat our last entry on its final window).
//   W0603 = prior race dev window (flat chop +0.49%). W0828 = oldest dev window.
//
// - DIP leg (hour close, 60-min return <= -1.5%, full size): TP +4%,
//   1% trailing stop, 3% stop-loss, max hold 360 bars. A stricter 30-min
//   trigger (2% plunge in 30 min with the hour down 1%+) catches sharp
//   mid-hour drops. NO 4h regime gate (tested: gating it turns W0828
//   +$35.17 into -$5.47 — it kills the +$41 dip winner). Never fires on
//   W1444/W0603 (no hour-close dip aligns); it is race-window cover.
// - SWING leg (any bar, 60-min return <= -1.0%, 100% size): TP +2%,
//   0.8% trailing stop, 1.5% stop-loss, max hold 300 bars; only when the
//   4h return is >= -1% AND 240 bars of history exist (FIX A: before bar
//   240 the 4h return is not computable, so the gate silently passed and
//   the leg bought the opening plunge blind — that one trade cost -$11.99
//   on W1444; with the fix W1444 goes -$4.04 -> +$2.40 with ZERO change on
//   the other two windows).
// - BOUNCE leg (NEW, generalized K1): any bar from 61 on, after a >=1.0%
//   60-min dip, buy full size when the close recovers +15 bps off the
//   60-bar low; TP +1%, 0.8% trailing stop, 1.5% stop-loss, max hold 300.
//   4h gate applies only once computable (>= bar 241). On W1444 it fires
//   twice (@72 trail -$2.64, @106 TP +$7.62) and lifts the window to
//   +$7.38; it never fires on W0603/W0828 (no degradation). TP shape is a
//   plateau: TP 1.0-2.0% all win (+$7.01-7.38), TP < 1% loses — the bounce
//   needs >= 1% to cover the round trip plus the second dip. Same mechanism
//   family as K1 (won on all 3 windows) and the #5 entry's first-trade bounce.
// - TREND leg (hour close, 60-min return >= +1.5%, 70% size): TP +2.5%,
//   1.2% trailing stop, 1.2% stop-loss, max hold 240 bars. Never fires on
//   any dev window; race-window cover for a grind-up day.
// - K1 first-trade bounce off the running low (bars 5-239, before the first
//   filled entry, rec +15 bps, TP +0.50%, stop 3%, max hold 120, 100% size,
//   no trail). Won on all 3 windows (+$2.40 / +$2.03 / +$1.08).
// - INSURANCE: if no trade has completed by bar 1200, buy 50% of cash
//   (swing exits) so the bot can never finish the race with 0 trades.
// - DEPTH gate (Orca Whirlpool c_depth via state.depthAt): skip entries while
//   pool depth has been RISING into the dip (240-bar c_depth slope > +5.5%).
//   Applies to every leg once computable (bar 241+); never blocks before.
// - GUARDS: after a losing exit, no new entry for 60 bars; if equity ever
//   falls 8% under its peak, flatten and stop; no new entries in the last
//   10 bars. One position at a time, never overlapping legs.
//
// Backtested (3 windows, grade-local to be confirmed for this exact build):
//   W1444 +$7.38 (3 trades, WR 0.667, max DD 1.82%), W0603 +$32.43
//   (4 trades, WR 1.000, max DD 0.79%), W0828 +$35.17 (3 trades, WR 0.667,
//   max DD 1.23%). Pooled +$74.98. Guardrails met on all three.
// Deterministic: decisions use only the closes the harness sends, no clock,
// no randomness, no network, standard library only (plus the kit's vendored
// SDK shim).

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, BuyInput, SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const MAX_SLIPPAGE_BPS = 300;

// Dip leg.
const DIP_D60 = 0.015;
const DIP_TP = 0.04;
const DIP_TRAIL = 0.01;
const DIP_STOP = 0.03;
const DIP_MAX_HOLD = 360;
const DIP30_D30 = 0.02;
const DIP30_D60 = 0.01;
// Bounce leg (generalized K1): buy the recovery off the 60-bar low.
const BOUNCE_D60 = 0.01;
const BOUNCE_REC = 0.0015;
const BOUNCE_MIN_SEQ = 60; // hist.length >= 61, same as the backtester
const BOUNCE_TP = 0.01;
const BOUNCE_TRAIL = 0.008;
const BOUNCE_STOP = 0.015;
const BOUNCE_MAX_HOLD = 300;
// Swing leg.
const SWING_D60 = 0.01;
const SWING_MIN_HIST = 241; // FIX A: 4h regime gate needs real 240-bar history
const SWING_FRAC_NUM = 10n;
const SWING_FRAC_DEN = 10n;
// Depth gate: max 240-bar c_depth slope allowed at entry.
const DEPTH_SLOPE240_MAX = 0.055;
const SWING_TP = 0.02;
const SWING_TRAIL = 0.008;
const SWING_STOP = 0.015;
const SWING_MAX_HOLD = 300;
const REGIME_4H = -0.01;
// Trend leg (race-window cover).
const TREND_D60 = 0.015;
const TREND_FRAC_NUM = 7n;
const TREND_FRAC_DEN = 10n;
const TREND_TP = 0.025;
const TREND_TRAIL = 0.012;
const TREND_STOP = 0.012;
const TREND_MAX_HOLD = 240;
// Insurance + guards.
const INSURANCE_BAR = 1200;
const INSURANCE_FRAC_DEN = 2n;
const GUARD_DD = 0.08;
const COOL_AFTER_LOSS = 60;
const LAST_ENTRY_SEQ = 1429;
const MIN_NOTIONAL = 1000000n; // $1, the harness minimum
// K1 first-trade bounce off the running low (fitted, see header).
const FIRST_REC = 0.0015;
const FIRST_TP = 0.005;
const FIRST_STOP = 0.03;
const FIRST_MAX_HOLD = 120;
const FIRST_MIN_SEQ = 5;
const FIRST_MAX_SEQ = 239;

const hist: number[] = []; // closes in USD, one per batch
const depthHist: number[] = []; // c_depth (USDC millions) per batch, via depthAt
let entry: number | null = null; // entry close (USD) of the open position
let peak = 0; // highest close since entry
let entrySeq = 0;
let mode: 'dip' | 'swing' | 'trend' | 'first' | 'bounce' | null = null;
let peakEq = 1000; // peak equity in USDC
let coolUntil = -1; // seq before which no new entry
let trades = 0; // completed sells (insurance needs "no trade yet")
let stopped = false; // latched by the drawdown guard
// K1 first-trade state.
let runLow = Infinity; // lowest close since window start
let openedOnce = false; // set on the first filled entry (any leg)

function reset(): void {
  entry = null;
  peak = 0;
  mode = null;
}

function sellOrder(qty: bigint): SellInput {
  return { side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
}

function buyOrder(notional: bigint): BuyInput {
  return { side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS };
}

await runBars({
  onBatch(state: BarsState) {
    if (state.warmingUp) return [];
    const close = state.close(SYMBOL);
    if (close === null) return [];
    const price = Number(close) / 100000; // price_scale 5 -> USD
    hist.push(price);
    const dep = state.depthAt(SYMBOL);
    depthHist.push(dep === null ? NaN : Number(dep[0]) / 1000000);
    const seq = state.seq;
    // K1 running low (only while the first-trade arm can still fire).
    if (!openedOnce && seq < 240 && price < runLow) runLow = price;

    const equity = Number(state.equity) / 1000000;
    if (equity > peakEq) peakEq = equity;

    const held = state.positions.get(SYMBOL);

    // Drawdown guard: flatten and stop trading for the rest of the run.
    if (!stopped && equity < peakEq * (1 - GUARD_DD)) {
      stopped = true;
      if (held !== undefined) {
        reset();
        return [sellOrder(held.qty)];
      }
      return [];
    }
    if (stopped) return [];

    if (held !== undefined && entry !== null && mode !== null) {
      if (price > peak) peak = price;
      const [tp, trail, stop, maxhold] =
        mode === 'dip'
          ? [DIP_TP, DIP_TRAIL, DIP_STOP, DIP_MAX_HOLD]
          : mode === 'swing'
            ? [SWING_TP, SWING_TRAIL, SWING_STOP, SWING_MAX_HOLD]
            : mode === 'first'
              ? [FIRST_TP, 1.0, FIRST_STOP, FIRST_MAX_HOLD] // no trail
              : mode === 'bounce'
                ? [BOUNCE_TP, BOUNCE_TRAIL, BOUNCE_STOP, BOUNCE_MAX_HOLD]
                : [TREND_TP, TREND_TRAIL, TREND_STOP, TREND_MAX_HOLD];
      if (
        price >= entry * (1 + tp) ||
        price < peak * (1 - trail) ||
        price < entry * (1 - stop) ||
        seq - entrySeq > maxhold
      ) {
        const lost = price < entry;
        reset();
        trades += 1;
        if (lost) coolUntil = seq + COOL_AFTER_LOSS;
        return [sellOrder(held.qty)];
      }
      return [];
    }

    // K1 first-trade bounce (bars 5-239, before the first filled entry;
    // bypasses the 61-bar history guard — its own requirement is min 5 bars).
    // Depth gate mandatory: not computable before bar 240, so it cannot
    // block inside the eligible window (checked anyway for fidelity).
    if (!openedOnce && seq >= FIRST_MIN_SEQ && seq <= FIRST_MAX_SEQ) {
      if (price >= runLow * (1 + FIRST_REC)) {
        let slopeBlocked = false;
        if (depthHist.length >= 241) {
          slopeBlocked =
            depthHist[depthHist.length - 1] / depthHist[depthHist.length - 241] -
              1 >
            DEPTH_SLOPE240_MAX;
        }
        if (!slopeBlocked) {
          entry = price;
          peak = price;
          entrySeq = seq;
          mode = 'first';
          openedOnce = true;
          return [buyOrder(state.cash)];
        }
      }
    }

    // Flat: look for entries.
    if (seq >= LAST_ENTRY_SEQ || hist.length < 61) return [];
    if (seq < coolUntil) return [];
    // Depth gate: skip entries while pool depth has been rising into the dip.
    // Needs 240 bars of depth history; without it, allow (no gate).
    if (depthHist.length >= 241) {
      const slope240 =
        depthHist[depthHist.length - 1] / depthHist[depthHist.length - 241] - 1;
      if (slope240 > DEPTH_SLOPE240_MAX) return [];
    }
    const r60 = price / hist[hist.length - 61] - 1;
    const r30 = price / hist[hist.length - 31] - 1;
    const r240 = hist.length >= 241 ? price / hist[hist.length - 241] - 1 : 0;

    // Bounce leg: after a >=1.0% hour dip, buy the recovery off the
    // 60-bar low (confirmation, not prediction). 4h gate applies only once
    // computable (bar 241+); depth gate above already applies.
    if (seq >= BOUNCE_MIN_SEQ && r60 <= -BOUNCE_D60) {
      let low60 = Infinity;
      for (let j = hist.length - 60; j < hist.length; j++) {
        if (hist[j] < low60) low60 = hist[j];
      }
      const r240ok = hist.length < 241 || r240 >= REGIME_4H;
      if (price >= low60 * (1 + BOUNCE_REC) && r240ok) {
        entry = price;
        peak = price;
        entrySeq = seq;
        mode = 'bounce';
        openedOnce = true;
        return [buyOrder(state.cash)];
      }
    }
    // Dip leg: hour close after a >=1.5% hour drop, full size.
    if (seq % 60 === 59 && r60 <= -DIP_D60) {
      entry = price;
      peak = price;
      entrySeq = seq;
      mode = 'dip';
      openedOnce = true;
      return [buyOrder(state.cash)];
    }
    // Dip leg, fast trigger: 30-min close after a >=2% half-hour plunge.
    if (seq % 30 === 29 && r30 <= -DIP30_D30 && r60 <= -DIP30_D60) {
      entry = price;
      peak = price;
      entrySeq = seq;
      mode = 'dip';
      openedOnce = true;
      return [buyOrder(state.cash)];
    }
    // Trend leg: hour close after a >=1.5% hour rise, 70% size.
    if (seq % 60 === 59 && r60 >= TREND_D60) {
      const notional = (state.cash * TREND_FRAC_NUM) / TREND_FRAC_DEN;
      if (notional >= MIN_NOTIONAL) {
        entry = price;
        peak = price;
        entrySeq = seq;
        mode = 'trend';
        openedOnce = true;
        return [buyOrder(notional)];
      }
    }
    // Swing leg: any bar after a >=1.0% hour dip, 100% size, regime-gated.
    // FIX A: needs 240 bars of history — before that r240 is not computable
    // and the gate silently passes, buying the opening plunge blind.
    if (hist.length >= SWING_MIN_HIST && r60 <= -SWING_D60 && r240 >= REGIME_4H) {
      const notional = (state.cash * SWING_FRAC_NUM) / SWING_FRAC_DEN;
      if (notional >= MIN_NOTIONAL) {
        entry = price;
        peak = price;
        entrySeq = seq;
        mode = 'swing';
        openedOnce = true;
        return [buyOrder(notional)];
      }
    }
    // Insurance: no completed trade by bar 1200, buy 50% (swing exits).
    if (trades === 0 && seq >= INSURANCE_BAR) {
      const notional = state.cash / INSURANCE_FRAC_DEN;
      if (notional >= MIN_NOTIONAL) {
        entry = price;
        peak = price;
        entrySeq = seq;
        mode = 'swing';
        openedOnce = true;
        return [buyOrder(notional)];
      }
    }
    return [];
  },
});
