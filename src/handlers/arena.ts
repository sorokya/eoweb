import {
  ArenaAcceptServerPacket,
  ArenaDropServerPacket,
  ArenaSpecServerPacket,
  ArenaUseServerPacket,
  PacketAction,
  PacketFamily,
  type EoReader,
} from 'eolib';
import { ChatTab, type Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handleArenaUse(client: Client, reader: EoReader) {
  const packet = ArenaUseServerPacket.deserialize(reader);
  client.emit('serverChat', {
    message: `${packet.playersCount} player(s) were launched, now fight! -server`,
  });
}

function handleArenaAccept(client: Client, reader: EoReader) {
  const packet = ArenaAcceptServerPacket.deserialize(reader);
  client.emit('serverChat', {
    message: `${packet.killerName} won the arena event! -server`,
    sfxId: SfxId.ArenaWin,
  });
}

function handleArenaSpec(client: Client, reader: EoReader) {
  const packet = ArenaSpecServerPacket.deserialize(reader);
  const message = `${packet.victimName} was eliminated by ${packet.killerName}`;
  client.emit('chat', {
    name: 'Server',
    tab: ChatTab.Local,
    message:
      packet.killsCount > 1
        ? `${message}, ${packet.killerName} killed ${packet.killsCount} player(s)`
        : message,
  });
  playSfxById(SfxId.ServerMessage);
}

function handleArenaDrop(client: Client) {
  client.emit('serverChat', {
    message: 'New round is delayed, there are still players inside the arena',
    sfxId: SfxId.ArenaTickSound,
  });
}

export function registerArenaHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Arena,
    PacketAction.Use,
    (reader) => handleArenaUse(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Arena,
    PacketAction.Accept,
    (reader) => handleArenaAccept(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Arena,
    PacketAction.Spec,
    (reader) => handleArenaSpec(client, reader),
  );
  client.bus.registerPacketHandler(PacketFamily.Arena, PacketAction.Drop, () =>
    handleArenaDrop(client),
  );
}
