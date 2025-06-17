import { Direction, type NpcMapInfo } from 'eolib';
import { getBitmapById, GfxType } from '../gfx';
import { getEnf } from '../db';
import type { Vector2 } from '../vector';
import { isoToScreen } from '../utils/iso-to-screen';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';
import type { Client } from '../client';

export enum NpcState {
  Idle = 0,
}

export class NpcRenderer {
  index: number;
  private client: Client;
  state = NpcState.Idle;
  animationFrame = 0;
  graphicId = 0;

  constructor(client: Client, index: number) {
    this.client = client;
    this.index = index;
    this.preloadSprites();
  }

  get mapInfo(): NpcMapInfo | undefined {
    return this.client.nearby.npcs.find((n) => n.index === this.index);
  }

  preloadSprites() {
    const info = this.mapInfo;
    if (!info) return;
    getEnf().then((enf) => {
      const record = enf.npcs[info.id - 1];
      if (!record) {
        throw new Error(`Invalid NPC id: ${info.id}`);
      }

      this.graphicId = record.graphicId;

      for (let i = 1; i <= 18; ++i) {
        getBitmapById(GfxType.NPC, (record.graphicId - 1) * 40 + i);
      }
    });
  }

  render(ctx: CanvasRenderingContext2D, playerScreen: Vector2) {
    const info = this.mapInfo;
    if (!info) return;

    const offset = [Direction.Down, Direction.Right].includes(info.direction)
      ? 1
      : 3;

    const bmp = getBitmapById(GfxType.NPC, (this.graphicId - 1) * 40 + offset);
    if (!bmp) {
      return;
    }

    const screenCoords = isoToScreen(info.coords);

    const screenX =
      screenCoords.x - bmp.width / 2 - playerScreen.x + HALF_GAME_WIDTH;
    const screenY =
      screenCoords.y - bmp.height - playerScreen.y + HALF_GAME_HEIGHT;

    const mirrored = [Direction.Right, Direction.Up].includes(
      info.direction,
    );

    if (mirrored) {
      ctx.save(); // Save the current context state
      ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
      ctx.scale(-1, 1); // Flip horizontally
    }

    const drawX = mirrored ? GAME_WIDTH - screenX - bmp.width : screenX;

    ctx.drawImage(bmp, drawX, screenY);

    if (mirrored) {
      ctx.restore();
    }
  }
}
