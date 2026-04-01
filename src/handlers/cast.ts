import {
  CastAcceptServerPacket,
  CastReplyServerPacket,
  CastSpecServerPacket,
  Emote as EmoteType,
  type EoReader,
  ItemMapInfo,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '@/client';
import { ITEM_PROTECT_TICKS_NPC } from '@/consts';
import { EOResourceID } from '@/edf';
import { EffectTargetNpc, Emote, HealthBar } from '@/render';
import { playSfxById, SfxId } from '@/sfx';
import { ChatIcon, ChatTab } from '@/ui/ui-types';

function handleCastReply(client: Client, reader: EoReader) {
  const packet = CastReplyServerPacket.deserialize(reader);
  const npc = client.getNpcByIndex(packet.npcIndex);
  if (!npc) {
    client.sessionController.requestNpcRange([packet.npcIndex]);
    return;
  }

  if (packet.casterTp) {
    client.tp = packet.casterTp;
    client.emit('statsUpdate', undefined);
  }

  client.animationController.npcHealthBars.set(
    packet.npcIndex,
    new HealthBar(packet.hpPercentage, packet.damage),
  );

  client.spellController.playSpellEffect(
    packet.spellId,
    new EffectTargetNpc(packet.npcIndex),
  );
}

function handleCastSpec(client: Client, reader: EoReader) {
  const packet = CastSpecServerPacket.deserialize(reader);
  const npc = client.getNpcByIndex(packet.npcKilledData.npcIndex);
  if (!npc) {
    client.sessionController.requestNpcRange([packet.npcKilledData.npcIndex]);
    return;
  }

  if (packet.casterTp) {
    client.tp = packet.casterTp;
    client.emit('statsUpdate', undefined);
  }

  client.animationController.npcHealthBars.set(
    packet.npcKilledData.npcIndex,
    new HealthBar(0, packet.npcKilledData.damage),
  );

  client.spellController.playSpellEffect(
    packet.spellId,
    new EffectTargetNpc(packet.npcKilledData.npcIndex),
  );

  client.setNpcDeathAnimation(packet.npcKilledData.npcIndex);

  if (packet.npcKilledData.dropIndex) {
    const item = new ItemMapInfo();
    item.uid = packet.npcKilledData.dropIndex;
    item.id = packet.npcKilledData.dropId;
    item.coords = packet.npcKilledData.dropCoords;
    item.amount = packet.npcKilledData.dropAmount;
    client.addItemDrop(
      item,
      ITEM_PROTECT_TICKS_NPC,
      packet.npcKilledData.killerId,
    );
    client.atlas.refresh();

    const record = client.getEifRecordById(item.id);
    client.emit('chat', {
      tab: ChatTab.System,
      icon: ChatIcon.DownArrow,
      message: `${client.getResourceString(EOResourceID.STATUS_LABEL_THE_NPC_DROPPED)} ${item.amount} ${record!.name}`,
    });
  }

  if (packet.experience) {
    const gain = packet.experience - client.experience;
    client.experience = packet.experience;
    client.setStatusLabel(
      EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
      `${client.getResourceString(EOResourceID.STATUS_LABEL_YOU_GAINED_EXP)} ${gain} EXP`,
    );
    client.emit('chat', {
      message: `${client.getResourceString(EOResourceID.STATUS_LABEL_YOU_GAINED_EXP)} ${gain} EXP`,
      icon: ChatIcon.Star,
      tab: ChatTab.System,
    });
    client.emit('statsUpdate', undefined);
  }
}

function handleCastAccept(client: Client, reader: EoReader) {
  const packet = CastAcceptServerPacket.deserialize(reader);
  const npc = client.getNpcByIndex(packet.npcKilledData.npcIndex);
  if (!npc) {
    client.sessionController.requestNpcRange([packet.npcKilledData.npcIndex]);
    return;
  }

  if (packet.casterTp) {
    client.tp = packet.casterTp;
    client.emit('statsUpdate', undefined);
  }

  client.animationController.npcHealthBars.set(
    packet.npcKilledData.npcIndex,
    new HealthBar(0, packet.npcKilledData.damage),
  );

  client.spellController.playSpellEffect(
    packet.spellId,
    new EffectTargetNpc(packet.npcKilledData.npcIndex),
  );

  client.setNpcDeathAnimation(packet.npcKilledData.npcIndex);

  if (packet.npcKilledData.dropIndex) {
    const item = new ItemMapInfo();
    item.uid = packet.npcKilledData.dropIndex;
    item.id = packet.npcKilledData.dropId;
    item.coords = packet.npcKilledData.dropCoords;
    item.amount = packet.npcKilledData.dropAmount;
    client.addItemDrop(
      item,
      ITEM_PROTECT_TICKS_NPC,
      packet.npcKilledData.killerId,
    );
    client.atlas.refresh();

    const record = client.getEifRecordById(item.id);
    client.emit('chat', {
      tab: ChatTab.System,
      icon: ChatIcon.DownArrow,
      message: `${client.getResourceString(EOResourceID.STATUS_LABEL_THE_NPC_DROPPED)} ${item.amount} ${record!.name}`,
    });
  }

  client.animationController.characterEmotes.set(
    packet.npcKilledData.killerId,
    new Emote(EmoteType.LevelUp),
  );
  playSfxById(SfxId.LevelUp);
  if (packet.levelUp) {
    client.level = packet.levelUp.level;
    client.maxHp = packet.levelUp.maxHp;
    client.maxTp = packet.levelUp.maxTp;
    client.maxSp = packet.levelUp.maxSp;
    client.statPoints = packet.levelUp.statPoints;
    client.skillPoints = packet.levelUp.skillPoints;
  }

  if (packet.experience) {
    const gain = packet.experience - client.experience;
    client.experience = packet.experience;
    client.setStatusLabel(
      EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
      `${client.getResourceString(EOResourceID.STATUS_LABEL_YOU_GAINED_EXP)} ${gain} EXP`,
    );
    client.emit('chat', {
      message: `${client.getResourceString(EOResourceID.STATUS_LABEL_YOU_GAINED_EXP)} ${gain} EXP`,
      icon: ChatIcon.Star,
      tab: ChatTab.System,
    });
    client.emit('statsUpdate', undefined);
  }
}

export function registerCastHandlers(client: Client) {
  client.bus!.registerPacketHandler(
    PacketFamily.Cast,
    PacketAction.Reply,
    (reader) => handleCastReply(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Cast,
    PacketAction.Spec,
    (reader) => handleCastSpec(client, reader),
  );
  client.bus!.registerPacketHandler(
    PacketFamily.Cast,
    PacketAction.Accept,
    (reader) => handleCastAccept(client, reader),
  );
}
