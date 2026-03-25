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

export function handleCommand(client: Client, input: string): boolean {
  const args = input.split(' ');
  switch (args[0]) {
    case '#ping': {
      client.pingStart = Date.now();
      client.bus!.send(new MessagePingClientPacket());
      return true;
    }

    case '#find': {
      const packet = new PlayersAcceptClientPacket();
      packet.name = args[1] || '';
      if (!packet.name) {
        return false;
      }

      client.bus!.send(packet);
      return true;
    }

    case '#loc': {
      const coords = client.getPlayerCoords();
      client.emit('serverChat', {
        message: `${client.getResourceString(EOResourceID.STATUS_LABEL_YOUR_LOCATION_IS_AT)} ${client.mapId} x:${coords.x} y:${coords.y}`,
      });
      return true;
    }

    case '#engine': {
      client.emit('serverChat', {
        message: `eoweb client version: ${client.version.major}.${client.version.minor}.${client.version.patch}`,
      });
      client.emit('serverChat', {
        message: 'render engine: canvas',
      });
      return true;
    }

    case '#usage': {
      const hours = Math.floor(client.usage / 60);
      const minutes = client.usage - hours * 60;
      client.emit('serverChat', {
        message: hours
          ? `usage: ${hours}hrs. ${minutes}min.`
          : `usage: ${minutes}min.`,
      });
      return true;
    }

    case '#nowall': {
      if (client.admin === AdminLevel.Player) {
        return false;
      }

      client.nowall = !client.nowall;
      playSfxById(SfxId.TextBoxFocus);
      return true;
    }

    case '#debug': {
      client.debug = !client.debug;
      playSfxById(SfxId.TextBoxFocus);
      return true;
    }

    case '#guild': {
      const packet = new TalkReportClientPacket();
      packet.message = input;
      client.bus!.send(packet);
      return true;
    }
  }

  return false;
}
