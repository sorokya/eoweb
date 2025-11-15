import {
  AdminLevel,
  type EoReader,
  PacketAction,
  PacketFamily,
  TalkAdminServerPacket,
  TalkAnnounceServerPacket,
  TalkMsgServerPacket,
  TalkOpenServerPacket,
  TalkPlayerServerPacket,
  TalkServerServerPacket,
  TalkTellServerPacket,
} from 'eolib';
import { ChatBubble } from '../chat-bubble';
import { ChatTab, type Client } from '../client';
import { COLORS } from '../consts';
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
    name: capitalize(character.name),
    message: packet.message,
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
    icon: ChatIcon.GlobalAnnounce,
    name: capitalize(packet.playerName),
    message: packet.message,
    tab: ChatTab.Global,
  });
}

function handleTalkAdmin(client: Client, reader: EoReader) {
  const packet = TalkAdminServerPacket.deserialize(reader);
  client.emit('chat', {
    icon: ChatIcon.GM,
    name: capitalize(packet.playerName),
    message: packet.message,
    tab: ChatTab.Group,
  });
  playSfxById(SfxId.AdminChatReceived);
}

function handleTalkTell(client: Client, reader: EoReader) {
  const packet = TalkTellServerPacket.deserialize(reader);
  client.emit('chat', {
    icon: ChatIcon.Note,
    name: `${capitalize(packet.playerName)}->${capitalize(client.name)}`,
    message: packet.message,
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
    name: capitalize(packet.playerName),
    message: packet.message,
    icon: ChatIcon.GlobalAnnounce,
  });
  client.emit('chat', {
    tab: ChatTab.Group,
    name: capitalize(packet.playerName),
    message: packet.message,
    icon: ChatIcon.GlobalAnnounce,
  });
  client.emit('chat', {
    tab: ChatTab.Global,
    name: capitalize(packet.playerName),
    message: packet.message,
    icon: ChatIcon.GlobalAnnounce,
  });
  playSfxById(SfxId.AdminAnnounceReceived);
}

function handleTalkOpen(client: Client, reader: EoReader) {
  const packet = TalkOpenServerPacket.deserialize(reader);
  const player = client.partyMembers.find(
    (m) => m.playerId === packet.playerId,
  );
  if (!player) {
    return;
  }

  client.emit('chat', {
    tab: ChatTab.Group,
    name: capitalize(player.name),
    message: packet.message,
    icon: ChatIcon.PlayerParty,
  });

  if (
    client.nearby.characters.some(
      (c) =>
        c.playerId === packet.playerId &&
        (!c.invisible || client.admin !== AdminLevel.Player),
    )
  ) {
    client.characterChats.set(
      packet.playerId,
      new ChatBubble(
        client.sans11,
        packet.message,
        COLORS.ChatBubble,
        COLORS.ChatBubbleBackgroundParty,
      ),
    );
  }

  playSfxById(SfxId.GroupChatReceived);
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
  client.bus.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Open,
    (reader) => handleTalkOpen(client, reader),
  );
}
