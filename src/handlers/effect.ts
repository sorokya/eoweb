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
import type { Client } from '@/client';
import {
  EffectAnimation,
  EffectTargetCharacter,
  EffectTargetTile,
  HealthBar,
} from '@/render';
import { SfxId } from '@/sfx';
import { getDistance } from '@/utils';
import type { Vector2 } from '@/vector';

function handleEffectReport(client: Client) {
  client.mapRenderer.timedSpikesTicks = 9;
  const playerAt = client.getPlayerCoords();
  const spikeTiles: Vector2[] = [];
  for (let x = playerAt.x - 6; x < playerAt.x + 6; ++x) {
    if (x < 0 || x > client!.map!.width) continue;
    for (let y = playerAt.y - 6; y < playerAt.y + 6; ++y) {
      if (y < 0 || y > client!.map!.height) continue;
      const spec = client!.mapRenderer.getTileSpecAt({ x, y });
      if (spec && spec === MapTileSpec.TimedSpikes) {
        spikeTiles.push({ x, y });
      }
    }
  }

  // TODO: Move to audio-controller playNearbySpikes
  spikeTiles.sort((a, b) => {
    const distA = getDistance(playerAt, a);
    const distB = getDistance(playerAt, b);
    return distA - distB;
  });

  if (spikeTiles.length) {
    client.audioController.playAtPosition(SfxId.Spikes, spikeTiles[0]);
  }
}

function handleEffectSpec(client: Client, reader: EoReader) {
  const packet = EffectSpecServerPacket.deserialize(reader);
  if (packet.mapDamageType === MapDamageType.TpDrain) {
    const data =
      packet.mapDamageTypeData as EffectSpecServerPacket.MapDamageTypeDataTpDrain;
    client.tp = data.tp;
    client.audioController.playById(SfxId.MapEffectTPDrain);
    client.statsController.notifyStatsUpdated();
    return;
  }

  const data =
    packet.mapDamageTypeData as EffectSpecServerPacket.MapDamageTypeDataSpikes;
  const damage = client.hp - data.hp;
  client.hp = data.hp;
  client.audioController.playById(SfxId.Spikes);

  client.animationController.characterHealthBars.set(
    client.playerId,
    new HealthBar(Math.floor((client.hp / client.maxHp) * 100), damage),
  );
  client.statsController.notifyStatsUpdated();

  if (!data.hp) {
    client.setCharacterDeathAnimation(client.playerId);
    client.audioController.playById(SfxId.Dead);
  }
}

function handleEffectUse(client: Client, reader: EoReader) {
  const packet = EffectUseServerPacket.deserialize(reader);
  if (packet.effect === MapEffect.Quake) {
    const data = packet.effectData as EffectUseServerPacket.EffectDataQuake;
    client.quakeController.quakeTicks = 3 * data.quakeStrength + 10;
    client.quakeController.quakePower = 4 * data.quakeStrength + 10;
    client.quakeController.quakeOffset = 0;
    client.audioController.playById(SfxId.Earthquake);
  }
}

function handleEffectAgree(client: Client, reader: EoReader) {
  const packet = EffectAgreeServerPacket.deserialize(reader);
  for (const effect of packet.effects) {
    const meta = client.getEffectMetadata(effect.effectId + 1);
    if (meta.sfx) {
      client.audioController.playAtPosition(meta.sfx, effect.coords);
    }
    client.animationController.effects.push(
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
    client.animationController.effects.push(
      new EffectAnimation(
        effect.effectId + 1,
        new EffectTargetCharacter(effect.playerId),
        meta,
      ),
    );

    if (!meta.sfx) {
      continue;
    }

    if (effect.playerId === client.playerId) {
      client.audioController.playById(meta.sfx);
      continue;
    }

    const coords = client.getCharacterById(effect.playerId)?.coords;
    if (coords) {
      client.audioController.playAtPosition(meta.sfx, coords);
      continue;
    }

    client.audioController.playById(meta.sfx);
  }
}

function handleEffectAdmin(client: Client, reader: EoReader) {
  const packet = EffectAdminServerPacket.deserialize(reader);
  const character = client.getCharacterById(packet.playerId);
  if (!character) {
    return;
  }

  character.hp -= packet.damage;

  client.audioController.playAtPosition(SfxId.Spikes, character.coords);

  client.animationController.characterHealthBars.set(
    packet.playerId,
    new HealthBar(packet.hpPercentage, packet.damage),
  );

  if (packet.died) {
    client.setCharacterDeathAnimation(packet.playerId);
    client.audioController.playAtPosition(SfxId.Dead, character.coords);
  }
}

export function registerEffectHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Report,
    () => handleEffectReport(client),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Spec,
    (reader) => handleEffectSpec(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Use,
    (reader) => handleEffectUse(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Agree,
    (reader) => handleEffectAgree(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Player,
    (reader) => handleEffectPlayer(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Effect,
    PacketAction.Admin,
    (reader) => handleEffectAdmin(client, reader),
  );
}
