import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { playSfxById, SfxId } from '@/sfx';
import {
  DRAG_HOTBAR_Z,
  HUD_TEXT_MUTED,
  HUD_Z,
  UI_GHOST_BG,
  UI_PANEL_BORDER,
} from '@/ui/consts';
import { useClient } from '@/ui/context';
import { SlotType } from '@/ui/enums';
import {
  useItemDrag,
  useItemGfxUrl,
  usePillowGfxUrl,
  useSpellIconUrls,
} from '@/ui/in-game';
import { useHotbar } from './hotbar-context';

const SLOT_COUNT = 6;
const SLOT_SIZE = '3rem';
const SPELL_FRAME_W = 34;
const SPELL_FRAME_H = 32;

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
    client.spellController.subscribeSpellQueued(update);
    update();
    return () => {
      client.spellController.unsubscribeSpellQueued(update);
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

  const isDropTarget =
    !!currentDrag &&
    (currentDrag.source === 'inventory' || currentDrag.source === 'spell');

  return (
    <div
      class={`relative flex items-center justify-center overflow-visible rounded border ${UI_PANEL_BORDER} ${UI_GHOST_BG} transition-colors ${
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
      <span
        class={`pointer-events-none absolute top-0.5 left-0.5 hidden select-none text-[0.5rem] leading-none lg:block ${HUD_TEXT_MUTED}`}
      >
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
  const { currentDrag } = useItemDrag();
  const barRef = useRef<HTMLDivElement>(null);
  const isDragging = currentDrag !== null;

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--hotbar-h', `${h}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={barRef}
      role='presentation'
      class='flex gap-1'
      style={{ zIndex: isDragging ? DRAG_HOTBAR_Z : HUD_Z }}
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
