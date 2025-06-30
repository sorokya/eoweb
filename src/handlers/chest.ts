import {
  ChestOpenServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';

function handleChestOpen(client: Client, reader: EoReader) {
  const packet = ChestOpenServerPacket.deserialize(reader);

  console.log(`Chest opened at (${packet.coords.x}, ${packet.coords.y})`);
  console.log(`Found ${packet.items.length} items:`);

  packet.items.forEach((item, index) => {
    const eifRecord = client.getEifRecordById(item.id);
    const itemName = eifRecord
      ? eifRecord.name
      : `Unknown Item (ID: ${item.id})`;
    console.log(`  ${index + 1}. ${itemName} x${item.amount}`);
  });

  if (packet.items.length === 0) {
    console.log('  (Empty chest)');
  }

  // 3. ChestUI event
  client.emit('chestOpened', {
    coords: { x: packet.coords.x, y: packet.coords.y },
    items: packet.items,
  });
}

export function registerChestHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Chest,
    PacketAction.Open,
    (reader) => handleChestOpen(client, reader),
  );
}
