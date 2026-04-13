import { type Item, ItemSize } from 'eolib';
import { useEffect, useRef, useState } from 'preact/hooks';
import { playSfxById, SfxId } from '@/sfx';
import { useClient } from '@/ui/context';
import { getItemMeta } from '@/utils';
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

    // Remove stale positions for items no longer in inventory
    positions = positions.filter(
      (p) => p.id === 1 || items.some((i) => i.id === p.id),
    );

    // Add positions for new items
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

type DragState = {
  item: Item;
  pointerId: number;
  ghostX: number;
  ghostY: number;
  offsetX: number;
  offsetY: number;
};

type Props = {
  /** If provided, only items with these IDs are shown. Defaults to all client items. */
  itemIds?: number[];
};

export function InventoryGrid({ itemIds }: Props) {
  const client = useClient();
  const [activeTab, setActiveTab] = useState(0);
  const [positions, setPositions] = useState<ItemPosition[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);

  const getVisibleItems = () =>
    itemIds ? client.items.filter((i) => itemIds.includes(i.id)) : client.items;

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
    if (doesItemFitAt(withoutCurrent, records, tab, x, y, span)) {
      const next = [...withoutCurrent, { id: itemId, tab, x, y }];
      savePositions(next);
      playSfxById(SfxId.InventoryPlace);
    }
  };

  const tryMoveToTab = (itemId: number, tab: number) => {
    const records = buildRecordMap();
    const span = records.get(itemId);
    if (!span) return;

    const withoutCurrent = positions.filter((p) => p.id !== itemId);
    const pos = findNextAvailablePosition(
      withoutCurrent,
      records,
      itemId,
      span,
    );
    if (!pos) return;

    const finalPos = { ...pos, tab };
    const retry = findNextAvailablePosition(
      withoutCurrent,
      records,
      itemId,
      span,
    );
    if (!retry) return;

    const next = [
      ...withoutCurrent,
      { id: itemId, tab: tab, ...{ x: retry.x, y: retry.y } },
    ];
    savePositions(next);
    playSfxById(SfxId.InventoryPlace);
    void finalPos;
  };

  const onPointerDown = (e: PointerEvent, item: Item) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);

    const now = Date.now();
    if (now - lastTapRef.current < 250) {
      // double tap / click — use item
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    const target = e.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    playSfxById(SfxId.InventoryPickup);
    setDrag({
      item,
      pointerId: e.pointerId,
      ghostX: e.clientX,
      ghostY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    setDrag((d) => d && { ...d, ghostX: e.clientX, ghostY: e.clientY });
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;

    const { item } = drag;
    setDrag(null);

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || !gridRef.current) {
      playSfxById(SfxId.InventoryPlace);
      return;
    }

    const cell = (target as HTMLElement).closest<HTMLElement>('[data-cell]');
    if (cell && gridRef.current.contains(cell)) {
      const cx = Number.parseInt(cell.dataset.x ?? '0', 10);
      const cy = Number.parseInt(cell.dataset.y ?? '0', 10);
      tryMoveToCell(item.id, activeTab, cx, cy);
      return;
    }

    const tabBtn = (target as HTMLElement).closest<HTMLElement>('[data-tab]');
    if (tabBtn) {
      const tab = Number.parseInt(tabBtn.dataset.tab ?? '0', 10);
      tryMoveToTab(item.id, tab);
      return;
    }

    playSfxById(SfxId.InventoryPlace);
  };

  const onPointerCancel = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    setDrag(null);
    playSfxById(SfxId.InventoryPlace);
  };

  const tabItems = positions.filter((p) => p.tab === activeTab);

  const getTooltip = (item: Item): string => {
    const record = client.getEifRecordById(item.id);
    if (!record) return '';
    const meta = getItemMeta(record);
    const qty = item.id === 1 || item.amount > 1 ? ` x${item.amount}` : '';
    return [record.name + qty, ...meta].join('\n');
  };

  return (
    <div
      class='flex select-none flex-col gap-1'
      onPointerMove={drag ? onPointerMove : undefined}
      onPointerUp={drag ? onPointerUp : undefined}
      onPointerCancel={drag ? onPointerCancel : undefined}
    >
      {/* Tab bar */}
      <div role='tablist' class='tabs tabs-border tabs-sm'>
        {Array.from({ length: TABS }, (_, i) => (
          <button
            key={i}
            role='tab'
            data-tab={i}
            class={`tab${activeTab === i ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {i + 1}
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
              data-cell
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
          const isDragging = drag?.item.id === item.id;

          return (
            <div
              key={item.id}
              class={`tooltip absolute flex cursor-grab items-center justify-center tooltip-right${isDragging ? 'opacity-30' : ''}`}
              data-tip={getTooltip(item)}
              style={{
                left: pos.x * CELL_SIZE,
                top: pos.y * CELL_SIZE,
                width: span.cols * CELL_SIZE,
                height: span.rows * CELL_SIZE,
              }}
              onPointerDown={(e) => onPointerDown(e, item)}
            >
              <ItemIcon
                graphicId={record.graphicId}
                alt={record.name}
                class='pointer-events-none max-h-full max-w-full object-contain'
              />
              {item.amount > 1 && (
                <span class='pointer-events-none absolute right-0 bottom-0 text-[8px] text-base-content/80 leading-none'>
                  {item.amount}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Drag ghost */}
      {drag && (
        <div
          class='pointer-events-none fixed z-[9999] opacity-90'
          style={{
            left: drag.ghostX - drag.offsetX,
            top: drag.ghostY - drag.offsetY,
            width: (() => {
              const record = client.getEifRecordById(drag.item.id);
              return record
                ? ITEM_SPAN[record.size].cols * CELL_SIZE
                : CELL_SIZE;
            })(),
            height: (() => {
              const record = client.getEifRecordById(drag.item.id);
              return record
                ? ITEM_SPAN[record.size].rows * CELL_SIZE
                : CELL_SIZE;
            })(),
          }}
        >
          <ItemIcon
            graphicId={client.getEifRecordById(drag.item.id)?.graphicId ?? 0}
            alt=''
            class='max-h-full max-w-full object-contain'
          />
        </div>
      )}
    </div>
  );
}
