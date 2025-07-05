import {
  type EoReader,
  LoginReply,
  LoginReplyServerPacket,
  PacketAction,
  PacketFamily,
  WelcomeRequestClientPacket,
} from 'eolib';
import { type Client, GameState } from '../client';

function handleLoginReply(client: Client, reader: EoReader) {
  const packet = LoginReplyServerPacket.deserialize(reader);
  if (packet.replyCode === LoginReply.Banned) {
    client.clearSession();
    client.showError('Account is banned', 'Login failed');
    return;
  }

  if (packet.replyCode === LoginReply.LoggedIn) {
    client.clearSession();
    client.showError('Account is logged in', 'Login failed');
    return;
  }

  if (
    packet.replyCode === LoginReply.WrongUser ||
    packet.replyCode === LoginReply.WrongUserPassword
  ) {
    client.clearSession();
    client.showError('Username or password is incorrect', 'Login failed');
    return;
  }

  if (packet.replyCode === LoginReply.Busy) {
    client.showError('Server is busy', 'Login failed');
  }

  if (reader.remaining > 0) {
    const token = reader.getFixedString(reader.remaining);
    localStorage.setItem('login-token', token);
  }

  const data = packet.replyCodeData as LoginReplyServerPacket.ReplyCodeDataOk;
  client.state = GameState.LoggedIn;

  if (
    client.rememberMe &&
    client.loginToken &&
    data.characters.some((c) => c.id === client.lastCharacterId)
  ) {
    const packet = new WelcomeRequestClientPacket();
    packet.characterId = client.lastCharacterId;
    client.bus.send(packet);
    return;
  }

  client.emit('login', data.characters);
}

export function registerLoginHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Login,
    PacketAction.Reply,
    (reader) => handleLoginReply(client, reader),
  );
}
