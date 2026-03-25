import {
  AccountAgreeClientPacket,
  AccountRequestClientPacket,
  CharacterRemoveClientPacket,
  CharacterRequestClientPacket,
  CharacterTakeClientPacket,
  EoWriter,
  LoginRequestClientPacket,
  WelcomeRequestClientPacket,
} from 'eolib';
import type { Client } from '../client';
import { MAX_CHARACTER_NAME_LENGTH } from '../consts';
import type { AccountCreateData, CharacterCreateData } from '../types';

export class AuthenticationController {
  private client: Client;
  accountCreateData: AccountCreateData | null = null;
  characterCreateData: CharacterCreateData | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  requestAccountCreation(data: AccountCreateData): void {
    this.accountCreateData = data;
    const packet = new AccountRequestClientPacket();
    packet.username = data.username;
    this.client.bus!.send(packet);
  }

  requestCharacterCreation(data: CharacterCreateData): void {
    if (
      data.name.trim().length < 4 ||
      data.name.trim().length > MAX_CHARACTER_NAME_LENGTH
    ) {
      this.client.showError('Invalid character name');
      return;
    }

    this.characterCreateData = data;
    this.client.bus!.send(new CharacterRequestClientPacket());
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

    this.client.lastCharacterId = characterId;
    localStorage.setItem('last-character-id', `${characterId}`);
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
