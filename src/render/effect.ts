import type { Rectangle } from '../collision';
import type { EffectMetadata } from '../utils/get-effect-metadata';
import { randomRange } from '../utils/random-range';
import type { Vector2 } from '../vector';

export abstract class EffectTarget {
  rect: Rectangle | null = null;
}

export class EffectTargetTile extends EffectTarget {
  constructor(public coords: Vector2) {
    super();
  }
}

export class EffectTargetNpc extends EffectTarget {
  constructor(public index: number) {
    super();
  }
}

export class EffectTargetCharacter extends EffectTarget {
  constructor(public playerId: number) {
    super();
  }
}

export class EffectAnimation {
  id: number;
  target: EffectTarget;
  ticks: number;
  animationFrame = 0;
  loops: number;
  metadata: EffectMetadata;

  constructor(id: number, target: EffectTarget, metadata: EffectMetadata) {
    this.id = id;
    this.target = target;
    this.metadata = metadata;
    this.ticks = metadata.frames;
    this.loops = metadata.loops;
  }

  tick() {
    if (!this.loops) {
      return;
    }

    if (
      this.metadata.randomFlickeringMetadata &&
      this.animationFrame >= this.metadata.randomFlickeringMetadata.firstFrame
    ) {
      this.animationFrame = randomRange(
        this.metadata.randomFlickeringMetadata.firstFrame,
        this.metadata.randomFlickeringMetadata.lastFrame,
      );
    } else {
      this.animationFrame = this.metadata.frames - this.ticks;
    }

    this.ticks = Math.max(this.ticks - 1, 0);
    if (!this.ticks && this.loops) {
      this.loops = Math.max(this.loops - 1, 0);
      if (this.loops) {
        this.ticks = this.metadata.frames;
      }
    }
  }
}
