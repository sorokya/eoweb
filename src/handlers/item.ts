import {
  type EoReader,
  ItemAddServerPacket,
  ItemMapInfo,
  ItemRemoveServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';

function handleItemAdd(client: Client, reader: EoReader) {
  const packet = ItemAddServerPacket.deserialize(reader);
  const existing = client.nearby.items.find((i) => i.uid === packet.itemIndex);
  if (existing) {
    existing.id = packet.itemId;
    existing.amount = packet.itemAmount;
    existing.coords = packet.coords;
  } else {
    const item = new ItemMapInfo();
    item.uid = packet.itemIndex;
    item.id = packet.itemId;
    item.amount = packet.itemAmount;
    item.coords = packet.coords;
    client.nearby.items.push(item);
  }
}

function handleItemRemove(client: Client, reader: EoReader) {
  const packet = ItemRemoveServerPacket.deserialize(reader);
  client.nearby.items = client.nearby.items.filter(
    (i) => i.uid !== packet.itemIndex,
  );
}

export function registerItemHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Item,
    PacketAction.Add,
    (reader) => handleItemAdd(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Item,
    PacketAction.Remove,
    (reader) => handleItemRemove(client, reader),
  );
}
