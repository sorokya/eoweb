import {
  BookRequestClientPacket,
  type CharacterDetails,
  EmoteReportClientPacket,
  type Emote as EmoteType,
  type EquipmentPaperdoll,
  type OnlinePlayer,
  PaperdollRequestClientPacket,
  PartyAcceptClientPacket,
  PartyRemoveClientPacket,
  PartyRequestClientPacket,
  PartyRequestType,
  PartyTakeClientPacket,
  PlayersRequestClientPacket,
  TradeRequestClientPacket,
} from 'eolib';

import type { Client } from '@/client';
import { Emote } from '@/render';

type PaperdollOpenedData = {
  details: CharacterDetails;
  equipment: EquipmentPaperdoll;
};

type PlayerListSubscriber = (players: OnlinePlayer[]) => void;

export class SocialController {
  private client: Client;
  playerList: OnlinePlayer[] = [];
  friendList: string[];
  ignoreList: string[];

  private playerListSubscribers: PlayerListSubscriber[] = [];

  private get FRIENDS_KEY() {
    return `${this.client.name}-friends`;
  }

  private get IGNORE_KEY() {
    return `${this.client.name}-ignore`;
  }

  constructor(client: Client) {
    this.client = client;

    this.friendList = JSON.parse(
      localStorage.getItem(this.FRIENDS_KEY) || '[]',
    );
    this.ignoreList = JSON.parse(localStorage.getItem(this.IGNORE_KEY) || '[]');
  }

  private paperdollOpenedSubscribers: ((data: PaperdollOpenedData) => void)[] =
    [];
  subscribePaperdollOpened(callback: (data: PaperdollOpenedData) => void) {
    this.paperdollOpenedSubscribers.push(callback);
  }

  notifyPaperdollOpened(data: PaperdollOpenedData) {
    if (data.details.playerId === this.client.playerId) {
      this.client.home = data.details.home;
      this.client.partner = data.details.partner;
    }

    for (const subscriber of this.paperdollOpenedSubscribers) {
      subscriber(data);
    }
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
    this.client.animationController.characterEmotes.set(
      this.client.playerId,
      new Emote(type),
    );
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

  requestOnlinePlayers(): void {
    this.client.bus!.send(new PlayersRequestClientPacket());
  }

  subscribePlayerList(callback: PlayerListSubscriber) {
    this.playerListSubscribers.push(callback);
  }

  unsubscribePlayerList(callback: PlayerListSubscriber) {
    this.playerListSubscribers = this.playerListSubscribers.filter(
      (cb) => cb !== callback,
    );
  }

  notifyPlayersList(players: OnlinePlayer[]) {
    this.playerList = players;
    for (const subscriber of this.playerListSubscribers) {
      subscriber(players);
    }
  }

  addFriend(playerName: string): void {
    if (this.friendList.includes(playerName)) {
      return;
    }

    this.friendList.push(playerName);
    localStorage.setItem(this.FRIENDS_KEY, JSON.stringify(this.friendList));
  }

  removeFriend(playerName: string): void {
    this.friendList = this.friendList.filter((name) => name !== playerName);
    localStorage.setItem(this.FRIENDS_KEY, JSON.stringify(this.friendList));
  }

  addIgnore(playerName: string): void {
    if (this.ignoreList.includes(playerName)) {
      return;
    }

    this.ignoreList.push(playerName);
    localStorage.setItem(this.IGNORE_KEY, JSON.stringify(this.ignoreList));
  }

  removeIgnore(playerName: string): void {
    this.ignoreList = this.ignoreList.filter((name) => name !== playerName);
    localStorage.setItem(this.IGNORE_KEY, JSON.stringify(this.ignoreList));
  }
}
