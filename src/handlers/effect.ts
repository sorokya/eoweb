import {
  EffectAdminServerPacket,
  EffectAgreeServerPacket,
  EffectPlayerServerPacket,
  EffectSpecServerPacket,
  EffectUseServerPacket,
  type EoReader,
  MapDamageType,
  MapEffect,
  MapTileSpec,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import {
  EffectAnimation,
  EffectTargetCharacter,
  EffectTargetTile,
} from '../render/effect';
import { HealthBar } from '../render/health-bar';
import { playSfxById, SfxId } from '../sfx';
import { getVolumeFromDistance } from '../utils/get-volume-from-distance';
import { getDistance } from '../utils/range';
import type { Vector2 } from '../vector';

function handleEffectReport(client: Client) {
  client.mapRenderer.timedSpikesTicks = 9;
  const playerAt = client.getPlayerCoords();
  const spikeTiles: Vector2[] = [];
  for (let x = playerAt.x - 6; x < playerAt.x + 6; ++x) {
    if (x < 0 || x > client.map.width) continue;
    for (let y = playerAt.y - 6; y < playerAt.y + 6; ++y) {
      if (y < 0 || y > client.map.height) continue;
      const spec = client.map.tileSpecRows
        .find((r) => r.y === y)
        ?.tiles.find((t) => t.x === x);
      if (spec && spec.tileSpec === MapTileSpec.TimedSpikes) {
        spikeTiles.push({ x, y });
      }
    }
  }

  spikeTiles.sort((a, b) => {
    const distA = getDistance(playerAt, a);
    const distB = getDistance(playerAt, b);
    return distA - distB;
  });

  if (spikeTiles.length) {
    const tile = spikeTiles[0];
    const distance = getDistance(playerAt, tile);
    const volume = getVolumeFromDistance(distance, 6);
    if (volume) {
      playSfxById(SfxId.Spikes, volume);
    }
  }
}

function handleEffectSpec(client: Client, reader: EoReader) {
  const packet = EffectSpecServerPacket.deserialize(reader);
  if (packet.mapDamageType === MapDamageType.TpDrain) {
    const data =
      packet.mapDamageTypeData as EffectSpecServerPacket.MapDamageTypeDataTpDrain;
    client.tp = data.tp;
    playSfxById(SfxId.MapEffectTPDrain);
    client.emit('statsUpdate', undefined);
    return;
  }

  const data =
    packet.mapDamageTypeData as EffectSpecServerPacket.MapDamageTypeDataSpikes;
  const damage = client.hp - data.hp;
  client.hp = data.hp;
  playSfxById(SfxId.Spikes);

  client.characterHealthBars.set(
    client.playerId,
    new HealthBar(Math.floor((client.hp / client.maxHp) * 100), damage),
  );
  client.emit('statsUpdate', undefined);
}

function handleEffectUse(client: Client, reader: EoReader) {
  const packet = EffectUseServerPacket.deserialize(reader);
  if (packet.effect === MapEffect.Quake) {
    const data = packet.effectData as EffectUseServerPacket.EffectDataQuake;
    client.quakeTicks = 3 * data.quakeStrength + 10;
    client.quakePower = 4 * data.quakeStrength + 10;
    client.quakeOffset = 0;
    playSfxById(SfxId.Earthquake);
  }
}

function handleEffectAgree(client: Client, reader: EoReader) {
  const packet = EffectAgreeServerPacket.deserialize(reader);
  for (const effect of packet.effects) {
    const meta = client.getEffectMetadata(effect.effectId + 1);
    if (meta.sfx) {
      playSfxById(meta.sfx);
    }
    client.effects.push(
      new EffectAnimation(
        effect.effectId + 1,
        new EffectTargetTile(effect.coords),
        meta,
      ),
    );
  }
}

function handleEffectPlayer(client: Client, reader: EoReader) {
  const packet = EffectPlayerServerPacket.deserialize(reader);
  for (const effect of packet.effects) {
    const meta = client.getEffectMetadata(effect.effectId + 1);
    if (meta.sfx) {
      playSfxById(meta.sfx);
    }
    client.effects.push(
      new EffectAnimation(
        effect.effectId + 1,
        new EffectTargetCharacter(effect.playerId),
        meta,
      ),
    );
  }
}

function handleEffectAdmin(client: Client, reader: EoReader) {
  const packet = EffectAdminServerPacket.deserialize(reader);
  const character = client.getCharacterById(packet.playerId);
  if (!character) {
    return;
  }

  character.hp -= packet.damage;

  const playerAt = client.getPlayerCoords();
  const distance = getDistance(playerAt, character.coords);
  const volume = getVolumeFromDistance(distance, 14);
  if (volume) {
    playSfxById(SfxId.Spikes, volume);
  }

  client.characterHealthBars.set(
    packet.playerId,
    new HealthBar(packet.hpPercentage, packet.damage),
  );
}

export function registerEffectHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Report,
    () => handleEffectReport(client),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Spec,
    (reader) => handleEffectSpec(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Use,
    (reader) => handleEffectUse(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Agree,
    (reader) => handleEffectAgree(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Player,
    (reader) => handleEffectPlayer(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Admin,
    (reader) => handleEffectAdmin(client, reader),
  );
}
