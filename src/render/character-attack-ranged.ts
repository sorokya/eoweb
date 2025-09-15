import { RANGED_ATTACK_TICKS } from '../consts';
import { CharacterAnimation } from './character-base-animation';

export class CharacterRangedAttackAnimation extends CharacterAnimation {
  constructor() {
    super();
    this.ticks = RANGED_ATTACK_TICKS;
    this.animationFrame = 1;
  }

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);
  }
}
