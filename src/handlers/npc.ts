import {
  type EoReader,
  NpcPlayerServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { NpcWalkAnimation } from '../npc';

function handleNpcPlayer(client: Client, reader: EoReader) {
  const packet = NpcPlayerServerPacket.deserialize(reader);
  for (const position of packet.positions) {
    const npc = client.nearby.npcs.find((n) => position.npcIndex === n.index);
    if (npc) {
      npc.direction = position.direction;
      if (npc.coords !== position.coords) {
        client.npcAnimations.set(
          npc.index,
          new NpcWalkAnimation(npc.coords, position.coords, position.direction),
        );
        npc.coords = position.coords;
      }
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
