// Account & Character
export type { AccountCreateData, CharacterCreateData } from './account';

// Chat
export { ChatIcon, ChatTab } from './chat';

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
export { GameState, PlayerMenuItem, SpellTarget } from './game';

// Graphics
export { GfxType } from './gfx';

// Input
export { Input } from './input';

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

// UI (interfaces)
export type { ISlot } from './ui';

// UI (enums — re-exported from implementation files)
export { DialogIcon, SlotType } from './ui';
