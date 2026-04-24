import {
  AdminLevel,
  MessagePingClientPacket,
  PlayersAcceptClientPacket,
} from 'eolib';

import type { Client } from '@/client';
import { EOResourceID } from '@/edf';
import { playSfxById, SfxId } from '@/sfx';

export class CommandController {
  private client: Client;
  pingStart = 0;
  nowall = false;

  constructor(client: Client) {
    this.client = client;
  }

  handleCommand(input: string): boolean {
    const args = input.split(' ');
    switch (args[0]) {
      case '#ping': {
        this.pingStart = Date.now();
        this.client.bus!.send(new MessagePingClientPacket());
        return true;
      }

      case '#find': {
        const packet = new PlayersAcceptClientPacket();
        packet.name = args[1] || '';
        if (!packet.name) {
          return false;
        }

        this.client.bus!.send(packet);
        return true;
      }

      case '#loc': {
        const coords = this.client.getPlayerCoords();
        const message = `${this.client.getResourceString(EOResourceID.STATUS_LABEL_YOUR_LOCATION_IS_AT)} ${this.client.mapId} x:${coords.x} y:${coords.y}`;
        playSfxById(SfxId.ServerMessage);
        this.client.emit('serverChat', {
          message,
        });
        this.client.toastController.show(message);
        return true;
      }

      case '#engine': {
        const messages = [
          `eoweb client version: ${this.client.version.major}.${this.client.version.minor}.${this.client.version.patch}`,
          'render engine: canvas',
        ];

        playSfxById(SfxId.ServerMessage);

        this.client.emit('serverChat', {
          message: messages[0],
        });
        this.client.emit('serverChat', {
          message: messages[1],
        });

        this.client.toastController.show(messages.join('\n'));

        return true;
      }

      case '#usage': {
        playSfxById(SfxId.ServerMessage);
        const hours = Math.floor(this.client.usageController.usage / 60);
        const minutes = this.client.usageController.usage - hours * 60;
        const message = hours
          ? `usage: ${hours}hrs. ${minutes}min.`
          : `usage: ${minutes}min.`;
        this.client.toastController.show(message);
        this.client.emit('serverChat', {
          message,
        });
        return true;
      }

      case '#nowall': {
        if (this.client.admin === AdminLevel.Player) {
          return false;
        }

        this.nowall = !this.nowall;
        playSfxById(SfxId.TextBoxFocus);
        return true;
      }
    }

    return false;
  }
}
