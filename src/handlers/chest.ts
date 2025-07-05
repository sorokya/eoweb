import {
  ChestAgreeServerPacket,
  ChestGetServerPacket,
  ChestOpenServerPacket,
  type EoReader,
  Item,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handleChestOpen(client: Client, reader: EoReader) {
  const packet = ChestOpenServerPacket.deserialize(reader);

  playSfxById(SfxId.TextBoxFocus);
  client.emit('chestOpened', {
    items: packet.items,
  });
}

function handleChestAgree(client: Client, reader: EoReader) {
  const packet = ChestAgreeServerPacket.deserialize(reader);
  client.emit('chestChanged', {
    items: packet.items,
  });
}

function handleChestGet(client: Client, reader: EoReader) {
  const packet = ChestGetServerPacket.deserialize(reader);
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
  client.emit('chestChanged', {
    items: packet.items,
  });
}

export function registerChestHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Chest,
    PacketAction.Open,
    (reader) => handleChestOpen(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Chest,
    PacketAction.Agree,
    (reader) => handleChestAgree(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Chest,
    PacketAction.Get,
    (reader) => handleChestGet(client, reader),
  );
}
