import {
  Emote as EmoteType,
  type EoReader,
  ItemMapInfo,
  NpcAcceptServerPacket,
  NpcAgreeServerPacket,
  NpcDialogServerPacket,
  NpcJunkServerPacket,
  NpcKillStealProtectionState,
  NpcPlayerServerPacket,
  NpcReplyServerPacket,
  NpcSpecServerPacket,
  PacketAction,
  PacketFamily,
  PlayerKilledState,
} from 'eolib';
import { ChatBubble } from '../chat-bubble';
import { ChatTab, type Client } from '../client';
import { ITEM_PROTECT_TICKS_NPC } from '../consts';
import { EOResourceID } from '../edf';
import { Emote } from '../render/emote';
import { HealthBar } from '../render/health-bar';
import { NpcAttackAnimation } from '../render/npc-attack';
import { NpcWalkAnimation } from '../render/npc-walk';
import { playSfxById, SfxId } from '../sfx';
import { ChatIcon } from '../ui/chat/chat';
import { capitalize } from '../utils/capitalize';

function handleNpcPlayer(client: Client, reader: EoReader) {
  const packet = NpcPlayerServerPacket.deserialize(reader);
  const unknownNpcsIndexes: Set<number> = new Set();
  for (const position of packet.positions) {
    const npc = client.nearby.npcs.find((n) => position.npcIndex === n.index);
    if (!npc) {
      unknownNpcsIndexes.add(position.npcIndex);
      continue;
    }

    npc.direction = position.direction;
    if (npc.coords !== position.coords) {
      client.npcAnimations.set(
        npc.index,
        new NpcWalkAnimation(npc.coords, position.coords, position.direction),
      );
      npc.coords = position.coords;
    }
  }

  let someoneKilled = false;
  for (const attack of packet.attacks) {
    if (attack.playerId === client.playerId) {
      client.hp = Math.max(client.hp - attack.damage, 0);
      client.emit('statsUpdate', undefined);
    }

    const npc = client.nearby.npcs.find((n) => attack.npcIndex === n.index);
    if (!npc) {
      unknownNpcsIndexes.add(attack.npcIndex);
      continue;
    }

    npc.direction = attack.direction;
    playSfxById(SfxId.PunchAttack);
    client.npcAnimations.set(npc.index, new NpcAttackAnimation());
    client.characterHealthBars.set(
      attack.playerId,
      new HealthBar(attack.hpPercentage, attack.damage),
    );

    if (attack.killed === PlayerKilledState.Killed) {
      client.setCharacterDeathAnimation(attack.playerId);
      someoneKilled = true;
    }
  }

  if (someoneKilled) {
    playSfxById(SfxId.Dead);
  }

  for (const chat of packet.chats) {
    const npc = client.nearby.npcs.find((n) => chat.npcIndex === n.index);
    if (!npc) {
      unknownNpcsIndexes.add(chat.npcIndex);
      continue;
    }

    const record = client.getEnfRecordById(npc.id);
    if (!record) {
      continue;
    }

    client.npcChats.set(npc.index, new ChatBubble(client.sans11, chat.message));
  }

  if (unknownNpcsIndexes.size) {
    client.requestNpcRange(Array.from(unknownNpcsIndexes));
  }
}

function handleNpcAgree(client: Client, reader: EoReader) {
  const packet = NpcAgreeServerPacket.deserialize(reader);
  for (const npc of packet.npcs) {
    const existing = client.nearby.npcs.find((n) => n.index === npc.index);
    if (existing) {
      existing.coords = npc.coords;
      existing.direction = npc.direction;
    } else {
      client.nearby.npcs.push(npc);
    }
  }

  client.atlas.refresh();
}

function handleNpcSpec(client: Client, reader: EoReader) {
  const packet = NpcSpecServerPacket.deserialize(reader);
  client.npcHealthBars.set(
    packet.npcKilledData.npcIndex,
    new HealthBar(0, packet.npcKilledData.damage),
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
      message: `${client.getResourceString(EOResourceID.STATUS_LABEL_THE_NPC_DROPPED)} ${item.amount} ${record.name}`,
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

function handleNpcAccept(client: Client, reader: EoReader) {
  const packet = NpcAcceptServerPacket.deserialize(reader);
  client.npcHealthBars.set(
    packet.npcKilledData.npcIndex,
    new HealthBar(0, packet.npcKilledData.damage),
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
      message: `${client.getResourceString(EOResourceID.STATUS_LABEL_THE_NPC_DROPPED)} ${item.amount} ${record.name}`,
    });
  }

  client.characterEmotes.set(
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

function handleNpcJunk(client: Client, reader: EoReader) {
  const packet = NpcJunkServerPacket.deserialize(reader);
  client.nearby.npcs
    .filter((n) => n.id === packet.npcId)
    .map((n) => n.index)
    .forEach((npcIndex) => {
      client.npcHealthBars.set(npcIndex, new HealthBar(0, 1));
      client.setNpcDeathAnimation(npcIndex);
    });
}

function handleNpcDialog(client: Client, reader: EoReader) {
  const packet = NpcDialogServerPacket.deserialize(reader);
  const npc = client.nearby.npcs.find((n) => n.index === packet.npcIndex);
  if (!npc) {
    return;
  }

  const record = client.getEnfRecordById(npc.id);
  if (!record) {
    return;
  }

  client.npcChats.set(npc.index, new ChatBubble(client.sans11, packet.message));
  client.emit('chat', {
    tab: ChatTab.Local,
    message: `${packet.message}`,
    name: `${capitalize(record.name)}`,
  });
}

function handleNpcReply(client: Client, reader: EoReader) {
  const packet = NpcReplyServerPacket.deserialize(reader);
  const npc = client.nearby.npcs.find((n) => n.index === packet.npcIndex);
  if (!npc) {
    return;
  }

  const record = client.getEnfRecordById(npc.id);
  if (!record) {
    return;
  }

  client.npcHealthBars.set(
    npc.index,
    new HealthBar(packet.hpPercentage, packet.damage),
  );

  if (
    packet.playerId === client.playerId &&
    packet.killStealProtection === NpcKillStealProtectionState.Protected
  ) {
    client.setStatusLabel(
      EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
      client.getResourceString(EOResourceID.STATUS_LABEL_UNABLE_TO_ATTACK),
    );
  }
}

export function registerNpcHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Npc,
    PacketAction.Player,
    (reader) => handleNpcPlayer(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Npc,
    PacketAction.Agree,
    (reader) => handleNpcAgree(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Npc,
    PacketAction.Accept,
    (reader) => handleNpcAccept(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Npc,
    PacketAction.Spec,
    (reader) => handleNpcSpec(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Npc,
    PacketAction.Junk,
    (reader) => handleNpcJunk(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Npc,
    PacketAction.Dialog,
    (reader) => handleNpcDialog(client, reader),
  );
  client.bus.registerPacketHandler(
    PacketFamily.Npc,
    PacketAction.Reply,
    (reader) => handleNpcReply(client, reader),
  );
}
