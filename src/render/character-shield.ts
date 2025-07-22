import { type CharacterMapInfo, Direction, Gender, SitState } from 'eolib';
import { CharacterAction } from '../client';
import { getCharacterRectangle } from '../collision';
import { GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
import type { Vector2 } from '../vector';

enum ShieldSpriteType {
  Standing = 1,
  ShieldItemOnBack_AttackingWithBow = 3,
  WalkFrame1 = 3,
  WalkFrame2 = 4,
  WalkFrame3 = 5,
  WalkFrame4 = 6,
  SpellCast = 11,
  PunchFrame1 = 13,
  PunchFrame2 = 14,
  SitChair = 17,
  SitGround = 19,
  Bow = 21,
}

const SHIELD_METADATA: Record<number, { isShieldOnBack: boolean }> = {
  10: { isShieldOnBack: true },
  11: { isShieldOnBack: true },
  14: { isShieldOnBack: true },
  15: { isShieldOnBack: true },
  16: { isShieldOnBack: true },
  18: { isShieldOnBack: true },
  19: { isShieldOnBack: true },
};

const RANGED_WEAPONS = [42, 43, 58, 73];
const ARROW_IDS = [14, 15, 16];

const BASE_POSITIONS = {
  handheld: {
    [Direction.Up]: { x: 10, y: 5 },
    [Direction.Right]: { x: 10, y: 5 },
    [Direction.Down]: { x: -10, y: 5 },
    [Direction.Left]: { x: -10, y: 5 },
  },
  backMounted: {
    [Direction.Up]: { x: -12, y: -29 },
    [Direction.Right]: { x: -12, y: -29 },
    [Direction.Down]: { x: -10, y: -29 },
    [Direction.Left]: { x: -10, y: -29 },
  },
};

const HANDHELD_ADJUSTMENTS = {
  standing: {
    [Direction.Right]: { x: -15, y: 0 },
    [Direction.Left]: { x: -10, y: 0 },
    [Direction.Up]: { x: -12, y: 0 },
  },
  walking: {
    [Direction.Up]: { x: -10, y: 0 },
    [Direction.Right]: { x: -15, y: 0 },
    [Direction.Down]: { x: 0, y: 0 },
    [Direction.Left]: { x: 0, y: 0 },
  },
};

const ARROW_ADJUSTMENTS = {
  standing: {
    [Direction.Up]: { x: -4, y: -1 },
    [Direction.Left]: { x: -7, y: -1 },
    [Direction.Down]: { x: -7, y: -1 },
    [Direction.Right]: { x: -3, y: -1 },
  },
  walking: {
    [Direction.Up]: { x: 0, y: 0 },
    [Direction.Left]: { x: -3, y: 0 },
    [Direction.Down]: { x: -2, y: 0 },
    [Direction.Right]: { x: -3, y: 0 },
  },
  attacking: {
    [Direction.Up]: { x: -2, y: -1 },
    [Direction.Right]: { x: -4, y: -1 },
    [Direction.Down]: { x: 1, y: -1 },
    [Direction.Left]: { x: 1, y: -1 },
  },
};

const getShieldMetadata = (shieldId: number) =>
  SHIELD_METADATA[shieldId] || { isShieldOnBack: false };
const getBaseOffsetFromDirection = (direction: Direction) =>
  direction === Direction.Down || direction === Direction.Right ? 0 : 1;
const shouldFlipSprite = (direction: Direction) =>
  direction === Direction.Up || direction === Direction.Right;
const isRangedWeapon = (weaponId: number) => RANGED_WEAPONS.includes(weaponId);
const isFacing = (direction: Direction, ...targets: Direction[]) =>
  targets.includes(direction);
const isArrow = (shieldId: number) => ARROW_IDS.includes(shieldId);

const getOffsetBasedOnState = (spriteType: ShieldSpriteType) => {
  if (
    [
      ShieldSpriteType.WalkFrame1,
      ShieldSpriteType.WalkFrame2,
      ShieldSpriteType.WalkFrame3,
      ShieldSpriteType.WalkFrame4,
    ].includes(spriteType)
  )
    return 4;
  if (
    [ShieldSpriteType.PunchFrame1, ShieldSpriteType.PunchFrame2].includes(
      spriteType,
    )
  )
    return 2;
  return 1;
};

const getShieldSpriteType = (
  character: CharacterMapInfo,
  action: CharacterAction,
  animationFrame: number,
  isShieldOnBack: boolean,
): ShieldSpriteType => {
  if (isShieldOnBack) {
    return action === CharacterAction.MeleeAttack ||
      action === CharacterAction.RangedAttack
      ? ShieldSpriteType.ShieldItemOnBack_AttackingWithBow
      : ShieldSpriteType.Standing;
  }

  if (action === CharacterAction.Walking) {
    return [
      ShieldSpriteType.WalkFrame1,
      ShieldSpriteType.WalkFrame2,
      ShieldSpriteType.WalkFrame3,
      ShieldSpriteType.WalkFrame4,
    ][Math.min(animationFrame, 3)];
  }
  if (
    action === CharacterAction.MeleeAttack ||
    action === CharacterAction.RangedAttack
  ) {
    return animationFrame === 0
      ? ShieldSpriteType.PunchFrame1
      : ShieldSpriteType.PunchFrame2;
  }
  if (action === CharacterAction.CastingSpell)
    return ShieldSpriteType.SpellCast;
  if (character.sitState !== SitState.Stand) return ShieldSpriteType.Standing;

  return ShieldSpriteType.Standing;
};

const applyAdjustment = (
  position: Vector2,
  adjustment: { x: number; y: number } | undefined,
) => {
  if (adjustment) {
    position.x += adjustment.x;
    position.y += adjustment.y;
  }
};

const calculateShieldPosition = (
  character: CharacterMapInfo,
  _spriteWidth: number,
  _spriteHeight: number,
  _characterRect: { width: number; height: number },
  action: CharacterAction,
  animationFrame: number,
  isShieldOnBack: boolean,
  isRanged: boolean,
  shieldId: number,
): Vector2 => {
  const { direction, gender } = character;
  const genderOffset = gender === Gender.Male ? 1 : 2;
  const basePos =
    BASE_POSITIONS[isShieldOnBack ? 'backMounted' : 'handheld'][direction];
  const position: Vector2 = { x: basePos.x, y: basePos.y + 10 - genderOffset };

  if (isShieldOnBack) {
    if (isArrow(shieldId)) {
      if (action === CharacterAction.None) {
        applyAdjustment(position, ARROW_ADJUSTMENTS.standing[direction]);
      } else if (action === CharacterAction.Walking) {
        applyAdjustment(position, ARROW_ADJUSTMENTS.walking[direction]);
      } else if (
        (action === CharacterAction.MeleeAttack ||
          action === CharacterAction.RangedAttack) &&
        animationFrame === 1
      ) {
        applyAdjustment(position, ARROW_ADJUSTMENTS.attacking[direction]);
      } else if (
        isRanged &&
        action === CharacterAction.RangedAttack &&
        animationFrame === 0
      ) {
        const factor = isFacing(direction, Direction.Down, Direction.Left)
          ? -1
          : 1;
        position.x += factor * (1 + gender * 2);
      }
    } else {
      if (
        (action === CharacterAction.MeleeAttack ||
          action === CharacterAction.RangedAttack) &&
        animationFrame === 1
      ) {
        position.x += isFacing(direction, Direction.Up, Direction.Right)
          ? 2
          : -2;
      } else if (
        isRanged &&
        action === CharacterAction.RangedAttack &&
        animationFrame === 0
      ) {
        const factor = isFacing(direction, Direction.Down, Direction.Left)
          ? -1
          : 1;
        position.x += factor * (1 + gender * 2);
      }
    }

    if (character.sitState !== SitState.Stand) {
      position.x -= 3;
      const floorSitFactor = character.sitState === SitState.Floor ? 2 : 1;
      if (isFacing(direction, Direction.Right, Direction.Down)) {
        position.y += (9 + gender) * floorSitFactor;
      } else {
        if (character.sitState === SitState.Floor) {
          position.x += direction === Direction.Left ? 2 : -2;
          position.y -= 1;
        }
        position.y += (11 + gender) * floorSitFactor;
      }
    }
  } else {
    if (action === CharacterAction.Walking) {
      applyAdjustment(position, HANDHELD_ADJUSTMENTS.walking[direction]);
    } else if (action === CharacterAction.None) {
      applyAdjustment(position, HANDHELD_ADJUSTMENTS.standing[direction]);
    }

    if (
      action === CharacterAction.MeleeAttack ||
      action === CharacterAction.RangedAttack
    ) {
      const attackFrame = animationFrame + 1;
      if (attackFrame === 2) {
        const frame2Adjustments = {
          [Direction.Down]: { x: -2, y: 0 },
          [Direction.Left]: { x: 2, y: 0 },
          [Direction.Up]: { x: 10, y: 0 },
          [Direction.Right]: { x: 10, y: 0 },
        };
        const adj = frame2Adjustments[direction];
        if (adj) {
          position.x += shouldFlipSprite(direction) ? -adj.x : adj.x;
          position.y += adj.y;
        }
      } else if (attackFrame === 1) {
        const adjustments = isRanged
          ? {
              [Direction.Down]: { x: 4, y: 0 },
              [Direction.Right]: { x: 0, y: 0 },
              [Direction.Up]: { x: -4, y: 0 },
              [Direction.Left]: { x: -4, y: 0 },
            }
          : {
              [Direction.Down]: { x: 0, y: 0 },
              [Direction.Right]: { x: 10, y: 0 },
              [Direction.Up]: { x: 10, y: 0 },
              [Direction.Left]: { x: 0, y: 0 },
            };

        const adj = adjustments[direction];
        if (adj) {
          position.x += shouldFlipSprite(direction) ? -adj.x : adj.x;
          position.y += adj.y;
        }
      }
    }
  }

  return { x: Math.floor(position.x), y: Math.floor(position.y) };
};

const canRenderShield = (
  character: CharacterMapInfo,
  action: CharacterAction,
  shieldId: number,
  hasTexture: boolean,
  isShieldOnBack: boolean,
): boolean =>
  hasTexture &&
  shieldId !== 0 &&
  action !== CharacterAction.CastingSpell &&
  (isShieldOnBack || character.sitState === SitState.Stand) &&
  !(
    action === CharacterAction.MeleeAttack &&
    character.sitState !== SitState.Stand
  );

const shouldRenderBehind = (
  character: CharacterMapInfo,
  isShieldOnBack: boolean,
): boolean =>
  isFacing(character.direction, Direction.Right, Direction.Down) &&
  isShieldOnBack;

export function renderCharacterShield(
  character: CharacterMapInfo,
  ctx: CanvasRenderingContext2D,
  animationFrame: number,
  action: CharacterAction,
  renderPass: 'behind' | 'front' = 'behind',
): void {
  const shieldId = character.equipment.shield - 1;
  if (shieldId < 0) return;

  const metadata = getShieldMetadata(shieldId);
  const spriteType = getShieldSpriteType(
    character,
    action,
    animationFrame,
    metadata.isShieldOnBack,
  );
  const offset = metadata.isShieldOnBack
    ? getBaseOffsetFromDirection(character.direction)
    : getOffsetBasedOnState(spriteType) *
      getBaseOffsetFromDirection(character.direction);

  const baseGfxId = shieldId * 50;
  const finalGfxId = baseGfxId + spriteType + offset;
  const gfxType =
    character.gender === Gender.Female ? GfxType.FemaleBack : GfxType.MaleBack;
  const bitmap = getBitmapById(gfxType, finalGfxId);

  if (
    !canRenderShield(
      character,
      action,
      shieldId,
      !!bitmap,
      metadata.isShieldOnBack,
    )
  )
    return;

  const renderBehind = shouldRenderBehind(character, metadata.isShieldOnBack);
  if (
    (renderPass === 'behind' && !renderBehind) ||
    (renderPass === 'front' && renderBehind)
  )
    return;

  const characterRect = getCharacterRectangle(character.playerId);
  if (!characterRect) return;

  const isRanged = isRangedWeapon(character.equipment.weapon);
  const offset2 = calculateShieldPosition(
    character,
    bitmap.width,
    bitmap.height,
    { width: characterRect.width, height: characterRect.height },
    action,
    animationFrame,
    metadata.isShieldOnBack,
    isRanged,
    shieldId,
  );

  const screenX = Math.floor(characterRect.position.x + offset2.x);
  const screenY = Math.floor(characterRect.position.y + offset2.y);

  const shouldFlip = shouldFlipSprite(character.direction);
  if (shouldFlip) {
    ctx.save();
    ctx.translate(GAME_WIDTH, 0);
    ctx.scale(-1, 1);
  }

  const drawX = shouldFlip
    ? Math.floor(GAME_WIDTH - screenX - bitmap.width)
    : screenX;
  ctx.drawImage(bitmap, drawX, screenY);

  if (shouldFlip) ctx.restore();
}
