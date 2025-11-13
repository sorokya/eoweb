import type { Coords, Direction } from 'eolib';
import { WALK_TICKS } from '../consts';
import { NpcAnimation } from './npc-base-animation';

export class NpcWalkAnimation extends NpcAnimation {
  from: Coords;
  to: Coords;
  direction: Direction;
  animationFrame = 0;

  constructor(from: Coords, to: Coords, direction: Direction) {
    super();
    this.ticks = WALK_TICKS - 1;
    this.from = from;
    this.to = to;
    this.direction = direction;
  }

  tick() {
    if (this.ticks === 0) {
      return;
    }

    this.animationFrame = this.animationFrame + 1;
    this.ticks = Math.max(this.ticks - 1, 0);
  }
}
