import {
  type EoReader,
  NpcPlayerServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';

function handleNpcPlayer(client: Client, reader: EoReader) {
  const packet = NpcPlayerServerPacket.deserialize(reader);
  for (const position of packet.positions) {
    const npc = client.nearby.npcs.find((n) => position.npcIndex === n.index);
    if (npc) {
      npc.coords = position.coords;
      npc.direction = position.direction;
    }
  }
}

export function registerNpcHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Npc,
    PacketAction.Player,
    (reader) => handleNpcPlayer(client, reader),
  );
}
