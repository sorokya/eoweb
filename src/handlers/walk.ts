import {
  AdminLevel,
  type EoReader,
  MapTileSpec,
  PacketAction,
  PacketFamily,
  WalkPlayerServerPacket,
  WalkReplyServerPacket,
} from 'eolib';
import type { Client } from '../client';
import { CharacterWalkAnimation } from '../render/character-walk';
import { EffectAnimation, EffectTargetCharacter } from '../render/effect';
import { playSfxById } from '../sfx';
import { getPrevCoords } from '../utils/get-prev-coords';

function handleWalkPlayer(client: Client, reader: EoReader) {
  const packet = WalkPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.direction = packet.direction;
  character.coords.x = packet.coords.x;
  character.coords.y = packet.coords.y;
  client.characterAnimations.set(
    packet.playerId,
    new CharacterWalkAnimation(
      getPrevCoords(
        packet.coords,
        packet.direction,
        client.map.width,
        client.map.height,
      ),
      packet.coords,
      packet.direction,
    ),
  );

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

function handleWalkReply(client: Client, reader: EoReader) {
  const packet = WalkReplyServerPacket.deserialize(reader);
  const unknownPlayerIds = packet.playerIds.filter(
    (id) => !client.nearby.characters.some((c) => c.playerId === id),
  );
  const unknownNpcIndexes = packet.npcIndexes.filter(
    (index) => !client.nearby.npcs.some((n) => n.index === index),
  );
  let newItems = false;
  for (const item of packet.items) {
    if (!client.nearby.items.some((i) => i.uid === item.uid)) {
      client.addItemDrop(item);
      newItems = true;
    }
  }

  if (newItems) {
    client.atlas.refresh();
  }

  client.rangeRequest(unknownPlayerIds, unknownNpcIndexes);
}

export function registerWalkHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Walk,
    PacketAction.Player,
    (reader) => handleWalkPlayer(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Walk,
    PacketAction.Reply,
    (reader) => handleWalkReply(client, reader),
  );
}
