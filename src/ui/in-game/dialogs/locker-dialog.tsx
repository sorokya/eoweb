import { ItemType, type ThreeItem } from 'eolib';
import { createPortal } from 'preact/compat';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import { FaFilter, FaSearch } from 'react-icons/fa';
import { playSfxById, SfxId } from '@/sfx';
import { ItemIcon } from '@/ui/components';
import { UI_ITEM_BG, UI_PANEL_BORDER } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { useItemDrag } from '@/ui/in-game';
import { getItemMeta } from '@/utils';
import { DialogBase } from './dialog-base';

// ---------------------------------------------------------------------------
// Item type filter categories
// ---------------------------------------------------------------------------

type FilterCategory =
  | 'all'
  | 'weapon'
  | 'armor'
  | 'accessory'
  | 'consumable'
  | 'other';

const WEAPON_TYPES = new Set([ItemType.Weapon]);

const ARMOR_TYPES = new Set([
  ItemType.Armor,
  ItemType.Hat,
  ItemType.Boots,
  ItemType.Gloves,
  ItemType.Belt,
  ItemType.Shield,
]);

const ACCESSORY_TYPES = new Set([
  ItemType.Accessory,
  ItemType.Ring,
  ItemType.Armlet,
  ItemType.Bracer,
  ItemType.Necklace,
]);

const CONSUMABLE_TYPES = new Set([
  ItemType.Heal,
  ItemType.Alcohol,
  ItemType.EffectPotion,
  ItemType.CureCurse,
  ItemType.Teleport,
  ItemType.ExpReward,
  ItemType.HairDye,
]);

function getCategory(type: ItemType): FilterCategory {
  if (WEAPON_TYPES.has(type)) return 'weapon';
  if (ARMOR_TYPES.has(type)) return 'armor';
  if (ACCESSORY_TYPES.has(type)) return 'accessory';
  if (CONSUMABLE_TYPES.has(type)) return 'consumable';
  return 'other';
}

// ---------------------------------------------------------------------------
// Single locker item card (shop-style: icon + name + amount)
// ---------------------------------------------------------------------------

type LockerItemSlotProps = {
  item: ThreeItem;
  onTake: (itemId: number) => void;
};

function LockerItemSlot({ item, onTake }: LockerItemSlotProps) {
  const client = useClient();
  const { locale } = useLocale();
  const record = client.getEifRecordById(item.id);
  const graphicId = record?.graphicId ?? null;

  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);

  const name =
    record?.name ??
    locale.shared.itemFallbackName.replace('{id}', String(item.id));

  const tooltipLines = (() => {
    if (!record) return [];
    const meta = getItemMeta(record);
    return [`${record.name} x${item.amount.toLocaleString()}`, ...meta];
  })();

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
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
            r.right + 4 + 200 > window.innerWidth
              ? r.left - 4 - 200
              : r.right + 4;
          const y = Math.min(Math.max(r.top, 4), window.innerHeight - 80);
          setTooltip({ x, y });
        }
        return;
      }
      if (e.button === 0 || e.button === 2) {
        onTake(item.id);
      }
    },
    [item.id, onTake],
  );

  const showTooltip = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const x =
      r.right + 4 + 200 > window.innerWidth ? r.left - 4 - 200 : r.right + 4;
    const y = Math.min(Math.max(r.top, 4), window.innerHeight - 80);
    setTooltip({ x, y });
  };

  return (
    <div
      ref={slotRef}
      class={`flex cursor-pointer select-none flex-col items-center gap-2 rounded border ${UI_PANEL_BORDER} ${UI_ITEM_BG} p-2 transition-colors hover:bg-base-content/10 active:bg-base-content/15`}
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setTooltip(null)}
    >
      <div
        class={`flex h-14 w-14 items-center justify-center overflow-hidden rounded border ${UI_PANEL_BORDER} bg-base-300 p-1.5 lg:h-16 lg:w-16`}
      >
        {graphicId === null ? (
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
        <span class='text-[10px] tabular-nums opacity-60'>
          x{item.amount.toLocaleString()}
        </span>
      </div>

      {/* Tooltip portal */}
      {tooltip &&
        tooltipLines.length > 0 &&
        createPortal(
          <div
            class='pointer-events-none w-max max-w-48 rounded bg-base-300 px-2 py-1 text-xs shadow-lg'
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
// LockerDialog
// ---------------------------------------------------------------------------

const FILTER_CATEGORIES: FilterCategory[] = [
  'all',
  'weapon',
  'armor',
  'accessory',
  'consumable',
  'other',
];

function useCategoryLabel(category: FilterCategory) {
  const { locale } = useLocale();
  switch (category) {
    case 'all':
      return locale.locker.filterAll;
    case 'weapon':
      return locale.locker.filterWeapon;
    case 'armor':
      return locale.locker.filterArmor;
    case 'accessory':
      return locale.locker.filterAccessory;
    case 'consumable':
      return locale.locker.filterConsumable;
    case 'other':
      return locale.locker.filterOther;
  }
}

function FilterPill({
  category,
  active,
  count,
  onClick,
}: {
  category: FilterCategory;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const label = useCategoryLabel(category);
  return (
    <button
      type='button'
      class={`rounded-full px-2 py-0.5 text-xs transition-colors ${
        active
          ? 'bg-primary text-primary-content'
          : 'bg-base-content/10 hover:bg-base-content/20'
      }`}
      onClick={() => {
        playSfxById(SfxId.ButtonClick);
        onClick();
      }}
    >
      {label}
      <span class='ml-1 opacity-60'>({count})</span>
    </button>
  );
}

export function LockerDialog() {
  const client = useClient();
  const { locale } = useLocale();
  const { currentDrag } = useItemDrag();

  const [items, setItems] = useState<ThreeItem[]>(
    () => client.lockerController.items,
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterCategory>('all');

  useEffect(() => {
    const handleChanged = (newItems: ThreeItem[]) => setItems([...newItems]);
    client.lockerController.subscribeChanged(handleChanged);
    return () => client.lockerController.unsubscribeChanged(handleChanged);
  }, [client]);

  const handleTake = useCallback(
    (itemId: number) => {
      client.lockerController.takeItem(itemId);
    },
    [client],
  );

  // Count items per category (for filter pill badges)
  const categoryCounts = useMemo(() => {
    const counts: Record<FilterCategory, number> = {
      all: items.length,
      weapon: 0,
      armor: 0,
      accessory: 0,
      consumable: 0,
      other: 0,
    };
    for (const item of items) {
      const record = client.getEifRecordById(item.id);
      if (record) {
        counts[getCategory(record.type)]++;
      } else {
        counts.other++;
      }
    }
    return counts;
  }, [items, client]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const record = client.getEifRecordById(item.id);
      if (!record)
        return filter === 'all' && (!q || String(item.id).includes(q));
      if (filter !== 'all' && getCategory(record.type) !== filter) return false;
      if (q && !record.name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, filter, client]);

  const isDragTarget = !!currentDrag && currentDrag.source === 'inventory';

  return (
    <DialogBase id='locker' title={locale.locker.title} size='md'>
      {/* Search + filter bar */}
      <div
        class={`flex flex-col gap-1 ${UI_PANEL_BORDER} border-b px-2 pt-1 pb-2`}
      >
        <label class='input input-xs input-bordered flex items-center gap-2'>
          <FaSearch size={10} />
          <input
            type='search'
            placeholder={locale.locker.searchPlaceholder}
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.stopPropagation()}
            class='grow'
          />
        </label>
        <div class='flex items-center gap-1'>
          <FaFilter size={10} />
          <div class='flex flex-wrap gap-1'>
            {FILTER_CATEGORIES.map((cat) => (
              <FilterPill
                key={cat}
                category={cat}
                active={filter === cat}
                count={categoryCounts[cat]}
                onClick={() => setFilter(cat)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable grid drop zone */}
      <div
        data-locker-drop
        class={`relative max-h-72 min-h-24 overflow-y-auto p-2 transition-colors ${
          isDragTarget
            ? 'bg-primary/10 outline-dashed outline-2 outline-primary/40'
            : ''
        }`}
      >
        {filteredItems.length === 0 ? (
          <p class='py-4 text-center text-sm opacity-50'>
            {items.length === 0 ? locale.locker.empty : locale.locker.filterAll}
          </p>
        ) : (
          <div class='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
            {filteredItems.map((item) => (
              <LockerItemSlot key={item.id} item={item} onTake={handleTake} />
            ))}
          </div>
        )}

        {isDragTarget && (
          <div class='pointer-events-none absolute inset-0 flex items-center justify-center'>
            <span class='rounded bg-primary/20 px-2 py-1 font-semibold text-primary text-xs'>
              {locale.locker.deposit}
            </span>
          </div>
        )}
      </div>
    </DialogBase>
  );
}
