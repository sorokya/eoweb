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

const CHANNEL_LABELS: Record<StaticChannel, string> = {
  local: 'Local',
  global: 'Global',
  party: 'Party',
  guild: 'Guild',
  admin: 'Admin',
  system: 'System',
};

const CHANNEL_COLORS: Record<StaticChannel, string> = {
  local: 'text-base-content',
  global: 'text-warning',
  party: 'text-success',
  guild: 'text-info',
  admin: 'text-error',
  system: 'text-primary',
};

export function isPMChannel(ch: ChatChannel): ch is PMChannel {
  return ch.startsWith('pm:');
}

export function pmChannelName(ch: PMChannel): string {
  return ch.slice(3);
}

export function channelLabel(ch: ChatChannel): string {
  if (isPMChannel(ch)) return `Private (${pmChannelName(ch)})`;
  return CHANNEL_LABELS[ch as StaticChannel] ?? ch;
}

export function channelColor(ch: ChatChannel): string {
  if (isPMChannel(ch)) return 'text-secondary';
  return CHANNEL_COLORS[ch as StaticChannel] ?? 'text-base-content';
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
