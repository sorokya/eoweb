import { padWithZeros } from './utils/pad-with-zeros';

export enum GfxType {
  PreLoginUI = 1,
  PostLoginUI = 2,
  MapTiles = 3,
  MapObjects = 4,
  MapOverlay = 5,
  MapWalls = 6,
  MapWallTop = 7,
  SkinSprites = 8,
  MaleHair = 9,
  FemaleHair = 10,
  MaleShoes = 11,
  FemaleShoes = 12,
  MaleArmor = 13,
  FemaleArmor = 14,
  MaleHat = 15,
  FemaleHat = 16,
  MaleWeapons = 17,
  FemaleWeapons = 18,
  MaleBack = 19,
  FemaleBack = 20,
  NPC = 21,
  Shadows = 22,
  Items = 23,
  Spells = 24,
  SpellIcons = 25,
}

const GFX: HTMLImageElement[] = [];
const Frames: Map<
  number,
  {
    x: number;
    y: number;
    w: number;
    h: number;
  }
>[] = [];
const Pending: number[] = [];

export function getBitmapById(
  gfxType: GfxType,
  resourceId: number,
): HTMLImageElement | null {
  if (resourceId < 1) {
    return null;
  }

  const bmp = GFX[gfxType];
  if (!bmp) {
    loadBitmapById(gfxType, resourceId);
    return null;
  }

  return bmp;
}

export function getFrameById(
  gfxType: GfxType,
  resourceId: number,
): { x: number; y: number; w: number; h: number } {
  const frame = Frames[gfxType]?.get(resourceId);
  if (frame) {
    return frame;
  }

  return { x: 0, y: 0, w: 0, h: 0 };
}

export function loadBitmapById(gfxType: GfxType, resourceId: number) {
  if (GFX[gfxType] || Pending.includes(gfxType)) {
    return;
  }

  Pending.push(gfxType);

  const img = new Image();
  img.src = `/gfx/gfx${padWithZeros(gfxType, 3)}/atlas.png`;
  img.onload = () => {
    GFX[gfxType] = img;
  };

  if (Frames[gfxType]?.[resourceId]) {
    return;
  }

  fetch(`/gfx/gfx${padWithZeros(gfxType, 3)}/atlas.json`).then((res) => {
    if (!res.ok) {
      throw new Error(`Atlas missing: ${GfxType[gfxType]}`);
    }

    res.json().then((obj) => {
      if (!Frames[gfxType]) {
        Frames[gfxType] = new Map();
      }

      for (const [id, frame] of Object.entries(obj)) {
        // @ts-ignore
        Frames[gfxType].set(Number.parseInt(id, 10), frame);
      }
    });
  });
}
