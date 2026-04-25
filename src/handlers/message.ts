import {
  type EoReader,
  MessageOpenServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';
import { EOResourceID } from '@/edf';
import { SfxId } from '@/sfx';
import { ChatChannels, ChatIcon } from '@/ui/enums';

function handleMessagePing(client: Client) {
  client.pingController.notifyPong();
}

function handleMessageOpen(client: Client, reader: EoReader) {
  const packet = MessageOpenServerPacket.deserialize(reader);
  client.toastController.show(packet.message);
  client.chatController.notifyChat({
    channel: ChatChannels.System,
    icon: ChatIcon.QuestMessage,
    message: packet.message,
  });
  client.questController.refreshQuestProgress();
}

function handleMessageClose(client: Client) {
  client.audioController.playById(SfxId.Reboot);
  const message = client.getResourceString(
    EOResourceID.REBOOT_SEQUENCE_STARTED,
  );
  client.toastController.showWarning(message);
  const chatMessage = `${client.getResourceString(EOResourceID.STRING_SERVER)} ${message}`;
  client.chatController.notifyChat({
    channel: ChatChannels.Local,
    icon: ChatIcon.Exclamation,
    message: chatMessage,
  });
  client.chatController.notifyChat({
    channel: ChatChannels.Global,
    icon: ChatIcon.Exclamation,
    message: chatMessage,
  });
  client.chatController.notifyChat({
    channel: ChatChannels.System,
    icon: ChatIcon.Exclamation,
    message: chatMessage,
  });
}

export function registerMessageHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Message,
    PacketAction.Pong,
    (_) => handleMessagePing(client),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Message,
    PacketAction.Open,
    (reader) => handleMessageOpen(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Message,
    PacketAction.Close,
    (_reader) => handleMessageClose(client),
  );
}
