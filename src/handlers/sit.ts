import {
  AdminLevel,
  type EoReader,
  MapTileSpec,
  PacketAction,
  PacketFamily,
  SitCloseServerPacket,
  SitPlayerServerPacket,
  SitRemoveServerPacket,
  SitReplyServerPacket,
  SitState,
} from 'eolib';
import type { Client } from '../client';
import { EffectAnimation, EffectTargetCharacter } from '../render/effect';
import { playSfxById } from '../sfx';

function handleSitPlayer(client: Client, reader: EoReader) {
  const packet = SitPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.direction = packet.direction;
  character.sitState = SitState.Floor;

  if (character.invisible && client.admin === AdminLevel.Player) {
    return;
  }

  const spec = client.map.tileSpecRows
    .find((r) => r.y === packet.coords.y)
    ?.tiles.find((t) => t.x === packet.coords.x);

  if (spec && spec.tileSpec === MapTileSpec.Water) {
    const metadata = client.getEffectMetadata(9);
    playSfxById(metadata.sfx);
    client.effects.push(
      new EffectAnimation(
        9,
        new EffectTargetCharacter(packet.playerId),
        metadata,
      ),
    );
  }
}

function handleSitRemove(client: Client, reader: EoReader) {
  const packet = SitRemoveServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.sitState = SitState.Stand;
}

function handleSitClose(client: Client, reader: EoReader) {
  const packet = SitCloseServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.sitState = SitState.Stand;
}

function handleSitReply(client: Client, reader: EoReader) {
  const packet = SitReplyServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  character.direction = packet.direction;
  character.sitState = SitState.Floor;

  const spec = client.map.tileSpecRows
    .find((r) => r.y === packet.coords.y)
    ?.tiles.find((t) => t.x === packet.coords.x);

  if (spec && spec.tileSpec === MapTileSpec.Water) {
    const metadata = client.getEffectMetadata(9);
    playSfxById(metadata.sfx);
    client.effects.push(
      new EffectAnimation(
        9,
        new EffectTargetCharacter(client.playerId),
        metadata,
      ),
    );
  }
}

export function registerSitHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Sit,
    PacketAction.Player,
    (reader) => handleSitPlayer(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Sit,
    PacketAction.Remove,
    (reader) => handleSitRemove(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Sit,
    PacketAction.Close,
    (reader) => handleSitClose(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Sit,
    PacketAction.Reply,
    (reader) => handleSitReply(client, reader),
  );
}
