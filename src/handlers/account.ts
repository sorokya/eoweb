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
import { DialogResourceID } from '../edf';

function handleAccountReply(client: Client, reader: EoReader) {
  const packet = AccountReplyServerPacket.deserialize(reader);
  switch (packet.replyCode) {
    case AccountReply.Exists: {
      const text = client.getDialogStrings(
        DialogResourceID.ACCOUNT_CREATE_NAME_EXISTS,
      );
      client.showError(text[1], text[0]);
      return;
    }
    case AccountReply.NotApproved: {
      const text = client.getDialogStrings(
        DialogResourceID.ACCOUNT_CREATE_NAME_NOT_APPROVED,
      );
      client.showError(text[1], text[0]);
      return;
    }
    case AccountReply.ChangeFailed: {
      const text = client.getDialogStrings(
        DialogResourceID.CHANGE_PASSWORD_MISMATCH,
      );
      client.showError(text[1], text[0]);
      return;
    }
    case AccountReply.Changed:
      client.emit('passwordChanged', undefined);
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
