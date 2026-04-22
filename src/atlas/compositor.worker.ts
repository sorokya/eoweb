/**
 * Atlas compositor worker.
 *
 * Composites character sprite frames off the main thread using OffscreenCanvas.
 * Receives raw pixel data from the main thread (cloned, not transferred) and
 * returns composited ImageBitmaps (transferred) with bounds metadata.
 */

import { Gender } from 'eolib';

// ── Constants (mirrored from atlas.ts / consts.ts) ──────────────────────────

const CHARACTER_FRAME_SIZE = 100;
const HALF_CHARACTER_FRAME_SIZE = CHARACTER_FRAME_SIZE >> 1;

const CHARACTER_WIDTH = 18;
const CHARACTER_HEIGHT = 58;
const CHARACTER_WALKING_WIDTH = 26;
const CHARACTER_WALKING_HEIGHT = 61;
const CHARACTER_RAISED_HAND_HEIGHT = 62;
const CHARACTER_SIT_GROUND_WIDTH = 24;
const CHARACTER_SIT_GROUND_HEIGHT = 43;
const CHARACTER_SIT_CHAIR_WIDTH = 24;
const CHARACTER_SIT_CHAIR_HEIGHT = 52;
const CHARACTER_MELEE_ATTACK_WIDTH = 24;
const CHARACTER_RANGE_ATTACK_WIDTH = 25;
const HALF_CHARACTER_FRAME_SIZE_HEIGHT = HALF_CHARACTER_FRAME_SIZE;
const NUMBER_OF_SLASHES = 9;
const TILE_HEIGHT = 32;
const HALF_HALF_TILE_HEIGHT = 8;

// ── Face emote constants ──────────────────────────────────────────────────────

const FACE_EMOTE_WIDTH = 13;
const FACE_EMOTE_HEIGHT = 14;
const FACE_EMOTE_ROWS_PER_GENDER = 7;

// Face patch destination in the 100×100 canvas, derived from the skin sprite
// position. Skin (18×58) lands at (41, 21); face is horizontally centered on
// the skin and sits at the top of the head area (≈2 px from skin top).
const FACE_EMOTE_DEST_X =
  HALF_CHARACTER_FRAME_SIZE -
  (CHARACTER_WIDTH >> 1) +
  ((CHARACTER_WIDTH - FACE_EMOTE_WIDTH) >> 1); // 43
const FACE_EMOTE_DEST_Y =
  HALF_CHARACTER_FRAME_SIZE_HEIGHT - (CHARACTER_HEIGHT >> 1) + 2; // 23

// Face crop region — a fixed rectangle around the face patch with padding.
// Cropped from the composited 100×100 canvas so only the face area is stored.
// +1 height to accommodate the extra 1px male y-offset.
const FACE_CROP_X = FACE_EMOTE_DEST_X;
const FACE_CROP_Y = FACE_EMOTE_DEST_Y;
const FACE_CROP_W = FACE_EMOTE_WIDTH;
const FACE_CROP_H = FACE_EMOTE_HEIGHT;
// Pre-computed offsets for rendering the crop sprite in world space
const FACE_CROP_X_OFFSET = FACE_CROP_X - HALF_CHARACTER_FRAME_SIZE; // -11
const FACE_CROP_Y_OFFSET =
  FACE_CROP_Y - CHARACTER_FRAME_SIZE + TILE_HEIGHT - HALF_HALF_TILE_HEIGHT; // -57
const FACE_CROP_MIRRORED_X_OFFSET =
  HALF_CHARACTER_FRAME_SIZE - (FACE_CROP_X + FACE_CROP_W); // -10
// Only the 11 face emotes have entries; Trade, LevelUp, and Drunk have no face overlay.
const FACE_EMOTE_COLUMN_MAP: Record<number, number> = {
  1: 0, // Happy
  2: 1, // Depressed
  3: 2, // Sad
  4: 3, // Angry
  5: 4, // Confused
  6: 5, // Surprised
  7: 6, // Hearts
  8: 7, // Moon
  9: 8, // Suicidal
  10: 9, // Embarrassed (Shy)
  14: 10, // Playful (visually the "drunk face")
};

// CharacterFrame enum values (must stay in sync with atlas.ts)
const CharacterFrame = {
  StandingDownRight: 0,
  StandingUpLeft: 1,
  WalkingDownRight1: 2,
  WalkingDownRight2: 3,
  WalkingDownRight3: 4,
  WalkingDownRight4: 5,
  WalkingUpLeft1: 6,
  WalkingUpLeft2: 7,
  WalkingUpLeft3: 8,
  WalkingUpLeft4: 9,
  RaisedHandDownRight: 10,
  RaisedHandUpLeft: 11,
  MeleeAttackDownRight1: 12,
  MeleeAttackDownRight2: 13,
  MeleeAttackUpLeft1: 14,
  MeleeAttackUpLeft2: 15,
  ChairDownRight: 16,
  ChairUpLeft: 17,
  FloorDownRight: 18,
  FloorUpLeft: 19,
  RangeAttackDownRight: 20,
  RangeAttackUpLeft: 21,
} as const;

// GfxType enum values (must stay in sync with gfx-type.ts)
const GfxType = {
  PostLoginUI: 2,
  SkinSprites: 8,
  MaleHair: 9,
  FemaleHair: 10,
  MaleShoes: 11,
  FemaleShoes: 12,
  MaleArmor: 13,
  FemaleArmor: 14,
  MaleHat: 15,
  FemaleHat: 16,
  MaleWeapons: 17,
  FemaleWeapons: 18,
  MaleBack: 19,
  FemaleBack: 20,
} as const;

const FRAMES_TO_FRAME_COUNT_MAP: Record<number, number> = {
  [CharacterFrame.StandingDownRight]: 1,
  [CharacterFrame.StandingUpLeft]: 1,
  [CharacterFrame.WalkingDownRight1]: 4,
  [CharacterFrame.WalkingDownRight2]: 4,
  [CharacterFrame.WalkingDownRight3]: 4,
  [CharacterFrame.WalkingDownRight4]: 4,
  [CharacterFrame.WalkingUpLeft1]: 4,
  [CharacterFrame.WalkingUpLeft2]: 4,
  [CharacterFrame.WalkingUpLeft3]: 4,
  [CharacterFrame.WalkingUpLeft4]: 4,
  [CharacterFrame.MeleeAttackDownRight1]: 2,
  [CharacterFrame.MeleeAttackDownRight2]: 2,
  [CharacterFrame.MeleeAttackUpLeft1]: 2,
  [CharacterFrame.MeleeAttackUpLeft2]: 2,
  [CharacterFrame.RaisedHandDownRight]: 1,
  [CharacterFrame.RaisedHandUpLeft]: 1,
  [CharacterFrame.ChairDownRight]: 1,
  [CharacterFrame.ChairUpLeft]: 1,
  [CharacterFrame.FloorDownRight]: 1,
  [CharacterFrame.FloorUpLeft]: 1,
  [CharacterFrame.RangeAttackDownRight]: 1,
  [CharacterFrame.RangeAttackUpLeft]: 1,
};

const FRAME_TO_FRAME_NUMBER_MAP: Record<number, number> = {
  [CharacterFrame.StandingDownRight]: 0,
  [CharacterFrame.StandingUpLeft]: 0,
  [CharacterFrame.WalkingDownRight1]: 0,
  [CharacterFrame.WalkingDownRight2]: 1,
  [CharacterFrame.WalkingDownRight3]: 2,
  [CharacterFrame.WalkingDownRight4]: 3,
  [CharacterFrame.WalkingUpLeft1]: 0,
  [CharacterFrame.WalkingUpLeft2]: 1,
  [CharacterFrame.WalkingUpLeft3]: 2,
  [CharacterFrame.WalkingUpLeft4]: 3,
  [CharacterFrame.MeleeAttackDownRight1]: 0,
  [CharacterFrame.MeleeAttackDownRight2]: 1,
  [CharacterFrame.MeleeAttackUpLeft1]: 0,
  [CharacterFrame.MeleeAttackUpLeft2]: 1,
  [CharacterFrame.RaisedHandDownRight]: 0,
  [CharacterFrame.RaisedHandUpLeft]: 0,
  [CharacterFrame.ChairDownRight]: 0,
  [CharacterFrame.ChairUpLeft]: 0,
  [CharacterFrame.FloorDownRight]: 0,
  [CharacterFrame.FloorUpLeft]: 0,
  [CharacterFrame.RangeAttackDownRight]: 0,
  [CharacterFrame.RangeAttackUpLeft]: 0,
};

const WEAPON_VISIBLE_MAP: Record<number, boolean> = {
  [CharacterFrame.StandingDownRight]: true,
  [CharacterFrame.StandingUpLeft]: true,
  [CharacterFrame.WalkingDownRight1]: true,
  [CharacterFrame.WalkingDownRight2]: true,
  [CharacterFrame.WalkingDownRight3]: true,
  [CharacterFrame.WalkingDownRight4]: true,
  [CharacterFrame.WalkingUpLeft1]: true,
  [CharacterFrame.WalkingUpLeft2]: true,
  [CharacterFrame.WalkingUpLeft3]: true,
  [CharacterFrame.WalkingUpLeft4]: true,
  [CharacterFrame.MeleeAttackDownRight1]: true,
  [CharacterFrame.MeleeAttackDownRight2]: true,
  [CharacterFrame.MeleeAttackUpLeft1]: true,
  [CharacterFrame.MeleeAttackUpLeft2]: true,
  [CharacterFrame.RaisedHandDownRight]: true,
  [CharacterFrame.RaisedHandUpLeft]: true,
  [CharacterFrame.ChairDownRight]: false,
  [CharacterFrame.ChairUpLeft]: false,
  [CharacterFrame.FloorDownRight]: false,
  [CharacterFrame.FloorUpLeft]: false,
  [CharacterFrame.RangeAttackDownRight]: true,
  [CharacterFrame.RangeAttackUpLeft]: true,
};

const WEAPON_FRAME_MAP: Record<number, number> = {
  [CharacterFrame.StandingDownRight]: 0,
  [CharacterFrame.StandingUpLeft]: 1,
  [CharacterFrame.WalkingDownRight1]: 2,
  [CharacterFrame.WalkingDownRight2]: 3,
  [CharacterFrame.WalkingDownRight3]: 4,
  [CharacterFrame.WalkingDownRight4]: 5,
  [CharacterFrame.WalkingUpLeft1]: 6,
  [CharacterFrame.WalkingUpLeft2]: 7,
  [CharacterFrame.WalkingUpLeft3]: 8,
  [CharacterFrame.WalkingUpLeft4]: 9,
  [CharacterFrame.RaisedHandDownRight]: 10,
  [CharacterFrame.RaisedHandUpLeft]: 11,
  [CharacterFrame.MeleeAttackDownRight1]: 12,
  [CharacterFrame.MeleeAttackDownRight2]: 13,
  [CharacterFrame.MeleeAttackUpLeft1]: 14,
  [CharacterFrame.MeleeAttackUpLeft2]: 15,
  [CharacterFrame.RangeAttackDownRight]: 17,
  [CharacterFrame.RangeAttackUpLeft]: 18,
};

const BACK_FRAME_MAP: Record<number, number> = {
  [CharacterFrame.StandingDownRight]: 0,
  [CharacterFrame.StandingUpLeft]: 1,
  [CharacterFrame.WalkingDownRight1]: 0,
  [CharacterFrame.WalkingDownRight2]: 0,
  [CharacterFrame.WalkingDownRight3]: 0,
  [CharacterFrame.WalkingDownRight4]: 0,
  [CharacterFrame.WalkingUpLeft1]: 1,
  [CharacterFrame.WalkingUpLeft2]: 1,
  [CharacterFrame.WalkingUpLeft3]: 1,
  [CharacterFrame.WalkingUpLeft4]: 1,
  [CharacterFrame.RaisedHandDownRight]: 0,
  [CharacterFrame.RaisedHandUpLeft]: 1,
  [CharacterFrame.MeleeAttackDownRight1]: 2,
  [CharacterFrame.MeleeAttackDownRight2]: 2,
  [CharacterFrame.MeleeAttackUpLeft1]: 3,
  [CharacterFrame.MeleeAttackUpLeft2]: 3,
  [CharacterFrame.ChairDownRight]: 0,
  [CharacterFrame.ChairUpLeft]: 1,
  [CharacterFrame.FloorDownRight]: 0,
  [CharacterFrame.FloorUpLeft]: 1,
  [CharacterFrame.RangeAttackDownRight]: 2,
  [CharacterFrame.RangeAttackUpLeft]: 3,
};

const HAIR_OFFSETS: Record<number, Record<number, { x: number; y: number }>> = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: -1, y: -14 },
    [CharacterFrame.StandingUpLeft]: { x: -1, y: -14 },
    [CharacterFrame.WalkingDownRight1]: { x: -1, y: -14 },
    [CharacterFrame.WalkingDownRight2]: { x: -1, y: -14 },
    [CharacterFrame.WalkingDownRight3]: { x: -1, y: -14 },
    [CharacterFrame.WalkingDownRight4]: { x: -1, y: -14 },
    [CharacterFrame.WalkingUpLeft1]: { x: -1, y: -14 },
    [CharacterFrame.WalkingUpLeft2]: { x: -1, y: -14 },
    [CharacterFrame.WalkingUpLeft3]: { x: -1, y: -14 },
    [CharacterFrame.WalkingUpLeft4]: { x: -1, y: -14 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 0, y: -14 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -4, y: -9 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 0, y: -14 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -4, y: -13 },
    [CharacterFrame.RaisedHandDownRight]: { x: -1, y: -12 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -1, y: -12 },
    [CharacterFrame.ChairDownRight]: { x: 1, y: -13 },
    [CharacterFrame.ChairUpLeft]: { x: 2, y: -13 },
    [CharacterFrame.FloorDownRight]: { x: 1, y: -8 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: -8 },
    [CharacterFrame.RangeAttackDownRight]: { x: 5, y: -15 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 3, y: -14 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: -1, y: -15 },
    [CharacterFrame.StandingUpLeft]: { x: -1, y: -15 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: -15 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: -15 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: -15 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: -15 },
    [CharacterFrame.WalkingUpLeft1]: { x: -1, y: -15 },
    [CharacterFrame.WalkingUpLeft2]: { x: -1, y: -15 },
    [CharacterFrame.WalkingUpLeft3]: { x: -1, y: -15 },
    [CharacterFrame.WalkingUpLeft4]: { x: -1, y: -15 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: -15 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -5, y: -11 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: -15 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -3, y: -14 },
    [CharacterFrame.RaisedHandDownRight]: { x: -1, y: -13 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -1, y: -13 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: -12 },
    [CharacterFrame.ChairUpLeft]: { x: 2, y: -12 },
    [CharacterFrame.FloorDownRight]: { x: 2, y: -7 },
    [CharacterFrame.FloorUpLeft]: { x: 4, y: -7 },
    [CharacterFrame.RangeAttackDownRight]: { x: 4, y: -15 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 2, y: -15 },
  },
};

const BOOTS_OFFSETS: Record<
  number,
  Record<number, { x: number; y: number }>
> = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: 21 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: 21 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: 21 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: 21 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: 21 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: 21 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: 21 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: 21 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: 21 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: 20 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: 21 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -1, y: 21 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: 21 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -1, y: 21 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: 23 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: 23 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: 15 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: 8 },
    [CharacterFrame.FloorDownRight]: { x: 1, y: 13 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: 6 },
    [CharacterFrame.RangeAttackDownRight]: { x: 2, y: 21 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 2, y: 21 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: 20 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: 20 },
    [CharacterFrame.WalkingDownRight1]: { x: 1, y: 19 },
    [CharacterFrame.WalkingDownRight2]: { x: 1, y: 19 },
    [CharacterFrame.WalkingDownRight3]: { x: 1, y: 19 },
    [CharacterFrame.WalkingDownRight4]: { x: 1, y: 19 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: 19 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: 19 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: 19 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: 19 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 2, y: 20 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -2, y: 20 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 2, y: 20 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -2, y: 20 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: 22 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: 22 },
    [CharacterFrame.ChairDownRight]: { x: 3, y: 16 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: 9 },
    [CharacterFrame.FloorDownRight]: { x: 3, y: 15 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: 7 },
    [CharacterFrame.RangeAttackDownRight]: { x: 2, y: 20 },
    [CharacterFrame.RangeAttackUpLeft]: { x: -2, y: 20 },
  },
};

const ARMOR_OFFSETS: Record<
  number,
  Record<number, { x: number; y: number }>
> = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: -3 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: -3 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: -4 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: -4 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: -4 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: -4 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: -4 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: -4 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: -4 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: -4 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: -3 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -1, y: -3 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: -3 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -1, y: -3 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: -1 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: -1 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: -8 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: -8 },
    [CharacterFrame.FloorDownRight]: { x: 1, y: -3 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: -3 },
    [CharacterFrame.RangeAttackDownRight]: { x: 1, y: -3 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 1, y: -3 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: -4 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: -4 },
    [CharacterFrame.WalkingDownRight1]: { x: 1, y: -5 },
    [CharacterFrame.WalkingDownRight2]: { x: 1, y: -5 },
    [CharacterFrame.WalkingDownRight3]: { x: 1, y: -5 },
    [CharacterFrame.WalkingDownRight4]: { x: 1, y: -5 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: -5 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: -5 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: -5 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: -5 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 2, y: -4 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -2, y: -4 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 2, y: -4 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -2, y: -4 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: -2 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: -2 },
    [CharacterFrame.ChairDownRight]: { x: 3, y: -7 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: -7 },
    [CharacterFrame.FloorDownRight]: { x: 3, y: -3 },
    [CharacterFrame.FloorUpLeft]: { x: 3, y: -2 },
    [CharacterFrame.RangeAttackDownRight]: { x: 2, y: -4 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 2, y: -4 },
  },
};

const HAT_OFFSETS: Record<number, Record<number, { x: number; y: number }>> = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: 23 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: 23 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: 23 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: 23 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: 23 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: 23 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: 23 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: 23 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: 23 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: 23 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 1, y: 23 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -3, y: 28 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 1, y: 23 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -3, y: 24 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: 25 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: 25 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: 24 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: 24 },
    [CharacterFrame.FloorDownRight]: { x: 2, y: 29 },
    [CharacterFrame.FloorUpLeft]: { x: 4, y: 29 },
    [CharacterFrame.RangeAttackDownRight]: { x: 6, y: 22 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 4, y: 23 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: 22 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: 22 },
    [CharacterFrame.WalkingDownRight1]: { x: 1, y: 22 },
    [CharacterFrame.WalkingDownRight2]: { x: 1, y: 22 },
    [CharacterFrame.WalkingDownRight3]: { x: 1, y: 22 },
    [CharacterFrame.WalkingDownRight4]: { x: 1, y: 22 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: 22 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: 22 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 2, y: 22 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -4, y: 26 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 2, y: 22 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -2, y: 23 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: 24 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: 24 },
    [CharacterFrame.ChairDownRight]: { x: 3, y: 25 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: 25 },
    [CharacterFrame.FloorDownRight]: { x: 3, y: 30 },
    [CharacterFrame.FloorUpLeft]: { x: 5, y: 30 },
    [CharacterFrame.RangeAttackDownRight]: { x: 5, y: 22 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 3, y: 22 },
  },
};

const WEAPON_OFFSETS: Record<
  number,
  Record<number, { x: number; y: number }>
> = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: -9, y: -6 },
    [CharacterFrame.StandingUpLeft]: { x: -9, y: -6 },
    [CharacterFrame.WalkingDownRight1]: { x: -9, y: -7 },
    [CharacterFrame.WalkingDownRight2]: { x: -9, y: -7 },
    [CharacterFrame.WalkingDownRight3]: { x: -9, y: -7 },
    [CharacterFrame.WalkingDownRight4]: { x: -9, y: -7 },
    [CharacterFrame.WalkingUpLeft1]: { x: -9, y: -7 },
    [CharacterFrame.WalkingUpLeft2]: { x: -9, y: -7 },
    [CharacterFrame.WalkingUpLeft3]: { x: -9, y: -7 },
    [CharacterFrame.WalkingUpLeft4]: { x: -9, y: -7 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: -8, y: -6 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -10, y: -6 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: -8, y: -6 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -10, y: -6 },
    [CharacterFrame.RaisedHandDownRight]: { x: -9, y: -4 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -9, y: -4 },
    [CharacterFrame.RangeAttackDownRight]: { x: -8, y: -6 },
    [CharacterFrame.RangeAttackUpLeft]: { x: -8, y: -6 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: -9, y: -7 },
    [CharacterFrame.StandingUpLeft]: { x: -9, y: -7 },
    [CharacterFrame.WalkingDownRight1]: { x: -8, y: -8 },
    [CharacterFrame.WalkingDownRight2]: { x: -8, y: -8 },
    [CharacterFrame.WalkingDownRight3]: { x: -8, y: -8 },
    [CharacterFrame.WalkingDownRight4]: { x: -8, y: -8 },
    [CharacterFrame.WalkingUpLeft1]: { x: -9, y: -8 },
    [CharacterFrame.WalkingUpLeft2]: { x: -9, y: -8 },
    [CharacterFrame.WalkingUpLeft3]: { x: -9, y: -8 },
    [CharacterFrame.WalkingUpLeft4]: { x: -9, y: -8 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: -7, y: -7 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -11, y: -7 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: -7, y: -7 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -11, y: -7 },
    [CharacterFrame.RaisedHandDownRight]: { x: -9, y: -5 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -9, y: -5 },
    [CharacterFrame.RangeAttackDownRight]: { x: -7, y: -7 },
    [CharacterFrame.RangeAttackUpLeft]: { x: -7, y: -7 },
  },
};

const SHIELD_OFFSETS: Record<
  number,
  Record<number, { x: number; y: number }>
> = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: -5, y: 5 },
    [CharacterFrame.StandingUpLeft]: { x: -5, y: 5 },
    [CharacterFrame.WalkingDownRight1]: { x: -5, y: 4 },
    [CharacterFrame.WalkingDownRight2]: { x: -5, y: 4 },
    [CharacterFrame.WalkingDownRight3]: { x: -5, y: 4 },
    [CharacterFrame.WalkingDownRight4]: { x: -5, y: 4 },
    [CharacterFrame.WalkingUpLeft1]: { x: -5, y: 4 },
    [CharacterFrame.WalkingUpLeft2]: { x: -5, y: 4 },
    [CharacterFrame.WalkingUpLeft3]: { x: -5, y: 4 },
    [CharacterFrame.WalkingUpLeft4]: { x: -5, y: 4 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: -4, y: 5 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -6, y: 5 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: -4, y: 5 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -6, y: 5 },
    [CharacterFrame.RaisedHandDownRight]: { x: -5, y: 7 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -5, y: 7 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: -5, y: 4 },
    [CharacterFrame.StandingUpLeft]: { x: -5, y: 4 },
    [CharacterFrame.WalkingDownRight1]: { x: -4, y: 3 },
    [CharacterFrame.WalkingDownRight2]: { x: -4, y: 3 },
    [CharacterFrame.WalkingDownRight3]: { x: -4, y: 3 },
    [CharacterFrame.WalkingDownRight4]: { x: -4, y: 3 },
    [CharacterFrame.WalkingUpLeft1]: { x: -5, y: 3 },
    [CharacterFrame.WalkingUpLeft2]: { x: -5, y: 3 },
    [CharacterFrame.WalkingUpLeft3]: { x: -5, y: 3 },
    [CharacterFrame.WalkingUpLeft4]: { x: -5, y: 3 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: -3, y: 4 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -7, y: 4 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: -3, y: 4 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -7, y: 4 },
    [CharacterFrame.RaisedHandDownRight]: { x: -5, y: 6 },
    [CharacterFrame.RaisedHandUpLeft]: { x: -5, y: 6 },
  },
};

const BACK_OFFSETS: Record<number, Record<number, { x: number; y: number }>> = {
  [Gender.Female]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: -17 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: -17 },
    [CharacterFrame.WalkingDownRight1]: { x: 0, y: -17 },
    [CharacterFrame.WalkingDownRight2]: { x: 0, y: -17 },
    [CharacterFrame.WalkingDownRight3]: { x: 0, y: -17 },
    [CharacterFrame.WalkingDownRight4]: { x: 0, y: -17 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: -17 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: -17 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: -17 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: -17 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 0, y: -17 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: 0, y: -17 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 0, y: -17 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: 0, y: -17 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: -15 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: -15 },
    [CharacterFrame.ChairDownRight]: { x: 2, y: -16 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: -16 },
    [CharacterFrame.FloorDownRight]: { x: 2, y: -11 },
    [CharacterFrame.FloorUpLeft]: { x: 4, y: -11 },
    [CharacterFrame.RangeAttackDownRight]: { x: 1, y: -17 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 1, y: -17 },
  },
  [Gender.Male]: {
    [CharacterFrame.StandingDownRight]: { x: 0, y: -18 },
    [CharacterFrame.StandingUpLeft]: { x: 0, y: -18 },
    [CharacterFrame.WalkingDownRight1]: { x: 1, y: -18 },
    [CharacterFrame.WalkingDownRight2]: { x: 1, y: -18 },
    [CharacterFrame.WalkingDownRight3]: { x: 1, y: -18 },
    [CharacterFrame.WalkingDownRight4]: { x: 1, y: -18 },
    [CharacterFrame.WalkingUpLeft1]: { x: 0, y: -18 },
    [CharacterFrame.WalkingUpLeft2]: { x: 0, y: -18 },
    [CharacterFrame.WalkingUpLeft3]: { x: 0, y: -18 },
    [CharacterFrame.WalkingUpLeft4]: { x: 0, y: -18 },
    [CharacterFrame.MeleeAttackDownRight1]: { x: 2, y: -18 },
    [CharacterFrame.MeleeAttackDownRight2]: { x: -2, y: -18 },
    [CharacterFrame.MeleeAttackUpLeft1]: { x: 2, y: -18 },
    [CharacterFrame.MeleeAttackUpLeft2]: { x: -2, y: -18 },
    [CharacterFrame.RaisedHandDownRight]: { x: 0, y: -16 },
    [CharacterFrame.RaisedHandUpLeft]: { x: 0, y: -16 },
    [CharacterFrame.ChairDownRight]: { x: 3, y: -15 },
    [CharacterFrame.ChairUpLeft]: { x: 3, y: -15 },
    [CharacterFrame.FloorDownRight]: { x: 3, y: -10 },
    [CharacterFrame.FloorUpLeft]: { x: 5, y: -10 },
    [CharacterFrame.RangeAttackDownRight]: { x: 2, y: -18 },
    [CharacterFrame.RangeAttackUpLeft]: { x: 2, y: -18 },
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type RawPixels = {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
};

export type CompositeCharacterSpec = {
  playerId: number;
  gender: number;
  skin: number;
  hairStyle: number;
  hairColor: number;
  equipment: {
    armor: number;
    boots: number;
    hat: number;
    shield: number;
    weapon: number;
  };
  frameIndices: number[];
  /** keyed by "gfxType:graphicId" */
  resources: Record<string, RawPixels>;
};

export type CompositeResult = {
  playerId: number;
  frameIndex: number;
  bitmap: ImageBitmap;
  x: number;
  y: number;
  w: number;
  h: number;
  xOffset: number;
  yOffset: number;
  mirroredXOffset: number;
};

/**
 * A request to compute the tight alpha bounding box of a sprite (or a crop
 * region of a sprite sheet) entirely inside the worker, with no canvas API.
 */
export type BoundsRequest = {
  /** Opaque caller key used to match results back to requests. */
  key: string;
  /** Raw RGBA pixel data for the full bitmap. */
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  /** Optional crop region (defaults to the full bitmap). */
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
  /**
   * When true, also count unique RGB colours and mark the result as blank
   * when ≤2 unique colours are found (NPC / effect blank-frame detection).
   */
  detectBlank?: boolean;
};

export type BoundsResult = {
  key: string;
  /** True when the frame was empty or detected as blank. */
  isBlank: boolean;
  /** Tight bounds within the crop region (crop-relative coords). */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CompositeFaceEmoteSpec = {
  playerId: number;
  emoteId: number;
  gender: number;
  skin: number;
  hairStyle: number;
  hairColor: number;
  armor: number;
  hat: number;
  /** keyed by "gfxType:graphicId" */
  resources: Record<string, RawPixels>;
};

export type FaceEmoteCompositeResult = {
  playerId: number;
  emoteId: number;
  bitmap: ImageBitmap;
  x: number;
  y: number;
  w: number;
  h: number;
  xOffset: number;
  yOffset: number;
  mirroredXOffset: number;
};

type WorkerInitMessage = {
  type: 'INIT';
  hatMetadata: Record<number, number>;
  shieldMetadata: Record<number, boolean>;
  weaponMetadata: Record<number, { slash: number | null }>;
};

type WorkerCompositeMessage = {
  type: 'COMPOSITE';
  requestId: number;
  characters: CompositeCharacterSpec[];
};

type WorkerCompositeFaceEmoteMessage = {
  type: 'COMPOSITE_FACE_EMOTE';
  requestId: number;
  specs: CompositeFaceEmoteSpec[];
};

type WorkerBoundsMessage = {
  type: 'CALCULATE_BOUNDS';
  requestId: number;
  requests: BoundsRequest[];
};

type WorkerMessage =
  | WorkerInitMessage
  | WorkerCompositeMessage
  | WorkerCompositeFaceEmoteMessage
  | WorkerBoundsMessage;

// ── Worker state ──────────────────────────────────────────────────────────────

let hatMetadata: Record<number, number> = {};
let shieldMetadata: Record<number, boolean> = {};
let weaponMetadata: Record<number, { slash: number | null }> = {};

// OffscreenCanvas instances for compositing (reused across requests)
const tmpCanvas = new OffscreenCanvas(
  CHARACTER_FRAME_SIZE,
  CHARACTER_FRAME_SIZE,
);
const tmpCtx = tmpCanvas.getContext('2d')!;
const tmpBehindCanvas = new OffscreenCanvas(
  CHARACTER_FRAME_SIZE,
  CHARACTER_FRAME_SIZE,
);
const tmpBehindCtx = tmpBehindCanvas.getContext('2d')!;
const faceCropCanvas = new OffscreenCanvas(FACE_CROP_W, FACE_CROP_H);
const faceCropCtx = faceCropCanvas.getContext('2d')!;

// In-worker ImageBitmap cache to avoid recreating bitmaps for the same resource
const bitmapCache = new Map<string, ImageBitmap>();

// ── Helper functions ──────────────────────────────────────────────────────────

async function getOrCreateBitmap(
  key: string,
  raw: RawPixels,
): Promise<ImageBitmap> {
  const cached = bitmapCache.get(key);
  if (cached) return cached;
  const imageData = new ImageData(
    new Uint8ClampedArray(raw.pixels),
    raw.width,
    raw.height,
  );
  const bm = await createImageBitmap(imageData);
  bitmapCache.set(key, bm);
  return bm;
}

function getCharacterFrameGraphicId(frame: number): number {
  switch (frame) {
    case CharacterFrame.StandingDownRight:
    case CharacterFrame.StandingUpLeft:
      return 1;
    case CharacterFrame.WalkingDownRight1:
    case CharacterFrame.WalkingDownRight2:
    case CharacterFrame.WalkingDownRight3:
    case CharacterFrame.WalkingDownRight4:
    case CharacterFrame.WalkingUpLeft1:
    case CharacterFrame.WalkingUpLeft2:
    case CharacterFrame.WalkingUpLeft3:
    case CharacterFrame.WalkingUpLeft4:
      return 2;
    case CharacterFrame.MeleeAttackDownRight1:
    case CharacterFrame.MeleeAttackDownRight2:
    case CharacterFrame.MeleeAttackUpLeft1:
    case CharacterFrame.MeleeAttackUpLeft2:
      return 3;
    case CharacterFrame.RaisedHandDownRight:
    case CharacterFrame.RaisedHandUpLeft:
      return 4;
    case CharacterFrame.ChairDownRight:
    case CharacterFrame.ChairUpLeft:
      return 5;
    case CharacterFrame.FloorDownRight:
    case CharacterFrame.FloorUpLeft:
      return 6;
    case CharacterFrame.RangeAttackDownRight:
    case CharacterFrame.RangeAttackUpLeft:
      return 7;
    default:
      throw new Error(`Unknown character frame: ${frame}`);
  }
}

function getCharacterFrameSize(frame: number): { w: number; h: number } {
  switch (frame) {
    case CharacterFrame.StandingDownRight:
    case CharacterFrame.StandingUpLeft:
      return { w: CHARACTER_WIDTH, h: CHARACTER_HEIGHT };
    case CharacterFrame.WalkingDownRight1:
    case CharacterFrame.WalkingDownRight2:
    case CharacterFrame.WalkingDownRight3:
    case CharacterFrame.WalkingDownRight4:
    case CharacterFrame.WalkingUpLeft1:
    case CharacterFrame.WalkingUpLeft2:
    case CharacterFrame.WalkingUpLeft3:
    case CharacterFrame.WalkingUpLeft4:
      return { w: CHARACTER_WALKING_WIDTH, h: CHARACTER_WALKING_HEIGHT };
    case CharacterFrame.MeleeAttackDownRight1:
    case CharacterFrame.MeleeAttackDownRight2:
    case CharacterFrame.MeleeAttackUpLeft1:
    case CharacterFrame.MeleeAttackUpLeft2:
      return { w: CHARACTER_MELEE_ATTACK_WIDTH, h: CHARACTER_HEIGHT };
    case CharacterFrame.RaisedHandDownRight:
    case CharacterFrame.RaisedHandUpLeft:
      return { w: CHARACTER_WIDTH, h: CHARACTER_RAISED_HAND_HEIGHT };
    case CharacterFrame.ChairDownRight:
    case CharacterFrame.ChairUpLeft:
      return { w: CHARACTER_SIT_CHAIR_WIDTH, h: CHARACTER_SIT_CHAIR_HEIGHT };
    case CharacterFrame.FloorDownRight:
    case CharacterFrame.FloorUpLeft:
      return {
        w: CHARACTER_SIT_GROUND_WIDTH,
        h: CHARACTER_SIT_GROUND_HEIGHT,
      };
    case CharacterFrame.RangeAttackDownRight:
    case CharacterFrame.RangeAttackUpLeft:
      return { w: CHARACTER_RANGE_ATTACK_WIDTH, h: CHARACTER_HEIGHT };
    default:
      throw new Error(`Unknown character frame: ${frame}`);
  }
}

function getBmp(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gfxType: number,
  graphicId: number,
): ImageBitmap | undefined {
  const key = `${gfxType}:${graphicId}`;
  return resolvedBitmaps.get(key);
}

/** Mirrors the clipHair() utility from @/utils — replaces black pixels with transparent. */
function clipHair(ctx: OffscreenCanvasRenderingContext2D) {
  const imgData = ctx.getImageData(
    0,
    0,
    CHARACTER_FRAME_SIZE,
    CHARACTER_FRAME_SIZE,
  );
  for (let i = 0; i < imgData.data.length; i += 4) {
    if (
      imgData.data[i] === 0 &&
      imgData.data[i + 1] === 0 &&
      imgData.data[i + 2] === 0
    ) {
      imgData.data[i + 3] = 0;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function drawHairBehind(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gender: number,
  hairStyle: number,
  hairColor: number,
  upLeft: boolean,
  frame: number,
) {
  const baseId = (hairStyle - 1) * 40 + hairColor * 4;
  const graphicId = baseId + 1 + (upLeft ? 2 : 0);
  const gfxType =
    gender === Gender.Female ? GfxType.FemaleHair : GfxType.MaleHair;
  const bmp = getBmp(resolvedBitmaps, gfxType, graphicId);
  if (!bmp) return;
  const offset = HAIR_OFFSETS[gender][frame];
  const destX = Math.floor(
    HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x,
  );
  const destY = Math.floor(
    HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y,
  );
  tmpBehindCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
}

function drawHair(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gender: number,
  hairStyle: number,
  hairColor: number,
  upLeft: boolean,
  frame: number,
) {
  const baseId = (hairStyle - 1) * 40 + hairColor * 4;
  const graphicId = baseId + 2 + (upLeft ? 2 : 0);
  const gfxType =
    gender === Gender.Female ? GfxType.FemaleHair : GfxType.MaleHair;
  const bmp = getBmp(resolvedBitmaps, gfxType, graphicId);
  if (!bmp) return;
  const offset = HAIR_OFFSETS[gender][frame];
  const destX = Math.floor(
    HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x,
  );
  const destY = Math.floor(
    HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y,
  );
  tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
}

function drawSkin(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gender: number,
  skin: number,
  upLeft: boolean,
  size: { w: number; h: number },
  frame: number,
) {
  const bmp = getBmp(
    resolvedBitmaps,
    GfxType.SkinSprites,
    getCharacterFrameGraphicId(frame),
  );
  if (!bmp) return;
  const frameCount = FRAMES_TO_FRAME_COUNT_MAP[frame];
  const frameNumber = FRAME_TO_FRAME_NUMBER_MAP[frame];
  const startX = gender === Gender.Female ? 0 : size.w * frameCount * 2;
  const sourceX =
    startX + (upLeft ? size.w * frameCount : 0) + size.w * frameNumber;
  const sourceY = skin * size.h;
  const destX = HALF_CHARACTER_FRAME_SIZE - (size.w >> 1);
  const destY = HALF_CHARACTER_FRAME_SIZE_HEIGHT - (size.h >> 1);
  tmpCtx.drawImage(
    bmp,
    sourceX,
    sourceY,
    size.w,
    size.h,
    destX,
    destY,
    size.w,
    size.h,
  );
}

function drawBoots(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gender: number,
  boots: number,
  frame: number,
) {
  const baseId = (boots - 1) * 40;
  let graphicId = baseId + frame + 1;
  switch (true) {
    case frame === CharacterFrame.RaisedHandDownRight:
    case frame === CharacterFrame.MeleeAttackDownRight1:
      graphicId = baseId + 1;
      break;
    case frame === CharacterFrame.RaisedHandUpLeft:
    case frame === CharacterFrame.MeleeAttackUpLeft1:
      graphicId = baseId + 2;
      break;
    case frame === CharacterFrame.MeleeAttackDownRight2:
    case frame === CharacterFrame.RangeAttackDownRight:
      graphicId = baseId + 11;
      break;
    case frame === CharacterFrame.MeleeAttackUpLeft2:
    case frame === CharacterFrame.RangeAttackUpLeft:
      graphicId = baseId + 12;
      break;
    case frame === CharacterFrame.ChairDownRight:
      graphicId = baseId + 13;
      break;
    case frame === CharacterFrame.ChairUpLeft:
      graphicId = baseId + 14;
      break;
    case frame === CharacterFrame.FloorDownRight:
      graphicId = baseId + 15;
      break;
    case frame === CharacterFrame.FloorUpLeft:
      graphicId = baseId + 16;
      break;
  }
  const gfxType =
    gender === Gender.Female ? GfxType.FemaleShoes : GfxType.MaleShoes;
  const bmp = getBmp(resolvedBitmaps, gfxType, graphicId);
  if (!bmp) return;
  const offset = BOOTS_OFFSETS[gender][frame];
  const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
  const destY = HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y;
  tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
}

function drawArmor(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gender: number,
  armor: number,
  frame: number,
) {
  const graphicId = (armor - 1) * 50 + frame + 1;
  const gfxType =
    gender === Gender.Female ? GfxType.FemaleArmor : GfxType.MaleArmor;
  const bmp = getBmp(resolvedBitmaps, gfxType, graphicId);
  if (!bmp) return;
  const offset = ARMOR_OFFSETS[gender][frame];
  const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
  const destY = HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y;
  tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
}

function drawHat(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gender: number,
  hat: number,
  frame: number,
  upLeft: boolean,
) {
  const graphicId = (hat - 1) * 10 + (upLeft ? 3 : 1);
  const gfxType =
    gender === Gender.Female ? GfxType.FemaleHat : GfxType.MaleHat;
  const bmp = getBmp(resolvedBitmaps, gfxType, graphicId);
  if (!bmp) return;
  const offset = HAT_OFFSETS[gender][frame];
  const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
  const destY = -(bmp.height >> 1) + offset.y;
  tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
}

function drawWeaponBehind(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gender: number,
  weapon: number,
  frame: number,
) {
  const graphicId = (weapon - 1) * 100 + WEAPON_FRAME_MAP[frame] + 1;
  const gfxType =
    gender === Gender.Female ? GfxType.FemaleWeapons : GfxType.MaleWeapons;
  const bmp = getBmp(resolvedBitmaps, gfxType, graphicId);
  if (!bmp) return;
  const offset = WEAPON_OFFSETS[gender][frame];
  const destX = Math.floor(
    HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x,
  );
  const destY = Math.floor(
    HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y,
  );
  tmpBehindCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
}

function drawWeaponFront(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gender: number,
  weapon: number,
) {
  const graphicId = (weapon - 1) * 100 + 17;
  const gfxType =
    gender === Gender.Female ? GfxType.FemaleWeapons : GfxType.MaleWeapons;
  const bmp = getBmp(resolvedBitmaps, gfxType, graphicId);
  if (!bmp) return;
  const offset = WEAPON_OFFSETS[gender][CharacterFrame.MeleeAttackDownRight2];
  const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
  const destY = HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y;
  tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
}

function drawBack(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gender: number,
  back: number,
  frame: number,
  behind: boolean,
) {
  const graphicId = (back - 1) * 50 + BACK_FRAME_MAP[frame] + 1;
  const gfxType =
    gender === Gender.Female ? GfxType.FemaleBack : GfxType.MaleBack;
  const bmp = getBmp(resolvedBitmaps, gfxType, graphicId);
  if (!bmp) return;
  const offset = BACK_OFFSETS[gender][frame];
  const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
  const destY = HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y;
  if (behind) {
    tmpBehindCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
  } else {
    tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
  }
}

function drawShield(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gender: number,
  shield: number,
  frame: number,
) {
  const graphicId = (shield - 1) * 50 + frame + 1;
  const gfxType =
    gender === Gender.Female ? GfxType.FemaleBack : GfxType.MaleBack;
  const bmp = getBmp(resolvedBitmaps, gfxType, graphicId);
  if (!bmp) return;
  const offset = SHIELD_OFFSETS[gender][frame];
  const destX = HALF_CHARACTER_FRAME_SIZE - (bmp.width >> 1) + offset.x;
  const destY = HALF_CHARACTER_FRAME_SIZE - (bmp.height >> 1) + offset.y;
  tmpCtx.drawImage(bmp, destX, destY, bmp.width, bmp.height);
}

function drawSlash(
  resolvedBitmaps: Map<string, ImageBitmap>,
  gender: number,
  slashIndex: number,
  frame: number,
) {
  const bmp = getBmp(resolvedBitmaps, GfxType.PostLoginUI, 40);
  if (!bmp) return;
  const frameWidth = Math.floor(bmp.width / 4);
  const frameHeight = Math.floor(bmp.height / NUMBER_OF_SLASHES);
  const sourceX =
    (frame === CharacterFrame.MeleeAttackDownRight2 ? 0 : 1) * frameWidth;
  const sourceY = slashIndex * frameHeight;
  const destX = Math.floor(
    HALF_CHARACTER_FRAME_SIZE -
      (frameWidth >> 1) +
      (frame === CharacterFrame.MeleeAttackDownRight2 ? -9 : -13) +
      (gender === Gender.Female ? 0 : -1),
  );
  const destY = Math.floor(
    HALF_CHARACTER_FRAME_SIZE -
      (frameHeight >> 1) +
      (frame === CharacterFrame.MeleeAttackDownRight2 ? 4 : -9) +
      (gender === Gender.Female ? 0 : -1),
  );
  tmpCtx.globalAlpha = 0.4;
  tmpCtx.drawImage(
    bmp,
    sourceX,
    sourceY,
    frameWidth,
    frameHeight,
    destX,
    destY,
    frameWidth,
    frameHeight,
  );
  tmpCtx.globalAlpha = 1.0;
}

// HatMaskType enum values (must stay in sync with utils/get-hat-metadata.ts)
const HatMaskType = { Standard: 0, FaceMask: 1, HideHair: 2 } as const;

async function compositeCharacter(
  spec: CompositeCharacterSpec,
): Promise<CompositeResult[]> {
  const {
    gender,
    skin,
    hairStyle,
    hairColor,
    equipment,
    frameIndices,
    resources,
  } = spec;

  // Pre-resolve all needed ImageBitmaps in parallel
  const resolvedBitmaps = new Map<string, ImageBitmap>();
  const bitmapPromises: Promise<void>[] = [];
  for (const [key, raw] of Object.entries(resources)) {
    bitmapPromises.push(
      getOrCreateBitmap(key, raw).then((bm) => {
        resolvedBitmaps.set(key, bm);
      }),
    );
  }
  await Promise.all(bitmapPromises);

  const results: CompositeResult[] = [];
  const maskType: number = hatMetadata[equipment.hat] ?? HatMaskType.Standard;
  const shieldBack: boolean = shieldMetadata[equipment.shield] ?? false;
  const weaponSlash = weaponMetadata[equipment.weapon]?.slash ?? null;

  const upLeftFrames: Set<number> = new Set([
    CharacterFrame.StandingUpLeft,
    CharacterFrame.WalkingUpLeft1,
    CharacterFrame.WalkingUpLeft2,
    CharacterFrame.WalkingUpLeft3,
    CharacterFrame.WalkingUpLeft4,
    CharacterFrame.MeleeAttackUpLeft1,
    CharacterFrame.MeleeAttackUpLeft2,
    CharacterFrame.RaisedHandUpLeft,
    CharacterFrame.ChairUpLeft,
    CharacterFrame.FloorUpLeft,
    CharacterFrame.RangeAttackUpLeft,
  ]);

  for (const index of frameIndices) {
    tmpCtx.clearRect(0, 0, CHARACTER_FRAME_SIZE, CHARACTER_FRAME_SIZE);
    tmpBehindCtx.clearRect(0, 0, CHARACTER_FRAME_SIZE, CHARACTER_FRAME_SIZE);

    const weaponVisible = WEAPON_VISIBLE_MAP[index] ?? false;
    const upLeft = upLeftFrames.has(index);

    // Back item (shield with back=true, not upLeft direction)
    if (equipment.shield && !upLeft) {
      if (shieldBack) {
        drawBack(resolvedBitmaps, gender, equipment.shield, index, true);
      }
    }

    // Weapon behind
    if (equipment.weapon && weaponVisible) {
      drawWeaponBehind(resolvedBitmaps, gender, equipment.weapon, index);
    }

    // Hair behind
    if (maskType !== HatMaskType.HideHair && hairStyle) {
      drawHairBehind(
        resolvedBitmaps,
        gender,
        hairStyle,
        hairColor,
        upLeft,
        index,
      );
    }

    // Skin
    const skinSize = getCharacterFrameSize(index);
    drawSkin(resolvedBitmaps, gender, skin, upLeft, skinSize, index);

    // Boots
    if (equipment.boots) {
      drawBoots(resolvedBitmaps, gender, equipment.boots, index);
    }

    // Armor
    if (equipment.armor) {
      drawArmor(resolvedBitmaps, gender, equipment.armor, index);
    }

    // Hat (face mask first pass)
    if (maskType === HatMaskType.FaceMask && equipment.hat) {
      drawHat(resolvedBitmaps, gender, equipment.hat, index, upLeft);
    }

    // Hair front
    if (maskType !== HatMaskType.HideHair && hairStyle) {
      drawHair(resolvedBitmaps, gender, hairStyle, hairColor, upLeft, index);
    }

    // Hat (non-face-mask)
    if (maskType !== HatMaskType.FaceMask && equipment.hat) {
      drawHat(resolvedBitmaps, gender, equipment.hat, index, upLeft);
    }

    // Shield / back (front side)
    if (equipment.shield) {
      if (!shieldBack && weaponVisible) {
        drawShield(resolvedBitmaps, gender, equipment.shield, index);
      } else if (shieldBack && upLeft) {
        drawBack(resolvedBitmaps, gender, equipment.shield, index, false);
      }
    }

    // Weapon front (melee attack frame 2)
    if (equipment.weapon && index === CharacterFrame.MeleeAttackDownRight2) {
      drawWeaponFront(resolvedBitmaps, gender, equipment.weapon);
    }

    clipHair(tmpCtx);

    // Slash effect
    if (
      equipment.weapon &&
      weaponSlash !== null &&
      (index === CharacterFrame.MeleeAttackDownRight2 ||
        index === CharacterFrame.MeleeAttackUpLeft2)
    ) {
      drawSlash(resolvedBitmaps, gender, weaponSlash, index);
    }

    // Composite tmpBehindCtx + tmpCtx into tmpBehindCtx for final bounds scan
    tmpBehindCtx.drawImage(
      tmpCanvas,
      0,
      0,
      CHARACTER_FRAME_SIZE,
      CHARACTER_FRAME_SIZE,
    );

    // Compute tight bounds
    const imgData = tmpBehindCtx.getImageData(
      0,
      0,
      CHARACTER_FRAME_SIZE,
      CHARACTER_FRAME_SIZE,
    );
    const frameBounds = {
      x: CHARACTER_FRAME_SIZE,
      y: CHARACTER_FRAME_SIZE,
      maxX: 0,
      maxY: 0,
    };
    for (let y = 0; y < CHARACTER_FRAME_SIZE; ++y) {
      for (let x = 0; x < CHARACTER_FRAME_SIZE; ++x) {
        const alpha = imgData.data[(y * CHARACTER_FRAME_SIZE + x) * 4 + 3];
        if (alpha !== 0) {
          if (x < frameBounds.x) frameBounds.x = x;
          if (y < frameBounds.y) frameBounds.y = y;
          if (x > frameBounds.maxX) frameBounds.maxX = x;
          if (y > frameBounds.maxY) frameBounds.maxY = y;
        }
      }
    }

    const w = frameBounds.maxX - frameBounds.x + 1;
    const h = frameBounds.maxY - frameBounds.y + 1;
    const xOffset = frameBounds.x - HALF_CHARACTER_FRAME_SIZE;
    const yOffset =
      frameBounds.y -
      CHARACTER_FRAME_SIZE +
      TILE_HEIGHT -
      HALF_HALF_TILE_HEIGHT;
    const mirroredXOffset = HALF_CHARACTER_FRAME_SIZE - (frameBounds.x + w);

    // Transfer the composited bitmap
    const bitmap = tmpBehindCanvas.transferToImageBitmap();

    // Clear the behind canvas so it's ready for the next frame (transferToImageBitmap detaches)
    tmpBehindCanvas.width = CHARACTER_FRAME_SIZE;
    tmpBehindCanvas.height = CHARACTER_FRAME_SIZE;

    results.push({
      playerId: spec.playerId,
      frameIndex: index,
      bitmap,
      x: frameBounds.x,
      y: frameBounds.y,
      w,
      h,
      xOffset,
      yOffset,
      mirroredXOffset,
    });
  }

  return results;
}

// ── Face emote compositing ────────────────────────────────────────────────────

function drawEmoteFace(
  ctx: OffscreenCanvasRenderingContext2D,
  faceSheetBitmap: ImageBitmap,
  gender: number,
  skin: number,
  emoteColumnIndex: number,
) {
  const sourceX = emoteColumnIndex * FACE_EMOTE_WIDTH;
  const sourceY =
    (gender === Gender.Male ? FACE_EMOTE_ROWS_PER_GENDER : 0) *
      FACE_EMOTE_HEIGHT +
    skin * FACE_EMOTE_HEIGHT;
  const yExtra = gender === Gender.Male ? -2 : 0;
  ctx.drawImage(
    faceSheetBitmap,
    sourceX,
    sourceY,
    FACE_EMOTE_WIDTH,
    FACE_EMOTE_HEIGHT,
    FACE_EMOTE_DEST_X,
    FACE_EMOTE_DEST_Y + yExtra,
    FACE_EMOTE_WIDTH,
    FACE_EMOTE_HEIGHT,
  );
}

async function compositeEmoteFace(
  spec: CompositeFaceEmoteSpec,
): Promise<FaceEmoteCompositeResult | null> {
  const {
    playerId,
    emoteId,
    gender,
    skin,
    hairStyle,
    hairColor,
    armor,
    hat,
    resources,
  } = spec;

  const columnIndex = FACE_EMOTE_COLUMN_MAP[emoteId];
  if (columnIndex === undefined) return null;

  const resolvedBitmaps = new Map<string, ImageBitmap>();
  const bitmapPromises: Promise<void>[] = [];
  for (const [key, raw] of Object.entries(resources)) {
    bitmapPromises.push(
      getOrCreateBitmap(key, raw).then((bm) => {
        resolvedBitmaps.set(key, bm);
      }),
    );
  }
  await Promise.all(bitmapPromises);

  const faceSheetBitmap = resolvedBitmaps.get(`${GfxType.SkinSprites}:8`);
  if (!faceSheetBitmap) return null;

  tmpCtx.clearRect(0, 0, CHARACTER_FRAME_SIZE, CHARACTER_FRAME_SIZE);
  tmpBehindCtx.clearRect(0, 0, CHARACTER_FRAME_SIZE, CHARACTER_FRAME_SIZE);

  const maskType: number = hatMetadata[hat] ?? HatMaskType.Standard;
  const upLeft = false; // face emotes only show for DownRight direction

  // Hair behind (to tmpBehindCtx)
  if (maskType !== HatMaskType.HideHair && hairStyle) {
    drawHairBehind(
      resolvedBitmaps,
      gender,
      hairStyle,
      hairColor,
      upLeft,
      CharacterFrame.StandingDownRight,
    );
  }

  // Face patch drawn directly to tmpBehindCtx (on top of hair_behind) so that
  // clipHair() — which erases pure-black pixels from tmpCtx — cannot destroy
  // the expression's black outline/pupil pixels.
  drawEmoteFace(tmpBehindCtx, faceSheetBitmap, gender, skin, columnIndex);

  if (armor) {
    drawArmor(resolvedBitmaps, gender, armor, CharacterFrame.StandingDownRight);
  }

  // Hat (face mask first pass)
  if (maskType === HatMaskType.FaceMask && hat) {
    drawHat(
      resolvedBitmaps,
      gender,
      hat,
      CharacterFrame.StandingDownRight,
      upLeft,
    );
  }

  // Hair front + hat drawn to tmpCtx so they sit above armor and face patch after merge
  if (maskType !== HatMaskType.HideHair && hairStyle) {
    drawHair(
      resolvedBitmaps,
      gender,
      hairStyle,
      hairColor,
      upLeft,
      CharacterFrame.StandingDownRight,
    );
  }

  if (maskType !== HatMaskType.FaceMask && hat) {
    drawHat(
      resolvedBitmaps,
      gender,
      hat,
      CharacterFrame.StandingDownRight,
      upLeft,
    );
  }

  clipHair(tmpCtx);

  // Merge front canvas on top of behind canvas (same as compositeCharacter)
  tmpBehindCtx.drawImage(
    tmpCanvas,
    0,
    0,
    CHARACTER_FRAME_SIZE,
    CHARACTER_FRAME_SIZE,
  );

  // Slice the face region out of the composited 100×100 canvas
  faceCropCtx.clearRect(0, 0, FACE_CROP_W, FACE_CROP_H);
  faceCropCtx.drawImage(
    tmpBehindCanvas,
    FACE_CROP_X,
    FACE_CROP_Y,
    FACE_CROP_W,
    FACE_CROP_H,
    0,
    0,
    FACE_CROP_W,
    FACE_CROP_H,
  );

  // Clear the work canvases for the next compositor call
  tmpBehindCanvas.width = CHARACTER_FRAME_SIZE;
  tmpBehindCanvas.height = CHARACTER_FRAME_SIZE;

  const bitmap = faceCropCanvas.transferToImageBitmap();
  faceCropCanvas.width = FACE_CROP_W;
  faceCropCanvas.height = FACE_CROP_H;

  return {
    playerId,
    emoteId,
    bitmap,
    x: 0,
    y: 0,
    w: FACE_CROP_W,
    h: FACE_CROP_H,
    xOffset: FACE_CROP_X_OFFSET,
    yOffset: FACE_CROP_Y_OFFSET + (gender === Gender.Male ? 1 : 0),
    mirroredXOffset: FACE_CROP_MIRRORED_X_OFFSET,
  };
}

// ── Bounds calculation ────────────────────────────────────────────────────────

function calculateBoundsInWorker(req: BoundsRequest): BoundsResult {
  const { pixels, width } = req;
  const cropX = req.cropX ?? 0;
  const cropY = req.cropY ?? 0;
  const cropW = req.cropW ?? req.width;
  const cropH = req.cropH ?? req.height;

  let minX = cropW;
  let minY = cropH;
  let maxX = 0;
  let maxY = 0;

  const colors: Set<number> = req.detectBlank
    ? new Set()
    : (null as unknown as Set<number>);

  for (let y = 0; y < cropH; ++y) {
    const srcY = cropY + y;
    for (let x = 0; x < cropW; ++x) {
      const base = (srcY * width + (cropX + x)) * 4;
      if (colors) {
        colors.add(
          (pixels[base] << 16) | (pixels[base + 1] << 8) | pixels[base + 2],
        );
      }
      if (pixels[base + 3] !== 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const isBlank = req.detectBlank
    ? colors.size <= 2 || maxX === 0
    : minX > maxX;

  if (isBlank) {
    return { key: req.key, isBlank: true, x: 0, y: 0, w: 0, h: 0 };
  }

  return {
    key: req.key,
    isBlank: false,
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const data = event.data;

  switch (data.type) {
    case 'INIT': {
      hatMetadata = data.hatMetadata;
      shieldMetadata = data.shieldMetadata;
      weaponMetadata = data.weaponMetadata;
      break;
    }

    case 'COMPOSITE': {
      const { requestId, characters } = data;

      const allResults: CompositeResult[] = [];
      const transferables: Transferable[] = [];

      for (const spec of characters) {
        const results = await compositeCharacter(spec);
        for (const result of results) {
          allResults.push(result);
          transferables.push(result.bitmap);
        }
      }

      (self as unknown as Worker).postMessage(
        { type: 'COMPOSITE_RESULT', requestId, results: allResults },
        transferables,
      );
      break;
    }

    case 'COMPOSITE_FACE_EMOTE': {
      const { requestId, specs } = data;

      const allResults: FaceEmoteCompositeResult[] = [];
      const transferables: Transferable[] = [];

      for (const spec of specs) {
        const result = await compositeEmoteFace(spec);
        if (result) {
          allResults.push(result);
          transferables.push(result.bitmap);
        }
      }

      (self as unknown as Worker).postMessage(
        { type: 'FACE_EMOTE_RESULT', requestId, results: allResults },
        transferables,
      );
      break;
    }

    case 'CALCULATE_BOUNDS': {
      const { requestId, requests } = data;
      const results: BoundsResult[] = requests.map(calculateBoundsInWorker);
      (self as unknown as Worker).postMessage({
        type: 'BOUNDS_RESULT',
        requestId,
        results,
      });
      break;
    }
  }
};
