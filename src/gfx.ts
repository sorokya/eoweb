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

const GFX: HTMLImageElement[][] = [];

export function getBitmapById(
  gfxType: GfxType,
  resourceId: number,
): HTMLImageElement | null {
  if (resourceId < 1) {
    return null;
  }

  const gfx = GFX[gfxType];
  if (!gfx) {
    loadBitmapById(gfxType, resourceId);
    return null;
  }

  const bmp = gfx[resourceId];
  if (!bmp) {
    loadBitmapById(gfxType, resourceId);
    return null;
  }

  return bmp;
}

export function loadBitmapById(gfxType: GfxType, resourceId: number) {
  if (GFX[gfxType]?.[resourceId]) {
    return;
  }

  const img = new Image();
  img.src = `/gfx/gfx${padWithZeros(gfxType, 3)}/${resourceId + 100}.png`;
  img.onload = () => {
    if (!GFX[gfxType]) {
      GFX[gfxType] = [];
    }

    GFX[gfxType][resourceId] = img;
  };
}
