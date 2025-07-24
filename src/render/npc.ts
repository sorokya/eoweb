import { Direction, type EnfRecord, type NpcMapInfo } from 'eolib';
import { Rectangle, setNpcRectangle } from '../collision';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById, getFrameById } from '../gfx';
import type { NPCMetadata } from '../utils/get-npc-metadata';
import { isoToScreen } from '../utils/iso-to-screen';
import type { Vector2 } from '../vector';

export function renderNpc(
  npc: NpcMapInfo,
  record: EnfRecord,
  meta: NPCMetadata,
  idleFrame: number,
  playerScreen: Vector2,
  ctx: CanvasRenderingContext2D,
) {
  let offset = [Direction.Down, Direction.Right].includes(npc.direction)
    ? 1
    : 3;

  if (meta.animatedStanding) {
    offset += idleFrame;
  }

  const bmp = getBitmapById(GfxType.NPC, (record.graphicId - 1) * 40 + offset);
  if (!bmp) {
    return;
  }

  const frame = getFrameById(GfxType.NPC, (record.graphicId - 1) * 40 + offset);

  const screenCoords = isoToScreen(npc.coords);
  const mirrored = [Direction.Right, Direction.Up].includes(npc.direction);

  const screenX = Math.floor(
    screenCoords.x - frame.w / 2 - playerScreen.x + HALF_GAME_WIDTH,
  );
  const screenY =
    screenCoords.y - (frame.h - 23) - playerScreen.y + HALF_GAME_HEIGHT;

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
