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
import type { GameState } from '@/game-state';
import type { SfxId } from '@/sfx';
import type { ChatChannel, ChatIcon } from '@/ui';
import type { DialogId } from '@/ui/in-game';

export type ClientEvents = {
  stateChanged: GameState;
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
    channel: ChatChannel;
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
  toggleDialog: { id: DialogId };
  toggleCommandPalette: undefined;
};
