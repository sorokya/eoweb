import { type EoReader, FacePlayerServerPacket } from 'eolib';
import type { Client } from '../client';

export function handleFacePlayer(client: Client, reader: EoReader) {
  const packet = FacePlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.unknownPlayerIds.add(packet.playerId);
    return;
  }

  character.direction = packet.direction;
}
