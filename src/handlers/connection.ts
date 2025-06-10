import {
  ConnectionPingClientPacket,
  ConnectionPlayerServerPacket,
  type EoReader,
  PingSequenceStart,
} from 'eolib';
import type { Client } from '../client';

export function handleConnectionPlayer(client: Client, reader: EoReader) {
  const packet = ConnectionPlayerServerPacket.deserialize(reader);
  client.bus?.setSequence(
    PingSequenceStart.fromPingValues(packet.seq1, packet.seq2),
  );
  client.bus?.send(new ConnectionPingClientPacket());
}
