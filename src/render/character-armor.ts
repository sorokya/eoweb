import { type CharacterMapInfo, Direction, Gender, SitState } from 'eolib';
import { getCharacterRectangle } from '../collision';
import { GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
import { getOffsetX, getOffsetY } from '../ui/offset-tweaker';
import type { Vector2 } from '../vector';

const STANDING_OFFSETS = {
  [Direction.Up]: { x: 0, y: 5 },
  [Direction.Down]: { x: 0, y: 5 },
  [Direction.Left]: { x: 0, y: 5 },
  [Direction.Right]: { x: 0, y: 5 },
};

const FEMALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 0, y: 2 },
  [Direction.Down]: { x: -1, y: 2 },
  [Direction.Left]: { x: 0, y: 2 },
  [Direction.Right]: { x: 1, y: 2 },
};

const MALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 0, y: 2 },
  [Direction.Down]: { x: 1, y: 2 },
  [Direction.Left]: { x: 0, y: 2 },
  [Direction.Right]: { x: -1, y: 2 },
};

const FEMALE_ATTACK_FRAME_0_OFFSETS = {
  [Direction.Up]: { x: -1, y: 5 },
  [Direction.Down]: { x: 1, y: 5 },
  [Direction.Left]: { x: 1, y: 5 },
  [Direction.Right]: { x: -1, y: 5 },
};

const MALE_ATTACK_FRAME_0_OFFSETS = {
  [Direction.Up]: { x: -2, y: 5 },
  [Direction.Down]: { x: 2, y: 5 },
  [Direction.Left]: { x: 2, y: 5 },
  [Direction.Right]: { x: -2, y: 5 },
};

const FEMALE_ATTACK_FRAME_1_OFFSETS = {
  [Direction.Up]: { x: 1, y: 6 },
  [Direction.Down]: { x: -1, y: 6 },
  [Direction.Left]: { x: -2, y: 6 },
  [Direction.Right]: { x: 1, y: 6 },
};

const MALE_ATTACK_FRAME_1_OFFSETS = {
  [Direction.Up]: { x: 2, y: 4 },
  [Direction.Down]: { x: -2, y: 4 },
  [Direction.Left]: { x: -2, y: 4 },
  [Direction.Right]: { x: 2, y: 4 },
};

const MALE_SIT_FLOOR_OFFSETS = {
  [Direction.Up]: { x: -3, y: 14 },
  [Direction.Down]: { x: 3, y: 14 },
  [Direction.Left]: { x: 3, y: 14 },
  [Direction.Right]: { x: -3, y: 14 },
};

const FEMALE_SIT_FLOOR_OFFSETS = {
  [Direction.Up]: { x: -3, y: 14 },
  [Direction.Down]: { x: 3, y: 14 },
  [Direction.Left]: { x: 3, y: 14 },
  [Direction.Right]: { x: -3, y: 14 },
};

const MALE_SIT_CHAIR_OFFSETS = {
  [Direction.Up]: { x: -3, y: 5 },
  [Direction.Down]: { x: 3, y: 6 },
  [Direction.Left]: { x: 3, y: 5 },
  [Direction.Right]: { x: -4, y: 6 },
};

const FEMALE_SIT_CHAIR_OFFSETS = {
  [Direction.Up]: { x: -3, y: -4 },
  [Direction.Down]: { x: 2, y: 2 },
  [Direction.Left]: { x: 3, y: -4 },
  [Direction.Right]: { x: -2, y: 3 },
};

export function renderCharacterArmor(
  character: CharacterMapInfo,
  ctx: CanvasRenderingContext2D,
  animationFrame: number,
  walking: boolean,
  attacking: boolean,
) {
  if (character.equipment.armor <= 0) {
    return;
  }

  const baseOffset = [Direction.Down, Direction.Right].includes(
    character.direction,
  )
    ? 0
    : 1;
  const baseGfxId = (character.equipment.armor - 1) * 50;
  let offset = 0;
  switch (true) {
    case walking:
      offset = animationFrame + 3 + 4 * baseOffset;
      break;
    case attacking:
      offset = animationFrame + 13 + baseOffset;
      break;
    case character.sitState === SitState.Floor:
      offset = 19 + baseOffset;
      break;
    case character.sitState === SitState.Chair:
      offset = 17 + baseOffset;
      break;
    default:
      offset = 1 + baseOffset;
  }

  const bmp = getBitmapById(
    character.gender === Gender.Female
      ? GfxType.FemaleArmor
      : GfxType.MaleArmor,
    baseGfxId + offset,
  );

  if (!bmp) {
    return;
  }

  const rect = getCharacterRectangle(character.playerId);
  if (!rect) {
    return;
  }

  let screenX = Math.floor(rect.position.x + rect.width / 2 - bmp.width / 2);

  let screenY = Math.floor(rect.position.y + rect.height - bmp.height) + 1;

  const { direction, gender, sitState } = character;

  let additionalOffset: Vector2;
  switch (true) {
    case walking:
      additionalOffset =
        gender === Gender.Female
          ? FEMALE_WALKING_OFFSETS[direction]
          : MALE_WALKING_OFFSETS[direction];
      break;
    case attacking:
      additionalOffset =
        gender === Gender.Female
          ? animationFrame
            ? FEMALE_ATTACK_FRAME_1_OFFSETS[direction]
            : FEMALE_ATTACK_FRAME_0_OFFSETS[direction]
          : animationFrame
            ? MALE_ATTACK_FRAME_1_OFFSETS[direction]
            : MALE_ATTACK_FRAME_0_OFFSETS[direction];
      break;
    case sitState === SitState.Floor:
      additionalOffset =
        gender === Gender.Female
          ? FEMALE_SIT_FLOOR_OFFSETS[direction]
          : MALE_SIT_FLOOR_OFFSETS[direction];
      break;
    case sitState === SitState.Chair:
      additionalOffset =
        gender === Gender.Female
          ? FEMALE_SIT_CHAIR_OFFSETS[direction]
          : MALE_SIT_CHAIR_OFFSETS[direction];
      break;
    default:
      additionalOffset = STANDING_OFFSETS[direction];
      break;
  }

  screenX += additionalOffset.x;
  screenY += additionalOffset.y;

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
