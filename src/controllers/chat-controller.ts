import {
  AdminLevel,
  TalkAdminClientPacket,
  TalkAnnounceClientPacket,
  TalkMsgClientPacket,
  TalkOpenClientPacket,
  TalkReportClientPacket,
  TalkTellClientPacket,
} from 'eolib';
import type { Client } from '../client';
import { COLORS, MAX_CHAT_LENGTH } from '../consts';
import { ChatBubble } from '../render/chat-bubble';
import { playSfxById } from '../sfx';
import { ChatIcon, ChatTab, SfxId } from '../types';
import { capitalize, makeDrunk } from '../utils';

export class ChatController {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  chat(message: string): void {
    if (!message) {
      return;
    }

    const trimmed = (
      this.client.drunkController.drunk ? makeDrunk(message) : message
    ).substring(0, MAX_CHAT_LENGTH);

    if (
      trimmed.startsWith('#') &&
      this.client.commandController.handleCommand(trimmed)
    ) {
      return;
    }

    if (trimmed.startsWith('@') && this.client.admin !== AdminLevel.Player) {
      const packet = new TalkAnnounceClientPacket();
      packet.message = trimmed.substring(1);
      this.client.animationController.characterChats.set(
        this.client.playerId,
        new ChatBubble(this.client.sans11, packet.message),
      );
      this.client.emit('chat', {
        icon: ChatIcon.GlobalAnnounce,
        tab: ChatTab.Local,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      this.client.emit('chat', {
        icon: ChatIcon.GlobalAnnounce,
        tab: ChatTab.Group,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      this.client.emit('chat', {
        icon: ChatIcon.GlobalAnnounce,
        tab: ChatTab.Global,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      playSfxById(SfxId.AdminAnnounceReceived);
      this.client.bus!.send(packet);
      return;
    }

    if (trimmed.startsWith('!')) {
      const target = trimmed.substring(1).split(' ')[0];
      if (target.trim().length) {
        const message = trimmed.substring(target.length + 2);

        const packet = new TalkTellClientPacket();
        packet.name = target.toLowerCase();
        packet.message = message;
        this.client.bus!.send(packet);

        this.client.emit('chat', {
          icon: ChatIcon.Note,
          tab: ChatTab.Local,
          name: `${capitalize(this.client.name)}->${capitalize(target)}`,
          message,
        });

        return;
      }
    }

    if (trimmed.startsWith('~')) {
      const packet = new TalkMsgClientPacket();
      packet.message = trimmed.substring(1);
      this.client.bus!.send(packet);

      this.client.emit('chat', {
        tab: ChatTab.Global,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      return;
    }

    if (trimmed.startsWith("'") && this.client.partyMembers.length) {
      const packet = new TalkOpenClientPacket();
      packet.message = trimmed.substring(1);
      this.client.bus!.send(packet);

      this.client.animationController.characterChats.set(
        this.client.playerId,
        new ChatBubble(
          this.client.sans11,
          packet.message,
          COLORS.ChatBubble,
          COLORS.ChatBubbleBackgroundParty,
        ),
      );

      this.client.emit('chat', {
        tab: ChatTab.Group,
        icon: ChatIcon.PlayerParty,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      return;
    }

    if (trimmed.startsWith('+') && this.client.admin !== AdminLevel.Player) {
      const packet = new TalkAdminClientPacket();
      packet.message = trimmed.substring(1);
      this.client.bus!.send(packet);

      this.client.emit('chat', {
        tab: ChatTab.Group,
        icon: ChatIcon.GM,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });

      playSfxById(SfxId.AdminChatSent);

      return;
    }

    const packet = new TalkReportClientPacket();
    packet.message = trimmed;
    this.client.bus!.send(packet);

    this.client.animationController.characterChats.set(
      this.client.playerId,
      new ChatBubble(this.client.sans11, trimmed),
    );

    this.client.emit('chat', {
      tab: ChatTab.Local,
      message: `${trimmed}`,
      name: `${capitalize(this.client.name)}`,
    });
  }
}
