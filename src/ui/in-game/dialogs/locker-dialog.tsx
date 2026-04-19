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
import { useClient, useLocale } from '@/ui/context';
import { useItemDrag, useItemGfxUrl, usePillowGfxUrl } from '@/ui/in-game';
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

// Pillow is a ground tile: 64 wide x 32 tall (TILE_WIDTH x TILE_HEIGHT)
const PILLOW_W = 64;
const PILLOW_H = 32;

// ---------------------------------------------------------------------------
// Single locker item slot (grid cell: pillow bg + icon + amount)
// ---------------------------------------------------------------------------

type LockerItemSlotProps = {
  item: ThreeItem;
  pillow: string | null;
  onTake: (itemId: number) => void;
};

function LockerItemSlot({ item, pillow, onTake }: LockerItemSlotProps) {
  const client = useClient();
  const { locale } = useLocale();
  const record = client.getEifRecordById(item.id);
  const graphicId = record?.graphicId ?? null;
  const iconUrl = useItemGfxUrl(graphicId, { shadow: true });

  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);

  const name =
    record?.name ?? locale.itemFallbackName.replace('{id}', String(item.id));

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
      title={name}
      class='group relative flex cursor-pointer select-none flex-col items-center rounded border border-base-content/10 bg-base-200 p-1 transition-colors hover:bg-base-content/10 active:bg-base-content/15'
      style={{ width: PILLOW_W + 8, minHeight: PILLOW_H + 24 }}
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setTooltip(null)}
    >
      {/* Pillow + icon at native 64x32 tile aspect ratio */}
      <div
        class='relative shrink-0 overflow-hidden'
        style={{ width: PILLOW_W, height: PILLOW_H }}
      >
        {pillow && (
          <img
            src={pillow}
            alt=''
            class='pointer-events-none absolute inset-0 h-full w-full object-fill'
            draggable={false}
          />
        )}
        {iconUrl && (
          <img
            src={iconUrl}
            alt=''
            class='pointer-events-none absolute inset-0 m-auto max-h-full max-w-full object-contain p-0.5'
            draggable={false}
          />
        )}
        {!iconUrl && (
          <div class='absolute inset-0 flex items-center justify-center'>
            <div class='skeleton h-6 w-6' />
          </div>
        )}
      </div>

      {/* Always show quantity */}
      <span class='mt-0.5 w-full truncate text-center text-[10px] tabular-nums leading-none opacity-80'>
        {item.amount.toLocaleString()}
      </span>

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
      return locale.lockerFilterAll;
    case 'weapon':
      return locale.lockerFilterWeapon;
    case 'armor':
      return locale.lockerFilterArmor;
    case 'accessory':
      return locale.lockerFilterAccessory;
    case 'consumable':
      return locale.lockerFilterConsumable;
    case 'other':
      return locale.lockerFilterOther;
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
  const pillow = usePillowGfxUrl();

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
    <DialogBase id='locker' title={locale.lockerTitle} size='md'>
      {/* Search + filter bar */}
      <div class='flex flex-col gap-1 border-base-content/10 border-b px-2 pt-1 pb-2'>
        <label class='input input-xs input-bordered flex items-center gap-2'>
          <FaSearch size={10} />
          <input
            type='search'
            placeholder={locale.lockerSearchPlaceholder}
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
            {items.length === 0 ? locale.lockerEmpty : locale.lockerFilterAll}
          </p>
        ) : (
          <div class='flex flex-wrap gap-1'>
            {filteredItems.map((item) => (
              <LockerItemSlot
                key={item.id}
                item={item}
                pillow={pillow}
                onTake={handleTake}
              />
            ))}
          </div>
        )}

        {isDragTarget && (
          <div class='pointer-events-none absolute inset-0 flex items-center justify-center'>
            <span class='rounded bg-primary/20 px-2 py-1 font-semibold text-primary text-xs'>
              {locale.lockerDeposit}
            </span>
          </div>
        )}
      </div>
    </DialogBase>
  );
}
