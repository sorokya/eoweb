import { SfxId } from '../sfx';

export enum EffectAnimationType {
  Static = 0,
  VerticalSliding = 1,
  Position = 2,
  Flickering = 3,
}

type VerticalSlidingEffectMetadata = {
  frameOffsetY: number;
};

type PositionOffsetEffectMetadata = {
  offsetByFrameX: number[];
  offsetByFrameY: number[];
};

type RandomFlickeringEffectMetadata = {
  firstFrame: number;
  lastFrame: number;
};

export class EffectMetadata {
  constructor(
    public hasBehindLayer: boolean,
    public hasTransparentLayer: boolean,
    public hasInFrontLayer: boolean,
    public sfx: number,
    public frames: number,
    public loops: number,
    public offsetX: number,
    public offsetY: number,
    public animationType: EffectAnimationType,
    public verticalMetadata: VerticalSlidingEffectMetadata | null,
    public positionOffsetMetadata: PositionOffsetEffectMetadata | null,
    public randomFlickeringMetadata: RandomFlickeringEffectMetadata | null,
  ) {}
}

export function getEffectMetaData(): Map<number, EffectMetadata> {
  return new Map([
    [
      1,
      new EffectMetadata(
        true,
        true,
        true,
        SfxId.PotionOfFlamesEffect,
        4,
        2,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // small fire
    [
      2,
      new EffectMetadata(
        false,
        false,
        true,
        SfxId.PotionOfLoveEffect,
        4,
        4,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // hearts
    [
      3,
      new EffectMetadata(
        false,
        true,
        true,
        SfxId.AdminWarp,
        8,
        1,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // admin warp
    [
      4,
      new EffectMetadata(
        false,
        false,
        true,
        SfxId.AdminWarp,
        8,
        1,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // admin warp 2
    [
      5,
      new EffectMetadata(
        false,
        false,
        true,
        SfxId.PotionOfFireworksEffect,
        7,
        2,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // celebrate
    [
      6,
      new EffectMetadata(
        false,
        true,
        true,
        SfxId.PotionOfSparklesEffect,
        5,
        1,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // schwing
    [
      7,
      new EffectMetadata(
        true,
        false,
        false,
        SfxId.PotionOfEvilTerrorEffect,
        4,
        4,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // evil
    [
      8,
      new EffectMetadata(
        true,
        false,
        false,
        SfxId.PotionOfEvilTerrorEffect,
        4,
        4,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // terror
    [
      9,
      new EffectMetadata(
        true,
        false,
        false,
        SfxId.Water,
        6,
        1,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // water splash
    [
      10,
      new EffectMetadata(
        false,
        true,
        true,
        SfxId.Heal,
        5,
        1,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // heal
    [
      11,
      new EffectMetadata(
        false,
        false,
        true,
        SfxId.Thunder,
        4,
        2,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // small thunder
    [
      12,
      new EffectMetadata(
        false,
        false,
        true,
        0,
        4,
        8,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // snow
    [
      13,
      new EffectMetadata(
        true,
        true,
        false,
        SfxId.UltimaBlastSpell,
        4,
        3,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // ultima
    [
      14,
      new EffectMetadata(
        true,
        true,
        false,
        SfxId.PotionOfFlamesEffect,
        6,
        1,
        0,
        -160,
        EffectAnimationType.VerticalSliding,
        { frameOffsetY: 30 },
        null,
        null,
      ),
    ], // fire ball
    [
      15,
      new EffectMetadata(
        false,
        true,
        true,
        SfxId.ShieldSpell,
        6,
        1,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // shield
    [
      16,
      new EffectMetadata(
        true,
        false,
        true,
        SfxId.RingOfFireSpell,
        4,
        3,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // ring of fire
    [
      17,
      new EffectMetadata(
        false,
        true,
        true,
        SfxId.IceBlastSpell1,
        7,
        1,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // ice blast
    [
      18,
      new EffectMetadata(
        false,
        false,
        true,
        SfxId.EnergyBallSpell,
        7,
        1,
        0,
        0,
        EffectAnimationType.VerticalSliding,
        { frameOffsetY: -10 },
        null,
        null,
      ),
    ], // energy ball
    [
      19,
      new EffectMetadata(
        true,
        true,
        true,
        SfxId.WhirlSpell,
        4,
        2,
        0,
        -10,
        EffectAnimationType.Position,
        null,
        { offsetByFrameX: [-20, 0, 20, 0], offsetByFrameY: [0, 14, 0, -14] },
        null,
      ),
    ], // whirl / tornado
    [
      20,
      new EffectMetadata(
        false,
        true,
        false,
        SfxId.AuraSpell,
        5,
        3,
        0,
        -12,
        EffectAnimationType.Flickering,
        null,
        null,
        { firstFrame: 3, lastFrame: 4 },
      ),
    ], // aura
    [
      21,
      new EffectMetadata(
        false,
        false,
        true,
        SfxId.BouldersSpell,
        7,
        1,
        0,
        -160,
        EffectAnimationType.VerticalSliding,
        { frameOffsetY: 30 },
        null,
        null,
      ),
    ], // boulders
    [
      22,
      new EffectMetadata(
        true,
        true,
        false,
        SfxId.HeavenSpell,
        5,
        4,
        0,
        -114,
        EffectAnimationType.Flickering,
        null,
        null,
        { firstFrame: 3, lastFrame: 4 },
      ),
    ], // heaven
    [
      23,
      new EffectMetadata(
        true,
        true,
        false,
        SfxId.IceBlastSpell2,
        6,
        1,
        0,
        -160,
        EffectAnimationType.VerticalSliding,
        { frameOffsetY: 30 },
        null,
        null,
      ),
    ], // blue flame
    [
      24,
      new EffectMetadata(
        true,
        true,
        false,
        SfxId.HeavenSpell,
        5,
        4,
        0,
        -114,
        EffectAnimationType.Flickering,
        null,
        null,
        { firstFrame: 3, lastFrame: 4 },
      ),
    ], // dark beam
    [
      25,
      new EffectMetadata(
        false,
        false,
        true,
        SfxId.AdminHide,
        4,
        2,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // admin hide
    [
      26,
      new EffectMetadata(
        true,
        true,
        false,
        SfxId.DarkHandSpell,
        5,
        2,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // dark hand
    [
      27,
      new EffectMetadata(
        true,
        true,
        false,
        SfxId.DarkHandSpell,
        5,
        2,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // dark skull
    [
      28,
      new EffectMetadata(
        false,
        false,
        true,
        SfxId.FireBlastSpell,
        4,
        1,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // fire blast
    [
      29,
      new EffectMetadata(
        false,
        false,
        true,
        SfxId.TentaclesSpell,
        5,
        2,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // tentacles
    [
      30,
      new EffectMetadata(
        true,
        false,
        true,
        SfxId.PowerWindSpell,
        6,
        2,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // power wind
    [
      31,
      new EffectMetadata(
        true,
        false,
        true,
        SfxId.MagicWhirlSpell,
        15,
        1,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // magic whirl
    [
      32,
      new EffectMetadata(
        true,
        true,
        false,
        SfxId.DarkHandSpell,
        6,
        2,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // dark bite
    [
      33,
      new EffectMetadata(
        true,
        true,
        false,
        SfxId.AuraSpell,
        4,
        4,
        0,
        0,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // shell
    [
      34,
      new EffectMetadata(
        true,
        true,
        false,
        SfxId.EnergyBallSpell,
        5,
        1,
        0,
        -44,
        EffectAnimationType.Static,
        null,
        null,
        null,
      ),
    ], // green flame
  ]);
}
