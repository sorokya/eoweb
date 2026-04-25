import {
  ArenaAcceptServerPacket,
  ArenaSpecServerPacket,
  ArenaUseServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';
import { SfxId } from '@/sfx';
import { ChatIcon } from '@/ui/enums';

function handleArenaUse(client: Client, reader: EoReader) {
  const packet = ArenaUseServerPacket.deserialize(reader);
  client.chatController.notifyServerChat({
    message: `${packet.playersCount} player(s) were launched, now fight! -server`,
  });
}

function handleArenaAccept(client: Client, reader: EoReader) {
  const packet = ArenaAcceptServerPacket.deserialize(reader);
  client.chatController.notifyServerChat({
    message: `${packet.killerName} won the arena event! -server`,
    sfxId: SfxId.ArenaWin,
    icon: ChatIcon.Trophy,
  });
}

function handleArenaSpec(client: Client, reader: EoReader) {
  const packet = ArenaSpecServerPacket.deserialize(reader);
  const message = `${packet.victimName} was eliminated by ${packet.killerName}`;
  client.chatController.notifyServerChat({
    icon: ChatIcon.Skeleton,
    message:
      packet.killsCount > 1
        ? `${message}, ${packet.killerName} killed ${packet.killsCount} player(s)`
        : message,
  });
  client.audioController.playById(SfxId.ServerMessage);
}

function handleArenaDrop(client: Client) {
  client.chatController.notifyServerChat({
    message: 'New round is delayed, there are still players inside the arena',
    sfxId: SfxId.ArenaTickSound,
  });
}

export function registerArenaHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Arena,
    PacketAction.Use,
    (reader) => handleArenaUse(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Arena,
    PacketAction.Accept,
    (reader) => handleArenaAccept(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Arena,
    PacketAction.Spec,
    (reader) => handleArenaSpec(client, reader),
  );
  client.bus!.registerPacketHandler(PacketFamily.Arena, PacketAction.Drop, () =>
    handleArenaDrop(client),
  );
}
