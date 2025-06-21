import type { Coords } from 'eolib';

export class Door {
  coords: Coords;
  open = false;
  openTicks = 0;

  constructor(coords: Coords) {
    this.coords = coords;
  }
}
