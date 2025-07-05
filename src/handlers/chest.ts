import {
  ChestAgreeServerPacket,
  ChestOpenServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handleChestOpen(client: Client, reader: EoReader) {
  const packet = ChestOpenServerPacket.deserialize(reader);

  playSfxById(SfxId.TextBoxFocus);
  client.emit('chestOpened', {
    items: packet.items,
  });
}

function handleChestAgree(client: Client, reader: EoReader) {
  const packet = ChestAgreeServerPacket.deserialize(reader);
  client.emit('chestChanged', {
    items: packet.items,
  });
}

export function registerChestHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Chest,
    PacketAction.Open,
    (reader) => handleChestOpen(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Chest,
    PacketAction.Agree,
    (reader) => handleChestAgree(client, reader),
  );
}
