import {
  ChairCloseServerPacket,
  ChairPlayerServerPacket,
  ChairRemoveServerPacket,
  ChairReplyServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
  SitState,
} from 'eolib';
import type { Client } from '../client';

function handleChairPlayer(client: Client, reader: EoReader) {
  const packet = ChairPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.direction = packet.direction;
  character.sitState = SitState.Chair;
}

function handleChairRemove(client: Client, reader: EoReader) {
  const packet = ChairRemoveServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.sitState = SitState.Stand;
}

function handleChairClose(client: Client, reader: EoReader) {
  const packet = ChairCloseServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.sitState = SitState.Stand;
}

function handleChairReply(client: Client, reader: EoReader) {
  const packet = ChairReplyServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.direction = packet.direction;
  character.sitState = SitState.Chair;
}

export function registerChairHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Chair,
    PacketAction.Player,
    (reader) => handleChairPlayer(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Chair,
    PacketAction.Remove,
    (reader) => handleChairRemove(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Chair,
    PacketAction.Close,
    (reader) => handleChairClose(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Chair,
    PacketAction.Reply,
    (reader) => handleChairReply(client, reader),
  );
}
