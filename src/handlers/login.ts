import {
  type EoReader,
  LoginReply,
  LoginReplyServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import { type Client, GameState } from '../client';

function handleLoginReply(client: Client, reader: EoReader) {
  const packet = LoginReplyServerPacket.deserialize(reader);
  if (packet.replyCode === LoginReply.Banned) {
    client.showError('Account is banned', 'Login failed');
    return;
  }

  if (packet.replyCode === LoginReply.LoggedIn) {
    client.showError('Account is logged in', 'Login failed');
    return;
  }

  if (
    packet.replyCode === LoginReply.WrongUser ||
    packet.replyCode === LoginReply.WrongUserPassword
  ) {
    client.showError('Username or password is incorrect', 'Login failed');
    return;
  }

  if (packet.replyCode === LoginReply.Busy) {
    client.showError('Server is busy', 'Login failed');
  }

  const data = packet.replyCodeData as LoginReplyServerPacket.ReplyCodeDataOk;
  client.state = GameState.LoggedIn;
  client.emit('login', data.characters);
}

export function registerLoginHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Login,
    PacketAction.Reply,
    (reader) => handleLoginReply(client, reader),
  );
}
