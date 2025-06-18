import {
  type EoReader,
  PacketAction,
  PacketFamily,
  TalkPlayerServerPacket,
} from 'eolib';
import type { Client } from '../client';
import { ChatTab } from '../ui/chat';

function handleTalkPlayer(client: Client, reader: EoReader) {
  const packet = TalkPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    return;
  }

  client.emit('chat', {
    name: character.name,
    tab: ChatTab.Local,
    message: packet.message,
  });
}

export function registerTalkHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Player,
    (reader) => handleTalkPlayer(client, reader),
  );
}
