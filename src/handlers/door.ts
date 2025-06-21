import {
  DoorOpenServerPacket,
  PacketAction,
  PacketFamily,
  type EoReader,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';
import { DOOR_OPEN_TICKS } from '../consts';

function handleDoorOpen(client: Client, reader: EoReader) {
  const packet = DoorOpenServerPacket.deserialize(reader);
  const door = client.getDoor(packet.coords);
  if (!door) {
    return;
  }

  door.open = true;
  door.openTicks = DOOR_OPEN_TICKS;
  playSfxById(SfxId.DoorOpen);
}

export function registerDoorHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Door,
    PacketAction.Open,
    (reader) => handleDoorOpen(client, reader),
  );
}
