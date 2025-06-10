import {
  type CharacterSelectionListEntry,
  LoginRequestClientPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import mitt, { type Emitter } from 'mitt';
import type { PacketBus } from './bus';
import { handleConnectionPlayer } from './handlers/connection';
import { handleInitInit } from './handlers/init';
import { handleLoginReply } from './handlers/login';

type ClientEvents = {
  error: { title: string; message: string };
  login: CharacterSelectionListEntry[];
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
  state = GameState.Initial;

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
  }

  login(username: string, password: string) {
    const packet = new LoginRequestClientPacket();
    packet.username = username;
    packet.password = password;
    this.bus.send(packet);
  }
}
