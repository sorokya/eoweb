import { PacketAction, PacketFamily } from 'eolib';
import mitt, { type Emitter } from 'mitt';
import type { PacketBus } from './bus';
import { handleConnectionPlayer } from './handlers/connection';
import { handleInitInit } from './handlers/init';

type ClientEvents = {
  error: { title: string; message: string };
};

export class Client {
  private emitter: Emitter<ClientEvents>;
  bus: PacketBus | null = null;
  playerId = 0;

  constructor() {
    this.emitter = mitt<ClientEvents>();
  }

  showError(message: string, title = '') {
    this.emitter.emit('error', { title, message });
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
  }
}
