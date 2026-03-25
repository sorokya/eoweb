import { BankAddClientPacket, BankTakeClientPacket } from 'eolib';

import type { Client } from '../client';

export class BankController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  depositGold(amount: number): void {
    const gold = this.client.items.find((i) => i.id === 1);
    if (!gold || gold.amount < amount) {
      return;
    }

    const packet = new BankAddClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.amount = amount;
    this.client.bus!.send(packet);
  }

  withdrawGold(amount: number): void {
    if (this.client.goldBank < amount) {
      return;
    }

    const packet = new BankTakeClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.amount = amount;
    this.client.bus!.send(packet);
  }
}
