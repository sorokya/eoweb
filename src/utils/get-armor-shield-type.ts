export enum ArmorShieldSpriteType {
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

export enum BackShieldId {
  GoodWings = 10,
  Bag = 11,
  NormalArrows = 14,
  FrostArrows = 15,
  FireArrows = 16,
  GoodForceWings = 18,
  FireForceWings = 19,
}

const BACK_SHIELD_IDS = new Set(Object.values(BackShieldId));

export function isBackShield(shieldId: number): boolean {
  return BACK_SHIELD_IDS.has(shieldId);
}
