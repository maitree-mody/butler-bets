import { describe, it, expect } from 'vitest';
import { cost, priceYes, tradeCost } from './lmsr';

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
});
