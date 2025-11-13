import { RANGED_ATTACK_TICKS } from '../consts';
import { CharacterAnimation } from './character-base-animation';

export class CharacterRangedAttackAnimation extends CharacterAnimation {
  constructor() {
    super();
    this.ticks = RANGED_ATTACK_TICKS - 1;
  }

  tick() {
    if (this.ticks === 0 || !this.renderedFirstFrame) {
      return;
    }

    this.ticks = Math.max(this.ticks - 1, 0);
  }
}
