import {
  AvatarRemoveServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';

function handleAvatarRemove(client: Client, reader: EoReader) {
  const packet = AvatarRemoveServerPacket.deserialize(reader);
  // TODO: warp effect
  client.nearby.characters = client.nearby.characters.filter(
    (c) => c.playerId !== packet.playerId,
  );
}

export function registerAvatarHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Avatar,
    PacketAction.Remove,
    (reader) => handleAvatarRemove(client, reader),
  );
}
