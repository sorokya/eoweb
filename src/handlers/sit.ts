import {
  AdminLevel,
  type EoReader,
  MapTileSpec,
  PacketAction,
  PacketFamily,
  SitCloseServerPacket,
  SitPlayerServerPacket,
  SitRemoveServerPacket,
  SitReplyServerPacket,
  SitState,
} from 'eolib';
import type { Client } from '@/client';
import { SfxId } from '@/sfx';

function handleSitPlayer(client: Client, reader: EoReader) {
  const packet = SitPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.sessionController.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.direction = packet.direction;
  character.sitState = SitState.Floor;

  if (character.invisible && client.admin === AdminLevel.Player) {
    return;
  }

  client.audioController.playAtPosition(SfxId.Sit, character.coords);

  const spec = client.mapRenderer.getTileSpecAt(character.coords);
  if (spec && spec === MapTileSpec.Water) {
    client.animationController.playSplooshieEffect(packet.playerId);
  }
}

function handleSitRemove(client: Client, reader: EoReader) {
  const packet = SitRemoveServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.sessionController.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.sitState = SitState.Stand;
}

function handleSitClose(client: Client, reader: EoReader) {
  const packet = SitCloseServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.sessionController.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.sitState = SitState.Stand;
}

function handleSitReply(client: Client, reader: EoReader) {
  const packet = SitReplyServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.sessionController.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.direction = packet.direction;
  character.sitState = SitState.Floor;

  client.audioController.playById(SfxId.Sit);

  const spec = client.mapRenderer.getTileSpecAt(character.coords);
  if (spec && spec === MapTileSpec.Water) {
    client.animationController.playSplooshieEffect(packet.playerId);
  }
}

export function registerSitHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Sit,
    PacketAction.Player,
    (reader) => handleSitPlayer(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Sit,
    PacketAction.Remove,
    (reader) => handleSitRemove(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Sit,
    PacketAction.Close,
    (reader) => handleSitClose(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Sit,
    PacketAction.Reply,
    (reader) => handleSitReply(client, reader),
  );
}
