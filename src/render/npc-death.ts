import { Direction, type NpcMapInfo } from 'eolib';
import { Rectangle, setNpcRectangle } from '../collision';
import { NPC_DEATH_TICKS } from '../consts';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
import type { NPCMetadata } from '../utils/get-npc-metadata';
import { isoToScreen } from '../utils/iso-to-screen';
import type { Vector2 } from '../vector';
import { NpcAnimation } from './npc-base-animation';

export class NpcDeathAnimation extends NpcAnimation {
  constructor() {
    super();
    this.ticks = NPC_DEATH_TICKS;
  }

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);
  }

  render(
    graphicId: number,
    npc: NpcMapInfo,
    meta: NPCMetadata,
    playerScreen: Vector2,
    ctx: CanvasRenderingContext2D,
  ) {
    const downRight = [Direction.Down, Direction.Right].includes(npc.direction);
    const frame = downRight ? 1 : 3;

    const bmp = getBitmapById(GfxType.NPC, (graphicId - 1) * 40 + frame);
    if (!bmp) {
      return;
    }

    const screenCoords = isoToScreen(npc.coords);
    const mirrored = [Direction.Right, Direction.Up].includes(npc.direction);
    const screenX = Math.floor(
      screenCoords.x - bmp.width / 2 - playerScreen.x + HALF_GAME_WIDTH,
    );

    const screenY =
      screenCoords.y - (bmp.height - 23) - playerScreen.y + HALF_GAME_HEIGHT;

    if (mirrored) {
      ctx.save(); // Save the current context state
      ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
      ctx.scale(-1, 1); // Flip horizontally
    }

    const metaOffset = {
      x: meta.xOffset,
      y: meta.yOffset,
    };

    if (this.animationFrame) {
      metaOffset.x += meta.xOffsetAttack;
      metaOffset.y += meta.yOffsetAttack;
    }

    const drawX = Math.floor(
      mirrored
        ? GAME_WIDTH - screenX - bmp.width + metaOffset.x
        : screenX + metaOffset.x,
    );
    const drawY = Math.floor(screenY - metaOffset.y);

    ctx.globalAlpha = this.ticks / NPC_DEATH_TICKS;
    ctx.drawImage(bmp, drawX, drawY);
    ctx.globalAlpha = 1;

    setNpcRectangle(
      npc.index,
      new Rectangle({ x: screenX, y: drawY }, bmp.width, bmp.height),
    );

    if (mirrored) {
      ctx.restore();
    }
  }
}
