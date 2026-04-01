import {
  CHAR_MAX,
  deinterleave,
  EoReader,
  EoWriter,
  encodeNumber,
  flipMsb,
  interleave,
  type Packet,
  PacketAction,
  PacketFamily,
  PacketSequencer,
  SequenceStart,
  swapMultiples,
} from 'eolib';
export class PacketBus {
  private socket: WebSocket;
  private sequencer: PacketSequencer;
  private encodeMultiple = 0;
  private decodeMultiple = 0;
  private handlers: Map<
    PacketFamily,
    Map<PacketAction, (reader: EoReader) => void>
  > = new Map();
  constructor(socket: WebSocket) {
    this.socket = socket;
    this.sequencer = new PacketSequencer(SequenceStart.zero());
    this.socket.addEventListener('message', (e) => {
      const promise = e.data.arrayBuffer();
      promise
        .then((buf: ArrayBuffer) => {
          this.handlePacket(new Uint8Array(buf));
        })
        .catch((err: Error) => {
          console.error('Failed to get array buffer', err);
        });
    });
  }

  disconnect() {
    this.socket.close();
  }

  setSequence(sequence: SequenceStart) {
    this.sequencer.sequenceStart = sequence;
  }

  setEncryption(encodeMultiple: number, decodeMultiple: number) {
    this.encodeMultiple = encodeMultiple;
    this.decodeMultiple = decodeMultiple;
  }

  private handlePacket(buf: Uint8Array) {
    const data = buf.slice(2);
    if (data[0] !== 0xff && data[1] !== 0xff) {
      deinterleave(data);
      flipMsb(data);
      swapMultiples(data, this.decodeMultiple);
    }

    const action = data[0];
    const family = data[1];

    const packetBuf = data.slice(2);

    const reader = new EoReader(packetBuf);
    const familyHandlers = this.handlers.get(family);
    if (familyHandlers) {
      const handler = familyHandlers.get(action);
      if (handler) {
        handler(reader);
      } else {
        console.error(
          `Unhandled packet: ${PacketFamily[family]}_${PacketAction[action]}`,
        );
      }
    } else {
      console.error(
        `Unhandled packet: ${PacketFamily[family]}_${PacketAction[action]}`,
      );
    }
  }

  send(packet: Packet) {
    const writer = new EoWriter();
    packet.serialize(writer);
    this.sendBuf(packet.family, packet.action, writer.toByteArray());
  }

  sendBuf(family: PacketFamily, action: PacketAction, buf: Uint8Array) {
    const data = [...buf];
    const sequence = this.sequencer.nextSequence();

    if (action !== 0xff && family !== 0xff) {
      const sequenceBytes = encodeNumber(sequence);
      if (sequence > CHAR_MAX) {
        data.unshift(sequenceBytes[1]);
      }
      data.unshift(sequenceBytes[0]);
    }

    data.unshift(family);
    data.unshift(action);

    const temp = new Uint8Array(data);

    if (data[0] !== 0xff && data[1] !== 0xff) {
      swapMultiples(temp, this.encodeMultiple);
      flipMsb(temp);
      interleave(temp);
    }

    const lengthBytes = encodeNumber(temp.length);

    const payload = new Uint8Array([lengthBytes[0], lengthBytes[1], ...temp]);
    this.socket.send(payload);
  }

  registerPacketHandler(
    family: PacketFamily,
    action: PacketAction,
    callback: (reader: EoReader) => void,
  ) {
    if (!this.handlers.has(family)) {
      this.handlers.set(family, new Map());
    }

    const actionMap = this.handlers.get(family);
    actionMap!.set(action, callback);
  }
}

import type {
  BoardPostListing,
  CharacterDetails,
  CharacterIcon,
  CharacterSelectionListEntry,
  DialogEntry,
  DialogQuestEntry,
  EquipmentPaperdoll,
  OnlinePlayer,
  ShopCraftItem,
  ShopTradeItem,
  SkillLearn,
  ThreeItem,
} from 'eolib';
import type { SfxId } from '@/sfx';
import type { ChatIcon, ChatTab } from '@/ui/ui-types';

export type ClientEvents = {
  error: { title: string; message: string };
  confirmation: {
    title: string;
    message: string;
    onConfirm: () => void;
  };
  smallAlert: { title: string; message: string };
  debug: string;
  login: CharacterSelectionListEntry[];
  characterCreated: CharacterSelectionListEntry[];
  characterDeleted: CharacterSelectionListEntry[];
  selectCharacter: undefined;
  enterGame: { news: string[] };
  chat: {
    tab: ChatTab;
    message: string;
    icon?: ChatIcon | null;
    name?: string;
  };
  serverChat: { message: string; sfxId?: SfxId | null; icon?: ChatIcon | null };
  accountCreated: undefined;
  passwordChanged: undefined;
  inventoryChanged: undefined;
  equipmentChanged: undefined;
  statsUpdate: undefined;
  reconnect: undefined;
  playersListUpdated: OnlinePlayer[];
  openQuestDialog: {
    name: string;
    dialogId: number;
    questId: number;
    quests: DialogQuestEntry[];
    dialog: DialogEntry[];
  };
  openPaperdoll: {
    icon: CharacterIcon;
    details: CharacterDetails;
    equipment: EquipmentPaperdoll;
  };
  openBook: {
    icon: CharacterIcon;
    details: CharacterDetails;
    questNames: string[];
  };
  chestOpened: {
    items: ThreeItem[];
  };
  chestChanged: {
    items: ThreeItem[];
  };
  shopOpened: {
    name: string;
    craftItems: ShopCraftItem[];
    tradeItems: ShopTradeItem[];
  };
  itemSold: undefined;
  itemBought: undefined;
  barberOpened: undefined;
  barberPurchased: undefined;
  citizenOpened: {
    behaviorId: number;
    currentHomeId: number;
    questions: string[];
  };
  citizenSleepCost: { cost: number };
  citizenSlept: undefined;
  citizenSubscribeResult: { questionsWrong: number };
  citizenUnsubscribeResult: { success: boolean };
  tradeUpdated: undefined;
  guildOpened: undefined;
  guildUpdated: undefined;
  scrollMessage: { title: string; body: string };
  statusMessage: { message: string };
  bankOpened: undefined;
  bankUpdated: undefined;
  boardOpened: { posts: BoardPostListing[] };
  postRead: { postId: number; body: string };
  lockerOpened: { items: ThreeItem[] };
  lockerChanged: { items: ThreeItem[] };
  skillMasterOpened: {
    name: string;
    skills: SkillLearn[];
  };
  skillsChanged: undefined;
  spellQueued: undefined;
  setChat: string;
  partyUpdated: undefined;
  showItemInfo: { itemId: number };
  showNpcInfo: { npcId: number };
  showSearchResults: {
    title: string;
    type: 'item' | 'npc';
    matches: { id: number; name: string }[];
  };
  updateItemSources: {
    drops: { npcName: string; dropRate: number }[];
    shops: { npcName: string; price: number }[];
    crafts: { npcName: string; ingredients: string }[];
  };
  updateNpcSources: {
    drops: { itemName: string; amount: string; dropRate: number }[];
    shopItems: { itemName: string; buyPrice: number; sellPrice: number }[];
    crafts: { itemName: string; ingredients: string }[];
    spawnMaps: number[];
  };
  reconnected: undefined;
  resize: undefined;
};
