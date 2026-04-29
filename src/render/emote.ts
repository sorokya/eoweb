import { EMOTE_ANIMATION_TICKS } from '@/consts';

export class Emote {
  ticks = EMOTE_ANIMATION_TICKS - 1;
  type: number;
  animationFrame = 0;
  renderedFirstFrame = false;

  constructor(type: number) {
    this.type = type;
  }

  tick() {
    if (!this.ticks || !this.renderedFirstFrame) {
      return;
    }

    this.animationFrame += 1;
    this.ticks = Math.max(this.ticks - 1, 0);
  }
}
