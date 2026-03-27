export enum GameState {
  Initial = 0,
  Connected = 1,
  Login = 2,
  LoggedIn = 3,
  InGame = 4,
}

export enum SpellTarget {
  Self = 0,
  Group = 1,
  Npc = 2,
  Player = 3,
}

export enum PlayerMenuItem {
  Paperdoll = 0,
  Book = 1,
  Join = 2,
  Invite = 3,
  Trade = 4,
  Whisper = 5,
  Friend = 6,
  Ignore = 7,
}

export enum TradeState {
  None = 0,
  Pending = 1,
  Open = 2,
}

export enum GuildDialogState {
  None = 0,
  MainMenu = 1,
  Create = 2,
  CreateWaiting = 3,
  CreateFinalize = 4,
  Join = 5,
  Lookup = 6,
  GuildInfo = 7,
  GuildMembers = 8,
  Manage = 9,
  EditDescription = 10,
  EditRanks = 11,
  Bank = 12,
  KickMember = 13,
  AssignRank = 14,
}
