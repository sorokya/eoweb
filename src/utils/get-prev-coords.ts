import { Direction } from 'eolib';
import type { Vector2 } from '@/vector';

export function getPrevCoords(
  coords: Vector2,
  direction: Direction,
  maxWidth: number,
  maxHeight: number,
): Vector2 {
  const prev = { x: 0, y: 0 };
  switch (direction) {
    case Direction.Down:
      prev.x = coords.x;
      prev.y = Math.max(coords.y - 1, 0);
      break;
    case Direction.Left:
      prev.x = Math.min(coords.x + 1, maxWidth);
      prev.y = coords.y;
      break;
    case Direction.Right:
      prev.x = Math.max(coords.x - 1, 0);
      prev.y = coords.y;
      break;
    case Direction.Up:
      prev.x = coords.x;
      prev.y = Math.min(coords.y + 1, maxHeight);
      break;
  }
  return prev;
}
