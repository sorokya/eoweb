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
  Menu = 0,
  Create = 1,
  CreateWaiting = 2,
  Finalize = 3,
  Join = 4,
  Lookup = 5,
  Info = 6,
  Members = 7,
  Manage = 8,
  EditDescription = 9,
  EditRanks = 10,
  Bank = 11,
  Kick = 12,
  Rank = 13,
  Closed = 14,
}
