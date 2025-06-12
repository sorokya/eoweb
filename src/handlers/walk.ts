import {
  type EoReader,
  PacketAction,
  PacketFamily,
  WalkPlayerServerPacket,
} from 'eolib';
import type { Client } from '../client';

function handleWalkPlayer(client: Client, reader: EoReader) {
  const packet = WalkPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.unknownPlayerIds.add(packet.playerId);
    return;
  }

  character.direction = packet.direction;
  client.emit('playerWalk', {
    playerId: packet.playerId,
    coords: packet.coords,
    direction: packet.direction,
  });
}

export function registerWalkHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Walk,
    PacketAction.Player,
    (reader) => handleWalkPlayer(client, reader),
  );
}
