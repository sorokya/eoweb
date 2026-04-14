import { createContext } from 'preact';
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'preact/hooks';
import type { EquipmentSlot } from '@/equipment';
import { ItemIcon } from '@/ui/components';

const MIN_DRAG_PX = 5;

export type DragDropResult =
  | { type: 'cell'; tab: number; x: number; y: number }
  | { type: 'tab'; tab: number }
  | { type: 'equip-slot'; slot: EquipmentSlot }
  | { type: 'hotbar-slot'; index: number }
  | { type: 'ground' }
  | { type: 'cancelled' };

export type DragInfo = {
  source: 'inventory' | 'equipment';
  itemId: number;
  equipSlot?: EquipmentSlot;
  pointerId: number;
  ghostX: number;
  ghostY: number;
  offsetX: number;
  offsetY: number;
  graphicId: number;
  ghostWidth: number;
  ghostHeight: number;
};

type StartDragOptions = {
  info: DragInfo;
  onResolve: (result: DragDropResult) => void;
  onMove?: (x: number, y: number) => void;
};

type ItemDragContextValue = {
  currentDrag: DragInfo | null;
  liveX: number;
  liveY: number;
  startDrag(options: StartDragOptions): void;
  cancelDrag(): void;
};

const ItemDragContext = createContext<ItemDragContextValue>({
  currentDrag: null,
  liveX: 0,
  liveY: 0,
  startDrag: () => {},
  cancelDrag: () => {},
});

export function useItemDrag() {
  return useContext(ItemDragContext);
}

type GhostPos = { x: number; y: number };

export function ItemDragProvider({
  children,
}: {
  children: preact.ComponentChildren;
}) {
  const [currentDrag, setCurrentDrag] = useState<DragInfo | null>(null);
  const [ghostPos, setGhostPos] = useState<GhostPos>({ x: 0, y: 0 });

  // dragRef is managed synchronously — do NOT auto-sync from state
  const dragRef = useRef<DragInfo | null>(null);

  const hasMovedRef = useRef(false);
  const resolveRef = useRef<((result: DragDropResult) => void) | null>(null);
  const onMoveRef = useRef<((x: number, y: number) => void) | null>(null);

  const startDrag = useCallback(
    ({ info, onResolve, onMove }: StartDragOptions) => {
      dragRef.current = info; // synchronous — visible to listeners immediately
      hasMovedRef.current = false;
      setCurrentDrag(info);
      setGhostPos({ x: info.ghostX, y: info.ghostY });
      resolveRef.current = onResolve;
      onMoveRef.current = onMove ?? null;
    },
    [],
  );

  const cancelDrag = useCallback(() => {
    dragRef.current = null; // synchronous
    hasMovedRef.current = false;
    setCurrentDrag(null);
    resolveRef.current = null;
    onMoveRef.current = null;
  }, []);

  // Listeners are always-on so they can't miss a fast mobile pointerup
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      e.preventDefault();
      setGhostPos({ x: e.clientX, y: e.clientY });
      onMoveRef.current?.(e.clientX, e.clientY);
      if (!hasMovedRef.current) {
        const dx = e.clientX - d.ghostX;
        const dy = e.clientY - d.ghostY;
        if (Math.hypot(dx, dy) > MIN_DRAG_PX) {
          hasMovedRef.current = true;
        }
      }
    };

    const handleUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;

      const moved = hasMovedRef.current;
      hasMovedRef.current = false;
      dragRef.current = null; // synchronous
      setCurrentDrag(null);
      const resolve = resolveRef.current;
      resolveRef.current = null;
      onMoveRef.current = null;
      if (!resolve) return;

      // If pointer barely moved, treat as a tap (cancelled drag)
      if (!moved) {
        resolve({ type: 'cancelled' });
        return;
      }

      // Prevent the browser from firing a synthetic click after this pointerup
      e.preventDefault();

      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target) {
        resolve({ type: 'ground' });
        return;
      }

      const cell = (target as HTMLElement).closest<HTMLElement>(
        '[data-inventory-cell]',
      );
      if (cell) {
        const tab = Number.parseInt(cell.dataset.tab ?? '0', 10);
        const x = Number.parseInt(cell.dataset.x ?? '0', 10);
        const y = Number.parseInt(cell.dataset.y ?? '0', 10);
        resolve({ type: 'cell', tab, x, y });
        return;
      }

      const tabBtn = (target as HTMLElement).closest<HTMLElement>(
        '[data-inventory-tab]',
      );
      if (tabBtn) {
        const tab = Number.parseInt(tabBtn.dataset.inventoryTab ?? '0', 10);
        resolve({ type: 'tab', tab });
        return;
      }

      const equipEl = (target as HTMLElement).closest<HTMLElement>(
        '[data-equip-slot]',
      );
      if (equipEl) {
        const slot = Number.parseInt(
          equipEl.dataset.equipSlot ?? '-1',
          10,
        ) as EquipmentSlot;
        if (slot >= 0) {
          resolve({ type: 'equip-slot', slot });
          return;
        }
      }

      const hotbarEl = (target as HTMLElement).closest<HTMLElement>(
        '[data-hotbar-slot]',
      );
      if (hotbarEl) {
        const index = Number.parseInt(hotbarEl.dataset.hotbarSlot ?? '-1', 10);
        if (index >= 0) {
          resolve({ type: 'hotbar-slot', index });
          return;
        }
      }

      resolve({ type: 'ground' });
    };

    const handleCancel = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      hasMovedRef.current = false;
      dragRef.current = null; // synchronous
      setCurrentDrag(null);
      const resolve = resolveRef.current;
      resolveRef.current = null;
      onMoveRef.current = null;
      resolve?.({ type: 'cancelled' });
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);

    // On iOS, preventing panning during a drag requires blocking touchmove
    // (pointermove.preventDefault() alone is not enough for touch pipelines).
    const handleTouchMove = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault();
    };
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []); // run once — always active; uses refs so no deps needed

  const ctxValue: ItemDragContextValue = {
    currentDrag,
    liveX: ghostPos.x,
    liveY: ghostPos.y,
    startDrag,
    cancelDrag,
  };

  return (
    <ItemDragContext.Provider value={ctxValue}>
      {children}
      {currentDrag && (
        <div
          class='pointer-events-none fixed z-9999 opacity-90'
          style={{
            left: ghostPos.x - currentDrag.offsetX,
            top: ghostPos.y - currentDrag.offsetY,
            width: currentDrag.ghostWidth,
            height: currentDrag.ghostHeight,
          }}
        >
          <ItemIcon
            graphicId={currentDrag.graphicId}
            alt=''
            class='max-h-full max-w-full object-contain'
          />
        </div>
      )}
    </ItemDragContext.Provider>
  );
}
