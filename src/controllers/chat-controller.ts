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
import type { ChatChannel } from '@/ui/enums';
import { ChatChannels, ChatIcon } from '@/ui/enums';
import { capitalize, makeDrunk } from '@/utils';

export type ChatMessage = {
  channel: ChatChannel;
  message: string;
  icon?: ChatIcon | null;
  name?: string;
};

export type ServerChatMessage = {
  message: string;
  sfxId?: SfxId | null;
  icon?: ChatIcon | null;
};

type ChatSubscriber = (msg: ChatMessage) => void;
type ServerChatSubscriber = (msg: ServerChatMessage) => void;

export class ChatController {
  private client: Client;
  private chatSubscribers: ChatSubscriber[] = [];
  private serverChatSubscribers: ServerChatSubscriber[] = [];
  private setChatSubscribers: ((text: string) => void)[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  subscribeChat(cb: ChatSubscriber): void {
    this.chatSubscribers.push(cb);
  }

  unsubscribeChat(cb: ChatSubscriber): void {
    this.chatSubscribers = this.chatSubscribers.filter((s) => s !== cb);
  }

  notifyChat(msg: ChatMessage): void {
    for (const cb of this.chatSubscribers) cb(msg);
  }

  subscribeServerChat(cb: ServerChatSubscriber): void {
    this.serverChatSubscribers.push(cb);
  }

  unsubscribeServerChat(cb: ServerChatSubscriber): void {
    this.serverChatSubscribers = this.serverChatSubscribers.filter(
      (s) => s !== cb,
    );
  }

  notifyServerChat(msg: ServerChatMessage): void {
    for (const cb of this.serverChatSubscribers) cb(msg);
  }

  subscribeSetChat(cb: (text: string) => void): void {
    this.setChatSubscribers.push(cb);
  }

  unsubscribeSetChat(cb: (text: string) => void): void {
    this.setChatSubscribers = this.setChatSubscribers.filter((s) => s !== cb);
  }

  notifySetChat(text: string): void {
    for (const cb of this.setChatSubscribers) cb(text);
  }

  chat(message: string): void {
    if (!message) {
      return;
    }

    const trimmed = this.client.socialController
      .filterNaughtyWords(
        this.client.drunkController.drunk ? makeDrunk(message) : message,
      )
      .substring(0, MAX_CHAT_LENGTH);

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
      this.notifyChat({
        icon: ChatIcon.GlobalAnnounce,
        channel: ChatChannels.Local,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      this.notifyChat({
        icon: ChatIcon.GlobalAnnounce,
        channel: ChatChannels.Admin,
        message: `${packet.message}`,
        name: `${capitalize(this.client.name)}`,
      });
      this.notifyChat({
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

        this.notifyChat({
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

      this.notifyChat({
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

      this.notifyChat({
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

      this.notifyChat({
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

      this.notifyChat({
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

    this.notifyChat({
      channel: ChatChannels.Local,
      message: `${trimmed}`,
      name: `${capitalize(this.client.name)}`,
    });
  }
}
