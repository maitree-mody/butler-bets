// LMSR (Logarithmic Market Scoring Rule) market maker for binary YES/NO markets.
//
// The liquidity parameter `b` controls how much prices move per trade:
// higher b = more liquidity = less price impact per trade.
// All quantities (qYes, qNo, shares) are in "shares"; costs are in "crowns".

/**
 * LMSR cost function: the total reserves the market must hold to pay out all
 * winning shares. Defined as C = b * ln(exp(qYes/b) + exp(qNo/b)).
 *
 * Uses the log-sum-exp trick to avoid exp() overflowing on large positions:
 *   let m = max(qYes/b, qNo/b)
 *   C = b * (m + ln(exp(qYes/b - m) + exp(qNo/b - m)))
 * Subtracting m shifts both exponents so the largest becomes exp(0) = 1,
 * keeping all intermediate values finite.
 */
export function cost(qYes: number, qNo: number, b: number): number {
  const a = qYes / b;
  const c = qNo / b;
  const m = Math.max(a, c);
  return b * (m + Math.log(Math.exp(a - m) + Math.exp(c - m)));
}

/**
 * The current fair price (probability) of the YES outcome, equal to the
 * marginal cost of buying one infinitesimal YES share:
 *   P(YES) = exp(qYes/b) / (exp(qYes/b) + exp(qNo/b))
 *
 * Same log-sum-exp trick: subtract m = max(qYes/b, qNo/b) from both exponents
 * before dividing, so we never divide astronomically large numbers.
 * Always returns a value in (0, 1). P(NO) = 1 - priceYes(...).
 */
export function priceYes(qYes: number, qNo: number, b: number): number {
  // Guard: invalid b yields the neutral 50/50 price rather than NaN.
  if (b <= 0 || !isFinite(b)) return 0.5;
  const a = qYes / b;
  const c = qNo / b;
  const m = Math.max(a, c);
  return Math.exp(a - m) / (Math.exp(a - m) + Math.exp(c - m));
}

/**
 * The cost in crowns for a trader to buy `shares` shares of `side` ('yes' or 'no').
 * Computed as the difference in the cost function before and after the trade:
 *   tradeCost = C(after) - C(before)
 * A positive return means the trader pays that many crowns to the market.
 * Buying YES adds `shares` to qYes; buying NO adds `shares` to qNo.
 */
export function tradeCost(
  qYes: number,
  qNo: number,
  b: number,
  side: 'yes' | 'no',
  shares: number,
): number {
  const before = cost(qYes, qNo, b);
  const after =
    side === 'yes'
      ? cost(qYes + shares, qNo, b)
      : cost(qYes, qNo + shares, b);
  return after - before;
}

/**
 * Crowns paid out to a trader selling `shares` of `side`, the mirror of
 * tradeCost: payout = C(before) - C(after). Reuses tradeCost with negated
 * shares since tradeCost(..., -shares) = C(before - shares) - C(before),
 * which is exactly -payout.
 */
export function sellPayout(
  qYes: number,
  qNo: number,
  b: number,
  side: 'yes' | 'no',
  shares: number,
): number {
  return -tradeCost(qYes, qNo, b, side, -shares);
}
