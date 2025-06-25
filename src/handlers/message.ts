import {
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';

function handleMessagePing(client: Client) {
  const delta = Date.now() - client.pingStart;
  
  client.emit('serverChat', {
    message: `${delta}ms ping`
  })
}

export function registerMessageHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Message,
    PacketAction.Pong,
    (_) => handleMessagePing(client),
  );
}