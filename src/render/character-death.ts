import { DEATH_TICKS } from '../consts';
import { CharacterAnimation } from './character-base-animation';

export class CharacterDeathAnimation extends CharacterAnimation {
  base: CharacterAnimation | undefined;
  constructor(base?: CharacterAnimation) {
    super();
    this.ticks = DEATH_TICKS - 1;
    this.base = base;
    this.renderedFirstFrame = base?.renderedFirstFrame ?? false;
  }

  tick() {
    if (this.ticks === 0 || !this.renderedFirstFrame) {
      return;
    }

    this.ticks = Math.max(this.ticks - 1, 0);
    if (this.base) {
      this.base.tick();
    }
  }
}
