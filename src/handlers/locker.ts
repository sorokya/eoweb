import {
  type EoReader,
  Item,
  LockerBuyServerPacket,
  LockerGetServerPacket,
  LockerOpenServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
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
}
