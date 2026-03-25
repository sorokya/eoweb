import type { EffectAnimationType } from '../utils/get-effect-metadata';
import type { SfxId } from './sfx';

export { EffectAnimationType } from '../utils/get-effect-metadata';
export { HatMaskType } from '../utils/get-hat-metadata';

export interface IVerticalSlidingEffectMetadata {
  frameOffsetY: number;
}

export interface IPositionOffsetEffectMetadata {
  offsetByFrameX: number[];
  offsetByFrameY: number[];
}

export interface IRandomFlickeringEffectMetadata {
  firstFrame: number;
  lastFrame: number;
}

export interface INPCMetadata {
  xOffset: number;
  yOffset: number;
  xOffsetAttack: number;
  yOffsetAttack: number;
  animatedStanding: boolean;
  nameLabelOffset: number;
  transparent?: boolean;
}

export interface IWeaponMetadata {
  slash: number | null;
  sfx: SfxId[];
  ranged: boolean;
}

export interface IShieldMetadata {
  back: boolean;
}

export interface IEffectMetadata {
  hasBehindLayer: boolean;
  hasTransparentLayer: boolean;
  hasInFrontLayer: boolean;
  sfx: number;
  frames: number;
  loops: number;
  offsetX: number;
  offsetY: number;
  animationType: EffectAnimationType;
  verticalMetadata: IVerticalSlidingEffectMetadata | null;
  positionOffsetMetadata: IPositionOffsetEffectMetadata | null;
  randomFlickeringMetadata: IRandomFlickeringEffectMetadata | null;
}
