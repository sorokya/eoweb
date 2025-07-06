import {
  type EoReader,
  Item,
  PacketAction,
  PacketFamily,
  ShopBuyServerPacket,
  ShopCreateServerPacket,
  ShopOpenServerPacket,
  ShopSellServerPacket,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handleShopOpen(client: Client, reader: EoReader) {
  const packet = ShopOpenServerPacket.deserialize(reader);
  client.sessionId = packet.sessionId;
  client.emit('shopOpened', {
    name: packet.shopName,
    tradeItems: packet.tradeItems,
    craftItems: packet.craftItems,
  });
}

function handleShopBuy(client: Client, reader: EoReader) {
  const packet = ShopBuyServerPacket.deserialize(reader);

  const gold = client.items.find((i) => i.id === 1);
  gold.amount = packet.goldAmount;

  const item = client.items.find((i) => i.id === packet.boughtItem.id);
  if (item) {
    item.amount += packet.boughtItem.amount;
  } else {
    client.items.push(packet.boughtItem);
  }

  client.weight.current = packet.weight.current;
  client.emit('inventoryChanged', undefined);
  client.emit('itemBought', undefined);
  playSfxById(SfxId.BuySell);
}

function handleShopSell(client: Client, reader: EoReader) {
  const packet = ShopSellServerPacket.deserialize(reader);

  const gold = client.items.find((i) => i.id === 1);
  gold.amount = packet.goldAmount;

  if (packet.soldItem.amount) {
    const item = client.items.find((i) => i.id === packet.soldItem.id);
    item.amount = packet.soldItem.amount;
  } else {
    client.items = client.items.filter((i) => i.id !== packet.soldItem.id);
  }

  client.weight.current = packet.weight.current;
  client.emit('inventoryChanged', undefined);
  client.emit('itemSold', undefined);
  playSfxById(SfxId.BuySell);
}

function handleShopCreate(client: Client, reader: EoReader) {
  const packet = ShopCreateServerPacket.deserialize(reader);

  for (const ingredient of packet.ingredients) {
    if (ingredient.amount) {
      const item = client.items.find((i) => i.id === ingredient.id);
      item.amount = ingredient.amount;
    } else {
      client.items = client.items.filter((i) => i.id !== ingredient.id);
    }
  }

  let item = client.items.find((i) => i.id === packet.craftItemId);
  if (item) {
    item.amount += 1;
  } else {
    item = new Item();
    item.id = packet.craftItemId;
    item.amount = 1;
    client.items.push(item);
  }

  client.weight.current = packet.weight.current;
  client.emit('inventoryChanged', undefined);
  playSfxById(SfxId.Craft);
}

export function registerShopHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Shop,
    PacketAction.Open,
    (reader) => handleShopOpen(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Shop,
    PacketAction.Buy,
    (reader) => handleShopBuy(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Shop,
    PacketAction.Sell,
    (reader) => handleShopSell(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Shop,
    PacketAction.Create,
    (reader) => handleShopCreate(client, reader),
  );
}
