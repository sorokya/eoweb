import { RANGED_ATTACK_TICKS } from '@/consts';
import { Animation } from './animation';

export class CharacterRangedAttackAnimation extends Animation {
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
