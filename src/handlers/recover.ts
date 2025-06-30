import {
  Emote as EmoteType,
  type EoReader,
  PacketAction,
  PacketFamily,
  RecoverAgreeServerPacket,
  RecoverListServerPacket,
  RecoverPlayerServerPacket,
  RecoverReplyServerPacket,
} from 'eolib';
import type { Client } from '../client';
import { Emote } from '../render/emote';
import { HealthBar } from '../render/health-bar';
import { playSfxById, SfxId } from '../sfx';

function handleRecoverPlayer(client: Client, reader: EoReader) {
  const packet = RecoverPlayerServerPacket.deserialize(reader);

  if (client.hp !== packet.hp) {
    const amount = packet.hp - client.hp;
    const percentage = (packet.hp / client.maxHp) * 100;
    client.hp = packet.hp;
    client.characterHealthBars.set(
      client.playerId,
      new HealthBar(percentage, 0, amount),
    );
  }

  client.tp = packet.tp;
  client.emit('statsUpdate', undefined);
}

function handleRecoverAgree(client: Client, reader: EoReader) {
  const packet = RecoverAgreeServerPacket.deserialize(reader);
  const character = client.getCharacterById(packet.playerId);
  if (!character) {
    client.requestCharacterRange([packet.playerId]);
    return;
  }

  character.hp += packet.healHp;
  client.characterHealthBars.set(
    packet.playerId,
    new HealthBar(packet.hpPercentage, 0, packet.healHp),
  );
}

function handleRecoverList(client: Client, reader: EoReader) {
  const packet = RecoverListServerPacket.deserialize(reader);
  client.baseStats.str = packet.stats.baseStats.str;
  client.baseStats.intl = packet.stats.baseStats.intl;
  client.baseStats.wis = packet.stats.baseStats.wis;
  client.baseStats.agi = packet.stats.baseStats.agi;
  client.baseStats.cha = packet.stats.baseStats.cha;
  client.baseStats.con = packet.stats.baseStats.con;
  client.secondaryStats.accuracy = packet.stats.secondaryStats.accuracy;
  client.secondaryStats.armor = packet.stats.secondaryStats.armor;
  client.secondaryStats.evade = packet.stats.secondaryStats.evade;
  client.secondaryStats.minDamage = packet.stats.secondaryStats.minDamage;
  client.secondaryStats.maxDamage = packet.stats.secondaryStats.maxDamage;
  client.maxHp = packet.stats.maxHp;
  client.maxTp = packet.stats.maxTp;
  client.maxSp = packet.stats.maxSp;
  client.classId = packet.classId;
  client.weight.max = packet.stats.maxWeight;
  client.hp = Math.min(client.hp, client.maxHp);
  client.tp = Math.min(client.tp, client.maxTp);
  client.emit('statsUpdate', undefined);
}

function handleRecoverReply(client: Client, reader: EoReader) {
  const packet = RecoverReplyServerPacket.deserialize(reader);
  client.karma = packet.karma;
  client.experience = packet.experience;

  if (packet.levelUp) {
    client.characterEmotes.set(client.playerId, new Emote(EmoteType.LevelUp));
    playSfxById(SfxId.LevelUp);
    client.level = packet.levelUp;
    client.statPoints = packet.statPoints;
    client.skillPoints = packet.skillPoints;
  }
}

export function registerRecoverHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Recover,
    PacketAction.Player,
    (reader) => handleRecoverPlayer(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Recover,
    PacketAction.Agree,
    (reader) => handleRecoverAgree(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Recover,
    PacketAction.List,
    (reader) => handleRecoverList(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Recover,
    PacketAction.Reply,
    (reader) => handleRecoverReply(client, reader),
  );
}
