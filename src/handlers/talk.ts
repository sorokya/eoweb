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
  TalkReply,
  TalkReplyServerPacket,
  TalkRequestServerPacket,
  TalkServerServerPacket,
  TalkTellServerPacket,
} from 'eolib';
import type { Client } from '@/client';
import { COLORS } from '@/consts';
import { EOResourceID } from '@/edf';
import { ChatBubble } from '@/render';
import { SfxId } from '@/sfx';
import { ChatChannels, ChatIcon } from '@/ui/enums';
import { capitalize } from '@/utils';

function handleTalkPlayer(client: Client, reader: EoReader) {
  const packet = TalkPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    return;
  }

  const message = client.socialController.filterNaughtyWords(packet.message);
  client.animationController.characterChats.set(
    character.playerId,
    new ChatBubble(client.sans11!, message),
  );

  client.chatController.notifyChat({
    channel: ChatChannels.Local,
    name: capitalize(character.name),
    message: message,
  });
}

function handleTalkServer(client: Client, reader: EoReader) {
  const packet = TalkServerServerPacket.deserialize(reader);
  client.chatController.notifyServerChat({
    message: packet.message,
  });
  client.toastController.show(
    `${client.locale.packetLogServer}: ${packet.message}`,
  );
  client.audioController.playById(SfxId.ServerMessage);
}

function handleTalkMsg(client: Client, reader: EoReader) {
  const packet = TalkMsgServerPacket.deserialize(reader);
  client.chatController.notifyChat({
    icon: ChatIcon.GlobalAnnounce,
    name: capitalize(packet.playerName),
    message: client.socialController.filterNaughtyWords(packet.message),
    channel: ChatChannels.Global,
  });
}

function handleTalkAdmin(client: Client, reader: EoReader) {
  const packet = TalkAdminServerPacket.deserialize(reader);
  client.chatController.notifyChat({
    icon: ChatIcon.GM,
    name: capitalize(packet.playerName),
    message: client.socialController.filterNaughtyWords(packet.message),
    channel: ChatChannels.Admin,
  });
  client.audioController.playById(SfxId.AdminChatReceived);
}

function handleTalkTell(client: Client, reader: EoReader) {
  const packet = TalkTellServerPacket.deserialize(reader);
  if (
    client.configController.whispers === 'none' ||
    (client.configController.whispers === 'friends' &&
      !client.socialController.isFriend(packet.playerName)) ||
    client.socialController.isIgnored(packet.playerName)
  ) {
    return;
  }

  const pmChannel = `pm:${packet.playerName.toLowerCase()}` as const;
  client.chatController.notifyChat({
    icon: ChatIcon.Note,
    name: capitalize(packet.playerName),
    message: client.socialController.filterNaughtyWords(packet.message),
    channel: pmChannel,
  });
  client.audioController.playById(SfxId.PrivateMessageReceived);
}

function handleTalkAnnounce(client: Client, reader: EoReader) {
  const packet = TalkAnnounceServerPacket.deserialize(reader);
  const message = client.socialController.filterNaughtyWords(packet.message);
  client.animationController.characterChats.set(
    client.playerId,
    new ChatBubble(client.sans11!, message),
  );
  client.chatController.notifyChat({
    channel: ChatChannels.Local,
    name: capitalize(packet.playerName),
    message: message,
    icon: ChatIcon.GlobalAnnounce,
  });
  client.chatController.notifyChat({
    channel: ChatChannels.Admin,
    name: capitalize(packet.playerName),
    message: message,
    icon: ChatIcon.GlobalAnnounce,
  });
  client.chatController.notifyChat({
    channel: ChatChannels.Global,
    name: capitalize(packet.playerName),
    message: message,
    icon: ChatIcon.GlobalAnnounce,
  });
  client.audioController.playById(SfxId.AdminAnnounceReceived);
}

function handleTalkOpen(client: Client, reader: EoReader) {
  const packet = TalkOpenServerPacket.deserialize(reader);
  const player = client.partyController.members.find(
    (m) => m.playerId === packet.playerId,
  );
  if (!player) {
    return;
  }

  const message = client.socialController.filterNaughtyWords(packet.message);

  client.chatController.notifyChat({
    channel: ChatChannels.Party,
    name: capitalize(player.name),
    message,
    icon: ChatIcon.PlayerParty,
  });

  if (
    client.nearby.characters.some(
      (c) =>
        c.playerId === packet.playerId &&
        (!c.invisible || client.admin !== AdminLevel.Player),
    )
  ) {
    client.animationController.characterChats.set(
      packet.playerId,
      new ChatBubble(
        client.sans11!,
        message,
        COLORS.ChatBubble,
        COLORS.ChatBubbleBackgroundParty,
      ),
    );
  }

  client.audioController.playById(SfxId.GroupChatReceived);
}

function handleTalkRequest(client: Client, reader: EoReader) {
  const packet = TalkRequestServerPacket.deserialize(reader);
  client.chatController.notifyChat({
    icon: ChatIcon.Guild,
    name: capitalize(packet.playerName),
    message: client.socialController.filterNaughtyWords(packet.message),
    channel: ChatChannels.Guild,
  });
}

function handleTalkReply(client: Client, reader: EoReader) {
  const packet = TalkReplyServerPacket.deserialize(reader);
  if (packet.replyCode === TalkReply.NotFound) {
    const pmChannel = `pm:${packet.name.toLowerCase()}` as const;
    client.chatController.notifyChat({
      icon: ChatIcon.Error,
      message: `${capitalize(packet.name)} ${client.getResourceString(EOResourceID.SYS_CHAT_PM_PLAYER_COULD_NOT_BE_FOUND)}`,
      channel: pmChannel,
    });
    client.audioController.playById(SfxId.PrivateMessageSent);
  }
}

export function registerTalkHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Player,
    (reader) => handleTalkPlayer(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Server,
    (reader) => handleTalkServer(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Announce,
    (reader) => handleTalkAnnounce(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Msg,
    (reader) => handleTalkMsg(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Admin,
    (reader) => handleTalkAdmin(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Tell,
    (reader) => handleTalkTell(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Open,
    (reader) => handleTalkOpen(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Request,
    (reader) => handleTalkRequest(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Talk,
    PacketAction.Reply,
    (reader) => handleTalkReply(client, reader),
  );
}
