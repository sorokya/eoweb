import type { Rectangle } from '../collision';
import { HALF_TILE_HEIGHT, TILE_HEIGHT } from '../consts';
import { GfxType, getBitmapById } from '../gfx';
import type { EffectMetadata } from '../utils/get-effect-metadata';
import { randomRange } from '../utils/random-range';
import type { Vector2 } from '../vector';

abstract class EffectTarget {
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

  private getDrawPosition(frameWidth: number, frameHeight: number): Vector2 {
    const additionalOffset = { x: 0, y: 0 };
    if (this.metadata.positionOffsetMetadata) {
      additionalOffset.x +=
        this.metadata.positionOffsetMetadata.offsetByFrameX[
          this.animationFrame
        ];
      additionalOffset.y +=
        this.metadata.positionOffsetMetadata.offsetByFrameY[
          this.animationFrame
        ];
    }

    if (this.metadata.verticalMetadata) {
      additionalOffset.y +=
        this.metadata.verticalMetadata.frameOffsetY * this.animationFrame;
    }

    return {
      x:
        Math.floor(
          this.target.rect.position.x -
            frameWidth / 2 +
            this.target.rect.width / 2,
        ) +
        this.metadata.offsetX +
        additionalOffset.x,
      y: Math.floor(
        this.target.rect.position.y +
          this.target.rect.height -
          TILE_HEIGHT -
          HALF_TILE_HEIGHT -
          (36 + Math.floor((frameHeight - 100) / 2)) +
          this.metadata.offsetY +
          additionalOffset.y,
      ),
    };
  }

  renderBehind(ctx: CanvasRenderingContext2D) {
    if (!this.metadata.hasBehindLayer || !this.target.rect) {
      return;
    }

    const bmpData = getBitmapById(GfxType.Spells, (this.id - 1) * 3 + 1);
    if (!bmpData) {
      return;
    }
    const { image: bmp, frame } = bmpData;

    const frameWidth = frame.w / this.metadata.frames;
    const sourceX = frame.x + this.animationFrame * frameWidth;
    const drawPos = this.getDrawPosition(frameWidth, frame.h);

    ctx.drawImage(
      bmp,
      sourceX,
      frame.y,
      frameWidth,
      frame.h,
      drawPos.x,
      drawPos.y,
      frameWidth,
      frame.h,
    );
  }

  renderTransparent(ctx: CanvasRenderingContext2D) {
    if (!this.metadata.hasTransparentLayer || !this.target.rect) {
      return;
    }

    const bmpData = getBitmapById(GfxType.Spells, (this.id - 1) * 3 + 2);
    if (!bmpData) {
      return;
    }
    const { image: bmp, frame } = bmpData;

    const frameWidth = frame.w / this.metadata.frames;
    const sourceX = frame.x + this.animationFrame * frameWidth;
    const drawPos = this.getDrawPosition(frameWidth, frame.h);

    ctx.drawImage(
      bmp,
      sourceX,
      frame.y,
      frameWidth,
      frame.h,
      drawPos.x,
      drawPos.y,
      frameWidth,
      frame.h,
    );
  }

  renderFront(ctx: CanvasRenderingContext2D) {
    if (!this.metadata.hasInFrontLayer || !this.target.rect) {
      return;
    }

    const bmpData = getBitmapById(GfxType.Spells, (this.id - 1) * 3 + 3);
    if (!bmpData) {
      return;
    }
    const { image: bmp, frame } = bmpData;

    const frameWidth = frame.w / this.metadata.frames;
    const sourceX = frame.x + this.animationFrame * frameWidth;
    const drawPos = this.getDrawPosition(frameWidth, frame.h);

    ctx.drawImage(
      bmp,
      sourceX,
      frame.y,
      frameWidth,
      frame.h,
      drawPos.x,
      drawPos.y,
      frameWidth,
      frame.h,
    );
  }
}
