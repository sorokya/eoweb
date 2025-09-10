import {
  BankOpenServerPacket,
  BankReplyServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handleBankOpen(client: Client, reader: EoReader) {
  const packet = BankOpenServerPacket.deserialize(reader);
  client.sessionId = packet.sessionId;
  client.goldBank = packet.goldBank;
  client.lockerUpgrades = packet.lockerUpgrades;
  client.emit('bankOpened', undefined);
}

function handleBankReply(client: Client, reader: EoReader) {
  const packet = BankReplyServerPacket.deserialize(reader);
  const gold = client.items.find((i) => i.id === 1);
  if (!gold) {
    return;
  }

  gold.amount = packet.goldInventory;
  client.goldBank = packet.goldBank;
  playSfxById(SfxId.BuySell);
  client.emit('bankUpdated', undefined);
  client.emit('inventoryChanged', undefined);
}

export function registerBankHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Bank,
    PacketAction.Open,
    (reader) => handleBankOpen(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Bank,
    PacketAction.Reply,
    (reader) => handleBankReply(client, reader),
  );
}
