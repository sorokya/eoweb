import {
  BookRequestClientPacket,
  EmoteReportClientPacket,
  type Emote as EmoteType,
  PaperdollRequestClientPacket,
  PartyAcceptClientPacket,
  PartyRemoveClientPacket,
  PartyRequestClientPacket,
  PartyRequestType,
  PartyTakeClientPacket,
  TradeRequestClientPacket,
} from 'eolib';

import type { Client } from '../client';
import { Emote } from '../render';

export class SocialController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  requestPaperdoll(playerId: number): void {
    const packet = new PaperdollRequestClientPacket();
    packet.playerId = playerId;
    this.client.bus!.send(packet);
  }

  requestBook(playerId: number): void {
    const packet = new BookRequestClientPacket();
    packet.playerId = playerId;
    this.client.bus!.send(packet);
  }

  emote(type: EmoteType): void {
    const packet = new EmoteReportClientPacket();
    packet.emote = type;
    this.client.characterEmotes.set(this.client.playerId, new Emote(type));
    this.client.bus!.send(packet);
  }

  requestToJoinParty(playerId: number): void {
    const packet = new PartyRequestClientPacket();
    packet.requestType = PartyRequestType.Join;
    packet.playerId = playerId;
    this.client.bus!.send(packet);
  }

  inviteToParty(playerId: number): void {
    const packet = new PartyRequestClientPacket();
    packet.requestType = PartyRequestType.Invite;
    packet.playerId = playerId;
    this.client.bus!.send(packet);
  }

  requestTrade(playerId: number): void {
    const packet = new TradeRequestClientPacket();
    packet.playerId = playerId;
    this.client.bus!.send(packet);
  }

  acceptPartyRequest(playerId: number, requestType: PartyRequestType): void {
    const packet = new PartyAcceptClientPacket();
    packet.inviterPlayerId = playerId;
    packet.requestType = requestType;
    this.client.bus!.send(packet);
  }

  removePartyMember(playerId: number): void {
    const packet = new PartyRemoveClientPacket();
    packet.playerId = playerId;
    this.client.bus!.send(packet);
  }

  requestPartyList(): void {
    if (this.client.partyMembers.length === 0) {
      return;
    }

    const packet = new PartyTakeClientPacket();
    packet.membersCount = this.client.partyMembers.length;
    this.client.bus!.send(packet);
  }
}
