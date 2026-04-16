import {
  JukeboxPlayerServerPacket,
  MusicPlayerServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';
import { playSfxById } from '@/sfx';

export function registerMusicHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Music,
    PacketAction.Player,
    (reader) => {
      const packet = MusicPlayerServerPacket.deserialize(reader);
      if (packet.soundId) {
        playSfxById(packet.soundId);
      }
    },
  );

  client.bus!.registerPacketHandler(
    PacketFamily.Jukebox,
    PacketAction.Player,
    (reader) => {
      const packet = JukeboxPlayerServerPacket.deserialize(reader);
      if (packet.mfxId) {
        client.audioController.playJukeboxMusic(packet.mfxId);
      }
    },
  );
}
