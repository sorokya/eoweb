import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { GfxType } from '@/gfx';
import { playSfxById, SfxId } from '@/sfx';
import { HUD_Z } from '@/ui/consts';
import { useClient } from '@/ui/context';
import { SlotType } from '@/ui/enums';
import { useItemDrag, useItemGfxUrl, usePillowGfxUrl } from '@/ui/in-game';
import { useHotbar } from './hotbar-context';

const SLOT_COUNT = 6;
const SLOT_SIZE = '3rem';

// ---------------------------------------------------------------------------
// Spell icon — sprite sheet with 2 frames (34×32 each): left=normal, right=active
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

  const bitmap = await gfxLoader.loadResource(GfxType.SpellIcons, iconId);

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

function useSpellIconUrls(iconId: number | null): SpellIconUrls | null {
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

// ---------------------------------------------------------------------------
// Individual slot
// ---------------------------------------------------------------------------
type SlotProps = {
  index: number;
  pillow: string | null;
};

function HotBarSlot({ index, pillow }: SlotProps) {
  const client = useClient();
  const { slots, clearSlot } = useHotbar();
  const { currentDrag } = useItemDrag();
  const slot = slots[index] ?? { type: SlotType.Empty, typeId: 0 };
  const isItem = slot.type === SlotType.Item;
  const isSkill = slot.type === SlotType.Skill;

  // Get graphic IDs for the assigned slot
  const itemGraphicId = isItem
    ? (client.getEifRecordById(slot.typeId)?.graphicId ?? null)
    : null;
  const spellIconId = isSkill
    ? (client.getEsfRecordById(slot.typeId)?.iconId ?? null)
    : null;

  const itemUrl = useItemGfxUrl(itemGraphicId, { shadow: true });
  const spellUrls = useSpellIconUrls(spellIconId);

  // Track whether this spell is currently selected/armed
  const [isSpellActive, setIsSpellActive] = useState(false);
  useEffect(() => {
    if (!isSkill) {
      setIsSpellActive(false);
      return;
    }
    const update = () =>
      setIsSpellActive(client.spellController.selectedSpellId === slot.typeId);
    // Poll on spellQueued events
    client.on('spellQueued', update);
    update();
    return () => {
      client.off('spellQueued', update);
    };
  }, [client, isSkill, slot.typeId]);

  // Track pointer-down position; on pointer-up, if moved far enough → clear slot
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const CLEAR_THRESHOLD = 30; // px

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (slot.type === SlotType.Empty) return;
      pointerStart.current = { x: e.clientX, y: e.clientY };
      // Capture the pointer so pointerup fires on this element even if the
      // user releases outside the slot (i.e. after dragging away).
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      playSfxById(SfxId.InventoryPickup);
    },
    [slot],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start || slot.type === SlotType.Empty) return;
      const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (dist >= CLEAR_THRESHOLD) {
        clearSlot(index);
      } else {
        client.spellController.useHotbarSlot(index);
      }
    },
    [client, slot.type, index, clearSlot],
  );

  const isDropTarget = !!currentDrag && currentDrag.source === 'inventory';

  return (
    <div
      class={`relative flex items-center justify-center overflow-visible rounded border border-base-content/20 bg-base-200/20 transition-colors ${
        isDropTarget ? 'ring-2 ring-primary/60' : ''
      }`}
      style={{
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        touchAction: 'none',
      }}
      data-hotbar-slot={index}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {/* Key label */}
      <span class='pointer-events-none absolute top-0.5 left-0.5 hidden select-none text-[0.5rem] leading-none opacity-50 lg:block'>
        {index + 1}
      </span>

      {/* Pillow background */}
      {pillow && slot.type !== SlotType.Empty && (
        <img
          src={pillow}
          alt=''
          class='pointer-events-none absolute inset-0 h-full w-full object-contain p-0.5'
          draggable={false}
        />
      )}

      {/* Item icon */}
      {isItem && itemUrl && (
        <img
          src={itemUrl}
          alt=''
          class='pointer-events-none relative z-10 max-h-full max-w-full object-contain p-0.5'
          draggable={false}
        />
      )}

      {/* Spell icon */}
      {isSkill && spellUrls && (
        <img
          src={isSpellActive ? spellUrls.active : spellUrls.normal}
          alt=''
          class='pointer-events-none relative z-10 object-contain'
          style={{ width: `${SPELL_FRAME_W}px`, height: `${SPELL_FRAME_H}px` }}
          draggable={false}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HotBar
// ---------------------------------------------------------------------------
export function HotBar() {
  const pillow = usePillowGfxUrl();

  return (
    <div
      role='presentation'
      class='flex gap-1'
      style={{ zIndex: HUD_Z }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {Array.from({ length: SLOT_COUNT }, (_, i) => (
        <HotBarSlot key={i} index={i} pillow={pillow} />
      ))}
    </div>
  );
}
