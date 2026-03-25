import {
  AdminLevel,
  TalkAdminClientPacket,
  TalkAnnounceClientPacket,
  TalkMsgClientPacket,
  TalkOpenClientPacket,
  TalkReportClientPacket,
  TalkTellClientPacket,
} from 'eolib';
import { ChatBubble } from '../chat-bubble';
import type { Client } from '../client';
import { COLORS, MAX_CHAT_LENGTH } from '../consts';
import { playSfxById } from '../sfx';
import { ChatIcon, ChatTab, SfxId } from '../types';
import { capitalize, makeDrunk } from '../utils';
import { handleCommand } from './command-manager';

export function chat(client: Client, message: string): void {
  if (!message) {
    return;
  }

  const trimmed = (client.drunk ? makeDrunk(message) : message).substring(
    0,
    MAX_CHAT_LENGTH,
  );

  if (trimmed.startsWith('#') && handleCommand(client, trimmed)) {
    return;
  }

  if (trimmed.startsWith('@') && client.admin !== AdminLevel.Player) {
    const packet = new TalkAnnounceClientPacket();
    packet.message = trimmed.substring(1);
    client.characterChats.set(
      client.playerId,
      new ChatBubble(client.sans11, packet.message),
    );
    client.emit('chat', {
      icon: ChatIcon.GlobalAnnounce,
      tab: ChatTab.Local,
      message: `${packet.message}`,
      name: `${capitalize(client.name)}`,
    });
    client.emit('chat', {
      icon: ChatIcon.GlobalAnnounce,
      tab: ChatTab.Group,
      message: `${packet.message}`,
      name: `${capitalize(client.name)}`,
    });
    client.emit('chat', {
      icon: ChatIcon.GlobalAnnounce,
      tab: ChatTab.Global,
      message: `${packet.message}`,
      name: `${capitalize(client.name)}`,
    });
    playSfxById(SfxId.AdminAnnounceReceived);
    client.bus!.send(packet);
    return;
  }

  if (trimmed.startsWith('!')) {
    const target = trimmed.substring(1).split(' ')[0];
    if (target.trim().length) {
      const message = trimmed.substring(target.length + 2);

      const packet = new TalkTellClientPacket();
      packet.name = target.toLowerCase();
      packet.message = message;
      client.bus!.send(packet);

      client.emit('chat', {
        icon: ChatIcon.Note,
        tab: ChatTab.Local,
        name: `${capitalize(client.name)}->${capitalize(target)}`,
        message,
      });

      return;
    }
  }

  if (trimmed.startsWith('~')) {
    const packet = new TalkMsgClientPacket();
    packet.message = trimmed.substring(1);
    client.bus!.send(packet);

    client.emit('chat', {
      tab: ChatTab.Global,
      message: `${packet.message}`,
      name: `${capitalize(client.name)}`,
    });
    return;
  }

  if (trimmed.startsWith("'") && client.partyMembers.length) {
    const packet = new TalkOpenClientPacket();
    packet.message = trimmed.substring(1);
    client.bus!.send(packet);

    client.characterChats.set(
      client.playerId,
      new ChatBubble(
        client.sans11,
        packet.message,
        COLORS.ChatBubble,
        COLORS.ChatBubbleBackgroundParty,
      ),
    );

    client.emit('chat', {
      tab: ChatTab.Group,
      icon: ChatIcon.PlayerParty,
      message: `${packet.message}`,
      name: `${capitalize(client.name)}`,
    });
    return;
  }

  if (trimmed.startsWith('+') && client.admin !== AdminLevel.Player) {
    const packet = new TalkAdminClientPacket();
    packet.message = trimmed.substring(1);
    client.bus!.send(packet);

    client.emit('chat', {
      tab: ChatTab.Group,
      icon: ChatIcon.GM,
      message: `${packet.message}`,
      name: `${capitalize(client.name)}`,
    });

    playSfxById(SfxId.AdminChatSent);

    return;
  }

  const packet = new TalkReportClientPacket();
  packet.message = trimmed;
  client.bus!.send(packet);

  client.characterChats.set(
    client.playerId,
    new ChatBubble(client.sans11, trimmed),
  );

  client.emit('chat', {
    tab: ChatTab.Local,
    message: `${trimmed}`,
    name: `${capitalize(client.name)}`,
  });
}
