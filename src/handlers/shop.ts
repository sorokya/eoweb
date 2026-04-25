import {
  type EoReader,
  PacketAction,
  PacketFamily,
  ShopBuyServerPacket,
  ShopCreateServerPacket,
  ShopOpenServerPacket,
  ShopSellServerPacket,
} from 'eolib';
import type { Client } from '@/client';

function handleShopOpen(client: Client, reader: EoReader) {
  const packet = ShopOpenServerPacket.deserialize(reader);
  client.shopController.handleOpened(
    packet.sessionId,
    packet.shopName,
    packet.tradeItems,
    packet.craftItems,
  );
}

function handleShopBuy(client: Client, reader: EoReader) {
  const packet = ShopBuyServerPacket.deserialize(reader);
  client.shopController.notifyBought(
    packet.goldAmount,
    packet.boughtItem,
    packet.weight.current,
  );
}

function handleShopSell(client: Client, reader: EoReader) {
  const packet = ShopSellServerPacket.deserialize(reader);
  client.shopController.notifySold(
    packet.soldItem,
    packet.goldAmount,
    packet.weight.current,
  );
}

function handleShopCreate(client: Client, reader: EoReader) {
  const packet = ShopCreateServerPacket.deserialize(reader);
  client.shopController.notifyCrafted(
    packet.craftItemId,
    packet.ingredients,
    packet.weight.current,
  );
}

export function registerShopHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Shop,
    PacketAction.Open,
    (reader) => handleShopOpen(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Shop,
    PacketAction.Buy,
    (reader) => handleShopBuy(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Shop,
    PacketAction.Sell,
    (reader) => handleShopSell(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Shop,
    PacketAction.Create,
    (reader) => handleShopCreate(client, reader),
  );
}
