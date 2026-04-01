import type { Vector2 } from './vector';

export class Door {
  coords: Vector2;
  open = false;
  openTicks = 0;
  key: number;

  constructor(coords: Vector2, key: number) {
    this.coords = coords;
    this.key = key;
  }
}
