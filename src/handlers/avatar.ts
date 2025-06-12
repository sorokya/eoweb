import { AvatarRemoveServerPacket, type EoReader } from 'eolib';
import type { Client } from '../client';

export function handleAvatarRemove(client: Client, reader: EoReader) {
  const packet = AvatarRemoveServerPacket.deserialize(reader);
  // TODO: warp effect
  client.nearby.characters = client.nearby.characters.filter(
    (c) => c.playerId !== packet.playerId,
  );
}
