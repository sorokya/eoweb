import {
  EmotePlayerServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { Emote } from '../render/emote';

function handleEmotePlayer(client: Client, reader: EoReader) {
  const packet = EmotePlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  client.characterEmotes.set(character.playerId, new Emote(packet.emote));
}

export function registerEmoteHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Emote,
    PacketAction.Player,
    (reader) => handleEmotePlayer(client, reader),
  );
}
