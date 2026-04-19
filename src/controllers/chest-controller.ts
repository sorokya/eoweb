import {
  ChestAddClientPacket,
  ChestOpenClientPacket,
  ChestTakeClientPacket,
  Coords,
  ItemType,
  MapTileSpec,
  ThreeItem,
} from 'eolib';

import type { Client } from '@/client';
import { EOResourceID } from '@/edf';
import { playSfxById, SfxId } from '@/sfx';

type OpenedSubscriber = (items: ThreeItem[]) => void;
type ChangedSubscriber = (items: ThreeItem[]) => void;

export class ChestController {
  private client: Client;
  chestCoords = new Coords();
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

  handleOpened(items: ThreeItem[]): void {
    this.items = items;
    for (const cb of this.openedSubscribers) cb(items);
  }

  handleChanged(items: ThreeItem[]): void {
    this.items = items;
    for (const cb of this.changedSubscribers) cb(items);
  }

  openChest(coords: { x: number; y: number }): void {
    if (!this.client.mapController.isAdjacentToSpec(MapTileSpec.Chest)) {
      return;
    }

    const chestKeys: number[] = [];
    for (const item of this.client.map!.items) {
      if (
        item.coords.x === coords.x &&
        item.coords.y === coords.y &&
        item.key &&
        !chestKeys.includes(item.key)
      ) {
        chestKeys.push(item.key);
      }
    }

    const keys: number[] = [];
    for (const item of this.client.items) {
      const record = this.client.getEifRecordById(item.id);
      if (!record) {
        continue;
      }

      if (
        record.type === ItemType.Key &&
        record.spec1 &&
        !keys.includes(record.spec1)
      ) {
        keys.push(record.spec1);
      }
    }

    let keyName = '';
    const haveKeys = chestKeys.every((k) => {
      if (!keys.includes(k)) {
        const record = this.client.eif!.items.find(
          (i) => i.type === ItemType.Key && i.spec1 === k,
        );
        keyName = record!.name!;
        return false;
      }

      return true;
    });

    if (!haveKeys) {
      playSfxById(SfxId.DoorOrChestLocked);
      this.client.toastController.showWarning(
        `${this.client.getResourceString(EOResourceID.STATUS_LABEL_THE_CHEST_IS_LOCKED_EXCLAMATION)} - ${keyName}`,
      );
      return;
    }

    const packet = new ChestOpenClientPacket();
    packet.coords = new Coords();
    packet.coords.x = coords.x;
    packet.coords.y = coords.y;
    this.chestCoords = packet.coords;
    this.client.bus!.send(packet);
  }

  takeItem(itemId: number): void {
    const packet = new ChestTakeClientPacket();
    packet.coords = this.chestCoords;
    packet.takeItemId = itemId;
    this.client.bus!.send(packet);
  }

  addItem(itemId: number): void {
    const inventoryItem = this.client.items.find((i) => i.id === itemId);
    if (!inventoryItem) return;

    const send = (amount: number) => {
      const packet = new ChestAddClientPacket();
      packet.addItem = new ThreeItem();
      packet.addItem.id = itemId;
      packet.addItem.amount = amount;
      packet.coords = this.chestCoords;
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
        this.client.locale.chestDeposit,
        (amount) => {
          if (amount !== null && amount > 0) send(amount);
        },
      );
    } else {
      send(1);
    }
  }
}
