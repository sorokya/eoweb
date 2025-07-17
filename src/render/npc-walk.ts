import { type Coords, Direction, type NpcMapInfo } from 'eolib';
import { Rectangle, setNpcRectangle } from '../collision';
import {
  WALK_ANIMATION_FRAMES,
  WALK_HEIGHT_FACTOR,
  WALK_TICKS,
  WALK_WIDTH_FACTOR,
} from '../consts';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
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
  ) {
    const downRight = [Direction.Down, Direction.Right].includes(
      this.direction,
    );
    const animationFrameOffset = this.animationFrame + 1;
    const offset = downRight
      ? animationFrameOffset + 4
      : animationFrameOffset + 8;

    const bmpData = getBitmapById(GfxType.NPC, (graphicId - 1) * 40 + offset);
    if (!bmpData) {
      return;
    }
    const { image: bmp, frame: bmpFrame } = bmpData;

    const screenCoords = isoToScreen(this.from);
    const mirrored = [Direction.Right, Direction.Up].includes(this.direction);
    const screenX = Math.floor(
      screenCoords.x -
        bmpFrame.w / 2 -
        playerScreen.x +
        HALF_GAME_WIDTH +
        this.walkOffset.x,
    );

    const screenY =
      screenCoords.y -
      (bmpFrame.h - 23) -
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
        ? GAME_WIDTH - screenX - bmpFrame.w + meta.xOffset
        : screenX + meta.xOffset,
    );
    const drawY = Math.floor(screenY - meta.yOffset);

    ctx.drawImage(
      bmp,
      bmpFrame.x,
      bmpFrame.y,
      bmpFrame.w,
      bmpFrame.h,
      drawX,
      drawY,
      bmpFrame.w,
      bmpFrame.h,
    );

    setNpcRectangle(
      npc.index,
      new Rectangle({ x: screenX, y: drawY }, bmpFrame.w, bmpFrame.h),
    );

    if (mirrored) {
      ctx.restore();
    }
  }
}
