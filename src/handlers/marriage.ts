import {
  type EoReader,
  MarriageOpenServerPacket,
  MarriageReply,
  MarriageReplyServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';

function handleMarriageOpen(client: Client, reader: EoReader) {
  const packet = MarriageOpenServerPacket.deserialize(reader);
  client.marriageController.notifyLawyerOpened(packet.sessionId);
}

function handleMarriageReply(client: Client, reader: EoReader) {
  const packet = MarriageReplyServerPacket.deserialize(reader);
  if (packet.replyCode === MarriageReply.Success) {
    const gold = (
      packet.replyCodeData as MarriageReplyServerPacket.ReplyCodeDataSuccess
    ).goldAmount;
    client.marriageController.notifyMarriageApproved(gold);
    return;
  }

  client.marriageController.notifyMarriageReply(packet.replyCode);
}

export function registerMarriageHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Marriage,
    PacketAction.Open,
    (reader) => handleMarriageOpen(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Marriage,
    PacketAction.Reply,
    (reader) => handleMarriageReply(client, reader),
  );
}
