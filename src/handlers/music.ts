import { MusicPlayerServerPacket, PacketAction, PacketFamily } from 'eolib';
import type { Client } from '@/client';

export function registerMusicHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Music,
    PacketAction.Player,
    (reader) => {
      const packet = MusicPlayerServerPacket.deserialize(reader);
      if (packet.soundId) {
        client.audioController.playById(packet.soundId);
      }
    },
  );
}
