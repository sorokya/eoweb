import { AdminLevel, PlayersAcceptClientPacket } from 'eolib';

import type { Client } from '@/client';
import { EOResourceID } from '@/edf';
import { SfxId } from '@/sfx';

export class CommandController {
  private client: Client;
  nowall = false;

  constructor(client: Client) {
    this.client = client;
  }

  handleCommand(input: string): boolean {
    const args = input.split(' ');
    switch (args[0]) {
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
        this.client.audioController.playById(SfxId.ServerMessage);
        this.client.chatController.notifyServerChat({
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

        this.client.audioController.playById(SfxId.ServerMessage);

        this.client.chatController.notifyServerChat({
          message: messages[0],
        });
        this.client.chatController.notifyServerChat({
          message: messages[1],
        });

        this.client.toastController.show(messages.join('\n'));

        return true;
      }

      case '#usage': {
        this.client.audioController.playById(SfxId.ServerMessage);
        const hours = Math.floor(this.client.usageController.usage / 60);
        const minutes = this.client.usageController.usage - hours * 60;
        const message = hours
          ? `usage: ${hours}hrs. ${minutes}min.`
          : `usage: ${minutes}min.`;
        this.client.toastController.show(message);
        this.client.chatController.notifyServerChat({
          message,
        });
        return true;
      }

      case '#nowall': {
        if (this.client.admin === AdminLevel.Player) {
          return false;
        }

        this.nowall = !this.nowall;
        this.client.audioController.playById(SfxId.TextBoxFocus);
        return true;
      }
    }

    return false;
  }
}
