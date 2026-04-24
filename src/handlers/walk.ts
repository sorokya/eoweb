import {
  AdminLevel,
  type EoReader,
  MapTileSpec,
  PacketAction,
  PacketFamily,
  WalkPlayerServerPacket,
  WalkReplyServerPacket,
} from 'eolib';
import type { Client } from '@/client';
import { CharacterWalkAnimation } from '@/render';
import { getPrevCoords } from '@/utils';

function handleWalkPlayer(client: Client, reader: EoReader) {
  const packet = WalkPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.sessionController.requestCharacterRange([packet.playerId]);
    return;
  }

  client.animationController.pendingCharacterAnimations.set(
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

  const spec = client.mapRenderer.getTileSpecAt(packet.coords);
  if (spec && spec === MapTileSpec.Water) {
    client.animationController.playSplooshieEffect(packet.playerId);
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

  client.sessionController.rangeRequest(unknownPlayerIds, unknownNpcIndexes);
}

export function registerWalkHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Walk,
    PacketAction.Player,
    (reader) => handleWalkPlayer(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Walk,
    PacketAction.Reply,
    (reader) => handleWalkReply(client, reader),
  );
}
