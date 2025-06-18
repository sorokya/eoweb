import {
  AccountCreateClientPacket,
  AccountReply,
  AccountReplySequenceStart,
  AccountReplyServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';

function handleAccountReply(client: Client, reader: EoReader) {
  const packet = AccountReplyServerPacket.deserialize(reader);
  switch (packet.replyCode) {
    case AccountReply.Exists:
      client.showError('An account with that name already exists');
      return;
    case AccountReply.NotApproved:
      client.showError('That account name is not approved');
      return;
    case AccountReply.ChangeFailed:
      client.showError('There was an error processing your request');
      return;
    case AccountReply.Changed:
      client.showError('Your password has been changed', 'Success');
      return;
    case AccountReply.RequestDenied:
      client.showError('Your request was denied');
      return;
    case AccountReply.Created:
      client.emit('accountCreated', undefined);
      return;
    default: {
      const accountData = client.accountCreateData;
      if (!accountData) {
        return;
      }

      const data =
        packet.replyCodeData as AccountReplyServerPacket.ReplyCodeDataDefault;
      client.bus.setSequence(
        AccountReplySequenceStart.fromValue(data.sequenceStart),
      );
      const reply = new AccountCreateClientPacket();

      reply.sessionId = packet.replyCode as number;
      reply.username = accountData.username;
      reply.password = accountData.password;
      reply.fullName = accountData.name;
      reply.location = accountData.location;
      reply.email = accountData.email;
      reply.hdid = '1111111111';
      reply.computer = 'eoweb';
      client.bus.send(reply);
      break;
    }
  }
}

export function registerAccountHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Account,
    PacketAction.Reply,
    (reader) => handleAccountReply(client, reader),
  );
}
