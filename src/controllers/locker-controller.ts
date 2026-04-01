import {
  Coords,
  LockerAddClientPacket,
  LockerBuyClientPacket,
  LockerTakeClientPacket,
  ThreeItem,
} from 'eolib';

import type { Client } from '@/client';

export class LockerController {
  private client: Client;
  lockerCoords = new Coords();

  constructor(client: Client) {
    this.client = client;
  }

  upgradeLocker(): void {
    this.client.bus!.send(new LockerBuyClientPacket());
  }

  takeItem(itemId: number): void {
    const packet = new LockerTakeClientPacket();
    packet.takeItemId = itemId;
    packet.lockerCoords = this.lockerCoords;
    this.client.bus!.send(packet);
  }

  addItem(itemId: number, amount: number): void {
    const packet = new LockerAddClientPacket();
    packet.depositItem = new ThreeItem();
    packet.depositItem.id = itemId;
    packet.depositItem.amount = amount;
    packet.lockerCoords = this.lockerCoords;
    this.client.bus!.send(packet);
  }
}
