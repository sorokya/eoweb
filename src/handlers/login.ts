import {
  type EoReader,
  LoginReply,
  LoginReplyServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';

function handleLoginReply(client: Client, reader: EoReader) {
  const packet = LoginReplyServerPacket.deserialize(reader);
  if (packet.replyCode !== LoginReply.Ok) {
    client.authenticationController.notifyLoginReply(packet.replyCode);
    return;
  }

  if (reader.remaining > 0) {
    const token = reader.getFixedString(reader.remaining);
    const username = client.authenticationController.getPendingUsername();
    if (username) {
      client.authenticationController.saveSession(username, token);
    }
  }

  client.authenticationController.resetSkipAutoLogin();

  const data = packet.replyCodeData as LoginReplyServerPacket.ReplyCodeDataOk;
  if (client.authenticationController.autoSelectCharacter(data.characters)) {
    return;
  }

  client.authenticationController.notifyLoggedIn(data.characters);
}

export function registerLoginHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Login,
    PacketAction.Reply,
    (reader) => handleLoginReply(client, reader),
  );
}
