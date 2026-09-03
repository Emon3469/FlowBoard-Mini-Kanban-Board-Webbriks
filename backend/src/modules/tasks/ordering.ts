export const INITIAL_GAP = 1024;
export const MIN_GAP = 0.0001;

export function computePosition(prev: number | null, next: number | null): number | null {
  if (prev === null && next === null) return INITIAL_GAP;
  if (prev === null) return next! / 2;
  if (next === null) return prev + INITIAL_GAP;
  if (next - prev < MIN_GAP) return null;
  return prev + (next - prev) / 2;
}

export function rebalancedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) * INITIAL_GAP);
}
