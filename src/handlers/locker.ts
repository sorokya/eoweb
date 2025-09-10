import {
  type EoReader,
  LockerBuyServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handleLockerBuy(client: Client, reader: EoReader) {
  const packet = LockerBuyServerPacket.deserialize(reader);
  const gold = client.items.find((i) => i.id === 1);
  if (!gold) {
    return;
  }

  gold.amount = packet.goldAmount;
  client.lockerUpgrades = packet.lockerUpgrades;
  playSfxById(SfxId.BuySell);
  client.emit('inventoryChanged', undefined);
}

export function registerLockerHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Locker,
    PacketAction.Buy,
    (reader) => handleLockerBuy(client, reader),
  );
}
