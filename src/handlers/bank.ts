import {
  BankOpenServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';

function handleBankOpen(client: Client, reader: EoReader) {
  const packet = BankOpenServerPacket.deserialize(reader);
  client.sessionId = packet.sessionId;
  client.goldBank = packet.goldBank;
  client.lockerUpgrades = packet.lockerUpgrades;
  client.emit('bankOpened', undefined);
}

export function registerBankHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Bank,
    PacketAction.Open,
    (reader) => handleBankOpen(client, reader),
  );
}
