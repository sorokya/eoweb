import type { ThreeItem } from 'eolib';
import { createPortal } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { ItemIcon } from '@/ui/components';
import { UI_ITEM_BG, UI_PANEL_BORDER } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { useItemDrag, useRawItemGfxUrl } from '@/ui/in-game';
import { getItemGraphicId, getItemMeta } from '@/utils';
import { DialogBase } from './dialog-base';

// ---------------------------------------------------------------------------
// Single chest item card (shop-style: icon + name + amount)
// ---------------------------------------------------------------------------

type ChestItemSlotProps = {
  item: ThreeItem;
  onTake: (itemId: number) => void;
};

function ChestItemSlot({ item, onTake }: ChestItemSlotProps) {
  const client = useClient();
  const { locale } = useLocale();
  const record = client.getEifRecordById(item.id);
  const graphicId = record?.graphicId ?? null;

  // Gold (item ID 1) uses the ground pile graphic that scales with amount
  const isGold = item.id === 1;
  const goldResourceId =
    isGold && graphicId !== null
      ? 100 + getItemGraphicId(1, graphicId, item.amount)
      : null;
  const goldUrl = useRawItemGfxUrl(goldResourceId);

  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      // Touch: single tap shows tooltip, double-tap takes
      if (e.pointerType === 'touch') {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          lastTapRef.current = 0;
          setTooltip(null);
          onTake(item.id);
          return;
        }
        lastTapRef.current = now;
        const el = slotRef.current;
        if (el) {
          const r = el.getBoundingClientRect();
          const x =
            r.right + 4 + 160 > window.innerWidth
              ? r.left - 4 - 160
              : r.right + 4;
          const y = Math.min(Math.max(r.top, 4), window.innerHeight - 80);
          setTooltip({ x, y });
        }
        return;
      }
      // Mouse: any button click takes the item
      if (e.button === 0 || e.button === 2) {
        onTake(item.id);
      }
    },
    [item.id, onTake],
  );

  const tooltipLines = (() => {
    if (!record) return [];
    const meta = getItemMeta(record);
    const qty = item.amount > 1 ? ` x${item.amount.toLocaleString()}` : '';
    return [record.name + qty, ...meta];
  })();

  const name =
    record?.name ?? locale.itemFallbackName.replace('{id}', String(item.id));

  return (
    <div
      ref={slotRef}
      class={`flex cursor-pointer select-none flex-col items-center gap-2 rounded border ${UI_PANEL_BORDER} ${UI_ITEM_BG} p-2 transition-colors hover:bg-base-content/10 active:bg-base-content/15`}
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        const r = el.getBoundingClientRect();
        const x =
          r.right + 4 + 160 > window.innerWidth
            ? r.left - 4 - 160
            : r.right + 4;
        const y = Math.min(Math.max(r.top, 4), window.innerHeight - 80);
        setTooltip({ x, y });
      }}
      onMouseLeave={() => setTooltip(null)}
    >
      <div
        class={`flex h-14 w-14 items-center justify-center overflow-hidden rounded border ${UI_PANEL_BORDER} bg-base-300 p-1.5 lg:h-16 lg:w-16`}
      >
        {isGold ? (
          goldUrl ? (
            <img
              src={goldUrl}
              alt=''
              class='h-10 w-10 object-contain lg:h-12 lg:w-12'
            />
          ) : (
            <div class='h-10 w-10 rounded bg-base-content/10' />
          )
        ) : graphicId === null ? (
          <div class='h-10 w-10 rounded bg-base-content/10' />
        ) : (
          <ItemIcon
            graphicId={graphicId}
            class='h-10 w-10 object-contain lg:h-12 lg:w-12'
          />
        )}
      </div>
      <div class='flex w-full flex-col items-center gap-0.5'>
        <span class='wrap-break-word line-clamp-2 w-full text-center font-medium text-xs leading-tight'>
          {name}
        </span>
        {item.amount > 1 && (
          <span class='text-[10px] tabular-nums opacity-60'>
            x{item.amount.toLocaleString()}
          </span>
        )}
      </div>

      {/* Tooltip portal */}
      {tooltip &&
        tooltipLines.length > 0 &&
        createPortal(
          <div
            class='pointer-events-none w-max max-w-40 rounded bg-base-300 px-2 py-1 text-xs shadow-lg'
            style={{
              position: 'fixed',
              left: tooltip.x,
              top: tooltip.y,
              zIndex: 9999,
            }}
          >
            {tooltipLines.map((line, i) => (
              <div key={i} class={i === 0 ? 'font-semibold' : 'opacity-70'}>
                {line}
              </div>
            ))}
          </div>,
          document.getElementById('ui') ?? document.body,
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChestDialog
// ---------------------------------------------------------------------------

export function ChestDialog() {
  const client = useClient();
  const { locale } = useLocale();
  const { currentDrag } = useItemDrag();

  const [items, setItems] = useState<ThreeItem[]>(
    () => client.chestController.items,
  );

  // Subscribe to chest updates
  useEffect(() => {
    const handleChanged = (newItems: ThreeItem[]) => setItems([...newItems]);
    client.chestController.subscribeChanged(handleChanged);
    return () => client.chestController.unsubscribeChanged(handleChanged);
  }, [client]);

  const handleTake = useCallback(
    (itemId: number) => {
      client.chestController.takeItem(itemId);
    },
    [client],
  );

  const isDragTarget = !!currentDrag && currentDrag.source === 'inventory';

  return (
    <DialogBase id='chest' title={locale.chestTitle} size='md'>
      <div
        data-chest-drop
        class={`relative min-h-20 p-2 transition-colors ${
          isDragTarget
            ? 'bg-primary/10 outline-dashed outline-2 outline-primary/40'
            : ''
        }`}
      >
        {items.length === 0 ? (
          <p class='py-4 text-center text-sm opacity-50'>{locale.chestEmpty}</p>
        ) : (
          <div class='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
            {items.map((item) => (
              <ChestItemSlot key={item.id} item={item} onTake={handleTake} />
            ))}
          </div>
        )}

        {isDragTarget && (
          <div class='pointer-events-none absolute inset-0 flex items-center justify-center'>
            <span class='rounded bg-primary/20 px-2 py-1 font-semibold text-primary text-xs'>
              {locale.chestDeposit}
            </span>
          </div>
        )}
      </div>
    </DialogBase>
  );
}
