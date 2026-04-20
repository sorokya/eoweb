import {
  Item,
  ShopBuyClientPacket,
  type ShopCraftItem,
  ShopCreateClientPacket,
  ShopSellClientPacket,
  type ShopSoldItem,
  type ShopTradeItem,
} from 'eolib';

import type { Client } from '@/client';
import { GOLD_ITEM_ID } from '@/consts';
import { EOResourceID } from '@/edf';
import { playSfxById, SfxId } from '@/sfx';
import { ChatIcon } from '@/ui/enums';

type OpenedSubscriber = (
  name: string,
  tradeItems: ShopTradeItem[],
  craftItems: ShopCraftItem[],
) => void;
type ChangedSubscriber = () => void;

export class ShopController {
  private client: Client;
  shopName = '';
  tradeItems: ShopTradeItem[] = [];
  craftItems: ShopCraftItem[] = [];

  private openedSubscribers: OpenedSubscriber[] = [];
  private changedSubscribers: ChangedSubscriber[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  subscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers.push(cb);
  }

  unsubscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers = this.openedSubscribers.filter((s) => s !== cb);
  }

  subscribeChanged(cb: ChangedSubscriber): void {
    this.changedSubscribers.push(cb);
  }

  unsubscribeChanged(cb: ChangedSubscriber): void {
    this.changedSubscribers = this.changedSubscribers.filter((s) => s !== cb);
  }

  handleOpened(
    sessionId: number,
    shopName: string,
    tradeItems: ShopTradeItem[],
    craftItems: ShopCraftItem[],
  ): void {
    this.client.sessionId = sessionId;
    this.shopName = shopName;
    this.tradeItems = tradeItems;
    this.craftItems = craftItems;

    this.client.emit('shopOpened', { name: shopName, tradeItems, craftItems });
    for (const cb of this.openedSubscribers)
      cb(shopName, tradeItems, craftItems);
  }

  notifyBought(
    goldAmount: number,
    boughtItem: Item,
    weightCurrent: number,
  ): void {
    this.client.inventoryController.setItem(GOLD_ITEM_ID, goldAmount);
    this.client.inventoryController.addItem(boughtItem.id, boughtItem.amount);
    this.client.weight.current = weightCurrent;
    this.client.emit('inventoryChanged', undefined);
    this.client.emit('itemBought', undefined);
    playSfxById(SfxId.BuySell);
    for (const cb of this.changedSubscribers) cb();

    const name = this.client.getEifRecordById(boughtItem.id)?.name ?? '';
    const msg = this.client.locale.shopBoughtMsg
      .replace('{amount}', String(boughtItem.amount))
      .replace('{name}', name);
    this.client.toastController.show(msg);
    this.client.emit('serverChat', { message: msg, icon: ChatIcon.Star });
  }

  notifySold(
    soldItem: ShopSoldItem,
    goldAmount: number,
    weightCurrent: number,
  ): void {
    this.client.inventoryController.setItem(GOLD_ITEM_ID, goldAmount);

    const prevAmount = this.client.inventoryController.getItemAmount(
      soldItem.id,
    );
    this.client.inventoryController.setItem(soldItem.id, soldItem.amount);
    this.client.weight.current = weightCurrent;
    this.client.emit('inventoryChanged', undefined);
    this.client.emit('itemSold', undefined);
    playSfxById(SfxId.BuySell);
    for (const cb of this.changedSubscribers) cb();

    const soldAmount = prevAmount - (soldItem.amount ?? 0);
    const name = this.client.getEifRecordById(soldItem.id)?.name ?? '';
    const msg = this.client.locale.shopSoldMsg
      .replace('{amount}', String(soldAmount > 0 ? soldAmount : 1))
      .replace('{name}', name);
    this.client.toastController.show(msg);
    this.client.emit('serverChat', { message: msg, icon: ChatIcon.DownArrow });
  }

  notifyCrafted(
    craftItemId: number,
    ingredients: Item[],
    weightCurrent: number,
  ): void {
    for (const ingredient of ingredients) {
      if (!ingredient.id) continue;
      this.client.inventoryController.setItem(ingredient.id, ingredient.amount);
    }

    this.client.inventoryController.addItem(craftItemId);
    this.client.weight.current = weightCurrent;
    this.client.emit('inventoryChanged', undefined);
    playSfxById(SfxId.Craft);
    for (const cb of this.changedSubscribers) cb();

    const name = this.client.getEifRecordById(craftItemId)?.name ?? '';
    const msg = this.client.locale.shopCraftedMsg.replace('{name}', name);
    this.client.toastController.showSuccess(msg);
    this.client.emit('serverChat', { message: msg, icon: ChatIcon.Trophy });
  }

  buyItem(itemId: number, maxAmount: number): void {
    if (maxAmount <= 0) return;

    const send = (amount: number) => {
      if (amount <= 0 || amount > maxAmount) return;
      this.sendBuyItem(itemId, amount);
    };

    if (maxAmount > 1) {
      const title = this.client.getResourceString(
        EOResourceID.DIALOG_TRANSFER_HOW_MUCH,
      );
      this.client.alertController.showAmount(
        title,
        this.getItemName(itemId),
        maxAmount,
        this.client.locale.shopBuyAction,
        (amount) => {
          if (amount !== null) send(amount);
        },
        this.client.locale.shopBuyAgainAction,
      );
      return;
    }

    send(1);
  }

  sellItem(itemId: number, maxAmount: number): void {
    if (maxAmount <= 0) return;

    const send = (amount: number) => {
      if (amount <= 0 || amount > maxAmount) return;
      this.sendSellItem(itemId, amount);
    };

    if (maxAmount > 1) {
      const title = this.client.getResourceString(
        EOResourceID.DIALOG_TRANSFER_HOW_MUCH,
      );
      this.client.alertController.showAmount(
        title,
        this.getItemName(itemId),
        maxAmount,
        this.client.locale.shopSellAction,
        (amount) => {
          if (amount !== null) send(amount);
        },
      );
      return;
    }

    send(1);
  }

  sellAllItem(itemId: number): void {
    const amount = this.client.inventoryController.getItemAmount(itemId);
    if (amount <= 0) return;
    this.sendSellItem(itemId, amount);
  }

  canCraft(item: ShopCraftItem): boolean {
    for (const ingredient of item.ingredients) {
      if (!ingredient.id || ingredient.amount <= 0) continue;
      if (
        this.client.inventoryController.getItemAmount(ingredient.id) <
        ingredient.amount
      ) {
        return false;
      }
    }
    return true;
  }

  craftItem(itemId: number): void {
    const packet = new ShopCreateClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.craftItemId = itemId;
    this.client.bus!.send(packet);
  }

  private sendBuyItem(itemId: number, amount: number): void {
    const packet = new ShopBuyClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.buyItem = new Item();
    packet.buyItem.id = itemId;
    packet.buyItem.amount = amount;
    this.client.bus!.send(packet);
  }

  private sendSellItem(itemId: number, amount: number): void {
    const packet = new ShopSellClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.sellItem = new Item();
    packet.sellItem.id = itemId;
    packet.sellItem.amount = amount;
    this.client.bus!.send(packet);
  }

  private getItemName(itemId: number): string {
    const record = this.client.getEifRecordById(itemId);
    if (record?.name) return record.name;
    return this.client.locale.itemFallbackName.replace('{id}', String(itemId));
  }
}
