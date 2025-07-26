import { type CharacterMapInfo, Direction, Gender, SitState } from 'eolib';
import { CharacterAction } from '../client';
import { getCharacterRectangle } from '../collision';
import { GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById, getFrameById } from '../gfx';
import {
  ArmorShieldSpriteType,
  isBackShield,
} from '../utils/get-armor-shield-type';
import type { Vector2 } from '../vector';

const FRONT_SHIELD_MALE_STANDING_OFFSETS = {
  [Direction.Up]: { x: 5, y: -7 },
  [Direction.Down]: { x: -5, y: -7 },
  [Direction.Left]: { x: -5, y: -7 },
  [Direction.Right]: { x: 5, y: -7 },
};

const FRONT_SHIELD_FEMALE_STANDING_OFFSETS = {
  [Direction.Up]: { x: 5, y: -6 },
  [Direction.Down]: { x: -5, y: -6 },
  [Direction.Left]: { x: -5, y: -6 },
  [Direction.Right]: { x: 5, y: -6 },
};

const FRONT_SHIELD_MALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 5, y: -10 },
  [Direction.Down]: { x: -5, y: -10 },
  [Direction.Left]: { x: -5, y: -10 },
  [Direction.Right]: { x: 5, y: -10 },
};

const FRONT_SHIELD_FEMALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 5, y: -9 },
  [Direction.Down]: { x: -5, y: -9 },
  [Direction.Left]: { x: -5, y: -9 },
  [Direction.Right]: { x: 5, y: -9 },
};

const FRONT_SHIELD_MALE_ATTACK_FRAME_2_OFFSETS = {
  [Direction.Up]: { x: 6, y: -7 },
  [Direction.Down]: { x: -6, y: -7 },
  [Direction.Left]: { x: -6, y: -7 },
  [Direction.Right]: { x: 6, y: -7 },
};

const FRONT_SHIELD_FEMALE_ATTACK_FRAME_2_OFFSETS = {
  [Direction.Up]: { x: 6, y: -5 },
  [Direction.Down]: { x: -6, y: -5 },
  [Direction.Left]: { x: -6, y: -5 },
  [Direction.Right]: { x: 6, y: -5 },
};

const FRONT_SHIELD_MALE_SPELL_OFFSETS = {
  [Direction.Up]: { x: -3, y: 10 },
  [Direction.Down]: { x: -21, y: 10 },
  [Direction.Left]: { x: -21, y: 10 },
  [Direction.Right]: { x: -3, y: 10 },
};

const FRONT_SHIELD_FEMALE_SPELL_OFFSETS = {
  [Direction.Up]: { x: -3, y: 4 },
  [Direction.Down]: { x: -21, y: 4 },
  [Direction.Left]: { x: -21, y: 4 },
  [Direction.Right]: { x: -3, y: 4 },
};

const BACK_SHIELD_MALE_STANDING_OFFSETS = {
  [Direction.Up]: { x: 0, y: -16 },
  [Direction.Down]: { x: 0, y: -16 },
  [Direction.Left]: { x: 0, y: -16 },
  [Direction.Right]: { x: 0, y: -16 },
};

const BACK_SHIELD_FEMALE_STANDING_OFFSETS = {
  [Direction.Up]: { x: 0, y: -16 },
  [Direction.Down]: { x: 0, y: -16 },
  [Direction.Left]: { x: 0, y: -16 },
  [Direction.Right]: { x: 0, y: -16 },
};

const BACK_SHIELD_MALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 0, y: -18 },
  [Direction.Down]: { x: 1, y: -18 },
  [Direction.Left]: { x: 0, y: -18 },
  [Direction.Right]: { x: -1, y: -18 },
};

const BACK_SHIELD_FEMALE_WALKING_OFFSETS = {
  [Direction.Up]: { x: 0, y: -18 },
  [Direction.Down]: { x: 0, y: -18 },
  [Direction.Left]: { x: 0, y: -18 },
  [Direction.Right]: { x: 0, y: -18 },
};

const BACK_SHIELD_MALE_RANGED_ATTACK_OFFSETS = {
  [Direction.Up]: { x: -1, y: -16 },
  [Direction.Down]: { x: 2, y: -16 },
  [Direction.Left]: { x: 2, y: -16 },
  [Direction.Right]: { x: -1, y: -16 },
};

const BACK_SHIELD_FEMALE_RANGED_ATTACK_OFFSETS = {
  [Direction.Up]: { x: 0, y: -16 },
  [Direction.Down]: { x: 0, y: -16 },
  [Direction.Left]: { x: 0, y: -16 },
  [Direction.Right]: { x: 0, y: -16 },
};

const BACK_SHIELD_MALE_MELEE_ATTACK_OFFSETS = {
  [Direction.Up]: { x: 2, y: -16 },
  [Direction.Down]: { x: -2, y: -16 },
  [Direction.Left]: { x: -2, y: -16 },
  [Direction.Right]: { x: 2, y: -16 },
};

const BACK_SHIELD_FEMALE_MELEE_ATTACK_OFFSETS = {
  [Direction.Up]: { x: 2, y: -14 },
  [Direction.Down]: { x: -2, y: -14 },
  [Direction.Left]: { x: -2, y: -14 },
  [Direction.Right]: { x: 2, y: -14 },
};

const BACK_SHIELD_MALE_SIT_FLOOR_OFFSETS = {
  [Direction.Up]: { x: -12, y: -2 },
  [Direction.Down]: { x: 3, y: -2 },
  [Direction.Left]: { x: 15, y: -2 },
  [Direction.Right]: { x: -3, y: -2 },
};

const BACK_SHIELD_FEMALE_SIT_FLOOR_OFFSETS = {
  [Direction.Up]: { x: -10, y: -3 },
  [Direction.Down]: { x: 0, y: -3 },
  [Direction.Left]: { x: 10, y: -3 },
  [Direction.Right]: { x: 0, y: -3 },
};

const BACK_SHIELD_MALE_SIT_CHAIR_OFFSETS = {
  [Direction.Up]: { x: -5, y: -2 },
  [Direction.Down]: { x: -5, y: 0 },
  [Direction.Left]: { x: -3, y: -2 },
  [Direction.Right]: { x: -5, y: 0 },
};

const BACK_SHIELD_FEMALE_SIT_CHAIR_OFFSETS = {
  [Direction.Up]: { x: -5, y: -3 },
  [Direction.Down]: { x: -5, y: -1 },
  [Direction.Left]: { x: -3, y: -3 },
  [Direction.Right]: { x: -5, y: -1 },
};

function shouldRenderInLayer(
  character: CharacterMapInfo,
  action: CharacterAction,
  _animationFrame: number,
  layer: 'behind' | 'front',
  isShieldOnBack: boolean,
): boolean {
  if (isShieldOnBack) {
    if (character.sitState !== SitState.Stand) {
      if ([Direction.Down, Direction.Right].includes(character.direction)) {
        return layer === 'behind';
      }
      return layer === 'front';
    }

    if ([Direction.Up, Direction.Left].includes(character.direction)) {
      return layer === 'front';
    }
    return layer === 'behind';
  }

  if (
    action === CharacterAction.MeleeAttack ||
    action === CharacterAction.RangedAttack
  ) {
    return layer === 'front';
  }

  return layer === 'front';
}

function getShieldOffset(
  character: CharacterMapInfo,
  action: CharacterAction,
  animationFrame: number,
  isShieldOnBack: boolean,
  weaponMetadata?: { ranged?: boolean },
): Vector2 {
  const { direction, gender, sitState } = character;

  if (isShieldOnBack) {
    if (sitState === SitState.Floor) {
      return gender === Gender.Female
        ? BACK_SHIELD_FEMALE_SIT_FLOOR_OFFSETS[direction]
        : BACK_SHIELD_MALE_SIT_FLOOR_OFFSETS[direction];
    }

    if (sitState === SitState.Chair) {
      return gender === Gender.Female
        ? BACK_SHIELD_FEMALE_SIT_CHAIR_OFFSETS[direction]
        : BACK_SHIELD_MALE_SIT_CHAIR_OFFSETS[direction];
    }

    if (action === CharacterAction.Walking) {
      return gender === Gender.Female
        ? BACK_SHIELD_FEMALE_WALKING_OFFSETS[direction]
        : BACK_SHIELD_MALE_WALKING_OFFSETS[direction];
    }

    if (
      (action === CharacterAction.MeleeAttack ||
        action === CharacterAction.RangedAttack) &&
      animationFrame === 1
    ) {
      if (weaponMetadata?.ranged) {
        return gender === Gender.Female
          ? BACK_SHIELD_FEMALE_RANGED_ATTACK_OFFSETS[direction]
          : BACK_SHIELD_MALE_RANGED_ATTACK_OFFSETS[direction];
      }
      return gender === Gender.Female
        ? BACK_SHIELD_FEMALE_MELEE_ATTACK_OFFSETS[direction]
        : BACK_SHIELD_MALE_MELEE_ATTACK_OFFSETS[direction];
    }

    return gender === Gender.Female
      ? BACK_SHIELD_FEMALE_STANDING_OFFSETS[direction]
      : BACK_SHIELD_MALE_STANDING_OFFSETS[direction];
  }
  if (action === CharacterAction.Walking) {
    return gender === Gender.Female
      ? FRONT_SHIELD_FEMALE_WALKING_OFFSETS[direction]
      : FRONT_SHIELD_MALE_WALKING_OFFSETS[direction];
  }

  if (
    (action === CharacterAction.MeleeAttack ||
      action === CharacterAction.RangedAttack) &&
    animationFrame === 1
  ) {
    return gender === Gender.Female
      ? FRONT_SHIELD_FEMALE_ATTACK_FRAME_2_OFFSETS[direction]
      : FRONT_SHIELD_MALE_ATTACK_FRAME_2_OFFSETS[direction];
  }

  if (action === CharacterAction.CastingSpell) {
    return gender === Gender.Female
      ? FRONT_SHIELD_FEMALE_SPELL_OFFSETS[direction]
      : FRONT_SHIELD_MALE_SPELL_OFFSETS[direction];
  }

  return gender === Gender.Female
    ? FRONT_SHIELD_FEMALE_STANDING_OFFSETS[direction]
    : FRONT_SHIELD_MALE_STANDING_OFFSETS[direction];
}

function getShieldSpriteType(
  action: CharacterAction,
  animationFrame: number,
  isShieldOnBack: boolean,
  direction: Direction,
): { type: ArmorShieldSpriteType; offset: number } {
  const directionalOffset = [Direction.Down, Direction.Right].includes(
    direction,
  )
    ? 0
    : 1;

  if (isShieldOnBack) {
    if (
      action === CharacterAction.MeleeAttack ||
      action === CharacterAction.RangedAttack
    ) {
      return {
        type: ArmorShieldSpriteType.ShieldItemOnBack_AttackingWithBow,
        offset: directionalOffset,
      };
    }
    return { type: ArmorShieldSpriteType.Standing, offset: directionalOffset };
  }

  let type = ArmorShieldSpriteType.Standing;
  let offset = directionalOffset;

  switch (action) {
    case CharacterAction.Walking:
      switch (animationFrame) {
        case 0:
          type = ArmorShieldSpriteType.WalkFrame1;
          break;
        case 1:
          type = ArmorShieldSpriteType.WalkFrame2;
          break;
        case 2:
          type = ArmorShieldSpriteType.WalkFrame3;
          break;
        case 3:
          type = ArmorShieldSpriteType.WalkFrame4;
          break;
      }
      offset = directionalOffset * 4;
      break;
    case CharacterAction.MeleeAttack:
      switch (animationFrame) {
        case 0:
          type = ArmorShieldSpriteType.PunchFrame1;
          break;
        case 1:
          type = ArmorShieldSpriteType.PunchFrame2;
          break;
      }
      offset = directionalOffset * 2;
      break;
    case CharacterAction.RangedAttack:
      switch (animationFrame) {
        case 0:
          type = ArmorShieldSpriteType.Bow;
          break;
        case 1:
          type = ArmorShieldSpriteType.Standing;
          break;
      }
      break;
    case CharacterAction.CastingSpell:
      type = ArmorShieldSpriteType.SpellCast;
      break;
  }

  return { type, offset };
}

export function renderCharacterShield(
  character: CharacterMapInfo,
  ctx: CanvasRenderingContext2D,
  animationFrame: number,
  action: CharacterAction,
  layer: 'behind' | 'front',
  _shieldMetadata?: { isShieldOnBack?: boolean },
  weaponMetadata?: { ranged?: boolean },
): void {
  if (character.equipment.shield <= 0) return;

  const isShieldOnBack = isBackShield(character.equipment.shield);

  if (
    !shouldRenderInLayer(
      character,
      action,
      animationFrame,
      layer,
      isShieldOnBack,
    )
  )
    return;

  if (character.sitState !== SitState.Stand && !isShieldOnBack) return;

  const { type, offset } = getShieldSpriteType(
    action,
    animationFrame,
    isShieldOnBack,
    character.direction,
  );

  const gfxFile =
    character.gender === Gender.Female ? GfxType.FemaleBack : GfxType.MaleBack;
  const baseShieldValue = (character.equipment.shield - 1) * 50;
  const gfxNumber = baseShieldValue + type + offset;

  const bmp = getBitmapById(gfxFile, gfxNumber);
  const frame = getFrameById(gfxFile, gfxNumber);

  if (!bmp) return;

  const rect = getCharacterRectangle(character.playerId);
  if (!rect) return;

  let screenX = Math.floor(rect.position.x + rect.width / 2 - frame.w / 2);
  let screenY = Math.floor(rect.position.y + rect.height - frame.h) + 1;

  const additionalOffset = getShieldOffset(
    character,
    action,
    animationFrame,
    isShieldOnBack,
    weaponMetadata,
  );

  screenX += additionalOffset.x;
  screenY += additionalOffset.y;

  let mirrored = [Direction.Right, Direction.Up].includes(character.direction);

  if (isShieldOnBack && character.sitState !== SitState.Stand) {
    if ([Direction.Up, Direction.Left].includes(character.direction)) {
      mirrored = !mirrored;
    }
  }

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
