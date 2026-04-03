export enum GameState {
  Initial = 0,
  Connected = 1,
  CreateAccount = 2,
  Login = 3,
  CharacterSelect = 4,
  ChangePassword = 5,
  CreateCharacter = 6,
  InGame = 7,
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
  Join = 4,
  Lookup = 5,
  GuildInfo = 6,
  GuildMembers = 7,
  Manage = 8,
  EditDescription = 9,
  EditRanks = 10,
  Bank = 11,
  KickMember = 12,
  AssignRank = 13,
}
