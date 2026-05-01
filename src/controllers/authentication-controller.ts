import {
  AccountAgreeClientPacket,
  AccountCreateClientPacket,
  AccountReply,
  AccountReplySequenceStart,
  AccountRequestClientPacket,
  CharacterCreateClientPacket,
  CharacterMapInfo,
  CharacterRemoveClientPacket,
  CharacterReply,
  type CharacterReplyServerPacket,
  CharacterRequestClientPacket,
  type CharacterSelectionListEntry,
  CharacterTakeClientPacket,
  Direction,
  EoWriter,
  EquipmentMapInfo,
  type Gender,
  LoginReply,
  LoginRequestClientPacket,
  PacketAction,
  PacketFamily,
  WelcomeRequestClientPacket,
} from 'eolib';
import type { Client } from '@/client';
import { MAX_CHARACTER_NAME_LENGTH, MIN_CHARACTER_NAME_LENGTH } from '@/consts';
import { DialogResourceID } from '@/edf';
import { GameState } from '@/game-state';
import { SfxId } from '@/sfx';

const SESSIONS_KEY = 'eoweb:sessions';

type SavedSession = {
  username: string;
  token: string;
  lastCharacterId: number;
  lastLoginAt: number;
};

type AccountCreateData = {
  username: string;
  password: string;
  name: string;
  location: string;
  email: string;
};

type CharacterCreateData = {
  name: string;
  gender: Gender;
  hairStyle: number;
  hairColor: number;
  skin: number;
};

const LOGIN_REPLY_DIALOG_IDS: Partial<Record<LoginReply, DialogResourceID>> = {
  [LoginReply.Banned]: DialogResourceID.LOGIN_BANNED_FROM_SERVER,
  [LoginReply.Busy]: DialogResourceID.CONNECTION_SERVER_BUSY,
  [LoginReply.LoggedIn]: DialogResourceID.LOGIN_ACCOUNT_ALREADY_LOGGED_ON,
  [LoginReply.WrongUser]:
    DialogResourceID.LOGIN_ACCOUNT_NAME_OR_PASSWORD_NOT_FOUND,
  [LoginReply.WrongUserPassword]:
    DialogResourceID.LOGIN_ACCOUNT_NAME_OR_PASSWORD_NOT_FOUND,
};

const ACCOUNT_REPLY_DIALOG_IDS: Partial<
  Record<AccountReply, DialogResourceID>
> = {
  [AccountReply.ChangeFailed]: DialogResourceID.CHANGE_PASSWORD_MISMATCH,
  [AccountReply.Changed]: DialogResourceID.CHANGE_PASSWORD_SUCCESS,
  [AccountReply.Created]: DialogResourceID.ACCOUNT_CREATE_SUCCESS_WELCOME,
  [AccountReply.Exists]: DialogResourceID.ACCOUNT_CREATE_NAME_EXISTS,
  [AccountReply.NotApproved]: DialogResourceID.ACCOUNT_CREATE_NAME_NOT_APPROVED,
  [AccountReply.RequestDenied]: DialogResourceID.LOGIN_SERVER_COULD_NOT_PROCESS,
};

const CHARACTER_REPLY_DIALOG_IDS: Partial<
  Record<CharacterReply, DialogResourceID>
> = {
  [CharacterReply.Exists]: DialogResourceID.CHARACTER_CREATE_NAME_EXISTS,
  [CharacterReply.Full]: DialogResourceID.CHARACTER_CREATE_TOO_MANY_CHARS,
  [CharacterReply.Full3]: DialogResourceID.CHARACTER_CREATE_TOO_MANY_CHARS,
  [CharacterReply.NotApproved]:
    DialogResourceID.CHARACTER_CREATE_NAME_NOT_APPROVED,
};

export class AuthenticationController {
  private client: Client;
  private loginToken: string | null = null;
  private lastCharacterId = 0;
  private pendingUsername: string | null = null;
  private _skipAutoLogin = false;
  accountCreateData: AccountCreateData | null = null;
  characterCreateData: CharacterCreateData | null = null;

  private charactersChangeSubscribers: ((
    characters: CharacterSelectionListEntry[],
  ) => void)[] = [];

  private loginFailedSubscribers: (() => void)[] = [];

  constructor(client: Client) {
    this.client = client;
    this.migrateLegacySessions();
    const sessions = this.getSessions();
    if (sessions.length === 1) {
      this.loginToken = sessions[0].token;
      this.lastCharacterId = sessions[0].lastCharacterId;
    }
  }

  private migrateLegacySessions(): void {
    const existing = localStorage.getItem(SESSIONS_KEY);
    if (existing) return;

    const legacyToken = localStorage.getItem('login-token');
    if (!legacyToken) return;

    const legacyCharId =
      Number.parseInt(localStorage.getItem('last-character-id') ?? '', 10) || 0;

    const session: SavedSession = {
      username: this.client.locale.shared.wordUnknown,
      token: legacyToken,
      lastCharacterId: legacyCharId,
      lastLoginAt: Date.now(),
    };
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([session]));
    localStorage.removeItem('login-token');
    localStorage.removeItem('last-character-id');
  }

  clearSession(): void {
    if (this.pendingUsername) {
      this.removeSession(this.pendingUsername);
    }
    this.loginToken = null;
    this.lastCharacterId = 0;
    this.pendingUsername = null;
  }

  getSessions(): SavedSession[] {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SavedSession[];
    } catch {
      return [];
    }
  }

  private persistSessions(sessions: SavedSession[]): void {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }

  saveSession(username: string, token: string): void {
    const sessions = this.getSessions();
    const existing = sessions.find((s) => s.username === username);
    if (existing) {
      existing.token = token;
      existing.lastLoginAt = Date.now();
    } else {
      sessions.push({
        username,
        token,
        lastCharacterId: 0,
        lastLoginAt: Date.now(),
      });
    }
    this.persistSessions(sessions);
  }

  removeSession(username: string): void {
    const sessions = this.getSessions().filter((s) => s.username !== username);
    this.persistSessions(sessions);
    if (this.pendingUsername === username) {
      this.loginToken = null;
      this.lastCharacterId = 0;
      this.pendingUsername = null;
    }
  }

  selectSession(username: string): boolean {
    const session = this.getSessions().find((s) => s.username === username);
    if (!session) return false;
    this.loginToken = session.token;
    this.lastCharacterId = session.lastCharacterId;
    this.pendingUsername = session.username;
    this._skipAutoLogin = false;
    return true;
  }

  getPendingUsername(): string | null {
    return this.pendingUsername;
  }

  skipAutoLogin(): void {
    this._skipAutoLogin = true;
  }

  resetSkipAutoLogin(): void {
    this._skipAutoLogin = false;
  }

  shouldAutoLogin(): boolean {
    return !this._skipAutoLogin && this.loginToken !== null;
  }

  autoLogin(): boolean {
    if (!this.loginToken) {
      return false;
    }

    const writer = new EoWriter();
    writer.addString(this.loginToken);
    this.client.bus.sendBuf(
      PacketFamily.Login,
      PacketAction.Use,
      writer.toByteArray(),
    );
    return true;
  }

  autoSelectCharacter(characters: CharacterSelectionListEntry[]): boolean {
    if (
      !this.loginToken ||
      !characters.some((c) => c.id === this.lastCharacterId)
    ) {
      return false;
    }

    const packet = new WelcomeRequestClientPacket();
    packet.characterId = this.lastCharacterId;
    this.client.bus!.send(packet);
    return true;
  }

  notifyLoginReply(code: LoginReply): void {
    for (const subscriber of this.loginFailedSubscribers) {
      subscriber();
    }

    const dialogId = LOGIN_REPLY_DIALOG_IDS[code];
    if (!dialogId) {
      console.warn(`No dialog mapped for login reply code: ${code}`);
      return;
    }
    const strings = this.client.getDialogStrings(dialogId);
    this.client.alertController.show(strings[0], strings[1]);

    this.clearSession();
  }

  notifyAccountReply(code: AccountReply): void {
    const dialogId = ACCOUNT_REPLY_DIALOG_IDS[code];
    if (!dialogId) {
      console.warn(`No dialog mapped for account reply code: ${code}`);
      return;
    }
    const strings = this.client.getDialogStrings(dialogId);
    this.client.alertController.show(strings[0], strings[1]);

    if (code === AccountReply.Changed) {
      this.client.setState(GameState.CharacterSelect);
    }

    if (code === AccountReply.Created) {
      this.client.setState(GameState.Login);
    }
  }

  notifyCharacterReply(
    code: CharacterReply,
    data: CharacterReplyServerPacket.ReplyCodeData,
  ): void {
    if (code === CharacterReply.Deleted) {
      this.notifyCharacterDeleted(
        (data as CharacterReplyServerPacket.ReplyCodeDataDeleted).characters,
      );
      return;
    }

    if (code === CharacterReply.Ok) {
      this.notifyCharacterCreated(
        (data as CharacterReplyServerPacket.ReplyCodeDataOk).characters,
      );
      return;
    }

    const dialogId = CHARACTER_REPLY_DIALOG_IDS[code];
    if (!dialogId) {
      console.warn(`No dialog mapped for character reply code: ${code}`);
      return;
    }
    const strings = this.client.getDialogStrings(dialogId);
    this.client.alertController.show(strings[0], strings[1]);
  }

  private notifyCharacterCreated(characters: CharacterSelectionListEntry[]) {
    this.notifyCharactersChanged(characters).then(() => {
      const strings = this.client.getDialogStrings(
        DialogResourceID.CHARACTER_CREATE_SUCCESS,
      );
      this.client.alertController.show(strings[0], strings[1]);
      this.client.setState(GameState.CharacterSelect);
    });
  }

  private notifyCharacterDeleted(characters: CharacterSelectionListEntry[]) {
    this.notifyCharactersChanged(characters).then(() => {
      this.client.audioController.playById(SfxId.DeleteCharacter);
    });
  }

  subscribeCharactersChanged(
    subscriber: (characters: CharacterSelectionListEntry[]) => void,
  ) {
    this.charactersChangeSubscribers.push(subscriber);
  }

  subscribeLoginFailed(subscriber: () => void) {
    this.loginFailedSubscribers.push(subscriber);
  }

  notifyLoggedIn(characters: CharacterSelectionListEntry[]): void {
    this.notifyCharactersChanged(characters).then(() => {
      this.client.audioController.playById(SfxId.Login);
      this.client.setState(GameState.CharacterSelect);
    });
  }

  private async notifyCharactersChanged(
    characters: CharacterSelectionListEntry[],
  ): Promise<void> {
    this.client.nearby.characters = this.client.nearby.characters.filter(
      (c) => c.playerId === this.client.playerId,
    );
    this.client.nearby.characters.push(
      ...characters.map((c, i) => {
        const info = new CharacterMapInfo();
        info.playerId = this.client.playerId + i + 1;
        info.name = c.name;
        info.mapId = this.client.mapId;
        info.direction = Direction.Down;
        info.gender = c.gender;
        info.hairStyle = c.hairStyle;
        info.hairColor = c.hairColor;
        info.skin = c.skin;
        info.equipment = new EquipmentMapInfo();
        info.equipment.armor = c.equipment.armor;
        info.equipment.weapon = c.equipment.weapon;
        info.equipment.boots = c.equipment.boots;
        info.equipment.shield = c.equipment.shield;
        info.equipment.hat = c.equipment.hat;
        return info;
      }),
    );
    await this.client.atlas.refreshAsync();

    for (const subscriber of this.charactersChangeSubscribers) {
      subscriber(characters);
    }
  }

  requestAccountCreation(data: AccountCreateData): void {
    this.accountCreateData = data;
    const packet = new AccountRequestClientPacket();
    packet.username = data.username;
    this.client.bus!.send(packet);
  }

  finishAccountCreation(sessionId: number, sequenceStart: number): void {
    if (!this.accountCreateData) {
      console.error('No account data found for account creation');
      return;
    }

    this.client.bus!.setSequence(
      AccountReplySequenceStart.fromValue(sequenceStart),
    );

    const reply = new AccountCreateClientPacket();
    reply.sessionId = sessionId;
    reply.username = this.accountCreateData.username;
    reply.password = this.accountCreateData.password;
    reply.fullName = this.accountCreateData.name;
    reply.location = this.accountCreateData.location;
    reply.email = this.accountCreateData.email;
    reply.hdid = this.client.hdid;
    reply.computer = 'eoweb';
    this.client.bus!.send(reply);
  }

  requestCharacterCreation(data: CharacterCreateData): void {
    if (
      data.name.trim().length < MIN_CHARACTER_NAME_LENGTH ||
      data.name.trim().length > MAX_CHARACTER_NAME_LENGTH
    ) {
      const strings = this.client.getDialogStrings(
        DialogResourceID.CHARACTER_CREATE_NAME_TOO_SHORT,
      );
      this.client.alertController.show(strings[0], strings[1]);
      return;
    }

    this.characterCreateData = data;
    this.client.bus!.send(new CharacterRequestClientPacket());
  }

  finishCharacterCreation(sessionId: number): void {
    if (!this.characterCreateData) {
      console.error('No character data found for character creation');
      return;
    }

    const reply = new CharacterCreateClientPacket();
    reply.sessionId = sessionId;
    reply.name = this.characterCreateData.name;
    reply.gender = this.characterCreateData.gender;
    reply.hairColor = this.characterCreateData.hairColor;
    reply.hairStyle = this.characterCreateData.hairStyle;
    reply.skin = this.characterCreateData.skin;

    this.client.bus!.send(reply);
  }

  changePassword(
    username: string,
    oldPassword: string,
    newPassword: string,
  ): void {
    const packet = new AccountAgreeClientPacket();
    packet.username = username;
    packet.oldPassword = oldPassword;
    packet.newPassword = newPassword;
    this.client.bus!.send(packet);
  }

  login(username: string, password: string, rememberMe: boolean): void {
    this.pendingUsername = username;
    const writer = new EoWriter();
    const packet = new LoginRequestClientPacket();
    packet.username = username;
    packet.password = password;
    packet.serialize(writer);

    if (rememberMe) {
      writer.addChar(1);
    }

    this.client.bus!.sendBuf(
      packet.family,
      packet.action,
      writer.toByteArray(),
    );
  }

  selectCharacter(characterId: number): void {
    const packet = new WelcomeRequestClientPacket();
    packet.characterId = characterId;
    this.client.bus!.send(packet);

    this.lastCharacterId = characterId;
    if (this.pendingUsername) {
      const sessions = this.getSessions();
      const session = sessions.find((s) => s.username === this.pendingUsername);
      if (session) {
        session.lastCharacterId = characterId;
        this.persistSessions(sessions);
      }
    }
  }

  requestCharacterDeletion(characterId: number): void {
    const packet = new CharacterTakeClientPacket();
    packet.characterId = characterId;
    this.client.bus!.send(packet);
  }

  deleteCharacter(characterId: number): void {
    const packet = new CharacterRemoveClientPacket();
    packet.characterId = characterId;
    packet.sessionId = this.client.sessionId;
    this.client.bus!.send(packet);
  }
}
