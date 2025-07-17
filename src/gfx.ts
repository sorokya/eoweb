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

interface FrameData {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AtlasData {
  image: HTMLImageElement;
  frames: { [resourceId: number]: FrameData };
}

const GFX_ATLASES: { [gfxType: number]: AtlasData } = {};

export function getBitmapById(
  gfxType: GfxType,
  resourceId: number,
): { image: HTMLImageElement; frame: FrameData } | null {
  if (resourceId < 1) {
    return null;
  }

  const atlas = GFX_ATLASES[gfxType];
  if (!atlas) {
    // Atlas not loaded, cannot return bitmap immediately.
    // PreloadGfx should ensure all necessary atlases are loaded.
    return null;
  }

  const frame = atlas.frames[resourceId];
  if (!frame) {
    return null;
  }

  return { image: atlas.image, frame: frame };
}

// This function now loads the atlas for a given GfxType
export async function loadAtlasForGfxType(gfxType: GfxType): Promise<void> {
  if (GFX_ATLASES[gfxType]) {
    console.log(`Atlas for GfxType ${gfxType} already loaded.`);
    return; // Already loaded
  }

  const paddedGfxType = padWithZeros(gfxType, 3);
  const atlasJsonPath = `/gfx/gfx${paddedGfxType}/atlas.json`;
  const atlasImagePath = `/gfx/gfx${paddedGfxType}/atlas.png`;

  console.log(
    `Attempting to load atlas for GfxType ${gfxType} from ${atlasJsonPath} and ${atlasImagePath}`,
  );

  try {
    const [jsonResponse, imageElement] = await Promise.all([
      fetch(atlasJsonPath),
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => {
          console.error(`Failed to load atlas image ${atlasImagePath}:`, e);
          reject(e);
        };
        img.src = atlasImagePath;
      }),
    ]);

    const atlasData = await jsonResponse.json();
    const framesRaw: { [key: string]: any } = atlasData.frames;
    const parsedFrames: { [resourceId: number]: FrameData } = {};

    for (const key in framesRaw) {
      if (Object.prototype.hasOwnProperty.call(framesRaw, key)) {
        const frameInfo = framesRaw[key];
        const resourceId = Number.parseInt(key, 10); // The key is the resourceId
        parsedFrames[resourceId] = {
          x: frameInfo.frame.x,
          y: frameInfo.frame.y,
          w: frameInfo.frame.w,
          h: frameInfo.frame.h,
        };
      }
    }

    GFX_ATLASES[gfxType] = {
      image: imageElement,
      frames: parsedFrames,
    };
    console.log(
      `Successfully loaded atlas for GfxType ${gfxType}. Total frames: ${Object.keys(parsedFrames).length}`,
    );
  } catch (error) {
    console.error(`Failed to load atlas for GfxType ${gfxType}:`, error);
  }
}

export async function preloadGfx(
  onProgress: (percent: number) => void,
): Promise<void> {
  console.log('Starting preloadGfx...');
  const gfxTypes = Object.values(GfxType)
    .filter((v) => typeof v === 'number')
    .map((v) => v as GfxType);

  const totalAtlases = gfxTypes.length;
  let loadedAtlases = 0;

  const promises: Promise<void>[] = [];

  for (const gfxType of gfxTypes) {
    const promise = loadAtlasForGfxType(gfxType)
      .then(() => {
        loadedAtlases++;
        onProgress(loadedAtlases / totalAtlases);
      })
      .catch((e) => {
        console.error(`Error preloading GfxType ${gfxType}:`, e);
        loadedAtlases++;
        onProgress(loadedAtlases / totalAtlases);
      });
    promises.push(promise);
  }

  await Promise.all(promises);
  console.log('preloadGfx finished.');
}
