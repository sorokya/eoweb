import { type CharacterMapInfo, Direction } from 'eolib';
import { CharacterAction } from '../client';
import { getCharacterRectangle } from '../collision';
import { GfxType, getBitmapById, getFrameById } from '../gfx';

const SLASH_OFFSETS = {
  [Direction.Down]: { x: -12, y: 0 },
  [Direction.Left]: { x: -15, y: -10 },
  [Direction.Up]: { x: 15, y: -10 },
  [Direction.Right]: { x: 12, y: 0 },
};

export function renderWeaponSlash(
  character: CharacterMapInfo,
  ctx: CanvasRenderingContext2D,
  animationFrame: number,
  action: CharacterAction,
  weaponMetadata?: { slash?: number; ranged?: boolean },
): void {
  if (
    character.equipment.weapon <= 0 ||
    action !== CharacterAction.MeleeAttack ||
    animationFrame !== 1 ||
    !weaponMetadata?.slash ||
    weaponMetadata.ranged
  ) {
    return;
  }

  const atlas = getBitmapById(GfxType.PostLoginUI, 40);
  const frame = getFrameById(GfxType.PostLoginUI, 40);

  if (!atlas || !frame) {
    return;
  }

  const rect = getCharacterRectangle(character.playerId);
  if (!rect) {
    return;
  }

  const slashWidth = Math.floor(frame.w / 4);
  const slashHeight = Math.floor(frame.h / 9);
  const sourceX = frame.x + slashWidth * character.direction;
  const sourceY = frame.y + slashHeight * weaponMetadata.slash;

  let screenX = Math.floor(rect.position.x + rect.width / 2 - slashWidth / 2);
  let screenY = Math.floor(rect.position.y + rect.height - slashHeight) + 1;

  const slashOffset = SLASH_OFFSETS[character.direction];
  screenX += slashOffset.x;
  screenY += slashOffset.y - character.gender;

  ctx.globalAlpha = 96 / 255;
  ctx.drawImage(
    atlas,
    sourceX,
    sourceY,
    slashWidth,
    slashHeight,
    screenX,
    screenY,
    slashWidth,
    slashHeight,
  );
  ctx.globalAlpha = 1.0;
}
