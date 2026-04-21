import { BarberBuyClientPacket } from 'eolib';
import type { Client } from '@/client';

type OpenedSubscriber = () => void;
type PurchasedSubscriber = () => void;

export class BarberController {
  private client: Client;
  sessionId = 0;

  private openedSubscribers: OpenedSubscriber[] = [];
  private purchasedSubscribers: PurchasedSubscriber[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  notifyOpened(sessionId: number): void {
    this.sessionId = sessionId;
    for (const cb of this.openedSubscribers) cb();
  }

  notifyPurchased(): void {
    for (const cb of this.purchasedSubscribers) cb();
  }

  buyHairStyle(hairStyle: number, hairColor: number): void {
    const packet = new BarberBuyClientPacket();
    packet.hairStyle = hairStyle;
    packet.hairColor = hairColor;
    packet.sessionId = this.sessionId;
    this.client.bus!.send(packet);
  }

  subscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers.push(cb);
  }

  unsubscribeOpened(cb: OpenedSubscriber): void {
    this.openedSubscribers = this.openedSubscribers.filter((s) => s !== cb);
  }

  subscribePurchased(cb: PurchasedSubscriber): void {
    this.purchasedSubscribers.push(cb);
  }

  unsubscribePurchased(cb: PurchasedSubscriber): void {
    this.purchasedSubscribers = this.purchasedSubscribers.filter(
      (s) => s !== cb,
    );
  }
}
