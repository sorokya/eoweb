export function getVolumeFromDistance(
  distance: number,
  maxDistance = 25.0,
): number {
  return Math.max((maxDistance - distance) / maxDistance, 0);
}
