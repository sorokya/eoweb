import {
  ChestAgreeServerPacket,
  ChestGetServerPacket,
  ChestOpenServerPacket,
  ChestReplyServerPacket,
  type EoReader,
  Item,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';

import { playSfxById, SfxId } from '@/sfx';
import { ChatIcon } from '@/ui/enums';

function handleChestOpen(client: Client, reader: EoReader) {
  const packet = ChestOpenServerPacket.deserialize(reader);

  playSfxById(SfxId.TextBoxFocus);
  client.chestController.handleOpened(packet.items);
}

function handleChestAgree(client: Client, reader: EoReader) {
  const packet = ChestAgreeServerPacket.deserialize(reader);
  client.chestController.handleChanged(packet.items);
}

function handleChestGet(client: Client, reader: EoReader) {
  const packet = ChestGetServerPacket.deserialize(reader);
  client.weight.current = packet.weight.current;

  const existing = client.items.find((i) => i.id === packet.takenItem.id);
  if (existing) {
    existing.amount += packet.takenItem.amount;
  } else {
    const item = new Item();
    item.id = packet.takenItem.id;
    item.amount = packet.takenItem.amount;
    client.items.push(item);
  }

  client.emit('inventoryChanged', undefined);
  client.chestController.handleChanged(packet.items);

  const name = client.getEifRecordById(packet.takenItem.id)?.name ?? '';
  const msg = client.locale.chestTookMsg
    .replace('{amount}', String(packet.takenItem.amount))
    .replace('{name}', name);
  client.toastController.show(msg);
  client.emit('serverChat', { message: msg, icon: ChatIcon.DownArrow });
}

function handleChestReply(client: Client, reader: EoReader) {
  const packet = ChestReplyServerPacket.deserialize(reader);
  client.weight.current = packet.weight.current;

  const item = client.items.find((i) => i.id === packet.addedItemId);
  const prevAmount = item?.amount ?? 0;

  if (packet.remainingAmount) {
    if (item) item.amount = packet.remainingAmount;
  } else {
    client.items = client.items.filter((i) => i.id !== packet.addedItemId);
  }

  client.emit('inventoryChanged', undefined);
  client.chestController.handleChanged(packet.items);

  const depositedAmount = prevAmount - (packet.remainingAmount ?? 0);
  const name = client.getEifRecordById(packet.addedItemId)?.name ?? '';
  const msg = client.locale.chestDepositedMsg
    .replace('{amount}', String(depositedAmount > 0 ? depositedAmount : 1))
    .replace('{name}', name);
  client.toastController.show(msg);
  client.emit('serverChat', { message: msg, icon: ChatIcon.UpArrow });
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
