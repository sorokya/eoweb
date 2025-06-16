import { Coords, Direction } from 'eolib';

export function getNextCoords(
  coords: Coords,
  direction: Direction,
  maxWidth: number,
  maxHeight: number,
): Coords {
  const next = new Coords();
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
