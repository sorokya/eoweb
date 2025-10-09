import {
  type EoReader,
  PacketAction,
  PacketFamily,
  StatSkillPlayerServerPacket,
} from 'eolib';
import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';

function handleStatSkillPlayer(client: Client, reader: EoReader) {
  const packet = StatSkillPlayerServerPacket.deserialize(reader);
  client.statPoints = packet.statPoints;
  client.baseStats.str = packet.stats.baseStats.str;
  client.baseStats.intl = packet.stats.baseStats.intl;
  client.baseStats.wis = packet.stats.baseStats.wis;
  client.baseStats.agi = packet.stats.baseStats.agi;
  client.baseStats.con = packet.stats.baseStats.con;
  client.baseStats.cha = packet.stats.baseStats.cha;
  client.maxHp = packet.stats.maxHp;
  client.maxTp = packet.stats.maxTp;
  client.maxSp = packet.stats.maxSp;
  client.weight.max = packet.stats.maxWeight;
  client.secondaryStats.minDamage = packet.stats.secondaryStats.minDamage;
  client.secondaryStats.maxDamage = packet.stats.secondaryStats.maxDamage;
  client.secondaryStats.accuracy = packet.stats.secondaryStats.accuracy;
  client.secondaryStats.armor = packet.stats.secondaryStats.armor;
  client.secondaryStats.evade = packet.stats.secondaryStats.evade;
  client.emit('statsUpdate', undefined);
  playSfxById(SfxId.InventoryPickup);
}

export function registerStatSkillHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Player,
    (reader) => {
      handleStatSkillPlayer(client, reader);
    },
  );
}
