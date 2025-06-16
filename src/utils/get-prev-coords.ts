import { Coords, Direction } from 'eolib';

export function getPrevCoords(
  coords: Coords,
  direction: Direction,
  maxWidth: number,
  maxHeight: number,
): Coords {
  const prev = new Coords();
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
