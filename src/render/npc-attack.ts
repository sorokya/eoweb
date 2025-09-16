import { ATTACK_TICKS } from '../consts';
import { NpcAnimation } from './npc-base-animation';

export class NpcAttackAnimation extends NpcAnimation {
  constructor() {
    super();
    this.ticks = ATTACK_TICKS;
  }

  tick() {
    switch (this.ticks) {
      case 5:
        this.animationFrame = 0;
        break;
      default:
        this.animationFrame = 1;
        break;
    }

    this.ticks = Math.max(this.ticks - 1, 0);
  }
}
