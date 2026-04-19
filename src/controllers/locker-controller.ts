import {
  Coords,
  Item,
  ItemType,
  LockerAddClientPacket,
  LockerBuyClientPacket,
  LockerOpenClientPacket,
  LockerTakeClientPacket,
  MapTileSpec,
  ThreeItem,
} from 'eolib';

import type { Client } from '@/client';
import { DialogResourceID, EOResourceID } from '@/edf';
import { playSfxById, SfxId } from '@/sfx';
import { ChatIcon } from '@/ui/enums';
import type { Vector2 } from '@/vector';

type OpenedSubscriber = (items: ThreeItem[]) => void;
type ChangedSubscriber = (items: ThreeItem[]) => void;

export class LockerController {
  private client: Client;
  lockerCoords = new Coords();
  items: ThreeItem[] = [];

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

  handleOpened(coords: Coords, items: ThreeItem[]): void {
    playSfxById(SfxId.ChestOpen);
    this.lockerCoords = coords;
    this.items = items;
    for (const cb of this.openedSubscribers) cb(items);
  }

  notifyLockerItemTaken(
    lockerItems: ThreeItem[],
    takenItemId: number,
    takenItemAmount: number,
    weightCurrent: number,
  ): void {
    this.client.weight.current = weightCurrent;

    const existing = this.client.items.find((i) => i.id === takenItemId);
    if (existing) {
      existing.amount += takenItemAmount;
    } else {
      const item = new Item();
      item.id = takenItemId;
      item.amount = takenItemAmount;
      this.client.items.push(item);
    }

    this.client.emit('inventoryChanged', undefined);
    this.items = lockerItems;
    for (const cb of this.changedSubscribers) cb(lockerItems);

    const name = this.client.getEifRecordById(takenItemId)?.name ?? '';
    const msg = this.client.locale.lockerTookMsg
      .replace('{amount}', String(takenItemAmount))
      .replace('{name}', name);
    this.client.toastController.show(msg);
    this.client.emit('serverChat', { message: msg, icon: ChatIcon.DownArrow });
  }

  notifyLockerItemAdded(
    lockerItems: ThreeItem[],
    depositedItemId: number,
    depositedItemAmount: number,
    weightCurrent: number,
  ): void {
    this.client.weight.current = weightCurrent;

    const existing = this.client.items.find((i) => i.id === depositedItemId);
    if (!existing) return;

    const depositedAmount = existing.amount - depositedItemAmount;
    existing.amount = depositedItemAmount;
    if (existing.amount <= 0) {
      this.client.items = this.client.items.filter(
        (i) => i.id !== depositedItemId,
      );
    }

    this.client.emit('inventoryChanged', undefined);
    this.items = lockerItems;
    for (const cb of this.changedSubscribers) cb(lockerItems);

    const name = this.client.getEifRecordById(depositedItemId)?.name ?? '';
    const amount = depositedAmount > 0 ? depositedAmount : 1;
    const msg = this.client.locale.lockerDepositedMsg
      .replace('{amount}', String(amount))
      .replace('{name}', name);
    this.client.toastController.show(msg);
    this.client.emit('serverChat', { message: msg, icon: ChatIcon.UpArrow });
  }

  notifyLockerUpgraded(goldAmount: number, lockerUpgrades: number): void {
    const gold = this.client.items.find((i) => i.id === 1);
    if (!gold) return;

    gold.amount = goldAmount;
    this.client.bankController.lockerUpgrades = lockerUpgrades;
    playSfxById(SfxId.BuySell);
    this.client.emit('inventoryChanged', undefined);

    const msg = this.client.locale.lockerUpgradedMsg;
    this.client.toastController.showSuccess(msg);
    this.client.emit('serverChat', { message: msg, icon: ChatIcon.Star });
  }

  notifyLockerFull(maxItems: number): void {
    const strings = this.client.getDialogStrings(
      DialogResourceID.LOCKER_FULL_DIFF_ITEMS_MAX,
    );
    this.client.showError(
      strings[1].replace('25', maxItems.toString()),
      strings[0],
    );
  }

  lockerAt(coords: Vector2): boolean {
    return this.client.map!.tileSpecRows.some(
      (r) =>
        r.y === coords.y &&
        r.tiles.some(
          (t) => t.x === coords.x && t.tileSpec === MapTileSpec.BankVault,
        ),
    );
  }

  openLocker(coords: Vector2): void {
    if (!this.client.mapController.isAdjacentToSpec(MapTileSpec.BankVault)) {
      return;
    }

    const packet = new LockerOpenClientPacket();
    packet.lockerCoords = new Coords();
    packet.lockerCoords.x = coords.x;
    packet.lockerCoords.y = coords.y;
    this.lockerCoords = packet.lockerCoords;
    this.client.bus!.send(packet);
  }

  upgradeLocker(): void {
    this.client.bus!.send(new LockerBuyClientPacket());
  }

  takeItem(itemId: number): void {
    const packet = new LockerTakeClientPacket();
    packet.takeItemId = itemId;
    packet.lockerCoords = this.lockerCoords;
    this.client.bus!.send(packet);
  }

  addItem(itemId: number): void {
    const inventoryItem = this.client.items.find((i) => i.id === itemId);
    if (!inventoryItem) return;

    const record = this.client.getEifRecordById(itemId);
    if (record?.type === ItemType.Currency) return;

    const send = (depositAmount: number) => {
      const packet = new LockerAddClientPacket();
      packet.depositItem = new ThreeItem();
      packet.depositItem.id = itemId;
      packet.depositItem.amount = depositAmount;
      packet.lockerCoords = this.lockerCoords;
      this.client.bus!.send(packet);
    };

    if (inventoryItem.amount > 1) {
      const title = this.client.getResourceString(
        EOResourceID.DIALOG_TRANSFER_HOW_MUCH,
      );
      const itemName = this.client.getEifRecordById(itemId)?.name ?? '';
      this.client.alertController.showAmount(
        title,
        itemName,
        inventoryItem.amount,
        this.client.locale.lockerDeposit,
        (amount) => {
          if (amount !== null && amount > 0) send(amount);
        },
      );
    } else {
      send(1);
    }
  }
}
