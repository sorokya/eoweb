import { Direction } from 'eolib';
import type { Vector2 } from '../vector';

export function getNextCoords(
  coords: Vector2,
  direction: Direction,
  maxWidth: number,
  maxHeight: number,
): Vector2 {
  const next = { x: 0, y: 0 };
  switch (direction) {
    case Direction.Down:
      next.x = coords.x;
      next.y = Math.min(coords.y + 1, maxHeight);
      break;
    case Direction.Left:
      next.x = Math.max(coords.x - 1, 0);
      next.y = coords.y;
      break;
    case Direction.Right:
      next.x = Math.min(coords.x + 1, maxWidth);
      next.y = coords.y;
      break;
    case Direction.Up:
      next.x = coords.x;
      next.y = Math.max(coords.y - 1, 0);
      break;
  }
  return next;
}
