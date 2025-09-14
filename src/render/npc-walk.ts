import { type Coords, Direction, type NpcMapInfo } from 'eolib';
import { type Atlas, NpcFrame } from '../atlas';
import { Rectangle, setNpcRectangle } from '../collision';
import {
  WALK_ANIMATION_FRAMES,
  WALK_HEIGHT_FACTOR,
  WALK_TICKS,
  WALK_WIDTH_FACTOR,
} from '../consts';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';
import type { NPCMetadata } from '../utils/get-npc-metadata';
import { isoToScreen } from '../utils/iso-to-screen';
import type { Vector2 } from '../vector';
import { NpcAnimation } from './npc-base-animation';

export class NpcWalkAnimation extends NpcAnimation {
  from: Coords;
  to: Coords;
  direction: Direction;
  animationFrame = 0;
  walkOffset = { x: 0, y: 0 };

  constructor(from: Coords, to: Coords, direction: Direction) {
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

  render(
    graphicId: number,
    npc: NpcMapInfo,
    meta: NPCMetadata,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
    atlas: Atlas,
  ) {
    const downRight = [Direction.Down, Direction.Right].includes(
      this.direction,
    );

    const frame = atlas.getNpcFrame(
      graphicId,
      downRight
        ? NpcFrame.WalkingDownRight1 + this.animationFrame
        : NpcFrame.WalkingUpLeft1 + this.animationFrame,
    );

    if (!frame) {
      return;
    }

    const bmp = atlas.getAtlas(frame.atlasIndex);
    if (!bmp) {
      return;
    }

    const screenCoords = isoToScreen(this.from);
    const mirrored = [Direction.Right, Direction.Up].includes(this.direction);
    const screenX = Math.floor(
      screenCoords.x -
        frame.w / 2 -
        playerScreen.x +
        HALF_GAME_WIDTH +
        this.walkOffset.x,
    );

    const screenY =
      screenCoords.y -
      (frame.h - 23) -
      playerScreen.y +
      HALF_GAME_HEIGHT +
      this.walkOffset.y;

    if (mirrored) {
      ctx.save(); // Save the current context state
      ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
      ctx.scale(-1, 1); // Flip horizontally
    }

    const drawX = Math.floor(
      mirrored
        ? GAME_WIDTH - screenX - frame.w + meta.xOffset
        : screenX + meta.xOffset,
    );
    const drawY = Math.floor(screenY - meta.yOffset);

    ctx.drawImage(
      bmp,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      drawX,
      drawY,
      frame.w,
      frame.h,
    );

    setNpcRectangle(
      npc.index,
      new Rectangle({ x: screenX, y: drawY }, frame.w, frame.h),
    );

    if (mirrored) {
      ctx.restore();
    }
  }
}
