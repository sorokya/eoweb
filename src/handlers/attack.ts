import {
  AttackPlayerServerPacket,
  type EoReader,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { CharacterAttackAnimation } from '../render/character-attack';
import { playSfxById, SfxId } from '../sfx';

function handleAttackPlayer(client: Client, reader: EoReader) {
  const packet = AttackPlayerServerPacket.deserialize(reader);
  const character = client.nearby.characters.find(
    (c) => c.playerId === packet.playerId,
  );
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  client.characterAnimations.set(
    packet.playerId,
    new CharacterAttackAnimation(packet.direction),
  );
  
  playSfxById(client.getPlayerIsUsingGun(packet.playerId) ? SfxId.Gun : client.getPlayerIsRanged(packet.playerId) ? SfxId.AttackBow : SfxId.PunchAttack);
}

export function registerAttackHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Attack,
    PacketAction.Player,
    (reader) => handleAttackPlayer(client, reader),
  );
}
