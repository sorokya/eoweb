import { type CharacterMapInfo, Direction, Gender } from 'eolib';
import { CharacterAction } from '../client';
import { getCharacterRectangle } from '../collision';
import { GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
import type { Vector2 } from '../vector';

export enum HatMaskType {
  Standard = 0,
  FaceMask = 1,
  HideHair = 2,
}

const HAT_METADATA: Record<number, HatMaskType> = {
  7: HatMaskType.FaceMask,
  8: HatMaskType.FaceMask,
  9: HatMaskType.FaceMask,
  10: HatMaskType.FaceMask,
  11: HatMaskType.FaceMask,
  12: HatMaskType.FaceMask,
  13: HatMaskType.FaceMask,
  14: HatMaskType.FaceMask,
  15: HatMaskType.FaceMask,
  32: HatMaskType.FaceMask,
  33: HatMaskType.FaceMask,
  48: HatMaskType.FaceMask,
  50: HatMaskType.FaceMask,

  16: HatMaskType.HideHair,
  17: HatMaskType.HideHair,
  18: HatMaskType.HideHair,
  19: HatMaskType.HideHair,
  20: HatMaskType.HideHair,
  21: HatMaskType.HideHair,
  25: HatMaskType.HideHair,
  26: HatMaskType.HideHair,
  28: HatMaskType.HideHair,
  30: HatMaskType.HideHair,
  31: HatMaskType.HideHair,
  34: HatMaskType.HideHair,
  35: HatMaskType.HideHair,
  36: HatMaskType.HideHair,
  37: HatMaskType.HideHair,
  38: HatMaskType.HideHair,
  40: HatMaskType.HideHair,
  41: HatMaskType.HideHair,
  44: HatMaskType.HideHair,
  46: HatMaskType.HideHair,
  47: HatMaskType.HideHair,
};

export function getHatMaskType(hatId: number): HatMaskType {
  return HAT_METADATA[hatId] ?? HatMaskType.Standard;
}

const HAT_OFFSETS: Record<Direction, Vector2> = {
  [Direction.Down]: { x: 0, y: -3 },
  [Direction.Left]: { x: 0, y: -3 },
  [Direction.Up]: { x: -2, y: -3 },
  [Direction.Right]: { x: -2, y: -3 },
};

const STANDING_OFFSETS = {
  [Direction.Up]: { x: 0, y: 0 },
  [Direction.Down]: { x: -2, y: 0 },
  [Direction.Left]: { x: -2, y: 0 },
  [Direction.Right]: { x: 0, y: 0 },
};

const FEMALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 0, y: 1 },
  [Direction.Down]: { x: -2, y: 1 },
  [Direction.Left]: { x: -2, y: 1 },
  [Direction.Right]: { x: 0, y: 1 },
};

const MALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 0, y: 1 },
  [Direction.Down]: { x: -1, y: 1 },
  [Direction.Left]: { x: -2, y: 1 },
  [Direction.Right]: { x: -1, y: 1 },
};

const FEMALE_RANGED_ATTACK_OFFSETS = {
  [Direction.Up]: { x: -3, y: 0 },
  [Direction.Down]: { x: 2, y: 1 },
  [Direction.Left]: { x: 2, y: 0 },
  [Direction.Right]: { x: -3, y: 1 },
};

const MALE_RANGED_ATTACK_OFFSETS = {
  [Direction.Up]: { x: -2, y: 0 },
  [Direction.Down]: { x: 3, y: 0 },
  [Direction.Left]: { x: 1, y: 0 },
  [Direction.Right]: { x: -4, y: 0 },
};

const FEMALE_MELEE_ATTACK_OFFSETS = [
  {
    [Direction.Up]: { x: -1, y: 0 },
    [Direction.Down]: { x: -1, y: 0 },
    [Direction.Left]: { x: -1, y: 0 },
    [Direction.Right]: { x: -1, y: 0 },
  },
  {
    [Direction.Up]: { x: 3, y: 1 },
    [Direction.Down]: { x: -5, y: 5 },
    [Direction.Left]: { x: -5, y: 1 },
    [Direction.Right]: { x: 3, y: 4 },
  },
];

const MALE_MELEE_ATTACK_OFFSETS = [
  {
    [Direction.Up]: { x: -2, y: 0 },
    [Direction.Down]: { x: 0, y: 0 },
    [Direction.Left]: { x: 0, y: 0 },
    [Direction.Right]: { x: -2, y: 0 },
  },
  {
    [Direction.Up]: { x: 1, y: 0 },
    [Direction.Down]: { x: -6, y: 4 },
    [Direction.Left]: { x: -4, y: 1 },
    [Direction.Right]: { x: 4, y: 4 },
  },
];

function processHatImage(
  originalBmp: HTMLImageElement | HTMLCanvasElement,
  hatMaskType: HatMaskType,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = originalBmp.width;
  canvas.height = originalBmp.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');
  ctx.drawImage(originalBmp, 0, 0);

  if (hatMaskType === HatMaskType.Standard) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
}

function calculateHatRenderPosition(
  character: CharacterMapInfo,
  animationFrame: number,
  action: CharacterAction,
): Vector2 | null {
  const rect = getCharacterRectangle(character.playerId);
  if (!rect) return null;

  const hatID = character.equipment.hat;
  const hatMaskType = getHatMaskType(hatID);

  if (hatMaskType === HatMaskType.Standard && character.hairStyle <= 0) {
    return null;
  }

  let basePosition: Vector2;

  if (character.hairStyle > 0) {
    const baseGfxId = (character.hairStyle - 1) * 40 + character.hairColor * 4;
    const offset =
      2 *
      ([Direction.Down, Direction.Right].includes(character.direction) ? 0 : 1);
    const gfxId = baseGfxId + 2 + offset;
    const bmp = getBitmapById(
      character.gender === Gender.Female
        ? GfxType.FemaleHair
        : GfxType.MaleHair,
      gfxId,
    );

    if (bmp) {
      basePosition = {
        x: Math.floor(rect.position.x + rect.width / 2 - bmp.width / 2 + 1),
        y: Math.floor(
          rect.position.y -
            bmp.height +
            41 +
            (character.gender === Gender.Female ? 1 : 0),
        ),
      };
    } else {
      basePosition = {
        x: Math.floor(rect.position.x + rect.width / 2),
        y: Math.floor(
          rect.position.y + 41 + (character.gender === Gender.Female ? 1 : 0),
        ),
      };
    }
  } else {
    basePosition = {
      x: Math.floor(rect.position.x + rect.width / 2),
      y: Math.floor(
        rect.position.y + 41 + (character.gender === Gender.Female ? 1 : 0),
      ),
    };
  }

  const { direction, gender } = character;
  let additionalOffset: Vector2;

  switch (action) {
    case CharacterAction.Walking:
      additionalOffset =
        gender === Gender.Female
          ? FEMALE_WALKING_OFFSETS[direction]
          : MALE_WALKING_OFFSETS[direction];
      break;
    case CharacterAction.MeleeAttack:
      additionalOffset =
        gender === Gender.Female
          ? FEMALE_MELEE_ATTACK_OFFSETS[animationFrame][direction]
          : MALE_MELEE_ATTACK_OFFSETS[animationFrame][direction];
      break;
    case CharacterAction.RangedAttack:
      additionalOffset =
        gender === Gender.Female
          ? FEMALE_RANGED_ATTACK_OFFSETS[direction]
          : MALE_RANGED_ATTACK_OFFSETS[direction];
      break;
    default:
      additionalOffset = STANDING_OFFSETS[direction];
      break;
  }

  return {
    x: basePosition.x + additionalOffset.x,
    y: basePosition.y + additionalOffset.y,
  };
}

export function renderCharacterHat(
  character: CharacterMapInfo,
  ctx: CanvasRenderingContext2D,
  animationFrame: number,
  action: CharacterAction,
) {
  const hatID = character.equipment.hat;
  if (hatID <= 0) return;

  const hatMaskType = getHatMaskType(hatID);

  const hatPos = calculateHatRenderPosition(character, animationFrame, action);
  if (!hatPos) {
    return;
  }

  const hatOffset = HAT_OFFSETS[character.direction];
  const hatDrawX = hatPos.x + hatOffset.x;
  const hatDrawY = hatPos.y + hatOffset.y;

  const base = (hatID - 1) * 10;
  const flip = [Direction.Down, Direction.Right].includes(character.direction)
    ? 0
    : 1;
  const gfxId = base + 1 + 2 * flip;
  const hatType =
    character.gender === Gender.Female ? GfxType.FemaleHat : GfxType.MaleHat;
  const bmp = getBitmapById(hatType, gfxId);

  if (!bmp) {
    return;
  }

  const processed = processHatImage(bmp, hatMaskType);

  const mirrored = [Direction.Right, Direction.Up].includes(
    character.direction,
  );

  if (mirrored) {
    ctx.save();
    ctx.translate(GAME_WIDTH, 0);
    ctx.scale(-1, 1);
  }

  const drawX = Math.floor(
    mirrored ? GAME_WIDTH - hatDrawX - processed.width : hatDrawX,
  );
  ctx.drawImage(processed, drawX, hatDrawY);

  if (mirrored) {
    ctx.restore();
  }
}

export function shouldRenderHair(character: CharacterMapInfo): boolean {
  const hatID = character.equipment.hat;
  if (hatID <= 0) return true;

  const hatMaskType = getHatMaskType(hatID);
  return hatMaskType !== HatMaskType.HideHair;
}

export function isHatBehindHair(character: CharacterMapInfo): boolean {
  const hatID = character.equipment.hat;
  if (hatID <= 0) return false;

  const hatMaskType = getHatMaskType(hatID);
  return hatMaskType === HatMaskType.FaceMask;
}
