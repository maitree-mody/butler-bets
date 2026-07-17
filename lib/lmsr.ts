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

/**
 * Inverse of tradeCost: given a crowns budget, returns how many shares of
 * `side` that budget buys. Closed-form solve of C(after) = C(before) + cost
 * for the new q value, reusing the same log-sum-exp shift `m` as cost():
 *
 *   exp(qYes/b) + exp(qNo/b) = exp((before+cost)/b)
 *   => (dividing by exp(m), where m = max(qYes/b, qNo/b) as in cost())
 *   exp(newQ/b - m) = exp((before+cost)/b - m) - exp(qOther/b - m)
 *
 * The subtracted term is always < the left side for cost > 0 (before/b - m
 * is exactly ln of the two-term sum, which already includes qOther's term),
 * so the ln() argument here is always positive — no extra guarding needed.
 * Used client-side only, to convert a user's crowns-denominated input into
 * the integer shares actually sent to execute_trade.
 */
export function sharesForCost(
  qYes: number,
  qNo: number,
  b: number,
  side: 'yes' | 'no',
  targetCost: number,
): number {
  const a = qYes / b;
  const c = qNo / b;
  const m = Math.max(a, c);
  const logSum = m + Math.log(Math.exp(a - m) + Math.exp(c - m)); // = cost(qYes,qNo,b) / b
  const shiftedTarget = logSum - m + targetCost / b; // = (before + targetCost) / b - m
  const otherShifted = side === 'yes' ? Math.exp(c - m) : Math.exp(a - m);
  const newQShifted = Math.log(Math.exp(shiftedTarget) - otherShifted);
  const newQ = b * (m + newQShifted);
  return side === 'yes' ? newQ - qYes : newQ - qNo;
}

/**
 * Inverse of sellPayout: given a target crowns payout, returns how many
 * shares of `side` must be sold to receive it. Reuses sharesForCost via the
 * same negation identity sellPayout uses: selling `s` shares for payout `P`
 * is equivalent to "buying -s shares costs -P", so
 * sharesForCost(..., -P) solves for -s directly.
 */
export function sharesForSellPayout(
  qYes: number,
  qNo: number,
  b: number,
  side: 'yes' | 'no',
  targetPayout: number,
): number {
  return -sharesForCost(qYes, qNo, b, side, -targetPayout);
}
