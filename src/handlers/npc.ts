import {
  Coords,
  type Direction,
  type EoReader,
  ItemMapInfo,
  NpcAcceptServerPacket,
  NpcDialogServerPacket,
  NpcJunkServerPacket,
  NpcMapInfo,
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

  for (const attack of packet.attacks) {
    if (attack.playerId === client.playerId) {
      // This attack hit the player - update HP
      const newHp = Math.round((attack.hpPercentage / 100) * client.maxHp);
      client.hp = newHp;
      client.emit('statsUpdate', { hp: client.hp, tp: client.tp });
    }
  }

  if (unknownNpcsIndexes.size) {
    client.requestNpcRange(Array.from(unknownNpcsIndexes));
  }
}

function handleNpcAgree(client: Client, reader: EoReader) {
  // TODO: Remove after eolib-2.0 is released
  const numOfNpcs = reader.getChar();
  for (let i = 0; i < numOfNpcs; ++i) {
    const index = reader.getChar();
    const id = reader.getShort();
    const coords = Coords.deserialize(reader);
    const direction = reader.getChar() as Direction;

    const existing = client.nearby.npcs.find((n) => n.index === index);
    if (existing) {
      existing.coords = coords;
      existing.direction = direction;
    } else {
      const info = new NpcMapInfo();
      info.index = index;
      info.id = id;
      info.direction = direction;
      info.coords = coords;
      client.nearby.npcs.push(info);
      client.preloadNpcSprites(info.id);
    }
  }
}

function handleNpcSpec(client: Client, reader: EoReader) {
  const packet = NpcSpecServerPacket.deserialize(reader);
  client.nearby.npcs = client.nearby.npcs.filter(
    (n) => n.index !== packet.npcKilledData.npcIndex,
  );

  if (packet.npcKilledData.dropIndex) {
    const item = new ItemMapInfo();
    item.uid = packet.npcKilledData.dropIndex;
    item.id = packet.npcKilledData.dropId;
    item.coords = packet.npcKilledData.dropCoords;
    item.amount = packet.npcKilledData.dropAmount;
    client.nearby.items.push(item);
  }
}

function handleNpcAccept(client: Client, reader: EoReader) {
  const packet = NpcAcceptServerPacket.deserialize(reader);
  client.nearby.npcs = client.nearby.npcs.filter(
    (n) => n.index !== packet.npcKilledData.npcIndex,
  );

  if (packet.npcKilledData.dropIndex) {
    const item = new ItemMapInfo();
    item.uid = packet.npcKilledData.dropIndex;
    item.id = packet.npcKilledData.dropId;
    item.coords = packet.npcKilledData.dropCoords;
    item.amount = packet.npcKilledData.dropAmount;
    client.nearby.items.push(item);
  }
}

function handleNpcJunk(client: Client, reader: EoReader) {
  const packet = NpcJunkServerPacket.deserialize(reader);
  client.nearby.npcs = client.nearby.npcs.filter((n) => n.id !== packet.npcId);
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
