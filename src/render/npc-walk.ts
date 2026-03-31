import type { Direction } from 'eolib';
import { WALK_TICKS } from '../consts';
import type { Vector2 } from '../vector';
import { NpcAnimation } from './npc-base-animation';

export class NpcWalkAnimation extends NpcAnimation {
  from: Vector2;
  to: Vector2;
  direction: Direction;
  animationFrame = 0;

  constructor(from: Vector2, to: Vector2, direction: Direction) {
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
