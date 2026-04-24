import {
  Item,
  TradeAcceptClientPacket,
  TradeAddClientPacket,
  TradeAgreeClientPacket,
  TradeCloseClientPacket,
  type TradeItemData,
  TradeRemoveClientPacket,
  TradeRequestClientPacket,
} from 'eolib';
import type { Client } from '@/client';
import { DialogResourceID } from '@/edf';
import { TradeState } from '@/game-state';
import { SfxId } from '@/sfx';
import { capitalize } from '@/utils';

export class TradeController {
  state = TradeState.None;
  partnerId = 0;
  partnerName = '';
  partnerItems: Item[] = [];
  partnerAgreed = false;

  playerItems: Item[] = [];
  playerAgreed = false;

  scam = false;

  private subscribers: (() => void)[] = [];
  subscribe(cb: () => void) {
    this.subscribers.push(cb);
  }

  unsubscribe(cb: () => void) {
    this.subscribers = this.subscribers.filter((s) => s !== cb);
  }

  private notifySubscribers() {
    for (const cb of this.subscribers) {
      cb();
    }
  }

  constructor(private client: Client) {}

  request(playerId: number): void {
    const packet = new TradeRequestClientPacket();
    packet.playerId = playerId;
    this.client.bus!.send(packet);
  }

  cancel() {
    const packet = new TradeCloseClientPacket();
    this.client.bus.send(packet);
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

  agree(agree: boolean) {
    const packet = new TradeAgreeClientPacket();
    packet.agree = agree;
    this.client.bus.send(packet);
  }

  notifyTradeRequested(playerId: number, playerName: string) {
    this.partnerId = playerId;
    this.partnerName = capitalize(playerName);
    this.state = TradeState.Pending;

    const strings = this.client.getDialogStrings(
      DialogResourceID.TRADE_REQUEST,
    );
    this.client.alertController.showConfirm(
      strings[0],
      `${this.partnerName} ${strings[1]}`,
      (confirmed) => {
        if (confirmed) {
          this.acceptTradeRequest();
        }
      },
    );
  }

  private acceptTradeRequest() {
    const packet = new TradeAcceptClientPacket();
    packet.playerId = this.partnerId;
    this.client.bus.send(packet);
  }

  notifyOpened(playerId: number, playerName: string) {
    this.state = TradeState.Open;
    this.partnerId = playerId;
    this.partnerName = playerName;
    this.notifySubscribers();
  }

  notifyPlayerAgreed(agreed: boolean) {
    this.client.audioController.playById(
      agreed ? SfxId.TradeAccepted : SfxId.TradeItemOfferChanged,
    );
    this.playerAgreed = agreed;
    this.notifySubscribers();
  }

  notifyPartnerAgreed(agreed: boolean) {
    this.client.audioController.playById(
      agreed ? SfxId.TradeAccepted : SfxId.TradeItemOfferChanged,
    );
    this.partnerAgreed = agreed;
    this.notifySubscribers();
  }

  notifyClosed() {
    this.state = TradeState.None;
    this.partnerId = 0;
    this.partnerName = '';
    this.partnerItems = [];
    this.partnerAgreed = false;
    this.playerItems = [];
    this.playerAgreed = false;
    this.scam = false;
    this.notifySubscribers();
  }

  notifyUpdated(data: TradeItemData[], scam = false) {
    this.playerItems =
      data.find((d) => d.playerId === this.client.playerId)?.items ?? [];
    this.partnerItems =
      data.find((d) => d.playerId === this.partnerId)?.items ?? [];
    this.client.audioController.playById(SfxId.TradeItemOfferChanged);
    this.scam = scam;
    this.playerAgreed = false;
    this.partnerAgreed = false;
    this.notifySubscribers();
  }

  notifyTradeComplete(data: TradeItemData[]) {
    const receivedItems = data.find(
      (d) => d.playerId === this.partnerId,
    )?.items;
    const givenItems = data.find(
      (d) => d.playerId === this.client.playerId,
    )?.items;

    // Remove items we gave away
    if (givenItems) {
      for (const item of givenItems) {
        this.client.inventoryController.removeItem(item.id, item.amount);
      }
    }

    // Add items we received
    if (receivedItems) {
      for (const item of receivedItems) {
        this.client.inventoryController.addItem(item.id, item.amount);
      }
    }

    this.notifyClosed();
    this.client.audioController.playById(SfxId.BuySell);
  }
}
