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

export enum SlotType {
  Empty = 0,
  Item = 1,
  Skill = 2,
}

export interface ISlot {
  type: SlotType;
  typeId: number;
}
