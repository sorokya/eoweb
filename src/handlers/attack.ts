import {
  AttackPlayerServerPacket,
  Emote as EmoteType,
  type EoReader,
  MapTileSpec,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';
import {
  CharacterAttackAnimation,
  CharacterRangedAttackAnimation,
  Emote,
} from '@/render';
import { SfxId } from '@/sfx';
import { randomRange } from '@/utils';

function handleAttackPlayer(client: Client, reader: EoReader) {
  const packet = AttackPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.sessionController.requestCharacterRange([packet.playerId]);
    return;
  }

  character.direction = packet.direction;

  const metadata = client.getWeaponMetadata(character.equipment.weapon);
  client.animationController.pendingCharacterAnimations.set(
    packet.playerId,
    metadata.ranged
      ? new CharacterRangedAttackAnimation()
      : new CharacterAttackAnimation(),
  );

  const index = randomRange(0, metadata.sfx.length - 1);
  client.audioController.playAtPosition(metadata.sfx[index], character.coords);

  if (metadata.sfx[0] === SfxId.Harp1 || metadata.sfx[0] === SfxId.Guitar1) {
    client.animationController.characterEmotes.set(
      packet.playerId,
      new Emote(EmoteType.Playful + 1),
    );
  }

  const spec = client!.mapRenderer.getTileSpecAt(character.coords);
  if (spec && spec === MapTileSpec.Water) {
    client.animationController.playSplooshieEffect(packet.playerId);
  }
}

export function registerAttackHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Attack,
    PacketAction.Player,
    (reader) => handleAttackPlayer(client, reader),
  );
}
