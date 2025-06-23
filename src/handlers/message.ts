import {
  PacketAction,
  PacketFamily,
} from 'eolib';
import { PING_START } from '../game-state';
import { ChatTab, type Client } from '../client';

function handleMessagePing(client: Client) {
    const delta = new Date().getTime() - PING_START;
    client.emit('chat', {
        name: "System",
        tab: ChatTab.Local,
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