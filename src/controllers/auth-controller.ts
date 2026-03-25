import {
  AccountAgreeClientPacket,
  AccountRequestClientPacket,
  CharacterRemoveClientPacket,
  CharacterRequestClientPacket,
  CharacterTakeClientPacket,
  DialogReply,
  EoWriter,
  FileType,
  LoginRequestClientPacket,
  NpcRangeRequestClientPacket,
  PlayerRangeRequestClientPacket,
  QuestAcceptClientPacket,
  RangeRequestClientPacket,
  type StatId,
  StatSkillAddClientPacket,
  StatSkillJunkClientPacket,
  StatSkillRemoveClientPacket,
  StatSkillTakeClientPacket,
  TrainType,
  WarpAcceptClientPacket,
  WarpTakeClientPacket,
  WelcomeAgreeClientPacket,
  WelcomeMsgClientPacket,
  WelcomeRequestClientPacket,
} from 'eolib';
import type { Client } from '../client';
import { MAX_CHARACTER_NAME_LENGTH } from '../consts';
import type { AccountCreateData, CharacterCreateData } from '../types';

export class AuthController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  requestAccountCreation(data: AccountCreateData): void {
    this.client.accountCreateData = data;
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

    this.client.characterCreateData = data;
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

  requestWarpMap(id: number): void {
    const packet = new WarpTakeClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.mapId = id;
    this.client.bus!.send(packet);
  }

  acceptWarp(): void {
    if (this.client.autoWalkPath.length) {
      this.client.autoWalkPath = [];
    }

    const packet = new WarpAcceptClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.mapId = this.client.warpMapId;
    this.client.bus!.send(packet);
    this.client.warpQueued = false;
    this.client.movementController.freeze = true;
  }

  requestFile(fileType: FileType, id: number): void {
    const packet = new WelcomeAgreeClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.fileType = fileType;

    switch (fileType) {
      case FileType.Ecf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEcf();
        packet.fileTypeData.fileId = id;
        this.client.emit('debug', 'Loading classes..');
        break;
      case FileType.Eif:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEif();
        packet.fileTypeData.fileId = id;
        this.client.emit('debug', 'Loading items..');
        break;
      case FileType.Enf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEnf();
        packet.fileTypeData.fileId = id;
        this.client.emit('debug', 'Loading NPCs..');
        break;
      case FileType.Esf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEsf();
        packet.fileTypeData.fileId = id;
        this.client.emit('debug', 'Loading spells..');
        break;
      case FileType.Emf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEmf();
        packet.fileTypeData.fileId = id;
        this.client.emit('debug', 'Loading map..');
        break;
    }

    this.client.bus!.send(packet);
  }

  enterGame(): void {
    const packet = new WelcomeMsgClientPacket();
    packet.characterId = this.client.characterId;
    packet.sessionId = this.client.sessionId;
    this.client.bus!.send(packet);
  }

  rangeRequest(playerIds: number[], npcIndexes: number[]): void {
    const packet = new RangeRequestClientPacket();
    packet.playerIds = playerIds;
    packet.npcIndexes = npcIndexes;
    this.client.bus!.send(packet);
  }

  requestCharacterRange(playerIds: number[]): void {
    const packet = new PlayerRangeRequestClientPacket();
    packet.playerIds = playerIds;
    this.client.bus!.send(packet);
  }

  requestNpcRange(npcIndexes: number[]): void {
    const packet = new NpcRangeRequestClientPacket();
    packet.npcIndexes = npcIndexes;
    this.client.bus!.send(packet);
  }

  questReply(questId: number, dialogId: number, action: number | null): void {
    const packet = new QuestAcceptClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.questId = questId;
    packet.npcIndex = this.client.interactNpcIndex;
    packet.dialogId = dialogId;
    packet.replyType = action !== null ? DialogReply.Link : DialogReply.Ok;
    if (action !== null) {
      packet.replyTypeData = new QuestAcceptClientPacket.ReplyTypeDataLink();
      packet.replyTypeData.action = action;
    } else {
      packet.replyTypeData = new QuestAcceptClientPacket.ReplyTypeDataOk();
    }
    this.client.bus!.send(packet);
  }

  trainStat(statId: StatId): void {
    const packet = new StatSkillAddClientPacket();
    packet.actionType = TrainType.Stat;
    packet.actionTypeData = new StatSkillAddClientPacket.ActionTypeDataStat();
    packet.actionTypeData.statId = statId;
    this.client.bus!.send(packet);
  }

  learnSkill(skillId: number): void {
    const packet = new StatSkillTakeClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.spellId = skillId;
    this.client.bus!.send(packet);
  }

  forgetSkill(skillId: number): void {
    const packet = new StatSkillRemoveClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.spellId = skillId;
    this.client.bus!.send(packet);
  }

  resetCharacter(): void {
    const packet = new StatSkillJunkClientPacket();
    packet.sessionId = this.client.sessionId;
    this.client.bus!.send(packet);
  }
}
