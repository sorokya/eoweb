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

export function requestPaperdoll(client: Client, playerId: number): void {
  const packet = new PaperdollRequestClientPacket();
  packet.playerId = playerId;
  client.bus!.send(packet);
}

export function requestBook(client: Client, playerId: number): void {
  const packet = new BookRequestClientPacket();
  packet.playerId = playerId;
  client.bus!.send(packet);
}

export function emote(client: Client, type: EmoteType): void {
  const packet = new EmoteReportClientPacket();
  packet.emote = type;
  client.characterEmotes.set(client.playerId, new Emote(type));
  client.bus!.send(packet);
}

export function requestToJoinParty(client: Client, playerId: number): void {
  const packet = new PartyRequestClientPacket();
  packet.requestType = PartyRequestType.Join;
  packet.playerId = playerId;
  client.bus!.send(packet);
}

export function inviteToParty(client: Client, playerId: number): void {
  const packet = new PartyRequestClientPacket();
  packet.requestType = PartyRequestType.Invite;
  packet.playerId = playerId;
  client.bus!.send(packet);
}

export function requestTrade(client: Client, playerId: number): void {
  const packet = new TradeRequestClientPacket();
  packet.playerId = playerId;
  client.bus!.send(packet);
}

export function acceptPartyRequest(
  client: Client,
  playerId: number,
  requestType: PartyRequestType,
): void {
  const packet = new PartyAcceptClientPacket();
  packet.inviterPlayerId = playerId;
  packet.requestType = requestType;
  client.bus!.send(packet);
}

export function removePartyMember(client: Client, playerId: number): void {
  const packet = new PartyRemoveClientPacket();
  packet.playerId = playerId;
  client.bus!.send(packet);
}

export function requestPartyList(client: Client): void {
  if (client.partyMembers.length === 0) {
    return;
  }

  const packet = new PartyTakeClientPacket();
  packet.membersCount = client.partyMembers.length;
  client.bus!.send(packet);
}
