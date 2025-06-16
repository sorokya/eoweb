import { type BigCoords, Coords } from 'eolib';

export function bigCoordsToCoords(big: BigCoords): Coords {
  const coords = new Coords();
  coords.x = big.x;
  coords.y = big.y;
  return coords;
}
