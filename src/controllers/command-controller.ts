import {
  AdminLevel,
  MessagePingClientPacket,
  PlayersAcceptClientPacket,
  TalkReportClientPacket,
} from 'eolib';

import type { Client } from '../client';
import { EOResourceID } from '../edf';
import { playSfxById } from '../sfx';
import { SfxId } from '../types';

export class CommandController {
  private client: Client;
  pingStart = 0;
  debug = false;
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
        this.client.emit('serverChat', {
          message: `${this.client.getResourceString(EOResourceID.STATUS_LABEL_YOUR_LOCATION_IS_AT)} ${this.client.mapId} x:${coords.x} y:${coords.y}`,
        });
        return true;
      }

      case '#engine': {
        this.client.emit('serverChat', {
          message: `eoweb client version: ${this.client.version.major}.${this.client.version.minor}.${this.client.version.patch}`,
        });
        this.client.emit('serverChat', {
          message: 'render engine: canvas',
        });
        return true;
      }

      case '#usage': {
        const hours = Math.floor(this.client.usage / 60);
        const minutes = this.client.usage - hours * 60;
        this.client.emit('serverChat', {
          message: hours
            ? `usage: ${hours}hrs. ${minutes}min.`
            : `usage: ${minutes}min.`,
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

      case '#debug': {
        this.debug = !this.debug;
        playSfxById(SfxId.TextBoxFocus);
        return true;
      }

      case '#guild': {
        const packet = new TalkReportClientPacket();
        packet.message = input;
        this.client.bus!.send(packet);
        return true;
      }
    }

    return false;
  }
}
