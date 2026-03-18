import { GfxLoader } from '../../gfx-loader/gfx-loader';
import { getItemGraphicId } from '../../utils/get-item-graphic-id';

const ITEM_FILE_ID = 23;
const SKILL_FILE_ID = 25;
const URL_CACHE_LIMIT = 500;

const gfxLoader = new GfxLoader();
const urlCache = new Map<string, string>();
const pendingUrls = new Map<string, Promise<string>>();
const elementTokens = new WeakMap<HTMLElement, number>();
let nextToken = 0;

function createElementToken(el: HTMLElement): number {
  const token = ++nextToken;
  elementTokens.set(el, token);
  return token;
}

function isCurrentToken(el: HTMLElement, token: number): boolean {
  return elementTokens.get(el) === token;
}

function touchCachedUrl(cacheKey: string, url: string): void {
  urlCache.delete(cacheKey);
  urlCache.set(cacheKey, url);
}

function addCachedUrl(cacheKey: string, url: string): void {
  if (urlCache.has(cacheKey)) {
    URL.revokeObjectURL(urlCache.get(cacheKey));
  }
  urlCache.set(cacheKey, url);

  while (urlCache.size > URL_CACHE_LIMIT) {
    const oldest = urlCache.entries().next().value as [string, string];
    if (!oldest) break;
    const [oldKey, oldUrl] = oldest;
    URL.revokeObjectURL(oldUrl);
    urlCache.delete(oldKey);
  }
}

async function imageBitmapToObjectUrl(bitmap: ImageBitmap): Promise<string> {
  if ('OffscreenCanvas' in self) {
    const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = offscreen.getContext('2d');
    if (!context) {
      throw new Error('Failed to create offscreen 2D context.');
    }

    context.drawImage(bitmap, 0, 0);
    const blob = await offscreen.convertToBlob({ type: 'image/png' });
    return URL.createObjectURL(blob);
  }

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create canvas 2D context.');
  }

  context.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error('Failed to encode image blob.'));
      }
    }, 'image/png');
  });

  return URL.createObjectURL(blob);
}

async function getResourceUrl(
  fileId: number,
  resourceId: number,
): Promise<string> {
  const cacheKey = `${fileId}:${resourceId}`;

  const cached = urlCache.get(cacheKey);
  if (cached) {
    touchCachedUrl(cacheKey, cached);
    return cached;
  }

  const pending = pendingUrls.get(cacheKey);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    const bitmap = await gfxLoader.loadResource(fileId, resourceId);
    const url = await imageBitmapToObjectUrl(bitmap);
    addCachedUrl(cacheKey, url);
    return url;
  })();

  pendingUrls.set(cacheKey, promise);
  try {
    return await promise;
  } catch (error) {
    console.error(`Failed to load gfx resource ${cacheKey}`, error);
    throw error;
  } finally {
    pendingUrls.delete(cacheKey);
  }
}

export async function setImageFromGfx(
  image: HTMLImageElement,
  fileId: number,
  resourceId: number,
): Promise<void> {
  const token = createElementToken(image);

  try {
    const url = await getResourceUrl(fileId, resourceId);
    if (!isCurrentToken(image, token)) {
      return;
    }
    image.src = url;
  } catch (error) {
    console.error('Failed to set image resource.', error);
  }
}

export async function setBackgroundImageFromGfx(
  el: HTMLElement,
  fileId: number,
  resourceId: number,
): Promise<void> {
  const token = createElementToken(el);

  try {
    const url = await getResourceUrl(fileId, resourceId);
    if (!isCurrentToken(el, token)) {
      return;
    }
    el.style.backgroundImage = `url("${url}")`;
  } catch (error) {
    console.error('Failed to set background image resource.', error);
  }
}

export async function setItemImageFromGfx(
  image: HTMLImageElement,
  itemId: number,
  graphicId: number,
  amount = 1,
): Promise<void> {
  const resourceId = 100 + getItemGraphicId(itemId, graphicId, amount);
  return setImageFromGfx(image, ITEM_FILE_ID, resourceId);
}

export async function setItemGridImageFromGfx(
  image: HTMLImageElement,
  graphicId: number,
): Promise<void> {
  const resourceId = 100 + graphicId * 2;
  return setImageFromGfx(image, ITEM_FILE_ID, resourceId);
}

export async function setSkillBackgroundFromGfx(
  el: HTMLElement,
  iconId: number,
): Promise<void> {
  const resourceId = iconId + 100;
  return setBackgroundImageFromGfx(el, SKILL_FILE_ID, resourceId);
}
