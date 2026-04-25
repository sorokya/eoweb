import {
  DoorOpenServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';
import { DOOR_OPEN_TICKS } from '@/consts';
import { SfxId } from '@/sfx';

function handleDoorOpen(client: Client, reader: EoReader) {
  const packet = DoorOpenServerPacket.deserialize(reader);
  const door = client.mapController.getDoor(packet.coords);
  if (!door) {
    return;
  }

  door.open = true;
  door.openTicks = DOOR_OPEN_TICKS;
  client.audioController.playAtPosition(SfxId.DoorOpen, door.coords);
}

export function registerDoorHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Door,
    PacketAction.Open,
    (reader) => handleDoorOpen(client, reader),
  );
}
