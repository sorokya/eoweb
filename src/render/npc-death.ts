import { NPC_DEATH_TICKS } from '../consts';
import { NpcAnimation } from './npc-base-animation';

export class NpcDeathAnimation extends NpcAnimation {
  constructor() {
    super();
    this.ticks = NPC_DEATH_TICKS;
  }

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);
  }
}
