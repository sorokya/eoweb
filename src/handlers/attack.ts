import {
  AttackPlayerServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { CharacterAttackAnimation } from '../render/character-attack';
import { CharacterRangedAttackAnimation } from '../render/character-attack-ranged';
import { playSfxById } from '../sfx';
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

  const metadata = client.getWeaponMetadata(character.equipment.weapon);
  client.characterAnimations.set(
    packet.playerId,
    metadata.ranged
      ? new CharacterRangedAttackAnimation(packet.direction)
      : new CharacterAttackAnimation(packet.direction),
  );

  const index = randomRange(0, metadata.sfx.length - 1);
  playSfxById(metadata.sfx[index]);
}

export function registerAttackHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Attack,
    PacketAction.Player,
    (reader) => handleAttackPlayer(client, reader),
  );
}
