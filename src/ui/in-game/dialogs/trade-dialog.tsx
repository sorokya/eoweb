import type { Item } from 'eolib';
import { createPortal } from 'preact/compat';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { FaCheck, FaSearch, FaTimes } from 'react-icons/fa';
import { formatLocaleString } from '@/locale';
import { Button, ItemIcon } from '@/ui/components';
import { UI_BLUR, UI_ITEM_BG, UI_MODAL_BG, UI_PANEL_BORDER } from '@/ui/consts';
import { useClient, useLocale } from '@/ui/context';
import { useRawItemGfxUrl } from '@/ui/in-game';
import { capitalize, getItemGraphicId, getItemMeta } from '@/utils';
import { DialogBase } from './dialog-base';

function getDisplayName(
  client: ReturnType<typeof useClient>,
  itemId: number,
): string {
  return (
    client.getEifRecordById(itemId)?.name ??
    client.locale.itemFallbackName.replace('{id}', String(itemId))
  );
}

function getGraphicId(
  client: ReturnType<typeof useClient>,
  itemId: number,
): number | null {
  return client.getEifRecordById(itemId)?.graphicId ?? null;
}

type TradeItemSlotProps = {
  item: Item;
  onRemove?: (itemId: number) => void;
  showRemove?: boolean;
};

function TradeItemSlot({
  item,
  onRemove,
  showRemove = false,
}: TradeItemSlotProps) {
  const client = useClient();
  const record = client.getEifRecordById(item.id);
  const graphicId = record?.graphicId ?? null;
  const name = getDisplayName(client, item.id);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const isGold = item.id === 1;
  const goldResourceId =
    isGold && graphicId !== null
      ? 100 + getItemGraphicId(1, graphicId, item.amount)
      : null;
  const goldUrl = useRawItemGfxUrl(goldResourceId);

  const getTooltipLines = (): string[] => {
    if (!record) return [];
    const meta = getItemMeta(record);
    const qty = item.amount > 1 ? ` x${item.amount.toLocaleString()}` : '';
    return [record.name + qty, ...meta];
  };

  return (
    <div
      class={`relative flex flex-col items-center gap-1 rounded border ${UI_PANEL_BORDER} ${UI_ITEM_BG} p-1`}
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
      {showRemove && onRemove && (
        <button
          type='button'
          class='btn btn-circle btn-xs btn-error absolute top-1 right-1 flex h-6 min-h-6 w-6 items-center justify-center'
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${name}`}
        >
          <FaTimes size={10} />
        </button>
      )}
      {tooltip &&
        (() => {
          const lines = getTooltipLines();
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

type ItemPickerModalProps = {
  onClose: () => void;
  onSelect: (itemId: number) => void;
};

function ItemPickerModal({ onClose, onSelect }: ItemPickerModalProps) {
  const client = useClient();
  const { locale } = useLocale();
  const [search, setSearch] = useState('');

  const inventoryItems = client.inventoryController.items;

  const filteredItems = useMemo(() => {
    if (!search.trim()) return inventoryItems;
    const query = search.toLowerCase();
    return inventoryItems.filter((item) => {
      const name = getDisplayName(client, item.id).toLowerCase();
      return name.includes(query);
    });
  }, [inventoryItems, search, client]);

  const handleItemClick = useCallback(
    (item: Item) => {
      onClose();
      onSelect(item.id);
    },
    [onClose, onSelect],
  );

  return createPortal(
    <dialog
      class='modal modal-bottom sm:modal-middle'
      open
      style={{ background: 'transparent' }}
    >
      <div
        class={`modal-box ${UI_MODAL_BG} ${UI_BLUR} flex flex-col gap-2 p-4`}
      >
        <div class='flex items-center justify-between'>
          <h3 class='font-bold text-lg'>{locale.tradeAddItem}</h3>
          <Button
            variant={['xs', 'ghost']}
            onClick={onClose}
            aria-label={locale.dialogClose}
          >
            <FaTimes size={16} />
          </Button>
        </div>
        <div class='relative'>
          <span class='absolute top-1/2 left-3 -translate-y-1/2 text-base-content/50'>
            <FaSearch size={14} />
          </span>
          <input
            type='text'
            class='input input-bordered input-sm w-full pl-9'
            placeholder={locale.tradeSearchPlaceholder}
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            autoFocus
          />
        </div>
        <div class='max-h-64 overflow-y-auto'>
          {filteredItems.length === 0 ? (
            <p class='py-4 text-center text-base-content/50 text-sm'>
              {search ? locale.cmdNoResults : locale.chestEmpty}
            </p>
          ) : (
            <div class='grid grid-cols-2 gap-2 sm:grid-cols-3'>
              {filteredItems.map((item) => {
                const graphicId = getGraphicId(client, item.id);
                const name = getDisplayName(client, item.id);
                return (
                  <button
                    key={item.id}
                    type='button'
                    class={`flex cursor-pointer items-center gap-2 rounded border ${UI_PANEL_BORDER} ${UI_ITEM_BG} p-2 text-left transition-colors hover:bg-base-content/10 active:bg-base-content/15`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div
                      class={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border ${UI_PANEL_BORDER} bg-base-300`}
                    >
                      {graphicId === null ? (
                        <div class='h-8 w-8 rounded bg-base-content/10' />
                      ) : (
                        <ItemIcon
                          graphicId={graphicId}
                          class='h-8 w-8 object-contain'
                        />
                      )}
                    </div>
                    <div class='min-w-0 flex-1'>
                      <p class='wrap-break-word line-clamp-1 font-medium text-xs'>
                        {name}
                      </p>
                      {item.amount > 1 && (
                        <p class='text-[10px] tabular-nums opacity-60'>
                          x{item.amount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <form method='dialog' class='modal-backdrop'>
        <button type='button' onClick={onClose}>
          close
        </button>
      </form>
    </dialog>,
    document.getElementById('ui') ?? document.body,
  );
}

export function TradeDialog() {
  const client = useClient();
  const { locale } = useLocale();
  const tc = client.tradeController;

  const [state, setState] = useState({
    partnerName: tc.partnerName,
    partnerItems: tc.partnerItems,
    partnerAgreed: tc.partnerAgreed,
    playerItems: tc.playerItems,
    playerAgreed: tc.playerAgreed,
    scam: tc.scam,
  });
  const [showItemPicker, setShowItemPicker] = useState(false);

  useEffect(() => {
    const update = () => {
      setState({
        partnerName: tc.partnerName,
        partnerItems: [...tc.partnerItems],
        partnerAgreed: tc.partnerAgreed,
        playerItems: [...tc.playerItems],
        playerAgreed: tc.playerAgreed,
        scam: tc.scam,
      });
    };
    tc.subscribe(update);
    return () => tc.unsubscribe(update);
  }, [tc]);

  const handleAddItem = useCallback(
    (itemId: number) => {
      const invItem = client.inventoryController.getItemById(itemId);
      if (!invItem) return;

      const send = (amount: number) => {
        tc.addItem(itemId, amount);
      };

      if (invItem.amount > 1) {
        const title = locale.tradeDropHowMany;
        const itemName = getDisplayName(client, itemId);
        client.alertController.showAmount(
          title,
          itemName,
          invItem.amount,
          locale.tradeDrop,
          (amount) => {
            if (amount !== null && amount > 0) send(amount);
          },
        );
      } else {
        send(1);
      }
    },
    [client, tc, locale],
  );

  const handleRemoveItem = useCallback(
    (itemId: number) => {
      tc.removeItem(itemId);
    },
    [tc],
  );

  const handleAgree = useCallback(() => {
    tc.agree(true);
  }, [tc]);

  const handleCancel = useCallback(() => {
    if (state.playerAgreed) {
      tc.agree(false);
    } else {
      tc.cancel();
    }
  }, [tc, state.playerAgreed]);

  const title = state.partnerName
    ? `${locale.tradeTitle} - ${capitalize(state.partnerName)}`
    : locale.tradeTitle;

  return (
    <DialogBase id='trade' title={title} size='md' avoidBottom>
      <div class='flex flex-col gap-3 p-2'>
        {state.scam && (
          <div class='alert alert-error py-2 text-sm' role='alert'>
            <span>{locale.tradeScamWarning}</span>
          </div>
        )}

        <div class='flex flex-col gap-2'>
          <div class='flex items-center gap-2'>
            <span class='font-medium text-sm'>
              {capitalize(state.partnerName)}
            </span>
            {state.partnerAgreed && (
              <span class='badge badge-success gap-1 py-1'>
                <FaCheck size={10} />
                {locale.tradeAgreed}
              </span>
            )}
          </div>
          <div class='min-h-16 rounded border border-base-content/10 bg-base-300/50 p-2'>
            {state.partnerItems.length === 0 ? (
              <p class='py-2 text-center text-base-content/50 text-sm'>
                {formatLocaleString(locale.tradePartnerNoItems, {
                  name: capitalize(state.partnerName),
                })}
              </p>
            ) : (
              <div class='grid grid-cols-3 gap-2 sm:grid-cols-4'>
                {state.partnerItems.map((item, i) => (
                  <TradeItemSlot
                    key={`partner-${item.id}-${i}`}
                    item={item}
                    showRemove={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div class='flex flex-col gap-2'>
          <div class='flex items-center gap-2'>
            <span class='font-medium text-sm'>{locale.tradeYourItems}</span>
            {state.playerAgreed && (
              <span class='badge badge-success gap-1 py-1'>
                <FaCheck size={10} />
                {locale.tradeAgreed}
              </span>
            )}
          </div>
          <div
            class='min-h-16 rounded border border-base-content/10 bg-base-300/50 p-2'
            data-trade-drop
          >
            {state.playerItems.length === 0 ? (
              <p class='py-2 text-center text-base-content/50 text-sm'>
                {locale.tradeYourNoItems}
              </p>
            ) : (
              <div class='grid grid-cols-3 gap-2 sm:grid-cols-4'>
                {state.playerItems.map((item, i) => (
                  <TradeItemSlot
                    key={`player-${item.id}-${i}`}
                    item={item}
                    showRemove={true}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>
            )}
          </div>
          <Button
            variant={['sm', 'outline']}
            class='w-full'
            onClick={() => setShowItemPicker(true)}
          >
            {locale.tradeAddItem}
          </Button>
        </div>

        <div class='flex justify-end gap-2'>
          <Button variant='outline' onClick={handleCancel}>
            {state.playerAgreed ? locale.btnUnagree : locale.btnCancel}
          </Button>
          <Button
            variant='primary'
            onClick={handleAgree}
            disabled={state.playerAgreed || state.playerItems.length === 0}
          >
            {locale.tradeAgree}
          </Button>
        </div>
      </div>

      {showItemPicker && (
        <ItemPickerModal
          onClose={() => setShowItemPicker(false)}
          onSelect={handleAddItem}
        />
      )}
    </DialogBase>
  );
}
