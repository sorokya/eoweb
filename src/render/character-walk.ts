import type { Direction } from 'eolib';
import { WALK_TICKS } from '../consts';
import type { Vector2 } from '../vector';
import { CharacterAnimation } from './character-base-animation';

export class CharacterWalkAnimation extends CharacterAnimation {
  from: Vector2;
  to: Vector2;
  direction: Direction;

  constructor(from: Vector2, to: Vector2, direction: Direction) {
    super();
    this.ticks = WALK_TICKS - 1;
    this.from = from;
    this.to = to;
    this.direction = direction;
  }

  tick() {
    if (this.ticks === 0 || !this.renderedFirstFrame) {
      return;
    }

    this.animationFrame = this.animationFrame + 1;
    this.ticks = Math.max(this.ticks - 1, 0);
  }
}
