import {
  AttackPlayerServerPacket,
  Emote as EmoteType,
  type EoReader,
  MapTileSpec,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { CharacterAttackAnimation } from '../render/character-attack';
import { CharacterRangedAttackAnimation } from '../render/character-attack-ranged';
import { EffectAnimation, EffectTargetCharacter } from '../render/effect';
import { Emote } from '../render/emote';
import { playSfxById, SfxId } from '../sfx';
import { randomRange } from '../utils/random-range';

function handleAttackPlayer(client: Client, reader: EoReader) {
  const packet = AttackPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.direction = packet.direction;

  const metadata = client.getWeaponMetadata(character.equipment.weapon);
  client.characterAnimations.set(
    packet.playerId,
    metadata.ranged
      ? new CharacterRangedAttackAnimation()
      : new CharacterAttackAnimation(),
  );

  const index = randomRange(0, metadata.sfx.length - 1);
  playSfxById(metadata.sfx[index]);

  if (metadata.sfx[0] === SfxId.Harp1 || metadata.sfx[0] === SfxId.Guitar1) {
    client.characterEmotes.set(
      packet.playerId,
      new Emote(EmoteType.Playful + 1),
    );
  }

  const spec = client.map.tileSpecRows
    .find((r) => r.y === character.coords.y)
    ?.tiles.find((t) => t.x === character.coords.x);

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

export function registerAttackHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Attack,
    PacketAction.Player,
    (reader) => handleAttackPlayer(client, reader),
  );
}
