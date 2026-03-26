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
  TradeItemData,
} from 'eolib';
import type { SfxId } from './sfx';
import type { ChatIcon, ChatTab } from './ui';

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
  tradeRequested: { playerId: number; playerName: string };
  tradeOpened: {
    partnerPlayerId: number;
    partnerPlayerName: string;
    localPlayerId: number;
    localPlayerName: string;
  };
  tradeUpdated: { tradeData: TradeItemData[] };
  tradePartnerAgree: { playerId: number; agree: boolean };
  tradeOwnAgree: { agree: boolean };
  tradeCompleted: undefined;
  tradeCancelled: { playerId: number };
  guildOpened: undefined;
  guildReply: { code: number; message: string };
  guildCreateBegin: undefined;
  guildCreateAdd: { name: string };
  guildCreateAddConfirm: { name: string };
  guildCreateInvite: { playerId: number; guildIdentity: string };
  guildCreated: {
    guildTag: string;
    guildName: string;
    rankName: string;
    goldAmount: number;
  };
  guildJoinRequest: { playerId: number; playerName: string };
  guildJoined: {
    guildTag: string;
    guildName: string;
    rankName: string;
  };
  guildInfo: {
    name: string;
    tag: string;
    createDate: string;
    description: string;
    wealth: string;
    ranks: string[];
    staff: { rank: number; name: string }[];
  };
  guildMemberList: {
    members: { rank: number; name: string; rankName: string }[];
  };
  guildDescription: { description: string };
  guildRanks: { ranks: string[] };
  guildBank: { gold: number };
  guildBankUpdated: { goldAmount: number };
  guildLeft: undefined;
  guildRankUpdated: { rank: number };
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
