import {
  CharacterPlayerServerPacket,
  CharacterReply,
  CharacterReplyServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';

function handleCharacterReply(client: Client, reader: EoReader) {
  const packet = CharacterReplyServerPacket.deserialize(reader);

  if (packet.replyCode in CharacterReply) {
    client.authenticationController.notifyCharacterReply(
      packet.replyCode,
      packet.replyCodeData,
    );
    return;
  }

  client.authenticationController.finishCharacterCreation(
    packet.replyCode as number,
  );
}

function handleCharacterPlayer(client: Client, reader: EoReader) {
  const packet = CharacterPlayerServerPacket.deserialize(reader);
  client.sessionId = packet.sessionId;
}

export function registerCharacterHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Character,
    PacketAction.Reply,
    (reader) => handleCharacterReply(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Character,
    PacketAction.Player,
    (reader) => handleCharacterPlayer(client, reader),
  );
}
