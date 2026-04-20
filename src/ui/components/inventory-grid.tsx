import { Item, ItemSize } from 'eolib';
import { createPortal } from 'preact/compat';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { FaTrash } from 'react-icons/fa';
import { GOLD_ITEM_ID } from '@/consts';
import { playSfxById, SfxId } from '@/sfx';
import { UI_ITEM_BG, UI_PANEL_BORDER } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { SlotType } from '@/ui/enums';
import { useHotbar, useItemDrag } from '@/ui/in-game';
import { getItemMeta } from '@/utils';
import { ItemIcon } from './item-icon';
import { Tabs } from './tabs';

const TABS = 2;
const COLS = 15;
const ROWS = 8;
const CELL_SIZE = 26;

/** Width of the grid content area in pixels. Used by InventoryDialog to size itself. */
export const INVENTORY_GRID_WIDTH = COLS * CELL_SIZE;

type ItemSpan = { cols: number; rows: number };

const ITEM_SPAN: Record<ItemSize, ItemSpan> = {
  [ItemSize.Size1x1]: { cols: 1, rows: 1 },
  [ItemSize.Size1x2]: { cols: 1, rows: 2 },
  [ItemSize.Size1x3]: { cols: 1, rows: 3 },
  [ItemSize.Size1x4]: { cols: 1, rows: 4 },
  [ItemSize.Size2x1]: { cols: 2, rows: 1 },
  [ItemSize.Size2x2]: { cols: 2, rows: 2 },
  [ItemSize.Size2x3]: { cols: 2, rows: 3 },
  [ItemSize.Size2x4]: { cols: 2, rows: 4 },
};

type ItemPosition = {
  id: number;
  tab: number;
  x: number;
  y: number;
};

function doesItemFitAt(
  positions: ItemPosition[],
  records: Map<number, ItemSpan>,
  tab: number,
  x: number,
  y: number,
  span: ItemSpan,
): boolean {
  if (x + span.cols > COLS || y + span.rows > ROWS) return false;

  for (const pos of positions) {
    if (pos.tab !== tab) continue;
    const existing = records.get(pos.id);
    if (!existing) continue;

    const overlapX = x < pos.x + existing.cols && x + span.cols > pos.x;
    const overlapY = y < pos.y + existing.rows && y + span.rows > pos.y;
    if (overlapX && overlapY) return false;
  }

  return true;
}

function findNextAvailablePosition(
  positions: ItemPosition[],
  records: Map<number, ItemSpan>,
  id: number,
  span: ItemSpan,
): ItemPosition | null {
  for (let tab = 0; tab < TABS; tab++) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (doesItemFitAt(positions, records, tab, x, y, span)) {
          return { id, tab, x, y };
        }
      }
    }
  }
  return null;
}

function loadPositions(
  storageKey: string,
  items: Item[],
  records: Map<number, ItemSpan>,
): ItemPosition[] {
  let positions: ItemPosition[] = [];
  const json = localStorage.getItem(storageKey);

  if (json) {
    try {
      positions = JSON.parse(json) as ItemPosition[];
    } catch {
      positions = [];
    }

    positions = positions.filter(
      (p) => p.id === GOLD_ITEM_ID || items.some((i) => i.id === p.id),
    );

    for (const item of items) {
      if (!positions.find((p) => p.id === item.id)) {
        const span = records.get(item.id);
        if (!span) continue;
        const pos = findNextAvailablePosition(
          positions,
          records,
          item.id,
          span,
        );
        if (pos) positions.push(pos);
      }
    }
  } else {
    for (const item of items) {
      const span = records.get(item.id);
      if (!span) continue;
      const pos = findNextAvailablePosition(positions, records, item.id, span);
      if (pos) positions.push(pos);
    }
  }

  localStorage.setItem(storageKey, JSON.stringify(positions));
  return positions;
}

type Props = {
  /** If provided, only items with these IDs are shown. Defaults to all client items. */
  itemIds?: number[];
};

function JunkZone() {
  const { currentDrag } = useItemDrag();
  const { locale } = useLocale();
  const [isOver, setIsOver] = useState(false);
  if (currentDrag?.source !== 'inventory') return null;
  return (
    <div
      data-junk-drop
      class={`flex h-full cursor-pointer items-center gap-1 whitespace-nowrap rounded border-2 border-dashed px-2 py-0.5 text-xs transition-colors ${isOver ? 'border-error bg-error/20 text-error' : 'border-base-content/20 text-base-content/40'}`}
      onPointerEnter={() => setIsOver(true)}
      onPointerLeave={() => setIsOver(false)}
    >
      <FaTrash size={11} />
      {locale.junkDropZone}
    </div>
  );
}

export function InventoryGrid({ itemIds }: Props) {
  const client = useClient();
  const { locale } = useLocale();
  const { startDrag, currentDrag } = useItemDrag();
  const { setSlot } = useHotbar();
  const [activeTab, setActiveTab] = useState(0);
  const [positions, setPositions] = useState<ItemPosition[]>([]);
  const [tooltip, setTooltip] = useState<{
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Clear tooltip when touching outside an inventory item
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (!(e.target as HTMLElement).closest('[data-inventory-item]')) {
        setTooltip(null);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const getVisibleItems = (): Item[] => {
    const items = itemIds
      ? client.inventoryController.items.filter((i) => itemIds.includes(i.id))
      : client.inventoryController.items;

    if (!items.some((i) => i.id === GOLD_ITEM_ID)) {
      const gold = new Item();
      gold.id = GOLD_ITEM_ID;
      gold.amount = 0;
      return [gold, ...items];
    }
    return items;
  };

  const buildRecordMap = (items: Item[]): Map<number, ItemSpan> => {
    const map = new Map<number, ItemSpan>();
    for (const item of items) {
      const record = client.getEifRecordById(item.id);
      if (record) map.set(item.id, ITEM_SPAN[record.size]);
    }
    return map;
  };

  const storageKey = `${client.name}-inventory`;

  const syncPositions = () => {
    const items = getVisibleItems();
    const records = buildRecordMap(items);
    const synced = loadPositions(storageKey, items, records);
    setPositions(synced);
  };

  useEffect(() => {
    syncPositions();

    const handler = () => syncPositions();
    client.inventoryController.subscribeInventoryChanged(handler);
    return () =>
      client.inventoryController.unsubscribeInventoryChanged(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const savePositions = (next: ItemPosition[]) => {
    localStorage.setItem(storageKey, JSON.stringify(next));
    setPositions(next);
  };

  const tryMoveToCell = (itemId: number, tab: number, x: number, y: number) => {
    const items = getVisibleItems();
    const records = buildRecordMap(items);
    const span = records.get(itemId);
    if (!span) return;

    const withoutCurrent = positions.filter((p) => p.id !== itemId);

    // Check if target cell overlaps with another item
    const overlapping = withoutCurrent.find((pos) => {
      const s = records.get(pos.id);
      if (!s || pos.tab !== tab) return false;
      const ox = x < pos.x + s.cols && x + span.cols > pos.x;
      const oy = y < pos.y + s.rows && y + span.rows > pos.y;
      return ox && oy;
    });

    if (!overlapping) {
      if (doesItemFitAt(withoutCurrent, records, tab, x, y, span)) {
        savePositions([...withoutCurrent, { id: itemId, tab, x, y }]);
      }
      return;
    }

    // Swap: remove both, place dragged at target, find space for displaced
    const displacedId = overlapping.id;
    const displacedSpan = records.get(displacedId);
    if (!displacedSpan) return;

    const withoutBoth = positions.filter(
      (p) => p.id !== itemId && p.id !== displacedId,
    );

    if (!doesItemFitAt(withoutBoth, records, tab, x, y, span)) return;

    const withDragged = [...withoutBoth, { id: itemId, tab, x, y }];
    const newDisplacedPos = findNextAvailablePosition(
      withDragged,
      records,
      displacedId,
      displacedSpan,
    );

    if (!newDisplacedPos) return;

    savePositions([...withDragged, newDisplacedPos]);
  };

  const tryMoveToTab = (itemId: number, tab: number) => {
    const items = getVisibleItems();
    const records = buildRecordMap(items);
    const span = records.get(itemId);
    if (!span) return;

    const withoutCurrent = positions.filter((p) => p.id !== itemId);

    // Find first free spot in the target tab
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (doesItemFitAt(withoutCurrent, records, tab, x, y, span)) {
          savePositions([...withoutCurrent, { id: itemId, tab, x, y }]);
          return;
        }
      }
    }
  };

  const tryMoveToCellRef = useRef(tryMoveToCell);
  tryMoveToCellRef.current = tryMoveToCell;

  const tryMoveToTabRef = useRef(tryMoveToTab);
  tryMoveToTabRef.current = tryMoveToTab;

  const getCoords = () => {
    const p = client.getPlayerCharacter();
    return p ? { x: p.coords.x, y: p.coords.y } : { x: 0, y: 0 };
  };

  const onPointerDown = (e: PointerEvent, item: Item) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    e.preventDefault();

    const now = Date.now();
    if (now - lastTapRef.current < 250) {
      lastTapRef.current = 0;
      client.inventoryController.useItem(item.id);
      return;
    }
    lastTapRef.current = now;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const record = client.getEifRecordById(item.id);
    if (!record) return;

    const span = ITEM_SPAN[record.size];

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    if (e.pointerType === 'touch') {
      const tooltipX = Math.min(rect.right + 4, window.innerWidth - 168);
      const tooltipY = Math.max(4, rect.top);
      setTooltip({ id: item.id, x: tooltipX, y: tooltipY });
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        setTooltip(null);
      }, 700);
    }

    playSfxById(SfxId.InventoryPickup);
    // Don't clear the tooltip on touch — it was just set above so the user can see it
    if (e.pointerType !== 'touch') {
      setTooltip(null);
    }

    startDrag({
      element: e.currentTarget as Element,
      info: {
        source: 'inventory',
        itemId: item.id,
        pointerId: e.pointerId,
        ghostX: e.clientX,
        ghostY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        graphicId: record.graphicId,
        ghostWidth: span.cols * CELL_SIZE,
        ghostHeight: span.rows * CELL_SIZE,
      },
      onMove: (mx, my) => {
        if (longPressTimer && Math.hypot(mx - e.clientX, my - e.clientY) > 5) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        // Hide tooltip once dragging starts
        setTooltip(null);
        // Keep the game-world cursor in sync while dragging
        if (client.app) {
          const canvas = client.app.renderer.canvas;
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          client.setMousePosition({
            x: Math.min(
              Math.max(Math.floor((mx - rect.left) * scaleX), 0),
              canvas.width,
            ),
            y: Math.min(
              Math.max(Math.floor((my - rect.top) * scaleY), 0),
              canvas.height,
            ),
          });
        }
      },
      onResolve: (result) => {
        playSfxById(SfxId.InventoryPlace);
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (result.type === 'cancelled') {
          // Tap without drag: handle as potential double-tap on next tap
          // (no action needed — useItem fires on the second tap)
        } else {
          if (result.type === 'cell') {
            tryMoveToCellRef.current(item.id, result.tab, result.x, result.y);
          } else if (result.type === 'tab') {
            tryMoveToTabRef.current(item.id, result.tab);
          } else if (result.type === 'equip-slot') {
            client.inventoryController.equipItem(result.slot, item.id);
          } else if (result.type === 'hotbar-slot') {
            const record = client.getEifRecordById(item.id);
            if (record) {
              setSlot(result.index, { type: SlotType.Item, typeId: item.id });
            }
          } else if (result.type === 'ground') {
            if (!client.mapController.cursorInDropRange()) return;
            const coords = client.mouseCoords ?? getCoords();
            client.inventoryController.dropItem(item.id, coords);
          } else if (result.type === 'junk') {
            client.inventoryController.junkItem(item.id);
          } else if (result.type === 'chest') {
            client.chestController.addItem(item.id);
          } else if (result.type === 'locker') {
            client.lockerController.addItem(item.id);
          }
        }
      },
    });
  };

  const tabItems = positions.filter((p) => p.tab === activeTab);

  // Compute once per render to avoid redundant scans of client.inventoryController.items in JSX
  const visibleItems = useMemo(getVisibleItems, [positions]);

  const getTooltipLines = (item: Item): string[] => {
    const record = client.getEifRecordById(item.id);
    if (!record) return [];
    const meta = getItemMeta(record);
    const qty =
      item.id === 1 || item.amount > 1
        ? ` x${item.amount.toLocaleString()}`
        : '';
    return [record.name + qty, ...meta];
  };

  const TAB_LABELS = [locale.inventoryTab1, locale.inventoryTab2];

  return (
    <div class='flex flex-col gap-1'>
      {/* Tab bar + junk zone */}
      <div class='flex items-center gap-1'>
        <Tabs
          name='inventory-tabs'
          items={TAB_LABELS.map((label, index) => ({
            id: index.toString(),
            label,
          }))}
          activeId={activeTab.toString()}
          onSelect={(id) => setActiveTab(Number(id))}
          style='border'
          size='sm'
        />
        <JunkZone />
      </div>
      {/* Grid */}
      <div
        ref={gridRef}
        class={`relative border ${UI_PANEL_BORDER} ${UI_ITEM_BG}`}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
          width: COLS * CELL_SIZE,
          height: ROWS * CELL_SIZE,
        }}
      >
        {/* Empty cells (drop targets) */}
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: COLS }, (_, col) => (
            <div
              key={`${col}-${row}`}
              data-inventory-cell
              data-tab={activeTab}
              data-x={col}
              data-y={row}
              class={`border ${UI_PANEL_BORDER}`}
              style={{
                gridColumn: col + 1,
                gridRow: row + 1,
                width: CELL_SIZE,
                height: CELL_SIZE,
              }}
            />
          )),
        )}

        {/* Items */}
        {tabItems.map((pos) => {
          const item = visibleItems.find((i) => i.id === pos.id);
          const record = item && client.getEifRecordById(item.id);
          if (!item || !record) return null;

          const span = ITEM_SPAN[record.size];
          // Only dim if THIS item is being dragged from inventory (not from equip)
          const itemIsDragging =
            currentDrag?.source === 'inventory' &&
            currentDrag?.itemId === item.id;

          return (
            <div
              key={item.id}
              data-inventory-cell
              data-inventory-item={item.id}
              data-tab={activeTab}
              data-x={pos.x}
              data-y={pos.y}
              /* biome-ignore lint/nursery/useSortedClasses: Need space */
              class={`absolute flex cursor-grab items-center justify-center${itemIsDragging ? ' opacity-30' : ''}`}
              style={{
                left: pos.x * CELL_SIZE,
                top: pos.y * CELL_SIZE,
                width: span.cols * CELL_SIZE,
                height: span.rows * CELL_SIZE,
              }}
              onPointerDown={(e) => onPointerDown(e, item)}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                const r = el.getBoundingClientRect();
                const x =
                  r.right + 4 + 160 > window.innerWidth
                    ? r.left - 4 - 160
                    : r.right + 4;
                const y = Math.min(Math.max(r.top, 4), window.innerHeight - 80);
                setTooltip({ id: item.id, x, y });
              }}
              onMouseLeave={() =>
                setTooltip((t) => (t?.id === item.id ? null : t))
              }
            >
              <ItemIcon
                graphicId={record.graphicId}
                alt={record.name}
                class='pointer-events-none max-h-full max-w-full object-contain'
              />
            </div>
          );
        })}
      </div>
      {/* Fixed-position tooltip portal — avoids scroll/clip issues inside dialogs */}{' '}
      {tooltip &&
        (() => {
          const item = visibleItems.find((i) => i.id === tooltip.id);
          const lines = item ? getTooltipLines(item) : [];
          if (!lines.length) return null;
          return createPortal(
            <div
              class='pointer-events-none w-max max-w-40 rounded bg-base-300 px-2 py-1 text-xs shadow-lg'
              style={{
                position: 'fixed',
                left: tooltip.x,
                top: tooltip.y,
                zIndex: 9999,
              }}
            >
              {lines.map((line, i) => (
                <div key={i} class={i === 0 ? 'font-semibold' : 'opacity-70'}>
                  {line}
                </div>
              ))}
            </div>,
            document.getElementById('ui') ?? document.body,
          );
        })()}
    </div>
  );
}
