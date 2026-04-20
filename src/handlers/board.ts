import {
  BoardOpenServerPacket,
  BoardPlayerServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';

function handleBoardOpen(client: Client, reader: EoReader) {
  const packet = BoardOpenServerPacket.deserialize(reader);
  client.boardController.handleBoardOpened(packet.boardId, packet.posts);
}

function handleBoardPlayer(client: Client, reader: EoReader) {
  const packet = BoardPlayerServerPacket.deserialize(reader);
  client.boardController.handlePostRead(packet.postId, packet.postBody);
}

export function registerBoardHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Board,
    PacketAction.Open,
    (reader) => handleBoardOpen(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Board,
    PacketAction.Player,
    (reader) => handleBoardPlayer(client, reader),
  );
}
