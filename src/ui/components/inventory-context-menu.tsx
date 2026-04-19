import type { Item } from 'eolib';
import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useClient, useLocale } from '@/ui/context';
import { SlotType } from '@/ui/enums';
import { useHotbar } from '@/ui/in-game';

type Props = {
  item: Item;
  x: number;
  y: number;
  onClose: () => void;
};

export function InventoryContextMenu({ item, x, y, onClose }: Props) {
  const client = useClient();
  const { locale } = useLocale();
  const { setSlot } = useHotbar();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const padding = 8;
    const left =
      x + width + padding <= window.innerWidth
        ? x + padding
        : x - width - padding;
    const top = Math.min(y, window.innerHeight - height - padding);
    setPos({ left, top });
  }, [x, y]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const getCoords = () => {
    const p = client.getPlayerCharacter();
    return p ? { x: p.coords.x, y: p.coords.y } : { x: 0, y: 0 };
  };

  const handleUse = (e: MouseEvent) => {
    e.preventDefault();
    onClose();
    client.inventoryController.useItem(item.id);
  };

  const handleDrop = (e: MouseEvent) => {
    e.preventDefault();
    onClose();
    client.inventoryController.dropItem(item.id, getCoords());
  };

  const handleJunk = (e: MouseEvent) => {
    e.preventDefault();
    onClose();
    client.inventoryController.junkItem(item.id);
  };

  const handleAssignSlot = (e: MouseEvent, slotIndex: number) => {
    e.preventDefault();
    onClose();
    setSlot(slotIndex, { type: SlotType.Item, typeId: item.id });
  };

  return createPortal(
    <>
      {/* Transparent overlay — catches the outside click and stops it from reaching the map */}
      <div
        class='fixed inset-0 z-[9999]'
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        ref={menuRef}
        class='menu menu-compact fixed z-[10000] w-36 rounded-box bg-base-200 p-1 shadow-xl'
        style={{ left: pos.left, top: pos.top }}
        onClick={(e) => e.stopPropagation()}
      >
        <li>
          <button type='button' onClick={handleUse}>
            {locale.ctxUseItem}
          </button>
        </li>
        <li>
          <button type='button' onClick={handleDrop}>
            {locale.ctxDropItem}
          </button>
        </li>
        <li>
          <button type='button' onClick={handleJunk}>
            {locale.ctxJunkItem}
          </button>
        </li>
        <li class='menu-title px-2 py-0.5 text-xs opacity-60'>
          {locale.ctxAssignSlot}
        </li>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <li key={n}>
            <button type='button' onClick={(e) => handleAssignSlot(e, n - 1)}>
              {locale.ctxAssignSlot} {n}
            </button>
          </li>
        ))}
      </div>
    </>,
    document.getElementById('ui') ?? document.body,
  );
}
