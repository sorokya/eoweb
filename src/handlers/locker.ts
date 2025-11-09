import {
  type EoReader,
  Item,
  LockerBuyServerPacket,
  LockerGetServerPacket,
  LockerOpenServerPacket,
  LockerReplyServerPacket,
  LockerSpecServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { DialogResourceID } from '../edf';
import { playSfxById, SfxId } from '../sfx';

function handleLockerBuy(client: Client, reader: EoReader) {
  const packet = LockerBuyServerPacket.deserialize(reader);
  const gold = client.items.find((i) => i.id === 1);
  if (!gold) {
    return;
  }

  gold.amount = packet.goldAmount;
  client.lockerUpgrades = packet.lockerUpgrades;
  playSfxById(SfxId.BuySell);
  client.emit('inventoryChanged', undefined);
}

function handleLockerOpen(client: Client, reader: EoReader) {
  const packet = LockerOpenServerPacket.deserialize(reader);
  playSfxById(SfxId.ChestOpen);
  client.lockerCoords = packet.lockerCoords;
  client.emit('lockerOpened', { items: packet.lockerItems });
}

function handleLockerGet(client: Client, reader: EoReader) {
  const packet = LockerGetServerPacket.deserialize(reader);
  client.weight.current = packet.weight.current;

  const existing = client.items.find((i) => i.id === packet.takenItem.id);
  if (existing) {
    existing.amount += packet.takenItem.amount;
  } else {
    const item = new Item();
    item.id = packet.takenItem.id;
    item.amount = packet.takenItem.amount;
    client.items.push(item);
  }

  client.emit('inventoryChanged', undefined);
  client.emit('lockerChanged', {
    items: packet.lockerItems,
  });
}

function handleLockerReply(client: Client, reader: EoReader) {
  const packet = LockerReplyServerPacket.deserialize(reader);
  client.weight.current = packet.weight.current;

  const existing = client.items.find((i) => i.id === packet.depositedItem.id);
  if (!existing) {
    return;
  }

  existing.amount = packet.depositedItem.amount;

  if (existing.amount <= 0) {
    client.items = client.items.filter((i) => i.id !== existing.id);
  }

  client.emit('inventoryChanged', undefined);
  client.emit('lockerChanged', {
    items: packet.lockerItems,
  });
}

function handleLockerSpec(client: Client, reader: EoReader) {
  const packet = LockerSpecServerPacket.deserialize(reader);
  const strings = client.getDialogStrings(
    DialogResourceID.LOCKER_FULL_DIFF_ITEMS_MAX,
  );
  client.showError(
    strings[1].replace('25', packet.lockerMaxItems.toString()),
    strings[0],
  );
}

export function registerLockerHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Locker,
    PacketAction.Buy,
    (reader) => handleLockerBuy(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Locker,
    PacketAction.Open,
    (reader) => handleLockerOpen(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Locker,
    PacketAction.Get,
    (reader) => handleLockerGet(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Locker,
    PacketAction.Reply,
    (reader) => handleLockerReply(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Locker,
    PacketAction.Spec,
    (reader) => handleLockerSpec(client, reader),
  );
}
