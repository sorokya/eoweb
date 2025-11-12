import type { Vector2 } from '../vector';

const CURSOR_TICKS_PER_FRAME = 2;
const CURSOR_CLICK_FRAMES = 2;

export class CursorClickAnimation {
  ticks = CURSOR_TICKS_PER_FRAME * CURSOR_CLICK_FRAMES;
  animationFrame = 0;
  renderedFirstFrame = false;
  at: Vector2;

  constructor(at: Vector2) {
    this.at = at;
  }

  tick() {
    if (this.ticks === 0 || !this.renderedFirstFrame) {
      return;
    }

    this.ticks = Math.max(this.ticks - 1, 0);

    if (this.ticks === 2) {
      this.animationFrame = 1;
    }
  }
}
