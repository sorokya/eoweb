import { NPC_DEATH_TICKS } from '../consts';
import { NpcAnimation } from './npc-base-animation';

export class NpcDeathAnimation extends NpcAnimation {
  base: NpcAnimation | undefined;
  constructor(base?: NpcAnimation) {
    super();
    this.ticks = NPC_DEATH_TICKS;
    this.base = base;
  }

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);
  }
}
