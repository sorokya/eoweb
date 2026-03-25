import {
  type EoReader,
  FacePlayerServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';

function handleFacePlayer(client: Client, reader: EoReader) {
  const packet = FacePlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.sessionController.requestCharacterRange([packet.playerId]);
    return;
  }

  character.direction = packet.direction;
  client.animationController.characterAnimations.delete(packet.playerId);
}

export function registerFaceHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Face,
    PacketAction.Player,
    (reader) => handleFacePlayer(client, reader),
  );
}
