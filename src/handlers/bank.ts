import {
  BankOpenServerPacket,
  BankReplyServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';

function handleBankOpen(client: Client, reader: EoReader) {
  const packet = BankOpenServerPacket.deserialize(reader);
  client.bankController.handleOpened(
    packet.sessionId,
    packet.goldBank,
    packet.lockerUpgrades,
  );
}

function handleBankReply(client: Client, reader: EoReader) {
  const packet = BankReplyServerPacket.deserialize(reader);
  client.bankController.notifyBankUpdated(
    packet.goldInventory,
    packet.goldBank,
  );
}

export function registerBankHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Bank,
    PacketAction.Open,
    (reader) => handleBankOpen(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Bank,
    PacketAction.Reply,
    (reader) => handleBankReply(client, reader),
  );
}
