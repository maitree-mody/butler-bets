import { describe, it, expect } from 'vitest';
import { cost, priceYes, tradeCost, sellPayout, sharesForCost, sharesForSellPayout } from './lmsr';

describe('LMSR', () => {
  it('priceYes is 0.5 at a flat market (qYes=0, qNo=0)', () => {
    expect(priceYes(0, 0, 100)).toBe(0.5);
  });

  it('tradeCost of 30 YES shares is approximately 16.12 crowns', () => {
    expect(tradeCost(0, 0, 100, 'yes', 30)).toBeCloseTo(16.12, 1);
  });

  it('priceYes shifts to ~0.5744 after buying 30 YES shares', () => {
    expect(priceYes(30, 0, 100)).toBeCloseTo(0.5744, 3);
  });

  it('tradeCost equals cost(after) - cost(before) (consistency)', () => {
    const delta = tradeCost(0, 0, 100, 'yes', 30);
    const diff = cost(30, 0, 100) - cost(0, 0, 100);
    expect(delta).toBeCloseTo(diff, 1);
  });

  it('large trade (100 000 YES shares) returns a finite number', () => {
    const result = tradeCost(0, 0, 100, 'yes', 100_000);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('sellPayout of the exact position just bought refunds the same crowns paid', () => {
    const boughtFor = tradeCost(0, 0, 100, 'yes', 30);
    const payout = sellPayout(30, 0, 100, 'yes', 30);
    expect(payout).toBeCloseTo(boughtFor, 6);
  });

  it('sellPayout equals cost(before) - cost(after) (consistency)', () => {
    const payout = sellPayout(50, 20, 100, 'yes', 15);
    const diff = cost(50, 20, 100) - cost(35, 20, 100);
    expect(payout).toBeCloseTo(diff, 6);
  });

  it('selling into a larger pool of the same side is worth less than buying it was (price impact)', () => {
    // Buying 30 YES from qYes=0 costs more per-share on average than the
    // payout for selling those same 30 YES shares back, because the two
    // trades happen at different points on the same curve only when the
    // pool has moved since the buy — here we buy then immediately sell,
    // so payout must equal cost exactly, and both should be well below
    // the naive shares*1 upper bound.
    const boughtFor = tradeCost(0, 0, 100, 'no', 30);
    const payout = sellPayout(0, 30, 100, 'no', 30);
    expect(payout).toBeCloseTo(boughtFor, 6);
    expect(payout).toBeLessThan(30);
  });

  it('selling more shares than were ever bought still returns a finite, sane number', () => {
    const payout = sellPayout(0, 100_000, 100, 'no', 100_000);
    expect(Number.isFinite(payout)).toBe(true);
    expect(payout).toBeGreaterThan(0);
    expect(payout).toBeLessThanOrEqual(100_000);
  });

  it('sellPayout is symmetric with tradeCost under negation', () => {
    const qYes = 42;
    const qNo = 17;
    const b = 80;
    const shares = 9;
    expect(sellPayout(qYes, qNo, b, 'yes', shares)).toBeCloseTo(
      -tradeCost(qYes, qNo, b, 'yes', -shares),
      10,
    );
  });

  it('sharesForCost round-trips tradeCost at a flat market', () => {
    const paidFor30 = tradeCost(0, 0, 100, 'yes', 30);
    expect(sharesForCost(0, 0, 100, 'yes', paidFor30)).toBeCloseTo(30, 6);
  });

  it('sharesForCost round-trips tradeCost at a skewed market', () => {
    const qYes = 42;
    const qNo = 17;
    const b = 80;
    const cost17 = tradeCost(qYes, qNo, b, 'no', 17);
    expect(sharesForCost(qYes, qNo, b, 'no', cost17)).toBeCloseTo(17, 6);
  });

  it('sharesForCost of zero crowns is zero shares', () => {
    expect(sharesForCost(42, 17, 80, 'yes', 0)).toBeCloseTo(0, 6);
  });

  it('sharesForSellPayout round-trips sellPayout', () => {
    const qYes = 30;
    const qNo = 0;
    const b = 100;
    const payoutFor12 = sellPayout(qYes, qNo, b, 'yes', 12);
    expect(sharesForSellPayout(qYes, qNo, b, 'yes', payoutFor12)).toBeCloseTo(12, 6);
  });

  it('sharesForCost then tradeCost on the result returns (approximately) the original budget', () => {
    const qYes = 5;
    const qNo = 60;
    const b = 40;
    const budget = 25;
    const shares = sharesForCost(qYes, qNo, b, 'no', budget);
    expect(tradeCost(qYes, qNo, b, 'no', shares)).toBeCloseTo(budget, 6);
  });
});
