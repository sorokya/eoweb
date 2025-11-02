import type { Emote as EmoteType } from 'eolib';
import { EMOTE_ANIMATION_FRAMES, EMOTE_ANIMATION_TICKS } from '../consts';

export class Emote {
  ticks = EMOTE_ANIMATION_TICKS;
  type: EmoteType;
  animationFrame = 0;

  constructor(type: EmoteType) {
    this.type = type;
  }

  tick() {
    if (!this.ticks) {
      return;
    }

    this.animationFrame = EMOTE_ANIMATION_FRAMES - Math.ceil(this.ticks / 2);
    this.ticks = Math.max(this.ticks - 1, 0);
  }
}
