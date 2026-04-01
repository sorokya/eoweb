import {
  Item,
  TradeAcceptClientPacket,
  TradeAddClientPacket,
  TradeAgreeClientPacket,
  TradeCloseClientPacket,
  type TradeItemData,
  TradeRemoveClientPacket,
} from 'eolib';
import type { Client } from '@/client';
import { TradeState } from '@/game-state';
import { playSfxById, SfxId } from '@/sfx';

export class TradeController {
  state = TradeState.None;
  partnerId = 0;
  partnerName = '';
  partnerItems: Item[] = [];
  partnerAgreed = false;

  playerItems: Item[] = [];
  playerAgreed = false;

  scam = false;

  constructor(private client: Client) {}

  setTradeRequest(playerId: number, playerName: string) {
    this.partnerId = playerId;
    this.partnerName = playerName;
    this.state = TradeState.Pending;
    this.client.emit('tradeUpdated', undefined);
  }

  acceptTradeRequest() {
    const packet = new TradeAcceptClientPacket();
    packet.playerId = this.partnerId;
    this.client.bus.send(packet);
  }

  open(playerId: number, playerName: string) {
    this.state = TradeState.Open;
    this.partnerId = playerId;
    this.partnerName = playerName;
    this.client.emit('tradeUpdated', undefined);
  }

  setPlayerAgreed(agreed: boolean) {
    playSfxById(agreed ? SfxId.TradeAccepted : SfxId.TradeItemOfferChanged);
    this.playerAgreed = agreed;
    this.client.emit('tradeUpdated', undefined);
  }

  setPartnerAgreed(agreed: boolean) {
    playSfxById(agreed ? SfxId.TradeAccepted : SfxId.TradeItemOfferChanged);
    this.partnerAgreed = agreed;
    this.client.emit('tradeUpdated', undefined);
  }

  cancel() {
    const packet = new TradeCloseClientPacket();
    this.client.bus.send(packet);
  }

  reset() {
    this.state = TradeState.None;
    this.partnerId = 0;
    this.partnerName = '';
    this.partnerItems = [];
    this.partnerAgreed = false;
    this.playerItems = [];
    this.playerAgreed = false;
    this.scam = false;
    this.client.emit('tradeUpdated', undefined);
  }

  addItem(itemId: number, amount: number) {
    const packet = new TradeAddClientPacket();
    packet.addItem = new Item();
    packet.addItem.id = itemId;
    packet.addItem.amount = amount;
    this.client.bus.send(packet);
  }

  removeItem(itemId: number) {
    const packet = new TradeRemoveClientPacket();
    packet.itemId = itemId;
    this.client.bus.send(packet);
  }

  update(data: TradeItemData[], scam = false) {
    this.playerItems =
      data.find((d) => d.playerId === this.client.playerId)?.items ?? [];
    this.partnerItems =
      data.find((d) => d.playerId === this.partnerId)?.items ?? [];
    playSfxById(SfxId.TradeItemOfferChanged);
    this.scam = scam;
    this.playerAgreed = false;
    this.partnerAgreed = false;
    this.client.emit('tradeUpdated', undefined);
  }

  agreeTrade(agree: boolean) {
    const packet = new TradeAgreeClientPacket();
    packet.agree = agree;
    this.client.bus.send(packet);
  }

  completeTrade(data: TradeItemData[]) {
    const receivedItems = data.find(
      (d) => d.playerId === this.partnerId,
    )?.items;
    const givenItems = data.find(
      (d) => d.playerId === this.client.playerId,
    )?.items;

    // Remove items we gave away
    if (givenItems) {
      for (const item of givenItems) {
        const existing = this.client.items.find((i) => i.id === item.id);
        if (existing) {
          existing.amount -= item.amount;
          if (existing.amount <= 0) {
            const idx = this.client.items.indexOf(existing);
            if (idx >= 0) this.client.items.splice(idx, 1);
          }
        }
      }
    }

    // Add items we received
    if (receivedItems) {
      for (const item of receivedItems) {
        const existing = this.client.items.find((i) => i.id === item.id);
        if (existing) {
          existing.amount += item.amount;
        } else {
          this.client.items.push(item);
        }
      }
    }

    this.client.emit('inventoryChanged', undefined);
    this.reset();
    playSfxById(SfxId.BuySell);
  }
}
