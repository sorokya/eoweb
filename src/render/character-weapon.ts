import { type CharacterMapInfo, Direction, Gender, SitState } from 'eolib';
import { CharacterAction } from '../client';
import { getCharacterRectangle } from '../collision';
import { GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById, getFrameById } from '../gfx';
import { WeaponSpriteType } from '../utils/get-weapon-sprite-type';
import type { Vector2 } from '../vector';

const MALE_STANDING_OFFSETS = {
  [Direction.Up]: { x: 9, y: 6 },
  [Direction.Down]: { x: -9, y: 6 },
  [Direction.Left]: { x: -9, y: 6 },
  [Direction.Right]: { x: 9, y: 6 },
};

const FEMALE_STANDING_OFFSETS = {
  [Direction.Up]: { x: 9, y: 5 },
  [Direction.Down]: { x: -9, y: 5 },
  [Direction.Left]: { x: -9, y: 5 },
  [Direction.Right]: { x: 9, y: 5 },
};

const MALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 9, y: 2 },
  [Direction.Down]: { x: -9, y: 2 },
  [Direction.Left]: { x: -9, y: 2 },
  [Direction.Right]: { x: 9, y: 2 },
};

const FEMALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 9, y: 1 },
  [Direction.Down]: { x: -9, y: 1 },
  [Direction.Left]: { x: -9, y: 1 },
  [Direction.Right]: { x: 9, y: 1 },
};

const MALE_MELEE_OFFSETS = [
  {
    [Direction.Up]: { x: 6, y: 4 },
    [Direction.Down]: { x: -12, y: 4 },
    [Direction.Left]: { x: -12, y: 4 },
    [Direction.Right]: { x: 6, y: 4 },
  },
  {
    [Direction.Up]: { x: 12, y: 4 },
    [Direction.Down]: { x: -12, y: 4 },
    [Direction.Left]: { x: -12, y: 4 },
    [Direction.Right]: { x: 12, y: 4 },
  },
];

const FEMALE_MELEE_OFFSETS = [
  {
    [Direction.Up]: { x: 6, y: 3 },
    [Direction.Down]: { x: -12, y: 3 },
    [Direction.Left]: { x: -12, y: 3 },
    [Direction.Right]: { x: 6, y: 3 },
  },
  {
    [Direction.Up]: { x: 10, y: 2 },
    [Direction.Down]: { x: -10, y: 2 },
    [Direction.Left]: { x: -10, y: 2 },
    [Direction.Right]: { x: 10, y: 2 },
  },
];

const MALE_RANGED_OFFSETS = {
  [Direction.Up]: { x: 10, y: 3 },
  [Direction.Down]: { x: -10, y: 3 },
  [Direction.Left]: { x: -10, y: 3 },
  [Direction.Right]: { x: 10, y: 3 },
};

const FEMALE_RANGED_OFFSETS = {
  [Direction.Up]: { x: 10, y: 7 },
  [Direction.Down]: { x: -10, y: 7 },
  [Direction.Left]: { x: -10, y: 7 },
  [Direction.Right]: { x: 10, y: 7 },
};

const MALE_SPELL_OFFSETS = {
  [Direction.Up]: { x: 0, y: 0 },
  [Direction.Down]: { x: 0, y: 0 },
  [Direction.Left]: { x: 0, y: 0 },
  [Direction.Right]: { x: 0, y: 0 },
};

const FEMALE_SPELL_OFFSETS = {
  [Direction.Up]: { x: 0, y: 1 },
  [Direction.Down]: { x: 0, y: 1 },
  [Direction.Left]: { x: 0, y: 1 },
  [Direction.Right]: { x: 0, y: 1 },
};

function shouldRenderInLayer(
  character: CharacterMapInfo,
  action: CharacterAction,
  animationFrame: number,
  layer: 'behind' | 'front',
): boolean {
  if (action === CharacterAction.RangedAttack) {
    return layer === 'behind';
  }

  if (action === CharacterAction.MeleeAttack && animationFrame === 1) {
    if ([Direction.Down, Direction.Right].includes(character.direction)) {
      return true;
    }
    return layer === 'behind';
  }

  return layer === 'behind';
}

export function renderCharacterWeapon(
  character: CharacterMapInfo,
  ctx: CanvasRenderingContext2D,
  animationFrame: number,
  action: CharacterAction,
  layer: 'behind' | 'front',
  isRangedWeapon = false,
): void {
  if (character.equipment.weapon <= 0) {
    return;
  }

  if (character.sitState !== SitState.Stand) {
    return;
  }

  if (!shouldRenderInLayer(character, action, animationFrame, layer)) {
    return;
  }

  let type = WeaponSpriteType.Standing;

  switch (action) {
    case CharacterAction.Walking:
      switch (animationFrame) {
        case 0:
          type = WeaponSpriteType.WalkFrame1;
          break;
        case 1:
          type = WeaponSpriteType.WalkFrame2;
          break;
        case 2:
          type = WeaponSpriteType.WalkFrame3;
          break;
        case 3:
          type = WeaponSpriteType.WalkFrame4;
          break;
      }
      break;
    case CharacterAction.MeleeAttack:
      if (isRangedWeapon) {
        switch (animationFrame) {
          case 0:
            type = WeaponSpriteType.Shooting;
            break;
          case 1:
            type = WeaponSpriteType.Standing;
            break;
        }
      } else {
        switch (animationFrame) {
          case 0:
            type = WeaponSpriteType.SwingFrame1;
            break;
          case 1:
            if (
              [Direction.Down, Direction.Right].includes(character.direction)
            ) {
              type =
                layer === 'front'
                  ? WeaponSpriteType.SwingFrame2Spec
                  : WeaponSpriteType.SwingFrame2;
            } else {
              type = WeaponSpriteType.SwingFrame2;
            }
            break;
        }
      }
      break;
    case CharacterAction.RangedAttack:
      type = WeaponSpriteType.Shooting;
      break;
    case CharacterAction.CastingSpell:
      type = WeaponSpriteType.SpellCast;
      break;
    default:
      type = WeaponSpriteType.Standing;
      break;
  }

  const gfxFile =
    character.gender === Gender.Female
      ? GfxType.FemaleWeapons
      : GfxType.MaleWeapons;
  const baseWeaponValue = (character.equipment.weapon - 1) * 100;
  const directionalOffset = [Direction.Down, Direction.Right].includes(
    character.direction,
  )
    ? 0
    : 1;

  const stateMultiplier = (() => {
    switch (type) {
      case WeaponSpriteType.WalkFrame1:
      case WeaponSpriteType.WalkFrame2:
      case WeaponSpriteType.WalkFrame3:
      case WeaponSpriteType.WalkFrame4:
        return 4;
      case WeaponSpriteType.SwingFrame1:
      case WeaponSpriteType.SwingFrame2:
        return 2;
      default:
        return 1;
    }
  })();

  const gfxNumber =
    baseWeaponValue + type + stateMultiplier * directionalOffset;

  const bmp = getBitmapById(gfxFile, gfxNumber);
  const frame = getFrameById(gfxFile, gfxNumber);

  if (!bmp) {
    return;
  }

  const rect = getCharacterRectangle(character.playerId);
  if (!rect) return;

  let screenX = Math.floor(rect.position.x + rect.width / 2 - frame.w / 2);
  let screenY = Math.floor(rect.position.y + rect.height - frame.h) + 1;

  const { direction, gender } = character;

  let additionalOffset: Vector2;
  if (
    [
      WeaponSpriteType.WalkFrame1,
      WeaponSpriteType.WalkFrame2,
      WeaponSpriteType.WalkFrame3,
      WeaponSpriteType.WalkFrame4,
    ].includes(type)
  ) {
    additionalOffset =
      gender === Gender.Female
        ? FEMALE_WALKING_OFFSETS[direction]
        : MALE_WALKING_OFFSETS[direction];
  } else if (
    [
      WeaponSpriteType.SwingFrame1,
      WeaponSpriteType.SwingFrame2,
      WeaponSpriteType.SwingFrame2Spec,
    ].includes(type)
  ) {
    const frameIndex = type === WeaponSpriteType.SwingFrame1 ? 0 : 1;
    additionalOffset =
      gender === Gender.Female
        ? FEMALE_MELEE_OFFSETS[frameIndex][direction]
        : MALE_MELEE_OFFSETS[frameIndex][direction];
  } else if (type === WeaponSpriteType.Shooting) {
    additionalOffset =
      gender === Gender.Female
        ? FEMALE_RANGED_OFFSETS[direction]
        : MALE_RANGED_OFFSETS[direction];
  } else if (type === WeaponSpriteType.SpellCast) {
    additionalOffset =
      gender === Gender.Female
        ? FEMALE_SPELL_OFFSETS[direction]
        : MALE_SPELL_OFFSETS[direction];
  } else {
    additionalOffset =
      gender === Gender.Female
        ? FEMALE_STANDING_OFFSETS[direction]
        : MALE_STANDING_OFFSETS[direction];
  }

  screenX += additionalOffset.x;
  screenY += additionalOffset.y;

  const mirrored = [Direction.Right, Direction.Up].includes(
    character.direction,
  );

  if (mirrored) {
    ctx.save();
    ctx.translate(GAME_WIDTH, 0);
    ctx.scale(-1, 1);
  }

  const drawX = Math.floor(mirrored ? GAME_WIDTH - screenX - frame.w : screenX);

  ctx.drawImage(
    bmp,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    drawX,
    screenY,
    frame.w,
    frame.h,
  );

  if (mirrored) {
    ctx.restore();
  }
}
