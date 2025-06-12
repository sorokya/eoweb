import {
  ConnectionPingClientPacket,
  ConnectionPlayerServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
  PingSequenceStart,
} from 'eolib';
import type { Client } from '../client';

function handleConnectionPlayer(client: Client, reader: EoReader) {
  const packet = ConnectionPlayerServerPacket.deserialize(reader);
  client.bus?.setSequence(
    PingSequenceStart.fromPingValues(packet.seq1, packet.seq2),
  );
  client.bus?.send(new ConnectionPingClientPacket());
}

export function registerConnectionHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Connection,
    PacketAction.Player,
    (reader) => handleConnectionPlayer(client, reader),
  );
}
