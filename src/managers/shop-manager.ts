import {
  BankAddClientPacket,
  BankTakeClientPacket,
  BoardCreateClientPacket,
  BoardOpenClientPacket,
  BoardRemoveClientPacket,
  BoardTakeClientPacket,
  ChestAddClientPacket,
  ChestOpenClientPacket,
  ChestTakeClientPacket,
  Coords,
  Item,
  ItemType,
  LockerAddClientPacket,
  LockerBuyClientPacket,
  LockerTakeClientPacket,
  MapTileSpec,
  ShopBuyClientPacket,
  ShopCreateClientPacket,
  ShopSellClientPacket,
  ThreeItem,
} from 'eolib';

import type { Client } from '../client';
import { EOResourceID } from '../edf';
import { playSfxById } from '../sfx';
import { SfxId } from '../types';

export function openBoard(client: Client, boardId: number): void {
  const packet = new BoardOpenClientPacket();
  packet.boardId = boardId;
  client.bus!.send(packet);
}

export function readPost(client: Client, postId: number): void {
  const packet = new BoardTakeClientPacket();
  packet.boardId = client.boardId;
  packet.postId = postId;
  client.bus!.send(packet);
}

export function createPost(
  client: Client,
  subject: string,
  body: string,
): void {
  const packet = new BoardCreateClientPacket();
  packet.boardId = client.boardId;
  packet.postSubject = subject;
  packet.postBody = body.replace(/\n/g, '\r');
  client.bus!.send(packet);
}

export function deletePost(client: Client, postId: number): void {
  const packet = new BoardRemoveClientPacket();
  packet.boardId = client.boardId;
  packet.postId = postId;
  client.bus!.send(packet);
}

export function openChest(
  client: Client,
  coords: { x: number; y: number },
): void {
  if (!client.isAdjacentToSpec(MapTileSpec.Chest)) {
    return;
  }

  const chestKeys: number[] = [];
  for (const item of client.map!.items) {
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
  for (const item of client.items) {
    const record = client.getEifRecordById(item.id);
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
      const record = client.eif!.items.find(
        (i) => i.type === ItemType.Key && i.spec1 === k,
      );
      keyName = record!.name!;
      return false;
    }

    return true;
  });

  if (!haveKeys) {
    playSfxById(SfxId.DoorOrChestLocked);
    client.setStatusLabel(
      EOResourceID.STATUS_LABEL_TYPE_WARNING,
      `${client.getResourceString(EOResourceID.STATUS_LABEL_THE_CHEST_IS_LOCKED_EXCLAMATION)} - ${keyName}`,
    );
    return;
  }

  const packet = new ChestOpenClientPacket();
  packet.coords = new Coords();
  packet.coords.x = coords.x;
  packet.coords.y = coords.y;
  client.chestCoords = packet.coords;
  client.bus!.send(packet);
}

export function takeChestItem(client: Client, itemId: number): void {
  const packet = new ChestTakeClientPacket();
  packet.coords = client.chestCoords;
  packet.takeItemId = itemId;
  client.bus!.send(packet);
}

export function addChestItem(
  client: Client,
  itemId: number,
  amount: number,
): void {
  const packet = new ChestAddClientPacket();
  packet.addItem = new ThreeItem();
  packet.addItem.id = itemId;
  packet.addItem.amount = amount;
  packet.coords = client.chestCoords;
  client.bus!.send(packet);
}

export function buyShopItem(
  client: Client,
  itemId: number,
  amount: number,
): void {
  const packet = new ShopBuyClientPacket();
  packet.sessionId = client.sessionId;
  packet.buyItem = new Item();
  packet.buyItem.id = itemId;
  packet.buyItem.amount = amount;
  client.bus!.send(packet);
}

export function sellShopItem(
  client: Client,
  itemId: number,
  amount: number,
): void {
  const packet = new ShopSellClientPacket();
  packet.sessionId = client.sessionId;
  packet.sellItem = new Item();
  packet.sellItem.id = itemId;
  packet.sellItem.amount = amount;
  client.bus!.send(packet);
}

export function craftShopItem(client: Client, itemId: number): void {
  const packet = new ShopCreateClientPacket();
  packet.sessionId = client.sessionId;
  packet.craftItemId = itemId;
  client.bus!.send(packet);
}

export function depositGold(client: Client, amount: number): void {
  const gold = client.items.find((i) => i.id === 1);
  if (!gold || gold.amount < amount) {
    return;
  }

  const packet = new BankAddClientPacket();
  packet.sessionId = client.sessionId;
  packet.amount = amount;
  client.bus!.send(packet);
}

export function withdrawGold(client: Client, amount: number): void {
  if (client.goldBank < amount) {
    return;
  }

  const packet = new BankTakeClientPacket();
  packet.sessionId = client.sessionId;
  packet.amount = amount;
  client.bus!.send(packet);
}

export function upgradeLocker(client: Client): void {
  client.bus!.send(new LockerBuyClientPacket());
}

export function takeLockerItem(client: Client, itemId: number): void {
  const packet = new LockerTakeClientPacket();
  packet.takeItemId = itemId;
  packet.lockerCoords = client.lockerCoords;
  client.bus!.send(packet);
}

export function addLockerItem(
  client: Client,
  itemId: number,
  amount: number,
): void {
  const packet = new LockerAddClientPacket();
  packet.depositItem = new ThreeItem();
  packet.depositItem.id = itemId;
  packet.depositItem.amount = amount;
  packet.lockerCoords = client.lockerCoords;
  client.bus!.send(packet);
}
