import { Item, ItemSize } from 'eolib';
import { useEffect, useRef, useState } from 'preact/hooks';
import { EOResourceID } from '@/edf';
import { playSfxById, SfxId } from '@/sfx';
import { useClient, useLocale } from '@/ui/context';
import { useItemDrag } from '@/ui/in-game';
import { getItemMeta } from '@/utils';
import { InventoryContextMenu } from './inventory-context-menu';
import { ItemIcon } from './item-icon';

const TABS = 2;
const COLS = 8;
const ROWS = 10;
const CELL_SIZE = 23;

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
      (p) => p.id === 1 || items.some((i) => i.id === p.id),
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

type ContextMenuState = { item: Item; x: number; y: number } | null;

type Props = {
  /** If provided, only items with these IDs are shown. Defaults to all client items. */
  itemIds?: number[];
};

export function InventoryGrid({ itemIds }: Props) {
  const client = useClient();
  const { locale } = useLocale();
  const { startDrag, cancelDrag, currentDrag } = useItemDrag();
  const [activeTab, setActiveTab] = useState(0);
  const [positions, setPositions] = useState<ItemPosition[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [touchTooltipId, setTouchTooltipId] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  const suppressContextMenuUntilRef = useRef(0);

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Clear touch tooltip when touching outside an inventory item
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (!(e.target as HTMLElement).closest('[data-inventory-item]')) {
        setTouchTooltipId(null);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const getVisibleItems = (): Item[] => {
    const items = itemIds
      ? client.items.filter((i) => itemIds.includes(i.id))
      : client.items;
    // Gold (id=1) is always shown even at 0 quantity
    if (!items.some((i) => i.id === 1)) {
      const gold = new Item();
      gold.id = 1;
      gold.amount = 0;
      return [gold, ...items];
    }
    return items;
  };

  const buildRecordMap = (): Map<number, ItemSpan> => {
    const map = new Map<number, ItemSpan>();
    for (const item of getVisibleItems()) {
      const record = client.getEifRecordById(item.id);
      if (record) map.set(item.id, ITEM_SPAN[record.size]);
    }
    return map;
  };

  const storageKey = `${client.name}-inventory`;

  const syncPositions = () => {
    const records = buildRecordMap();
    const synced = loadPositions(storageKey, getVisibleItems(), records);
    setPositions(synced);
  };

  useEffect(() => {
    syncPositions();

    const handler = () => syncPositions();
    client.on('inventoryChanged', handler);
    return () => client.off('inventoryChanged', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const savePositions = (next: ItemPosition[]) => {
    localStorage.setItem(storageKey, JSON.stringify(next));
    setPositions(next);
  };

  const tryMoveToCell = (itemId: number, tab: number, x: number, y: number) => {
    const records = buildRecordMap();
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
    const records = buildRecordMap();
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
      suppressContextMenuUntilRef.current = now + 750;
      client.inventoryController.useItem(item.id);
      return;
    }
    lastTapRef.current = now;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const record = client.getEifRecordById(item.id);
    if (!record) return;

    const span = ITEM_SPAN[record.size];

    // Long-press timer for context menu (mobile): cancel drag and show menu
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    if (e.pointerType === 'touch') {
      setTouchTooltipId(item.id);
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        if (Date.now() < suppressContextMenuUntilRef.current) return;
        setTouchTooltipId(null);
        cancelDrag();
        setContextMenu({ item, x: e.clientX, y: e.clientY });
      }, 700);
    }

    playSfxById(SfxId.InventoryPickup);

    startDrag({
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
          } else if (result.type === 'ground') {
            if (!client.mapController.cursorInDropRange()) return;
            const coords = client.mouseCoords ?? getCoords();
            const itemName = client.getEifRecordById(item.id)?.name ?? '';
            if (item.amount > 1) {
              const title = client.getResourceString(
                EOResourceID.DIALOG_TRANSFER_HOW_MUCH,
              );
              const actionLabel = client.getResourceString(
                EOResourceID.DIALOG_TRANSFER_DROP,
              );
              client.alertController.showAmount(
                title,
                itemName,
                item.amount,
                actionLabel,
                (amount) => {
                  if (amount !== null && amount > 0) {
                    client.inventoryController.dropItem(
                      item.id,
                      amount,
                      coords,
                    );
                  }
                },
              );
            } else {
              client.inventoryController.dropItem(item.id, 1, coords);
            }
          }
        }
      },
    });
  };

  const onContextMenu = (e: MouseEvent, item: Item) => {
    e.preventDefault();
    if (Date.now() < suppressContextMenuUntilRef.current) return;
    setContextMenu({ item, x: e.clientX, y: e.clientY });
  };

  const tabItems = positions.filter((p) => p.tab === activeTab);

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
      {/* Tab bar */}
      <div role='tablist' class='tabs tabs-border tabs-sm'>
        {Array.from({ length: TABS }, (_, i) => (
          <button
            key={i}
            role='tab'
            data-inventory-tab={i}
            /* biome-ignore lint/nursery/useSortedClasses: Need space */
            class={`tab${activeTab === i ? ' tab-active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {TAB_LABELS[i]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        class='relative border border-base-300 bg-base-200'
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
              class='border border-base-300/30'
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
          const item = getVisibleItems().find((i) => i.id === pos.id);
          const record = item && client.getEifRecordById(item.id);
          if (!item || !record) return null;

          const span = ITEM_SPAN[record.size];
          // Only dim if THIS item is being dragged from inventory (not from equip)
          const itemIsDragging =
            currentDrag?.source === 'inventory' &&
            currentDrag?.itemId === item.id;
          const tooltipLines = getTooltipLines(item);

          return (
            <div
              key={item.id}
              data-inventory-cell
              data-inventory-item={item.id}
              data-tab={activeTab}
              data-x={pos.x}
              data-y={pos.y}
              /* biome-ignore lint/nursery/useSortedClasses: Need space */
              class={`group absolute flex cursor-grab items-center justify-center${itemIsDragging ? ' opacity-30' : ''}`}
              style={{
                left: pos.x * CELL_SIZE,
                top: pos.y * CELL_SIZE,
                width: span.cols * CELL_SIZE,
                height: span.rows * CELL_SIZE,
              }}
              onPointerDown={(e) => onPointerDown(e, item)}
              onContextMenu={(e) => onContextMenu(e, item)}
            >
              <ItemIcon
                graphicId={record.graphicId}
                alt={record.name}
                class='pointer-events-none max-h-full max-w-full object-contain'
              />
              {/* Multi-line tooltip: desktop hover or touch-activated */}
              {tooltipLines.length > 0 && (
                <div
                  class={`pointer-events-none absolute top-0 left-full z-50 ml-1 w-max max-w-40 rounded bg-base-300 px-2 py-1 text-xs shadow-lg ${touchTooltipId === item.id ? 'block' : 'hidden group-hover:block'}`}
                >
                  {tooltipLines.map((line, i) => (
                    <div
                      key={i}
                      class={i === 0 ? 'font-semibold' : 'opacity-70'}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <InventoryContextMenu
          item={contextMenu.item}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
