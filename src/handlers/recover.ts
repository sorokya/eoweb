import {
  type EoReader,
  PacketAction,
  PacketFamily,
  RecoverPlayerServerPacket,
} from 'eolib';
import type { Client } from '../client';

function handlePlayerRecover(client: Client, reader: EoReader) {
  const packet = RecoverPlayerServerPacket.deserialize(reader);
  
  
}

export function registerRecoverHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Recover,
    PacketAction.Player,
    (reader) => handlePlayerRecover(client, reader),
  );
}

  