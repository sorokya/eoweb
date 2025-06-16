import { BigCoords, type Coords } from 'eolib';

export function coordsToBigCoords(coords: Coords): BigCoords {
  const big = new BigCoords();
  big.x = coords.x;
  big.y = coords.y;
  return big;
}
