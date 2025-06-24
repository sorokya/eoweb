import {
  type EoReader,
  PacketAction,
  PacketFamily,
  TalkPlayerServerPacket,
  TalkServerServerPacket,
} from 'eolib';
import { ChatBubble } from '../chat-bubble';
import { ChatTab, type Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handleTalkPlayer(client: Client, reader: EoReader) {
  const packet = TalkPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    return;
  }

  client.characterChats.set(character.playerId, new ChatBubble(packet.message));

  client.emit('chat', {
    name: character.name,
    tab: ChatTab.Local,
    message: packet.message,
  });
}

function handleTalkServer(client: Client, reader: EoReader) {
  const packet = TalkServerServerPacket.deserialize(reader);
  client.emit('chat', {
    name: 'Server',
    tab: ChatTab.Local,
    message: packet.message,
  });
  playSfxById(SfxId.ServerMessage);
}

export function registerTalkHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Player,
    (reader) => handleTalkPlayer(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Server,
    (reader) => handleTalkServer(client, reader),
  );
}
