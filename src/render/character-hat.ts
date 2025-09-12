import { type CharacterMapInfo, Direction, Gender, SitState } from 'eolib';
import { CharacterAction } from '../client';
import { getCharacterRectangle } from '../collision';
import { GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
import type { Vector2 } from '../vector';

const MALE_STANDING_OFFSETS = {
  [Direction.Up]: { x: 0, y: 0 },
  [Direction.Down]: { x: 0, y: 0 },
  [Direction.Left]: { x: 0, y: 0 },
  [Direction.Right]: { x: 0, y: 0 },
};

const FEMALE_STANDING_OFFSETS = {
  [Direction.Up]: { x: 0, y: 1 },
  [Direction.Down]: { x: 0, y: 1 },
  [Direction.Left]: { x: 0, y: 1 },
  [Direction.Right]: { x: 0, y: 1 },
};

const FEMALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 0, y: 2 },
  [Direction.Down]: { x: 0, y: 2 },
  [Direction.Left]: { x: 0, y: 2 },
  [Direction.Right]: { x: 0, y: 2 },
};

const MALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 0, y: 1 },
  [Direction.Down]: { x: 1, y: 1 },
  [Direction.Left]: { x: 0, y: 1 },
  [Direction.Right]: { x: -1, y: 1 },
};

const FEMALE_ATTACK_OFFSETS = [
  {
    [Direction.Up]: { x: -1, y: 1 },
    [Direction.Down]: { x: 1, y: 1 },
    [Direction.Left]: { x: 1, y: 1 },
    [Direction.Right]: { x: -1, y: 1 },
  },
  {
    [Direction.Up]: { x: 3, y: 2 },
    [Direction.Down]: { x: -3, y: 6 },
    [Direction.Left]: { x: -3, y: 2 },
    [Direction.Right]: { x: 3, y: 6 },
  },
];

const MALE_ATTACK_OFFSETS = [
  {
    [Direction.Up]: { x: -2, y: 0 },
    [Direction.Down]: { x: 2, y: 0 },
    [Direction.Left]: { x: 2, y: 0 },
    [Direction.Right]: { x: -2, y: 0 },
  },
  {
    [Direction.Up]: { x: 2, y: 1 },
    [Direction.Down]: { x: -4, y: 4 },
    [Direction.Left]: { x: -2, y: 1 },
    [Direction.Right]: { x: 4, y: 4 },
  },
];

const FEMALE_RANGE_ATTACK_OFFSETS = {
  [Direction.Up]: { x: -3, y: 1 },
  [Direction.Down]: { x: 3, y: 2 },
  [Direction.Left]: { x: 4, y: 1 },
  [Direction.Right]: { x: -3, y: 2 },
};

const MALE_RANGE_ATTACK_OFFSETS = {
  [Direction.Up]: { x: -2, y: 0 },
  [Direction.Down]: { x: 5, y: 0 },
  [Direction.Left]: { x: 4, y: 0 },
  [Direction.Right]: { x: -4, y: 0 },
};

const MALE_SIT_FLOOR_OFFSETS = {
  [Direction.Up]: { x: -5, y: 0 },
  [Direction.Down]: { x: 3, y: 0 },
  [Direction.Left]: { x: 5, y: 0 },
  [Direction.Right]: { x: -3, y: 0 },
};

const FEMALE_SIT_FLOOR_OFFSETS = {
  [Direction.Up]: { x: -5, y: -1 },
  [Direction.Down]: { x: 2, y: -1 },
  [Direction.Left]: { x: 5, y: -1 },
  [Direction.Right]: { x: -2, y: -1 },
};

const MALE_SIT_CHAIR_OFFSETS = {
  [Direction.Up]: { x: -3, y: 0 },
  [Direction.Down]: { x: 3, y: 0 },
  [Direction.Left]: { x: 3, y: 0 },
  [Direction.Right]: { x: -3, y: 0 },
};

const FEMALE_SIT_CHAIR_OFFSETS = {
  [Direction.Up]: { x: -3, y: -1 },
  [Direction.Down]: { x: -2, y: -1 },
  [Direction.Left]: { x: 3, y: -1 },
  [Direction.Right]: { x: -2, y: -1 },
};

export function renderCharacterHat(
  character: CharacterMapInfo,
  ctx: CanvasRenderingContext2D,
  animationFrame: number,
  action: CharacterAction,
) {
  if (character.equipment.hat <= 0) {
    return;
  }

  const directionalOffset = [Direction.Down, Direction.Right].includes(
    character.direction,
  )
    ? 1
    : 3;
  const graphicId = (character.equipment.hat - 1) * 10 + directionalOffset;
  const bmp = getBitmapById(
    character.gender === Gender.Female ? GfxType.FemaleHat : GfxType.MaleHat,
    graphicId,
  );

  if (!bmp) {
    return;
  }

  const rect = getCharacterRectangle(character.playerId);
  if (!rect) {
    return;
  }

  let screenX = Math.floor(rect.position.x + rect.width / 2 - bmp.width / 2);

  let screenY = Math.floor(rect.position.y - bmp.height / 2) + 1;

  const { direction, gender, sitState } = character;

  let additionalOffset: Vector2;
  switch (true) {
    case action === CharacterAction.Walking:
      additionalOffset =
        gender === Gender.Female
          ? FEMALE_WALKING_OFFSETS[direction]
          : MALE_WALKING_OFFSETS[direction];
      break;
    case action === CharacterAction.MeleeAttack:
      additionalOffset =
        gender === Gender.Female
          ? FEMALE_ATTACK_OFFSETS[animationFrame][direction]
          : MALE_ATTACK_OFFSETS[animationFrame][direction];
      break;
    case action === CharacterAction.RangedAttack:
      additionalOffset =
        gender === Gender.Female
          ? FEMALE_RANGE_ATTACK_OFFSETS[direction]
          : MALE_RANGE_ATTACK_OFFSETS[direction];
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
      additionalOffset =
        gender === Gender.Female
          ? FEMALE_STANDING_OFFSETS[direction]
          : MALE_STANDING_OFFSETS[direction];
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

  ctx.drawImage(bmp, drawX, screenY, bmp.width, bmp.height);

  if (mirrored) {
    ctx.restore();
  }
}
