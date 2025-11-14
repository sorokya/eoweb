import { DEATH_TICKS } from '../consts';
import { NpcAnimation } from './npc-base-animation';

export class NpcDeathAnimation extends NpcAnimation {
  base: NpcAnimation | undefined;
  constructor(base?: NpcAnimation) {
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
