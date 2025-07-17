import { type CharacterMapInfo, Direction, Emote, Gender } from 'eolib';
import {
  getCharacterRectangle,
  Rectangle,
  setCharacterRectangle,
} from '../collision';
import {
  CHARACTER_SIT_CHAIR_HEIGHT,
  CHARACTER_SIT_CHAIR_WIDTH,
  HALF_CHARACTER_SIT_CHAIR_WIDTH,
} from '../consts';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
import { isoToScreen } from '../utils/iso-to-screen';
import type { Vector2 } from '../vector';

export function calculateCharacterRenderPositionChair(
  character: CharacterMapInfo,
  playerScreen: Vector2,
) {
  const screenCoords = isoToScreen(character.coords);

  const additionalOffset = { x: 0, y: 0 };
  if (character.gender === Gender.Female) {
    switch (character.direction) {
      case Direction.Up:
        additionalOffset.x = 3;
        additionalOffset.y = 15;
        break;
      case Direction.Down:
        additionalOffset.x = -2;
        additionalOffset.y = 13;
        break;
      case Direction.Left:
        additionalOffset.x = -3;
        additionalOffset.y = 15;
        break;
      case Direction.Right:
        additionalOffset.x = 2;
        additionalOffset.y = 13;
        break;
    }
  } else {
    switch (character.direction) {
      case Direction.Up:
        additionalOffset.x = 3;
        additionalOffset.y = 14;
        break;
      case Direction.Down:
        additionalOffset.x = -3;
        additionalOffset.y = 12;
        break;
      case Direction.Left:
        additionalOffset.x = -3;
        additionalOffset.y = 14;
        break;
      case Direction.Right:
        additionalOffset.x = 3;
        additionalOffset.y = 12;
        break;
    }
  }

  const screenX = Math.floor(
    screenCoords.x -
      HALF_CHARACTER_SIT_CHAIR_WIDTH -
      playerScreen.x +
      HALF_GAME_WIDTH +
      additionalOffset.x,
  );

  const screenY = Math.floor(
    screenCoords.y -
      CHARACTER_SIT_CHAIR_HEIGHT -
      playerScreen.y +
      HALF_GAME_HEIGHT +
      additionalOffset.y,
  );

  setCharacterRectangle(
    character.playerId,
    new Rectangle(
      { x: screenX, y: screenY },
      CHARACTER_SIT_CHAIR_WIDTH,
      CHARACTER_SIT_CHAIR_HEIGHT,
    ),
  );
}

export function renderCharacterChair(
  character: CharacterMapInfo,
  emote: Emote | null,
  ctx: CanvasRenderingContext2D,
) {
  const bmp = getBitmapById(GfxType.SkinSprites, 5);
  if (!bmp) {
    return;
  }

  const emoteBmp = emote ? getBitmapById(GfxType.SkinSprites, 8) : null;

  const rect = getCharacterRectangle(character.playerId);
  if (!rect) {
    return;
  }

  const startX =
    character.gender === Gender.Female ? 0 : CHARACTER_SIT_CHAIR_WIDTH * 2;
  const sourceX =
    startX +
    ([Direction.Up, Direction.Left].includes(character.direction)
      ? CHARACTER_SIT_CHAIR_WIDTH
      : 0);
  const sourceY = character.skin * CHARACTER_SIT_CHAIR_HEIGHT;

  const mirrored = [Direction.Right, Direction.Up].includes(
    character.direction,
  );

  if (mirrored) {
    ctx.save(); // Save the current context state
    ctx.translate(GAME_WIDTH, 0); // Move origin to the right edge
    ctx.scale(-1, 1); // Flip horizontally
  }

  const drawX = Math.floor(
    mirrored
      ? GAME_WIDTH - rect.position.x - CHARACTER_SIT_CHAIR_WIDTH
      : rect.position.x,
  );

  ctx.drawImage(
    bmp.image,
    bmp.frame.x + sourceX,
    bmp.frame.y + sourceY,
    CHARACTER_SIT_CHAIR_WIDTH,
    CHARACTER_SIT_CHAIR_HEIGHT,
    drawX,
    rect.position.y,
    CHARACTER_SIT_CHAIR_WIDTH,
    CHARACTER_SIT_CHAIR_HEIGHT,
  );

  if (
    emoteBmp &&
    ![Emote.Trade, Emote.LevelUp].includes(emote) &&
    [Direction.Down, Direction.Right].includes(character.direction)
  ) {
    let xOffset: number;
    switch (emote) {
      case Emote.Playful:
        xOffset = 10;
        break;
      case Emote.Embarrassed:
        xOffset = 9;
        break;
      default:
        xOffset = emote - 1;
        break;
    }

    const emoteSourceX = xOffset * 13;
    const emoteSourceY = character.skin * 14;

    const drawX = Math.floor(
      mirrored ? GAME_WIDTH - rect.position.x - 16 : rect.position.x + 8,
    );

    ctx.drawImage(
      emoteBmp.image,
      emoteBmp.frame.x + emoteSourceX,
      emoteBmp.frame.y + emoteSourceY,
      13,
      14,
      drawX - (character.gender === Gender.Female ? 1 : 0),
      rect.position.y,
      13,
      14,
    );
  }

  if (mirrored) {
    ctx.restore();
  }
}
