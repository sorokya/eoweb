import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH } from '../consts';
import type { Vector2 } from '../vector';

export function screenToIso({ x, y }: Vector2) {
  return {
    x: Math.floor((x / HALF_TILE_WIDTH + y / HALF_TILE_HEIGHT) / 2),
    y: Math.floor((y / HALF_TILE_HEIGHT - x / HALF_TILE_WIDTH) / 2),
  };
}
