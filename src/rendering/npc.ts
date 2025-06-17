import type { NpcMapInfo } from 'eolib';
import { getBitmapById, GfxType } from '../gfx';
import { getEnf } from '../db';
import type { Vector2 } from '../vector';
import { isoToScreen } from '../utils/iso-to-screen';
import { HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';

export enum NpcState {
  Idle = 0,
}

export class NpcRenderer {
  mapInfo: NpcMapInfo;
  state = NpcState.Idle;
  animationFrame = 0;
  graphicId = 0;

  constructor(mapInfo: NpcMapInfo) {
    this.mapInfo = mapInfo;
    this.preloadSprites();
  }

  preloadSprites() {
    getEnf().then((enf) => {
      const record = enf.npcs[this.mapInfo.id - 1];
      if (!record) {
        throw new Error(`Invalid NPC id: ${this.mapInfo.id}`);
      }

      this.graphicId = record.graphicId;

      for (let i = 1; i <= 18; ++i) {
        getBitmapById(GfxType.NPC, (record.graphicId - 1) * 40 + i);
      }
    });
  }

  render(ctx: CanvasRenderingContext2D, playerScreen: Vector2) {
    const bmp = getBitmapById(GfxType.NPC, (this.graphicId - 1) * 40 + 1);
    if (!bmp) {
      return;
    }

    const screenCoords = isoToScreen(this.mapInfo.coords);

    const screenX =
      screenCoords.x - bmp.width / 2 - playerScreen.x + HALF_GAME_WIDTH;
    const screenY =
      screenCoords.y - bmp.height - playerScreen.y + HALF_GAME_HEIGHT;

    ctx.drawImage(bmp, screenX, screenY);
  }
}
