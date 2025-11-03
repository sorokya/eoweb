import { Direction } from 'eolib';
import {
  WALK_ANIMATION_FRAMES,
  WALK_HEIGHT_FACTOR,
  WALK_TICKS,
  WALK_WIDTH_FACTOR,
} from '../consts';
import type { Vector2 } from '../vector';
import { CharacterAnimation } from './character-base-animation';

export class CharacterWalkAnimation extends CharacterAnimation {
  from: Vector2;
  to: Vector2;
  direction: Direction;
  walkOffset = { x: 0, y: 0 };

  constructor(from: Vector2, to: Vector2, direction: Direction) {
    super();
    this.ticks = WALK_TICKS;
    this.from = from;
    this.to = to;
    this.direction = direction;
  }

  tick() {
    if (this.ticks === 0) {
      return;
    }

    const walkFrame = Math.abs(this.ticks - WALK_TICKS) + 1;
    this.animationFrame = (this.animationFrame + 1) % WALK_ANIMATION_FRAMES;
    this.walkOffset = {
      [Direction.Up]: {
        x: WALK_WIDTH_FACTOR * walkFrame,
        y: -WALK_HEIGHT_FACTOR * walkFrame,
      },
      [Direction.Down]: {
        x: -WALK_WIDTH_FACTOR * walkFrame,
        y: WALK_HEIGHT_FACTOR * walkFrame,
      },
      [Direction.Left]: {
        x: -WALK_WIDTH_FACTOR * walkFrame,
        y: -WALK_HEIGHT_FACTOR * walkFrame,
      },
      [Direction.Right]: {
        x: WALK_WIDTH_FACTOR * walkFrame,
        y: WALK_HEIGHT_FACTOR * walkFrame,
      },
    }[this.direction];
    this.ticks = Math.max(this.ticks - 1, 0);
  }

  isOnLastFrame(): boolean {
    return this.animationFrame === WALK_ANIMATION_FRAMES || this.ticks === 0;
  }
}
