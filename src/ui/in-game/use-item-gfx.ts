import { useEffect, useState } from 'preact/hooks';
import { GfxType } from '@/gfx';
import { useClient } from '@/ui/context';

// ---------------------------------------------------------------------------
// Item icon URL cache
// ---------------------------------------------------------------------------

/**
 * Module-level cache mapping graphicId → object URL.
 * By default loads the "main" item frame (100 + graphicId * 2), matching
 * item-icon.tsx. Pass `shadow: true` to load the shadow/inventory frame
 * (100 + graphicId * 2 - 1), used by the hotbar.
 */
const itemUrlCache = new Map<string, string>();

function itemCacheKey(graphicId: number, shadow: boolean): string {
  return `${graphicId}:${shadow ? 's' : 'm'}`;
}

async function loadItemGfxUrl(
  gfxLoader: {
    loadResource(fileId: number, resourceId: number): Promise<ImageBitmap>;
  },
  graphicId: number,
  shadow: boolean,
): Promise<string> {
  const key = itemCacheKey(graphicId, shadow);
  const cached = itemUrlCache.get(key);
  if (cached) return cached;

  const resourceId = shadow ? 100 + graphicId * 2 - 1 : 100 + graphicId * 2;

  const bitmap = await gfxLoader.loadResource(GfxType.Items, resourceId);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const url = URL.createObjectURL(blob);
  itemUrlCache.set(key, url);
  return url;
}

// ---------------------------------------------------------------------------
// Raw resource URL (loads GfxType.Items at an exact resource ID)
// ---------------------------------------------------------------------------

const rawItemUrlCache = new Map<number, string>();

async function loadRawItemGfxUrl(
  gfxLoader: {
    loadResource(fileId: number, resourceId: number): Promise<ImageBitmap>;
  },
  resourceId: number,
): Promise<string> {
  const cached = rawItemUrlCache.get(resourceId);
  if (cached) return cached;

  const bitmap = await gfxLoader.loadResource(GfxType.Items, resourceId);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const url = URL.createObjectURL(blob);
  rawItemUrlCache.set(resourceId, url);
  return url;
}

/** Returns an object URL for a raw GfxType.Items resource ID, or null while loading. */
export function useRawItemGfxUrl(resourceId: number | null): string | null {
  const client = useClient();
  const [url, setUrl] = useState<string | null>(() =>
    resourceId !== null ? (rawItemUrlCache.get(resourceId) ?? null) : null,
  );

  useEffect(() => {
    if (resourceId === null) {
      setUrl(null);
      return;
    }
    const cached = rawItemUrlCache.get(resourceId);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    loadRawItemGfxUrl(client.gfxLoader, resourceId).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [client, resourceId]);

  return url;
}

type ItemGfxOptions = {
  /** Load the shadow/inventory frame instead of the main item frame. Default: false. */
  shadow?: boolean;
};

/** Returns an object URL for the item's gfx sprite, or null while loading. */
export function useItemGfxUrl(
  graphicId: number | null,
  { shadow = false }: ItemGfxOptions = {},
): string | null {
  const client = useClient();
  const [url, setUrl] = useState<string | null>(() =>
    graphicId !== null
      ? (itemUrlCache.get(itemCacheKey(graphicId, shadow)) ?? null)
      : null,
  );

  useEffect(() => {
    if (graphicId === null) {
      setUrl(null);
      return;
    }
    const cached = itemUrlCache.get(itemCacheKey(graphicId, shadow));
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    loadItemGfxUrl(client.gfxLoader, graphicId, shadow).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [client, graphicId, shadow]);

  return url;
}

// ---------------------------------------------------------------------------
// Pillow (inventory slot background) URL
// ---------------------------------------------------------------------------

let pillowUrl: string | null = null;

async function loadPillowGfxUrl(gfxLoader: {
  loadResource(fileId: number, resourceId: number): Promise<ImageBitmap>;
}): Promise<string> {
  if (pillowUrl) return pillowUrl;
  const bitmap = await gfxLoader.loadResource(GfxType.MapTiles, 100);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const url = URL.createObjectURL(blob);
  pillowUrl = url;
  return url;
}

/** Returns an object URL for the inventory slot pillow background, or null while loading. */
export function usePillowGfxUrl(): string | null {
  const client = useClient();
  const [url, setUrl] = useState<string | null>(() => pillowUrl);
  useEffect(() => {
    if (url) return;
    let cancelled = false;
    loadPillowGfxUrl(client.gfxLoader).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [client, url]);
  return url;
}
