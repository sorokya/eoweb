import {
  type EoReader,
  PacketAction,
  PacketFamily,
  TalkAdminServerPacket,
  TalkAnnounceServerPacket,
  TalkMsgServerPacket,
  TalkPlayerServerPacket,
  TalkServerServerPacket,
  TalkTellServerPacket,
} from 'eolib';
import { ChatBubble } from '../chat-bubble';
import { ChatTab, type Client } from '../client';
import { playSfxById, SfxId } from '../sfx';
import { ChatIcon } from '../ui/chat';
import { capitalize } from '../utils/capitalize';

function handleTalkPlayer(client: Client, reader: EoReader) {
  const packet = TalkPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    return;
  }

  client.characterChats.set(
    character.playerId,
    new ChatBubble(client.sans11, packet.message),
  );

  client.emit('chat', {
    tab: ChatTab.Local,
    message: `${capitalize(character.name)} ${packet.message}`,
  });
}

function handleTalkServer(client: Client, reader: EoReader) {
  const packet = TalkServerServerPacket.deserialize(reader);
  client.emit('serverChat', {
    message: packet.message,
  });
}

function handleTalkMsg(client: Client, reader: EoReader) {
  const packet = TalkMsgServerPacket.deserialize(reader);
  client.emit('chat', {
    message: `${capitalize(packet.playerName)} ${packet.message}`,
    tab: ChatTab.Global,
  });
}

function handleTalkAdmin(client: Client, reader: EoReader) {
  const packet = TalkAdminServerPacket.deserialize(reader);
  client.emit('chat', {
    icon: ChatIcon.HGM,
    message: `${capitalize(packet.playerName)} ${packet.message}`,
    tab: ChatTab.Group,
  });
  playSfxById(SfxId.AdminChatReceived);
}

function handleTalkTell(client: Client, reader: EoReader) {
  const packet = TalkTellServerPacket.deserialize(reader);
  client.emit('chat', {
    icon: ChatIcon.Note,
    message: `${capitalize(packet.playerName)}->${capitalize(client.name)} ${packet.message}`,
    tab: ChatTab.Local,
  });
  playSfxById(SfxId.PrivateMessageReceived);
}

function handleTalkAnnounce(client: Client, reader: EoReader) {
  const packet = TalkAnnounceServerPacket.deserialize(reader);
  client.characterChats.set(
    client.playerId,
    new ChatBubble(client.sans11, packet.message),
  );
  client.emit('chat', {
    tab: ChatTab.Local,
    message: `${capitalize(packet.playerName)} ${packet.message}`,
    icon: ChatIcon.GlobalAnnounce,
  });
  client.emit('chat', {
    tab: ChatTab.Group,
    message: `${capitalize(packet.playerName)} ${packet.message}`,
    icon: ChatIcon.GlobalAnnounce,
  });
  client.emit('chat', {
    tab: ChatTab.Global,
    message: `${capitalize(packet.playerName)} ${packet.message}`,
    icon: ChatIcon.GlobalAnnounce,
  });
  playSfxById(SfxId.AdminAnnounceReceived);
}

export function registerTalkHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Player,
    (reader) => handleTalkPlayer(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Server,
    (reader) => handleTalkServer(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Announce,
    (reader) => handleTalkAnnounce(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Msg,
    (reader) => handleTalkMsg(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Admin,
    (reader) => handleTalkAdmin(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Tell,
    (reader) => handleTalkTell(client, reader),
  );
}
