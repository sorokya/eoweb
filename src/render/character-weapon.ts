import { type CharacterMapInfo, Direction, Gender, SitState } from 'eolib';
import { CharacterAction } from '../client';
import { getCharacterRectangle } from '../collision';
import { GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
import type { Vector2 } from '../vector';

enum WeaponSpriteType {
  Idle = 1,
  Walk1 = 3,
  Walk2 = 4,
  Walk3 = 5,
  Walk4 = 6,
  Casting = 11,
  AttackStart = 13,
  AttackEnd = 14,
  AttackEndSpecial = 17,
  RangedAttack = 18,
}

const RANGED_WEAPONS = [42, 43, 58, 73];

const WEAPON_ADJUSTMENTS = {
  stationary: { ranged: -5 },
  walking: {
    [Direction.Left]: 5,
    [Direction.Up]: -5,
    [Direction.Down]: 5,
    [Direction.Right]: -5,
    verticalOffset: -1,
  },
  meleeAttack: {
    [Direction.Left]: 5,
    [Direction.Up]: -5,
    [Direction.Down]: 5,
    [Direction.Right]: -5,
  },
  rangedAttack: {
    [Direction.Left]: 5,
    [Direction.Up]: -5,
    [Direction.Down]: 5,
    [Direction.Right]: -5,
  },
  attackFrame: { extended: 2, rangedDraw: { downRight: 6, upLeft: 4 } },
  gender: { base: -1, male: -1 },
};

const isFacingDownOrRight = (direction: Direction) =>
  direction === Direction.Down || direction === Direction.Right;
const isFacingDownOrLeft = (direction: Direction) =>
  direction === Direction.Down || direction === Direction.Left;
const isFacingUpOrRight = (direction: Direction) =>
  direction === Direction.Up || direction === Direction.Right;
const isRangedWeapon = (weaponId: number) => RANGED_WEAPONS.includes(weaponId);

const getWeaponSpriteType = (
  action: CharacterAction,
  animationFrame: number,
  direction: Direction,
): WeaponSpriteType => {
  switch (action) {
    case CharacterAction.Walking:
      return WeaponSpriteType.Walk1 + Math.min(animationFrame, 3);
    case CharacterAction.MeleeAttack:
      if (animationFrame === 0) return WeaponSpriteType.AttackStart;
      return isFacingDownOrRight(direction)
        ? WeaponSpriteType.AttackEndSpecial
        : WeaponSpriteType.AttackEnd;
    case CharacterAction.RangedAttack:
      return WeaponSpriteType.RangedAttack;
    default:
      return WeaponSpriteType.Idle;
  }
};

const getOffsetBasedOnState = (type: WeaponSpriteType): number => {
  if (
    [
      WeaponSpriteType.Walk1,
      WeaponSpriteType.Walk2,
      WeaponSpriteType.Walk3,
      WeaponSpriteType.Walk4,
    ].includes(type)
  )
    return 4;
  if ([WeaponSpriteType.AttackStart, WeaponSpriteType.AttackEnd].includes(type))
    return 2;
  return 1;
};

const getBaseOffsetFromDirection = (direction: Direction) =>
  isFacingDownOrRight(direction) ? 0 : 1;

const getWeaponOffsets = (
  character: CharacterMapInfo,
  weaponWidth: number,
  weaponHeight: number,
  parentWidth: number,
  parentHeight: number,
  action: CharacterAction,
  animationFrame: number,
  isRanged: boolean,
): Vector2 => {
  let resX = -Math.floor(Math.abs(weaponWidth - parentWidth) / 2);
  let resY = -Math.floor(Math.abs(weaponHeight - parentHeight) / 2) - 5;

  const factor = isFacingDownOrLeft(character.direction) ? -1 : 1;
  const isDownOrRight = isFacingDownOrRight(character.direction);

  resX += (parentWidth / 1.5 - 3) * factor;

  if (animationFrame === 1) {
    resX += WEAPON_ADJUSTMENTS.attackFrame.extended * factor;
  } else if (animationFrame === 0 && isRanged) {
    const offset = isDownOrRight
      ? WEAPON_ADJUSTMENTS.attackFrame.rangedDraw.downRight
      : WEAPON_ADJUSTMENTS.attackFrame.rangedDraw.upLeft;
    resX += offset * factor;
  }

  if (
    isRanged &&
    action !== CharacterAction.Walking &&
    action !== CharacterAction.MeleeAttack &&
    action !== CharacterAction.RangedAttack
  ) {
    resX += WEAPON_ADJUSTMENTS.stationary.ranged * factor;
  }

  const applyDirectionAdjustment = (adjustments: Record<Direction, number>) => {
    const adjustment = adjustments[character.direction];
    if (adjustment !== undefined) resX += adjustment;
  };

  if (action === CharacterAction.Walking) {
    applyDirectionAdjustment(WEAPON_ADJUSTMENTS.walking);
  } else if (action === CharacterAction.MeleeAttack) {
    applyDirectionAdjustment(WEAPON_ADJUSTMENTS.meleeAttack);
  } else if (action === CharacterAction.RangedAttack) {
    applyDirectionAdjustment(WEAPON_ADJUSTMENTS.rangedAttack);
  }

  resY +=
    WEAPON_ADJUSTMENTS.gender.base +
    (character.gender === Gender.Male ? WEAPON_ADJUSTMENTS.gender.male : 0);

  if (action === CharacterAction.Walking) {
    resY += WEAPON_ADJUSTMENTS.walking.verticalOffset;
  } else if (animationFrame === 0 && isRanged) {
    resY += isDownOrRight ? 1 : 0;
  }

  return { x: resX, y: resY };
};

const shouldWeaponRenderBehind = (
  character: CharacterMapInfo,
  animationFrame: number,
  action: CharacterAction,
): boolean => {
  if (
    action !== CharacterAction.MeleeAttack &&
    action !== CharacterAction.RangedAttack
  )
    return true;
  if (animationFrame === 0) return true;
  return (
    character.direction === Direction.Up ||
    character.direction === Direction.Left
  );
};

const canRenderWeapon = (
  character: CharacterMapInfo,
  action: CharacterAction,
  weaponId: number,
): boolean =>
  weaponId > 0 &&
  character.sitState === SitState.Stand &&
  action !== CharacterAction.CastingSpell;

export function renderCharacterWeapon(
  character: CharacterMapInfo,
  ctx: CanvasRenderingContext2D,
  animationFrame: number,
  action: CharacterAction,
  renderPass: 'behind' | 'front' = 'behind',
): void {
  const weaponId = character.equipment.weapon;
  if (!canRenderWeapon(character, action, weaponId)) return;

  const shouldRenderBehind = shouldWeaponRenderBehind(
    character,
    animationFrame,
    action,
  );
  if (
    (renderPass === 'behind' && !shouldRenderBehind) ||
    (renderPass === 'front' && shouldRenderBehind)
  )
    return;

  const weaponSpriteType = getWeaponSpriteType(
    action,
    animationFrame,
    character.direction,
  );
  const stateOffset =
    getOffsetBasedOnState(weaponSpriteType) *
    getBaseOffsetFromDirection(character.direction);
  const baseGfxId = (weaponId - 1) * 100;
  const finalGfxId = baseGfxId + weaponSpriteType + stateOffset;

  const bmp = getBitmapById(
    character.gender === Gender.Female
      ? GfxType.FemaleWeapons
      : GfxType.MaleWeapons,
    finalGfxId,
  );
  if (!bmp) return;

  const rect = getCharacterRectangle(character.playerId);
  if (!rect) return;

  const isRanged = isRangedWeapon(weaponId);
  const { x: offX, y: offY } = getWeaponOffsets(
    character,
    bmp.width,
    bmp.height,
    rect.width,
    rect.height,
    action,
    animationFrame,
    isRanged,
  );

  const screenX = Math.floor(rect.position.x + offX);
  const screenY = Math.floor(rect.position.y + offY);
  const mirrored = isFacingUpOrRight(character.direction);

  if (mirrored) {
    ctx.save();
    ctx.translate(GAME_WIDTH, 0);
    ctx.scale(-1, 1);
  }

  const drawX = mirrored
    ? Math.floor(GAME_WIDTH - screenX - bmp.width)
    : screenX;
  ctx.drawImage(bmp, drawX, screenY);

  if (mirrored) ctx.restore();
}
