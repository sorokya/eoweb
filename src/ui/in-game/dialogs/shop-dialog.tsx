import type { ShopCraftItem, ShopTradeItem } from 'eolib';
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  FaDollarSign,
  FaHammer,
  FaShoppingBasket,
  FaShoppingCart,
} from 'react-icons/fa';
import type { Client } from '@/client';
import { Button, ItemIcon, Tabs } from '@/ui/components';
import { useClient, useLocale } from '@/ui/context';
import { DialogBase } from './dialog-base';

type ShopTabId = 'buy' | 'sell' | 'craft';

function getDisplayName(client: Client, itemId: number): string {
  return (
    client.getEifRecordById(itemId)?.name ??
    client.locale.itemFallbackName.replace('{id}', String(itemId))
  );
}

function getGraphicId(client: Client, itemId: number): number | null {
  return client.getEifRecordById(itemId)?.graphicId ?? null;
}

export function ShopDialog() {
  const client = useClient();
  const { locale } = useLocale();

  const [activeTab, setActiveTab] = useState<ShopTabId>('buy');
  const [shopName, setShopName] = useState(
    () => client.shopController.shopName,
  );
  const [tradeItems, setTradeItems] = useState<ShopTradeItem[]>(
    () => client.shopController.tradeItems,
  );
  const [craftItems, setCraftItems] = useState<ShopCraftItem[]>(
    () => client.shopController.craftItems,
  );
  const [inventoryTick, setInventoryTick] = useState(0);

  useEffect(() => {
    const handleOpened = (
      name: string,
      newTradeItems: ShopTradeItem[],
      newCraftItems: ShopCraftItem[],
    ) => {
      setShopName(name);
      setTradeItems([...newTradeItems]);
      setCraftItems([...newCraftItems]);

      if (newTradeItems.some((i) => i.buyPrice > 0)) {
        setActiveTab('buy');
      } else if (newTradeItems.some((i) => i.sellPrice > 0)) {
        setActiveTab('sell');
      } else {
        setActiveTab('craft');
      }
    };

    const handleChanged = () => {
      setTradeItems([...client.shopController.tradeItems]);
      setCraftItems([...client.shopController.craftItems]);
    };

    const handleInventoryChanged = () => {
      setInventoryTick((v) => v + 1);
    };

    client.shopController.subscribeOpened(handleOpened);
    client.shopController.subscribeChanged(handleChanged);
    client.on('inventoryChanged', handleInventoryChanged);

    return () => {
      client.shopController.unsubscribeOpened(handleOpened);
      client.shopController.unsubscribeChanged(handleChanged);
      client.off('inventoryChanged', handleInventoryChanged);
    };
  }, [client]);

  const goldOnHand = client.items.find((item) => item.id === 1)?.amount ?? 0;

  const tradeByItemId = useMemo(
    () => new Map(tradeItems.map((item) => [item.itemId, item])),
    [tradeItems],
  );

  const buyItems = useMemo(
    () => tradeItems.filter((item) => item.buyPrice > 0),
    [tradeItems],
  );

  const sellItems = useMemo(
    () =>
      client.items
        .filter(
          (inventoryItem) =>
            (tradeByItemId.get(inventoryItem.id)?.sellPrice ?? 0) > 0,
        )
        .sort((a, b) =>
          getDisplayName(client, a.id).localeCompare(
            getDisplayName(client, b.id),
          ),
        ),
    [client, tradeByItemId, inventoryTick],
  );

  const tabs = [
    {
      id: 'buy',
      label: (
        <span class='flex items-center gap-1'>
          <FaShoppingCart size={11} />
          {locale.shopTabBuy}
        </span>
      ),
    },
    {
      id: 'sell',
      label: (
        <span class='flex items-center gap-1'>
          <FaDollarSign size={11} />
          {locale.shopTabSell}
        </span>
      ),
    },
    {
      id: 'craft',
      label: (
        <span class='flex items-center gap-1'>
          <FaHammer size={11} />
          {locale.shopTabCraft}
        </span>
      ),
    },
  ];

  const title = shopName.trim()
    ? `${locale.shopTitle} - ${shopName}`
    : locale.shopTitle;

  return (
    <DialogBase id='shop' title={title} size='lg'>
      <div class='flex flex-col'>
        <div class='sticky top-0 z-10 border-base-content/10 border-b bg-base-300/90 px-2 pt-1 pb-1 backdrop-blur-sm'>
          <div class='overflow-x-auto'>
            <Tabs
              name='shop'
              items={tabs}
              activeId={activeTab}
              onSelect={(id) => setActiveTab(id as ShopTabId)}
              style='border'
              size='xs'
            />
          </div>
        </div>

        {activeTab === 'buy' && (
          <div class='p-2'>
            {buyItems.length === 0 && (
              <p class='py-4 text-center text-base-content/50 text-sm'>
                {locale.shopBuyEmpty}
              </p>
            )}

            <div class='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
              {buyItems.map((tradeItem) => {
                const maxByGold =
                  tradeItem.buyPrice > 0
                    ? Math.floor(goldOnHand / tradeItem.buyPrice)
                    : 0;
                const maxAmount = Math.min(tradeItem.maxBuyAmount, maxByGold);
                const canBuy = maxAmount > 0;
                const graphicId = getGraphicId(client, tradeItem.itemId);

                return (
                  <div
                    key={`buy-${tradeItem.itemId}`}
                    class='rounded border border-base-content/10 bg-base-200 p-2'
                  >
                    <div class='flex flex-col items-center gap-2'>
                      <div class='flex h-16 w-16 items-center justify-center overflow-hidden rounded border border-base-content/10 bg-base-300 p-2 lg:h-20 lg:w-20'>
                        {graphicId === null ? (
                          <div class='h-14 w-14 rounded bg-base-content/10' />
                        ) : (
                          <ItemIcon
                            graphicId={graphicId}
                            class='h-12 w-12 object-contain lg:h-16 lg:w-16'
                          />
                        )}
                      </div>
                      <p class='wrap-break-word line-clamp-2 w-full text-center font-semibold text-sm'>
                        {getDisplayName(client, tradeItem.itemId)}
                      </p>
                      <p class='w-full text-center text-base-content/60 text-xs'>
                        {locale.shopBuyPrice}:{' '}
                        {tradeItem.buyPrice.toLocaleString()}
                      </p>
                      <Button
                        variant={['xs', canBuy ? 'primary' : 'disabled']}
                        class='w-full'
                        onClick={() =>
                          client.shopController.buyItem(
                            tradeItem.itemId,
                            maxAmount,
                          )
                        }
                        disabled={!canBuy}
                      >
                        <FaShoppingCart size={11} />
                        {locale.shopBuyAction}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'sell' && (
          <div class='p-2'>
            {sellItems.length === 0 && (
              <p class='py-4 text-center text-base-content/50 text-sm'>
                {locale.shopSellEmpty}
              </p>
            )}

            <div class='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
              {sellItems.map((inventoryItem) => {
                const tradeItem = tradeByItemId.get(inventoryItem.id);
                const graphicId = getGraphicId(client, inventoryItem.id);

                return (
                  <div
                    key={`sell-${inventoryItem.id}`}
                    class='rounded border border-base-content/10 bg-base-200 p-2'
                  >
                    <div class='flex flex-col items-center gap-2'>
                      <div class='flex h-16 w-16 items-center justify-center overflow-hidden rounded border border-base-content/10 bg-base-300 p-2 lg:h-20 lg:w-20'>
                        {graphicId === null ? (
                          <div class='h-14 w-14 rounded bg-base-content/10' />
                        ) : (
                          <ItemIcon
                            graphicId={graphicId}
                            class='h-12 w-12 object-contain lg:h-16 lg:w-16'
                          />
                        )}
                      </div>
                      <p class='wrap-break-word line-clamp-2 w-full text-center font-semibold text-sm'>
                        {getDisplayName(client, inventoryItem.id)}
                      </p>
                      <p class='w-full text-center text-base-content/60 text-xs'>
                        {locale.shopSellPrice}:{' '}
                        {(tradeItem?.sellPrice ?? 0).toLocaleString()}
                        <br />
                        {locale.shopYouHave}:{' '}
                        {inventoryItem.amount.toLocaleString()}
                      </p>
                      <Button
                        variant={['xs', 'secondary']}
                        class='w-full'
                        onClick={() =>
                          client.shopController.sellItem(
                            inventoryItem.id,
                            inventoryItem.amount,
                          )
                        }
                      >
                        <FaDollarSign size={11} />
                        {locale.shopSellAction}
                      </Button>
                      <Button
                        variant={['xs', 'outline']}
                        class='w-full'
                        onClick={() =>
                          client.shopController.sellAllItem(inventoryItem.id)
                        }
                      >
                        <FaShoppingBasket size={11} />
                        {locale.shopSellAllAction}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'craft' && (
          <div class='space-y-1 p-2'>
            {craftItems.length === 0 && (
              <p class='py-4 text-center text-base-content/50 text-sm'>
                {locale.shopCraftEmpty}
              </p>
            )}

            {craftItems.map((craftItem) => {
              const canCraft = client.shopController.canCraft(craftItem);
              const craftedGraphicId = getGraphicId(client, craftItem.itemId);
              const ingredients = craftItem.ingredients.filter(
                (item) => item.id > 0 && item.amount > 0,
              );

              return (
                <div
                  key={`craft-${craftItem.itemId}`}
                  class='rounded border border-base-content/10 bg-base-200 p-2'
                >
                  <div class='grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3'>
                    <div class='flex flex-col items-center gap-2'>
                      <div class='flex h-22 w-22 shrink-0 items-center justify-center overflow-hidden rounded border border-base-content/10 bg-base-300 p-2'>
                        {craftedGraphicId === null ? (
                          <div class='h-14 w-14 rounded bg-base-content/10' />
                        ) : (
                          <ItemIcon
                            graphicId={craftedGraphicId}
                            class='h-16 w-16 object-contain'
                          />
                        )}
                      </div>
                      <p class='w-full text-center font-semibold text-sm leading-tight'>
                        {getDisplayName(client, craftItem.itemId)}
                      </p>
                      <Button
                        variant={['xs', canCraft ? 'accent' : 'disabled']}
                        class='w-full'
                        onClick={() =>
                          client.shopController.craftItem(craftItem.itemId)
                        }
                        disabled={!canCraft}
                      >
                        <FaHammer size={11} />
                        {locale.shopCraftAction}
                      </Button>
                    </div>

                    <div class='space-y-1'>
                      <p class='text-base-content/60 text-xs'>
                        {locale.shopIngredients}
                      </p>
                      {ingredients.length === 0 ? (
                        <p class='text-base-content/50 text-xs'>
                          {locale.shopNoIngredients}
                        </p>
                      ) : (
                        <table class='table-zebra table-xs table w-full rounded border border-base-content/10'>
                          <tbody>
                            {ingredients.map((ingredient, index) => {
                              const owned =
                                client.items.find((i) => i.id === ingredient.id)
                                  ?.amount ?? 0;
                              const ingredientGraphicId = getGraphicId(
                                client,
                                ingredient.id,
                              );
                              const enough = owned >= ingredient.amount;
                              return (
                                <tr
                                  key={`${craftItem.itemId}-${ingredient.id}-${index}`}
                                >
                                  <td class='w-8'>
                                    <div class='flex h-6 w-6 items-center justify-center overflow-hidden rounded border border-base-content/10 bg-base-300'>
                                      {ingredientGraphicId === null ? (
                                        <div class='h-4 w-4 rounded bg-base-content/10' />
                                      ) : (
                                        <ItemIcon
                                          graphicId={ingredientGraphicId}
                                          class='h-5 w-5 object-contain'
                                        />
                                      )}
                                    </div>
                                  </td>
                                  <td class='truncate'>
                                    {getDisplayName(client, ingredient.id)}
                                  </td>
                                  <td
                                    class={`text-right tabular-nums ${
                                      enough ? 'text-success' : 'text-error'
                                    }`}
                                  >
                                    {owned.toLocaleString()}/
                                    {ingredient.amount.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DialogBase>
  );
}
