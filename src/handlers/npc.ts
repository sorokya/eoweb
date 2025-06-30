import {
  type EoReader,
  ItemMapInfo,
  NpcAcceptServerPacket,
  NpcAgreeServerPacket,
  NpcDialogServerPacket,
  NpcJunkServerPacket,
  NpcPlayerServerPacket,
  NpcReplyServerPacket,
  NpcSpecServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import { ChatBubble } from '../chat-bubble';
import { ChatTab, type Client } from '../client';
import { HealthBar } from '../render/health-bar';
import { NpcAttackAnimation } from '../render/npc-attack';
import { NpcDeathAnimation } from '../render/npc-death';
import { NpcWalkAnimation } from '../render/npc-walk';
import { playSfxById, SfxId } from '../sfx';

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

    client.npcChats.set(npc.index, new ChatBubble(chat.message));

    client.emit('chat', {
      name: record.name,
      tab: ChatTab.Local,
      message: chat.message,
    });
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
      client.preloadNpcSprites(npc.id);
    }
  }
}

function handleNpcSpec(client: Client, reader: EoReader) {
  const packet = NpcSpecServerPacket.deserialize(reader);
  client.npcHealthBars.set(
    packet.npcKilledData.npcIndex,
    new HealthBar(0, packet.npcKilledData.damage),
  );
  client.npcAnimations.set(
    packet.npcKilledData.npcIndex,
    new NpcDeathAnimation(),
  );

  if (packet.npcKilledData.dropIndex) {
    const item = new ItemMapInfo();
    item.uid = packet.npcKilledData.dropIndex;
    item.id = packet.npcKilledData.dropId;
    item.coords = packet.npcKilledData.dropCoords;
    item.amount = packet.npcKilledData.dropAmount;
    client.nearby.items.push(item);
  }

  if (packet.experience) {
    client.experience = packet.experience;
    client.emit('statsUpdate', undefined);
  }
}

function handleNpcAccept(client: Client, reader: EoReader) {
  const packet = NpcAcceptServerPacket.deserialize(reader);
  client.npcHealthBars.set(
    packet.npcKilledData.npcIndex,
    new HealthBar(0, packet.npcKilledData.damage),
  );
  client.npcAnimations.set(
    packet.npcKilledData.npcIndex,
    new NpcDeathAnimation(),
  );

  if (packet.npcKilledData.dropIndex) {
    const item = new ItemMapInfo();
    item.uid = packet.npcKilledData.dropIndex;
    item.id = packet.npcKilledData.dropId;
    item.coords = packet.npcKilledData.dropCoords;
    item.amount = packet.npcKilledData.dropAmount;
    client.nearby.items.push(item);
  }

  // TODO: Level up emote
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
    client.experience = packet.experience;
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
      client.npcAnimations.set(npcIndex, new NpcDeathAnimation());
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

  client.npcChats.set(npc.index, new ChatBubble(packet.message));

  client.emit('chat', {
    name: record.name,
    tab: ChatTab.Local,
    message: packet.message,
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
