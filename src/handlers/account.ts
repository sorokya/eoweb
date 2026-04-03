import {
  AccountReply,
  AccountReplyServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';

function handleAccountReply(client: Client, reader: EoReader) {
  const packet = AccountReplyServerPacket.deserialize(reader);
  if (packet.replyCode in AccountReply) {
    client.authenticationController.notifyAccountReply(packet.replyCode);
    return;
  }
  const data =
    packet.replyCodeData as AccountReplyServerPacket.ReplyCodeDataDefault;
  client.authenticationController.finishAccountCreation(
    packet.replyCode as number,
    data.sequenceStart,
  );
}

export function registerAccountHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Account,
    PacketAction.Reply,
    (reader) => handleAccountReply(client, reader),
  );
}
