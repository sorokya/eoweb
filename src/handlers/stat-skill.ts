import {
  type EoReader,
  PacketAction,
  PacketFamily,
  SkillMasterReply,
  Spell,
  StatSkillOpenServerPacket,
  StatSkillPlayerServerPacket,
  StatSkillReplyServerPacket,
  StatSkillTakeServerPacket,
} from 'eolib';
import type { Client } from '../client';
import { DialogResourceID } from '../edf';
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

function handleStatSkillOpen(client: Client, reader: EoReader) {
  const packet = StatSkillOpenServerPacket.deserialize(reader);
  client.sessionId = packet.sessionId;
  client.emit('skillMasterOpened', {
    name: packet.shopName,
    skills: packet.skills,
  });
}

function handleStatSkillReply(client: Client, reader: EoReader) {
  const packet = StatSkillReplyServerPacket.deserialize(reader);
  switch (packet.replyCode) {
    case SkillMasterReply.RemoveItems: {
      const strings = client.getDialogStrings(
        DialogResourceID.SKILL_RESET_CHARACTER_CLEAR_PAPERDOLL,
      );
      client.showError(strings[1], strings[0]);
      return;
    }
    case SkillMasterReply.WrongClass: {
      const data =
        packet.replyCodeData as StatSkillReplyServerPacket.ReplyCodeDataWrongClass;
      const classRecord = client.getEcfRecordById(data.classId);
      if (!classRecord) {
        return;
      }

      const strings = client.getDialogStrings(
        DialogResourceID.SKILL_LEARN_WRONG_CLASS,
      );
      client.showError(`${strings[1]} ${classRecord.name}`, strings[0]);
    }
  }
}

function handleStatSkillTake(client: Client, reader: EoReader) {
  const packet = StatSkillTakeServerPacket.deserialize(reader);
  const gold = client.items.find((i) => i.id === 1);
  if (!gold) {
    return;
  }

  gold.amount = packet.goldAmount;

  const spell = new Spell();
  spell.id = packet.spellId;
  spell.level = 0;
  client.spells.push(spell);

  client.emit('inventoryChanged', undefined);
  client.emit('skillLearned', undefined);
  playSfxById(SfxId.LearnNewSpell);
}

export function registerStatSkillHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Player,
    (reader) => {
      handleStatSkillPlayer(client, reader);
    },
  );
  client.bus.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Open,
    (reader) => {
      handleStatSkillOpen(client, reader);
    },
  );
  client.bus.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Reply,
    (reader) => {
      handleStatSkillReply(client, reader);
    },
  );
  client.bus.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Take,
    (reader) => {
      handleStatSkillTake(client, reader);
    },
  );
}
