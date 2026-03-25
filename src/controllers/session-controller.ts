import {
  FileType,
  NpcRangeRequestClientPacket,
  PlayerRangeRequestClientPacket,
  RangeRequestClientPacket,
  WarpAcceptClientPacket,
  WarpTakeClientPacket,
  WelcomeAgreeClientPacket,
  WelcomeMsgClientPacket,
} from 'eolib';

import type { Client } from '../client';

export class SessionController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  requestWarpMap(id: number): void {
    const packet = new WarpTakeClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.mapId = id;
    this.client.bus!.send(packet);
  }

  acceptWarp(): void {
    if (this.client.movementController.autoWalkPath.length) {
      this.client.movementController.autoWalkPath = [];
    }

    const packet = new WarpAcceptClientPacket();
    packet.sessionId = this.client.sessionId;
    packet.mapId = this.client.warpMapId;
    this.client.bus!.send(packet);
    this.client.warpQueued = false;
    this.client.keyboardController.freeze();
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
}
