import { ATTACK_TICKS } from '../consts';
import { CharacterAnimation } from './character-base-animation';

export class CharacterAttackAnimation extends CharacterAnimation {
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
