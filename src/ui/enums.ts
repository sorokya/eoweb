export enum DialogIcon {
  Buy = 0,
  Sell = 1,
  JukeboxBrowse = Sell,
  BankDeposit = 2,
  BankWithdraw = 3,
  Craft = 4,
  BankLockerUpgrade = 5,
  BarberHairModel = 6,
  BarberChangeHairColor = 7,
  BarberOk = 8,
  JukeboxPlay = 8,
  Registration = 9,
  GuildInformation = Registration,
  GuildAdministration = 10,
  GuildManagement = 11,
  GuildBankAccount = 12,
  GuildJoin = 13,
  GuildLeave = 14,
  GuildRegister = 15,
  GuildLookup = GuildRegister,
  GuildMemberlist = GuildRegister,
  GuildModify = 16,
  GuildRanking = 17,
  GuildRemoveMember = 18,
  GuildDisband = 19,
  Learn = 20,
  Forget = 21,
  InnSleep = 22,
  SignUp = 23,
  Unsubscribe = 24,
}

export enum ChatIcon {
  None = -1,
  SpeechBubble = 0,
  Note = 1,
  Error = 2,
  NoteLeftArrow = 3,
  GlobalAnnounce = 4,
  Star = 5,
  Exclamation = 6,
  LookingDude = 7,
  Heart = 8,
  Player = 9,
  PlayerParty = 10,
  PlayerPartyDark = 11,
  GM = 12,
  GMParty = 13,
  HGM = 14,
  HGMParty = 15,
  DownArrow = 16,
  UpArrow = 17,
  DotDotDotDot = 18,
  Guild = 19,
  Skeleton = 20,
  Trophy = 21,
  Information = 22,
  QuestMessage = 23,
}

export enum ChatTab {
  Local = 0,
  Global = 1,
  Group = 2,
  System = 3,
}

// New channel system — string-based to support dynamic PM channels
export type StaticChannel =
  | 'local'
  | 'global'
  | 'party'
  | 'guild'
  | 'admin'
  | 'system';
export type PMChannel = `pm:${string}`;
export type ChatChannel = StaticChannel | PMChannel;

export const ChatChannels = {
  Local: 'local' as StaticChannel,
  Global: 'global' as StaticChannel,
  Party: 'party' as StaticChannel,
  Guild: 'guild' as StaticChannel,
  Admin: 'admin' as StaticChannel,
  System: 'system' as StaticChannel,
} as const;

export const CHANNEL_LABELS: Record<StaticChannel, string> = {
  local: 'Local',
  global: 'Global',
  party: 'Party',
  guild: 'Guild',
  admin: 'Admin',
  system: 'System',
};

export const CHANNEL_COLORS: Record<StaticChannel, string> = {
  local: 'text-white',
  global: 'text-yellow-300',
  party: 'text-green-400',
  guild: 'text-cyan-400',
  admin: 'text-red-400',
  system: 'text-blue-300',
};

export function isPMChannel(ch: ChatChannel): ch is PMChannel {
  return ch.startsWith('pm:');
}

export function pmChannelName(ch: PMChannel): string {
  return ch.slice(3);
}

export function channelLabel(ch: ChatChannel): string {
  if (isPMChannel(ch)) return 'Private';
  return CHANNEL_LABELS[ch as StaticChannel] ?? ch;
}

export function channelColor(ch: ChatChannel): string {
  if (isPMChannel(ch)) return 'text-purple-400';
  return CHANNEL_COLORS[ch as StaticChannel] ?? 'text-white';
}

export enum SlotType {
  Empty = 0,
  Item = 1,
  Skill = 2,
}

export interface ISlot {
  type: SlotType;
  typeId: number;
}
