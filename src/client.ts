import {
  type CharacterSelectionListEntry,
  LoginRequestClientPacket,
  NearbyInfo,
  PacketAction,
  PacketFamily,
  type ServerSettings,
  WelcomeRequestClientPacket,
} from 'eolib';
import mitt, { type Emitter } from 'mitt';
import type { PacketBus } from './bus';
import { Character } from './character';
import { handleConnectionPlayer } from './handlers/connection';
import { handleInitInit } from './handlers/init';
import { handleLoginReply } from './handlers/login';
import { handleWelcomeReply } from './handlers/welcome';

type ClientEvents = {
  error: { title: string; message: string };
  login: CharacterSelectionListEntry[];
  selectCharacter: { news: string[] };
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

  constructor() {
    this.emitter = mitt<ClientEvents>();
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
}
