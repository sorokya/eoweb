import {
  AdminLevel,
  TalkAdminClientPacket,
  TalkAnnounceClientPacket,
  TalkMsgClientPacket,
  TalkOpenClientPacket,
  TalkReportClientPacket,
  TalkRequestClientPacket,
  TalkTellClientPacket,
} from 'eolib';
import type { Client } from '@/client';
import { COLORS, MAX_CHAT_LENGTH } from '@/consts';
import { ChatBubble } from '@/render';
import { SfxId } from '@/sfx';
import { ChatChannels, ChatIcon } from '@/ui/enums';
import { capitalize, makeDrunk } from '@/utils';

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
        channel: ChatChannels.Local,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      this.client.emit('chat', {
        icon: ChatIcon.GlobalAnnounce,
        channel: ChatChannels.Admin,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      this.client.emit('chat', {
        icon: ChatIcon.GlobalAnnounce,
        channel: ChatChannels.Global,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      this.client.audioController.playById(SfxId.AdminAnnounceReceived);
      this.client.bus!.send(packet);
      return;
    }

    if (trimmed.startsWith('!')) {
      const target = trimmed.substring(1).split(' ')[0];
      if (target.trim().length) {
        const msg = trimmed.substring(target.length + 2);
        const pmChannel = `pm:${target.toLowerCase()}` as const;

        const packet = new TalkTellClientPacket();
        packet.name = target.toLowerCase();
        packet.message = msg;
        this.client.bus!.send(packet);

        this.client.emit('chat', {
          icon: ChatIcon.Note,
          channel: pmChannel,
          name: `${capitalize(this.client.name)}`,
          message: msg,
        });

        return;
      }
    }

    if (trimmed.startsWith('~')) {
      const packet = new TalkMsgClientPacket();
      packet.message = trimmed.substring(1);
      this.client.bus!.send(packet);

      this.client.emit('chat', {
        channel: ChatChannels.Global,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      return;
    }

    if (trimmed.startsWith("'") && this.client.partyController.members.length) {
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
        channel: ChatChannels.Party,
        icon: ChatIcon.PlayerParty,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      return;
    }

    if (trimmed.startsWith('&')) {
      const packet = new TalkRequestClientPacket();
      packet.message = trimmed.substring(1);
      this.client.bus!.send(packet);

      this.client.emit('chat', {
        channel: ChatChannels.Guild,
        icon: ChatIcon.Guild,
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
        channel: ChatChannels.Admin,
        icon: ChatIcon.GM,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });

      this.client.audioController.playById(SfxId.AdminChatSent);

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
      channel: ChatChannels.Local,
      message: `${trimmed}`,
      name: `${capitalize(this.client.name)}`,
    });
  }
}
