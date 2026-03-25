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

export function requestAccountCreation(
  client: Client,
  data: AccountCreateData,
): void {
  client.accountCreateData = data;
  const packet = new AccountRequestClientPacket();
  packet.username = data.username;
  client.bus!.send(packet);
}

export function requestCharacterCreation(
  client: Client,
  data: CharacterCreateData,
): void {
  if (
    data.name.trim().length < 4 ||
    data.name.trim().length > MAX_CHARACTER_NAME_LENGTH
  ) {
    client.showError('Invalid character name');
    return;
  }

  client.characterCreateData = data;
  client.bus!.send(new CharacterRequestClientPacket());
}

export function changePassword(
  client: Client,
  username: string,
  oldPassword: string,
  newPassword: string,
): void {
  const packet = new AccountAgreeClientPacket();
  packet.username = username;
  packet.oldPassword = oldPassword;
  packet.newPassword = newPassword;
  client.bus!.send(packet);
}

export function login(
  client: Client,
  username: string,
  password: string,
  rememberMe: boolean,
): void {
  const writer = new EoWriter();
  const packet = new LoginRequestClientPacket();
  packet.username = username;
  packet.password = password;
  packet.serialize(writer);

  if (rememberMe) {
    writer.addChar(1);
  }

  client.bus!.sendBuf(packet.family, packet.action, writer.toByteArray());
}

export function selectCharacter(client: Client, characterId: number): void {
  const packet = new WelcomeRequestClientPacket();
  packet.characterId = characterId;
  client.bus!.send(packet);

  client.lastCharacterId = characterId;
  localStorage.setItem('last-character-id', `${characterId}`);
}

export function requestCharacterDeletion(
  client: Client,
  characterId: number,
): void {
  const packet = new CharacterTakeClientPacket();
  packet.characterId = characterId;
  client.bus!.send(packet);
}

export function deleteCharacter(client: Client, characterId: number): void {
  const packet = new CharacterRemoveClientPacket();
  packet.characterId = characterId;
  packet.sessionId = client.sessionId;
  client.bus!.send(packet);
}

export function requestWarpMap(client: Client, id: number): void {
  const packet = new WarpTakeClientPacket();
  packet.sessionId = client.sessionId;
  packet.mapId = id;
  client.bus!.send(packet);
}

export function acceptWarp(client: Client): void {
  if (client.autoWalkPath.length) {
    client.autoWalkPath = [];
  }

  const packet = new WarpAcceptClientPacket();
  packet.sessionId = client.sessionId;
  packet.mapId = client.warpMapId;
  client.bus!.send(packet);
  client.warpQueued = false;
  client.movementController.freeze = true;
}

export function requestFile(
  client: Client,
  fileType: FileType,
  id: number,
): void {
  const packet = new WelcomeAgreeClientPacket();
  packet.sessionId = client.sessionId;
  packet.fileType = fileType;

  switch (fileType) {
    case FileType.Ecf:
      packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEcf();
      packet.fileTypeData.fileId = id;
      client.emit('debug', 'Loading classes..');
      break;
    case FileType.Eif:
      packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEif();
      packet.fileTypeData.fileId = id;
      client.emit('debug', 'Loading items..');
      break;
    case FileType.Enf:
      packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEnf();
      packet.fileTypeData.fileId = id;
      client.emit('debug', 'Loading NPCs..');
      break;
    case FileType.Esf:
      packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEsf();
      packet.fileTypeData.fileId = id;
      client.emit('debug', 'Loading spells..');
      break;
    case FileType.Emf:
      packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEmf();
      packet.fileTypeData.fileId = id;
      client.emit('debug', 'Loading map..');
      break;
  }

  client.bus!.send(packet);
}

export function enterGame(client: Client): void {
  const packet = new WelcomeMsgClientPacket();
  packet.characterId = client.characterId;
  packet.sessionId = client.sessionId;
  client.bus!.send(packet);
}

export function rangeRequest(
  client: Client,
  playerIds: number[],
  npcIndexes: number[],
): void {
  const packet = new RangeRequestClientPacket();
  packet.playerIds = playerIds;
  packet.npcIndexes = npcIndexes;
  client.bus!.send(packet);
}

export function requestCharacterRange(
  client: Client,
  playerIds: number[],
): void {
  const packet = new PlayerRangeRequestClientPacket();
  packet.playerIds = playerIds;
  client.bus!.send(packet);
}

export function requestNpcRange(client: Client, npcIndexes: number[]): void {
  const packet = new NpcRangeRequestClientPacket();
  packet.npcIndexes = npcIndexes;
  client.bus!.send(packet);
}

export function questReply(
  client: Client,
  questId: number,
  dialogId: number,
  action: number | null,
): void {
  const packet = new QuestAcceptClientPacket();
  packet.sessionId = client.sessionId;
  packet.questId = questId;
  packet.npcIndex = client.interactNpcIndex;
  packet.dialogId = dialogId;
  packet.replyType = action ? DialogReply.Link : DialogReply.Ok;
  if (action) {
    packet.replyTypeData = new QuestAcceptClientPacket.ReplyTypeDataLink();
    packet.replyTypeData.action = action;
  } else {
    packet.replyTypeData = new QuestAcceptClientPacket.ReplyTypeDataOk();
  }
  client.bus!.send(packet);
}

export function trainStat(client: Client, statId: StatId): void {
  const packet = new StatSkillAddClientPacket();
  packet.actionType = TrainType.Stat;
  packet.actionTypeData = new StatSkillAddClientPacket.ActionTypeDataStat();
  packet.actionTypeData.statId = statId;
  client.bus!.send(packet);
}

export function learnSkill(client: Client, skillId: number): void {
  const packet = new StatSkillTakeClientPacket();
  packet.sessionId = client.sessionId;
  packet.spellId = skillId;
  client.bus!.send(packet);
}

export function forgetSkill(client: Client, skillId: number): void {
  const packet = new StatSkillRemoveClientPacket();
  packet.sessionId = client.sessionId;
  packet.spellId = skillId;
  client.bus!.send(packet);
}

export function resetCharacter(client: Client): void {
  const packet = new StatSkillJunkClientPacket();
  packet.sessionId = client.sessionId;
  client.bus!.send(packet);
}
