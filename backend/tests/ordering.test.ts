import { computePosition, INITIAL_GAP, MIN_GAP, rebalancedPositions } from '../src/modules/tasks/ordering';

describe('fractional ordering', () => {
  it('handles empty, first, last, and middle positions', () => {
    expect(computePosition(null, null)).toBe(INITIAL_GAP);
    expect(computePosition(null, 1024)).toBe(512);
    expect(computePosition(1024, null)).toBe(2048);
    expect(computePosition(1024, 2048)).toBe(1536);
  });
  it('requests a rebalance when the gap is exhausted', () => {
    expect(computePosition(1, 1 + MIN_GAP / 2)).toBeNull();
    expect(rebalancedPositions(3)).toEqual([1024, 2048, 3072]);
  });
});
