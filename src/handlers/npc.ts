import {
  type EoReader,
  NpcAcceptServerPacket,
  NpcAgreeServerPacket,
  NpcDialogServerPacket,
  NpcJunkServerPacket,
  NpcPlayerServerPacket,
  NpcSpecServerPacket,
  PacketAction,
  PacketFamily,
} from 'eolib';
import type { Client } from '../client';
import { NpcWalkAnimation } from '../npc';
import { ChatTab } from '../ui/chat';
import { ChatBubble } from '../chat-bubble';

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
  client.nearby.npcs = client.nearby.npcs.filter(
    (n) => n.index !== packet.npcKilledData.npcIndex,
  );
}

function handleNpcAccept(client: Client, reader: EoReader) {
  const packet = NpcAcceptServerPacket.deserialize(reader);
  client.nearby.npcs = client.nearby.npcs.filter(
    (n) => n.index !== packet.npcKilledData.npcIndex,
  );
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
}
