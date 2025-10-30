import {
  type EoReader,
  PacketAction,
  PacketFamily,
  SpellTargetGroupServerPacket,
  SpellTargetOtherServerPacket,
  SpellTargetSelfServerPacket,
} from 'eolib';
import type { Client } from '../client';
import { EffectTargetCharacter } from '../render/effect';
import { HealthBar } from '../render/health-bar';

function handleSpellTargetSelf(client: Client, reader: EoReader) {
  const packet = SpellTargetSelfServerPacket.deserialize(reader);
  if (packet.hp) {
    client.hp = packet.hp;
  }

  if (packet.tp) {
    client.tp = packet.tp;
  }

  if (packet.hp || packet.tp) {
    client.emit('statsUpdate', undefined);
  }

  const character = client.getCharacterById(packet.playerId);
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  client.characterHealthBars.set(
    packet.playerId,
    new HealthBar(packet.hpPercentage, 0, packet.spellHealHp),
  );

  client.playSpellEffect(
    packet.spellId,
    new EffectTargetCharacter(packet.playerId),
  );
}

function handleSpellTargetOther(client: Client, reader: EoReader) {
  const packet = SpellTargetOtherServerPacket.deserialize(reader);
  if (packet.hp) {
    client.hp = packet.hp;
    client.emit('statsUpdate', undefined);
  }

  const caster = client.getCharacterById(packet.casterId);
  if (caster) {
    caster.direction = packet.casterDirection;
  } else {
    client.requestCharacterRange([packet.casterId]);
  }

  const character = client.getCharacterById(packet.victimId);
  if (!character) {
    client.requestCharacterRange([packet.victimId]);
    return;
  }

  client.characterHealthBars.set(
    packet.victimId,
    new HealthBar(packet.hpPercentage, 0, packet.spellHealHp),
  );

  client.playSpellEffect(
    packet.spellId,
    new EffectTargetCharacter(packet.victimId),
  );
}

function handleSpellTargetGroup(client: Client, reader: EoReader) {
  const packet = SpellTargetGroupServerPacket.deserialize(reader);
  let statsUpdate = false;
  if (packet.casterId === client.playerId) {
    client.tp = packet.casterTp;
    statsUpdate = true;
  }

  const unknownPlayerIds = [];
  for (const player of packet.players) {
    if (player.playerId === client.playerId) {
      client.hp = player.hp;
      statsUpdate = true;
    }

    const character = client.getCharacterById(player.playerId);
    if (!character) {
      unknownPlayerIds.push(player.playerId);
      continue;
    }

    client.characterHealthBars.set(
      player.playerId,
      new HealthBar(player.hpPercentage, 0, packet.spellHealHp),
    );

    client.playSpellEffect(
      packet.spellId,
      new EffectTargetCharacter(player.playerId),
    );
  }

  if (statsUpdate) {
    client.emit('statsUpdate', undefined);
  }
}

export function registerSpellHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Spell,
    PacketAction.TargetSelf,
    (reader) => handleSpellTargetSelf(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Spell,
    PacketAction.TargetOther,
    (reader) => handleSpellTargetOther(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Spell,
    PacketAction.TargetGroup,
    (reader) => handleSpellTargetGroup(client, reader),
  );
}
