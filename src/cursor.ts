import { screenToIso } from './utils/screen-to-iso';
import type { Vector2 } from './vector';

export class Cursor {
  coords: Vector2 | undefined;

  update(mousePosition: Vector2) {
    this.coords = screenToIso(mousePosition);
  }

  render(_ctx: CanvasRenderingContext2D) {
    if (this.coords) {
    }
  }
}
