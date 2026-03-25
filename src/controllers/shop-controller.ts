import {
  Item,
  ShopBuyClientPacket,
  ShopCreateClientPacket,
  ShopSellClientPacket,
} from 'eolib';

import type { Client } from '../client';

export class ShopController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  buyItem(itemId: number, amount: number): void {
    const packet = new ShopBuyClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.buyItem = new Item();
    packet.buyItem.id = itemId;
    packet.buyItem.amount = amount;
    this.client.bus!.send(packet);
  }

  sellItem(itemId: number, amount: number): void {
    const packet = new ShopSellClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.sellItem = new Item();
    packet.sellItem.id = itemId;
    packet.sellItem.amount = amount;
    this.client.bus!.send(packet);
  }

  craftItem(itemId: number): void {
    const packet = new ShopCreateClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.craftItemId = itemId;
    this.client.bus!.send(packet);
  }
}
