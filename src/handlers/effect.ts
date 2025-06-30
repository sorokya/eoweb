import {
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
import { playSfxById, SfxId } from '../sfx';
import { getDistance } from '../utils/range';

function handleEffectReport(client: Client) {
  client.mapRenderer.timedSpikesTicks = 9;
  const playerAt = client.getPlayerCoords();
  for (let x = playerAt.x - 6; x < playerAt.x + 6; ++x) {
    if (x < 0 || x > client.map.width) continue;
    for (let y = playerAt.y - 6; y < playerAt.y + 6; ++y) {
      if (y < 0 || y > client.map.height) continue;
      const spec = client.map.tileSpecRows
        .find((r) => r.y === y)
        ?.tiles.find((t) => t.x === x);
      if (spec && spec.tileSpec === MapTileSpec.TimedSpikes) {
        const distance = getDistance(playerAt, { x, y });
        let volume: number;
        switch (distance) {
          case 0:
          case 1:
            volume = 1.0;
            break;
          case 2:
            volume = 0.8;
            break;
          case 3:
            volume = 0.6;
            break;
          case 4:
            volume = 0.4;
            break;
          case 5:
            volume = 0.3;
            break;
          default:
            volume = 0.2;
        }

        playSfxById(SfxId.Spikes, volume);
      }
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
    return;
  }

  const data =
    packet.mapDamageTypeData as EffectSpecServerPacket.MapDamageTypeDataSpikes;
  client.hp = data.hp;
  playSfxById(SfxId.Spikes);
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
  }
}

function handleEffectPlayer(client: Client, reader: EoReader) {
  const packet = EffectPlayerServerPacket.deserialize(reader);
  for (const effect of packet.effects) {
    const meta = client.getEffectMetadata(effect.effectId + 1);
    if (meta.sfx) {
      playSfxById(meta.sfx);
    }
  }
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
}
