import {
  type EoReader,
  JukeboxAgreeServerPacket,
  JukeboxOpenServerPacket,
  JukeboxPlayerServerPacket,
  JukeboxReplyServerPacket,
  JukeboxUseServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';

function handleJukeboxPlayer(client: Client, reader: EoReader) {
  const packet = JukeboxPlayerServerPacket.deserialize(reader);
  client.audioController.playServerMusic(packet.mfxId);
}

function handleJukeboxOpen(client: Client, reader: EoReader) {
  const packet = JukeboxOpenServerPacket.deserialize(reader);
  client.jukeboxController.notifyOpened(packet.jukeboxPlayer);
}

function handleJukeboxReply(client: Client, reader: EoReader) {
  JukeboxReplyServerPacket.deserialize(reader);
  client.jukeboxController.notifyRequestFailed();
}

function handleJukeboxAgree(client: Client, reader: EoReader) {
  const packet = JukeboxAgreeServerPacket.deserialize(reader);
  client.jukeboxController.notifyRequestSucceeded(packet.goldAmount);
}

function handleJukeboxUse(client: Client, reader: EoReader) {
  const packet = JukeboxUseServerPacket.deserialize(reader);
  client.jukeboxController.notifySongPlayed(packet.trackId);
}

export function registerJukeboxHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Jukebox,
    PacketAction.Open,
    (reader) => handleJukeboxOpen(client, reader),
  );

  client.bus!.registerPacketHandler(
    PacketFamily.Jukebox,
    PacketAction.Agree,
    (reader) => handleJukeboxAgree(client, reader),
  );

  client.bus!.registerPacketHandler(
    PacketFamily.Jukebox,
    PacketAction.Reply,
    (reader) => handleJukeboxReply(client, reader),
  );

  client.bus!.registerPacketHandler(
    PacketFamily.Jukebox,
    PacketAction.Player,
    (reader) => handleJukeboxPlayer(client, reader),
  );

  client.bus!.registerPacketHandler(
    PacketFamily.Jukebox,
    PacketAction.Use,
    (reader) => handleJukeboxUse(client, reader),
  );
}
