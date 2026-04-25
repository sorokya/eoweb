import {
  type EoReader,
  LockerBuyServerPacket,
  LockerGetServerPacket,
  LockerOpenServerPacket,
  LockerReplyServerPacket,
  LockerSpecServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';

function handleLockerOpen(client: Client, reader: EoReader) {
  const packet = LockerOpenServerPacket.deserialize(reader);
  client.lockerController.handleOpened(packet.lockerCoords, packet.lockerItems);
}

function handleLockerGet(client: Client, reader: EoReader) {
  const packet = LockerGetServerPacket.deserialize(reader);
  client.lockerController.notifyLockerItemTaken(
    packet.lockerItems,
    packet.takenItem.id,
    packet.takenItem.amount,
    packet.weight.current,
  );
}

function handleLockerReply(client: Client, reader: EoReader) {
  const packet = LockerReplyServerPacket.deserialize(reader);
  client.lockerController.notifyLockerItemAdded(
    packet.lockerItems,
    packet.depositedItem.id,
    packet.depositedItem.amount,
    packet.weight.current,
  );
}

function handleLockerBuy(client: Client, reader: EoReader) {
  const packet = LockerBuyServerPacket.deserialize(reader);
  client.lockerController.notifyLockerUpgraded(
    packet.goldAmount,
    packet.lockerUpgrades,
  );
}

function handleLockerSpec(client: Client, reader: EoReader) {
  const packet = LockerSpecServerPacket.deserialize(reader);
  client.lockerController.notifyLockerFull(packet.lockerMaxItems);
}

export function registerLockerHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Locker,
    PacketAction.Open,
    (reader) => handleLockerOpen(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Locker,
    PacketAction.Get,
    (reader) => handleLockerGet(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Locker,
    PacketAction.Reply,
    (reader) => handleLockerReply(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Locker,
    PacketAction.Buy,
    (reader) => handleLockerBuy(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Locker,
    PacketAction.Spec,
    (reader) => handleLockerSpec(client, reader),
  );
}
