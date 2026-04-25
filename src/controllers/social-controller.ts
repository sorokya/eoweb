import {
  BookRequestClientPacket,
  type CharacterDetails,
  type EquipmentPaperdoll,
  type OnlinePlayer,
  PaperdollRequestClientPacket,
  PlayersRequestClientPacket,
} from 'eolib';

export type CharacterTab = 'paperdoll' | 'stats' | 'book';

import type { Client } from '@/client';

type PaperdollOpenedData = {
  details: CharacterDetails;
  equipment: EquipmentPaperdoll;
};

type BookOpenedData = {
  details: CharacterDetails;
};

type PlayerListSubscriber = (players: OnlinePlayer[]) => void;

const FRIENDS_KEY = 'eoweb:social:friends';
const IGNORE_KEY = 'eoweb:social:ignore';

export class SocialController {
  private client: Client;
  naughtyWords: string[] = [];
  playerList: OnlinePlayer[] = [];
  friendList: string[];
  ignoreList: string[];

  // Tracks which tab should be shown when CharacterDialog mounts.
  // Set before notifying subscribers so useState initializers can read it.
  pendingCharacterTab: CharacterTab | null = null;

  private playerListSubscribers: PlayerListSubscriber[] = [];

  constructor(client: Client) {
    this.client = client;

    this.friendList = JSON.parse(localStorage.getItem(FRIENDS_KEY) || '[]');
    this.ignoreList = JSON.parse(localStorage.getItem(IGNORE_KEY) || '[]');
  }

  private paperdollOpenedSubscribers: ((data: PaperdollOpenedData) => void)[] =
    [];
  subscribePaperdollOpened(callback: (data: PaperdollOpenedData) => void) {
    this.paperdollOpenedSubscribers.push(callback);
  }

  unsubscribePaperdollOpened(callback: (data: PaperdollOpenedData) => void) {
    this.paperdollOpenedSubscribers = this.paperdollOpenedSubscribers.filter(
      (s) => s !== callback,
    );
  }

  notifyPaperdollOpened(data: PaperdollOpenedData) {
    this.pendingCharacterTab = 'paperdoll';

    if (data.details.playerId === this.client.playerId) {
      this.client.home = data.details.home;
      this.client.partner = data.details.partner;
    }

    for (const subscriber of this.paperdollOpenedSubscribers) {
      subscriber(data);
    }
  }

  private bookOpenedSubscribers: ((data: BookOpenedData) => void)[] = [];

  subscribeBookOpened(cb: (data: BookOpenedData) => void) {
    this.bookOpenedSubscribers.push(cb);
  }

  unsubscribeBookOpened(cb: (data: BookOpenedData) => void) {
    this.bookOpenedSubscribers = this.bookOpenedSubscribers.filter(
      (s) => s !== cb,
    );
  }

  notifyBookOpened(details: CharacterDetails): void {
    this.pendingCharacterTab = 'book';
    for (const subscriber of this.bookOpenedSubscribers) {
      subscriber({ details });
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
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(this.friendList));
  }

  removeFriend(playerName: string): void {
    this.friendList = this.friendList.filter((name) => name !== playerName);
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(this.friendList));
  }

  addIgnore(playerName: string): void {
    if (this.ignoreList.includes(playerName)) {
      return;
    }

    this.ignoreList.push(playerName);
    localStorage.setItem(IGNORE_KEY, JSON.stringify(this.ignoreList));
  }

  removeIgnore(playerName: string): void {
    this.ignoreList = this.ignoreList.filter((name) => name !== playerName);
    localStorage.setItem(IGNORE_KEY, JSON.stringify(this.ignoreList));
  }

  isFriend(playerName: string): boolean {
    return this.friendList.includes(playerName);
  }

  isIgnored(playerName: string): boolean {
    return this.ignoreList.includes(playerName);
  }

  filterNaughtyWords(message: string): string {
    if (
      !this.client.configController.profanityFilter ||
      this.naughtyWords.length === 0
    ) {
      return message;
    }

    let filteredMessage = message;
    for (const word of this.naughtyWords) {
      const regex = new RegExp(word, 'gi');
      filteredMessage = filteredMessage.replace(regex, '*'.repeat(word.length));
    }
    return filteredMessage;
  }
}
