import type { ThreeItem } from 'eolib';
import { createPortal } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useClient, useLocale } from '@/ui/context';
import { useItemDrag, useItemGfxUrl, usePillowGfxUrl } from '@/ui/in-game';
import { getItemMeta } from '@/utils';
import { DialogBase } from './dialog-base';

// ---------------------------------------------------------------------------
// Single chest item slot (pillow + shadow icon + name + amount)
// ---------------------------------------------------------------------------

type ChestItemSlotProps = {
  item: ThreeItem;
  pillow: string | null;
  onTake: (itemId: number) => void;
};

function ChestItemSlot({ item, pillow, onTake }: ChestItemSlotProps) {
  const client = useClient();
  const { locale } = useLocale();
  const record = client.getEifRecordById(item.id);
  const graphicId = record?.graphicId ?? null;
  const iconUrl = useItemGfxUrl(graphicId, { shadow: true });

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
  const amountLabel = item.amount > 1 ? item.amount.toLocaleString() : '';

  return (
    <div
      ref={slotRef}
      class='group relative flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-base-content/10 active:bg-base-content/15'
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
      {/* Icon slot with pillow bg */}
      <div class='relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-base-content/10 bg-base-200'>
        {pillow && (
          <img
            src={pillow}
            alt=''
            class='pointer-events-none absolute inset-0 h-full w-full object-contain p-0.5'
            draggable={false}
          />
        )}
        {iconUrl && (
          <img
            src={iconUrl}
            alt=''
            class='pointer-events-none relative z-10 max-h-full max-w-full object-contain p-0.5'
            draggable={false}
          />
        )}
        {!iconUrl && <div class='skeleton h-6 w-6' />}
      </div>

      {/* Name */}
      <span class='min-w-0 flex-1 truncate text-sm'>{name}</span>

      {/* Amount badge */}
      {amountLabel && (
        <span class='shrink-0 rounded bg-base-content/10 px-1 text-xs tabular-nums'>
          {amountLabel}
        </span>
      )}

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
  const pillow = usePillowGfxUrl();

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
    <DialogBase id='chest' title={locale.chestTitle} size='sm'>
      <div
        data-chest-drop
        class={`relative flex min-h-20 flex-col gap-0.5 py-1 transition-colors ${
          isDragTarget
            ? 'bg-primary/10 outline-dashed outline-2 outline-primary/40'
            : ''
        }`}
      >
        {items.length === 0 ? (
          <p class='py-4 text-center text-sm opacity-50'>{locale.chestEmpty}</p>
        ) : (
          items.map((item) => (
            <ChestItemSlot
              key={item.id}
              item={item}
              pillow={pillow}
              onTake={handleTake}
            />
          ))
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
