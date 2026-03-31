import { ATTACK_TICKS } from '../consts';
import { Animation } from './animation';

export class CharacterAttackAnimation extends Animation {
  constructor() {
    super();
    this.ticks = ATTACK_TICKS - 1;
  }

  tick() {
    if (this.ticks === 0 || !this.renderedFirstFrame) {
      return;
    }

    this.animationFrame = 1;
    this.ticks = Math.max(this.ticks - 1, 0);
  }
}
