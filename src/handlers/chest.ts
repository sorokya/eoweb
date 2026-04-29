import {
  ChestAgreeServerPacket,
  ChestGetServerPacket,
  ChestOpenServerPacket,
  ChestReplyServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';

import { SfxId } from '@/sfx';
import { ChatIcon } from '@/ui/enums';

function handleChestOpen(client: Client, reader: EoReader) {
  const packet = ChestOpenServerPacket.deserialize(reader);

  client.audioController.playById(SfxId.TextBoxFocus);
  client.chestController.handleOpened(packet.items);
}

function handleChestAgree(client: Client, reader: EoReader) {
  const packet = ChestAgreeServerPacket.deserialize(reader);
  client.chestController.handleChanged(packet.items);
}

function handleChestGet(client: Client, reader: EoReader) {
  const packet = ChestGetServerPacket.deserialize(reader);
  client.weight.current = packet.weight.current;

  client.inventoryController.addItem(
    packet.takenItem.id,
    packet.takenItem.amount,
  );

  client.chestController.handleChanged(packet.items);

  const name = client.getEifRecordById(packet.takenItem.id)?.name ?? '';
  const msg = client.locale.chest.tookMsg
    .replace('{amount}', String(packet.takenItem.amount))
    .replace('{name}', name);
  client.toastController.show(msg);
  client.chatController.notifyServerChat({
    message: msg,
    icon: ChatIcon.DownArrow,
  });
}

function handleChestReply(client: Client, reader: EoReader) {
  const packet = ChestReplyServerPacket.deserialize(reader);
  client.weight.current = packet.weight.current;

  const prevAmount = client.inventoryController.getItemAmount(
    packet.addedItemId,
  );
  client.inventoryController.setItem(
    packet.addedItemId,
    packet.remainingAmount,
  );

  client.chestController.handleChanged(packet.items);

  const depositedAmount = prevAmount - packet.remainingAmount;
  const name = client.getEifRecordById(packet.addedItemId)?.name ?? '';
  const msg = client.locale.chest.depositedMsg
    .replace('{amount}', String(depositedAmount > 0 ? depositedAmount : 1))
    .replace('{name}', name);
  client.toastController.show(msg);
  client.chatController.notifyServerChat({
    message: msg,
    icon: ChatIcon.UpArrow,
  });
}

export function registerChestHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Chest,
    PacketAction.Open,
    (reader) => handleChestOpen(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Chest,
    PacketAction.Agree,
    (reader) => handleChestAgree(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Chest,
    PacketAction.Get,
    (reader) => handleChestGet(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Chest,
    PacketAction.Reply,
    (reader) => handleChestReply(client, reader),
  );
}
