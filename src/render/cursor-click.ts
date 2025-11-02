const CURSOR_TICKS_PER_FRAME = 2;
const CURSOR_CLICK_FRAMES = 2;

export class CursorClickAnimation {
  ticks = CURSOR_TICKS_PER_FRAME * CURSOR_CLICK_FRAMES;
  animationFrame = 0;

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);

    if (this.ticks % CURSOR_TICKS_PER_FRAME === 0) {
      this.animationFrame++;
    }
  }
}
