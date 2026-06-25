/**
 * Calculates the shortest distance between two points on a circle.
 */
export function getDistanceOnCircle(from: number, to: number, circleSize: number): number {
  const diff = Math.abs(to - from);
  return Math.min(diff, circleSize - diff);
}