// Account & Character
export type { AccountCreateData, CharacterCreateData } from './account';

// Config
export type { IConfig } from './config';

// Equipment
export {
  EquipmentSlot,
  getEquipmentSlotForItemType,
  getEquipmentSlotFromString,
} from './equipment';

// Events
export type { ClientEvents } from './events';

// Game State
export { GameState, PlayerMenuItem, SpellTarget, TradeState } from './game';

// Graphics
export { GfxType } from './gfx';

// Metadata (interfaces)
export type {
  IEffectMetadata,
  INPCMetadata,
  IPositionOffsetEffectMetadata,
  IRandomFlickeringEffectMetadata,
  IShieldMetadata,
  IVerticalSlidingEffectMetadata,
  IWeaponMetadata,
} from './metadata';

// Metadata (enums — re-exported from implementation files)
export { EffectAnimationType, HatMaskType } from './metadata';

// Render
export type { IVector2 } from './render';

// SFX (re-exported from sfx.ts)
export { SfxId } from './sfx';

// UI
export { ChatIcon, ChatTab, DialogIcon, type ISlot, SlotType } from './ui';
