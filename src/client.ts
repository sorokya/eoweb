import {
  type CharacterSelectionListEntry,
  type Ecf,
  type Eif,
  type Emf,
  type Enf,
  type Esf,
  FileType,
  LoginRequestClientPacket,
  NearbyInfo,
  PacketAction,
  PacketFamily,
  type ServerSettings,
  WelcomeAgreeClientPacket,
  WelcomeMsgClientPacket,
  WelcomeRequestClientPacket,
} from 'eolib';
import mitt, { type Emitter } from 'mitt';
import type { PacketBus } from './bus';
import { Character } from './character';
import { handleConnectionPlayer } from './handlers/connection';
import { handleInitInit } from './handlers/init';
import { handleLoginReply } from './handlers/login';
import { handleWelcomeReply } from './handlers/welcome';
import { getEcf, getEif, getEmf, getEnf, getEsf } from './db';

type ClientEvents = {
  error: { title: string; message: string };
  debug: string;
  login: CharacterSelectionListEntry[];
  selectCharacter: undefined;
  enterGame: { news: string[] };
};

export enum GameState {
  Initial = 0,
  Connected = 1,
  Login = 2,
  LoggedIn = 3,
  InGame = 4,
}

export class Client {
  private emitter: Emitter<ClientEvents>;
  bus: PacketBus | null = null;
  playerId = 0;
  character = new Character();
  mapId = 5;
  state = GameState.Initial;
  sessionId = 0;
  serverSettings: ServerSettings | null = null;
  motd = '';
  nearby = new NearbyInfo();
  eif: Eif | null = null;
  ecf: Ecf | null = null;
  enf: Enf | null = null;
  esf: Esf | null = null;
  map: Emf | null = null;
  downloadQueue: { type: FileType; id: number }[] = [];

  constructor() {
    this.emitter = mitt<ClientEvents>();
    getEif().then((eif) => {
      this.eif = eif;
    });
    getEcf().then((ecf) => {
      this.ecf = ecf;
    });
    getEnf().then((enf) => {
      this.enf = enf;
    });
    getEsf().then((esf) => {
      this.esf = esf;
    });
  }

  async loadMap(id: number): Promise<void> {
    this.map = await getEmf(id);
  }

  showError(message: string, title = '') {
    this.emitter.emit('error', { title, message });
  }

  emit<Event extends keyof ClientEvents>(
    event: Event,
    data: ClientEvents[Event],
  ) {
    this.emitter.emit(event, data);
  }

  on<Event extends keyof ClientEvents>(
    event: Event,
    handler: (data: ClientEvents[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  setBus(bus: PacketBus) {
    this.bus = bus;
    this.bus.registerPacketHandler(
      PacketFamily.Init,
      PacketAction.Init,
      (reader) => {
        handleInitInit(this, reader);
      },
    );
    this.bus.registerPacketHandler(
      PacketFamily.Connection,
      PacketAction.Player,
      (reader) => {
        handleConnectionPlayer(this, reader);
      },
    );
    this.bus.registerPacketHandler(
      PacketFamily.Login,
      PacketAction.Reply,
      (reader) => {
        handleLoginReply(this, reader);
      },
    );
    this.bus.registerPacketHandler(
      PacketFamily.Welcome,
      PacketAction.Reply,
      (reader) => handleWelcomeReply(this, reader),
    );
  }

  login(username: string, password: string) {
    const packet = new LoginRequestClientPacket();
    packet.username = username;
    packet.password = password;
    this.bus.send(packet);
  }

  selectCharacter(characterId: number) {
    const packet = new WelcomeRequestClientPacket();
    packet.characterId = characterId;
    this.bus.send(packet);
  }

  requestFile(fileType: FileType, id: number) {
    const packet = new WelcomeAgreeClientPacket();
    packet.sessionId = this.sessionId;
    packet.fileType = fileType;

    switch (fileType) {
      case FileType.Ecf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEcf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading classes..');
        break;
      case FileType.Eif:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEif();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading items..');
        break;
      case FileType.Enf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEnf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading NPCs..');
        break;
      case FileType.Esf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEsf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading spells..');
        break;
      case FileType.Emf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEmf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading map..');
        break;
    }

    this.bus.send(packet);
  }

  enterGame() {
    const packet = new WelcomeMsgClientPacket();
    packet.characterId = this.character.id;
    packet.sessionId = this.sessionId;
    this.bus.send(packet);
  }
}
