import {
  type EoReader,
  PacketAction,
  PacketFamily,
  RefreshReplyServerPacket,
} from 'eolib';
import type { Client } from '../client';

function handleRefreshReply(client: Client, reader: EoReader) {
  const packet = RefreshReplyServerPacket.deserialize(reader);
  client.nearby = packet.nearby;
  client.atlas.reset();
  client.atlas.refresh();
}

export function registerRefreshHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Refresh,
    PacketAction.Reply,
    (reader) => handleRefreshReply(client, reader),
  );
}
