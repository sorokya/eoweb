import type { Coords } from 'eolib';

export class Door {
  coords: Coords;
  open = false;
  openTicks = 0;
  key: number;

  constructor(coords: Coords, key: number) {
    this.coords = coords;
    this.key = key;
  }
}
