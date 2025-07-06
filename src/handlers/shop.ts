import {
  type EoReader,
  PacketAction,
  PacketFamily,
  ShopOpenServerPacket,
} from 'eolib';
import type { Client } from '../client';

function handleShopOpen(client: Client, reader: EoReader) {
  const packet = ShopOpenServerPacket.deserialize(reader);
  client.sessionId = packet.sessionId;
  client.emit('shopOpened', {
    name: packet.shopName,
    tradeItems: packet.tradeItems,
    craftItems: packet.craftItems,
  });
}

export function registerShopHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Shop,
    PacketAction.Open,
    (reader) => handleShopOpen(client, reader),
  );
}
