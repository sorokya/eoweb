import {
  type EoReader,
  PacketAction,
  PacketFamily,
  SkillMasterReply,
  Spell,
  StatSkillAcceptServerPacket,
  StatSkillJunkServerPacket,
  StatSkillOpenServerPacket,
  StatSkillPlayerServerPacket,
  StatSkillRemoveServerPacket,
  StatSkillReplyServerPacket,
  StatSkillTakeServerPacket,
} from 'eolib';
import type { Client } from '@/client';
import { GOLD_ITEM_ID } from '@/consts';
import { DialogResourceID } from '@/edf';
import { playSfxById, SfxId } from '@/sfx';
import { ChatIcon } from '@/ui/enums';

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
  client.statSkillController.notifyOpened(packet.shopName, packet.skills);
}

function handleStatSkillReply(client: Client, reader: EoReader) {
  const packet = StatSkillReplyServerPacket.deserialize(reader);
  switch (packet.replyCode) {
    case SkillMasterReply.RemoveItems: {
      const strings = client.getDialogStrings(
        DialogResourceID.SKILL_RESET_CHARACTER_CLEAR_PAPERDOLL,
      );
      client.alertController.show(strings[0], strings[1]);
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

  client.inventoryController.setItem(GOLD_ITEM_ID, packet.goldAmount);

  const spell = new Spell();
  spell.id = packet.spellId;
  spell.level = 0;
  client.spells.push(spell);

  client.emit('inventoryChanged', undefined);
  client.emit('skillsChanged', undefined);
  client.statSkillController.notifySkillsChanged();
  playSfxById(SfxId.LearnNewSpell);

  const name = client.getEsfRecordById(packet.spellId)?.name ?? '';
  const msg = client.locale.skillMasterLearnedMsg.replace('{name}', name);
  client.toastController.showSuccess(msg);
  client.emit('serverChat', { message: msg, icon: ChatIcon.Star });
}

function handleStatSkillRemove(client: Client, reader: EoReader) {
  const packet = StatSkillRemoveServerPacket.deserialize(reader);
  const name = client.getEsfRecordById(packet.spellId)?.name ?? '';
  client.spells = client.spells.filter((s) => s.id !== packet.spellId);
  const strings = client.getDialogStrings(
    DialogResourceID.SKILL_FORGET_SUCCESS,
  );
  client.alertController.show(strings[0], strings[1]);
  client.emit('skillsChanged', undefined);
  client.statSkillController.notifySkillsChanged();

  const msg = client.locale.skillMasterForgotMsg.replace('{name}', name);
  client.toastController.show(msg);
  client.emit('serverChat', { message: msg, icon: ChatIcon.DownArrow });
}

function handleStatSkillJunk(client: Client, reader: EoReader) {
  const packet = StatSkillJunkServerPacket.deserialize(reader);
  client.spells = [];
  client.hp = packet.stats.hp;
  client.maxHp = packet.stats.maxHp;
  client.tp = packet.stats.tp;
  client.maxTp = packet.stats.maxTp;
  client.maxSp = packet.stats.maxSp;
  client.statPoints = packet.stats.statPoints;
  client.skillPoints = packet.stats.skillPoints;
  client.secondaryStats.minDamage = packet.stats.secondary.minDamage;
  client.secondaryStats.maxDamage = packet.stats.secondary.maxDamage;
  client.secondaryStats.accuracy = packet.stats.secondary.accuracy;
  client.secondaryStats.armor = packet.stats.secondary.armor;
  client.secondaryStats.evade = packet.stats.secondary.evade;
  client.baseStats.str = packet.stats.base.str;
  client.baseStats.intl = packet.stats.base.intl;
  client.baseStats.wis = packet.stats.base.wis;
  client.baseStats.agi = packet.stats.base.agi;
  client.baseStats.con = packet.stats.base.con;
  client.baseStats.cha = packet.stats.base.cha;
  client.emit('statsUpdate', undefined);
  client.emit('skillsChanged', undefined);
  client.statSkillController.notifySkillsChanged();
  playSfxById(SfxId.LearnNewSpell);

  const strings = client.getDialogStrings(
    DialogResourceID.SKILL_RESET_CHARACTER_COMPLETE,
  );
  client.alertController.show(strings[0], strings[1]);

  const msg = client.locale.skillMasterResetMsg;
  client.toastController.show(msg);
  client.emit('serverChat', { message: msg, icon: ChatIcon.Information });
}

function handleStatSkillAccept(client: Client, reader: EoReader) {
  const packet = StatSkillAcceptServerPacket.deserialize(reader);
  client.skillPoints = packet.skillPoints;
  const existing = client.spells.find((s) => s.id === packet.spell.id);
  if (existing) {
    existing.level = packet.spell.level;
  }
  client.emit('skillsChanged', undefined);
  client.statSkillController.notifySkillsChanged();
  playSfxById(SfxId.InventoryPickup);

  const name = client.getEsfRecordById(packet.spell.id)?.name ?? '';
  const msg = client.locale.spellTrainedMsg
    .replace('{name}', name)
    .replace('{level}', String(packet.spell.level));
  client.toastController.show(msg);
  client.emit('serverChat', { message: msg, icon: ChatIcon.UpArrow });
}

export function registerStatSkillHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Accept,
    (reader) => {
      handleStatSkillAccept(client, reader);
    },
  );
  client.bus!.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Player,
    (reader) => {
      handleStatSkillPlayer(client, reader);
    },
  );
  client.bus!.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Open,
    (reader) => {
      handleStatSkillOpen(client, reader);
    },
  );
  client.bus!.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Reply,
    (reader) => {
      handleStatSkillReply(client, reader);
    },
  );
  client.bus!.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Take,
    (reader) => {
      handleStatSkillTake(client, reader);
    },
  );
  client.bus!.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Remove,
    (reader) => {
      handleStatSkillRemove(client, reader);
    },
  );
  client.bus!.registerPacketHandler(
    PacketFamily.StatSkill,
    PacketAction.Junk,
    (reader) => {
      handleStatSkillJunk(client, reader);
    },
  );
}
