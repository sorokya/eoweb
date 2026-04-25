import { useEffect, useState } from 'preact/hooks';
import { GfxType } from '@/gfx';
import { useClient } from '@/ui/context';

// ---------------------------------------------------------------------------
// Spell icon URL cache
// Spell icons are stored as sprite sheets with two 34×32 frames side-by-side:
//   left  (x=0)  = normal frame
//   right (x=34) = active frame
// ---------------------------------------------------------------------------

const SPELL_FRAME_W = 34;
const SPELL_FRAME_H = 32;

type SpellIconUrls = { normal: string; active: string };

const spellIconCache = new Map<number, SpellIconUrls>();

async function loadSpellIconUrls(
  gfxLoader: {
    loadResource(fileId: number, resourceId: number): Promise<ImageBitmap>;
  },
  iconId: number,
): Promise<SpellIconUrls> {
  const cached = spellIconCache.get(iconId);
  if (cached) return cached;

  const bitmap = await gfxLoader.loadResource(GfxType.SpellIcons, iconId + 100);

  async function extractFrame(x: number): Promise<string> {
    const canvas = new OffscreenCanvas(SPELL_FRAME_W, SPELL_FRAME_H);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      bitmap,
      x,
      0,
      SPELL_FRAME_W,
      SPELL_FRAME_H,
      0,
      0,
      SPELL_FRAME_W,
      SPELL_FRAME_H,
    );
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return URL.createObjectURL(blob);
  }

  const [normal, active] = await Promise.all([
    extractFrame(0),
    extractFrame(SPELL_FRAME_W),
  ]);
  const urls: SpellIconUrls = { normal, active };
  spellIconCache.set(iconId, urls);
  return urls;
}

/** Returns object URLs for the normal and active frames of a spell icon. */
export function useSpellIconUrls(iconId: number | null): SpellIconUrls | null {
  const client = useClient();
  const [urls, setUrls] = useState<SpellIconUrls | null>(() =>
    iconId !== null ? (spellIconCache.get(iconId) ?? null) : null,
  );

  useEffect(() => {
    if (iconId === null) {
      setUrls(null);
      return;
    }
    const cached = spellIconCache.get(iconId);
    if (cached) {
      setUrls(cached);
      return;
    }
    let cancelled = false;
    loadSpellIconUrls(client.gfxLoader, iconId).then((u) => {
      if (!cancelled) setUrls(u);
    });
    return () => {
      cancelled = true;
    };
  }, [client, iconId]);

  return urls;
}
