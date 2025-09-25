import {
  BigCoords,
  CharacterMapInfo,
  Direction,
  type EoReader,
  EquipmentMapInfo,
  LoginReply,
  LoginReplyServerPacket,
  PacketAction,
  PacketFamily,
  WelcomeRequestClientPacket,
} from 'eolib';
import { type Client, GameState } from '../client';
import { DialogResourceID } from '../edf';

function handleLoginReply(client: Client, reader: EoReader) {
  const packet = LoginReplyServerPacket.deserialize(reader);
  if (packet.replyCode === LoginReply.Banned) {
    client.clearSession();
    const text = client.getDialogStrings(
      DialogResourceID.LOGIN_BANNED_FROM_SERVER,
    );
    client.showError(text[1], text[0]);
    return;
  }

  if (packet.replyCode === LoginReply.LoggedIn) {
    client.clearSession();
    const text = client.getDialogStrings(
      DialogResourceID.LOGIN_ACCOUNT_ALREADY_LOGGED_ON,
    );
    client.showError(text[1], text[0]);
    return;
  }

  if (
    packet.replyCode === LoginReply.WrongUser ||
    packet.replyCode === LoginReply.WrongUserPassword
  ) {
    client.clearSession();
    const text = client.getDialogStrings(
      DialogResourceID.LOGIN_ACCOUNT_NAME_OR_PASSWORD_NOT_FOUND,
    );
    client.showError(text[1], text[0]);
    return;
  }

  if (packet.replyCode === LoginReply.Busy) {
    const text = client.getDialogStrings(
      DialogResourceID.CONNECTION_SERVER_BUSY,
    );
    client.showError(text[1], text[0]);
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

  client.nearby.characters.push(
    ...data.characters.map((c) => {
      const info = new CharacterMapInfo();
      info.playerId = c.id;
      info.name = c.name;
      info.mapId = client.mapId;
      info.coords = new BigCoords();
      info.direction = Direction.Down;
      info.gender = c.gender;
      info.hairStyle = c.hairStyle;
      info.hairColor = c.hairColor;
      info.skin = c.skin;
      info.equipment = new EquipmentMapInfo();
      info.equipment.armor = c.equipment.armor;
      info.equipment.weapon = c.equipment.weapon;
      info.equipment.boots = c.equipment.boots;
      info.equipment.shield = c.equipment.shield;
      info.equipment.hat = c.equipment.hat;
      return info;
    }),
  );

  client.atlas.refresh();
  client.emit('login', data.characters);
}

export function registerLoginHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Login,
    PacketAction.Reply,
    (reader) => handleLoginReply(client, reader),
  );
}
