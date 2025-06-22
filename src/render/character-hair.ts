import { type CharacterMapInfo, Direction, Gender } from 'eolib';
import { getCharacterRectangle } from '../collision';
import { GAME_WIDTH } from '../game-state';
import { getBitmapById, GfxType } from '../gfx';

export function renderCharacterHair(
  character: CharacterMapInfo,
  ctx: CanvasRenderingContext2D,
  walking: boolean,
  attacking: boolean,
) {
  if (character.hairStyle <= 0) {
    return;
  }

  const baseGfxId = (character.hairStyle - 1) * 40 + character.hairColor * 4;
  const offset =
    2 *
    ([Direction.Down, Direction.Right].includes(character.direction) ? 0 : 1);
  const gfxId = baseGfxId + 2 + offset;
  const bmp = getBitmapById(
    character.gender === Gender.Female ? GfxType.FemaleHair : GfxType.MaleHair,
    gfxId,
  );

  if (!bmp) {
    return;
  }

  const rect = getCharacterRectangle(character.playerId);
  if (!rect) {
    return;
  }

  let screenX = Math.floor(
    rect.position.x + rect.width / 2 - bmp.width / 2 + 1,
  );

  let screenY = Math.floor(
    rect.position.y -
      bmp.height +
      41 +
      (character.gender === Gender.Female ? 1 : 0),
  );

  if (walking) {
    switch (character.direction) {
      case Direction.Up:
        screenY += 1;
        break;
      case Direction.Down:
        screenX -= 1;
        screenY += 1;
        break;
      case Direction.Left:
        screenX -= 2;
        screenY += 1;
        break;
      case Direction.Right:
        screenX -= 1;
        screenY += 1;
        break;
    }
  } else if (attacking) {
    switch (character.direction) {
      case Direction.Up:
        screenX -= 1;
        screenY += 1;
        break;
      case Direction.Down:
        screenX -= 1;
        screenY += 1;
        break;
      case Direction.Left:
        screenX -= 1;
        screenY += 1;
        break;
      case Direction.Right:
        screenX -= 1;
        screenY += 1;
        break;
    }
  } else {
    switch (character.direction) {
      case Direction.Down:
        screenX -= 2;
        break;
      case Direction.Left:
        screenX -= 2;
        break;
    }
  }

  const mirrored = [Direction.Right, Direction.Up].includes(
    character.direction,
  );

  if (mirrored) {
    ctx.save(); // Save the current context state
    ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
    ctx.scale(-1, 1); // Flip horizontally
  }

  const drawX = Math.floor(
    mirrored ? GAME_WIDTH - screenX - bmp.width : screenX,
  );

  ctx.drawImage(bmp, drawX, screenY);

  if (mirrored) {
    ctx.restore();
  }
}
